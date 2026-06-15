import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// 15. POST Booking (Đặt xe & Đặt cọc)
router.post('/api/bookings', auth, async (req, res) => {
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

// 16. GET Trips (Chuyến đi của tôi)
router.get('/api/bookings/my-trips', auth, async (req, res) => {
  try {
    const bookings = await db.bookings.findMany({ userId: req.user.id });

    const trips = await Promise.all(bookings.map(async (booking) => {
      const car = await db.cars.findOne({ id: booking.carId });
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

// 17. PUT Cancel Booking (Hủy chuyến xe)
router.put('/api/bookings/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findOne({ id, userId: req.user.id });

    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Chuyến đi này đã được hủy trước đó.' });
    if (booking.status === 'completed') return res.status(400).json({ message: 'Hành trình đã kết thúc, không thể hủy.' });

    await db.bookings.update(id, {
      status: 'cancelled',
      depositStatus: 'refunded'
    });

    const user = await db.users.findOne({ id: req.user.id });
    await db.users.update(user.id, { walletBalance: (user.walletBalance || 0) + 5000000 });

    res.json({ message: 'Hủy đơn đặt xe thành công! Tiền cọc 5.000.000 VND đã được hoàn trả lại vào Ví cá nhân của bạn.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hủy đơn đặt xe.' });
  }
});

// 18. Sign Electronic Handover Documents (Biên bản bàn giao Nhận/Trả xe)
router.put('/api/bookings/:id/handover', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, checklist, signature } = req.body;

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

    let nextStatus = booking.status;
    if (type === 'pickup') {
      nextStatus = 'active';
    } else if (type === 'return') {
      nextStatus = 'completed';
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

// 19. Submit Accident/Incident Report (Báo cáo sự cố khẩn cấp)
router.post('/api/bookings/:id/incident', auth, async (req, res) => {
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

// 20. Post Trip Review (Đánh giá dịch vụ)
router.post('/api/bookings/:id/reviews', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) return res.status(400).json({ message: 'Vui lòng chấm điểm sao đánh giá.' });

    const booking = await db.bookings.findOne({ id, userId: req.user.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });

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

export default router;
