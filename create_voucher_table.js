import { sql, getPool } from './server/config/db.js';

async function createVoucherTable() {
  try {
    const pool = await getPool();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vouchers' AND xtype='U')
      BEGIN
        CREATE TABLE Vouchers (
          id INT IDENTITY(1,1) PRIMARY KEY,
          code NVARCHAR(50) UNIQUE NOT NULL,
          discount_percent INT NOT NULL,
          max_discount_amount DECIMAL(18,2) NOT NULL,
          max_usage INT NULL,
          current_usage INT DEFAULT 0,
          target_user NVARCHAR(50) DEFAULT 'all',
          expiration_date DATETIME2 NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          status NVARCHAR(20) DEFAULT 'active'
        );
        PRINT 'Table Vouchers created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Table Vouchers already exists.';
      END
    `);
    console.log('Script executed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error executing script:', error);
    process.exit(1);
  }
}

createVoucherTable();
