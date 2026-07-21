import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { sql, getPool } from '../config/db.js';
import { askAdminChatbotAI, suggestSupportTicketReply } from '../utils/aiHelper.js';

const router = express.Router();

const sanitizeUser = (user) => {
  const { password, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  safe.hasPassword = !!password;
  return safe;
};

// Role checking middlewares
const cskhOrAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cskh')) {
    next();
  } else {
    res.status(403).json({ message: 'Quyền CSKH hoặc Admin được yêu cầu.' });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Quyền quản trị tối cao (Admin) được yêu cầu.' });
  }
};

// 1. Approve KYC document / identity CCCD
router.put('/api/admin/users/:id/kyc', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = await db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tìm thấy.' });

    const updatedUser = await db.users.update(id, {
      licenseStatus: status,
      cccdStatus: status,
      cccdBackStatus: status,
      faceStatus: status,
      licenseImage: status === 'rejected' ? null : user.licenseImage,
      kycDocuments: {
        ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
        license: status === 'rejected' ? null : user.licenseImage
      }
    });

    // Send KYC notifications
    await notificationService.createNotification(
      id,
      status === 'verified' ? 'Xác thực KYC thành công' : 'Xác thực KYC thất bại',
      status === 'verified'
        ? 'Hồ sơ KYC (CCCD & Bằng lái) của bạn đã được xác minh thành công. Bạn đã có thể thuê xe!'
        : 'Hồ sơ KYC (CCCD & Bằng lái) của bạn đã bị từ chối. Vui lòng cập nhật lại thông tin chính xác.',
      'KYCResult',
      null,
      'KYC'
    );

    res.json({
      message: `Đã phê duyệt trạng thái KYC thành công sang: ${status === 'verified' ? 'Đã xác minh ✓' : 'Từ chối ✕'}`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xét duyệt hồ sơ KYC.' });
  }
});

// 2. Fetch all incidents / accidents
router.get('/api/admin/incidents', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany();
    const reportedIncidents = await Promise.all(bookings
      .filter(b => b.issueReport !== null)
      .map(async (booking) => {
        const user = await db.users.findOne({ id: booking.userId }) || { name: 'Thành viên ẩn' };
        const car = await db.cars.findOne({ id: booking.carId }) || { brand: 'Không rõ', model: 'Xe' };
        return {
          bookingId: booking.id,
          userName: user.name,
          userEmail: user.email,
          carName: `${car.brand} ${car.model}`,
          carImage: car.image,
          incident: booking.issueReport,
          status: booking.status
        };
      }));
    res.json(reportedIncidents);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách sự cố.' });
  }
});

router.put('/api/admin/incidents/:bookingId/resolve', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    await db.bookings.update(bookingId, {
      issueReport: {
        ...booking.issueReport,
        status: 'resolved'
      }
    });

    res.json({ message: 'Đã đánh dấu giải quyết sự cố thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xử lý sự cố.' });
  }
});

// 3. Support Tickets Management
router.get('/api/admin/support/tickets', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const tickets = await db.support_tickets.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư hỗ trợ.' });
  }
});

router.post('/api/admin/support/tickets/:id/reply', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });

    const ticket = await db.support_tickets.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket hỗ trợ không tồn tại.' });

    const replies = [...ticket.replies, {
      senderId: String(req.user.id),
      senderName: req.user.name,
      senderRole: req.user.role,
      message: replyText,
      sentAt: new Date().toISOString()
    }];

    await db.support_tickets.update(id, {
      replies,
      status: 'replied'
    });

    // Notify Renter
    if (ticket.userId) {
      await notificationService.createNotification(
        ticket.userId,
        'Phản hồi hỗ trợ mới',
        `CSKH đã phản hồi yêu cầu hỗ trợ của bạn cho ticket #${id}.`,
        'TicketUpdate',
        id,
        'SupportTicket'
      );
    }

    const updatedTicket = await db.support_tickets.findOne({ id });
    res.json({
      message: 'Đã gửi câu trả lời phản hồi cho khách hàng!',
      ticket: updatedTicket
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi phản hồi.' });
  }
});

router.put('/api/admin/support/tickets/:id/resolve', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.support_tickets.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket hỗ trợ không tồn tại.' });

    await db.support_tickets.update(id, { status: 'resolved' });

    // Notify Renter
    if (ticket.userId) {
      await notificationService.createNotification(
        ticket.userId,
        'Yêu cầu hỗ trợ đã được đóng',
        `Ticket hỗ trợ #${id} của bạn đã được đánh dấu là Đã giải quyết.`,
        'TicketUpdate',
        id,
        'SupportTicket'
      );
    }

    res.json({ message: 'Đã đóng ticket hỗ trợ thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đóng ticket hỗ trợ.' });
  }
});

// 4. Review moderation
router.get('/api/admin/reviews', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const reviews = await db.reviews.findMany();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách đánh giá.' });
  }
});

router.put('/api/admin/reviews/:id/status', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'visible' or 'hidden'

    if (status !== 'visible' && status !== 'hidden') {
      return res.status(400).json({ message: 'Trạng thái đánh giá không hợp lệ.' });
    }

    await db.reviews.update(id, { status });
    res.json({ message: `Đã cập nhật trạng thái hiển thị đánh giá thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ẩn đánh giá.' });
  }
});

// 5. Dispute Case Management
router.get('/api/admin/disputes', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const disputes = await db.disputes.findMany();
    const detailed = await Promise.all(disputes.map(async (d) => {
      const renter = await db.users.findOne({ id: d.renterId }) || { name: 'Người thuê' };
      const owner = await db.users.findOne({ id: d.ownerId }) || { name: 'Chủ xe' };
      const booking = await db.bookings.findOne({ id: d.bookingId }) || { totalPrice: 0 };
      return {
        ...d,
        renterName: renter.name,
        ownerName: owner.name,
        bookingPrice: booking.totalPrice
      };
    }));
    res.json(detailed);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách tranh chấp khiếu nại.' });
  }
});

router.put('/api/admin/disputes/:id/resolve', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionDetails } = req.body;

    if (!resolutionDetails) return res.status(400).json({ message: 'Vui lòng điền nội dung phán quyết giải quyết.' });

    const dispute = await db.disputes.update(id, {
      status: 'resolved',
      resolutionDetails
    });

    await db.bookings.update(dispute.bookingId, { status: 'completed' });

    res.json({ message: 'Đã giải quyết tranh chấp khiếu nại thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi giải quyết khiếu nại.' });
  }
});

// 6. Deposit Refund Trigger
router.put('/api/admin/bookings/:id/refund-deposit', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'refunded' or 'withheld'

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    if (booking.depositStatus === 'refunded') {
      return res.status(400).json({ message: 'Tiền cọc này đã được hoàn trả rồi.' });
    }

    await db.bookings.update(id, { depositStatus: status });

    if (status === 'refunded') {
      if (booking.paymentMethod === 'wallet') {
        // Cộng 500.000đ tiền giữ chỗ vào ví người dùng qua stored procedure (an toàn, atomic)
        const p = await getPool();
        const refundAmount = Math.round(booking.totalPrice * 0.3);
        const userId = parseInt(booking.userId);
        const bookingIdInt = parseInt(id);

        await p.request()
          .input('userId', sql.Int, userId)
          .input('bookingId', sql.Int, bookingIdInt)
          .input('amount', sql.Decimal(18, 2), refundAmount)
          .input('txnType', sql.NVarChar, 'DepositRefund')
          .input('description', sql.NVarChar, `Hoàn trả tiền phí giữ chỗ cho đặt xe #${id}`)
          .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');

        console.log(`Deposit refunded to wallet: ${refundAmount} VND to userId=${userId} for bookingId=${id}`);
      } else {
        console.log(`Deposit marked as refunded offline/vnpay: bookingId=${id}`);
      }
    }


    res.json({
      message: status === 'refunded'
        ? (booking.paymentMethod === 'wallet'
          ? 'Đã duyệt hoàn trả phí giữ chỗ thành công! Tiền đã được cộng vào ví của người dùng.'
          : 'Đã duyệt hoàn phí giữ chỗ! Do đơn đặt xe này thanh toán ngoại tuyến/VNPAY, tiền cọc sẽ do chủ xe hoàn trả trực tiếp.')
        : 'Đã giữ lại tiền giữ chỗ do phát sinh các thiệt hại vật chất đối với xe.'
    });
  } catch (error) {
    console.error('Lỗi hoàn cọc:', error);
    res.status(500).json({ message: 'Lỗi xử lý tiền cọc.' });
  }
});

// 6b. Xác nhận đã nhận tiền VietQR (chuyển khoản cọc giữ chỗ 500k)
router.put('/api/admin/bookings/:id/confirm-vietqr', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    if (booking.paymentMethod !== 'vietqr') {
      return res.status(400).json({ message: 'Đơn đặt xe này không sử dụng phương thức VietQR.' });
    }
    if (booking.depositStatus === 'paid') {
      return res.status(400).json({ message: 'Đơn đặt xe này đã được xác nhận thanh toán rồi.' });
    }

    // Cập nhật trạng thái thanh toán cọc và booking
    await db.bookings.update(id, {
      depositStatus: 'paid',
      payment_status: 'paid',
      status: 'Approved',
    });

    res.json({
      message: `Đã xác nhận nhận được phí giữ chỗ VietQR cho đơn đặt xe #${id}. Booking đã được duyệt!`,
    });
  } catch (error) {
    console.error('Lỗi xác nhận VietQR:', error);
    res.status(500).json({ message: 'Lỗi xác nhận VietQR.' });
  }
});

// ADMIN ONLY OPERATIONS

// 1. User role delegation
router.put('/api/admin/users/:id/role', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'renter', 'owner', 'cskh', 'admin'

    if (role !== 'renter' && role !== 'owner' && role !== 'cskh' && role !== 'admin') {
      return res.status(400).json({ message: 'Vai trò phân quyền không hợp lệ.' });
    }

    const updatedUser = await db.users.update(id, { role });
    res.json({
      message: `Phân quyền thành viên thành công thành vai trò: ${role.toUpperCase()}`,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi phân quyền.' });
  }
});

// 2. Car Moderation / Verification (pending list)
router.get('/api/admin/cars/pending', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const allCars = await db.cars.findMany();
    const pendingCars = allCars.filter(c => c.status === 'pending_moderation');
    res.json(pendingCars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách xe chờ duyệt.' });
  }
});

// Moderate pending car
router.put('/api/admin/cars/:id/moderation', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'available' or 'rejected'

    if (status !== 'available' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái kiểm duyệt không hợp lệ.' });
    }

    const car = await db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Phương tiện không tồn tại.' });

    await db.cars.update(id, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null
    });

    // Notify Owner
    if (car.ownerId) {
      await notificationService.createNotification(
        car.ownerId,
        status === 'available' ? 'Phương tiện đăng ký cho thuê đã được duyệt' : 'Phương tiện đăng ký cho thuê bị từ chối',
        status === 'available'
          ? `Xe ${car.brand} ${car.model} của bạn đã được kiểm duyệt và hiển thị trên hệ thống cho thuê xe.`
          : `Xe ${car.brand} ${car.model} của bạn đã bị từ chối kiểm duyệt. Lý do: ${rejectionReason || 'Không rõ lý do'}.`,
        'SystemAlert',
        id,
        'Car'
      );
    }

    res.json({
      message: status === 'available'
        ? 'Duyệt phương tiện đăng ký cho thuê lên sàn thành công!'
        : 'Đã từ chối phương tiện đăng tải.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi kiểm duyệt phương tiện.' });
  }
});

// 3. System notices & Pricing policies adjustment
router.put('/api/admin/system/config', auth, adminAuth, async (req, res) => {
  try {
    const { serviceFeePercent, insuranceMultiplier, systemNotice, bankId, bankName, bankAccountNumber, bankAccountHolder, maintenanceMode, platformName } = req.body;

    const updated = await db.system_config.update({
      serviceFeePercent: serviceFeePercent !== undefined ? parseFloat(serviceFeePercent) : undefined,
      insuranceMultiplier: insuranceMultiplier !== undefined ? parseFloat(insuranceMultiplier) : undefined,
      systemNotice,
      bankId,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      maintenanceMode,
      platformName
    });

    res.json({
      message: 'Cập nhật cấu hình dịch vụ hệ thống thành công!',
      config: updated
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật cấu hình hệ thống.' });
  }
});

// Thống kê hệ thống
router.get('/api/admin/stats', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { date, month, startDate, endDate } = req.query;

    const users = await db.users.findMany();
    const cars = await db.cars.findMany();
    let bookings = await db.bookings.findMany();

    const getBDate = (b) => {
      if (b.createdAt) return b.createdAt.split('T')[0];
      if (b.created_at) return new Date(b.created_at).toISOString().split('T')[0];
      if (b.pickupDate) return b.pickupDate.split('T')[0];
      return '';
    };

    if (date) {
      bookings = bookings.filter(b => getBDate(b) === date);
    } else if (month) {
      bookings = bookings.filter(b => getBDate(b).startsWith(month));
    } else if (startDate || endDate) {
      bookings = bookings.filter(b => {
        const d = getBDate(b);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'active' || b.status === 'Approved');
    const totalCashFlow = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const ownerPayouts = confirmedBookings.reduce((sum, b) => {
      const gross = b.rentalPrice || 0;
      return sum + (gross - Math.floor(gross * 0.05));
    }, 0);
    const platformProfit = totalCashFlow - ownerPayouts;

    const rentedCount = cars.filter(c => c.status === 'rented').length;
    const availableCount = cars.filter(c => c.status === 'available').length;
    const maintenanceCount = cars.filter(c => c.status === 'maintenance' || c.status === 'inactive').length;
    const pendingCount = cars.filter(c => c.status === 'pending_moderation').length;
    const rejectedCount = cars.filter(c => c.status === 'rejected').length;

    // Calculate Top Rented Cars Leaderboard strictly from REAL database booking records
    const carBookingCounts = {};
    const carMonthlyCounts = {};
    const currentMonthStr = new Date().toISOString().substring(0, 7);

    const allBookings = await db.bookings.findMany();
    // Only count valid non-cancelled bookings
    const validBookings = allBookings.filter(b => !['cancelled', 'Cancelled', 'rejected', 'Rejected'].includes(b.status));
    const cancelledBookings = allBookings.filter(b => ['cancelled', 'Cancelled', 'rejected', 'Rejected'].includes(b.status));

    validBookings.forEach(b => {
      const cId = b.carId || b.car_id;
      if (!cId) return;
      carBookingCounts[cId] = (carBookingCounts[cId] || 0) + 1;

      const bMonth = getBDate(b).substring(0, 7);
      if (bMonth === currentMonthStr) {
        carMonthlyCounts[cId] = (carMonthlyCounts[cId] || 0) + 1;
      }
    });

    // Sort cars by actual booking count from database
    const sortedCarIds = Object.keys(carBookingCounts).sort((a, b) => (carBookingCounts[b] || 0) - (carBookingCounts[a] || 0));

    let topRentedCars = [];
    sortedCarIds.forEach(cId => {
      const foundCar = cars.find(c => String(c.id) === String(cId));
      if (foundCar && carBookingCounts[cId] > 0) {
        const carName = (foundCar.brand && foundCar.model) 
          ? `${foundCar.brand} ${foundCar.model}` 
          : (foundCar.name || `${foundCar.brand || ''} ${foundCar.model || ''}`.trim() || 'Xe cho thuê');
        topRentedCars.push({
          id: foundCar.id,
          name: carName,
          brand: foundCar.brand || '',
          model: foundCar.model || '',
          licensePlate: foundCar.plateNumber || foundCar.licensePlate || foundCar.license_plate || 'Chưa cập nhật',
          image: foundCar.image || foundCar.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
          totalBookings: carBookingCounts[cId] || 0,
          monthlyBookings: carMonthlyCounts[cId] || 0,
          pricePerDay: foundCar.pricePerDay || 0
        });
      }
    });

    const topRentedCar = topRentedCars[0] || null;

    // Top Spending Customers
    const customerSpentMap = {};
    validBookings.forEach(b => {
      const uEmail = b.userEmail || b.email || b.renterName || 'Khách hàng';
      const uName = b.renterName || b.userName || uEmail.split('@')[0];
      if (!customerSpentMap[uEmail]) {
        customerSpentMap[uEmail] = { name: uName, email: uEmail, bookings: 0, totalSpent: 0 };
      }
      customerSpentMap[uEmail].bookings += 1;
      customerSpentMap[uEmail].totalSpent += (b.totalPrice || 0);
    });

    const topCustomers = Object.values(customerSpentMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Recent Transactions
    const recentTransactions = allBookings
      .slice(-10)
      .reverse()
      .map(b => ({
        id: b.id,
        email: b.userEmail || b.email || b.renterName || 'user@example.com',
        carName: b.carName || 'Xe cho thuê',
        amount: b.totalPrice || 0,
        status: b.status || 'Pending',
        date: getBDate(b) || new Date().toISOString().split('T')[0]
      }));

    // CFO Analytics & Financial Loss
    const lostRevenue = cancelledBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const aov = validBookings.length > 0 ? Math.round(totalCashFlow / validBookings.length) : 0;
    const conversionRate = allBookings.length > 0 ? Math.round((validBookings.length / allBookings.length) * 100) : 100;

    // Role Distribution
    const roleMap = { renter: 0, owner: 0, admin: 0, cskh: 0 };
    users.forEach(u => {
      const r = (u.role || 'renter').toLowerCase();
      if (roleMap[r] !== undefined) roleMap[r]++;
      else roleMap.renter++;
    });

    // Recent Activity Logs
    const activityLogs = [
      { id: 1, type: 'Khách hàng', title: 'Khách hàng hoàn tất xác minh GPLX', ref: 'Ref: GPLX OK', time: 'Mới nhất' },
      { id: 2, type: 'Hệ thống', title: 'Tự động tạo hợp đồng điện tử thuê xe', ref: 'Ref: Hợp đồng PDF', time: 'Vừa xong' },
      { id: 3, type: 'Khách hàng', title: 'Khách hàng đặt xe & thanh toán VNPay', ref: 'Ref: Đơn đặt xe', time: '10 phút trước' },
      { id: 4, type: 'Chủ xe', title: 'Chủ xe phê duyệt lịch thuê', ref: 'Ref: Duyệt xe', time: '30 phút trước' },
      { id: 5, type: 'Hệ thống', title: 'Đồng bộ doanh thu hệ thống', ref: 'Ref: System Sync', time: '1 giờ trước' }
    ];

    res.json({
      stats: {
        totalUsers: users.length,
        totalCars: cars.length,
        totalBookings: bookings.length,
        totalCashFlow,
        ownerPayouts,
        platformProfit,
        totalRevenue: totalCashFlow,
        rentedCars: rentedCount,
        availableCars: availableCount,
        maintenanceCars: maintenanceCount,
        pendingCars: pendingCount,
        rejectedCars: rejectedCount,
        topRentedCar,
        topRentedCars,
        topCustomers,
        recentTransactions,
        userRoleDistribution: roleMap,
        activityLogs,
        cfoAnalytics: {
          aov,
          lostRevenue,
          conversionRate,
          discountSavings: 0,
          discountUsageRate: 0
        }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Lỗi lấy số liệu thống kê.' });
  }
});

// Thống kê doanh thu theo tháng (cho chart)
router.get('/api/admin/stats/monthly', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { year, month, date, startDate, endDate } = req.query;
    let targetYear = new Date().getFullYear();
    if (year) targetYear = parseInt(year);
    else if (month) targetYear = parseInt(month.split('-')[0]);
    else if (date) targetYear = parseInt(date.split('-')[0]);
    else if (startDate) targetYear = parseInt(startDate.split('-')[0]);

    const bookings = await db.bookings.findMany();
    const confirmedBookings = bookings.filter(b => ['confirmed', 'completed', 'active', 'Approved', 'Active', 'Completed'].includes(b.status));

    const getBDate = (b) => {
      if (b.createdAt) return b.createdAt.split('T')[0];
      if (b.created_at) return new Date(b.created_at).toISOString().split('T')[0];
      if (b.pickupDate) return b.pickupDate.split('T')[0];
      return '';
    };

    let filteredBookings = confirmedBookings;
    if (date) {
      filteredBookings = confirmedBookings.filter(b => getBDate(b) === date);
    } else if (month) {
      filteredBookings = confirmedBookings.filter(b => getBDate(b).startsWith(month));
    } else if (startDate || endDate) {
      filteredBookings = confirmedBookings.filter(b => {
        const d = getBDate(b);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    } else {
      filteredBookings = confirmedBookings.filter(b => {
        const d = getBDate(b);
        return d.startsWith(String(targetYear));
      });
    }

    const monthMap = {};
    filteredBookings.forEach(b => {
      const d = getBDate(b);
      if (!d) return;
      const m = parseInt(d.split('-')[1]);
      if (!m || isNaN(m)) return;

      if (!monthMap[m]) monthMap[m] = { revenue: 0, bookings: 0 };
      monthMap[m].revenue += (b.totalPrice || 0);
      monthMap[m].bookings += 1;
    });

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: monthMap[i + 1]?.revenue || 0,
      bookings: monthMap[i + 1]?.bookings || 0
    }));

    res.json({ monthlyStats, targetYear });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê doanh thu theo tháng.' });
  }
});

// Danh sách tất cả người dùng
router.get('/api/admin/users', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const users = await db.users.findMany();
    const safeUsers = users.map(user => sanitizeUser(user));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách thành viên.' });
  }
});

// Duyệt bằng lái xe
router.put('/api/admin/users/:id/license', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = await db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tồn tại.' });

    const updatedUser = await db.users.update(id, {
      licenseStatus: status,
      licenseImage: status === 'rejected' ? null : user.licenseImage,
      kycDocuments: {
        ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
        license: status === 'rejected' ? null : user.licenseImage
      }
    });

    res.json({
      message: `Đã cập nhật bằng lái xe thành: ${status === 'verified' ? 'Đã Duyệt' : 'Đã Từ Chối'}!`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi duyệt bằng lái.' });
  }
});

// Danh sách tất cả các đơn đặt xe
router.get('/api/admin/bookings', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany();
    const detailedBookings = await Promise.all(bookings.map(async (booking) => {
      const user = await db.users.findOne({ id: booking.userId }) || { name: 'Thành viên đã ẩn' };
      const car = await db.cars.findOne({ id: booking.carId }) || { brand: 'Không xác định', model: 'Xe mẫu' };
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    }));

    res.json(detailedBookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách giao dịch.' });
  }
});

// Cập nhật trạng thái đặt xe trực tiếp
router.put('/api/admin/bookings/:id/status', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    await db.bookings.update(id, { status });
    res.json({ message: 'Đã cập nhật trạng thái đơn đặt xe thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái đặt xe.' });
  }
});

// Gỡ bỏ xe khỏi hệ thống
router.delete('/api/admin/cars/:id', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const car = await db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Xe không tồn tại.' });

    await db.cars.delete(id);
    res.json({ message: 'Đã gỡ bỏ xe khỏi hệ thống cho thuê thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gỡ xe.' });
  }
});

// Xóa tài khoản thành viên (Admin Only)
router.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const userToDelete = await db.users.findOne({ id });
    if (!userToDelete) {
      return res.status(404).json({ message: 'Tài khoản thành viên không tồn tại.' });
    }

    if (userToDelete.role === 'admin' && req.user.id !== 'user-admin-1') {
      return res.status(403).json({ message: 'Chỉ có Admin tối cao mới có thể xóa tài khoản Quản trị khác.' });
    }

    await db.users.delete(id);
    res.json({ message: `Đã xóa tài khoản thành viên "${userToDelete.name}" thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa tài khoản thành viên.' });
  }
});

// AI Operations Assistant Chat Endpoint
router.post('/api/admin/ai-assistant', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Thiếu nội dung câu hỏi.' });
    }

    // 1. Gather all live system contexts
    // Stats
    const users = await db.users.findMany();
    const cars = await db.cars.findMany();
    const bookings = await db.bookings.findMany();

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'active');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPrice || b.totalAmount || 0), 0);

    const stats = {
      totalUsers: users.length,
      totalCars: cars.length,
      totalBookings: bookings.length,
      totalRevenue
    };

    const pendingCars = cars.filter(c => c.status === 'pending_moderation');
    const pendingKycUsers = users.filter(u => u.licenseStatus === 'pending');
    const disputes = await db.disputes.findMany();
    const activeDisputes = disputes.filter(d => d.status === 'open');

    // Resolve details for summary
    // Incidents
    const reportedIncidents = bookings.filter(b => b.issueReport !== null);
    const unresolvedIncidents = reportedIncidents.filter(i => {
      try {
        const rep = typeof i.issueReport === 'string' ? JSON.parse(i.issueReport) : i.issueReport;
        return rep && rep.status !== 'resolved';
      } catch (e) {
        return i.issueReport && i.issueReport.status !== 'resolved';
      }
    });

    const incidentsSummary = unresolvedIncidents.map(inc => {
      let desc = '';
      try {
        const rep = typeof inc.issueReport === 'string' ? JSON.parse(inc.issueReport) : inc.issueReport;
        desc = rep ? rep.description : '';
      } catch (e) {
        desc = inc.issueReport ? inc.issueReport.description : '';
      }
      return `- Chuyến đi #${inc.id}: Khách báo sự cố "${desc}"`;
    }).join('\n');

    // Disputes detail
    const disputesSummary = await Promise.all(activeDisputes.map(async d => {
      const renter = await db.users.findOne({ id: d.renterId }) || { name: 'Khách' };
      const owner = await db.users.findOne({ id: d.ownerId }) || { name: 'Chủ' };
      return `- Tranh chấp #${d.id} giữa Khách ${renter.name} & Chủ ${owner.name}: Lý do: "${d.description}"`;
    }));

    // Cars detail
    const carsSummary = pendingCars.map(c => {
      return `- Xe ${c.brand} ${c.model} (BKS: ${c.license_plate || c.plateNumber}) - Chờ duyệt`;
    }).join('\n');

    const openTickets = await db.support_tickets.findMany();
    const activeTickets = openTickets.filter(t => t.status === 'open');

    const systemContext = {
      stats,
      pendingCarsCount: pendingCars.length,
      pendingKycCount: pendingKycUsers.length,
      activeDisputesCount: activeDisputes.length,
      unresolvedIncidentsCount: unresolvedIncidents.length,
      openTicketsCount: activeTickets.length,
      incidentsSummary,
      disputesSummary: disputesSummary.join('\n'),
      carsSummary
    };

    // 2. Query operational AI assistant
    const reply = await askAdminChatbotAI(message, history, systemContext);
    res.json({ reply });
  } catch (error) {
    console.error('Error in Admin AI operational assistant API:', error);
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu Trợ lý AI Admin.' });
  }
});

// Suggest AI reply for a support ticket
router.get('/api/admin/support/tickets/:id/ai-suggest', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.support_tickets.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket hỗ trợ không tồn tại.' });

    // Gather information about the user who submitted the ticket
    let userContext = {};
    if (ticket.userId) {
      const user = await db.users.findOne({ id: ticket.userId });
      if (user) {
        userContext = {
          kycStatus: user.licenseStatus || 'not_uploaded',
          walletBalance: user.walletBalance || 0
        };
      }
    }

    const suggestion = await suggestSupportTicketReply(ticket, userContext);
    res.json({ suggestion });
  } catch (error) {
    console.error('Error generating support ticket reply suggestion:', error);
    res.status(500).json({ message: 'Lỗi tạo phản hồi tự động gợi ý.' });
  }
});

export default router;
