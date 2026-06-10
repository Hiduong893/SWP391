import sql from 'mssql';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || 'GHUY-LAP',
  database: process.env.DB_DATABASE || 'CarRentalPlatform',
  options: {
    encrypt: false, // Set to false for local development
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

let pool;
const getPool = async () => {
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
      // Seed default values if database is empty
      await seedDb(pool);
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

      // Insert Vehicle (seeded as owner@vivucar.vn or the first user in DB)
      let ownerId = null;
      let ownerRes = await p.request().query("SELECT user_id FROM [User] WHERE email = 'owner@vivucar.vn'");
      if (ownerRes.recordset.length > 0) {
        ownerId = ownerRes.recordset[0].user_id;
      } else {
        let fallbackRes = await p.request().query("SELECT TOP 1 user_id FROM [User]");
        if (fallbackRes.recordset.length > 0) {
          ownerId = fallbackRes.recordset[0].user_id;
        }
      }

      if (!ownerId) continue; // Skip if no user exists at all

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

const mapUserRow = async (p, userRow) => {
  const userId = userRow.user_id;

  // 1. Get Role
  const roleRes = await p.request().input('userId', sql.Int, userId)
    .query('SELECT r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = @userId');
  let role = 'renter';
  if (roleRes.recordset.length > 0) {
    const roleName = roleRes.recordset[0].role_name;
    if (roleName === 'Admin') role = 'admin';
    else if (roleName === 'CustomerService') role = 'cskh';
    else if (roleName === 'CarOwner') role = 'owner';
    else role = 'renter';
  }

  // 2. Get Wallet
  const walletRes = await p.request().input('userId', sql.Int, userId)
    .query('SELECT * FROM Wallet WHERE user_id = @userId');
  let walletBalance = 0;
  let bankAccount = null;
  if (walletRes.recordset.length > 0) {
    const wallet = walletRes.recordset[0];
    walletBalance = Number(wallet.balance);
    if (wallet.bank_account_number) {
      bankAccount = {
        bankName: wallet.bank_name,
        accountNumber: wallet.bank_account_number,
        accountHolder: userRow.full_name.toUpperCase()
      };
    }
  }

  // 3. Get KYC
  const kycRes = await p.request().input('userId', sql.Int, userId)
    .query('SELECT * FROM KYC WHERE user_id = @userId');
  let licenseStatus = 'not_uploaded';
  let licenseImage = null;
  let kycDocuments = { cccd: null, license: null, carPapers: null };

  for (const doc of kycRes.recordset) {
    const statusMap = { 'Pending': 'pending', 'Approved': 'verified', 'Rejected': 'rejected' };
    const mappedStatus = statusMap[doc.status] || 'not_uploaded';

    if (doc.document_type === 'NationalID') {
      kycDocuments.cccd = doc.front_image_url;
    } else if (doc.document_type === 'DriverLicense') {
      kycDocuments.license = doc.front_image_url;
      licenseImage = doc.front_image_url;
      licenseStatus = mappedStatus;
    } else if (doc.document_type === 'VehicleRegistration') {
      kycDocuments.carPapers = doc.front_image_url;
    }
  }

  // 4. Get verification tokens
  const otpRes = await p.request().input('userId', sql.Int, userId)
    .query('SELECT * FROM OTPVerification WHERE user_id = @userId AND is_used = 0');
  let emailVerificationToken = null;
  let resetPasswordToken = null;
  let resetPasswordExpires = null;

  for (const otp of otpRes.recordset) {
    if (otp.otp_type === 'EmailVerify') {
      emailVerificationToken = otp.otp_code;
    } else if (otp.otp_type === 'ForgotPassword') {
      resetPasswordToken = otp.otp_code;
      resetPasswordExpires = new Date(otp.expires_at).getTime();
    }
  }

  return {
    id: String(userId),
    email: userRow.email,
    password: userRow.password_hash,
    name: userRow.full_name,
    avatar: userRow.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    bio: userRow.bio || '',
    isEmailVerified: userRow.is_email_verified === true || userRow.is_email_verified === 1,
    emailVerificationToken,
    resetPasswordToken,
    resetPasswordExpires,
    googleId: userRow.google_id || null,
    role,
    licenseStatus,
    licenseImage,
    walletBalance,
    bankAccount,
    kycDocuments,
    createdAt: userRow.created_at ? new Date(userRow.created_at).toISOString() : new Date().toISOString()
  };
};

const mapCarRow = (row) => {
  const statusMap = { 'Available': 'available', 'Rented': 'rented', 'Pending': 'pending_moderation', 'Rejected': 'rejected' };
  const mappedStatus = statusMap[row.status] || 'available';

  return {
    id: String(row.vehicle_id),
    brand: row.brand_name,
    model: row.model_name,
    seats: row.seat_count,
    transmission: row.transmission || 'Tự động',
    fuel: row.fuel || 'Xăng',
    pricePerDay: Number(row.daily_price),
    image: row.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    location: row.location_address,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    status: mappedStatus,
    plateNumber: row.license_plate,
    carPapers: null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

const mapBookingRow = async (p, row) => {
  const carRes = await p.request().input('vehicleId', sql.Int, row.vehicle_id)
    .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @vehicleId');
  const isOwnerCar = carRes.recordset.length > 0 && carRes.recordset[0].owner_id !== null;

  let mappedStatus = 'pending';
  if (row.status === 'Pending') {
    mappedStatus = isOwnerCar ? 'pending_owner' : 'pending';
  } else if (row.status === 'Approved') {
    mappedStatus = 'confirmed';
  } else if (row.status === 'Active') {
    mappedStatus = 'active';
  } else if (row.status === 'Completed') {
    mappedStatus = 'completed';
  } else if (row.status === 'Cancelled') {
    mappedStatus = 'cancelled';
  } else if (row.status === 'Rejected') {
    mappedStatus = 'rejected';
  }

  return {
    id: String(row.booking_id),
    userId: String(row.renter_id),
    carId: String(row.vehicle_id),
    pickupDate: row.start_datetime ? new Date(row.start_datetime).toISOString() : '',
    returnDate: row.end_datetime ? new Date(row.end_datetime).toISOString() : '',
    pickupLocation: row.pickup_address,
    totalPrice: Number(row.rental_price),
    depositAmount: Number(row.deposit_amount),
    depositStatus: 'paid', // Mark paid for QR checkout demo flow
    status: mappedStatus,
    paymentMethod: 'bank_transfer',
    handoverDocs: row.handover_docs ? JSON.parse(row.handover_docs) : { pickup: null, return: null },
    issueReport: row.issue_report ? JSON.parse(row.issue_report) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

const mapTicketRow = async (p, row) => {
  const ticketId = row.ticket_id;

  const msgRes = await p.request().input('ticketId', sql.Int, ticketId)
    .query(`
      SELECT m.*, u.full_name as senderName, r.role_name as senderRoleName
      FROM TicketMessage m
      INNER JOIN [User] u ON m.sender_id = u.user_id
      LEFT JOIN UserRole ur ON u.user_id = ur.user_id
      LEFT JOIN Role r ON ur.role_id = r.role_id
      WHERE m.ticket_id = @ticketId
      ORDER BY m.sent_at ASC
    `);

  const replies = msgRes.recordset.map(msg => {
    let role = 'renter';
    if (msg.senderRoleName === 'Admin') role = 'admin';
    else if (msg.senderRoleName === 'CustomerService') role = 'cskh';
    else if (msg.senderRoleName === 'CarOwner') role = 'owner';

    return {
      senderId: String(msg.sender_id),
      senderName: msg.senderName,
      senderRole: role,
      message: msg.message,
      sentAt: msg.sent_at ? new Date(msg.sent_at).toISOString() : new Date().toISOString()
    };
  });

  const firstMsg = replies[0] || { message: '' };

  const userRes = await p.request().input('userId', sql.Int, row.user_id)
    .query(`
      SELECT r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = @userId
    `);
  let userRole = 'renter';
  if (userRes.recordset.length > 0) {
    const roleName = userRes.recordset[0].role_name;
    if (roleName === 'Admin') userRole = 'admin';
    else if (roleName === 'CustomerService') userRole = 'cskh';
    else if (roleName === 'CarOwner') userRole = 'owner';
  }

  return {
    id: String(row.ticket_id),
    userId: String(row.user_id),
    userName: row.userName,
    userRole,
    subject: row.subject,
    message: firstMsg.message,
    status: row.status.toLowerCase(),
    replies,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

export const db = {
  // Users Operations
  users: {
    findMany: async () => {
      const p = await getPool();
      const res = await p.request().query('SELECT * FROM [User]');
      return await Promise.all(res.recordset.map(async (row) => await mapUserRow(p, row)));
    },

    findOne: async (filter) => {
      const p = await getPool();
      let query = 'SELECT u.* FROM [User] u';
      let where = [];
      const request = p.request();

      if (filter.id) {
        where.push('u.user_id = @id');
        request.input('id', sql.Int, parseInt(filter.id));
      } else if (filter.email) {
        where.push('LOWER(TRIM(u.email)) = LOWER(TRIM(@email))');
        request.input('email', sql.VarChar, filter.email);
      } else if (filter.googleId) {
        where.push('u.google_id = @googleId');
        request.input('googleId', sql.VarChar, filter.googleId);
      } else if (filter.emailVerificationToken) {
        query += ' INNER JOIN OTPVerification o ON u.user_id = o.user_id';
        where.push('o.otp_code = @token AND o.otp_type = \'EmailVerify\' AND o.is_used = 0');
        request.input('token', sql.VarChar, filter.emailVerificationToken);
      } else if (filter.resetPasswordToken) {
        query += ' INNER JOIN OTPVerification o ON u.user_id = o.user_id';
        where.push('o.otp_code = @token AND o.otp_type = \'ForgotPassword\' AND o.is_used = 0');
        request.input('token', sql.VarChar, filter.resetPasswordToken);
      }

      if (where.length === 0) return null;
      query += ' WHERE ' + where.join(' AND ');
      const res = await request.query(query);
      if (res.recordset.length === 0) return null;

      const userRow = res.recordset[0];
      return await mapUserRow(p, userRow);
    },

    create: async (userData) => {
      const p = await getPool();
      const request = p.request();

      request.input('email', sql.VarChar, userData.email.toLowerCase().trim());
      request.input('password', sql.NVarChar, userData.password || null);
      request.input('name', sql.NVarChar, userData.name || '');
      request.input('avatar', sql.NVarChar, userData.avatar || null);
      request.input('googleId', sql.VarChar, userData.googleId || null);
      request.input('isEmailVerified', sql.Bit, userData.isEmailVerified ? 1 : 0);

      const insertUserQuery = `
        INSERT INTO [User] (email, password_hash, full_name, avatar_url, google_id, is_email_verified, is_active, created_at, updated_at)
        VALUES (@email, @password, @name, @avatar, @googleId, @isEmailVerified, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() AS user_id;
      `;
      const res = await request.query(insertUserQuery);
      const userId = res.recordset[0].user_id;

      // Assign role
      const roleNameMap = { 'admin': 'Admin', 'cskh': 'CustomerService', 'owner': 'CarOwner', 'renter': 'Renter' };
      const dbRoleName = roleNameMap[userData.role] || 'Renter';
      const roleRes = await p.request().input('roleName', sql.NVarChar, dbRoleName)
        .query('SELECT role_id FROM Role WHERE role_name = @roleName');
      const roleId = roleRes.recordset[0].role_id;

      await p.request()
        .input('userId', sql.Int, userId)
        .input('roleId', sql.Int, roleId)
        .query('INSERT INTO UserRole (user_id, role_id) VALUES (@userId, @roleId)');

      // Create wallet
      await p.request()
        .input('userId', sql.Int, userId)
        .query('INSERT INTO Wallet (user_id, balance, is_bank_verified) VALUES (@userId, 0, 0)');

      // Save verification tokens if present
      if (userData.emailVerificationToken) {
        await p.request()
          .input('userId', sql.Int, userId)
          .input('token', sql.VarChar, userData.emailVerificationToken)
          .query('INSERT INTO OTPVerification (user_id, otp_code, otp_type, is_used, expires_at) VALUES (@userId, @token, \'EmailVerify\', 0, \'2099-12-31\')');
      }

      return await db.users.findOne({ id: String(userId) });
    },

    update: async (id, updateData) => {
      const p = await getPool();
      const userId = parseInt(id);

      // 1. Update basic user info
      let userUpdates = [];
      const userRequest = p.request().input('userId', sql.Int, userId);

      if (updateData.name !== undefined) {
        userUpdates.push('full_name = @name');
        userRequest.input('name', sql.NVarChar, updateData.name);
      }
      if (updateData.avatar !== undefined) {
        userUpdates.push('avatar_url = @avatar');
        userRequest.input('avatar', sql.NVarChar, updateData.avatar);
      }
      if (updateData.bio !== undefined) {
        userUpdates.push('bio = @bio');
        userRequest.input('bio', sql.NVarChar, updateData.bio);
      }
      if (updateData.isEmailVerified !== undefined) {
        userUpdates.push('is_email_verified = @isEmailVerified');
        userRequest.input('isEmailVerified', sql.Bit, updateData.isEmailVerified ? 1 : 0);
      }
      if (updateData.password !== undefined) {
        userUpdates.push('password_hash = @password');
        userRequest.input('password', sql.NVarChar, updateData.password);
      }
      if (updateData.googleId !== undefined) {
        userUpdates.push('google_id = @googleId');
        userRequest.input('googleId', sql.VarChar, updateData.googleId);
      }

      if (userUpdates.length > 0) {
        await userRequest.query(`UPDATE [User] SET ${userUpdates.join(', ')}, updated_at = GETDATE() WHERE user_id = @userId`);
      }

      // 2. Update role if role is changed
      if (updateData.role !== undefined) {
        const roleNameMap = { 'admin': 'Admin', 'cskh': 'CustomerService', 'owner': 'CarOwner', 'renter': 'Renter' };
        const dbRoleName = roleNameMap[updateData.role] || 'Renter';
        const roleRes = await p.request().input('roleName', sql.NVarChar, dbRoleName)
          .query('SELECT role_id FROM Role WHERE role_name = @roleName');
        if (roleRes.recordset.length > 0) {
          const roleId = roleRes.recordset[0].role_id;
          await p.request()
            .input('userId', sql.Int, userId)
            .input('roleId', sql.Int, roleId)
            .query(`
              IF EXISTS (SELECT 1 FROM UserRole WHERE user_id = @userId)
                UPDATE UserRole SET role_id = @roleId WHERE user_id = @userId
              ELSE
                INSERT INTO UserRole (user_id, role_id) VALUES (@userId, @roleId)
            `);
        }
      }

      // 3. Update Wallet (balance, bank fields)
      let walletUpdates = [];
      const walletRequest = p.request().input('userId', sql.Int, userId);

      if (updateData.walletBalance !== undefined) {
        walletUpdates.push('balance = @balance');
        walletRequest.input('balance', sql.Decimal(18, 2), updateData.walletBalance);
      }
      if (updateData.bankAccount !== undefined) {
        if (updateData.bankAccount) {
          walletUpdates.push('bank_name = @bankName, bank_account_number = @bankAccountNo, is_bank_verified = 1');
          walletRequest.input('bankName', sql.NVarChar, updateData.bankAccount.bankName);
          walletRequest.input('bankAccountNo', sql.VarChar, updateData.bankAccount.accountNumber);
        } else {
          walletUpdates.push('bank_name = NULL, bank_account_number = NULL, is_bank_verified = 0');
        }
      }

      if (walletUpdates.length > 0) {
        await walletRequest.query(`
          IF EXISTS (SELECT 1 FROM Wallet WHERE user_id = @userId)
            UPDATE Wallet SET ${walletUpdates.join(', ')}, updated_at = GETDATE() WHERE user_id = @userId
          ELSE
            INSERT INTO Wallet (user_id, balance, bank_name, bank_account_number, is_bank_verified)
            VALUES (@userId, ISNULL(@balance, 0), @bankName, @bankAccountNo, 0)
        `);
      }

      // 4. Update KYC documents if kycDocuments are provided
      if (updateData.kycDocuments !== undefined && updateData.kycDocuments) {
        const docs = updateData.kycDocuments;
        const upsertKyc = async (type, url) => {
          if (url === undefined) return;
          await p.request()
            .input('userId', sql.Int, userId)
            .input('docType', sql.NVarChar, type)
            .input('url', sql.NVarChar, url)
            .query(`
              IF EXISTS (SELECT 1 FROM KYC WHERE user_id = @userId AND document_type = @docType)
                UPDATE KYC SET front_image_url = ISNULL(@url, front_image_url), status = 'Pending', submitted_at = GETDATE()
                WHERE user_id = @userId AND document_type = @docType
              ELSE IF @url IS NOT NULL
                INSERT INTO KYC (user_id, document_type, document_number, front_image_url, status)
                VALUES (@userId, @docType, 'N/A', @url, 'Pending')
            `);
        };
        await upsertKyc('NationalID', docs.cccd);
        await upsertKyc('DriverLicense', docs.license);
        await upsertKyc('VehicleRegistration', docs.carPapers);
      }

      // 5. Update license status and reviewer changes if direct
      if (updateData.licenseStatus !== undefined) {
        const dbStatusMap = { 'pending': 'Pending', 'verified': 'Approved', 'rejected': 'Rejected' };
        const dbStatus = dbStatusMap[updateData.licenseStatus] || 'Pending';
        await p.request()
          .input('userId', sql.Int, userId)
          .input('status', sql.NVarChar, dbStatus)
          .query(`
            UPDATE KYC SET status = @status, reviewed_at = GETDATE()
            WHERE user_id = @userId AND document_type = 'DriverLicense'
          `);
      }

      // 6. Handle verification token updates
      if (updateData.emailVerificationToken === null) {
        await p.request().input('userId', sql.Int, userId)
          .query('UPDATE OTPVerification SET is_used = 1 WHERE user_id = @userId AND otp_type = \'EmailVerify\'');
      } else if (updateData.emailVerificationToken !== undefined) {
        await p.request().input('userId', sql.Int, userId).input('token', sql.VarChar, updateData.emailVerificationToken)
          .query(`
            UPDATE OTPVerification SET is_used = 1 WHERE user_id = @userId AND otp_type = 'EmailVerify';
            INSERT INTO OTPVerification (user_id, otp_code, otp_type, is_used, expires_at)
            VALUES (@userId, @token, 'EmailVerify', 0, '2099-12-31');
          `);
      }

      if (updateData.resetPasswordToken === null) {
        await p.request().input('userId', sql.Int, userId)
          .query('UPDATE OTPVerification SET is_used = 1 WHERE user_id = @userId AND otp_type = \'ForgotPassword\'');
      } else if (updateData.resetPasswordToken !== undefined) {
        const expires = updateData.resetPasswordExpires ? new Date(updateData.resetPasswordExpires) : new Date(Date.now() + 600000);
        await p.request()
          .input('userId', sql.Int, userId)
          .input('token', sql.VarChar, updateData.resetPasswordToken)
          .input('expires', sql.DateTime2, expires)
          .query(`
            UPDATE OTPVerification SET is_used = 1 WHERE user_id = @userId AND otp_type = 'ForgotPassword';
            INSERT INTO OTPVerification (user_id, otp_code, otp_type, is_used, expires_at)
            VALUES (@userId, @token, 'ForgotPassword', 0, @expires);
          `);
      }

      return await db.users.findOne({ id: String(userId) });
    },

    delete: async (id) => {
      const p = await getPool();
      const userId = parseInt(id);
      await p.request().input('userId', sql.Int, userId).query(`
        DELETE FROM OTPVerification WHERE user_id = @userId;
        DELETE FROM KYC WHERE user_id = @userId;
        DELETE FROM UserRole WHERE user_id = @userId;
        DELETE FROM WalletTransaction WHERE wallet_id IN (SELECT wallet_id FROM Wallet WHERE user_id = @userId);
        DELETE FROM Wallet WHERE user_id = @userId;
        DELETE FROM [User] WHERE user_id = @userId;
      `);
      return true;
    }
  },

  // Emails Operations
  emails: {
    findMany: async () => {
      const p = await getPool();
      const res = await p.request().query('SELECT * FROM Emails ORDER BY sentAt DESC');
      return res.recordset.map(row => ({
        id: row.id,
        to: row.to,
        subject: row.subject,
        body: row.body,
        sentAt: row.sentAt,
        isRead: row.isRead === true || row.isRead === 1
      }));
    },
    create: async (emailData) => {
      const p = await getPool();
      const id = crypto.randomUUID();
      const sentAt = new Date().toISOString();
      await p.request()
        .input('id', sql.VarChar, id)
        .input('to', sql.VarChar, emailData.to.toLowerCase().trim())
        .input('subject', sql.NVarChar, emailData.subject)
        .input('body', sql.NVarChar, emailData.body)
        .input('sentAt', sql.VarChar, sentAt)
        .query('INSERT INTO Emails (id, [to], subject, body, sentAt, isRead) VALUES (@id, @to, @subject, @body, @sentAt, 0)');
      return {
        id,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        sentAt,
        isRead: false
      };
    },
    markAllAsRead: async () => {
      const p = await getPool();
      await p.request().query('UPDATE Emails SET isRead = 1');
      return true;
    },
    clearAll: async () => {
      const p = await getPool();
      await p.request().query('DELETE FROM Emails');
      return true;
    }
  },

  // Cars Operations
  cars: {
    findMany: async (filter = {}) => {
      const p = await getPool();
      let query = `
        SELECT v.*, b.brand_name, c.category_name,
               (SELECT TOP 1 image_url FROM VehicleImage vi WHERE vi.vehicle_id = v.vehicle_id ORDER BY sort_order) as image
        FROM Vehicle v
        INNER JOIN Brand b ON v.brand_id = b.brand_id
        INNER JOIN VehicleCategory c ON v.category_id = c.category_id
        WHERE v.is_active = 1
      `;
      let where = [];
      const request = p.request();

      if (filter.seats !== undefined && filter.seats !== '') {
        where.push('v.seat_count = @seats');
        request.input('seats', sql.Int, parseInt(filter.seats));
      }
      if (filter.transmission !== undefined && filter.transmission !== '') {
        where.push('v.transmission = @transmission');
        request.input('transmission', sql.NVarChar, filter.transmission);
      }
      if (filter.fuel !== undefined && filter.fuel !== '') {
        where.push('v.fuel = @fuel');
        request.input('fuel', sql.NVarChar, filter.fuel);
      }
      if (filter.location !== undefined && filter.location !== '') {
        where.push('v.location_address LIKE @location');
        request.input('location', sql.NVarChar, '%' + filter.location + '%');
      }
      if (filter.ownerId !== undefined && filter.ownerId !== null) {
        if (filter.ownerId === '') {
          where.push('v.owner_id IS NULL');
        } else {
          where.push('v.owner_id = @ownerId');
          request.input('ownerId', sql.Int, parseInt(filter.ownerId));
        }
      }
      if (filter.status !== undefined && filter.status !== '') {
        const dbStatusMap = { 'available': 'Available', 'rented': 'Rented', 'pending_moderation': 'Pending', 'rejected': 'Rejected' };
        const dbStatus = dbStatusMap[filter.status] || filter.status;
        where.push('v.status = @status');
        request.input('status', sql.NVarChar, dbStatus);
      }

      if (where.length > 0) {
        query += ' AND ' + where.join(' AND ');
      }

      const res = await request.query(query);
      return res.recordset.map(mapCarRow);
    },
    findOne: async (filter) => {
      const p = await getPool();
      let query = `
        SELECT v.*, b.brand_name, c.category_name,
               (SELECT TOP 1 image_url FROM VehicleImage vi WHERE vi.vehicle_id = v.vehicle_id ORDER BY sort_order) as image
        FROM Vehicle v
        INNER JOIN Brand b ON v.brand_id = b.brand_id
        INNER JOIN VehicleCategory c ON v.category_id = c.category_id
      `;
      let where = [];
      const request = p.request();

      if (filter.id) {
        where.push('v.vehicle_id = @id');
        request.input('id', sql.Int, parseInt(filter.id));
      }

      if (where.length === 0) return null;
      query += ' WHERE ' + where.join(' AND ');
      const res = await request.query(query);
      if (res.recordset.length === 0) return null;
      return mapCarRow(res.recordset[0]);
    },
    create: async (carData) => {
      const p = await getPool();

      // Resolve Brand
      let brandRes = await p.request().input('brandName', sql.NVarChar, carData.brand)
        .query('SELECT brand_id FROM Brand WHERE brand_name = @brandName');
      let brandId;
      if (brandRes.recordset.length === 0) {
        const newBrand = await p.request().input('brandName', sql.NVarChar, carData.brand)
          .query('INSERT INTO Brand (brand_name, is_active) VALUES (@brandName, 1); SELECT SCOPE_IDENTITY() as brand_id');
        brandId = newBrand.recordset[0].brand_id;
      } else {
        brandId = brandRes.recordset[0].brand_id;
      }

      // Resolve Category
      const seats = parseInt(carData.seats) || 5;
      const catName = seats > 5 ? 'MPV' : 'Sedan';
      let catRes = await p.request().input('catName', sql.NVarChar, catName)
        .query('SELECT category_id FROM VehicleCategory WHERE category_name = @catName');
      let categoryId;
      if (catRes.recordset.length === 0) {
        const newCat = await p.request().input('catName', sql.NVarChar, catName)
          .query('INSERT INTO VehicleCategory (category_name, is_active) VALUES (@catName, 1); SELECT SCOPE_IDENTITY() as category_id');
        categoryId = newCat.recordset[0].category_id;
      } else {
        categoryId = catRes.recordset[0].category_id;
      }

      const ownerId = carData.ownerId ? parseInt(carData.ownerId) : null;
      const price = parseInt(carData.pricePerDay) || 800000;
      const deposit = 5000000; // Fixed deposit
      const status = ownerId ? 'Pending' : 'Available';

      const request = p.request()
        .input('ownerId', sql.Int, ownerId)
        .input('brandId', sql.Int, brandId)
        .input('categoryId', sql.Int, categoryId)
        .input('model', sql.NVarChar, carData.model)
        .input('plateNumber', sql.VarChar, carData.plateNumber)
        .input('price', sql.Decimal(18, 2), price)
        .input('deposit', sql.Decimal(18, 2), deposit)
        .input('location', sql.NVarChar, carData.location)
        .input('transmission', sql.NVarChar, carData.transmission || 'Tự động')
        .input('fuel', sql.NVarChar, carData.fuel || 'Xăng')
        .input('status', sql.NVarChar, status);

      const insertVehicleQuery = `
        INSERT INTO Vehicle (owner_id, brand_id, category_id, model_name, license_plate, year_of_manufacture, daily_price, deposit_amount, location_address, transmission, fuel, status, is_active, created_at, updated_at)
        VALUES (@ownerId, @brandId, @categoryId, @model, @plateNumber, 2023, @price, @deposit, @location, @transmission, @fuel, @status, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as vehicle_id;
      `;
      const res = await request.query(insertVehicleQuery);
      const vehicleId = res.recordset[0].vehicle_id;

      // Insert Primary Image
      if (carData.image) {
        await p.request()
          .input('vehicleId', sql.Int, vehicleId)
          .input('image', sql.NVarChar, carData.image)
          .query('INSERT INTO VehicleImage (vehicle_id, image_url, is_primary, sort_order) VALUES (@vehicleId, @image, 1, 0)');
      }

      // Insert Car Papers document if any
      if (carData.carPapers) {
        await p.request()
          .input('vehicleId', sql.Int, vehicleId)
          .input('docUrl', sql.NVarChar, carData.carPapers)
          .query('INSERT INTO VehicleDocument (vehicle_id, document_type, document_url) VALUES (@vehicleId, \'Registration\', @docUrl)');
      }

      return await db.cars.findOne({ id: String(vehicleId) });
    },
    update: async (id, updateData) => {
      const p = await getPool();
      const vehicleId = parseInt(id);

      let updates = [];
      const request = p.request().input('vehicleId', sql.Int, vehicleId);

      if (updateData.brand !== undefined) {
        let brandRes = await p.request().input('brandName', sql.NVarChar, updateData.brand)
          .query('SELECT brand_id FROM Brand WHERE brand_name = @brandName');
        let brandId;
        if (brandRes.recordset.length === 0) {
          const newBrand = await p.request().input('brandName', sql.NVarChar, updateData.brand)
            .query('INSERT INTO Brand (brand_name, is_active) VALUES (@brandName, 1); SELECT SCOPE_IDENTITY() as brand_id');
          brandId = newBrand.recordset[0].brand_id;
        } else {
          brandId = brandRes.recordset[0].brand_id;
        }
        updates.push('brand_id = @brandId');
        request.input('brandId', sql.Int, brandId);
      }
      if (updateData.model !== undefined) {
        updates.push('model_name = @model');
        request.input('model', sql.NVarChar, updateData.model);
      }
      if (updateData.seats !== undefined) {
        updates.push('seat_count = @seats');
        request.input('seats', sql.Int, parseInt(updateData.seats));
      }
      if (updateData.pricePerDay !== undefined) {
        updates.push('daily_price = @price');
        request.input('price', sql.Decimal(18, 2), parseInt(updateData.pricePerDay));
      }
      if (updateData.location !== undefined) {
        updates.push('location_address = @location');
        request.input('location', sql.NVarChar, updateData.location);
      }
      if (updateData.transmission !== undefined) {
        updates.push('transmission = @transmission');
        request.input('transmission', sql.NVarChar, updateData.transmission);
      }
      if (updateData.fuel !== undefined) {
        updates.push('fuel = @fuel');
        request.input('fuel', sql.NVarChar, updateData.fuel);
      }
      if (updateData.status !== undefined) {
        const dbStatusMap = { 'available': 'Available', 'rented': 'Rented', 'pending_moderation': 'Pending', 'rejected': 'Rejected' };
        const dbStatus = dbStatusMap[updateData.status] || updateData.status;
        updates.push('status = @status');
        request.input('status', sql.NVarChar, dbStatus);
      }
      if (updateData.rejectionReason !== undefined) {
        updates.push('rejection_reason = @rejectionReason');
        request.input('rejectionReason', sql.NVarChar, updateData.rejectionReason);
      }

      if (updates.length > 0) {
        await request.query(`UPDATE Vehicle SET ${updates.join(', ')}, updated_at = GETDATE() WHERE vehicle_id = @vehicleId`);
      }

      // Update image
      if (updateData.image !== undefined && updateData.image) {
        await p.request()
          .input('vehicleId', sql.Int, vehicleId)
          .input('image', sql.NVarChar, updateData.image)
          .query(`
            IF EXISTS (SELECT 1 FROM VehicleImage WHERE vehicle_id = @vehicleId AND is_primary = 1)
              UPDATE VehicleImage SET image_url = @image WHERE vehicle_id = @vehicleId AND is_primary = 1
            ELSE
              INSERT INTO VehicleImage (vehicle_id, image_url, is_primary) VALUES (@vehicleId, @image, 1)
          `);
      }

      return await db.cars.findOne({ id: String(vehicleId) });
    },
    delete: async (id) => {
      const p = await getPool();
      const vehicleId = parseInt(id);
      await p.request().input('vehicleId', sql.Int, vehicleId).query(`
        DELETE FROM VehicleFeature WHERE vehicle_id = @vehicleId;
        DELETE FROM VehicleImage WHERE vehicle_id = @vehicleId;
        DELETE FROM VehicleDocument WHERE vehicle_id = @vehicleId;
        DELETE FROM Vehicle WHERE vehicle_id = @vehicleId;
      `);
      return true;
    }
  },

  // Bookings Operations
  bookings: {
    findMany: async (filter = {}) => {
      const p = await getPool();
      let query = 'SELECT b.* FROM Booking b';
      let where = [];
      const request = p.request();

      if (filter.userId !== undefined && filter.userId !== '') {
        where.push('b.renter_id = @userId');
        request.input('userId', sql.Int, parseInt(filter.userId));
      }
      if (filter.carId !== undefined && filter.carId !== '') {
        where.push('b.vehicle_id = @carId');
        request.input('carId', sql.Int, parseInt(filter.carId));
      }
      if (filter.status !== undefined && filter.status !== '') {
        const dbStatusMap = {
          'pending_owner': 'Pending',
          'pending': 'Pending',
          'confirmed': 'Approved',
          'active': 'Active',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
          'rejected': 'Rejected'
        };
        const dbStatus = dbStatusMap[filter.status] || filter.status;
        where.push('b.status = @status');
        request.input('status', sql.NVarChar, dbStatus);
      }

      if (where.length > 0) {
        query += ' WHERE ' + where.join(' AND ');
      }
      query += ' ORDER BY b.created_at DESC';

      const res = await request.query(query);
      return Promise.all(res.recordset.map(async (row) => await mapBookingRow(p, row)));
    },
    findOne: async (filter) => {
      const p = await getPool();
      let query = 'SELECT b.* FROM Booking b';
      let where = [];
      const request = p.request();

      if (filter.id) {
        where.push('b.booking_id = @id');
        request.input('id', sql.Int, parseInt(filter.id));
      }

      if (where.length === 0) return null;
      query += ' WHERE ' + where.join(' AND ');
      const res = await request.query(query);
      if (res.recordset.length === 0) return null;
      return await mapBookingRow(p, res.recordset[0]);
    },
    create: async (bookingData) => {
      const p = await getPool();

      const renterId = parseInt(bookingData.userId);
      const vehicleId = parseInt(bookingData.carId);

      const carRes = await p.request().input('vehicleId', sql.Int, vehicleId)
        .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @vehicleId');
      const isOwnerCar = carRes.recordset.length > 0 && carRes.recordset[0].owner_id !== null;

      const status = isOwnerCar ? 'Pending' : 'Approved';
      const price = parseInt(bookingData.totalPrice);
      const deposit = 5000000;

      const request = p.request()
        .input('renterId', sql.Int, renterId)
        .input('vehicleId', sql.Int, vehicleId)
        .input('pickupDate', sql.VarChar, bookingData.pickupDate)
        .input('returnDate', sql.VarChar, bookingData.returnDate)
        .input('pickupLocation', sql.NVarChar, bookingData.pickupLocation)
        .input('price', sql.Decimal(18, 2), price)
        .input('deposit', sql.Decimal(18, 2), deposit)
        .input('status', sql.NVarChar, status);

      const insertBookingQuery = `
        INSERT INTO Booking (renter_id, vehicle_id, start_datetime, end_datetime, pickup_address, return_address, rental_price, deposit_amount, platform_fee, total_amount, status, created_at, updated_at)
        VALUES (@renterId, @vehicleId, CAST(@pickupDate AS DATETIME2), CAST(@returnDate AS DATETIME2), @pickupLocation, @pickupLocation, @price, @deposit, 0, @price + @deposit, @status, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as booking_id;
      `;
      const res = await request.query(insertBookingQuery);
      const bookingId = res.recordset[0].booking_id;

      // Update car status
      await p.request().input('vehicleId', sql.Int, vehicleId).query('UPDATE Vehicle SET status = \'Rented\' WHERE vehicle_id = @vehicleId');

      // Create Payment row
      const payRequest = p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('payerId', sql.Int, renterId)
        .input('amount', sql.Decimal(18, 2), price + deposit)
        .input('method', sql.NVarChar, bookingData.paymentMethod || 'bank_transfer');
      await payRequest.query(`
        INSERT INTO Payment (booking_id, payer_id, amount, payment_type, payment_method, status, paid_at, created_at)
        VALUES (@bookingId, @payerId, @amount, 'RentalFee', @method, 'Success', GETDATE(), GETDATE())
      `);

      return await db.bookings.findOne({ id: String(bookingId) });
    },
    update: async (id, updateData) => {
      const p = await getPool();
      const bookingId = parseInt(id);

      let updates = [];
      const request = p.request().input('bookingId', sql.Int, bookingId);

      if (updateData.status !== undefined) {
        const dbStatusMap = {
          'pending_owner': 'Pending',
          'pending': 'Pending',
          'confirmed': 'Approved',
          'active': 'Active',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
          'rejected': 'Rejected'
        };
        const dbStatus = dbStatusMap[updateData.status] || updateData.status;
        updates.push('status = @status');
        request.input('status', sql.NVarChar, dbStatus);

        if (updateData.status === 'cancelled' || updateData.status === 'rejected') {
          await p.request().input('bookingId', sql.Int, bookingId).query(`
            UPDATE Vehicle SET status = 'Available'
            WHERE vehicle_id = (SELECT vehicle_id FROM Booking WHERE booking_id = @bookingId)
          `);
        }
      }
      if (updateData.handoverDocs !== undefined) {
        updates.push('handover_docs = @handoverDocs');
        request.input('handoverDocs', sql.NVarChar, JSON.stringify(updateData.handoverDocs));
      }
      if (updateData.issueReport !== undefined) {
        updates.push('issue_report = @issueReport');
        request.input('issueReport', sql.NVarChar, JSON.stringify(updateData.issueReport));
      }

      if (updates.length > 0) {
        await request.query(`UPDATE Booking SET ${updates.join(', ')}, updated_at = GETDATE() WHERE booking_id = @bookingId`);
      }

      return await db.bookings.findOne({ id: String(bookingId) });
    }
  },

  // Reviews Operations
  reviews: {
    findMany: async (filter = {}) => {
      const p = await getPool();
      let query = 'SELECT r.*, u.full_name as userName FROM Review r INNER JOIN [User] u ON r.reviewer_id = u.user_id';
      let where = [];
      const request = p.request();

      if (filter.carId) {
        where.push('r.vehicle_id = @carId');
        request.input('carId', sql.Int, parseInt(filter.carId));
      }
      if (filter.bookingId) {
        where.push('r.booking_id = @bookingId');
        request.input('bookingId', sql.Int, parseInt(filter.bookingId));
      }

      if (where.length > 0) {
        query += ' WHERE ' + where.join(' AND ');
      }
      query += ' ORDER BY r.created_at DESC';

      const res = await request.query(query);
      return res.recordset.map(row => ({
        id: String(row.review_id),
        bookingId: String(row.booking_id),
        carId: String(row.vehicle_id),
        userId: String(row.reviewer_id),
        userName: row.userName,
        rating: row.rating_vehicle,
        comment: row.comment || '',
        status: row.is_visible === true || row.is_visible === 1 ? 'visible' : 'hidden',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
      }));
    },
    create: async (reviewData) => {
      const p = await getPool();

      const bookingId = parseInt(reviewData.bookingId);
      const carId = parseInt(reviewData.carId);
      const userId = parseInt(reviewData.userId);
      const rating = parseInt(reviewData.rating) || 5;

      const ownerRes = await p.request().input('carId', sql.Int, carId)
        .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @carId');
      const ownerId = ownerRes.recordset.length > 0 ? (ownerRes.recordset[0].owner_id || 1) : 1;

      const request = p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('reviewerId', sql.Int, userId)
        .input('vehicleId', sql.Int, carId)
        .input('ownerId', sql.Int, ownerId)
        .input('rating', sql.Int, rating)
        .input('comment', sql.NVarChar, reviewData.comment || '');

      const insertReviewQuery = `
        INSERT INTO Review (booking_id, reviewer_id, vehicle_id, owner_id, rating_vehicle, rating_owner, comment, is_visible, created_at, updated_at)
        VALUES (@bookingId, @reviewerId, @vehicleId, @ownerId, @rating, @rating, @comment, 1, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as review_id;
      `;
      const res = await request.query(insertReviewQuery);
      const reviewId = res.recordset[0].review_id;

      const userRes = await p.request().input('userId', sql.Int, userId).query('SELECT full_name FROM [User] WHERE user_id = @userId');
      const userName = userRes.recordset[0].full_name;

      return {
        id: String(reviewId),
        bookingId: String(bookingId),
        carId: String(carId),
        userId: String(userId),
        userName,
        rating,
        comment: reviewData.comment || '',
        status: 'visible',
        createdAt: new Date().toISOString()
      };
    },
    update: async (id, updateData) => {
      const p = await getPool();
      const reviewId = parseInt(id);

      let updates = [];
      const request = p.request().input('reviewId', sql.Int, reviewId);
      if (updateData.status !== undefined) {
        updates.push('is_visible = @isVisible');
        request.input('isVisible', sql.Bit, updateData.status === 'visible' ? 1 : 0);
      }

      if (updates.length > 0) {
        await request.query(`UPDATE Review SET ${updates.join(', ')}, updated_at = GETDATE() WHERE review_id = @reviewId`);
      }

      const res = await p.request().input('reviewId', sql.Int, reviewId)
        .query('SELECT r.*, u.full_name as userName FROM Review r INNER JOIN [User] u ON r.reviewer_id = u.user_id WHERE r.review_id = @reviewId');
      const row = res.recordset[0];
      return {
        id: String(row.review_id),
        bookingId: String(row.booking_id),
        carId: String(row.vehicle_id),
        userId: String(row.reviewer_id),
        userName: row.userName,
        rating: row.rating_vehicle,
        comment: row.comment || '',
        status: row.is_visible ? 'visible' : 'hidden',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
      };
    }
  },

  // Support Tickets Operations
  support_tickets: {
    findMany: async (filter = {}) => {
      const p = await getPool();
      let query = 'SELECT t.*, u.full_name as userName, u.email as userEmail FROM SupportTicket t INNER JOIN [User] u ON t.user_id = u.user_id';
      let where = [];
      const request = p.request();

      if (filter.userId) {
        where.push('t.user_id = @userId');
        request.input('userId', sql.Int, parseInt(filter.userId));
      }
      if (filter.status) {
        where.push('t.status = @status');
        request.input('status', sql.VarChar, filter.status);
      }

      if (where.length > 0) {
        query += ' WHERE ' + where.join(' AND ');
      }
      query += ' ORDER BY t.created_at DESC';

      const res = await request.query(query);
      return Promise.all(res.recordset.map(async (row) => await mapTicketRow(p, row)));
    },
    findOne: async (filter) => {
      const p = await getPool();
      let query = 'SELECT t.*, u.full_name as userName, u.email as userEmail FROM SupportTicket t INNER JOIN [User] u ON t.user_id = u.user_id';
      let where = [];
      const request = p.request();

      if (filter.id) {
        where.push('t.ticket_id = @id');
        request.input('id', sql.Int, parseInt(filter.id));
      }

      if (where.length === 0) return null;
      query += ' WHERE ' + where.join(' AND ');
      const res = await request.query(query);
      if (res.recordset.length === 0) return null;
      return await mapTicketRow(p, res.recordset[0]);
    },
    create: async (ticketData) => {
      const p = await getPool();

      const userId = parseInt(ticketData.userId);
      const subject = ticketData.subject;
      const message = ticketData.message;

      const request = p.request()
        .input('userId', sql.Int, userId)
        .input('subject', sql.NVarChar, subject);

      const insertTicketQuery = `
        INSERT INTO SupportTicket (user_id, subject, status, priority, created_at, updated_at)
        VALUES (@userId, @subject, 'Open', 'Normal', GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as ticket_id;
      `;
      const res = await request.query(insertTicketQuery);
      const ticketId = res.recordset[0].ticket_id;

      await p.request()
        .input('ticketId', sql.Int, ticketId)
        .input('senderId', sql.Int, userId)
        .input('message', sql.NVarChar, message)
        .query('INSERT INTO TicketMessage (ticket_id, sender_id, message, sent_at) VALUES (@ticketId, @senderId, @message, GETDATE())');

      return await db.support_tickets.findOne({ id: String(ticketId) });
    },
    update: async (id, updateData) => {
      const p = await getPool();
      const ticketId = parseInt(id);

      if (updateData.status !== undefined) {
        await p.request()
          .input('ticketId', sql.Int, ticketId)
          .input('status', sql.NVarChar, updateData.status)
          .query('UPDATE SupportTicket SET status = @status, updated_at = GETDATE() WHERE ticket_id = @ticketId');
      }

      if (updateData.replies !== undefined && Array.isArray(updateData.replies)) {
        const msgRes = await p.request().input('ticketId', sql.Int, ticketId).query('SELECT message_id FROM TicketMessage WHERE ticket_id = @ticketId');
        const dbMsgCount = msgRes.recordset.length;

        if (updateData.replies.length > dbMsgCount) {
          for (let i = dbMsgCount; i < updateData.replies.length; i++) {
            const reply = updateData.replies[i];
            const senderId = parseInt(reply.senderId);
            await p.request()
              .input('ticketId', sql.Int, ticketId)
              .input('senderId', sql.Int, senderId)
              .input('message', sql.NVarChar, reply.message)
              .query('INSERT INTO TicketMessage (ticket_id, sender_id, message, sent_at) VALUES (@ticketId, @senderId, @message, GETDATE())');
          }
        }
      }

      return await db.support_tickets.findOne({ id: String(ticketId) });
    }
  },

  // Disputes Operations
  disputes: {
    findMany: async (filter = {}) => {
      const p = await getPool();
      let query = 'SELECT * FROM Complaint';
      let where = [];
      const request = p.request();

      if (filter.bookingId) {
        where.push('booking_id = @bookingId');
        request.input('bookingId', sql.Int, parseInt(filter.bookingId));
      }
      if (filter.renterId) {
        where.push('complainant_id = @renterId');
        request.input('renterId', sql.Int, parseInt(filter.renterId));
      }

      if (where.length > 0) {
        query += ' WHERE ' + where.join(' AND ');
      }

      const res = await request.query(query);
      return res.recordset.map(row => ({
        id: String(row.complaint_id),
        bookingId: String(row.booking_id),
        renterId: String(row.complainant_id),
        ownerId: String(row.defendant_id),
        description: row.description,
        status: row.status.toLowerCase(),
        resolutionDetails: row.resolution ? { resolution: row.resolution, resolvedAt: row.resolved_at } : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
      }));
    },
    create: async (disputeData) => {
      const p = await getPool();

      const bookingId = parseInt(disputeData.bookingId);
      const renterId = parseInt(disputeData.renterId);
      const ownerId = parseInt(disputeData.ownerId);
      const description = disputeData.description;

      const request = p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('renterId', sql.Int, renterId)
        .input('ownerId', sql.Int, ownerId)
        .input('description', sql.NVarChar, description);

      const insertQuery = `
        INSERT INTO Complaint (booking_id, complainant_id, defendant_id, title, description, status, created_at, updated_at)
        VALUES (@bookingId, @renterId, @ownerId, 'Dispute', @description, 'Open', GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as complaint_id;
      `;
      const res = await request.query(insertQuery);
      const complaintId = res.recordset[0].complaint_id;

      return {
        id: String(complaintId),
        bookingId: String(bookingId),
        renterId: String(renterId),
        ownerId: String(ownerId),
        description,
        status: 'open',
        resolutionDetails: null,
        createdAt: new Date().toISOString()
      };
    },
    update: async (id, updateData) => {
      const p = await getPool();
      const complaintId = parseInt(id);

      let updates = [];
      const request = p.request().input('complaintId', sql.Int, complaintId);

      if (updateData.status !== undefined) {
        const dbStatus = updateData.status === 'resolved' ? 'Resolved' : 'Open';
        updates.push('status = @status');
        request.input('status', sql.NVarChar, dbStatus);
      }
      if (updateData.resolutionDetails !== undefined && updateData.resolutionDetails) {
        updates.push('resolution = @resolution, resolved_at = GETDATE()');
        request.input('resolution', sql.NVarChar, updateData.resolutionDetails.resolution || '');
      }

      if (updates.length > 0) {
        await request.query(`UPDATE Complaint SET ${updates.join(', ')}, updated_at = GETDATE() WHERE complaint_id = @complaintId`);
      }

      const res = await p.request().input('complaintId', sql.Int, complaintId).query('SELECT * FROM Complaint WHERE complaint_id = @complaintId');
      const row = res.recordset[0];
      return {
        id: String(row.complaint_id),
        bookingId: String(row.booking_id),
        renterId: String(row.complainant_id),
        ownerId: String(row.defendant_id),
        description: row.description,
        status: row.status.toLowerCase(),
        resolutionDetails: row.resolution ? { resolution: row.resolution, resolvedAt: row.resolved_at } : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
      };
    }
  },

  // System Config Operations
  system_config: {
    get: async () => {
      const p = await getPool();
      const res = await p.request().query('SELECT * FROM SystemConfig');

      let serviceFeePercent = 5;
      let insuranceMultiplier = 1.1;
      let systemNotice = 'Chào mừng bạn đến với ViVuCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam. Hãy hoàn tất KYC bằng lái xe trong mục Hồ sơ để bắt đầu trải nghiệm thuê xe ngay!';

      for (const config of res.recordset) {
        if (config.config_key === 'PLATFORM_FEE_PERCENT') {
          serviceFeePercent = parseInt(config.config_value) || serviceFeePercent;
        } else if (config.config_key === 'INSURANCE_MULTIPLIER') {
          insuranceMultiplier = parseFloat(config.config_value) || insuranceMultiplier;
        } else if (config.config_key === 'SYSTEM_NOTICE') {
          systemNotice = config.config_value;
        }
      }

      return {
        serviceFeePercent,
        insuranceMultiplier,
        systemNotice
      };
    },

    update: async (newConfig) => {
      const p = await getPool();
      const upsertConfig = async (key, val, type) => {
        if (val === undefined) return;
        await p.request()
          .input('key', sql.NVarChar, key)
          .input('val', sql.NVarChar, String(val))
          .input('type', sql.NVarChar, type)
          .query(`
            IF EXISTS (SELECT 1 FROM SystemConfig WHERE config_key = @key)
              UPDATE SystemConfig SET config_value = @val, updated_at = GETDATE() WHERE config_key = @key
            ELSE
              INSERT INTO SystemConfig (config_key, config_value, data_type, updated_at) VALUES (@key, @val, @type, GETDATE())
          `);
      };

      await upsertConfig('PLATFORM_FEE_PERCENT', newConfig.serviceFeePercent, 'Number');
      await upsertConfig('INSURANCE_MULTIPLIER', newConfig.insuranceMultiplier, 'Number');
      await upsertConfig('SYSTEM_NOTICE', newConfig.systemNotice, 'String');

      return await db.system_config.get();
    }
  }
};
