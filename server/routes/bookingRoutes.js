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

    const p = await getPool();
    const isOverlap = await checkCarScheduleOverlap(p, carId, pickupDate, returnDate);
    if (isOverlap) {
      return res.status(400).json({ message: `Xe ${car.brand} ${car.model} đã có lịch đặt trùng trong khoảng thời gian này. Vui lòng chọn xe khác hoặc đổi lịch!` });
    }

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

// Helper to map frontend mock car IDs to real DB vehicle IDs
const mapCarId = (rawId) => {
  const strId = String(rawId || '');
  if (strId.startsWith('lux-car-')) {
    return (strId === 'lux-car-1' || strId === 'lux-car-4') ? 31 : 30;
  }
  if (strId.startsWith('likes-car-')) {
    return (strId === 'likes-car-1' || strId === 'likes-car-2') ? 25 : 22;
  }
  return parseInt(strId) || 22;
};

// Helper to check for overlapping booking dates in SQL Server
const checkCarScheduleOverlap = async (pool, vehicleId, pickupDateStr, returnDateStr) => {
  const formatDateForSql = (dtStr, fallbackTime = '09:00:00') => {
    if (!dtStr) return new Date().toISOString().replace('T', ' ').split('.')[0];
    const str = String(dtStr).trim();
    if (str.includes('T')) {
      const parts = str.split('T');
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split('.')[0].substring(0, 8) : fallbackTime;
      return `${datePart} ${timePart}`;
    }
    if (str.includes(' ')) return str.split('.')[0];
    return `${str} ${fallbackTime}`;
  };

  const startSql = formatDateForSql(pickupDateStr, '09:00:00');
  const endSql = formatDateForSql(returnDateStr, '21:00:00');

  const res = await pool.request()
    .input('vehicleId', sql.Int, parseInt(vehicleId))
    .input('start', sql.VarChar, startSql)
    .input('end', sql.VarChar, endSql)
    .query(`
      SELECT booking_id, status, start_datetime, end_datetime 
      FROM Booking 
      WHERE vehicle_id = @vehicleId 
        AND status NOT IN ('Cancelled', 'Rejected')
        AND start_datetime < CAST(@end AS DATETIME2) 
        AND end_datetime > CAST(@start AS DATETIME2)
    `);

  return res.recordset.length > 0;
};

// 15b. POST Group Booking Checkout (Đặt nhiều xe 1 lúc - Giỏ hàng)
router.post('/api/bookings/group-checkout', auth, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng không có xe nào để thanh toán.' });
    }

    const user = await db.users.findOne({ id: req.user.id });
    if (user.licenseStatus !== 'verified') {
      return res.status(400).json({ message: 'Tài khoản chưa xác thực Bằng lái xe. Vui lòng xác thực trước khi đặt xe.' });
    }

    const p = await getPool();

    // 1. Calculate total group price and 30% deposit & check schedule overlaps
    let groupTotalAmount = 0;
    let groupDepositTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const actualCarId = mapCarId(item.carId);
      let car = await db.cars.findOne({ id: actualCarId });
      if (!car) {
        car = await db.cars.findOne({ id: 22 }); // fallback car if missing
      }

      // Check date schedule overlap
      const isOverlap = await checkCarScheduleOverlap(p, actualCarId, item.pickupDate, item.returnDate);
      if (isOverlap) {
        return res.status(400).json({ 
          message: `Xe ${car.brand} ${car.model} đã có lịch đặt trùng trong khoảng thời gian từ ${new Date(item.pickupDate).toLocaleDateString('vi-VN')} đến ${new Date(item.returnDate).toLocaleDateString('vi-VN')}. Vui lòng chọn xe khác hoặc đổi lịch!` 
        });
      }

      const price = Number(item.totalPrice || 0);
      const dep = Math.round(price * 0.3);
      groupTotalAmount += price;
      groupDepositTotal += dep;
      validatedItems.push({ ...item, actualCarId, car });
    }

    // 2. Create BookingGroup parent record
    const groupRes = await p.request()
      .input('renterId', sql.Int, req.user.id)
      .input('totalAmount', sql.Decimal(18, 2), groupTotalAmount)
      .input('depositTotal', sql.Decimal(18, 2), groupDepositTotal)
      .input('groupStatus', sql.NVarChar, 'Pending')
      .input('paymentMethod', sql.NVarChar, paymentMethod || 'wallet')
      .query(`
        INSERT INTO BookingGroup (renter_id, total_amount, deposit_total, group_status, payment_method, created_at)
        OUTPUT INSERTED.group_id
        VALUES (@renterId, @totalAmount, @depositTotal, @groupStatus, @paymentMethod, GETDATE());
      `);

    const groupId = groupRes.recordset[0].group_id;

    // 3. Process wallet transaction if paying via Wallet
    const pm = String(paymentMethod || '').toLowerCase();
    if (pm === 'wallet') {
      await p.request()
        .input('userId', sql.Int, req.user.id)
        .input('bookingId', sql.Int, null)
        .input('amount', sql.Decimal(18, 2), groupDepositTotal)
        .input('txnType', sql.NVarChar, 'BookingDepositGroup')
        .input('description', sql.NVarChar, `Thanh toán 30% tiền cọc cho giỏ hàng #${groupId} (${items.length} xe)`)
        .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
    }

    // 4. Create individual Booking sub-orders
    const createdBookings = [];
    for (const vItem of validatedItems) {
      const car = vItem.car;
      const price = Number(vItem.totalPrice || 0);
      const rentalP = Number(vItem.rentalPrice || (price * 0.9));
      const platformF = price - rentalP;
      const dep = Math.round(price * 0.3);

      const contractDetails = {
        contractId: `HD-VIVU-${groupId}-${vItem.actualCarId}-${Date.now().toString().slice(-4)}`,
        renterName: user.name || 'Khách Thuê',
        renterPhone: user.phone || '',
        renterIdNo: user.idNo || '035092008888',
        renterSignedAt: new Date().toISOString(),
        renterSignature: user.signature || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="10" y="50" font-family="cursive" font-size="24" fill="%232563eb">${encodeURIComponent(user.name || 'Khách Thuê')}</text></svg>`,
        ownerSignedAt: null,
        ownerSignature: null
      };

      const booking = await db.bookings.create({
        groupId,
        userId: req.user.id,
        carId: vItem.actualCarId,
        pickupDate: vItem.pickupDate,
        returnDate: vItem.returnDate,
        pickupLocation: vItem.pickupLocation || car?.address || 'Bãi xe Chủ xe',
        rentalPrice: rentalP,
        platformFee: platformF,
        totalPrice: price,
        depositAmount: dep,
        status: 'Pending',
        paymentStatus: pm === 'wallet' ? 'paid' : 'pending',
        paymentMethod: pm,
        contractDetails: contractDetails
      });

      createdBookings.push(booking);

      // Notify Car Owner
      if (car && car.ownerId) {
        await notificationService.createNotification(
          car.ownerId,
          'Đơn Đặt Xe Mới Trong Giỏ Hàng',
          `Khách hàng ${user.name} đã đặt xe ${car.brand} ${car.model} (Mã đơn con: #${booking.id}). Vui lòng xem xét duyệt đơn.`,
          'BookingUpdate',
          booking.id,
          'Booking'
        );
      }
    }

    const isVietqr = pm === 'vietqr' || pm === 'bank_transfer' || pm === 'qr';

    let vietqrData = null;
    if (isVietqr) {
      let sysConfig = null;
      try {
        if (db.system_config?.getConfig) sysConfig = await db.system_config.getConfig();
        else if (db.system_config?.get) sysConfig = await db.system_config.get();
      } catch (cfgErr) {
        console.warn('Cannot fetch system config, using default VietQR values:', cfgErr);
      }

      let rawBankId = (sysConfig?.bankId || 'MB').toUpperCase();
      if (rawBankId === 'MBBANK') rawBankId = 'MB';
      if (rawBankId === 'VIETCOMBANK') rawBankId = 'VCB';
      if (rawBankId === 'VIETINBANK') rawBankId = 'ICB';

      const bankAcc = sysConfig?.bankAccountNumber || '1900533588';
      const bankHolder = sysConfig?.bankAccountHolder || 'VIVUCAR SYSTEM';
      const bankName = sysConfig?.bankName || 'Ngân hàng MBBank (MB)';
      const addInfo = encodeURIComponent(`VIVUCAR GROUP ${groupId}`);
      const accountName = encodeURIComponent(bankHolder);

      vietqrData = {
        accountNumber: bankAcc,
        accountHolder: bankHolder,
        bankName: bankName,
        bankId: rawBankId,
        amount: groupDepositTotal,
        transferContent: `VIVUCAR GROUP ${groupId}`,
        qrUrl: `https://img.vietqr.io/image/${rawBankId}-${bankAcc}-compact2.png?amount=${groupDepositTotal}&addInfo=${addInfo}&accountName=${accountName}`
      };
    }

    res.status(201).json({
      message: isVietqr
        ? `Đã khởi tạo giỏ hàng #${groupId} thành công! Vui lòng quét mã VietQR để hoàn tất chuyển khoản 30% cọc giữ chỗ.`
        : `Thanh toán 30% cọc giỏ hàng #${groupId} bằng Ví ViVuCar thành công!`,
      groupId,
      groupTotalAmount,
      groupDepositTotal,
      paymentMethod: pm,
      vietqr: vietqrData,
      bookings: createdBookings
    });
  } catch (error) {
    console.error('Group Checkout Error:', error);
    res.status(500).json({ message: error.message || 'Lỗi thanh toán cọc giỏ xe.' });
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

// 19. Request Trip Extension (Yêu cầu gia hạn chuyến đi với kiểm tra trùng lịch)
router.post('/api/bookings/:id/request-extension', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { newReturnDate, extraDays, extraPrice } = req.body;

    if (!newReturnDate || !extraDays || extraDays <= 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ngày trả xe gia hạn hợp lệ.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Chuyến đi không tồn tại.' });
    if (String(booking.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện trên chuyến đi này.' });

    const p = await getPool();

    // 1. Conflict Check: Ensure car has no overlapping future bookings
    const conflictRes = await p.request()
      .input('vehicleId', sql.Int, booking.carId)
      .input('bookingId', sql.Int, bookingId)
      .input('newReturnDate', sql.NVarChar, newReturnDate)
      .query(`
        SELECT booking_id FROM Booking 
        WHERE vehicle_id = @vehicleId 
          AND booking_id <> @bookingId 
          AND status IN ('Pending', 'Approved', 'Active', 'Confirmed') 
          AND start_datetime < @newReturnDate AND end_datetime > GETDATE()
      `);

    if (conflictRes.recordset.length > 0) {
      return res.status(400).json({ message: 'Xe đã có lịch đặt tiếp theo trong khoảng thời gian này, không thể gia hạn.' });
    }

    const extensionData = JSON.stringify({
      requestedReturnDate: newReturnDate,
      extraDays,
      extraPrice: Number(extraPrice || 0),
      status: 'pending',
      requestedAt: new Date().toISOString()
    });

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

// 20. Respond to Trip Extension (Chủ xe duyệt/từ chối gia hạn)
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
    extObj.status = action === 'approve' ? 'APPROVED_PENDING_PAYMENT' : 'REJECTED';
    extObj.respondedAt = new Date().toISOString();

    await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('extData', sql.NVarChar, JSON.stringify(extObj))
      .query('UPDATE Booking SET extension_request = @extData WHERE booking_id = @bookingId');

    await notificationService.createNotification(
      booking.userId,
      action === 'approve' ? 'Yêu cầu gia hạn ĐƯỢC CHẤP NHẬN - CẦN THANH TOÁN' : 'Yêu cầu gia hạn BỊ TỪ CHỐI',
      action === 'approve'
        ? `Chủ xe đã duyệt yêu cầu gia hạn cho chuyến đi #${bookingId}! Vui lòng hoàn tất thanh toán phí gia hạn ${Number(extObj.extraPrice || 0).toLocaleString('vi-VN')}đ.`
        : `Chủ xe không thể đồng ý gia hạn cho chuyến đi #${bookingId}. Vui lòng trả xe đúng hạn ban đầu.`,
      'BookingUpdate',
      bookingId,
      'Booking'
    );

    res.json({
      message: action === 'approve' ? 'Đã chấp nhận gia hạn! Yêu cầu khách hàng thanh toán phí gia hạn.' : 'Đã từ chối yêu cầu gia hạn.',
      extension: extObj
    });
  } catch (error) {
    console.error('Error responding extension:', error);
    res.status(500).json({ message: 'Lỗi xử lý phản hồi gia hạn.' });
  }
});

// 20b. Pay Trip Extension Fee (Khách hàng thanh toán phí gia hạn trực tuyến)
router.post('/api/bookings/:id/pay-extension', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { paymentMethod } = req.body; // 'wallet' | 'vietqr'

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
    if (extObj.status !== 'APPROVED_PENDING_PAYMENT' && extObj.status !== 'approved') {
      return res.status(400).json({ message: 'Yêu cầu gia hạn chưa được duyệt hoặc đã hoàn tất thanh toán.' });
    }

    const extraPrice = Number(extObj.extraPrice || 0);

    // If wallet payment, process transaction via Stored Procedure
    if (paymentMethod === 'wallet' && extraPrice > 0) {
      await p.request()
        .input('userId', sql.Int, req.user.id)
        .input('bookingId', sql.Int, bookingId)
        .input('amount', sql.Decimal(18, 2), extraPrice)
        .input('txnType', sql.NVarChar, 'TripExtension')
        .input('description', sql.NVarChar, `Thanh toán phí gia hạn +${extObj.extraDays} ngày cho chuyến đi #${bookingId}`)
        .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
    }

    extObj.status = 'PAID';
    extObj.paidAt = new Date().toISOString();
    extObj.paymentMethod = paymentMethod || 'wallet';

    const newReturnDate = extObj.requestedReturnDate;
    const newTotalPrice = Number(currentRes.recordset[0].total_amount) + extraPrice;

    await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('newReturnDate', sql.NVarChar, newReturnDate)
      .input('newTotalPrice', sql.Decimal(18, 2), newTotalPrice)
      .input('extData', sql.NVarChar, JSON.stringify(extObj))
      .query('UPDATE Booking SET end_datetime = @newReturnDate, total_amount = @newTotalPrice, extension_request = @extData WHERE booking_id = @bookingId');

    const car = await db.cars.findOne({ id: booking.carId });
    if (car && car.ownerId) {
      await notificationService.createNotification(
        car.ownerId,
        'Gia hạn chuyến đi THÀNH CÔNG',
        `Khách hàng đã thanh toán phí gia hạn ${extraPrice.toLocaleString('vi-VN')}đ cho chuyến đi #${bookingId}. Ngày trả xe mới: ${newReturnDate}.`,
        'BookingUpdate',
        bookingId,
        'Booking'
      );
    }

    await notificationService.createNotification(
      booking.userId,
      'Gia hạn chuyến đi THÀNH CÔNG',
      `Bạn đã thanh toán phí gia hạn ${extraPrice.toLocaleString('vi-VN')}đ thành công! Hạn trả xe mới của chuyến đi #${bookingId} là: ${newReturnDate}.`,
      'BookingUpdate',
      bookingId,
      'Booking'
    );

    res.json({
      message: 'Thanh toán phí gia hạn thành công! Ngày trả xe mới đã được cập nhật.',
      extension: extObj
    });
  } catch (error) {
    console.error('Error paying extension:', error);
    res.status(500).json({ message: error.message || 'Lỗi thanh toán phí gia hạn.' });
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


