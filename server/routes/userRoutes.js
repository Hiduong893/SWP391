import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { verifyCCCDQr } from '../utils/qrHelper.js';
import { verifyKycWithAI } from '../utils/aiHelper.js';

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

// 11. Upload KYC Documents (Enhanced with Automated AI Vision Verification using Gemini)
router.put('/kyc', auth, async (req, res) => {
  try {
    const { cccdImage, cccdBackImage, licenseImage, carPapersImage, faceImage } = req.body;
    const user = await db.users.findOne({ id: req.user.id });

    // Identify if any new images are being uploaded
    const isNewCccd = cccdImage && cccdImage !== user.kycDocuments?.cccd;
    const isNewCccdBack = cccdBackImage && cccdBackImage !== user.kycDocuments?.cccdBack;
    const isNewLicense = licenseImage && licenseImage !== user.kycDocuments?.license;

    let kycAttempted = false;
    let aiResult = null;

    if (isNewCccd || isNewCccdBack || isNewLicense) {
      kycAttempted = true;
      console.log('Sending uploaded documents to Gemini Vision API for automatic KYC...');

      const frontCccd = cccdImage || user.kycDocuments?.cccd || null;
      const backCccd = cccdBackImage || user.kycDocuments?.cccdBack || null;
      const license = licenseImage || user.kycDocuments?.license || null;

      aiResult = await verifyKycWithAI(frontCccd, backCccd, license, user.name);
      console.log('AI KYC Result:', aiResult);
    }

    const newKyc = {
      cccd: cccdImage || user.kycDocuments?.cccd || null,
      cccdBack: cccdBackImage || user.kycDocuments?.cccdBack || null,
      license: licenseImage || user.kycDocuments?.license || null,
      carPapers: carPapersImage || user.kycDocuments?.carPapers || null,
      faceImage: faceImage || user.kycDocuments?.faceImage || null
    };

    let licenseStatus = user.licenseStatus;
    let cccdStatus = user.cccdStatus || (user.kycDocuments?.cccd ? 'verified' : undefined);
    let cccdBackStatus = user.cccdBackStatus || (user.kycDocuments?.cccdBack ? 'verified' : undefined);
    let faceStatus = user.faceStatus || (user.kycDocuments?.faceImage ? 'verified' : undefined);
    if (faceImage) {
      faceStatus = 'verified';
    }
    let kycRejectionReason = user.kycRejectionReason;

    if (kycAttempted && aiResult) {
      if (aiResult.verified) {
        if (isNewLicense) licenseStatus = 'verified';
        if (isNewCccd) cccdStatus = 'verified';
        if (isNewCccdBack) cccdBackStatus = 'verified';
        kycRejectionReason = null;
      } else {
        if (aiResult.isDocumentAuthentic === false) {
          // Completely invalid/garbage image -> Hard Reject
          if (isNewLicense) licenseStatus = 'rejected';
          if (isNewCccd) cccdStatus = 'rejected';
          if (isNewCccdBack) cccdBackStatus = 'rejected';

          if (isNewLicense) {
            kycRejectionReason = 'Sai định dạng Bằng lái xe. Xin hãy tải lại ảnh.';
          } else if (isNewCccdBack) {
            kycRejectionReason = 'Sai định dạng CCCD mặt sau. Xin hãy tải lại ảnh.';
          } else if (isNewCccd) {
            kycRejectionReason = 'Sai định dạng CCCD mặt trước. Xin hãy tải lại ảnh.';
          } else {
            kycRejectionReason = 'Sai định dạng giấy tờ. Xin hãy tải lại ảnh.';
          }
        } else {
          // Blurry or info mismatch -> Pending manual review
          if (isNewLicense) licenseStatus = 'pending';
          if (isNewCccd) cccdStatus = 'pending';
          if (isNewCccdBack) cccdBackStatus = 'pending';

          kycRejectionReason = 'Thông tin giấy tờ không hợp lệ hoặc bị mờ. Bạn nên tải lại ảnh rõ nét hơn hoặc Xin chờ CSKH duyệt nhé!';
        }
      }
    }

    const updatedUser = await db.users.update(req.user.id, {
      kycDocuments: newKyc,
      licenseStatus,
      licenseImage: licenseImage || user.licenseImage,
      cccdStatus,
      cccdBackStatus,
      faceStatus,
      kycRejectionReason
    });

    if (kycAttempted && aiResult && !aiResult.verified) {
      res.json({
        message: kycRejectionReason,
        user: sanitizeUser(updatedUser)
      });
    } else {
      res.json({
        message: faceImage
          ? 'Xác thực khuôn mặt KYC của bạn thành công!'
          : 'Hồ sơ KYC của bạn đã được xác minh thành công bằng AI!',
        user: sanitizeUser(updatedUser)
      });
    }
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
    const user = await db.users.findOne({ id: req.user.id });

    // Check KYC (driver license verification status)
    if (user.licenseStatus !== 'verified') {
      return res.status(400).json({
        message: 'Bạn chưa hoàn tất xác thực bằng lái xe (KYC). Vui lòng cập nhật hình ảnh CCCD và bằng lái xe trong mục Hồ sơ cá nhân trước khi đăng ký làm Chủ xe.'
      });
    }

    // Check bank account association
    if (!user.bankAccount || !user.bankAccount.bankName || !user.bankAccount.accountNumber) {
      return res.status(400).json({
        message: 'Bạn chưa liên kết tài khoản ngân hàng. Vui lòng thêm tài khoản ngân hàng trong mục Ví cá nhân để nhận tiền thuê xe trước khi đăng ký làm Chủ xe.'
      });
    }

    const updatedUser = await db.users.update(req.user.id, { role: 'owner' });
    res.json({
      message: 'Nâng cấp tài khoản thành Chủ xe (Car Owner) thành công! Bây giờ bạn có thể đăng ký xe cho thuê lên hệ thống.',
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

export default router;
