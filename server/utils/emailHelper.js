import nodemailer from 'nodemailer';
import { db } from '../models/index.js';

// hỗ trợ tạo email giả lập và gửi email SMTP thực nếu thông tin đăng nhập SMTP tồn tại trong tệp .env.
export const sendEmailWithRealFallback = async ({ to, subject, body }) => {
  // 1. Always create the simulated email for local inbox UI
  await db.emails.create({ to, subject, body });

  // 2. Extract real SMTP settings
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (smtpEmail && smtpPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpEmail,
          pass: smtpPassword
        }
      });

      const mailOptions = {
        from: `"ViVuCar Service" <${smtpEmail}>`,
        to: to,
        subject: subject,
        html: body
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to} via SMTP`);
    } catch (smtpError) {
      console.error('SMTP email dispatch failed, fell back to simulated DB inbox only:', smtpError);
    }
  }
};
