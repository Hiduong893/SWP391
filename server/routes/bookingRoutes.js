import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { compareFacesWithAI } from '../utils/aiHelper.js';
import { contractModel } from '../models/contractModel.js';
import { sql, getPool } from '../config/db.js';

const router = express.Router();

// 15. POST Booking (Đặt xe & Đặt cọc)
router.post('/api/bookings', auth, async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, totalPrice, rentalPriceForOwner, paymentMethod, scannedFace, contractSignature, agreementChecked } = req.body;

    if (!carId || !pickupDate || !returnDate || !pickupLocation || !totalPrice) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin đặt xe.' });
    }

    const car = await db.cars.findOne({ id: carId });
    if (!car) return res.status(400).json({ message: 'Xe không tồn tại.' });
    if (car.status !== 'available') return res.status(400).json({ message: 'Xe này hiện tại đã có khách đặt.' });

    const user = await db.users.findOne({ id: req.user.id });
    if (user.licenseStatus !== 'verified') {
      return res.status(400).json({ message: 'Tài khoản chưa xác thực Bằng lái xe. Vui lòng xác thực trước khi đặt xe.' });
    }

    // Biometric face verification check if user has registered face in KYC
    if (user.kycDocuments?.faceImage) {
      if (!scannedFace) {
        return res.status(400).json({ message: 'Vui lòng thực hiện quét khuôn mặt sinh trắc học để xác thực đặt xe.' });
      }

      console.log('Running AI face verification for checkout...');
      const faceResult = await compareFacesWithAI(user.kycDocuments.faceImage, scannedFace);
      if (!faceResult.verified) {
        return res.status(400).json({ message: `Xác thực khuôn mặt thất bại: ${faceResult.reason || 'Khuôn mặt không khớp'}` });
      }
      console.log('AI Face Verification passed. Score:', faceResult.score);
    }

    const booking = await db.bookings.create({
      userId: req.user.id,
      carId,
      pickupDate,
      returnDate,
      pickupLocation,
      totalPrice,
      rentalPriceForOwner,
      paymentMethod,
      contractDetails: {
        signature: contractSignature || null,
        signedAt: new Date().toISOString(),
        scannedFace: scannedFace || null,
        agreementChecked: agreementChecked === true
      }
    });

    // Tạo hợp đồng mẫu/nháp (Draft) trong bảng RentalContract
    await contractModel.create(booking.id, paymentMethod === 'wallet');

    // Người thuê đã đồng ý điều khoản + ký tay trong BookingModal → tự động ký hợp đồng điện tử ngay
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      await contractModel.renterSign(booking.id, req.user.id, clientIp);
    } catch (signErr) {
      // Không chặn đặt xe nếu tự ký thất bại (ví dụ: đã ký rồi)
      console.warn('Auto renter-sign warning:', signErr.message);
    }

    // Gửi thông báo (không chặn booking nếu notification lỗi)
    try {
      if (paymentMethod !== 'vnpay') {
        // 1. Thông báo cho Renter (người vừa đặt xe)
        await notificationService.createNotification(
          req.user.id,
          'Đặt xe thành công',
          `Bạn đã đặt xe ${car.brand} ${car.model} thành công (Mã: #${booking.id}). ${booking.status === 'pending_owner' ? 'Đang chờ chủ xe phê duyệt.' : 'Chuyến đi đã được xác nhận.'}`,
          'BookingUpdate',
          booking.id,
          'Booking'
        );

        // 2. Thông báo cho Chủ xe (nếu là xe của owner thực sự)
        if (car.ownerId) {
          await notificationService.createNotification(
            car.ownerId,
            'Yêu cầu đặt xe mới',
            `Khách hàng ${user.name} đã đặt xe ${car.brand} ${car.model} của bạn (Mã: #${booking.id}). Vui lòng phê duyệt yêu cầu.`,
            'BookingUpdate',
            booking.id,
            'Booking'
          );
        }

        // 3. Thông báo cho CSKH
        await notificationService.notifyCSKH(
          'Yêu cầu đặt xe mới',
          `Khách hàng ${user.name} đã đặt xe ${car.brand} ${car.model} (Mã: #${booking.id}).`,
          'BookingUpdate',
          booking.id,
          'Booking'
        );
      }
    } catch (notifErr) {
      console.warn('Notification send warning (non-blocking):', notifErr.message);
    }

    res.status(201).json({
      message: booking.status === 'pending_owner'
        ? 'Đặt xe và chuyển cọc thành công! Đang chờ Chủ xe phê duyệt chấp thuận hành trình.'
        : 'Đặt xe và chuyển cọc thành công! Vé thuê xe của bạn đã được xác nhận.',
      booking
    });
  } catch (error) {
    console.error('Booking Creation Error:', error);
    import('fs').then(fs => fs.writeFileSync('debug_error.log', error.stack || error.message));
    res.status(500).json({ message: 'Lỗi tạo giao dịch đặt xe. ' + (error.message || '') });
  }
});

// 16. GET Trips (Chuyến đi của tôi)
router.get('/api/bookings/my-trips', auth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany({ userId: req.user.id });

    const trips = await Promise.all(bookings.map(async (booking) => {
      const car = await db.cars.findOne({ id: booking.carId });
      const reviews = await db.reviews.findMany({ bookingId: booking.id });
      return {
        ...booking,
        car: car || { brand: 'Không xác định', model: 'Xe mẫu', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
        hasReviewed: reviews.length > 0,
        review: reviews[0] || null
      };
    }));

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải chuyến đi.' });
  }
});



// 18. Sign Electronic Handover Documents (Biên bản bàn giao Nhận/Trả xe)
router.put('/api/bookings/:id/handover', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, checklist, signature } = req.body;

    if (!type || !checklist) {
      return res.status(400).json({ message: 'Vui lòng hoàn thành checklist bàn giao xe.' });
    }

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const updatedHandover = {
      ...(booking.handoverDocs || { pickup: null, return: null })
    };

    updatedHandover[type] = {
      checklist,
      signature,
      timestamp: new Date().toISOString()
    };

    let nextStatus = booking.status;
    if (type === 'pickup') {
      nextStatus = 'active';
    } else if (type === 'return') {
      nextStatus = 'completed';
    }

    await db.bookings.update(id, {
      handoverDocs: updatedHandover,
      status: nextStatus
    });

    const car = await db.cars.findOne({ id: booking.carId });
    if (car && car.ownerId) {
      const typeText = type === 'pickup' ? 'nhận xe (pickup)' : 'trả xe (return)';
      const statusText = type === 'pickup' ? 'bắt đầu hành trình' : 'hoàn thành chuyến đi';
      await notificationService.createNotification(
        car.ownerId,
        type === 'pickup' ? 'Biên bản nhận xe đã ký' : 'Biên bản trả xe đã ký',
        `Khách hàng đã ký biên bản bàn giao ${typeText} cho xe ${car.brand} ${car.model} (#${id}) và ${statusText}.`,
        'BookingUpdate',
        id,
        'Booking'
      );

      // Tự động phân bổ doanh thu khi chuyến đi hoàn thành (Trả xe)
      if (type === 'return') {
        try {
          const pool = await getPool();
          // Khách hàng đã trả 70% trực tiếp cho Chủ xe lúc nhận xe.
          // Tổng doanh thu Chủ xe được hưởng là 90%. 
          // Do đó, Admin chỉ cần thanh toán nốt 20% (90% - 70%) từ phần cọc 30% đang giữ.
          const ownerPayout = booking.totalPrice * 0.2; 
          const adminProfit = booking.totalPrice * 0.1;
          
          // Cộng phần tiền còn thiếu vào ví Chủ xe (20%)
          await pool.request()
            .input('userId', sql.Int, car.ownerId)
            .input('bookingId', sql.Int, id)
            .input('amount', sql.Decimal(18,2), ownerPayout)
            .input('txnType', sql.VarChar, 'Revenue')
            .input('description', sql.NVarChar, `Thanh toán 20% cọc còn lại chuyến đi #${id} (Đã nhận 70% tiền mặt)`)
            .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
            
          // Cộng tiền vào ví Admin (Lợi nhuận sàn 10%)
          const adminRes = await pool.request().query("SELECT TOP 1 u.user_id FROM Users u JOIN UserRole ur ON u.user_id = ur.user_id JOIN Role r ON ur.role_id = r.role_id WHERE r.role_name = 'Admin'");
          if (adminRes.recordset.length > 0) {
            const adminId = adminRes.recordset[0].user_id;
            await pool.request()
              .input('userId', sql.Int, adminId)
              .input('bookingId', sql.Int, id)
              .input('amount', sql.Decimal(18,2), adminProfit)
              .input('txnType', sql.VarChar, 'Commission')
              .input('description', sql.NVarChar, `Lợi nhuận sàn 10% từ chuyến đi #${id}`)
              .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
          }
        } catch (err) {
          console.error('Lỗi tự động đối soát chuyển tiền ví:', err);
        }
      }
    }

    res.json({
      message: type === 'pickup'
        ? 'Ký biên bản bàn giao nhận xe thành công! Hành trình thuê xe bắt đầu.'
        : 'Ký biên bản trả xe thành công! Bạn có thể gửi đánh giá cho chủ xe.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ký biên bản bàn giao.' });
  }
});





export default router;
