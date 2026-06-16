import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// 1. Create support ticket
router.post('/api/support/tickets', auth, async (req, res) => {
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

// 2. Get user's support tickets
router.get('/api/support/tickets', auth, async (req, res) => {
  try {
    const tickets = await db.support_tickets.findMany({ userId: req.user.id });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách yêu cầu hỗ trợ.' });
  }
});

// 3. Resolve support ticket
router.put('/api/support/tickets/:id/resolve', auth, async (req, res) => {
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

// 4. Create booking dispute
router.post('/api/support/disputes', auth, async (req, res) => {
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

export default router;
