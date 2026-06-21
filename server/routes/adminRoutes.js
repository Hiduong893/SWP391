import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { sql, getPool } from '../config/db.js';

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
      licenseImage: status === 'rejected' ? null : user.licenseImage,
      kycDocuments: {
        ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
        license: status === 'rejected' ? null : user.licenseImage
      }
    });

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

    res.json({ message: 'Đã gửi câu trả lời phản hồi cho khách hàng!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi phản hồi.' });
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
      // Cộng 5.000.000đ tiền cọc vào ví người dùng qua stored procedure (an toàn, atomic)
      const p = await getPool();
      const refundAmount = 5000000;
      const userId = parseInt(booking.userId);
      const bookingIdInt = parseInt(id);

      await p.request()
        .input('userId', sql.Int, userId)
        .input('bookingId', sql.Int, bookingIdInt)
        .input('amount', sql.Decimal(18, 2), refundAmount)
        .input('txnType', sql.NVarChar, 'DepositRefund')
        .input('description', sql.NVarChar, `Hoàn trả tiền cọc bảo đảm cho đặt xe #${id}`)
        .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');

      console.log(`Deposit refunded: ${refundAmount} VND to userId=${userId} for bookingId=${id}`);
    }


    res.json({
      message: status === 'refunded'
        ? 'Đã duyệt hoàn trả tiền cọc 5.000.000 VND thành công! Tiền đã được cộng vào ví của người dùng.'
        : 'Đã giữ lại tiền đặt cọc do phát sinh các thiệt hại vật chất đối với xe.'
    });
  } catch (error) {
    console.error('Lỗi hoàn cọc:', error);
    res.status(500).json({ message: 'Lỗi xử lý tiền cọc.' });
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

    res.json({
      message: status === 'available'
        ? 'Duyệt phương tiện ký gửi lên sàn thành công!'
        : 'Đã từ chối phương tiện đăng tải.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi kiểm duyệt phương tiện.' });
  }
});

// 3. System notices & Pricing policies adjustment
router.put('/api/admin/system/config', auth, adminAuth, async (req, res) => {
  try {
    const { serviceFeePercent, insuranceMultiplier, systemNotice, bankId, bankName, bankAccountNumber, bankAccountHolder } = req.body;

    const updated = await db.system_config.update({
      serviceFeePercent: serviceFeePercent !== undefined ? parseFloat(serviceFeePercent) : undefined,
      insuranceMultiplier: insuranceMultiplier !== undefined ? parseFloat(insuranceMultiplier) : undefined,
      systemNotice,
      bankId,
      bankName,
      bankAccountNumber,
      bankAccountHolder
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
    const users = await db.users.findMany();
    const cars = await db.cars.findMany();
    const bookings = await db.bookings.findMany();

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'active');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    const rentedCount = cars.filter(c => c.status === 'rented').length;
    const availableCount = cars.filter(c => c.status === 'available').length;
    const maintenanceCount = cars.filter(c => c.status === 'maintenance' || c.status === 'inactive').length;
    const pendingCount = cars.filter(c => c.status === 'pending_moderation').length;
    const rejectedCount = cars.filter(c => c.status === 'rejected').length;

    res.json({
      stats: {
        totalUsers: users.length,
        totalCars: cars.length,
        totalBookings: bookings.length,
        totalRevenue,
        rentedCars: rentedCount,
        availableCars: availableCount,
        maintenanceCars: maintenanceCount,
        pendingCars: pendingCount,
        rejectedCars: rejectedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy số liệu thống kê.' });
  }
});

// Thống kê doanh thu theo tháng (cho chart)
router.get('/api/admin/stats/monthly', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT 
        MONTH(b.created_at) as month,
        ISNULL(SUM(b.rental_price), 0) as revenue,
        COUNT(*) as bookings
      FROM Booking b
      WHERE b.status IN ('Approved', 'Active', 'Completed')
        AND YEAR(b.created_at) = YEAR(GETDATE())
      GROUP BY MONTH(b.created_at)
      ORDER BY month ASC
    `);
    // Build full 12-month array with 0 for months with no data
    const monthMap = {};
    result.recordset.forEach(r => { monthMap[r.month] = { revenue: Number(r.revenue), bookings: r.bookings }; });
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: monthMap[i + 1]?.revenue || 0,
      bookings: monthMap[i + 1]?.bookings || 0
    }));
    res.json({ monthlyStats });
  } catch (error) {
    console.error('Monthly stats error:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê tháng.' });
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

export default router;
