import { sql, getPool } from '../config/db.js';

export const mapUserRow = async (p, userRow) => {
  const userId = userRow.user_id;

  // Fetch Role, Wallet, KYC, and OTP tokens in parallel to avoid sequential query latency
  const [roleRes, walletRes, kycRes, otpRes] = await Promise.all([
    p.request().input('userId', sql.Int, userId)
      .query('SELECT r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = @userId'),
    p.request().input('userId', sql.Int, userId)
      .query('SELECT * FROM Wallet WHERE user_id = @userId'),
    p.request().input('userId', sql.Int, userId)
      .query('SELECT * FROM KYC WHERE user_id = @userId'),
    p.request().input('userId', sql.Int, userId)
      .query('SELECT * FROM OTPVerification WHERE user_id = @userId AND is_used = 0')
  ]);

  let role = 'renter';
  if (roleRes.recordset.length > 0) {
    const roleName = roleRes.recordset[0].role_name;
    if (roleName === 'Admin') role = 'admin';
    else if (roleName === 'CustomerService') role = 'cskh';
    else if (roleName === 'CarOwner') role = 'owner';
    else role = 'renter';
  }

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

  let licenseStatus = 'not_uploaded';
  let licenseImage = null;
  let kycDocuments = { cccd: null, cccdBack: null, license: null, carPapers: null };

  for (const doc of kycRes.recordset) {
    const statusMap = { 'Pending': 'pending', 'Approved': 'verified', 'Rejected': 'rejected' };
    const mappedStatus = statusMap[doc.status] || 'not_uploaded';

    if (doc.document_type === 'NationalID') {
      kycDocuments.cccd = doc.front_image_url;
    } else if (doc.document_type === 'NationalIDBack') {
      kycDocuments.cccdBack = doc.front_image_url;
    } else if (doc.document_type === 'DriverLicense') {
      kycDocuments.license = doc.front_image_url;
      licenseImage = doc.front_image_url;
      licenseStatus = mappedStatus;
    } else if (doc.document_type === 'VehicleRegistration') {
      kycDocuments.carPapers = doc.front_image_url;
    }
  }

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
    kycRejectionReason: userRow.kyc_rejection_reason || null,
    createdAt: userRow.created_at ? new Date(userRow.created_at).toISOString() : new Date().toISOString()
  };
};

export const userModel = {
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

    return await userModel.findOne({ id: String(userId) });
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
    if (updateData.kycRejectionReason !== undefined) {
      userUpdates.push('kyc_rejection_reason = @kycRejectionReason');
      userRequest.input('kycRejectionReason', sql.NVarChar, updateData.kycRejectionReason);
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
      await upsertKyc('NationalIDBack', docs.cccdBack);
      await upsertKyc('DriverLicense', docs.license);
      await upsertKyc('VehicleRegistration', docs.carPapers);
    }

    // 5. Update license status and reviewer changes
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

    if (updateData.cccdStatus !== undefined) {
      const dbStatusMap = { 'pending': 'Pending', 'verified': 'Approved', 'rejected': 'Rejected' };
      const dbStatus = dbStatusMap[updateData.cccdStatus] || 'Pending';
      await p.request()
        .input('userId', sql.Int, userId)
        .input('status', sql.NVarChar, dbStatus)
        .query(`
          UPDATE KYC SET status = @status, reviewed_at = GETDATE()
          WHERE user_id = @userId AND document_type = 'NationalID'
        `);
    }

    if (updateData.cccdBackStatus !== undefined) {
      const dbStatusMap = { 'pending': 'Pending', 'verified': 'Approved', 'rejected': 'Rejected' };
      const dbStatus = dbStatusMap[updateData.cccdBackStatus] || 'Pending';
      await p.request()
        .input('userId', sql.Int, userId)
        .input('status', sql.NVarChar, dbStatus)
        .query(`
          UPDATE KYC SET status = @status, reviewed_at = GETDATE()
          WHERE user_id = @userId AND document_type = 'NationalIDBack'
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

    return await userModel.findOne({ id: String(userId) });
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
};
