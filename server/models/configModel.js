import crypto from 'crypto';
import { sql, getPool } from '../config/db.js';

export const emailModel = {
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
};

export const configModel = {
  get: async () => {
    const p = await getPool();
    const res = await p.request().query('SELECT * FROM SystemConfig');

    let serviceFeePercent = 5;
    let insuranceMultiplier = 1.1;
    let systemNotice = 'Chào mừng bạn đến với ViVuCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam. Hãy hoàn tất KYC bằng lái xe trong mục Hồ sơ để bắt đầu trải nghiệm thuê xe ngay!';
    let bankId = process.env.BANK_ID || 'mbbank';
    let bankName = process.env.BANK_NAME || 'ViVuCar Bank';
    let bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '1900533588';
    let bankAccountHolder = process.env.BANK_ACCOUNT_HOLDER || 'VIVUCAR SYSTEM';

    for (const config of res.recordset) {
      if (config.config_key === 'PLATFORM_FEE_PERCENT') {
        serviceFeePercent = parseInt(config.config_value) || serviceFeePercent;
      } else if (config.config_key === 'INSURANCE_MULTIPLIER') {
        insuranceMultiplier = parseFloat(config.config_value) || insuranceMultiplier;
      } else if (config.config_key === 'SYSTEM_NOTICE') {
        systemNotice = config.config_value;
      } else if (config.config_key === 'BANK_ID') {
        bankId = config.config_value || bankId;
      } else if (config.config_key === 'BANK_NAME') {
        bankName = config.config_value || bankName;
      } else if (config.config_key === 'BANK_ACCOUNT_NUMBER') {
        bankAccountNumber = config.config_value || bankAccountNumber;
      } else if (config.config_key === 'BANK_ACCOUNT_HOLDER') {
        bankAccountHolder = config.config_value || bankAccountHolder;
      }
    }

    return {
      serviceFeePercent,
      insuranceMultiplier,
      systemNotice,
      bankId,
      bankName,
      bankAccountNumber,
      bankAccountHolder
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
    await upsertConfig('BANK_ID', newConfig.bankId, 'String');
    await upsertConfig('BANK_NAME', newConfig.bankName, 'String');
    await upsertConfig('BANK_ACCOUNT_NUMBER', newConfig.bankAccountNumber, 'String');
    await upsertConfig('BANK_ACCOUNT_HOLDER', newConfig.bankAccountHolder, 'String');

    return await configModel.get();
  }
};
