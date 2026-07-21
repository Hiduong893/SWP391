import { getPool } from './server/config/db.js';

async function run() {
  const p = await getPool();
  const q = `
    UPDATE wt 
    SET wt.description = N'Thanh toán phí giữ chỗ xe ' + ISNULL(b.brand_name, '') + ' ' + ISNULL(v.model_name, '') + N' (Mã: #' + CAST(wt.booking_id AS VARCHAR) + ')'
    FROM WalletTransaction wt
    JOIN Booking bk ON wt.booking_id = bk.booking_id
    JOIN Vehicle v ON bk.vehicle_id = v.vehicle_id
    LEFT JOIN Brand b ON v.brand_id = b.brand_id
    WHERE wt.txn_type = 'BookingPayment' 
    AND wt.description LIKE N'Thanh toán phí gi? ch? xe %'
  `;
  const res = await p.request().query(q);
  console.log('Updated:', res.rowsAffected);
  process.exit(0);
}

run().catch(console.error);
