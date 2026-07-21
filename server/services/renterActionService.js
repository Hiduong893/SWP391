import { sql, getPool } from '../config/db.js';

const getHoursUntilPickup = (pickupDate) => {
  const now = new Date();
  const pickup = new Date(pickupDate);
  const diffMs = pickup - now;
  return Math.floor(diffMs / (1000 * 60 * 60));
};

// depositAmount: actual reservation fee paid (e.g. 30% of totalPrice)
const applyRefundPolicy = (hoursUntilPickup, depositAmount) => {
  const amt = Number(depositAmount) || 0;
  
  let refundPercent = 0;
  let policyLabel = 'Không hoàn phí (Trong vòng 12 giờ)';
  
  if (hoursUntilPickup > 24) {
    refundPercent = 100;
    policyLabel = 'Hoàn 100% (Hủy trước > 24 giờ)';
  } else if (hoursUntilPickup >= 12) {
    refundPercent = 50;
    policyLabel = 'Hoàn 50% (Hủy trước 12 - 24 giờ)';
  }

  return {
    refundPercent,
    refundAmount: Math.floor((amt * refundPercent) / 100),
    policyLabel
  };
};

export const renterActionService = {
  getRefundPreview: async (bookingId, userId) => {
    const p = await getPool();
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Booking WHERE booking_id = @bookingId AND renter_id = @userId');
    
    if (bookingRes.recordset.length === 0) {
      return { canCancel: false, message: 'Chuy\u1ebfn \u0111i kh\u00f4ng t\u1ed3n t\u1ea1i.' };
    }
    const booking = bookingRes.recordset[0];
    const cancellableStatuses = ['Pending', 'Approved'];
    if (!cancellableStatuses.includes(booking.status)) {
      return { canCancel: false, message: `Kh\u00f4ng th\u1ec3 h\u1ee7y chuy\u1ebfn \u0111i \u1edf tr\u1ea1ng th\u00e1i: ${booking.status}.` };
    }

    // Actual reservation fee stored in DB (deposit_amount column stores 30% paid)
    const depositAmount = Number(booking.deposit_amount) || 0;

    // If owner hasn't approved yet (status = 'Pending'), allow free cancellation with full refund
    if (booking.status === 'Pending') {
      return {
        canCancel: true,
        isPendingOwner: true,
        hoursUntilPickup: getHoursUntilPickup(booking.start_datetime),
        depositAmount,
        refundAmount: depositAmount,
        refundPercent: 100,
        policyLabel: 'Hoàn 100% (Chủ xe chưa duyệt — hủy miễn phí)',
        message: `Hủy miễn phí vì chủ xe chưa duyệt. Hoàn toàn bộ: ${depositAmount.toLocaleString('vi-VN')} VND.`
      };
    }

    const hoursUntilPickup = getHoursUntilPickup(booking.start_datetime);
    if (hoursUntilPickup < 0) {
      return { canCancel: false, message: 'Đã qua ngày nhận xe.', hoursUntilPickup };
    }

    const { refundPercent, refundAmount, policyLabel } = applyRefundPolicy(hoursUntilPickup, depositAmount);

    return {
      canCancel: true,
      isPendingOwner: false,
      hoursUntilPickup,
      depositAmount,
      refundAmount,
      refundPercent,
      policyLabel,
      message: `Nếu hủy ngay, bạn sẽ được hoàn: ${refundAmount.toLocaleString('vi-VN')} VND (${refundPercent}% phí giữ chỗ).`
    };
  },

  cancelBooking: async (bookingId, userId) => {
    const p = await getPool();
    // 1. Find the booking and its payment status
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT b.booking_id, b.status, b.start_datetime, b.vehicle_id, b.rental_price, b.deposit_amount,
               ISNULL((SELECT TOP 1 status FROM Payment WHERE booking_id = b.booking_id ORDER BY created_at DESC), 'Pending') as payment_status,
               (SELECT TOP 1 payment_method FROM Payment WHERE booking_id = b.booking_id ORDER BY created_at DESC) as payment_method
        FROM Booking b 
        WHERE b.booking_id = @bookingId AND b.renter_id = @userId
      `);
    
    if (bookingRes.recordset.length === 0) {
      throw new Error('Kh\u00f4ng t\u00ecm th\u1ea5y chuy\u1ebfn \u0111i.');
    }
    const booking = bookingRes.recordset[0];
    if (booking.status === 'Cancelled') {
      throw new Error('Chuy\u1ebfn \u0111i n\u00e0y \u0111\u00e3 \u0111\u01b0\u1ee3c h\u1ee7y tr\u01b0\u1edbc \u0111\u00f3.');
    }
    if (booking.status === 'Completed') {
      throw new Error('H\u00e0nh tr\u00ecnh \u0111\u00e3 k\u1ebft th\u00fac, kh\u00f4ng th\u1ec3 h\u1ee7y.');
    }

    const depositAmount = Number(booking.deposit_amount) || 0;

    let refundPercent, refundAmount, policyLabel;

    // If owner hasn't approved yet → 100% free cancellation
    if (booking.status === 'Pending') {
      refundPercent = 100;
      refundAmount = depositAmount;
      policyLabel = 'Ho\u00e0n 100% (Ch\u1ee7 xe ch\u01b0a duy\u1ec7t)';
    } else {
      const hoursUntilPickup = getHoursUntilPickup(booking.start_datetime);
      if (hoursUntilPickup < 0) {
        throw new Error('Ngày nhận xe đã qua, không thể hủy chuyến đi này.');
      }
      ({ refundPercent, refundAmount, policyLabel } = applyRefundPolicy(hoursUntilPickup, depositAmount));
    }

    // 2. Start SQL Transaction
    const transaction = new sql.Transaction(p);
    await transaction.begin();

    try {
      // Update Booking status to 'Cancelled' and payment_status to 'Refunded' or 'Failed'
      await new sql.Request(transaction)
        .input('bookingId', sql.Int, bookingId)
        .input('refundAmount', sql.Decimal(18, 2), refundAmount)
        .query(`
          UPDATE Booking 
          SET status = 'Cancelled', 
              payment_status = CASE WHEN @refundAmount > 0 THEN 'Refunded' ELSE 'Failed' END,
              updated_at = GETDATE() 
          WHERE booking_id = @bookingId
        `);

      // Update Payment status to 'Refunded' or 'Failed'
      await new sql.Request(transaction)
        .input('bookingId', sql.Int, bookingId)
        .input('refundAmount', sql.Decimal(18, 2), refundAmount)
        .query(`
          UPDATE Payment 
          SET status = CASE WHEN @refundAmount > 0 THEN 'Refunded' ELSE 'Failed' END
          WHERE booking_id = @bookingId
        `);

      // Release Vehicle back to 'Available'
      await new sql.Request(transaction)
        .input('vehicleId', sql.Int, booking.vehicle_id)
        .query("UPDATE Vehicle SET status = 'Available' WHERE vehicle_id = @vehicleId");

      // Check if renter paid the reservation fee
      const paymentStatusStr = (typeof booking.payment_status === 'string')
        ? booking.payment_status
        : (Array.isArray(booking.payment_status) ? booking.payment_status[0] : String(booking.payment_status || ''));

      const isPaid = paymentStatusStr && 
        (paymentStatusStr.toLowerCase() === 'paid' || paymentStatusStr.toLowerCase() === 'success');
      
      if (isPaid && refundAmount > 0) {
        await new sql.Request(transaction)
          .input('userId', sql.Int, userId)
          .input('bookingId', sql.Int, bookingId)
          .input('amount', sql.Decimal(18, 2), refundAmount)
          .input('txnType', sql.NVarChar, 'Refund')
          .input('description', sql.NVarChar, `Ho\u00e0n tr\u1ea3 ph\u00ed gi\u1eef ch\u1ed7 (${refundPercent}%) cho \u0111\u01a1n thu\u00ea xe #${bookingId} do h\u1ee7y chuy\u1ebfn \u2014 ${policyLabel}.`)
          .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
      }

      await transaction.commit();
      return { 
        success: true,
        refundAmount,
        refundPercent,
        policyLabel,
        depositAmount
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  reportIncident: async (bookingId, reporterId, description, imageUrl, incidentType = 'Other', incidentLocation = null) => {
    const p = await getPool();
    // 1. Find the booking
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('userId', sql.Int, reporterId)
      .query('SELECT * FROM Booking WHERE booking_id = @bookingId AND renter_id = @userId');
    
    if (bookingRes.recordset.length === 0) {
      throw new Error('Không tìm thấy chuyến đi tương ứng.');
    }

    // Map frontend incidentType values to DB-compatible values
    const incidentTypeMap = {
      accident: 'Accident', breakdown: 'Breakdown', flat_tire: 'FlatTire',
      theft: 'Theft', fuel_issue: 'FuelIssue', medical: 'Medical', other: 'Other'
    };
    const dbIncidentType = incidentTypeMap[incidentType?.toLowerCase()] || 'Other';

    // 2. Start SQL Transaction
    const transaction = new sql.Transaction(p);
    await transaction.begin();

    try {
      // Insert into Incident table
      const incidentRequest = new sql.Request(transaction)
        .input('bookingId', sql.Int, bookingId)
        .input('reporterId', sql.Int, reporterId)
        .input('title', sql.NVarChar, 'Sự cố chuyến đi')
        .input('description', sql.NVarChar, description)
        .input('incidentType', sql.NVarChar, dbIncidentType)
        .input('severity', sql.NVarChar, 'Medium')
        .input('status', sql.NVarChar, 'Open');
      
      const incidentRes = await incidentRequest.query(`
        INSERT INTO Incident (booking_id, reporter_id, title, description, incident_type, severity, status, created_at, updated_at)
        VALUES (@bookingId, @reporterId, @title, @description, @incidentType, @severity, @status, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as incident_id;
      `);
      const incidentId = incidentRes.recordset[0].incident_id;

      // Insert into IncidentImage table if image is provided
      if (imageUrl) {
        await new sql.Request(transaction)
          .input('incidentId', sql.Int, incidentId)
          .input('imageUrl', sql.NVarChar, imageUrl)
          .query(`
            INSERT INTO IncidentImage (incident_id, image_url, uploaded_at)
            VALUES (@incidentId, @imageUrl, GETDATE())
          `);
      }

      // Update Booking issue_report JSON column for admin dashboard view compatibility
      const issueReport = {
        description,
        incidentType: dbIncidentType,
        location: incidentLocation || null,
        image: imageUrl || null,
        reportedAt: new Date().toISOString(),
        status: 'pending'
      };
      await new sql.Request(transaction)
        .input('bookingId', sql.Int, bookingId)
        .input('issueReport', sql.NVarChar, JSON.stringify(issueReport))
        .query('UPDATE Booking SET issue_report = @issueReport, updated_at = GETDATE() WHERE booking_id = @bookingId');

      await transaction.commit();
      return { success: true };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};

