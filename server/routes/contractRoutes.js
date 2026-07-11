import express from 'express';
import { contractModel, ALLOWED_CUSTOM_TERM_TOPICS } from '../models/contractModel.js';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Admin hoặc CSKH
const cskhOrAdminAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'cskh')) {
    next();
  } else {
    res.status(403).json({ message: 'Quyền CSKH hoặc Admin được yêu cầu.' });
  }
};

// 1. GET /api/contracts/booking/:bookingId
router.get('/contracts/booking/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const contract = await contractModel.findByBookingId(bookingId);
    if (!contract) {
      return res.status(404).json({ message: 'Hợp đồng chưa được tạo cho đơn đặt xe này.' });
    }
    
    // Fetch related details
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const renter = await db.users.findOne({ id: booking.userId });
    const car = await db.cars.findOne({ id: booking.carId });
    const owner = car && car.ownerId ? await db.users.findOne({ id: car.ownerId }) : null;

    res.json({
      contract,
      booking,
      renter: renter ? { id: renter.id, name: renter.name, email: renter.email, phone: renter.phone } : null,
      car: car ? { id: car.id, brand: car.brand, model: car.model, image: car.image, licensePlate: car.licensePlate } : null,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone } : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. POST /api/contracts/booking/:bookingId/renter-sign
router.post('/contracts/booking/:bookingId/renter-sign', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const contract = await contractModel.renterSign(bookingId, req.user.id, ip);
    res.json({ message: 'Người thuê ký hợp đồng thành công.', contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST /api/contracts/booking/:bookingId/owner-sign
router.post('/contracts/booking/:bookingId/owner-sign', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const contract = await contractModel.ownerSign(bookingId, req.user.id, ip);
    res.json({ message: 'Chủ xe ký hợp đồng thành công.', contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. POST /api/contracts/booking/:bookingId/confirm-prepayment
router.post('/contracts/booking/:bookingId/confirm-prepayment', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { method } = req.body;
    const contract = await contractModel.confirmPrepayment(bookingId, method);
    res.json({ message: 'Xác nhận thanh toán trước thành công.', contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. GET /api/admin/contracts
router.get('/admin/contracts', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const contracts = await contractModel.findMany();
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT /api/admin/contracts/:contractId/refund-deposit
router.put('/admin/contracts/:contractId/refund-deposit', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const contract = await contractModel.findById(contractId);
    if (!contract) return res.status(404).json({ message: 'Hợp đồng không tồn tại.' });
    
    const updated = await contractModel.confirmDepositRefund(contract.bookingId);
    res.json({ message: 'Hoàn cọc bảo đảm thành công.', contract: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. PUT /api/admin/contracts/:contractId/surcharge
router.put('/admin/contracts/:contractId/surcharge', auth, cskhOrAdminAuth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { amount, reason } = req.body;
    const contract = await contractModel.findById(contractId);
    if (!contract) return res.status(404).json({ message: 'Hợp đồng không tồn tại.' });

    const updated = await contractModel.addSurcharge(contract.bookingId, amount, reason, req.user.id);
    res.json({ message: 'Thêm phụ phí thành công.', contract: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. GET /api/contracts/custom-term-topics
// Lấy danh sách chủ đề điều khoản bổ sung được phép (cho chủ xe dùng khi thêm điều khoản)
router.get('/contracts/custom-term-topics', auth, (req, res) => {
  res.json(ALLOWED_CUSTOM_TERM_TOPICS);
});

// 9. PUT /api/contracts/booking/:bookingId/owner-terms
// Chủ xe cập nhật/thêm điều khoản bổ sung vào hợp đồng (chỉ khi contract còn Draft)
router.put('/contracts/booking/:bookingId/owner-terms', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { customTerms } = req.body; // Array of { topicId, content }

    // Verify người gọi là chủ xe của booking này
    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(404).json({ message: 'Thông tin xe không tồn tại.' });

    const isOwner = String(car.ownerId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'cskh';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Chỉ chủ xe hoặc Admin/CSKH mới được chỉnh sửa điều khoản bổ sung.' });
    }

    const updatedContract = await contractModel.updateOwnerTerms(bookingId, req.user.id, customTerms || []);
    res.json({
      message: customTerms && customTerms.length > 0
        ? `Đã lưu ${customTerms.length} điều khoản bổ sung vào hợp đồng thành công.`
        : 'Đã xóa toàn bộ điều khoản bổ sung.',
      contract: updatedContract,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;