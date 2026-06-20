import { sql, getPool } from '../config/db.js';

const getDaysUntilPickup = (pickupDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const pickup = new Date(pickupDate);
  pickup.setHours(0, 0, 0, 0);
  const diffMs = pickup - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const applyRefundPolicy = (daysUntilPickup) => {
  const policies = [
    { minDays: 7, refundPercent: 100, label: 'Hoàn 100% (Hủy sớm trước ≥7 ngày)' },
    { minDays: 3, refundPercent: 50,  label: 'Hoàn 50%  (Hủy trước 3-6 ngày)'     },
    { minDays: 1, refundPercent: 0,   label: 'Không hoàn (Hủy trễ, 1-2 ngày)'     },
    { minDays: 0, refundPercent: 0,   label: 'Không thể hủy (Đã qua ngày khởi hành)' },
  ];
  for (const policy of policies) {
    if (daysUntilPickup >= policy.minDays) {
      return {
        refundPercent: policy.refundPercent,
        refundAmount: Math.floor((500000 * policy.refundPercent) / 100),
        policyLabel: policy.label
      };
    }
  }
  return { refundPercent: 0, refundAmount: 0, policyLabel: 'Không hoàn cọc' };
};

export const renterActionService = {
  getRefundPreview: async (bookingId, userId) => {
    const p = await getPool();
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Booking WHERE booking_id = @bookingId AND renter_id = @userId');
    
    if (bookingRes.recordset.length === 0) {
      return { canCancel: false, message: 'Chuyến đi không tồn tại.' };
    }
    const booking = bookingRes.recordset[0];
    const cancellableStatuses = ['Pending', 'Approved'];
    if (!cancellableStatuses.includes(booking.status)) {
      return { canCancel: false, message: `Không thể hủy chuyến đi ở trạng thái: ${booking.status}.` };
    }

    const daysUntilPickup = getDaysUntilPickup(booking.start_datetime);
    if (daysUntilPickup < 0) {
      return { canCancel: false, message: 'Đã qua ngày nhận xe.', daysUntilPickup };
    }

    const { refundPercent, refundAmount, policyLabel } = applyRefundPolicy(daysUntilPickup);

    return {
      canCancel: true,
      daysUntilPickup,
      depositAmount: 500000,
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
        SELECT b.booking_id, b.status, b.start_datetime, b.vehicle_id, 
               ISNULL((SELECT TOP 1 status FROM Payment WHERE booking_id = b.booking_id ORDER BY created_at DESC), 'Pending') as payment_status 
        FROM Booking b 
        WHERE b.booking_id = @bookingId AND b.renter_id = @userId
      `);
    
    if (bookingRes.recordset.length === 0) {
      throw new Error('Không tìm thấy chuyến đi.');
    }
    const booking = bookingRes.recordset[0];
    if (booking.status === 'Cancelled') {
      throw new Error('Chuyến đi này đã được hủy trước đó.');
    }
    if (booking.status === 'Completed') {
      throw new Error('Hành trình đã kết thúc, không thể hủy.');
    }

    const daysUntilPickup = getDaysUntilPickup(booking.start_datetime);
    if (daysUntilPickup < 0) {
      throw new Error('Ngày nhận xe đã qua, không thể hủy chuyến đi này.');
    }

    const { refundPercent, refundAmount, policyLabel } = applyRefundPolicy(daysUntilPickup);

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
        // Refund fee to renter's wallet
        await new sql.Request(transaction)
          .input('userId', sql.Int, userId)
          .input('bookingId', sql.Int, bookingId)
          .input('amount', sql.Decimal(18, 2), refundAmount)
          .input('txnType', sql.NVarChar, 'Refund')
          .input('description', sql.NVarChar, `Hoàn trả phí giữ chỗ (${refundPercent}%) cho đơn thuê xe #${bookingId} do hủy chuyến.`)
          .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
      }

      await transaction.commit();
      return { 
        success: true,
        refundAmount,
        refundPercent,
        policyLabel,
        daysUntilPickup,
        depositAmount: 500000
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  reportIncident: async (bookingId, reporterId, description, imageUrl) => {
    const p = await getPool();
    // 1. Find the booking
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('userId', sql.Int, reporterId)
      .query('SELECT * FROM Booking WHERE booking_id = @bookingId AND renter_id = @userId');
    
    if (bookingRes.recordset.length === 0) {
      throw new Error('Không tìm thấy chuyến đi tương ứng.');
    }

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
        .input('incidentType', sql.NVarChar, 'Other')
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
