import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { verifyCCCDQr } from '../utils/qrHelper.js';

const router = express.Router();

const sanitizeUser = (user) => {
  const { password, emailVerificationToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  safe.hasPassword = !!password;
  return safe;
};

// 7. Get Profile (Xem profile)
router.get('/profile', auth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// 8. Edit Profile (Chỉnh sửa thông tin)
router.put('/profile/edit', auth, async (req, res) => {
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
router.put('/profile/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'Thiếu ảnh đại diện.' });

    const updatedUser = await db.users.update(req.user.id, { avatar });
    res.json({ message: 'Cập nhật ảnh đại diện thành công!', user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật avatar.' });
  }
});

// 10. Change Password (Đổi mật khẩu)
router.put('/change-password', auth, async (req, res) => {
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

// 11. Upload KYC Documents
router.put('/kyc', auth, async (req, res) => {
  try {
    const { cccdImage, cccdBackImage, licenseImage, carPapersImage } = req.body;
    const user = await db.users.findOne({ id: req.user.id });

    let autoVerifySuccess = false;
    let qrErrorMsg = null;

    if (cccdImage && cccdImage !== user.kycDocuments?.cccd) {
      console.log('Validating uploaded CCCD QR code...');
      const qrResult = await verifyCCCDQr(cccdImage, user.name);
      if (qrResult.verified) {
        autoVerifySuccess = true;
      } else {
        qrErrorMsg = qrResult.reason;
      }
    }

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

// Compatibility Driver License upload route
router.put('/license', auth, async (req, res) => {
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

// 12. Register Owner mode / Link bank account
router.put('/bank-account', auth, async (req, res) => {
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

// Register as a Car Owner
router.post('/register-owner', auth, async (req, res) => {
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

// Wallet Info
router.get('/wallet', auth, async (req, res) => {
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

// Wallet Transaction
router.post('/wallet/transaction', auth, async (req, res) => {
  try {
    const { type, amount } = req.body;
    const value = parseInt(amount);

    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ message: 'Số tiền giao dịch không hợp lệ.' });
    }

    const user = await db.users.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: 'Thành viên không tồn tại.' });

    if (type === 'withdraw') {
      const currentBalance = user.walletBalance || 0;
      if (currentBalance < value) {
        return res.status(400).json({ message: 'Số dư ví không đủ để rút tiền.' });
      }
      if (!user.bankAccount) {
        return res.status(400).json({ message: 'Vui lòng liên kết tài khoản ngân hàng trước khi rút tiền.' });
      }
    }

    const txnType = type === 'withdraw' ? 'Withdrawal' : 'TopUp';
    const description = type === 'withdraw'
      ? `Rút tiền về tài khoản ngân hàng ${user.bankAccount?.bankName} - ${user.bankAccount?.accountNumber}`
      : 'Nạp tiền vào ví điện tử';

    const updatedUser = await db.users.transactWallet(req.user.id, value, txnType, null, description);

    res.json({
      message: type === 'withdraw' ? 'Yêu cầu rút tiền về ngân hàng thành công!' : 'Nạp tiền vào ví điện tử thành công!',
      walletBalance: updatedUser.walletBalance
    });
  } catch (error) {
    console.error('Wallet transaction error:', error);
    res.status(500).json({ message: 'Lỗi thực hiện giao dịch ví.' });
  }
});

export default router;
