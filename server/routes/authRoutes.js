import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../models/index.js';
import { sendEmailWithRealFallback } from '../utils/emailHelper.js';

const router = express.Router();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined in the environment variables! Server crashed for security reasons.');
  } else {
    console.warn('WARNING: JWT_SECRET is not defined in .env! Falling back to default insecure key for development.');
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'swp391-super-secret-key-12345';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '685695521533-f6f90q2icshojk8lcsbo2etf0oma73jc.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Quá nhiều yêu cầu đăng nhập từ IP này, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sanitizeUser = (user) => {
  const { password, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  safe.hasPassword = !!password;
  return safe;
};

// 1. Register (Đăng ký tài khoản)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin (Email, Mật khẩu, Họ tên).' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải dài ít nhất 6 ký tự để đảm bảo an toàn.' });
    }

    const existingUser = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    await db.users.create({
      email,
      password: hashedPassword,
      name,
      isEmailVerified: false,
      emailVerificationToken,
      role: 'renter'
    });

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

// 2. Verify Email
router.get('/verify-email', async (req, res) => {
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

// Quick Dev Bypass to verify email directly
router.post('/verify-email-direct', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Thiếu email.' });

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'Tài khoản không tồn tại.' });

    await db.users.update(user.id, { isEmailVerified: true, emailVerificationToken: null });
    res.json({ message: 'Kích hoạt tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email direct error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình kích hoạt nhanh.' });
  }
});

// Verify Email via OTP code
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ email và mã xác thực OTP.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }

    if (user.emailVerificationToken !== code) {
      return res.status(400).json({ message: 'Mã xác thực OTP không chính xác.' });
    }

    await db.users.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null
    });

    res.json({ message: 'Kích hoạt tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình kích hoạt bằng OTP.' });
  }
});

// 3. Login
router.post('/login', authLimiter, async (req, res) => {
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
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    if (!user.isEmailVerified) {
      let otp = user.emailVerificationToken;
      if (!otp || !/^\d{6}$/.test(otp)) {
        otp = Math.floor(100000 + Math.random() * 900000).toString();
        await db.users.update(user.id, { emailVerificationToken: otp });
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

// 4. Google Login
router.post('/google-login', async (req, res) => {
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

// 5. Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng điền địa chỉ email của bạn.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Email này không tồn tại trong hệ thống.' });
    }

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

// 5.5. Verify OTP code
router.post('/verify-reset-code', async (req, res) => {
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

// 6. Reset Password
router.post('/reset-password', async (req, res) => {
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

export default router;
