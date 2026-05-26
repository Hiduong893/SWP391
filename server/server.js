import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { db } from './database.js';
import { auth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'swp391-super-secret-key-12345';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '685695521533-f6f90q2icshojk8lcsbo2etf0oma73jc.apps.googleusercontent.com';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads up to 10MB

// Helper to sanitize user object
const sanitizeUser = (user) => {
  const { password, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  return safe;
};

// --- Simulated Email API (For Inbox Component) ---
app.get('/api/emails', (req, res) => {
  try {
    const emails = db.emails.findMany();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư ảo.' });
  }
});

app.post('/api/emails/mark-read', (req, res) => {
  try {
    db.emails.markAllAsRead();
    res.json({ message: 'Đã đánh dấu tất cả thư là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật hòm thư.' });
  }
});

app.post('/api/emails/clear', (req, res) => {
  try {
    db.emails.clearAll();
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

    const existingUser = db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được đăng ký sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomUUID();

    const newUser = db.users.create({
      email,
      password: hashedPassword,
      name,
      isEmailVerified: false,
      emailVerificationToken,
      role: 'renter' // Default role is Renter
    });

    // Create simulated email
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationLink = `${clientUrl}/verify-email?token=${emailVerificationToken}`;
    db.emails.create({
      to: email,
      subject: 'Xác thực tài khoản BonBonCar ✔️',
      body: `
        <h3>Chào mừng ${name} đến với BonBonCar!</h3>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhấn vào nút bên dưới để xác thực địa chỉ email của bạn:</p>
        <div style="margin: 20px 0;">
          <a href="${verificationLink}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xác Thực Tài Khoản</a>
        </div>
        <p>Nếu nút trên không hoạt động, vui lòng sao chép link sau dán vào trình duyệt:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <br><br>
        <p>Trân trọng,<br>Ban Quản Trị BonBonCar</p>
      `
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra "Hộp thư mô phỏng" bên phải để xác thực địa chỉ email.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình đăng ký.' });
  }
});

// 2. Verify Email (Xác thực Email)
app.get('/api/auth/verify-email', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token xác thực không hợp lệ.' });
    }

    const user = db.users.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    db.users.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null
    });

    res.json({ message: 'Xác thực tài khoản thành công! Bây giờ bạn đã có thể đăng nhập.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Có lỗi xảy ra trong quá trình xác thực.' });
  }
});

// 3. Login (Đăng nhập - UC02)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập Email và Mật khẩu.' });
    }

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Tài khoản này được đăng ký thông qua Google. Vui lòng chọn Đăng nhập với Google.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Email hoặc Mật khẩu không đúng.' });
    }

    if (!user.isEmailVerified) {
      let token = user.emailVerificationToken;
      if (!token) {
        token = crypto.randomUUID();
        db.users.update(user.id, { emailVerificationToken: token });
      }
      
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const verificationLink = `${clientUrl}/verify-email?token=${token}`;
      
      db.emails.create({
        to: user.email,
        subject: 'Gửi lại: Xác thực tài khoản BonBonCar 🔄',
        body: `
          <h3>Xác thực lại địa chỉ email của bạn</h3>
          <p>Tài khoản của bạn chưa được xác thực. Vui lòng bấm vào đường link bên dưới để kích hoạt tài khoản:</p>
          <div style="margin: 20px 0;">
            <a href="${verificationLink}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích Hoạt Tài Khoản</a>
          </div>
          <a href="${verificationLink}">${verificationLink}</a>
        `
      });

      return res.status(403).json({
        message: 'Tài khoản của bạn chưa được xác thực email. Một link xác thực mới đã được gửi vào "Hộp thư mô phỏng", vui lòng kiểm tra.',
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
    if (credential.startsWith('mock_google_')) {
      const mockEmail = credential.replace('mock_google_', '').toLowerCase().trim();
      payload = {
        sub: `mock_g_${mockEmail}`,
        email: mockEmail,
        name: mockEmail.split('@')[0].toUpperCase(),
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        email_verified: true
      };
    } else {
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
    }

    const { sub: googleId, email, name, picture } = payload;
    let user = db.users.findOne({ googleId });
    
    if (!user) {
      user = db.users.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        user = db.users.update(user.id, { googleId, isEmailVerified: true });
      } else {
        user = db.users.create({
          email,
          name,
          avatar: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          googleId,
          isEmailVerified: true,
          role: 'renter'
        });
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
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng điền địa chỉ email của bạn.' });
    }

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Email này không tồn tại trong hệ thống.' });
    }

    const resetPasswordToken = crypto.randomUUID();
    const resetPasswordExpires = Date.now() + 3600000;

    db.users.update(user.id, { resetPasswordToken, resetPasswordExpires });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${resetPasswordToken}`;
    db.emails.create({
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu BonBonCar 🔑',
      body: `
        <h3>Chào ${user.name},</h3>
        <p>Chúng tôi đã nhận được yêu cầu đổi mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu mới (Hiệu lực trong 1 giờ):</p>
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt Lại Mật Khẩu</a>
        </div>
        <a href="${resetLink}">${resetLink}</a>
      `
    });

    res.json({ message: 'Đã gửi liên kết khôi phục mật khẩu vào "Hộp thư mô phỏng".' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu quên mật khẩu.' });
  }
});

// 6. Reset Password (Đặt lại mật khẩu)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin khôi phục mật khẩu.' });
    }

    const user = db.users.findOne({ resetPasswordToken: token });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Mã khôi phục không hợp lệ hoặc đã hết hạn.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.users.update(user.id, {
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
app.put('/api/user/profile/edit', auth, (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name) return res.status(400).json({ message: 'Họ tên không được để trống.' });

    const updatedUser = db.users.update(req.user.id, { name, bio });
    res.json({ message: 'Cập nhật thông tin thành công!', user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật profile.' });
  }
});

// 9. Update Avatar (Đổi ảnh đại diện)
app.put('/api/user/profile/avatar', auth, (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'Thiếu ảnh đại diện.' });

    const updatedUser = db.users.update(req.user.id, { avatar });
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

    const user = db.users.findOne({ id: req.user.id });
    if (user.password) {
      if (!currentPassword) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại.' });
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.users.update(user.id, { password: hashedPassword });
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đổi mật khẩu.' });
  }
});

// 11. Upload KYC Documents (Xác thực KYC CCCD, Bằng lái, Giấy tờ - UC04)
app.put('/api/user/kyc', auth, (req, res) => {
  try {
    const { cccdImage, licenseImage, carPapersImage } = req.body;
    const user = db.users.findOne({ id: req.user.id });
    
    const newKyc = {
      cccd: cccdImage || user.kycDocuments?.cccd || null,
      license: licenseImage || user.kycDocuments?.license || null,
      carPapers: carPapersImage || user.kycDocuments?.carPapers || null
    };

    const licenseStatus = licenseImage ? 'pending' : user.licenseStatus;

    const updatedUser = db.users.update(req.user.id, {
      kycDocuments: newKyc,
      licenseStatus,
      licenseImage: licenseImage || user.licenseImage
    });

    res.json({
      message: 'Tải giấy tờ KYC thành công! Nhân viên hỗ trợ sẽ kiểm duyệt tài liệu của bạn.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật hồ sơ KYC.' });
  }
});

// Compatibility Driver License upload route (UC04)
app.put('/api/user/license', auth, (req, res) => {
  try {
    const { licenseImage } = req.body;
    if (!licenseImage) return res.status(400).json({ message: 'Thiếu ảnh bằng lái.' });

    const user = db.users.findOne({ id: req.user.id });
    const newKyc = {
      ...(user.kycDocuments || { cccd: null, license: null, carPapers: null }),
      license: licenseImage
    };

    const updatedUser = db.users.update(req.user.id, {
      licenseStatus: 'pending',
      licenseImage,
      kycDocuments: newKyc
    });

    res.json({
      message: 'Tải ảnh bằng lái xe thành công! Bằng lái đang chờ duyệt.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật bằng lái.' });
  }
});

// 12. Register Owner mode / Link bank account (Chủ xe liên kết tài khoản ngân hàng - UC24)
app.put('/api/user/bank-account', auth, (req, res) => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.' });
    }

    const updatedUser = db.users.update(req.user.id, {
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
app.post('/api/user/register-owner', auth, (req, res) => {
  try {
    const updatedUser = db.users.update(req.user.id, { role: 'owner' });
    res.json({
      message: 'Nâng cấp tài khoản thành Chủ xe (Car Owner) thành công! Bây giờ bạn có thể ký gửi xe lên hệ thống.',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đăng ký làm chủ xe.' });
  }
});

// --- WALLET & TRANSACTIONS (UC19, UC28) ---
app.get('/api/user/wallet', auth, (req, res) => {
  try {
    const user = db.users.findOne({ id: req.user.id });
    res.json({
      walletBalance: user.walletBalance || 0,
      bankAccount: user.bankAccount
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thông tin ví.' });
  }
});

app.post('/api/user/wallet/transaction', auth, (req, res) => {
  try {
    const { type, amount } = req.body; // type: 'deposit' (nap) | 'withdraw' (rut)
    const user = db.users.findOne({ id: req.user.id });

    let currentBalance = user.walletBalance || 0;
    const value = parseInt(amount);

    if (type === 'withdraw') {
      if (currentBalance < value) return res.status(400).json({ message: 'Số dư ví không đủ để rút tiền.' });
      if (!user.bankAccount) return res.status(400).json({ message: 'Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền.' });
      currentBalance -= value;
    } else {
      currentBalance += value;
    }

    const updatedUser = db.users.update(req.user.id, { walletBalance: currentBalance });
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
app.get('/api/system/config', (req, res) => {
  res.json(db.system_config.get());
});

// 13. GET Cars (Lấy danh sách xe với bộ lọc - UC08, UC09, UC10)
app.get('/api/cars', (req, res) => {
  try {
    const { location, seats, transmission, fuel, search } = req.query;
    
    const filters = {};
    if (location) filters.location = location;
    if (seats) filters.seats = seats;
    if (transmission) filters.transmission = transmission;
    if (fuel) filters.fuel = fuel;
    
    // Only display verified cars ('available' or 'rented'), do not show 'pending_moderation' or 'rejected'
    let cars = db.cars.findMany(filters);
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
app.post('/api/cars', auth, (req, res) => {
  try {
    const { brand, model, seats, transmission, fuel, pricePerDay, image, location, plateNumber, carPapers } = req.body;

    if (!brand || !model || !seats || !pricePerDay || !location || !plateNumber) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin ký gửi xe.' });
    }

    const newCar = db.cars.create({
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
      db.users.update(req.user.id, { role: 'owner' });
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
app.get('/api/owner/cars', auth, (req, res) => {
  try {
    const cars = db.cars.findMany({ ownerId: req.user.id });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách xe của bạn.' });
  }
});

// View Owner's Rental Requests and Earnings (UC22, UC23)
app.get('/api/owner/stats', auth, (req, res) => {
  try {
    const myCars = db.cars.findMany({ ownerId: req.user.id });
    const carIds = myCars.map(c => c.id);

    const allBookings = db.bookings.findMany();
    // Bookings related to this owner's cars
    const myBookings = allBookings.filter(b => carIds.includes(b.carId));

    const detailedBookings = myBookings.map(booking => {
      const user = db.users.findOne({ id: booking.userId }) || { name: 'Khách hàng ẩn' };
      const car = myCars.find(c => c.id === booking.carId);
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    });

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
app.put('/api/owner/bookings/:id/approve', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body; // true or false

    const booking = db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Yêu cầu đặt xe không tồn tại.' });

    const car = db.cars.findOne({ id: booking.carId });
    if (!car || car.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý đơn đặt xe này.' });
    }

    const newStatus = approved ? 'confirmed' : 'cancelled';
    db.bookings.update(id, { status: newStatus });

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
app.post('/api/bookings', auth, (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, totalPrice, paymentMethod } = req.body;

    if (!carId || !pickupDate || !returnDate || !pickupLocation || !totalPrice) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin đặt xe.' });
    }

    const car = db.cars.findOne({ id: carId });
    if (!car) return res.status(400).json({ message: 'Xe không tồn tại.' });
    if (car.status !== 'available') return res.status(400).json({ message: 'Xe này hiện tại đã có khách đặt.' });

    const user = db.users.findOne({ id: req.user.id });
    if (user.licenseStatus !== 'verified') {
      return res.status(400).json({ message: 'Tài khoản chưa xác thực Bằng lái xe. Vui lòng xác thực trước khi đặt xe.' });
    }

    const booking = db.bookings.create({
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

// 16. GET Trips (Chuyến đi của tôi - UC15)
app.get('/api/bookings/my-trips', auth, (req, res) => {
  try {
    const bookings = db.bookings.findMany({ userId: req.user.id });
    
    const trips = bookings.map(booking => {
      const car = db.cars.findOne({ id: booking.carId });
      // Find review for this booking if any
      const reviews = db.reviews.findMany({ bookingId: booking.id });
      return {
        ...booking,
        car: car || { brand: 'Không xác định', model: 'Xe mẫu', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
        hasReviewed: reviews.length > 0,
        review: reviews[0] || null
      };
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải chuyến đi.' });
  }
});

// 17. PUT Cancel Booking (Hủy chuyến xe - UC20)
app.put('/api/bookings/:id/cancel', auth, (req, res) => {
  try {
    const { id } = req.params;
    const booking = db.bookings.findOne({ id, userId: req.user.id });

    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Chuyến đi này đã được hủy trước đó.' });
    if (booking.status === 'completed') return res.status(400).json({ message: 'Hành trình đã kết thúc, không thể hủy.' });

    // Cancel booking and restore car
    db.bookings.update(id, { 
      status: 'cancelled',
      depositStatus: 'refunded' // Automatically refunded to simulation
    });

    // Refund cọc to wallet
    const user = db.users.findOne({ id: req.user.id });
    db.users.update(user.id, { walletBalance: (user.walletBalance || 0) + 5000000 });

    res.json({ message: 'Hủy đơn đặt xe thành công! Tiền cọc 5.000.000 VND đã được hoàn trả lại vào Ví cá nhân của bạn.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hủy đơn đặt xe.' });
  }
});

// 18. Sign Electronic Handover Documents (Biên bản bàn giao Nhận/Trả xe - UC18)
app.put('/api/bookings/:id/handover', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { type, checklist, signature } = req.body; // type: 'pickup' | 'return'
    
    if (!type || !checklist || !signature) {
      return res.status(400).json({ message: 'Vui lòng hoàn thành checklist và ký tên bàn giao xe.' });
    }

    const booking = db.bookings.findOne({ id });
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

    db.bookings.update(id, {
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
app.post('/api/bookings/:id/incident', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { description, image } = req.body;

    if (!description) return res.status(400).json({ message: 'Vui lòng cung cấp mô tả chi tiết sự cố phát sinh.' });

    const booking = db.bookings.findOne({ id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi tương ứng.' });

    db.bookings.update(id, {
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
app.post('/api/bookings/:id/reviews', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) return res.status(400).json({ message: 'Vui lòng chấm điểm sao đánh giá.' });

    const booking = db.bookings.findOne({ id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    // Create review in DB
    const review = db.reviews.create({
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
app.get('/api/cars/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const reviews = db.reviews.findMany({ carId: id, status: 'visible' });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đánh giá xe.' });
  }
});


// --- CUSTOMER SUPPORT WIDGET (SUPPORT TICKETS - UC07, UC32) ---
app.post('/api/support/tickets', auth, (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Vui lòng điền tiêu đề và nội dung yêu cầu hỗ trợ.' });
    }

    const ticket = db.support_tickets.create({
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

app.get('/api/support/tickets', auth, (req, res) => {
  try {
    const tickets = db.support_tickets.findMany({ userId: req.user.id });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách yêu cầu hỗ trợ.' });
  }
});

app.put('/api/support/tickets/:id/resolve', auth, (req, res) => {
  try {
    const { id } = req.params;
    const ticket = db.support_tickets.findOne({ id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: 'Yêu cầu hỗ trợ không tồn tại.' });

    db.support_tickets.update(id, { status: 'resolved' });
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
app.put('/api/admin/users/:id/kyc', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tìm thấy.' });

    const updatedUser = db.users.update(id, {
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
app.get('/api/admin/incidents', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const bookings = db.bookings.findMany();
    const reportedIncidents = bookings
      .filter(b => b.issueReport !== null)
      .map(booking => {
        const user = db.users.findOne({ id: booking.userId }) || { name: 'Thành viên ẩn' };
        const car = db.cars.findOne({ id: booking.carId }) || { brand: 'Không rõ', model: 'Xe' };
        return {
          bookingId: booking.id,
          userName: user.name,
          userEmail: user.email,
          carName: `${car.brand} ${car.model}`,
          carImage: car.image,
          incident: booking.issueReport,
          status: booking.status
        };
      });
    res.json(reportedIncidents);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách sự cố.' });
  }
});

app.put('/api/admin/incidents/:bookingId/resolve', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

    db.bookings.update(bookingId, {
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
app.get('/api/admin/support/tickets', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const tickets = db.support_tickets.findMany();
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải hòm thư hỗ trợ.' });
  }
});

app.post('/api/admin/support/tickets/:id/reply', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });

    const ticket = db.support_tickets.findOne({ id });
    if (!ticket) return res.status(404).json({ message: 'Ticket hỗ trợ không tồn tại.' });

    const replies = [...ticket.replies, {
      sender: 'cskh',
      text: replyText,
      sentAt: new Date().toISOString()
    }];

    db.support_tickets.update(id, { 
      replies,
      status: 'replied'
    });

    res.json({ message: 'Đã gửi câu trả lời phản hồi cho khách hàng!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi phản hồi.' });
  }
});

// 4. Review moderation (CSKH/Admin - UC33)
app.get('/api/admin/reviews', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const reviews = db.reviews.findMany();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách đánh giá.' });
  }
});

app.put('/api/admin/reviews/:id/status', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'visible' or 'hidden'

    if (status !== 'visible' && status !== 'hidden') {
      return res.status(400).json({ message: 'Trạng thái đánh giá không hợp lệ.' });
    }

    db.reviews.update(id, { status });
    res.json({ message: `Đã cập nhật trạng thái hiển thị đánh giá thành công!` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi ẩn đánh giá.' });
  }
});

// 5. Dispute Case Management (CSKH/Admin - UC34)
app.get('/api/admin/disputes', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const disputes = db.disputes.findMany();
    const detailed = disputes.map(d => {
      const renter = db.users.findOne({ id: d.renterId }) || { name: 'Người thuê' };
      const owner = db.users.findOne({ id: d.ownerId }) || { name: 'Chủ xe' };
      const booking = db.bookings.findOne({ id: d.bookingId }) || { totalPrice: 0 };
      return {
        ...d,
        renterName: renter.name,
        ownerName: owner.name,
        bookingPrice: booking.totalPrice
      };
    });
    res.json(detailed);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách tranh chấp khiếu nại.' });
  }
});

app.post('/api/support/disputes', auth, (req, res) => {
  try {
    const { bookingId, description } = req.body;
    if (!bookingId || !description) return res.status(400).json({ message: 'Thiếu thông tin khiếu nại.' });

    const booking = db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(400).json({ message: 'Không tìm thấy xe.' });

    const dispute = db.disputes.create({
      bookingId,
      renterId: req.user.id,
      ownerId: car.ownerId || 'admin',
      description
    });

    db.bookings.update(bookingId, { status: 'disputed' });

    res.json({ message: 'Nộp đơn khiếu nại lên ban CSKH thành công. Trạng thái chuyến đi chuyển sang: Tranh Chấp.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi nộp đơn khiếu nại.' });
  }
});

app.put('/api/admin/disputes/:id/resolve', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionDetails } = req.body;

    if (!resolutionDetails) return res.status(400).json({ message: 'Vui lòng điền nội dung phán quyết giải quyết.' });

    const dispute = db.disputes.update(id, {
      status: 'resolved',
      resolutionDetails
    });

    // Update booking status back to completed/resolved
    db.bookings.update(dispute.bookingId, { status: 'completed' });

    res.json({ message: 'Đã giải quyết tranh chấp khiếu nại thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi giải quyết khiếu nại.' });
  }
});

// 6. Deposit Refund Trigger (CSKH/Admin - UC28)
app.put('/api/admin/bookings/:id/refund-deposit', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'refunded' or 'withheld'

    const booking = db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    db.bookings.update(id, { depositStatus: status });

    if (status === 'refunded') {
      // Refund the 5,000,000 VND cọc directly to user wallet balance!
      const user = db.users.findOne({ id: booking.userId });
      db.users.update(user.id, { walletBalance: (user.walletBalance || 0) + 5000000 });
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
app.put('/api/admin/users/:id/role', auth, adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'renter', 'owner', 'cskh', 'admin'

    if (role !== 'renter' && role !== 'owner' && role !== 'cskh' && role !== 'admin') {
      return res.status(400).json({ message: 'Vai trò phân quyền không hợp lệ.' });
    }

    const updatedUser = db.users.update(id, { role });
    res.json({
      message: `Phân quyền thành viên thành công thành vai trò: ${role.toUpperCase()}`,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi phân quyền.' });
  }
});

// 2. Car Moderation / Verification (Kiểm duyệt xe đăng - UC27)
app.get('/api/admin/cars/pending', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const allCars = db.cars.findMany();
    const pendingCars = allCars.filter(c => c.status === 'pending_moderation');
    res.json(pendingCars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách xe chờ duyệt.' });
  }
});

app.put('/api/admin/cars/:id/moderation', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'available' or 'rejected'

    if (status !== 'available' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái kiểm duyệt không hợp lệ.' });
    }

    const car = db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Phương tiện không tồn tại.' });

    db.cars.update(id, { 
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
app.put('/api/admin/system/config', auth, adminAuth, (req, res) => {
  try {
    const { serviceFeePercent, insuranceMultiplier, systemNotice } = req.body;
    
    const updated = db.system_config.update({
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
app.get('/api/admin/stats', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const users = db.users.findMany();
    const cars = db.cars.findMany();
    const bookings = db.bookings.findMany();

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
app.get('/api/admin/users', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const users = db.users.findMany();
    const safeUsers = users.map(user => sanitizeUser(user));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách thành viên.' });
  }
});

// PUT Approve/Reject Driver License (Duyệt bằng lái xe - Protected)
app.put('/api/admin/users/:id/license', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'verified' && status !== 'rejected') {
      return res.status(400).json({ message: 'Trạng thái phê duyệt không hợp lệ.' });
    }

    const user = db.users.findOne({ id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tồn tại.' });

    const updatedUser = db.users.update(id, {
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
app.get('/api/admin/bookings', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const bookings = db.bookings.findMany();
    const detailedBookings = bookings.map(booking => {
      const user = db.users.findOne({ id: booking.userId }) || { name: 'Thành viên đã ẩn' };
      const car = db.cars.findOne({ id: booking.carId }) || { brand: 'Không xác định', model: 'Xe mẫu' };
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    });

    res.json(detailedBookings);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách giao dịch.' });
  }
});

// PUT Admin Update Booking Status (Cập nhật trạng thái đặt xe - Protected)
app.put('/api/admin/bookings/:id/status', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    db.bookings.update(id, { status });
    res.json({ message: 'Đã cập nhật trạng thái đơn đặt xe thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái đặt xe.' });
  }
});

// DELETE Admin Car (Gỡ bỏ xe khỏi hệ thống - Protected)
app.delete('/api/admin/cars/:id', auth, cskhOrAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const car = db.cars.findOne({ id });
    if (!car) return res.status(404).json({ message: 'Xe không tồn tại.' });

    db.cars.delete(id);
    res.json({ message: 'Đã gỡ bỏ xe khỏi hệ thống cho thuê thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gỡ xe.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
