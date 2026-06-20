import { db } from './models/index.js';
import crypto from 'crypto';

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
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

function formatVnpayDate(date) {
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
}

async function run() {
  try {
    // 1. Get first vehicle
    const cars = await db.cars.findMany();
    const car = cars[0];
    console.log('Using car:', car.model, 'ID:', car.id);

    // 2. Create a dummy booking if none exists
    const users = await db.users.findMany();
    const renter = users.find(u => u.role === 'renter');
    console.log('Using renter:', renter.email, 'ID:', renter.id);

    const bookingId = 12345; // dummy booking ID

    const tmnCode = process.env.VNP_TMNCODE || 'CGXZZ77T';
    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNP_RETURNURL || 'http://localhost:5000/api/payments/vnpay/return';

    console.log('VNP_TMNCODE:', tmnCode);
    console.log('VNP_RETURNURL:', returnUrl);

    const date = new Date();
    const createDate = formatVnpayDate(date);
    const expireDate = formatVnpayDate(new Date(date.getTime() + 15 * 60 * 1000));

    const txnRef = `PAY-${bookingId}-${date.getTime()}`;
    const amount = 1200000;

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan dat xe ${bookingId}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(amount * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
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

    console.log('\nGenerated VNPAY URL:');
    console.log(paymentUrl);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
