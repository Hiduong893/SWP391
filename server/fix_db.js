import { getPool } from './config/db.js';

getPool().then(async p => {
  try {
    const res = await p.request().query('UPDATE Booking SET total_amount = total_amount - deposit_amount WHERE total_amount >= deposit_amount + rental_price AND deposit_amount > 0');
    console.log('Rows affected:', res.rowsAffected);
    
    // Also let's check one row to be sure
    const check = await p.request().query('SELECT TOP 5 booking_id, rental_price, total_amount, deposit_amount FROM Booking');
    console.log(check.recordset);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
