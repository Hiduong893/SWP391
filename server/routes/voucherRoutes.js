import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const cskhOrAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cskh')) {
    next();
  } else {
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
  }
};

// GET active vouchers (public)
router.get('/api/vouchers/active', async (req, res) => {
  try {
    const vouchers = await db.vouchers.getActiveVouchers();
    res.json({ vouchers });
  } catch (error) {
    console.error('Lỗi lấy danh sách voucher:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy mã giảm giá.' });
  }
});

// GET all vouchers (Admin only)
router.get('/api/admin/vouchers', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const vouchers = await db.vouchers.getAll();
    res.json({ vouchers });
  } catch (error) {
    console.error('Lỗi lấy tất cả voucher:', error);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// POST create voucher (Admin only)
router.post('/api/admin/vouchers', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { code, discountPercent, maxDiscountAmount, maxUsage, targetUser, targetCarName, expirationDate } = req.body;
    
    if (!code || !discountPercent || !maxDiscountAmount) {
      return res.status(400).json({ message: 'Vui lòng điền mã coupon, % giảm và số tiền giảm tối đa.' });
    }

    const newVoucher = await db.vouchers.create({
      code,
      discountPercent: parseInt(discountPercent),
      maxDiscountAmount: parseFloat(maxDiscountAmount),
      maxUsage: maxUsage ? parseInt(maxUsage) : null,
      targetUser,
      targetCarName,
      expirationDate
    });

    res.status(201).json({ message: 'Tạo mã giảm giá thành công!', voucher: newVoucher });
  } catch (error) {
    console.error('Lỗi tạo voucher:', error);
    if (error.message && error.message.includes('UNIQUE KEY constraint')) {
      return res.status(400).json({ message: 'Mã coupon này đã tồn tại.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo mã giảm giá.' });
  }
});

// DELETE voucher (Admin only)
router.delete('/api/admin/vouchers/:id', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    await db.vouchers.delete(req.params.id);
    res.json({ message: 'Đã xóa mã giảm giá.' });
  } catch (error) {
    console.error('Lỗi xóa voucher:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xóa mã giảm giá.' });
  }
});

export default router;
