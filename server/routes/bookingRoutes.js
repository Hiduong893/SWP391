import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { compareFacesWithAI, analyzeCarInspectionWithAI } from '../utils/aiHelper.js';
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

    // Strict validation: Only allow pickup handover if owner/admin has approved (confirmed status)
    if (type === 'pickup' && booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Chủ xe chưa phê duyệt đơn đặt xe này. Không thể thực hiện bàn giao nhận xe.' });
    }

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
      nextStatus = 'return_pending_owner';
      // Automatically attach default pickup document if pickup step was skipped
      if (!updatedHandover.pickup) {
        updatedHandover.pickup = {
          checklist: ['noScratches', 'fuelOk', 'cleanCar', 'tiresOk'],
          signature: 'auto_implicit_pickup',
          timestamp: new Date().toISOString()
        };
      }
    }

    await db.bookings.update(id, {
      handoverDocs: updatedHandover,
      status: nextStatus
    });

    const car = await db.cars.findOne({ id: booking.carId });
    if (car && car.ownerId) {
      const typeText = type === 'pickup' ? 'nhận xe (pickup)' : 'trả xe (return)';
      const statusText = type === 'pickup' ? 'bắt đầu hành trình' : 'đã nộp biên bản trả xe (chờ chủ xe xác nhận)';
      await notificationService.createNotification(
        car.ownerId,
        type === 'pickup' ? 'Biên bản nhận xe đã ký' : 'Biên bản trả xe cần xác nhận',
        `Khách hàng đã ký biên bản bàn giao ${typeText} cho xe ${car.brand} ${car.model} (#${id}) và ${statusText}. Vui lòng kiểm tra xe thực tế và bấm 'Xác nhận nhận lại xe'.`,
        'BookingUpdate',
        id,
        'Booking'
      );
    }

    res.json({ message: type === 'return' ? 'Đã gửi biên bản trả xe! Vui lòng chờ Chủ xe kiểm tra và xác nhận nhận lại xe.' : 'Bàn giao nhận xe thành công! Chúc bạn có chuyến đi an toàn.', booking: await db.bookings.findOne({ id }) });
  } catch (error) {
    console.error('Error signing handover docs:', error);
    res.status(500).json({ message: error.message || 'Lỗi ký biên bản bàn giao.' });
  }
});

// 15b. Car Owner Confirms Vehicle Return (Chủ xe xác nhận đã nhận lại xe & Hoàn tất chuyến đi)
router.put('/api/bookings/:id/owner-confirm-return', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(404).json({ message: 'Xe không tồn tại.' });

    if (String(car.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xác nhận nhận lại xe cho đơn này.' });
    }

    if (booking.status !== 'return_pending_owner' && booking.status !== 'active') {
      return res.status(400).json({ message: 'Đơn đặt xe này chưa ở trạng thái nộp biên bản trả xe.' });
    }

    await db.bookings.update(bookingId, {
      status: 'completed'
    });

    try {
      const pool = await getPool();
      const ownerPayout = booking.totalPrice * 0.2;
      const adminProfit = booking.totalPrice * 0.1;

      await pool.request()
        .input('userId', sql.Int, car.ownerId)
        .input('bookingId', sql.Int, bookingId)
        .input('amount', sql.Decimal(18,2), ownerPayout)
        .input('txnType', sql.VarChar, 'Revenue')
        .input('description', sql.NVarChar, `Thanh toán 20% cọc còn lại chuyến đi #${bookingId} (Đã nhận 70% tiền mặt)`)
        .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');

      const adminRes = await pool.request().query("SELECT TOP 1 u.user_id FROM [User] u JOIN UserRole ur ON u.user_id = ur.user_id JOIN Role r ON ur.role_id = r.role_id WHERE r.role_name = 'Admin'");
      if (adminRes.recordset.length > 0) {
        const adminId = adminRes.recordset[0].user_id;
        await pool.request()
          .input('userId', sql.Int, adminId)
          .input('bookingId', sql.Int, bookingId)
          .input('amount', sql.Decimal(18,2), adminProfit)
          .input('txnType', sql.VarChar, 'PlatformFee')
          .input('description', sql.NVarChar, `Phí hoa hồng sàn 10% cho chuyến đi #${bookingId}`)
          .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
      }
    } catch (e) {
      console.error('Lỗi phân bổ doanh thu khi chủ xe xác nhận trả xe:', e);
    }

    const depositAmount30Pct = Math.round(booking.totalPrice * 0.3);
    const ownerUser = await db.users.findOne({ id: car.ownerId });
    const ownerName = ownerUser ? ownerUser.name : 'Chủ xe';

    await notificationService.notifyCSKH(
      'Chủ xe đã nhận lại xe an toàn - Cần duyệt hoàn cọc 30%',
      `Chủ xe ${ownerName} đã kiểm tra và xác nhận nhận lại xe ${car.brand} ${car.model} (#${bookingId}) an toàn không hư hại. Khoản cọc 30% (${depositAmount30Pct.toLocaleString('vi-VN')}đ) đã sẵn sàng để CSKH duyệt hoàn cọc cho khách.`,
      'DepositRefund',
      bookingId,
      'Booking'
    );

    await notificationService.createNotification(
      booking.userId,
      'Chủ xe đã xác nhận nhận lại xe',
      `Chủ xe đã kiểm tra và xác nhận nhận lại xe ${car.brand} ${car.model} (#${bookingId}) an toàn. Chuyến đi đã chính thức hoàn thành!`,
      'BookingUpdate',
      bookingId,
      'Booking'
    );

    res.json({ message: 'Xác nhận nhận lại xe thành công! Đã gửi thông báo cho CSKH đối soát hoàn cọc.' });
  } catch (error) {
    console.error('Lỗi xác nhận nhận lại xe:', error);
    res.status(500).json({ message: 'Lỗi xác nhận nhận lại xe.' });
  }
});

// 15c. Car Owner Reports Incident / Dispute Upon Return (Chủ xe báo cáo sự cố/hỏng hóc khi nhận lại xe)
router.post('/api/bookings/:id/owner-report-dispute', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { description, incidentType, requestedDeduction } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Vui lòng điền mô tả sự cố / hư hỏng phát sinh.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(404).json({ message: 'Xe không tồn tại.' });

    if (String(car.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền báo cáo sự cố cho đơn đặt xe này.' });
    }

    const issueObj = {
      reporter: 'owner',
      description,
      incidentType: incidentType || 'damage',
      requestedDeduction: Number(requestedDeduction) || 0,
      reportedAt: new Date().toISOString(),
      status: 'pending_cskh'
    };

    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('issueData', sql.NVarChar, JSON.stringify(issueObj))
      .query("UPDATE Booking SET status = 'Disputed', issue_report = @issueData WHERE booking_id = @bookingId");

    const ownerUser = await db.users.findOne({ id: car.ownerId });
    const ownerName = ownerUser ? ownerUser.name : 'Chủ xe';

    await notificationService.notifyCSKH(
      '⚠️ KHIẾU NẠI TRẢ XE TỪ CHỦ XE (CẦN XỬ LÝ)',
      `Chủ xe ${ownerName} đã báo cáo sự cố/hỏng hóc cho chuyến đi #${bookingId} (${car.brand} ${car.model}). Nội dung: "${description}". Đề xuất cấn trừ cọc: ${Number(requestedDeduction || 0).toLocaleString('vi-VN')}đ. CSKH vui lòng kiểm tra và xử lý giữ/trừ cọc.`,
      'Dispute',
      bookingId,
      'Booking'
    );

    await notificationService.createNotification(
      booking.userId,
      '⚠️ Chủ xe báo cáo sự cố khi nhận lại xe',
      `Chủ xe ${ownerName} đã báo cáo sự cố cho chuyến đi #${bookingId}: "${description}". Bộ phận CSKH ViVuCar sẽ liên hệ làm rõ trước khi xử lý cọc.`,
      'BookingUpdate',
      bookingId,
      'Booking'
    );

    res.json({ message: 'Đã gửi báo cáo khiếu nại sự cố tới bộ phận CSKH ViVuCar!' });
  } catch (error) {
    console.error('Lỗi báo cáo khiếu nại trả xe:', error);
    res.status(500).json({ message: 'Lỗi gửi khiếu nại trả xe.' });
  }
});

// 18. Save Check-in / Check-out Inspection Details with Photos & ODO
router.post('/api/bookings/:id/inspection', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { inspectionType, photos, checkinPhotos, checkoutPhotos, odo, fuelLevel, notes, aiReport } = req.body;

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Chuyến đi không tồn tại.' });

    const p = await getPool();

    const checkinList = checkinPhotos || (inspectionType === 'checkin' ? photos : null);
    const checkoutList = checkoutPhotos || (inspectionType === 'checkout' ? photos : null);

    if (checkinList && Array.isArray(checkinList) && checkinList.length > 0) {
      const checkinData = JSON.stringify({
        submittedBy: req.user.id,
        submittedAt: new Date().toISOString(),
        photos: checkinList,
        odo: odo || null,
        fuelLevel: fuelLevel || null,
        notes: notes || '',
        aiReport: aiReport || null
      });
      await p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('data', sql.NVarChar, checkinData)
        .query(`UPDATE Booking SET inspection_checkin = @data WHERE booking_id = @bookingId`);
    }

    if ((checkoutList && Array.isArray(checkoutList) && checkoutList.length > 0) || aiReport) {
      const checkoutData = JSON.stringify({
        submittedBy: req.user.id,
        submittedAt: new Date().toISOString(),
        photos: checkoutList || [],
        odo: odo || null,
        fuelLevel: fuelLevel || null,
        notes: notes || '',
        aiReport: aiReport || null
      });
      await p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('data', sql.NVarChar, checkoutData)
        .query(`UPDATE Booking SET inspection_checkout = @data WHERE booking_id = @bookingId`);
    }

    // Create notification
    const car = await db.cars.findOne({ id: booking.carId });
    const targetUserId = req.user.id === booking.userId ? car?.ownerId : booking.userId;
    if (targetUserId) {
      await notificationService.createNotification(
        targetUserId,
        `Cập nhật biên bản bàn giao xe`,
        `Biên bản kiểm tra hình ảnh xe cho chuyến đi #${bookingId} đã được cập nhật.`,
        'BookingUpdate',
        bookingId,
        'Booking'
      );
    }

    res.json({ message: `Cập nhật biên bản kiểm tra xe thành công!` });
  } catch (error) {
    console.error('Error saving inspection:', error);
    res.status(500).json({ message: 'Lỗi cập nhật biên bản hình ảnh xe.' });
  }
});

// 19. Request Trip Extension (Yêu cầu gia hạn chuyến đi)
router.post('/api/bookings/:id/request-extension', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newReturnDate, extraDays, extraPrice } = req.body;

    if (!newReturnDate || !extraDays || extraDays <= 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ngày trả xe gia hạn hợp lệ.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Chuyến đi không tồn tại.' });
    if (booking.userId !== req.user.id) return res.status(403).json({ message: 'Bạn không có quyền thực hiện trên chuyến đi này.' });

    const extensionData = JSON.stringify({
      requestedReturnDate: newReturnDate,
      extraDays,
      extraPrice: extraPrice || 0,
      status: 'pending',
      requestedAt: new Date().toISOString()
    });

    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('data', sql.NVarChar, extensionData)
      .query('UPDATE Booking SET extension_request = @data WHERE booking_id = @bookingId');

    const car = await db.cars.findOne({ id: booking.carId });
    if (car && car.ownerId) {
      await notificationService.createNotification(
        car.ownerId,
        'Yêu cầu Gia hạn Chuyến đi mới',
        `Khách hàng xin gia hạn thêm ${extraDays} ngày cho chuyến đi #${bookingId} (Hạn mới: ${newReturnDate}). Vui lòng xem xét phê duyệt.`,
        'BookingUpdate',
        bookingId,
        'Booking'
      );
    }

    res.json({ message: 'Đã gửi yêu cầu gia hạn chuyến đi tới Chủ xe thành công!', extension: JSON.parse(extensionData) });
  } catch (error) {
    console.error('Error requesting extension:', error);
    res.status(500).json({ message: 'Lỗi gửi yêu cầu gia hạn chuyến đi.' });
  }
});

// 20. Respond to Trip Extension (Duyệt/Từ chối gia hạn chuyến đi)
router.put('/api/bookings/:id/respond-extension', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Hành động không hợp lệ.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Chuyến đi không tồn tại.' });

    const p = await getPool();
    const currentRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .query('SELECT extension_request, end_datetime, total_amount FROM Booking WHERE booking_id = @bookingId');

    if (currentRes.recordset.length === 0 || !currentRes.recordset[0].extension_request) {
      return res.status(400).json({ message: 'Chuyến đi này hiện không có yêu cầu gia hạn nào.' });
    }

    const extObj = JSON.parse(currentRes.recordset[0].extension_request);
    extObj.status = action === 'approve' ? 'approved' : 'rejected';
    extObj.respondedAt = new Date().toISOString();

    if (action === 'approve') {
      const newReturnDate = extObj.requestedReturnDate;
      const newTotalPrice = Number(currentRes.recordset[0].total_amount) + Number(extObj.extraPrice || 0);

      await p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('newReturnDate', sql.NVarChar, newReturnDate)
        .input('newTotalPrice', sql.Decimal(18, 2), newTotalPrice)
        .input('extData', sql.NVarChar, JSON.stringify(extObj))
        .query('UPDATE Booking SET end_datetime = @newReturnDate, total_amount = @newTotalPrice, extension_request = @extData WHERE booking_id = @bookingId');
    } else {
      await p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('extData', sql.NVarChar, JSON.stringify(extObj))
        .query('UPDATE Booking SET extension_request = @extData WHERE booking_id = @bookingId');
    }

    await notificationService.createNotification(
      booking.userId,
      action === 'approve' ? 'Yêu cầu gia hạn ĐƯỢC CHẤP NHẬN' : 'Yêu cầu gia hạn BỊ TỪ CHỐI',
      action === 'approve'
        ? `Yêu cầu gia hạn cho chuyến đi #${bookingId} đã được duyệt! Ngày trả xe mới: ${extObj.requestedReturnDate}.`
        : `Chủ xe không thể đồng ý gia hạn cho chuyến đi #${bookingId}. Vui lòng trả xe đúng hạn ban đầu.`,
      'BookingUpdate',
      bookingId,
      'Booking'
    );

    res.json({
      message: action === 'approve' ? 'Đã chấp nhận gia hạn chuyến đi thành công!' : 'Đã từ chối yêu cầu gia hạn.',
      extension: extObj
    });
  } catch (error) {
    console.error('Error responding extension:', error);
    res.status(500).json({ message: 'Lỗi xử lý phản hồi gia hạn.' });
  }
});

// 21. AI Inspection Vision Analysis (Phân tích thiệt hại phương tiện bằng Gemini Vision AI)
router.post('/api/bookings/:id/ai-analyze-inspection', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { checkinPhotos, checkoutPhotos, notes } = req.body;

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Chuyến đi không tồn tại.' });

    let checkinImgs = checkinPhotos || [];
    let checkoutImgs = checkoutPhotos || [];

    // Fallback to stored inspection docs if not provided in body
    if (checkinImgs.length === 0 && booking.inspectionCheckin) {
      try {
        const c = typeof booking.inspectionCheckin === 'string' ? JSON.parse(booking.inspectionCheckin) : booking.inspectionCheckin;
        checkinImgs = c.photos || [];
      } catch (e) {}
    }

    if (checkoutImgs.length === 0 && booking.inspectionCheckout) {
      try {
        const c = typeof booking.inspectionCheckout === 'string' ? JSON.parse(booking.inspectionCheckout) : booking.inspectionCheckout;
        checkoutImgs = c.photos || [];
      } catch (e) {}
    }

    // Fetch booking car info for model verification
    let expectedCarModel = booking.carName || '';
    if (booking.carId) {
      const car = await db.cars.findOne({ id: booking.carId });
      if (car) expectedCarModel = `${car.brand} ${car.model}`;
    }

    const aiReport = await analyzeCarInspectionWithAI(checkinImgs, checkoutImgs, notes || '', expectedCarModel);
    res.json({ message: 'Phân tích hình ảnh bằng AI thành công!', report: aiReport });
  } catch (error) {
    console.error('Error analyzing inspection with AI:', error);
    res.status(500).json({ message: 'Lỗi phân tích hình ảnh bằng AI.' });
  }
});

export default router;


