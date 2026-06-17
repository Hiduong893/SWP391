import { sql, getPool } from '../config/db.js';

export const paymentModel = {
  confirmVnpayPayment: async ({ bookingId, vnpTxnRef, vnpTransactionNo, vnpResponseCode, vnpTransactionStatus, targetStatus }) => {
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    try {
      await transaction.begin();

      // 1. Update Booking payment_status and status
      const bookingRequest = new sql.Request(transaction)
        .input('bookingId', sql.Int, parseInt(bookingId))
        .input('status', sql.NVarChar, targetStatus);
      await bookingRequest.query(`
        UPDATE Booking 
        SET status = @status, payment_status = 'Paid', updated_at = GETDATE() 
        WHERE booking_id = @bookingId
      `);

      // 2. Update Payment status to 'Success' and fill VNPAY columns
      const paymentRequest = new sql.Request(transaction)
        .input('bookingId', sql.Int, parseInt(bookingId))
        .input('vnpTxnRef', sql.NVarChar, vnpTxnRef)
        .input('vnpTransactionNo', sql.NVarChar, vnpTransactionNo)
        .input('vnpResponseCode', sql.NVarChar, vnpResponseCode)
        .input('vnpTransactionStatus', sql.NVarChar, vnpTransactionStatus);
      await paymentRequest.query(`
        UPDATE Payment 
        SET status = 'Success', 
            paid_at = GETDATE(), 
            vnp_txn_ref = @vnpTxnRef, 
            vnp_transaction_no = @vnpTransactionNo, 
            vnp_response_code = @vnpResponseCode, 
            vnp_transaction_status = @vnpTransactionStatus
        WHERE booking_id = @bookingId AND status = 'Pending'
      `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  failVnpayPayment: async ({ bookingId, vnpTxnRef, vnpTransactionNo, vnpResponseCode, vnpTransactionStatus }) => {
    const p = await getPool();
    const transaction = new sql.Transaction(p);
    try {
      await transaction.begin();

      // 1. Update Booking status to 'Cancelled' and payment_status to 'Failed'
      const bookingRequest = new sql.Request(transaction)
        .input('bookingId', sql.Int, parseInt(bookingId));
      await bookingRequest.query(`
        UPDATE Booking 
        SET status = 'Cancelled', payment_status = 'Failed', updated_at = GETDATE() 
        WHERE booking_id = @bookingId
      `);

      // Release the vehicle back to 'Available'
      await bookingRequest.query(`
        UPDATE Vehicle 
        SET status = 'Available'
        WHERE vehicle_id = (SELECT vehicle_id FROM Booking WHERE booking_id = @bookingId)
      `);

      // 2. Update Payment status to 'Failed'
      const paymentRequest = new sql.Request(transaction)
        .input('bookingId', sql.Int, parseInt(bookingId))
        .input('vnpTxnRef', sql.NVarChar, vnpTxnRef)
        .input('vnpTransactionNo', sql.NVarChar, vnpTransactionNo)
        .input('vnpResponseCode', sql.NVarChar, vnpResponseCode)
        .input('vnpTransactionStatus', sql.NVarChar, vnpTransactionStatus);
      await paymentRequest.query(`
        UPDATE Payment 
        SET status = 'Failed', 
            vnp_txn_ref = @vnpTxnRef, 
            vnp_transaction_no = @vnpTransactionNo, 
            vnp_response_code = @vnpResponseCode, 
            vnp_transaction_status = @vnpTransactionStatus
        WHERE booking_id = @bookingId AND status = 'Pending'
      `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
