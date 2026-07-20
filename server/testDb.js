import { getPool } from './config/db.js';
getPool().then(async p => {
  try {
    await p.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RentalContract' AND xtype='U')
      CREATE TABLE RentalContract (
        contract_id         INT IDENTITY(1,1) PRIMARY KEY,
        booking_id          INT NOT NULL UNIQUE,
        contract_code       NVARCHAR(50) NOT NULL,
        status              NVARCHAR(50) NOT NULL DEFAULT 'Draft',

        -- Giai đoạn 1: Cọc giữ chỗ online
        reservation_fee     DECIMAL(18,2) NOT NULL DEFAULT 0,
        reservation_paid_at DATETIME2 NULL,

        -- Giai đoạn 2: Thanh toán trước khi nhận xe
        prepayment_amount   DECIMAL(18,2) NOT NULL DEFAULT 0,
        prepayment_due_date DATETIME2 NULL,
        prepayment_paid_at  DATETIME2 NULL,
        prepayment_method   NVARCHAR(50) NULL,

        -- Giai đoạn 3: Cọc bảo đảm tài sản
        deposit_amount      DECIMAL(18,2) NOT NULL DEFAULT 0,
        deposit_refund_at   DATETIME2 NULL,

        -- Phụ phí phát sinh
        surcharge_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,
        surcharge_reason    NVARCHAR(MAX) NULL,
        surcharge_added_at  DATETIME2 NULL,
        surcharge_added_by  INT NULL,

        -- Chữ ký điện tử
        renter_signed_at    DATETIME2 NULL,
        renter_ip           NVARCHAR(50) NULL,
        owner_signed_at     DATETIME2 NULL,
        owner_ip            NVARCHAR(50) NULL,

        -- Điều khoản (snapshot JSON)
        terms_snapshot      NVARCHAR(MAX) NULL,

        created_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_RentalContract_Booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id)
      );
    `);
    console.log('RentalContract table created (or already exists)');
  } catch (err) {
    console.error('Error creating RentalContract table:', err.message);
  }
  process.exit(0);
});
