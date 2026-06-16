import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'; //chặn IP nếu spam login quá nhiều
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { db } from './database.js';
import { auth } from './middleware/auth.js';
import nodemailer from 'nodemailer';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'swp391-super-secret-key-12345';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '685695521533-f6f90q2icshojk8lcsbo2etf0oma73jc.apps.googleusercontent.com';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper to normalize Vietnamese string (remove accents and casing)
function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Helper to extract & verify QR from base64 image
async function verifyCCCDQr(base64Image, expectedName) {
  try {
    // 1. Convert base64 to Buffer
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    if (matches && matches.length === 3) {
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(base64Image, 'base64');
    }

    // 2. Read image using Jimp
    const image = await Jimp.read(imageBuffer);
    const { data, width, height } = image.bitmap;

    // 3. Scan QR using jsQR
    const qrCode = jsQR(new Uint8ClampedArray(data), width, height);
    if (!qrCode) {
      return { verified: false, reason: 'Không tìm thấy mã QR trên ảnh mặt trước CCCD. Vui lòng chụp rõ nét, thẳng góc, không bị chói sáng hoặc che khuất mã QR.' };
    }

    const qrText = qrCode.data;
    console.log('Decoded QR Text:', qrText);

    // CCCD QR format is typically: Số_CCCD|Số_CMND_Cũ|Họ_Tên|Ngày_Sinh|Giới_Tính|Địa_Chỉ|Ngày_Cấp
    const parts = qrText.split('|');
    if (parts.length < 5) {
      return { verified: false, reason: 'Mã QR không đúng định dạng Căn cước công dân Việt Nam.' };
    }

    const cccdNumber = parts[0];
    const fullName = parts[2];

    // Normalize both names for matching
    const normExpected = normalizeName(expectedName);
    const normActual = normalizeName(fullName);

    if (normExpected !== normActual) {
      return {
        verified: false,
        reason: `Họ tên trên CCCD (${fullName}) không trùng khớp với họ tên đã đăng ký (${expectedName}).`
      };
    }

    return { verified: true, cccdNumber, fullName };
  } catch (error) {
    console.error('Error during CCCD QR verification:', error);
    return { verified: false, reason: 'Lỗi xử lý hình ảnh. Vui lòng gửi tệp ảnh hợp lệ (PNG/JPG).' };
  }
}

// Rate Limiter for authentication routes (Huy)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Quá nhiều yêu cầu đăng nhập từ IP này, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads up to 10MB

// Helper to sanitize user object
const sanitizeUser = (user) => {
  const { password, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  safe.hasPassword = !!password;
  return safe;
};

// hỗ trợ tạo email giả lập và gửi email SMTP thực nếu thông tin đăng nhập SMTP tồn tại trong tệp .env. (Huy)
const sendEmailWithRealFallback = async ({ to, subject, body }) => {
  // 1. Always create the simulated email for local inbox UI
  const newEmail = db.emails.create({ to, subject, body });

  // 2. Extract real SMTP settings
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // Skip sending real emails to mock/dummy domains to avoid bounce-back emails in user inbox
  const recipient = String(to).toLowerCase().trim();
  const isDummyEmail = recipient.endsWith('@bonboncar.vn') ||
    recipient.endsWith('@vivucar.vn') ||
    recipient.endsWith('@example.com');

  if (smtpEmail && smtpPassword && !isDummyEmail) {
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
  } else if (isDummyEmail) {
    console.log(`Skipped real SMTP sending for dummy email: ${to} (Simulated inbox only)`);
  }
};

// --- Simulated Email API (For Inbox Component) ---
app.get('/api/emails', async (req, res) => {
  try {
    const emails = await db.emails.findMany();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư ảo.' });
  }
});

app.post('/api/emails/mark-read', async (req, res) => {
  try {
    await db.emails.markAllAsRead();
    res.json({ message: 'Đã đánh dấu tất cả thư là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật hòm thư.' });
  }
});

app.post('/api/emails/clear', async (req, res) => {
  try {
    await db.emails.clearAll();
    res.json({ message: 'Đã xóa toàn bộ hòm thư ảo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa hòm thư.' });
  }
});


// --- AUTHENTICATION ROUTES (UC01 - UC06) ---
// 1. Register (Đăng ký tài khoản - UC01)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin (Email, Mật khẩu, Họ tên).' });
    }

    // Bắt buộc mật khẩu phải từ 6 ký tự trở lên
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự để đảm bảo an toàn.' });
    }

    const existingUser = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký sử dụng.' });
    }

    //Mã hóa password
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP code

    const newUser = await db.users.create({
      email,
      password: hashedPassword,
      name,
      isEmailVerified: false,
      emailVerificationToken,
      role: 'renter' // Default role is Renter
    });

    // Create simulated email and send real Gmail if configured
    await sendEmailWithRealFallback({
      to: email,
      subject: 'Mã OTP xác thực tài khoản ViVuCar 🔑',
      body: `
        <h3>Chào mừng ${name} đến với ViVuCar!</h3>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Dưới đây là mã xác thực OTP gồm 6 chữ số của bạn (Có hiệu lực trong vòng 10 phút):</p>
        <div style="font-size: 24px; font-weight: bold; color: #6366f1; background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; letter-spacing: 6px; margin: 20px 0; max-width: 200px; margin-left: auto; margin-right: auto;">
          ${emailVerificationToken}
        </div>
        <p>Vui lòng nhập mã này vào ô xác thực trên ứng dụng để kích hoạt tài khoản của bạn.</p>
        <br><br>
        <p>Trân trọng,<br>Ban Quản Trị ViVuCar</p>
      `
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công! Mã xác thực OTP đã được gửi vào email của bạn.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình đăng ký.' });
  }
});

// 2. Verify Email (Xác thực Email)
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token xác thực không hợp lệ.' });
    }

    const user = await db.users.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    await db.users.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null
    });

    res.json({ message: 'Xác thực tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình xác thực.' });
  }
});

// Quick Dev Bypass to verify email directly by email address
app.post('/api/auth/verify-email-direct', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Thiếu email.' });

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });

    db.users.update(user.id, { isEmailVerified: true, emailVerificationToken: null });
    res.json({ message: 'Kích hoạt tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email direct error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình kích hoạt nhanh.' });
  }
});

// 2.5 Verify Email via 6-digit OTP code
app.post('/api/auth/verify-email-otp', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ email và mã xác thực OTP.' });
    }

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }

    if (user.emailVerificationToken !== code) {
      return res.status(400).json({ message: 'Mã xác thực OTP không chính xác.' });
    }

    db.users.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null
    });

    res.json({ message: 'Kích hoạt tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình kích hoạt bằng OTP.' });
  }
});

// 3. Login (Đăng nhập - UC02)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập Email và Mật khẩu.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    if (!user.password) {
      // Không tiết lộ cho người dùng biết email này tồn tại và được liên kết bằng Google
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    if (!user.isEmailVerified) {
      let otp = user.emailVerificationToken;
      // If token is missing or not a 6-digit number, regenerate it
      if (!otp || !/^\d{6}$/.test(otp)) {
        otp = Math.floor(100000 + Math.random() * 900000).toString();
        db.users.update(user.id, { emailVerificationToken: otp });
      }

      await sendEmailWithRealFallback({
        to: user.email,
        subject: 'Gửi lại: Mã OTP xác thực tài khoản ViVuCar 🔄',
        body: `
          <h3>Xác thực tài khoản của bạn</h3>
          <p>Tài khoản của bạn chưa được xác thực. Dưới đây là mã xác thực OTP gồm 6 chữ số của bạn (Có hiệu lực trong vòng 10 phút):</p>
          <div style="font-size: 24px; font-weight: bold; color: #6366f1; background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; letter-spacing: 6px; margin: 20px 0; max-width: 200px; margin-left: auto; margin-right: auto;">
            ${otp}
          </div>
          <p>Vui lòng nhập mã này vào ô xác thực trên ứng dụng để kích hoạt tài khoản của bạn.</p>
          <br><br>
          <p>Trân trọng,<br>Ban Quản Trị ViVuCar</p>
        `
      });

      return res.status(403).json({
        message: 'Tài khoản của bạn chưa được xác thực email. Mã xác thực OTP mới đã được gửi vào email của bạn.',
        unverified: true
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình đăng nhập.' });
  }
});

// 4. Google Login (Đăng nhập Google)
app.post('/api/auth/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin xác thực Google.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google verification failed:', verifyError);
      return res.status(400).json({ message: 'Xác thực Google Token thất bại.' });
    }

    const { sub: googleId, email, name, picture } = payload;
    let user = await db.users.findOne({ googleId });

    if (!user) {
      user = await db.users.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        user = await db.users.update(user.id, { googleId, isEmailVerified: true });

        // Gửi email chào mừng khi liên kết tài khoản Google lần đầu tiên thành công
        try {
          await sendEmailWithRealFallback({
            to: email,
            subject: 'Liên kết tài khoản Google thành công ✔️',
            body: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #4f46e5; text-align: center;">Chào mừng bạn đến với ViVuCar!</h2>
                <p>Xin chào <strong>${user.name}</strong>,</p>
                <p>Chúng tôi đã liên kết thành công tài khoản ViVuCar của bạn với tài khoản Google của bạn!</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 6px; margin: 20px 0;">
                  <strong style="color: #0f172a;">Thông tin liên kết Google:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155;">
                    <li><strong>Họ tên:</strong> ${user.name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Trạng thái:</strong> Đã liên kết & Xác thực ✔️</li>
                  </ul>
                </div>
                
                <p>Bây giờ bạn đã có thể đăng nhập cực kỳ nhanh chóng và an toàn bằng nút "Đăng nhập với Google".</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 13px; color: #64748b; text-align: center;">
                  Đây là email tự động từ hệ thống ViVuCar.<br>
                  © 2026 Ban Quản Trị ViVuCar. All rights reserved.
                </p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('[Google-Login] Lỗi khi gửi email liên kết:', emailError.message);
        }
      } else {
        user = await db.users.create({
          email,
          name,
          avatar: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          googleId,
          isEmailVerified: true,
          role: 'renter'
        });

        // Gửi email chào mừng khi đăng ký bằng Google lần đầu tiên thành công
        try {
          await sendEmailWithRealFallback({
            to: email,
            subject: 'Chào mừng bạn đến với ViVuCar ✔️',
            body: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #4f46e5; text-align: center;">Chào mừng bạn đến với ViVuCar!</h2>
                <p>Xin chào <strong>${name}</strong>,</p>
                <p>Cảm ơn bạn đã lựa chọn đăng nhập bằng tài khoản Google tại ViVuCar. Tài khoản của bạn đã được khởi tạo và xác thực email tự động thành công!</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #4f46e5; border-radius: 6px; margin: 20px 0;">
                  <strong style="color: #0f172a;">Thông tin tài khoản liên kết Google:</strong>
                  <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155;">
                    <li><strong>Họ tên:</strong> ${name}</li>
                    <li><strong>Email đăng nhập:</strong> ${email}</li>
                    <li><strong>Trạng thái xác thực:</strong> Đã kích hoạt ✔️</li>
                  </ul>
                </div>
                
                <p>Bây giờ bạn đã sẵn sàng trải nghiệm đặt các dòng xe tự lái đời mới hàng đầu tại ViVuCar. Đừng quên hoàn tất thông tin bằng lái xe (KYC) tại mục Hồ sơ cá nhân trước khi thực hiện chuyến đi đầu tiên nhé!</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 13px; color: #64748b; text-align: center;">
                  Đây là email tự động từ hệ thống ViVuCar.<br>
                  © 2026 Ban Quản Trị ViVuCar. All rights reserved.
                </p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('[Google-Login] Lỗi khi gửi email chào mừng:', emailError.message);
        }
      }
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Đăng nhập Google thành công!',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra khi đăng nhập Google.' });
  }
});

// 5. Forgot Password (Quên mật khẩu - UC06)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng điền địa chỉ email của bạn.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Email này không tồn tại trong hệ thống.' });
    }

    // Generate a 6-digit random code (OTP)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordExpires = Date.now() + 600000; // 10 minutes expiry

    await db.users.update(user.id, {
      resetPasswordToken: resetCode,
      resetPasswordExpires
    });

    await sendEmailWithRealFallback({
      to: email,
      subject: 'Mã xác nhận OTP đặt lại mật khẩu ViVuCar 🔑',
      body: `
        <h3>Chào ${user.name},</h3>
        <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
        <p>Dưới đây là mã xác thực OTP gồm 6 chữ số của bạn (Có hiệu lực trong vòng 10 phút):</p>
        <div style="font-size: 24px; font-weight: bold; color: #6366f1; background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; text-align: center; letter-spacing: 6px; margin: 20px 0; max-width: 200px; margin-left: auto; margin-right: auto;">
          ${resetCode}
        </div>
        <p>Vui lòng nhập mã này vào trang xác thực trên ứng dụng để tiến hành đổi mật khẩu mới.</p>
        <br><br>
        <p>Trân trọng,<br>Ban Quản Trị ViVuCar</p>
      `
    });

    res.json({ message: 'Mã xác thực OTP đã được gửi thành công vào email của bạn!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu quên mật khẩu.' });
  }
});

// 5.5. Verify OTP code (Xác nhận mã OTP)
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ email và mã xác nhận OTP.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.resetPasswordToken !== code || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã xác nhận OTP không chính xác hoặc đã hết hạn.' });
    }

    res.json({ message: 'Mã xác nhận OTP chính xác! Bây giờ bạn đã có thể đặt lại mật khẩu mới.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xác nhận mã OTP.' });
  }
});

// 6. Reset Password (Đặt lại mật khẩu)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin khôi phục mật khẩu.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.resetPasswordToken !== code || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    res.json({ message: 'Đặt lại mật khẩu thành công! Hãy đăng nhập lại.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khôi phục mật khẩu.' });
  }
});


// --- USER PROFILE & CORE API (PROTECTED) ---
// 7. Get Profile (Xem profile)
app.get('/api/user/profile', auth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// 8. Edit Profile (Chỉnh sửa thông tin)
app.put('/api/user/profile/edit', auth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name) return res.status(400).json({ message: 'Họ tên không được để trống.' });

    const updatedUser = await db.users.update(req.user.id, { name, bio });
    res.json({ message: 'Cập nhật thông tin thành công!', user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật profile.' });
  }
});

// 9. Update Avatar (Đổi ảnh đại diện)
app.put('/api/user/profile/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'Thiếu ảnh đại diện.' });

    const updatedUser = await db.users.update(req.user.id, { avatar });
    res.json({ message: 'Cập nhật ảnh đại diện thành công!', user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật avatar.' });
  }
});

// 10. Change Password (Đổi mật khẩu - UC05)
app.put('/api/user/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới.' });

    const user = await db.users.findOne({ id: req.user.id });
    if (user.password) {
      if (!currentPassword) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại.' });
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update(user.id, { password: hashedPassword });
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đổi mật khẩu.' });
  }
});

// 11. Upload KYC Documents (Xác thực KYC CCCD, Bằng lái, Giấy tờ - UC04)
app.put('/api/user/kyc', auth, async (req, res) => {
  try {
    const { cccdImage, cccdBackImage, licenseImage, carPapersImage } = req.body;
    const user = await db.users.findOne({ id: req.user.id });

    let autoVerifySuccess = false;
    let qrErrorMsg = null;

    // Validate CCCD via QR if a new CCCD front image is provided
    if (cccdImage && cccdImage !== user.kycDocuments?.cccd) {
      console.log('Validating uploaded CCCD QR code...');
      const qrResult = await verifyCCCDQr(cccdImage, user.name);
      if (qrResult.verified) {
        autoVerifySuccess = true;
      } else {
        qrErrorMsg = qrResult.reason;
      }
    }

    // If CCCD was uploaded but QR check failed, reject the request with error message
    if (cccdImage && cccdImage !== user.kycDocuments?.cccd && !autoVerifySuccess) {
      return res.status(400).json({
        message: `Xác thực giấy tờ thất bại: ${qrErrorMsg}`
      });
    }

    const newKyc = {
      cccd: cccdImage || user.kycDocuments?.cccd || null,
      cccdBack: cccdBackImage || user.kycDocuments?.cccdBack || null,
      license: licenseImage || user.kycDocuments?.license || null,
      carPapers: carPapersImage || user.kycDocuments?.carPapers || null
    };

    // Since manual admin verification is removed, we auto-approve the user's KYC directly
    const licenseStatus = 'verified';

    const updatedUser = await db.users.update(req.user.id, {
      kycDocuments: newKyc,
      licenseStatus,
      licenseImage: licenseImage || user.licenseImage,
      cccdStatus: cccdImage ? 'verified' : undefined,
      cccdBackStatus: cccdBackImage ? 'verified' : undefined
    });

    res.json({
      message: 'Xác thực hồ sơ KYC thành công! Trạng thái hoạt động của bạn đã được kích hoạt.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error('KYC upload error:', error);
    res.status(500).json({ message: 'Lỗi cập nhật hồ sơ KYC.' });
  }
});

// Compatibility Driver License upload route (UC04)
app.put('/api/user/license', auth, async (req, res) => {
  try {
    const { licenseImage } = req.body;
    if (!licenseImage) return res.status(400).json({ message: 'Thiếu ảnh bằng lái.' });

    const user = await db.users.findOne({ id: req.user.id });
    const newKyc = {
      ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
      license: licenseImage
    };

    const updatedUser = await db.users.update(req.user.id, {
      licenseStatus: 'verified',
      licenseImage,
      kycDocuments: newKyc
    });

    res.json({
      message: 'Tải ảnh bằng lái xe thành công! Bằng lái đã được tự động xác minh.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật bằng lái.' });
  }
});

// 12. Register Owner mode / Link bank account (Chủ xe liên kết tài khoản ngân hàng - UC24)
app.put('/api/user/bank-account', auth, async (req, res) => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.' });
    }

    const updatedUser = await db.users.update(req.user.id, {
      bankAccount: { bankName, accountNumber, accountHolder }
    });

    res.json({
      message: 'Liên kết tài khoản ngân hàng thành công!',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi liên kết tài khoản ngân hàng.' });
  }
});

// Register as a Car Owner (Đăng ký làm chủ xe)
app.post('/api/user/register-owner', auth, async (req, res) => {
  try {
    const updatedUser = await db.users.update(req.user.id, { role: 'owner' });
    res.json({
      message: 'Nâng cấp tài khoản thành Chủ xe (Car Owner) thành công! Bây giờ bạn có thể ký gửi xe lên hệ thống.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đăng ký làm chủ xe.' });
  }
});

// --- WALLET & TRANSACTIONS (UC19, UC28) ---
app.get('/api/user/wallet', auth, async (req, res) => {
  try {
    const user = await db.users.findOne({ id: req.user.id });
    res.json({
      walletBalance: user.walletBalance || 0,
      bankAccount: user.bankAccount
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thông tin ví.' });
  }
});

app.post('/api/user/wallet/transaction', auth, async (req, res) => {
  try {
    const { type, amount } = req.body; // type: 'deposit' (nap) | 'withdraw' (rut)
    const user = await db.users.findOne({ id: req.user.id });

    let currentBalance = user.walletBalance || 0;
    const value = parseInt(amount);

    if (type === 'withdraw') {
      if (currentBalance < value) return res.status(400).json({ message: 'Số dư ví không đủ để rút tiền.' });
      if (!user.bankAccount) return res.status(400).json({ message: 'Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền.' });
      currentBalance -= value;
    } else {
      currentBalance += value;
    }

    const updatedUser = await db.users.update(req.user.id, { walletBalance: currentBalance });
    res.json({
      message: type === 'withdraw' ? 'Yêu cầu rút tiền về ngân hàng thành công!' : 'Nạp tiền vào ví điện tử thành công!',
      walletBalance: updatedUser.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thực hiện giao dịch ví.' });
  }
});


// --- CAR RENTAL APIS (UC08 - UC11) ---

// Get System config public (UC11, UC29)
app.get('/api/system/config', async (req, res) => {
  res.json(await db.system_config.get());
});

// 13. GET Cars (Lấy danh sách xe với bộ lọc - UC08, UC09, UC10)
app.get('/api/cars', async (req, res) => {
  try {
    const { location, seats, transmission, fuel, search } = req.query;

    const filters = {};
    if (location) filters.location = location;
    if (seats) filters.seats = seats;
    if (transmission) filters.transmission = transmission;
    if (fuel) filters.fuel = fuel;

    // Only display verified cars ('available' or 'rented'), do not show 'pending_moderation' or 'rejected'
    let cars = await db.cars.findMany(filters);
    cars = cars.filter(car => car.status === 'available' || car.status === 'rented');

    if (search) {
      const keyword = search.toLowerCase();
      cars = cars.filter(car =>
        car.brand.toLowerCase().includes(keyword) ||
        car.model.toLowerCase().includes(keyword)
      );
    }

    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách xe.' });
  }
});

// 14. POST Cars (Ký gửi xe mới - UC21)
app.post('/api/cars', auth, async (req, res) => {
  try {
    const { brand, model, seats, transmission, fuel, pricePerDay, image, location, plateNumber, carPapers } = req.body;

    if (!brand || !model || !seats || !pricePerDay || !location || !plateNumber) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin ký gửi xe.' });
    }

    const newCar = await db.cars.create({
      brand,
      model,
      seats,
      transmission,
      fuel,
      pricePerDay,
      image,
      location,
      plateNumber,
      carPapers,
      ownerId: req.user.id
    });

    // Make sure user role is promoted to Owner since they listed a car
    if (req.user.role === 'renter') {
      await db.users.update(req.user.id, { role: 'owner' });
    }

    res.status(201).json({
      message: 'Ký gửi xe thành công! Xe của bạn đang chờ CSKH/Admin phê duyệt kiểm duyệt chất lượng.',
      car: newCar
    });
  } catch (error) {
    console.error('List car error:', error);
    res.status(500).json({ message: 'Lỗi ký gửi xe.' });
  }
});


// --- OWNER SPECIFIC APIS (UC22 - UC25) ---

// View Owner's Cars (UC25)
app.get('/api/owner/cars', auth, async (req, res) => {
  try {
    const cars = await db.cars.findMany({ ownerId: req.user.id });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách xe của bạn.' });
  }
});

// View Owner's Rental Requests and Earnings (UC22, UC23)
app.get('/api/owner/stats', auth, async (req, res) => {
  try {
    const myCars = await db.cars.findMany({ ownerId: req.user.id });
    const carIds = myCars.map(c => c.id);

    const allBookings = await db.bookings.findMany();
    // Bookings related to this owner's cars
    const myBookings = allBookings.filter(b => carIds.includes(b.carId));

    const detailedBookings = await Promise.all(myBookings.map(async (booking) => {
      const user = await db.users.findOne({ id: booking.userId }) || { name: 'Khách hàng ẩn' };
      const car = myCars.find(c => c.id === booking.carId);
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    }));

    // Calculate earnings from completed rentals
    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    res.json({
      bookings: detailedBookings,
      totalEarnings,
      carsCount: myCars.length,
      bookingsCount: myBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy số liệu chủ xe.' });
  }
});

// Approve or Reject Rental Requests (Car Owner - UC22)
app.put('/api/owner/bookings/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body; // true or false

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Yêu cầu đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car || car.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý đơn đặt xe này.' });
    }

    const newStatus = approved ? 'confirmed' : 'cancelled';
    await db.bookings.update(id, { status: newStatus });

    res.json({
      message: approved ? 'Đã phê duyệt yêu cầu đặt xe! Chuyến đi đã sẵn sàng.' : 'Đã từ chối đơn đặt xe và giải phóng phương tiện.',
      bookingStatus: newStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xét duyệt đơn đặt xe.' });
  }
});


// --- BOOKINGS INTERACTION & RENTER ACTIONS (UC13 - UC20) ---

// 15. POST Booking (Đặt xe & Đặt cọc - UC13, UC14)
app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, totalPrice, paymentMethod } = req.body;

    if (!carId || !pickupDate || !returnDate || !pickupLocation || !totalPrice) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin đặt xe.' });
    }

    const car = await db.cars.findOne({ id: carId });
    if (!car) return res.status(400).json({ message: 'Xe không tồn tại.' });
    if (car.status !== 'available') return res.status(400).json({ message: 'Xe này hiện tại đã có khách đặt.' });

    const user = await db.users.findOne({ id: req.user.id });
    if (user.licenseStatus !== 'verified') {
      return res.status(400).json({ message: 'Tài khoản chưa xác thực Bằng lái xe. Vui lòng xác thực trước khi đặt xe.' });
    }

    const booking = await db.bookings.create({
      userId: req.user.id,
      carId,
      pickupDate,
      returnDate,
      pickupLocation,
      totalPrice,
      paymentMethod
    });

    res.status(201).json({
      message: booking.status === 'pending_owner'
        ? 'Đặt xe và chuyển cọc thành công! Đang chờ Chủ xe phê duyệt chấp thuận hành trình.'
        : 'Đặt xe và chuyển cọc thành công! Vé thuê xe của bạn đã được xác nhận.',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo giao dịch đặt xe.' });
  }
});


// --- VNPAY PAYMENT GATEWAY INTEGRATION ---

// Helper to sort query parameters alphabetically (required by VNPAY)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// Helper to format Date (yyyyMMddHHmmss)
function formatVnpayDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());
}

// 1. Create VNPAY checkout URL (POST /api/payments/vnpay/create)
app.post('/api/payments/vnpay/create', auth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'Thiếu mã đặt xe.' });
    }

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });
    }

    if (booking.depositStatus === 'paid') {
      return res.status(400).json({ message: 'Đơn đặt xe này đã được thanh toán rồi.' });
    }

    const tmnCode = process.env.VNP_TMNCODE || 'CGXZZ77T';
    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNP_RETURNURL || 'http://localhost:5000/api/payments/vnpay/return';

    const date = new Date();
    const createDate = formatVnpayDate(date);
    const expireDate = formatVnpayDate(new Date(date.getTime() + 15 * 60 * 1000)); // Expire in 15 minutes

    const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Unique txn reference to prevent duplicates: PAY-{bookingId}-{timestamp}
    const txnRef = `PAY-${bookingId}-${date.getTime()}`;
    const amount = 500000; // Charge only the 500,000 VND reservation fee online

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan dat xe ${bookingId}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(amount * 100), // VNPAY multiplies amount by 100
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    const sortedParams = sortObject(vnpParams);
    const signData = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const queryParams = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const paymentUrl = `${vnpUrl}?${queryParams}&vnp_SecureHash=${secureHash}`;

    res.json({ paymentUrl });
  } catch (error) {
    console.error('Error generating VNPAY URL:', error);
    res.status(500).json({ message: 'Lỗi khởi tạo cổng thanh toán VNPAY.' });
  }
});

// 2. Redirection return page (GET /api/payments/vnpay/return)
// NO DB updates are performed here. Only validates integrity and redirects user.
app.get('/api/payments/vnpay/return', async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const signData = Object.entries(vnp_Params)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (secureHash === signed) {
      const txnRef = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];
      const transactionNo = vnp_Params['vnp_TransactionNo'] || '';

      // Extract bookingId from PAY-{bookingId}-{timestamp}
      const parts = txnRef.split('-');
      const bookingId = parts[1];

      const booking = await db.bookings.findOne({ id: bookingId });

      if (responseCode === '00' && transactionStatus === '00') {
        if (booking && booking.depositStatus !== 'paid') {
          const car = await db.cars.findOne({ id: booking.carId });
          const isOwnerCar = car && car.ownerId !== null;
          const targetBookingStatus = isOwnerCar ? 'Pending' : 'Approved';

          await db.payments.confirmVnpayPayment({
            bookingId,
            vnpTxnRef: txnRef,
            vnpTransactionNo: transactionNo,
            vnpResponseCode: responseCode,
            vnpTransactionStatus: transactionStatus,
            targetStatus: targetBookingStatus
          });
          console.log(`VNPAY Return: Database successfully updated as Paid for booking ${bookingId}`);
        }
        res.redirect(`${clientUrl}/?vnpay_status=success&booking_id=${bookingId}`);
      } else {
        if (booking && booking.depositStatus !== 'paid') {
          await db.payments.failVnpayPayment({
            bookingId,
            vnpTxnRef: txnRef,
            vnpTransactionNo: transactionNo,
            vnpResponseCode: responseCode,
            vnpTransactionStatus: transactionStatus
          });
          console.log(`VNPAY Return: Database successfully updated as Failed/Cancelled for booking ${bookingId}`);
        }
        res.redirect(`${clientUrl}/?vnpay_status=failed&booking_id=${bookingId}`);
      }
    } else {
      console.warn('VNPAY return signature verification failed.');
      res.redirect(`${clientUrl}/?vnpay_status=invalid_signature`);
    }
  } catch (error) {
    console.error('VNPAY return processing error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?vnpay_status=error`);
  }
});

// 3. Server-to-server IPN handler (GET /api/payments/vnpay/ipn)
// Strict validations and transactional database updates.
app.get('/api/payments/vnpay/ipn', async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNP_HASHSECRET || 'RAMDUPWUPZHRNACLQLNYNXJZKLFNSRCJ';
    const signData = Object.entries(vnp_Params)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 1. Signature Check
    if (secureHash !== signed) {
      console.warn('VNPAY IPN signature verification failed.');
      return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const txnRef = vnp_Params['vnp_TxnRef'];
    const amountInCents = parseInt(vnp_Params['vnp_Amount']);
    const responseCode = vnp_Params['vnp_ResponseCode'];
    const transactionStatus = vnp_Params['vnp_TransactionStatus'];
    const transactionNo = vnp_Params['vnp_TransactionNo'];

    // Extract bookingId from PAY-{bookingId}-{timestamp}
    const parts = txnRef.split('-');
    const bookingId = parts[1];

    // 2. Check Order Existence
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    // 3. Check Amount (VNPAY amount is multiplied by 100)
    const expectedAmountInCents = 500000 * 100;
    if (amountInCents !== expectedAmountInCents) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 4. Check If Order Already Confirmed
    if (booking.depositStatus === 'paid') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    // 5. Update Status based on Transaction Results (00 & 00 represents Success)
    if (responseCode === '00' && transactionStatus === '00') {
      // Determine the target booking status:
      // If owner vehicle, status = 'Pending' (maps to pending_owner).
      // If system/company vehicle, status = 'Approved' (maps to confirmed).
      const car = await db.cars.findOne({ id: booking.carId });
      const isOwnerCar = car && car.ownerId !== null;
      const targetBookingStatus = isOwnerCar ? 'Pending' : 'Approved';

      await db.payments.confirmVnpayPayment({
        bookingId,
        vnpTxnRef: txnRef,
        vnpTransactionNo: transactionNo,
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus,
        targetStatus: targetBookingStatus
      });

      console.log(`VNPAY IPN successful for booking ${bookingId}`);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    } else {
      // Payment failed or cancelled
      await db.payments.failVnpayPayment({
        bookingId,
        vnpTxnRef: txnRef,
        vnpTransactionNo: transactionNo,
        vnpResponseCode: responseCode,
        vnpTransactionStatus: transactionStatus
      });

      console.log(`VNPAY IPN failed/cancelled for booking ${bookingId}`);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    }
  } catch (error) {
    console.error('VNPAY IPN processing exception:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
});


// 16. GET Trips (Chuyến đi của tôi - UC15)
app.get('/api/bookings/my-trips', auth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany({ userId: req.user.id });

    const trips = await Promise.all(bookings.map(async (booking) => {
      const car = await db.cars.findOne({ id: booking.carId });
      // Find review for this booking if any
      const reviews = await db.reviews.findMany({ bookingId: booking.id });
      return {
        ...booking,
        car: car || { brand: 'Không xác định', model: 'Xe mẫu', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
        hasReviewed: reviews.length > 0,
        review: reviews[0] || null
      };
    }));

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải chuyến đi.' });
  }
});

// 17. PUT Cancel Booking (Hủy chuyến xe - UC20)
app.put('/api/bookings/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findOne({ id, userId: req.user.id });

    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Chuyến đi này đã được hủy trước đó.' });
    if (booking.status === 'completed') return res.status(400).json({ message: 'Hành trình đã kết thúc, không thể hủy.' });

    // Cancel booking and restore car
    await db.bookings.update(id, {
      status: 'cancelled',
      depositStatus: 'refunded' // Automatically refunded to simulation
    });

    // Refund cọc to wallet
    const user = await db.users.findOne({ id: req.user.id });
    await db.users.update(user.id, { walletBalance: (user.walletBalance || 0) + 5000000 });

    res.json({ message: 'Hủy đơn đặt xe thành công! Tiền cọc 5.000.000 VND đã được hoàn trả lại vào Ví cá nhân của bạn.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hủy đơn đặt xe.' });
  }
});

// 18. Sign Electronic Handover Documents (Biên bản bàn giao Nhận/Trả xe - UC18)
app.put('/api/bookings/:id/handover', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, checklist, signature } = req.body; // type: 'pickup' | 'return'

    if (!type || !checklist || !signature) {
      return res.status(400).json({ message: 'Vui lòng hoàn thành checklist và ký tên bàn giao xe.' });
    }

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const updatedHandover = {
      ...(booking.handoverDocs || { pickup: null, return: null })
    };

    updatedHandover[type] = {
      checklist,
      signature,
      timestamp: new Date().toISOString()
    };

    // Auto update booking status based on handover stage
    let nextStatus = booking.status;
    if (type === 'pickup') {
      nextStatus = 'active'; // Car is actively being driven
    } else if (type === 'return') {
      nextStatus = 'completed'; // Trip ended successfully
    }

    await db.bookings.update(id, {
      handoverDocs: updatedHandover,
      status: nextStatus
    });

    res.json({
      message: type === 'pickup'
        ? 'Ký biên bản bàn giao nhận xe thành công! Hành trình thuê xe bắt đầu.'
        : 'Ký biên bản trả xe thành công! Bạn có thể gửi đánh giá cho chủ xe.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ký biên bản bàn giao.' });
  }
});

// 19. Submit Accident/Incident Report (Báo cáo sự cố khẩn cấp - UC17)
app.post('/api/bookings/:id/incident', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, image } = req.body;

    if (!description) return res.status(400).json({ message: 'Vui lòng cung cấp mô tả chi tiết sự cố phát sinh.' });

    const booking = await db.bookings.findOne({ id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi tương ứng.' });

    await db.bookings.update(id, {
      issueReport: {
        description,
        image: image || null,
        reportedAt: new Date().toISOString(),
        status: 'pending'
      }
    });

    res.json({
      message: 'Báo cáo sự cố đã được gửi khẩn cấp đến đội ngũ CSKH. Chúng tôi sẽ liên hệ hỗ trợ bạn ngay lập tức.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi báo cáo sự cố.' });
  }
});

// 20. Post Trip Review (Đánh giá dịch vụ - UC16, UC12)
app.post('/api/bookings/:id/reviews', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) return res.status(400).json({ message: 'Vui lòng chấm điểm sao đánh giá.' });

    const booking = await db.bookings.findOne({ id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    // Create review in DB
    const review = await db.reviews.create({
      bookingId: id,
      carId: booking.carId,
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment
    });

    res.json({
      message: 'Đăng đánh giá dịch vụ thành công! Cảm ơn ý kiến của bạn.',
      review
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi đánh giá dịch vụ.' });
  }
});

// GET Car Reviews (Public - UC12)
app.get('/api/cars/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await db.reviews.findMany({ carId: id, status: 'visible' });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đánh giá xe.' });
  }
});


// --- CUSTOMER SUPPORT WIDGET (SUPPORT TICKETS - UC07, UC32) ---
app.post('/api/support/tickets', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Vui lòng điền tiêu đề và nội dung yêu cầu hỗ trợ.' });
    }

    const ticket = await db.support_tickets.create({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      subject,
      message
    });

    res.status(201).json({
      message: 'Gửi yêu cầu hỗ trợ thành công! Nhân viên chăm sóc khách hàng sẽ phản hồi trong chốc lát.',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo ticket hỗ trợ.' });
  }
});

app.get('/api/support/tickets', auth, async (req, res) => {
  try {
    const tickets = await db.support_tickets.findMany({ userId: req.user.id });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách yêu cầu hỗ trợ.' });
  }
});

app.put('/api/support/tickets/:id/resolve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.support_tickets.findOne({ id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: 'Yêu cầu hỗ trợ không tồn tại.' });

    await db.support_tickets.update(id, { status: 'resolved' });
    res.json({ message: 'Đã đóng yêu cầu hỗ trợ thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đóng ticket.' });
  }
});


// --- CSKH & ADMIN SHARED ENDPOINTS (UC26 - UC35) ---

// Role checking middlewares
const cskhOrAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cskh')) {
    next();
  } else {
    res.status(403).json({ message: 'Quyền CSKH hoặc Admin được yêu cầu.' });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Quyền quản trị tối cao (Admin) được yêu cầu.' });
  }
};

// 1. Approve KYC document / identity CCCD (CSKH/Admin - UC31)
app.put('/api/admin/users/:id/kyc', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = await db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tìm thấy.' });

    const updatedUser = await db.users.update(id, {
      licenseStatus: status,
      licenseImage: status === 'rejected' ? null : user.licenseImage,
      kycDocuments: {
        ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
        license: status === 'rejected' ? null : user.licenseImage
      }
    });

    res.json({
      message: `Đã phê duyệt trạng thái KYC thành công sang: ${status === 'verified' ? 'Đã xác minh ✓' : 'Từ chối ✕'}`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xét duyệt hồ sơ KYC.' });
  }
});

// 2. Fetch all incidents / accidents (CSKH/Admin - UC35)
app.get('/api/admin/incidents', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany();
    const reportedIncidents = await Promise.all(bookings
      .filter(b => b.issueReport !== null)
      .map(async (booking) => {
        const user = await db.users.findOne({ id: booking.userId }) || { name: 'Thành viên ẩn' };
        const car = await db.cars.findOne({ id: booking.carId }) || { brand: 'Không rõ', model: 'Xe' };
        return {
          bookingId: booking.id,
          userName: user.name,
          userEmail: user.email,
          carName: `${car.brand} ${car.model}`,
          carImage: car.image,
          incident: booking.issueReport,
          status: booking.status
        };
      }));
    res.json(reportedIncidents);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách sự cố.' });
  }
});

app.put('/api/admin/incidents/:bookingId/resolve', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    await db.bookings.update(bookingId, {
      issueReport: {
        ...booking.issueReport,
        status: 'resolved'
      }
    });

    res.json({ message: 'Đã đánh dấu giải quyết sự cố thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xử lý sự cố.' });
  }
});

// 3. Support Tickets Management (CSKH/Admin - UC32)
app.get('/api/admin/support/tickets', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const tickets = await db.support_tickets.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư hỗ trợ.' });
  }
});

app.post('/api/admin/support/tickets/:id/reply', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });

    const ticket = await db.support_tickets.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket hỗ trợ không tồn tại.' });

    const replies = [...ticket.replies, {
      sender: 'cskh',
      text: replyText,
      sentAt: new Date().toISOString()
    }];

    await db.support_tickets.update(id, {
      replies,
      status: 'replied'
    });

    res.json({ message: 'Đã gửi câu trả lời phản hồi cho khách hàng!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi phản hồi.' });
  }
});

// 4. Review moderation (CSKH/Admin - UC33)
app.get('/api/admin/reviews', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const reviews = await db.reviews.findMany();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách đánh giá.' });
  }
});

app.put('/api/admin/reviews/:id/status', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'visible' or 'hidden'

    if (status !== 'visible' && status !== 'hidden') {
      return res.status(400).json({ message: 'Trạng thái đánh giá không hợp lệ.' });
    }

    await db.reviews.update(id, { status });
    res.json({ message: `Đã cập nhật trạng thái hiển thị đánh giá thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ẩn đánh giá.' });
  }
});

// 5. Dispute Case Management (CSKH/Admin - UC34)
app.get('/api/admin/disputes', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const disputes = await db.disputes.findMany();
    const detailed = await Promise.all(disputes.map(async (d) => {
      const renter = await db.users.findOne({ id: d.renterId }) || { name: 'Người thuê' };
      const owner = await db.users.findOne({ id: d.ownerId }) || { name: 'Chủ xe' };
      const booking = await db.bookings.findOne({ id: d.bookingId }) || { totalPrice: 0 };
      return {
        ...d,
        renterName: renter.name,
        ownerName: owner.name,
        bookingPrice: booking.totalPrice
      };
    }));
    res.json(detailed);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách tranh chấp khiếu nại.' });
  }
});

app.post('/api/support/disputes', auth, async (req, res) => {
  try {
    const { bookingId, description } = req.body;
    if (!bookingId || !description) return res.status(400).json({ message: 'Thiếu thông tin khiếu nại.' });

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(400).json({ message: 'Không tìm thấy xe.' });

    const dispute = await db.disputes.create({
      bookingId,
      renterId: req.user.id,
      ownerId: car.ownerId || 'admin',
      description
    });

    await db.bookings.update(bookingId, { status: 'disputed' });

    res.json({ message: 'Nộp đơn khiếu nại lên ban CSKH thành công. Trạng thái chuyến đi chuyển sang: Tranh Chấp.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi nộp đơn khiếu nại.' });
  }
});

app.put('/api/admin/disputes/:id/resolve', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionDetails } = req.body;

    if (!resolutionDetails) return res.status(400).json({ message: 'Vui lòng điền nội dung phán quyết giải quyết.' });

    const dispute = await db.disputes.update(id, {
      status: 'resolved',
      resolutionDetails
    });

    // Update booking status back to completed/resolved
    await db.bookings.update(dispute.bookingId, { status: 'completed' });

    res.json({ message: 'Đã giải quyết tranh chấp khiếu nại thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi giải quyết khiếu nại.' });
  }
});

// 6. Deposit Refund Trigger (CSKH/Admin - UC28)
app.put('/api/admin/bookings/:id/refund-deposit', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'refunded' or 'withheld'

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    await db.bookings.update(id, { depositStatus: status });

    if (status === 'refunded') {
      // Refund the 5,000,000 VND cọc directly to user wallet balance!
      const user = await db.users.findOne({ id: booking.userId });
      await db.users.update(user.id, { walletBalance: (user.walletBalance || 0) + 5000000 });
    }

    res.json({
      message: status === 'refunded'
        ? 'Đã duyệt hoàn trả tiền cọc 5.000.000 VND thành công! Tiền đã được cộng vào ví của người dùng.'
        : 'Đã giữ lại tiền đặt cọc do phát sinh các thiệt hại vật chất đối với xe.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xử lý tiền cọc.' });
  }
});


// --- ADMIN ONLY OPERATIONS (UC26 - UC30) ---

// 1. User role delegation (Phân quyền - UC30)
app.put('/api/admin/users/:id/role', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'renter', 'owner', 'cskh', 'admin'

    if (role !== 'renter' && role !== 'owner' && role !== 'cskh' && role !== 'admin') {
      return res.status(400).json({ message: 'Vai trò phân quyền không hợp lệ.' });
    }

    const updatedUser = await db.users.update(id, { role });
    res.json({
      message: `Phân quyền thành viên thành công thành vai trò: ${role.toUpperCase()}`,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi phân quyền.' });
  }
});

// 2. Car Moderation / Verification (Kiểm duyệt xe đăng - UC27)
app.get('/api/admin/cars/pending', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const allCars = await db.cars.findMany();
    const pendingCars = allCars.filter(c => c.status === 'pending_moderation');
    res.json(pendingCars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách xe chờ duyệt.' });
  }
});

app.put('/api/admin/cars/:id/moderation', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'available' or 'rejected'

    if (status !== 'available' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái kiểm duyệt không hợp lệ.' });
    }

    const car = await db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Phương tiện không tồn tại.' });

    await db.cars.update(id, {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null
    });

    res.json({
      message: status === 'available'
        ? 'Duyệt phương tiện ký gửi lên sàn thành công!'
        : 'Đã từ chối phương tiện đăng tải.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi kiểm duyệt phương tiện.' });
  }
});

// 3. System notices & Pricing policies adjustment (Cấu hình hệ thống - UC29)
app.put('/api/admin/system/config', auth, adminAuth, async (req, res) => {
  try {
    const { serviceFeePercent, insuranceMultiplier, systemNotice } = req.body;

    const updated = await db.system_config.update({
      serviceFeePercent: serviceFeePercent !== undefined ? parseFloat(serviceFeePercent) : undefined,
      insuranceMultiplier: insuranceMultiplier !== undefined ? parseFloat(insuranceMultiplier) : undefined,
      systemNotice
    });

    res.json({
      message: 'Cập nhật cấu hình dịch vụ hệ thống thành công!',
      config: updated
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật cấu hình hệ thống.' });
  }
});


// --- SYSTEM AND GLOBAL ADMIN APIs (COMPATIBILITY) ---

// GET Admin Stats (Thống kê hệ thống - Protected)
app.get('/api/admin/stats', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const users = await db.users.findMany();
    const cars = await db.cars.findMany();
    const bookings = await db.bookings.findMany();

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'active');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    res.json({
      stats: {
        totalUsers: users.length,
        totalCars: cars.length,
        totalBookings: bookings.length,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy số liệu thống kê.' });
  }
});

// GET Admin Users (Danh sách tất cả người dùng - Protected)
app.get('/api/admin/users', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const users = await db.users.findMany();
    const safeUsers = users.map(user => sanitizeUser(user));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách thành viên.' });
  }
});

// PUT Approve/Reject Driver License (Duyệt bằng lái xe - Protected)
app.put('/api/admin/users/:id/license', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = await db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tồn tại.' });

    const updatedUser = await db.users.update(id, {
      licenseStatus: status,
      licenseImage: status === 'rejected' ? null : user.licenseImage,
      kycDocuments: {
        ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
        license: status === 'rejected' ? null : user.licenseImage
      }
    });

    res.json({
      message: `Đã cập nhật bằng lái xe thành: ${status === 'verified' ? 'Đã Duyệt' : 'Đã Từ Chối'}!`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi duyệt bằng lái.' });
  }
});

// GET Admin Bookings (Danh sách tất cả các đơn đặt xe - Protected)
app.get('/api/admin/bookings', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany();
    const detailedBookings = await Promise.all(bookings.map(async (booking) => {
      const user = await db.users.findOne({ id: booking.userId }) || { name: 'Thành viên đã ẩn' };
      const car = await db.cars.findOne({ id: booking.carId }) || { brand: 'Không xác định', model: 'Xe mẫu' };
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    }));

    res.json(detailedBookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách giao dịch.' });
  }
});

// PUT Admin Update Booking Status (Cập nhật trạng thái đặt xe - Protected)
app.put('/api/admin/bookings/:id/status', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    await db.bookings.update(id, { status });
    res.json({ message: 'Đã cập nhật trạng thái đơn đặt xe thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái đặt xe.' });
  }
});

// DELETE Admin Car (Gỡ bỏ xe khỏi hệ thống - Protected)
app.delete('/api/admin/cars/:id', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const car = await db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Xe không tồn tại.' });

    await db.cars.delete(id);
    res.json({ message: 'Đã gỡ bỏ xe khỏi hệ thống cho thuê thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gỡ xe.' });
  }
});

// DELETE Admin User (Xóa tài khoản thành viên - Admin Only)
app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Do not allow Admin to delete their own account
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const userToDelete = await db.users.findOne({ id });
    if (!userToDelete) {
      return res.status(404).json({ message: 'Tài khoản thành viên không tồn tại.' });
    }

    // Do not allow deleting other Admins unless the logged-in user is the super-admin
    if (userToDelete.role === 'admin' && req.user.id !== 'user-admin-1') {
      return res.status(403).json({ message: 'Chỉ có Admin tối cao mới có thể xóa tài khoản Quản trị khác.' });
    }

    await db.users.delete(id);
    res.json({ message: `Đã xóa tài khoản thành viên "${userToDelete.name}" thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa tài khoản thành viên.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
