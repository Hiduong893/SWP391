import { sql, getPool } from '../config/db.js';

export const voucherModel = {
  create: async (voucherData) => {
    const p = await getPool();
    try {
      await p.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vouchers')
        BEGIN
          CREATE TABLE Vouchers (
            id INT IDENTITY(1,1) PRIMARY KEY,
            code NVARCHAR(50) NOT NULL UNIQUE,
            discount_percent INT NOT NULL,
            max_discount_amount DECIMAL(18,2) NOT NULL,
            current_usage INT DEFAULT 0,
            max_usage INT NULL,
            target_user NVARCHAR(50) DEFAULT 'all',
            target_car_name NVARCHAR(200) NULL,
            status NVARCHAR(20) DEFAULT 'active',
            expiration_date DATETIME2 NULL,
            created_at DATETIME2 DEFAULT GETDATE()
          );
        END
        ELSE
        BEGIN
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'target_car_name')
          BEGIN
            ALTER TABLE Vouchers ADD target_car_name NVARCHAR(200) NULL;
          END
        END
      `);

      const res = await p.request()
        .input('code', sql.NVarChar, voucherData.code.toUpperCase())
        .input('discount_percent', sql.Int, voucherData.discountPercent)
        .input('max_discount_amount', sql.Decimal(18,2), voucherData.maxDiscountAmount)
        .input('max_usage', sql.Int, voucherData.maxUsage || null)
        .input('target_user', sql.NVarChar, voucherData.targetUser || 'all')
        .input('target_car_name', sql.NVarChar, voucherData.targetCarName || 'Tất cả dòng xe')
        .input('expiration_date', sql.DateTime2, voucherData.expirationDate ? new Date(voucherData.expirationDate) : null)
        .query(`
          INSERT INTO Vouchers (code, discount_percent, max_discount_amount, max_usage, target_user, target_car_name, expiration_date)
          OUTPUT inserted.*
          VALUES (@code, @discount_percent, @max_discount_amount, @max_usage, @target_user, @target_car_name, @expiration_date)
        `);
      return res.recordset[0];
    } catch (e) {
      console.error('voucherModel create error:', e);
      throw e;
    }
  },

  getAll: async () => {
    try {
      const p = await getPool();
      await p.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vouchers')
        BEGIN
          CREATE TABLE Vouchers (
            id INT IDENTITY(1,1) PRIMARY KEY,
            code NVARCHAR(50) NOT NULL UNIQUE,
            discount_percent INT NOT NULL,
            max_discount_amount DECIMAL(18,2) NOT NULL,
            current_usage INT DEFAULT 0,
            max_usage INT NULL,
            target_user NVARCHAR(50) DEFAULT 'all',
            target_car_name NVARCHAR(200) NULL,
            status NVARCHAR(20) DEFAULT 'active',
            expiration_date DATETIME2 NULL,
            created_at DATETIME2 DEFAULT GETDATE()
          );
        END
        ELSE
        BEGIN
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vouchers') AND name = 'target_car_name')
          BEGIN
            ALTER TABLE Vouchers ADD target_car_name NVARCHAR(200) NULL;
          END
        END
      `);

      const res = await p.request().query('SELECT * FROM Vouchers WHERE status = \'active\' ORDER BY created_at DESC');
      return res.recordset;
    } catch (e) {
      console.error('voucherModel getAll error:', e);
      return [];
    }
  },

  delete: async (id) => {
    try {
      const p = await getPool();
      await p.request()
        .input('id', sql.Int, parseInt(id))
        .query('UPDATE Vouchers SET status = \'inactive\' WHERE id = @id');
      return true;
    } catch (e) {
      console.error('voucherModel delete error:', e);
      throw e;
    }
  }
};
