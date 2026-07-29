import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { compareFacesWithAI, compareFaceWithDocument } from '../utils/aiHelper.js';
import { contractModel } from '../models/contractModel.js';
import { sql, getPool } from '../config/db.js';

const router = express.Router();

// Face verification endpoint — compare live photo with CCCD/License (Option A)
router.post('/api/bookings/verify-face', auth, async (req, res) => {
  try {
    const { scannedFace } = req.body;
    if (!scannedFace) {
      return res.status(400).json({ verified: false, reason: 'Thiếu ảnh khuôn mặt.' });
    }

    const user = await db.users.findOne({ id: req.user.id });

    // Check CCCD/License exists
    const cccdImage = user.kycDocuments?.cccd || null;
    const licenseImage = user.kycDocuments?.license || null;

    if (!cccdImage && !licenseImage) {
      return res.status(400).json({
        verified: false,
        reason: 'Tài khoản chưa tải lên ảnh CCCD hoặc Bằng lái xe. Vui lòng cập nhật trong Hồ sơ cá nhân.',
        apiError: false
      });
    }

    console.log('Running AI face-document verification for booking...');
    const result = await compareFaceWithDocument(
      { cccd: cccdImage, license: licenseImage },
      scannedFace
    );

    console.log('Face-Document verification result:', { verified: result.verified, score: result.score, apiError: result.apiError });

    res.json({
      verified: result.verified,
      score: result.score || 0,
      reason: result.reason || '',
      apiError: result.apiError || false,
      allowProceed: result.apiError === true // Allow proceed when API errors (CSKH will review)
    });
  } catch (error) {
    console.error('Face verification endpoint error:', error);
    // On unexpected error, allow proceed with CSKH fallback
    res.json({
      verified: false,
      score: 0,
      reason: 'Hệ thống xác thực khuôn mặt tạm thời gặp sự cố. Đơn đặt xe sẽ chờ CSKH duyệt thủ công.',
      apiError: true,
      allowProceed: true
    });
  }
});

// 15. POST Booking (Đặt xe & Đặt cọc)
router.post('/api/bookings', auth, async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, totalPrice, rentalPriceForOwner, paymentMethod, scannedFace, contractSignature, agreementChecked, faceVerificationSkipped } = req.body;

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

    // Option A: Face verification against CCCD/License (not registered face)
    // If faceVerificationSkipped is true (API error fallback), allow booking but flag it
    let faceVerificationStatus = 'not_required';

    if (scannedFace) {
      if (faceVerificationSkipped) {
        // API error case: allow booking, mark as pending manual review
        faceVerificationStatus = 'pending_manual';
        console.log('Face verification skipped due to API error. Booking will require CSKH manual review.');
      } else {
        // Normal case: re-verify on server side
        const cccdImage = user.kycDocuments?.cccd || null;
        const licenseImage = user.kycDocuments?.license || null;

        if (cccdImage || licenseImage) {
          console.log('Running server-side AI face-document verification for booking...');
          const faceResult = await compareFaceWithDocument(
            { cccd: cccdImage, license: licenseImage },
            scannedFace
          );

          if (faceResult.apiError) {
            // API error on server side too — allow booking with CSKH flag
            faceVerificationStatus = 'pending_manual';
            console.log('Server AI face verification failed (API error). Flagging for CSKH review.');
          } else if (!faceResult.verified) {
            return res.status(400).json({
              message: `Xác thực khuôn mặt thất bại: ${faceResult.reason || 'Khuôn mặt không khớp với ảnh trên CCCD/Bằng lái xe.'}`
            });
          } else {
            faceVerificationStatus = 'verified';
            console.log('AI Face-Document Verification passed. Score:', faceResult.score);
          }
        }
      }
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
        agreementChecked: agreementChecked === true,
        faceVerificationStatus
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
        const cskhMessage = faceVerificationStatus === 'pending_manual'
          ? `⚠️ [CẦN DUYỆT THỦ CÔNG] Khách hàng ${user.name} đã đặt xe ${car.brand} ${car.model} (Mã: #${booking.id}). Xác thực FaceID tự động bị lỗi — cần CSKH đối chiếu khuôn mặt thủ công.`
          : `Khách hàng ${user.name} đã đặt xe ${car.brand} ${car.model} (Mã: #${booking.id}).`;

        await notificationService.notifyCSKH(
          faceVerificationStatus === 'pending_manual' ? '⚠️ Đặt xe mới — Cần duyệt FaceID thủ công' : 'Yêu cầu đặt xe mới',
          cskhMessage,
          'BookingUpdate',
          booking.id,
          'Booking'
        );
      }
    } catch (notifErr) {
      console.warn('Notification send warning (non-blocking):', notifErr.message);
    }

    const successMessage = faceVerificationStatus === 'pending_manual'
      ? 'Đặt xe thành công! Lưu ý: Xác thực khuôn mặt đang chờ CSKH duyệt thủ công do hệ thống AI gặp sự cố.'
      : booking.status === 'pending_owner'
        ? 'Đặt xe và chuyển cọc thành công! Đang chờ Chủ xe phê duyệt chấp thuận hành trình.'
        : 'Đặt xe và chuyển cọc thành công! Vé thuê xe của bạn đã được xác nhận.';

    res.status(201).json({
      message: successMessage,
      booking,
      faceVerificationStatus
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

// 17. Owner reports a traffic violation ticket (Phạt nguội)
router.post('/api/bookings/:id/report-violation', auth, async (req, res) => {
  try {
    const { id } = req.params; // bookingId
    const { amount, description, ticketImageUrl } = req.body;

    if (!amount || !description) {
      return res.status(400).json({ message: 'Vui lòng cung cấp số tiền phạt và mô tả chi tiết.' });
    }

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    // Ensure the person reporting is the owner of the car
    if (!car || String(car.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Bạn không có quyền báo cáo cho chuyến đi này.' });
    }

    // Create a dispute/claim of type 'traffic_violation'
    const newDispute = await db.disputes.create({
      bookingId: id,
      renterId: booking.userId,
      ownerId: req.user.id,
      type: 'traffic_violation',
      description: `Chủ xe báo cáo phạt nguội: ${description}`,
      amount: parseFloat(amount),
      evidenceUrls: ticketImageUrl ? [ticketImageUrl] : [],
      status: 'open', // 'open' for admin/cskh review
    });

    // Notify CSKH
    await notificationService.notifyCSKH(
      'Báo cáo phạt nguội mới',
      `Chủ xe ${req.user.name} vừa báo cáo một phiếu phạt nguội cho chuyến đi #${id}. Vui lòng vào mục "Khiếu nại" để xử lý.`,
      'DisputeUpdate',
      newDispute.id,
      'Dispute'
    );

    res.status(201).json({
      message: 'Đã gửi báo cáo phạt nguội thành công. CSKH sẽ xem xét và thông báo đến bạn và người thuê trong thời gian sớm nhất.',
      dispute: newDispute,
    });

  } catch (error) {
    console.error('Error reporting traffic violation:', error);
    res.status(500).json({ message: 'Lỗi khi gửi báo cáo phạt nguội.' });
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
