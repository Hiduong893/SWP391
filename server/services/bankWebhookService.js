import { sql, getPool } from '../config/db.js';
import { notificationService } from './notificationService.js';

const LOG_SQL = 'IF NOT EXISTS (SELECT 1 FROM BankTransaction WHERE transaction_id = @txnId) BEGIN INSERT INTO BankTransaction (transaction_id, amount, transfer_content, account_number, bank_name, matched_booking_id, matched_group_id, status, note, processed_at, created_at) VALUES (@txnId, @amount, @content, @accountNumber, @bankName, @matchedBookingId, @matchedGroupId, @status, @note, GETDATE(), GETDATE()) END';
const CONFIRM_SQL = "UPDATE Booking SET status = 'Pending', payment_status = 'Paid', updated_at = GETDATE() WHERE booking_id = @id; UPDATE Payment SET status = 'Success', paid_at = GETDATE() WHERE booking_id = @id AND status = 'Pending';";
const BOOKING_SQL = 'SELECT b.booking_id, b.status, b.payment_status, b.vehicle_id, b.renter_id, p.payment_method, p.status AS pay_status FROM Booking b LEFT JOIN Payment p ON p.booking_id = b.booking_id WHERE b.booking_id = @id';
const CAR_SQL = "SELECT v.owner_id, b.brand_name AS brand, v.model_name AS model FROM Vehicle v INNER JOIN Brand b ON v.brand_id = b.brand_id INNER JOIN Booking bk ON bk.vehicle_id = v.vehicle_id WHERE bk.booking_id = @id";
const GROUP_SQL = 'SELECT b.booking_id, b.status, b.payment_status, b.renter_id, b.vehicle_id, p.payment_method, p.status AS pay_status FROM Booking b LEFT JOIN Payment p ON p.booking_id = b.booking_id WHERE b.group_id = @groupId';
const DUP_SQL = 'SELECT id, status FROM BankTransaction WHERE transaction_id = @txnId';
const UPDATE_GROUP_SQL = "UPDATE BookingGroup SET group_status = 'Paid' WHERE group_id = @groupId";
const HISTORY_SQL = 'SELECT TOP (@limit) id, transaction_id, amount, transfer_content, account_number, bank_name, matched_booking_id, matched_group_id, status, note, processed_at, created_at FROM BankTransaction ORDER BY created_at DESC';

const notify = async (uid, title, msg, ref) => { try { await notificationService.createNotification(uid, title, msg, 'BookingUpdate', ref, 'Booking'); } catch(_) {} };
const notifyCskh = async (title, msg, ref) => { try { await notificationService.notifyCSKH(title, msg, 'BookingUpdate', ref, 'Booking'); } catch(_) {} };

const logTxn = async (pool, o) => {
  try {
    await pool.request()
      .input('txnId', sql.NVarChar, o.txnId)
      .input('amount', sql.Decimal(18,2), o.amount)
      .input('content', sql.NVarChar, o.content || '')
      .input('accountNumber', sql.NVarChar, o.accountNumber || '')
      .input('bankName', sql.NVarChar, o.bankName || '')
      .input('matchedBookingId', sql.Int, o.matchedBookingId || null)
      .input('matchedGroupId', sql.Int, o.matchedGroupId || null)
      .input('status', sql.NVarChar, o.status)
      .input('note', sql.NVarChar, o.note || '')
      .query(LOG_SQL);
  } catch(e) { console.error('[BankWebhook] log error:', e.message); }
};

const isDuplicate = async (pool, txnId) => {
  const r = await pool.request().input('txnId', sql.NVarChar, txnId).query(DUP_SQL);
  return r.recordset.length > 0 ? r.recordset[0] : null;
};

const confirmSingle = async (pool, bookingId) => {
  const res = await pool.request().input('id', sql.Int, bookingId).query(BOOKING_SQL);
  if (!res.recordset.length) return { ok: false, reason: 'Booking #' + bookingId + ' khong ton tai' };
  const row = res.recordset[0];
  const pm = String(row.payment_method || '').toLowerCase();
  if (!['vietqr','bank_transfer','qr'].includes(pm)) return { ok: false, reason: 'Booking #' + bookingId + ' khong phai VietQR' };
  if (row.payment_status === 'Paid' || row.pay_status === 'Success') return { ok: false, reason: 'Booking #' + bookingId + ' da xac nhan roi' };
  await pool.request().input('id', sql.Int, bookingId).query(CONFIRM_SQL);
  const car = await pool.request().input('id', sql.Int, bookingId).query(CAR_SQL);
  if (car.recordset.length && car.recordset[0].owner_id) {
    const { owner_id, brand, model } = car.recordset[0];
    await notify(owner_id, 'Da coc VietQR (Tu dong)', 'Xac nhan coc ' + (brand || '') + ' ' + (model || '') + ' don #' + bookingId + '. Vui long phe duyet.', bookingId);
  }
  await notify(row.renter_id, 'Xac nhan coc thanh cong', 'Coc don #' + bookingId + ' da xac nhan. Cho chu xe phe duyet!', bookingId);
  return { ok: true, bookingId };
};

const confirmGroup = async (pool, groupId) => {
  const res = await pool.request().input('groupId', sql.Int, groupId).query(GROUP_SQL);
  if (!res.recordset.length) return { ok: false, reason: 'Group #' + groupId + ' khong ton tai' };
  const rows = res.recordset;
  const pm = String(rows[0].payment_method || '').toLowerCase();
  if (!['vietqr','bank_transfer','qr'].includes(pm)) return { ok: false, reason: 'Group #' + groupId + ' khong phai VietQR' };
  if (rows.every(r => r.payment_status === 'Paid' || r.pay_status === 'Success')) return { ok: false, reason: 'Group #' + groupId + ' da xac nhan roi' };
  const confirmed = [];
  for (const row of rows) {
    if (row.payment_status === 'Paid' || row.pay_status === 'Success') continue;
    await pool.request().input('id', sql.Int, row.booking_id).query(CONFIRM_SQL);
    const car = await pool.request().input('id', sql.Int, row.booking_id).query(CAR_SQL);
    if (car.recordset.length && car.recordset[0].owner_id) {
      const { owner_id, brand, model } = car.recordset[0];
      await notify(owner_id, 'Da coc VietQR Gio Hang (Tu dong)', 'Xac nhan coc gio hang #' + groupId + ' cho ' + (brand || '') + ' ' + (model || '') + ' don #' + row.booking_id + '.', row.booking_id);
    }
    confirmed.push(row.booking_id);
  }
  await pool.request().input('groupId', sql.Int, groupId).query(UPDATE_GROUP_SQL);
  if (rows.length) await notify(rows[0].renter_id, 'Xac nhan coc Gio Hang thanh cong', 'Gio hang #' + groupId + ' (' + confirmed.length + ' xe) da xac nhan. Cho chu xe phe duyet!', rows[0].booking_id);
  return { ok: true, groupId, confirmedBookingIds: confirmed };
};

export const bankWebhookService = {
  processWebhook: async (txnData) => {
    const pool = await getPool();
    const { transaction_id, amount, transfer_content, account_number, bank_name } = txnData;
    const dup = await isDuplicate(pool, transaction_id);
    if (dup) return { matched: false, duplicate: true, reason: 'Transaction ' + transaction_id + ' da xu ly' };
    const content = String(transfer_content || '').trim();
    const gm = content.match(/VIVUCAR\s+GROUP\s+(\d+)/i);
    if (gm) {
      const groupId = parseInt(gm[1]);
      const result = await confirmGroup(pool, groupId);
      await logTxn(pool, { txnId: transaction_id, amount, content: transfer_content, accountNumber: account_number, bankName: bank_name, matchedGroupId: groupId, status: result.ok ? 'matched' : 'unmatched', note: result.ok ? 'Group #' + groupId + ' confirmed' : result.reason });
      await notifyCskh(result.ok ? 'Tu dong xac nhan VietQR' : 'Webhook khong khop', 'Gio hang #' + groupId + ' GD ' + transaction_id + (result.ok ? ' OK' : ': ' + result.reason), null);
      return result.ok ? { matched: true, type: 'group', result } : { matched: false, reason: result.reason };
    }
    const sm = content.match(/(\d+)\s*$/);
    if (sm) {
      const bookingId = parseInt(sm[1]);
      const result = await confirmSingle(pool, bookingId);
      await logTxn(pool, { txnId: transaction_id, amount, content: transfer_content, accountNumber: account_number, bankName: bank_name, matchedBookingId: result.ok ? bookingId : null, status: result.ok ? 'matched' : 'unmatched', note: result.ok ? 'Booking #' + bookingId + ' confirmed' : result.reason });
      await notifyCskh(result.ok ? 'Tu dong xac nhan VietQR' : 'Webhook khong khop', 'Don #' + bookingId + ' GD ' + transaction_id + (result.ok ? ' OK' : ': ' + result.reason), result.ok ? bookingId : null);
      return result.ok ? { matched: true, type: 'single', result } : { matched: false, reason: result.reason };
    }
    const reason = 'Khong tim thay ma don trong: ' + transfer_content;
    await logTxn(pool, { txnId: transaction_id, amount, content: transfer_content, accountNumber: account_number, bankName: bank_name, status: 'unmatched', note: reason });
    await notifyCskh('Webhook khong nhan dang duoc', 'GD ' + transaction_id + ' khong khop don nao.', null);
    return { matched: false, reason };
  },
  getTransactions: async (limit = 50) => {
    const pool = await getPool();
    const res = await pool.request().input('limit', sql.Int, limit).query(HISTORY_SQL);
    return res.recordset;
  }
};
