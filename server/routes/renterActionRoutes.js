import express from 'express';
import { renterActionService } from '../services/renterActionService.js';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

const defineGet = (path1, path2, handler) => {
  router.get(path1, auth, handler);
  router.get(path2, auth, handler);
};

const definePut = (path1, path2, handler) => {
  router.put(path1, auth, handler);
  router.put(path2, auth, handler);
};

const definePost = (path1, path2, handler) => {
  router.post(path1, auth, handler);
  router.post(path2, auth, handler);
};

// 1. Refund Preview
defineGet('/api/bookings/:id/cancel-preview', '/api/renter/bookings/:id/refund-preview', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await renterActionService.getRefundPreview(id, req.user.id);
    if (!result.canCancel) {
      return res.status(400).json({ message: result.message });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy thông tin xem trước hoàn tiền cọc.' });
  }
});

// 2. Cancel Booking
definePut('/api/bookings/:id/cancel', '/api/renter/bookings/:id/cancel-with-refund', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await renterActionService.cancelBooking(id, req.user.id);
    const refundMsg = result.refundAmount > 0
      ? `Phí giữ chỗ hoàn trả: ${result.refundAmount.toLocaleString('vi-VN')} VND (${result.refundPercent}%) đã được chuyển vào Ví cá nhân của bạn.`
      : 'Phí giữ chỗ không được hoàn trả do hủy trễ (theo chính sách hủy của ViVuCar).';

    // Send notifications
    const booking = await db.bookings.findOne({ id });
    if (booking) {
      const car = await db.cars.findOne({ id: booking.carId });
      const user = await db.users.findOne({ id: req.user.id });
      // Notify Renter
      await notificationService.createNotification(
        req.user.id,
        'Hủy chuyến thành công',
        `Bạn đã hủy thành công chuyến đi xe ${car.brand} ${car.model} (Mã: #${id}). ${refundMsg}`,
        'BookingUpdate',
        id,
        'Booking'
      );

      // Notify Owner
      if (car && car.ownerId) {
        await notificationService.createNotification(
          car.ownerId,
          'Hủy đơn đặt xe',
          `Khách hàng ${user ? user.name : 'Khách hàng'} đã hủy đơn đặt xe ${car.brand} ${car.model} của bạn (Mã: #${id}).`,
          'BookingUpdate',
          id,
          'Booking'
        );
      }
      await notificationService.notifyCSKH(
        'Hủy đơn đặt xe',
        `Khách hàng ${user ? user.name : 'Khách hàng'} đã hủy đơn đặt xe ${car.brand} ${car.model} (Mã: #${id}).`,
        'BookingUpdate',
        id,
        'Booking'
      );
    }

    res.json({
      message: `Hủy đơn đặt xe thành công! ${refundMsg}`,
      ...result
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Lỗi hủy đơn đặt xe.' });
  }
});

  // 3. Submit Incident Report
definePost('/api/bookings/:id/incident', '/api/renter/bookings/:id/emergency-report', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, image, incidentType, location: incidentLocation } = req.body;

    if (!description) return res.status(400).json({ message: 'Vui lòng cung cấp mô tả chi tiết sự cố phát sinh.' });

    await renterActionService.reportIncident(id, req.user.id, description, image, incidentType, incidentLocation);

    // Send notifications
    const booking = await db.bookings.findOne({ id });
    if (booking) {
      const car = await db.cars.findOne({ id: booking.carId });
      const user = await db.users.findOne({ id: req.user.id });
      if (car && car.ownerId) {
        await notificationService.createNotification(
          car.ownerId,
          'Báo cáo sự cố chuyến đi',
          `Khách hàng ${user ? user.name : 'Khách hàng'} đã báo cáo sự cố trên chuyến đi xe ${car.brand} ${car.model} (Mã: #${id}).`,
          'IncidentAlert',
          id,
          'Booking'
        );
      }
      await notificationService.notifyCSKH(
        'Báo cáo sự cố chuyến đi',
        `Khách hàng ${user ? user.name : 'Khách hàng'} đã báo cáo sự cố trên chuyến đi xe ${car.brand} ${car.model} (Mã: #${id}).`,
        'IncidentAlert',
        id,
        'Booking'
      );
    }
    res.json({
      message: 'Báo cáo sự cố đã được gửi khẩn cấp đến đội ngũ CSKH. Chúng tôi sẽ liên hệ hỗ trợ bạn ngay lập tức.',
      supportHotline: '1900.8888'
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Lỗi gửi báo cáo sự cố.' });
  }
});

// 4. Get Incident details
defineGet('/api/bookings/:id/incident', '/api/renter/bookings/:id/emergency-report', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findOne({ id });
    if (!booking || booking.userId !== String(req.user.id)) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    }
    res.json({ issueReport: booking.issueReport || null });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải thông tin sự cố.' });
  }
});

// 5. Submit Trip Review
definePost('/api/bookings/:id/reviews', '/api/renter/bookings/:id/trip-review', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const numericRating = Number(rating);
    const normalizedComment = String(comment || '').trim();

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return res.status(400).json({ message: 'Vui lòng chấm điểm từ 1 đến 5 sao.' });
    if (!normalizedComment) return res.status(400).json({ message: 'Vui lòng nhập nhận xét chi tiết.' });

    const booking = await db.bookings.findOne({ id });
    if (!booking || booking.userId !== String(req.user.id)) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ có thể đánh giá sau khi chuyến đi đã hoàn thành và trả xe thành công.' });
    }

    const existing = await db.reviews.findMany({ bookingId: id, userId: req.user.id });
    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Bạn đã gửi đánh giá cho chuyến đi này rồi.' });
    }

    const review = await db.reviews.create({
      bookingId: id,
      carId: booking.carId,
      userId: req.user.id,
      rating: numericRating,
      comment: normalizedComment
    });

    res.status(201).json({
      message: 'Cảm ơn bạn đã gửi đánh giá! Phản hồi của bạn giúp cộng đồng ViVuCar ngày càng tốt hơn.',
      review
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Lỗi gửi đánh giá dịch vụ.' });
  }
});

// 6. Get Trip Review
defineGet('/api/bookings/:id/reviews', '/api/renter/bookings/:id/trip-review', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findOne({ id });
    if (!booking || booking.userId !== String(req.user.id)) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    }
    const reviews = await db.reviews.findMany({ bookingId: id });
    res.json({
      hasReviewed: reviews.length > 0,
      review: reviews[0] || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đánh giá.' });
  }
});

// 7. Get Incident types list
router.get('/api/renter/incident-types', auth, (_req, res) => {
  const types = [
    { value: 'accident', label: 'Tai nạn / Va chạm' },
    { value: 'breakdown', label: 'Hỏng xe / Hư hỏng kỹ thuật' },
    { value: 'flat_tire', label: 'Xịt lốp / Nổ lốp' },
    { value: 'theft', label: 'Trộm cắp tài sản' },
    { value: 'fuel_issue', label: 'Sự cố nhiên liệu' },
    { value: 'medical', label: 'Cấp cứu y tế' },
    { value: 'other', label: 'Sự cố khác' }
  ];
  res.json({ incidentTypes: types });
});

export default router;
