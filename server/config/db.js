import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_SERVER || 'noom',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false, // Set to false for local development
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

let pool;
export const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
    // Run essential migrations to adapt the SQL schema for application features
    try {
      await pool.request().query(`
        -- Add bio column if missing in User
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[User]') AND name = 'bio')
        BEGIN
            ALTER TABLE [User] ADD bio NVARCHAR(MAX) NULL;
        END

        -- Drop standard UNIQUE constraint on google_id (relying on the filtered index instead to allow multiple NULLs)
        DECLARE @IndexName NVARCHAR(200);
        SELECT @IndexName = i.name
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.object_id = OBJECT_ID('[User]') AND c.name = 'google_id' AND i.is_unique = 1 AND i.has_filter = 0;

        IF @IndexName IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = @IndexName)
                EXEC('ALTER TABLE [User] DROP CONSTRAINT [' + @IndexName + ']');
            ELSE
                EXEC('DROP INDEX [' + @IndexName + '] ON [User]');
        END

        -- Add transmission and fuel if missing in Vehicle
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicle') AND name = 'transmission')
        BEGIN
            ALTER TABLE Vehicle ADD transmission NVARCHAR(50) NULL;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicle') AND name = 'fuel')
        BEGIN
            ALTER TABLE Vehicle ADD fuel NVARCHAR(50) NULL;
        END

        -- Add handover_docs and issue_report if missing in Booking
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Booking') AND name = 'handover_docs')
        BEGIN
            ALTER TABLE Booking ADD handover_docs NVARCHAR(MAX) NULL;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Booking') AND name = 'issue_report')
        BEGIN
            ALTER TABLE Booking ADD issue_report NVARCHAR(MAX) NULL;
        END
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Booking') AND name = 'payment_status')
        BEGIN
            ALTER TABLE Booking ADD payment_status NVARCHAR(50) NULL;
        END

        -- Create simulated Emails table if missing for the Inbox view
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Emails')
        BEGIN
            CREATE TABLE Emails (
                id VARCHAR(50) PRIMARY KEY,
                [to] VARCHAR(255) NOT NULL,
                subject NVARCHAR(255) NOT NULL,
                body NVARCHAR(MAX) NOT NULL,
                sentAt VARCHAR(50) NOT NULL,
                isRead BIT NOT NULL DEFAULT 0
            );
        END

        -- Alter columns to NVARCHAR(MAX) to support base64 image uploads without truncation error
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[User]') AND name = 'avatar_url' AND max_length <> -1)
        BEGIN
            ALTER TABLE [User] ALTER COLUMN avatar_url NVARCHAR(MAX) NULL;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('KYC') AND name = 'front_image_url' AND max_length <> -1)
        BEGIN
            ALTER TABLE KYC ALTER COLUMN front_image_url NVARCHAR(MAX) NOT NULL;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('KYC') AND name = 'back_image_url' AND max_length <> -1)
        BEGIN
            ALTER TABLE KYC ALTER COLUMN back_image_url NVARCHAR(MAX) NULL;
        END

        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VehicleImage') AND name = 'image_url' AND max_length <> -1)
        BEGIN
            ALTER TABLE VehicleImage ALTER COLUMN image_url NVARCHAR(MAX) NOT NULL;
        END
      `);

      // Ensure stored procedure is created or updated with support for DepositRefund and auto-wallet creation
      await pool.request().query(`
        CREATE OR ALTER PROCEDURE usp_ProcessWalletTransaction
            @user_id     INT,
            @booking_id  INT = NULL,
            @amount      DECIMAL(18,2),
            @txn_type    NVARCHAR(30),
            @description NVARCHAR(500) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRANSACTION;

                DECLARE @wallet_id     INT;
                DECLARE @balance_before DECIMAL(18,2);
                DECLARE @balance_after  DECIMAL(18,2);

                SELECT @wallet_id = wallet_id, @balance_before = balance
                FROM Wallet WITH (UPDLOCK, ROWLOCK)
                WHERE user_id = @user_id;

                IF @wallet_id IS NULL
                BEGIN
                    INSERT INTO Wallet (user_id, balance, is_bank_verified, created_at, updated_at)
                    VALUES (@user_id, 0, 0, GETDATE(), GETDATE());
                    
                    SET @wallet_id = SCOPE_IDENTITY();
                    SET @balance_before = 0;
                END

                -- Calculate new balance (DepositRefund is an addition credit txn)
                IF @txn_type IN ('TopUp', 'Refund', 'Income', 'DepositRefund')
                    SET @balance_after = @balance_before + @amount;
                ELSE
                    SET @balance_after = @balance_before - @amount;

                IF @balance_after < 0
                BEGIN
                    RAISERROR(N'Insufficient wallet balance.', 16, 1);
                END

                UPDATE Wallet
                SET balance = @balance_after, updated_at = GETDATE()
                WHERE wallet_id = @wallet_id;

                INSERT INTO WalletTransaction
                    (wallet_id, booking_id, amount, txn_type, balance_before, balance_after, description)
                VALUES
                    (@wallet_id, @booking_id, @amount, @txn_type, @balance_before, @balance_after, @description);

                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 
                    ROLLBACK TRANSACTION;
                
                DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
                RAISERROR(@ErrorMessage, 16, 1);
            END CATCH
        END;
      `);

      // Seed default values if database is empty
      await seedDb(pool);

      // Perform partitioning of vehicles to satisfy "half Gặp chủ xe, half Tự nhận xe"
      // owner@bonboncar.vn is Owner (Gặp chủ xe)
      // admin@bonboncar.vn is Admin (Tự nhận xe)
      const adminRes = await pool.request().query("SELECT user_id FROM [User] WHERE email = 'admin@bonboncar.vn'");
      const ownerRes = await pool.request().query("SELECT user_id FROM [User] WHERE email = 'owner@bonboncar.vn'");
      if (adminRes.recordset.length > 0 && ownerRes.recordset.length > 0) {
        const adminId = adminRes.recordset[0].user_id;
        const ownerId = ownerRes.recordset[0].user_id;
        
        const carsRes = await pool.request().query("SELECT vehicle_id FROM Vehicle ORDER BY vehicle_id");
        const carIds = carsRes.recordset.map(r => r.vehicle_id);
        
        for (let i = 0; i < carIds.length; i++) {
          const targetOwnerId = i < Math.ceil(carIds.length / 2) ? adminId : ownerId;
          await pool.request()
            .input('vehicleId', sql.Int, carIds[i])
            .input('ownerId', sql.Int, targetOwnerId)
            .query("UPDATE Vehicle SET owner_id = @ownerId WHERE vehicle_id = @vehicleId");
        }
        console.log(`Vehicles ownership partitioned: ${Math.ceil(carIds.length / 2)} cars owned by Admin (Tự nhận xe), ${carIds.length - Math.ceil(carIds.length / 2)} cars owned by Owner (Gặp chủ xe)`);
      }
    } catch (err) {
      console.error('Error running SQL migrations or seeding database:', err);
    }
  }
  return pool;
};

// Seed default configs, users and cars
const seedDb = async (p) => {
  // Seed SystemConfig if empty
  const configCount = await p.request().query('SELECT COUNT(*) as count FROM SystemConfig');
  if (configCount.recordset[0].count === 0) {
    await p.request().query(`
      INSERT INTO SystemConfig (config_key, config_value, data_type, updated_at) VALUES
      ('PLATFORM_FEE_PERCENT', '5', 'Number', GETDATE()),
      ('INSURANCE_MULTIPLIER', '1.1', 'Number', GETDATE()),
      ('SYSTEM_NOTICE', N'Chào mừng bạn đến với ViVuCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam. Hãy hoàn tất KYC bằng lái xe trong mục Hồ sơ để bắt đầu trải nghiệm thuê xe ngay!', 'String', GETDATE());
    `);
  }

  // Seed Users if empty
  const userCount = await p.request().query('SELECT COUNT(*) as count FROM [User]');
  if (userCount.recordset[0].count === 0) {
    const users = [
      {
        email: 'admin@bonboncar.vn',
        password: '$2a$10$EaOh051/nmcvKXf4BHtNYe8qPdQOH2mORz9avGJJIi4RVgRkbKuWi', // admin
        name: 'Hệ Thống Admin',
        role: 'admin',
        wallet: 15000000,
        bank: { bankName: 'MBBank', accountNumber: '1903456789012' }
      },
      {
        email: 'admin2@bonboncar.vn',
        password: '$2a$10$INmJjkJg8ilvvQCAFdeGU.tQh8SLMYS1qSlsLyeNV7GEKHlKuxqB2', // admin
        name: 'Admin Hồ Văn Dương',
        role: 'admin',
        wallet: 20000000,
        bank: { bankName: 'MBBank', accountNumber: '9999999999999' }
      },
      {
        email: 'cskh@bonboncar.vn',
        password: '$2a$10$o0ZbPrvV.3bkL4/nq48BRehg0WMd71SnSdwjfwpqLVs7ntM2UxC1i', // cskh
        name: 'CSKH Minh Anh',
        role: 'cskh',
        wallet: 0,
        bank: null
      },
      {
        email: 'owner@bonboncar.vn',
        password: '$2a$10$VsF1EacSxQz.x8OZfpwMGu6HPtvVpO9Nub/b7s.YemqgpIJ2Jo9uu', // owner
        name: 'Chủ Xe Lê Mạnh',
        role: 'owner',
        wallet: 25000000,
        bank: { bankName: 'Vietcombank', accountNumber: '0071001234567' }
      },
      {
        email: 'renter@bonboncar.vn',
        password: '$2a$10$dByHmiioWlLgijdz7OowMe.BuX5KMRb3YyHChFgf3dblHIBbJqiq2', // renter
        name: 'Khách Thuê Quang Huy',
        role: 'renter',
        wallet: 5000000,
        bank: { bankName: 'Techcombank', accountNumber: '19030011223344' }
      }
    ];

    for (const u of users) {
      const uRes = await p.request()
        .input('email', sql.VarChar, u.email)
        .input('password', sql.NVarChar, u.password)
        .input('name', sql.NVarChar, u.name)
        .query(`
          INSERT INTO [User] (email, password_hash, full_name, is_email_verified, is_active, created_at, updated_at)
          VALUES (@email, @password, @name, 1, 1, GETDATE(), GETDATE());
          SELECT SCOPE_IDENTITY() as user_id;
        `);
      const userId = uRes.recordset[0].user_id;

      // Role mapping
      const roleNameMap = { 'admin': 'Admin', 'cskh': 'CustomerService', 'owner': 'CarOwner', 'renter': 'Renter' };
      const dbRoleName = roleNameMap[u.role];
      const roleRes = await p.request().input('roleName', sql.NVarChar, dbRoleName)
        .query('SELECT role_id FROM Role WHERE role_name = @roleName');
      const roleId = roleRes.recordset[0].role_id;

      await p.request()
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, roleId)
        .query('INSERT INTO UserRole (user_id, role_id) VALUES (@userId, @roleId)');

      // Wallet mapping
      const bankName = u.bank ? u.bank.bankName : null;
      const bankAccount = u.bank ? u.bank.accountNumber : null;
      await p.request()
        .input('userId', sql.Int, userId)
        .input('balance', sql.Decimal(18, 2), u.wallet)
        .input('bankName', sql.NVarChar, bankName)
        .input('bankAccount', sql.VarChar, bankAccount)
        .query(`
          INSERT INTO Wallet (user_id, balance, bank_name, bank_account_number, is_bank_verified)
          VALUES (@userId, @balance, @bankName, @bankAccount, 1)
        `);

      // If renter, seed driver license kyc
      if (u.role === 'renter') {
        await p.request()
          .input('userId', sql.Int, userId)
          .query(`
            INSERT INTO KYC (user_id, document_type, document_number, front_image_url, status, submitted_at, reviewed_at)
            VALUES (@userId, 'DriverLicense', 'N/A', 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=600&q=80', 'Approved', GETDATE(), GETDATE())
          `);
      }
    }
  }

  // Seed default cars if empty
  const vehicleCount = await p.request().query('SELECT COUNT(*) as count FROM Vehicle');
  if (vehicleCount.recordset[0].count === 0) {
    const defaultCars = [
      {
        brand: 'VinFast',
        model: 'VF 8 (Điện)',
        seats: 5,
        transmission: 'Tự động',
        fuel: 'Điện',
        price: 1200000,
        image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
        location: 'Hà Nội',
        plate: '30K-123.45'
      },
      {
        brand: 'Toyota',
        model: 'Vios',
        seats: 5,
        transmission: 'Số sàn',
        fuel: 'Xăng',
        price: 700000,
        image: 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=600&q=80',
        location: 'Hà Nội',
        plate: '30L-999.88'
      },
      {
        brand: 'Hyundai',
        model: 'SantaFe',
        seats: 7,
        transmission: 'Tự động',
        fuel: 'Dầu',
        price: 1400000,
        image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=600&q=80',
        location: 'TP. Hồ Chí Minh',
        plate: '51G-567.89'
      },
      {
        brand: 'Honda',
        model: 'City',
        seats: 5,
        transmission: 'Tự động',
        fuel: 'Xăng',
        price: 800000,
        image: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=600&q=80',
        location: 'TP. Hồ Chí Minh',
        plate: '51H-111.22'
      },
      {
        brand: 'Mitsubishi',
        model: 'Xpander',
        seats: 7,
        transmission: 'Tự động',
        fuel: 'Xăng',
        price: 950000,
        image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
        location: 'Đà Nẵng',
        plate: '43A-555.55'
      },
      {
        brand: 'Kia',
        model: 'Seltos',
        seats: 5,
        transmission: 'Tự động',
        fuel: 'Xăng',
        price: 900000,
        image: 'https://images.unsplash.com/photo-1631835339316-dfeb9818b459?auto=format&fit=crop&w=600&q=80',
        location: 'Đà Nẵng',
        plate: '43C-678.90'
      }
    ];

    for (const c of defaultCars) {
      // Resolve Brand
      let bRes = await p.request().input('brand', sql.NVarChar, c.brand).query('SELECT brand_id FROM Brand WHERE brand_name = @brand');
      let brandId;
      if (bRes.recordset.length === 0) {
        const insertBrand = await p.request().input('brand', sql.NVarChar, c.brand).query('INSERT INTO Brand (brand_name, is_active) VALUES (@brand, 1); SELECT SCOPE_IDENTITY() as brand_id');
        brandId = insertBrand.recordset[0].brand_id;
      } else {
        brandId = bRes.recordset[0].brand_id;
      }

      // Resolve Category
      const catName = c.seats > 5 ? 'MPV' : 'Sedan';
      let catRes = await p.request().input('catName', sql.NVarChar, catName).query('SELECT category_id FROM VehicleCategory WHERE category_name = @catName');
      let categoryId;
      if (catRes.recordset.length === 0) {
        const insertCat = await p.request().input('catName', sql.NVarChar, catName).query('INSERT INTO VehicleCategory (category_name, is_active) VALUES (@catName, 1); SELECT SCOPE_IDENTITY() as category_id');
        categoryId = insertCat.recordset[0].category_id;
      } else {
        categoryId = catRes.recordset[0].category_id;
      }

      // Insert Vehicle (seeded as owner@bonboncar.vn)
      let ownerId = null;
      let ownerRes = await p.request().query("SELECT user_id FROM [User] WHERE email = 'owner@bonboncar.vn'");
      if (ownerRes.recordset.length > 0) {
        ownerId = ownerRes.recordset[0].user_id;
      } else {
        let fallbackRes = await p.request().query("SELECT TOP 1 user_id FROM [User]");
        if (fallbackRes.recordset.length > 0) {
          ownerId = fallbackRes.recordset[0].user_id;
        }
      }

      if (!ownerId) continue;

      const vRes = await p.request()
        .input('ownerId', sql.Int, ownerId)
        .input('brandId', sql.Int, brandId)
        .input('categoryId', sql.Int, categoryId)
        .input('model', sql.NVarChar, c.model)
        .input('seats', sql.Int, c.seats)
        .input('plate', sql.VarChar, c.plate)
        .input('price', sql.Decimal(18, 2), c.price)
        .input('location', sql.NVarChar, c.location)
        .input('transmission', sql.NVarChar, c.transmission)
        .input('fuel', sql.NVarChar, c.fuel)
        .query(`
          INSERT INTO Vehicle (owner_id, brand_id, category_id, model_name, license_plate, year_of_manufacture, daily_price, deposit_amount, location_address, transmission, fuel, status, is_active, created_at, updated_at, seat_count)
          VALUES (@ownerId, @brandId, @categoryId, @model, @plate, 2023, @price, 5000000, @location, @transmission, @fuel, 'Available', 1, GETDATE(), GETDATE(), @seats);
          SELECT SCOPE_IDENTITY() as vehicle_id;
        `);
      const vehicleId = vRes.recordset[0].vehicle_id;

      // Insert primary image
      await p.request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('image', sql.NVarChar, c.image)
        .query('INSERT INTO VehicleImage (vehicle_id, image_url, is_primary, sort_order) VALUES (@vehicleId, @image, 1, 0)');
    }
  }
};

export { sql };
