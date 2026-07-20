import { sql, getPool } from '../config/db.js';

export const voucherModel = {
  create: async (voucherData) => {
    const p = await getPool();
    const res = await p.request()
      .input('code', sql.NVarChar, voucherData.code.toUpperCase())
      .input('discount_percent', sql.Int, voucherData.discountPercent)
      .input('max_discount_amount', sql.Decimal(18,2), voucherData.maxDiscountAmount)
      .input('max_usage', sql.Int, voucherData.maxUsage || null)
      .input('target_user', sql.NVarChar, voucherData.targetUser || 'all')
      .input('expiration_date', sql.DateTime2, voucherData.expirationDate ? new Date(voucherData.expirationDate) : null)
      .query(`
        INSERT INTO Vouchers (code, discount_percent, max_discount_amount, max_usage, target_user, expiration_date)
        OUTPUT inserted.*
        VALUES (@code, @discount_percent, @max_discount_amount, @max_usage, @target_user, @expiration_date)
      `);
    return res.recordset[0];
  },

  getAll: async () => {
    const p = await getPool();
    const res = await p.request()
      .query('SELECT * FROM Vouchers ORDER BY created_at DESC');
    return res.recordset;
  },

  getActiveVouchers: async () => {
    const p = await getPool();
    const res = await p.request()
      .query(`
        SELECT * FROM Vouchers 
        WHERE status = 'active' 
          AND (expiration_date IS NULL OR expiration_date > GETDATE())
          AND (max_usage IS NULL OR current_usage < max_usage)
        ORDER BY discount_percent DESC
      `);
    return res.recordset;
  },

  delete: async (id) => {
    const p = await getPool();
    await p.request()
      .input('id', sql.Int, id)
      .query("DELETE FROM Vouchers WHERE id = @id");
    return true;
  }
};
