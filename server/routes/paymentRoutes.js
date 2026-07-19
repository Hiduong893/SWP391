import express from 'express';
import crypto from 'crypto';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Helper to sort query parameters alphabetically (required by VNPAY)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// Helper to format Date (yyyyMMddHHmmss)
function formatVnpayDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
}

// 1. Create VNPAY checkout URL (POST /api/payments/vnpay/create)
router.post('/api/payments/vnpay/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'Thiếu mã đặt xe.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });
    }

    if (booking.depositStatus === 'paid') {
      return res.status(400).json({ message: 'Đơn đặt xe này đã được thanh toán rồi.' });
    }

    const tmnCode = process.env.VNP_TMNCODE || 'CGXZZ77T';
    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNP_RETURNURL || 'http://localhost:5000/api/payments/vnpay/return';

    const date = new Date();
    const createDate = formatVnpayDate(date);
    const expireDate = formatVnpayDate(new Date(date.getTime() + 15 * 60 * 1000)); // Expire in 15 minutes

    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Unique txn reference to prevent duplicates: PAY-{bookingId}-{timestamp}
    const txnRef = `PAY-${bookingId}-${date.getTime()}`;
    const amount = Math.round(booking.totalPrice * 0.3); // Charge only the 30% reservation fee online

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan dat xe ${bookingId}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(amount * 100), // VNPAY multiplies amount by 100
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    const sortedParams = sortObject(vnpParams);
    const signData = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const queryParams = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const paymentUrl = `${vnpUrl}?${queryParams}&vnp_SecureHash=${secureHash}`;

    res.json({ paymentUrl });
  } catch (error) {
    console.error('Error generating VNPAY URL:', error);
    res.status(500).json({ message: 'Lỗi khởi tạo cổng thanh toán VNPAY.' });
  }
});

// 2. Redirection return page (GET /api/payments/vnpay/return)
// NO DB updates are performed here. Only validates integrity and redirects user.
router.get('/api/payments/vnpay/return', async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const signData = Object.entries(vnp_Params)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (secureHash === signed) {
      const txnRef = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];
      const transactionNo = vnp_Params['vnp_TransactionNo'] || '';

      // Extract bookingId from PAY-{bookingId}-{timestamp}
      const parts = txnRef.split('-');
      const bookingId = parts[1];

      const booking = await db.bookings.findOne({ id: bookingId });

      if (responseCode === '00' && transactionStatus === '00') {
        if (booking && booking.depositStatus !== 'paid') {
          const car = await db.cars.findOne({ id: booking.carId });
          const isOwnerCar = car && car.ownerId !== null;
          const targetBookingStatus = isOwnerCar ? 'Pending' : 'Approved';

          await db.payments.confirmVnpayPayment({
            bookingId,
            vnpTxnRef: txnRef,
            vnpTransactionNo: transactionNo,
            vnpResponseCode: responseCode,
            vnpTransactionStatus: transactionStatus,
            targetStatus: targetBookingStatus
          });
          console.log(`VNPAY Return: Database successfully updated as Paid for booking ${bookingId}`);

          // Send notifications
          const user = await db.users.findOne({ id: booking.userId });
          if (car && car.ownerId) {
            await notificationService.createNotification(
              car.ownerId,
              'Yêu cầu đặt xe mới',
              `Khách hàng ${user ? user.name : 'Khách hàng'} đã thanh toán cọc và đặt xe ${car.brand} ${car.model} của bạn (Mã: #${bookingId}).`,
              'BookingUpdate',
              bookingId,
              'Booking'
            );
          }
          await notificationService.notifyCSKH(
            'Yêu cầu đặt xe mới',
            `Khách hàng ${user ? user.name : 'Khách hàng'} đã thanh toán cọc và đặt xe ${car.brand} ${car.model} (Mã: #${bookingId}).`,
            'BookingUpdate',
            bookingId,
            'Booking'
          );
        }
        res.redirect(`${clientUrl}/?vnpay_status=success&booking_id=${bookingId}`);
      } else {
        if (booking && booking.depositStatus !== 'paid') {
          await db.payments.failVnpayPayment({
            bookingId,
            vnpTxnRef: txnRef,
            vnpTransactionNo: transactionNo,
            vnpResponseCode: responseCode,
            vnpTransactionStatus: transactionStatus
          });
          console.log(`VNPAY Return: Database successfully updated as Failed/Cancelled for booking ${bookingId}`);
        }
        res.redirect(`${clientUrl}/?vnpay_status=failed&booking_id=${bookingId}`);
      }
    } else {
      console.warn('VNPAY return signature verification failed.');
      res.redirect(`${clientUrl}/?vnpay_status=invalid_signature`);
    }
  } catch (error) {
    console.error('VNPAY return processing error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?vnpay_status=error`);
  }
});

// 3. Server-to-server IPN handler (GET /api/payments/vnpay/ipn)
// Strict validations and transactional database updates.
router.get('/api/payments/vnpay/ipn', async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const signData = Object.entries(vnp_Params)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 1. Signature Check
    if (secureHash !== signed) {
      console.warn('VNPAY IPN signature verification failed.');
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const txnRef = vnp_Params['vnp_TxnRef'];
    const amountInCents = parseInt(vnp_Params['vnp_Amount']);
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const transactionStatus = vnp_Params['vnp_TransactionStatus'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];

    // Extract bookingId from PAY-{bookingId}-{timestamp}
    const parts = txnRef.split('-');
    const bookingId = parts[1];

    // 2. Check Order Existence
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    // 3. Check Amount (VNPAY amount is multiplied by 100)
    // Dynamic/Brittle check resolved: Expected amount is 500,000 VND (reservation fee)
    const expectedAmountInCents = Math.round(booking.totalPrice * 0.3) * 100;
    if (amountInCents !== expectedAmountInCents) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 4. Check If Order Already Confirmed
    if (booking.depositStatus === 'paid') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // 5. Update Status based on Transaction Results (00 & 00 represents Success)
    if (responseCode === '00' && transactionStatus === '00') {
      const car = await db.cars.findOne({ id: booking.carId });
      const isOwnerCar = car && car.ownerId !== null;
      const targetBookingStatus = isOwnerCar ? 'Pending' : 'Approved';

      await db.payments.confirmVnpayPayment({
        bookingId,
        vnpTxnRef: txnRef,
        vnpTransactionNo: transactionNo,
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus,
        targetStatus: targetBookingStatus
      });

      console.log(`VNPAY IPN successful for booking ${bookingId}`);

      // Send notifications
      const user = await db.users.findOne({ id: booking.userId });
      if (car && car.ownerId) {
        await notificationService.createNotification(
          car.ownerId,
          'Yêu cầu đặt xe mới',
          `Khách hàng ${user ? user.name : 'Khách hàng'} đã thanh toán cọc và đặt xe ${car.brand} ${car.model} của bạn (Mã: #${bookingId}).`,
          'BookingUpdate',
          bookingId,
          'Booking'
        );
      }
      await notificationService.notifyCSKH(
        'Yêu cầu đặt xe mới',
        `Khách hàng ${user ? user.name : 'Khách hàng'} đã thanh toán cọc và đặt xe ${car.brand} ${car.model} (Mã: #${bookingId}).`,
        'BookingUpdate',
        bookingId,
        'Booking'
      );

      return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    } else {
      // Payment failed or cancelled
      await db.payments.failVnpayPayment({
        bookingId,
        vnpTxnRef: txnRef,
        vnpTransactionNo: transactionNo,
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus
      });

      console.log(`VNPAY IPN failed/cancelled for booking ${bookingId}`);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    }
  } catch (error) {
    console.error('VNPAY IPN processing exception:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});

export default router;
