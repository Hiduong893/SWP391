/**
 * =============================================================================
 * renterActionRoutes.js
 * =============================================================================
 * CONTROLLER / ROUTER LAYER - Xử lý HTTP Requests cho 3 Renter Action Features:
 *   - Task 19: Hủy đặt xe & Hoàn cọc (Cancel Booking & Refund)
 *   - Task 21: Báo cáo sự cố khẩn cấp (Emergency Incident Report)
 *   - Task 22: Đánh giá dịch vụ chuyến đi (Trip Service Review)
 *
 * ĐỂ SỬ DỤNG: Mount router này vào server.js bằng cách thêm 2 dòng:
 *   import renterActionRoutes from './routes/renterActionRoutes.js';
 *   app.use('/api/renter', renterActionRoutes);
 *
 * Endpoints mới sẽ có prefix: /api/renter/...
 *
 * QUAN TRỌNG:
 *   - File này hoàn toàn ĐỘC LẬP, không sửa bất kỳ file gốc nào (server.js).
 *   - Sử dụng auth middleware từ middleware/auth.js (chỉ import, không sửa).
 *   - Tất cả responses đều theo chuẩn JSON { message, data? }.
 *
 * Author: [Tên sinh viên]
 * Task:   Inter 2 - Task 19, 21, 22
 * =============================================================================
 */

import express from 'express';
import { auth } from '../middleware/auth.js';
import { db } from '../database.js';
import {
  cancelBookingAndRefund,
  getRefundPreview,
  submitEmergencyIncidentReport,
  submitTripReview,
  getTripReview,
} from '../services/RenterActionService.js';

const router = express.Router();

// =============================================================================
// MIDDLEWARE: Tất cả routes trong file này đều yêu cầu đăng nhập
// =============================================================================
router.use(auth);

// =============================================================================
// TASK 19: Hủy đặt xe & Hoàn cọc
// Base URL: /api/renter/bookings/:id/...
// =============================================================================

/**
 * GET /api/renter/bookings/:id/refund-preview
 * Xem trước số tiền cọc sẽ được hoàn trước khi hủy.
 * Dùng để hiển thị trong popup xác nhận hủy trên frontend.
 *
 * Response 200:
 * {
 *   canCancel: boolean,
 *   daysUntilPickup: number,
 *   depositAmount: number,
 *   refundAmount: number,
 *   refundPercent: number,
 *   policyLabel: string,
 *   message: string
 * }
 */
router.get('/bookings/:id/refund-preview', (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const userId = req.user.id;

    const preview = getRefundPreview(bookingId, userId);

    return res.status(200).json(preview);
  } catch (error) {
    console.error('[RenterActionRouter] GET refund-preview error:', error);
    return res.status(500).json({
      canCancel: false,
      message: 'Lỗi hệ thống khi tính toán chính sách hoàn cọc. Vui lòng thử lại sau.',
    });
  }
});

/**
 * PUT /api/renter/bookings/:id/cancel-with-refund
 * Hủy booking và thực hiện hoàn cọc theo chính sách.
 *
 * Request Body: {} (không cần body)
 *
 * Response 200:
 * {
 *   message: string,
 *   refundAmount: number,
 *   refundPercent: number,
 *   policyLabel: string,
 *   daysUntilPickup: number,
 *   depositAmount: number
 * }
 *
 * Response 400/404: { message: string }
 */
router.put('/bookings/:id/cancel-with-refund', (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const userId = req.user.id;

    const result = cancelBookingAndRefund(bookingId, userId);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(
      result.success
        ? {
            message:         result.message,
            refundAmount:    result.refundAmount,
            refundPercent:   result.refundPercent,
            policyLabel:     result.policyLabel,
            daysUntilPickup: result.daysUntilPickup,
            depositAmount:   result.depositAmount,
          }
        : { message: result.message }
    );
  } catch (error) {
    console.error('[RenterActionRouter] PUT cancel-with-refund error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi hủy đơn đặt xe. Vui lòng thử lại sau.' });
  }
});


// =============================================================================
// TASK 21: Báo cáo sự cố khẩn cấp
// Base URL: /api/renter/bookings/:id/emergency-report
// =============================================================================

/**
 * POST /api/renter/bookings/:id/emergency-report
 * Gửi báo cáo sự cố khẩn cấp phát sinh trong chuyến đi.
 *
 * Request Body:
 * {
 *   description:  string (bắt buộc, >= 10 ký tự),
 *   incidentType: string (tùy chọn, default 'other'),
 *                 ['accident','breakdown','flat_tire','theft','fuel_issue','medical','other']
 *   image:        string | null (tùy chọn, Base64 ảnh hiện trường)
 *   location:     string | null (tùy chọn, địa điểm xảy ra sự cố)
 * }
 *
 * Response 201:
 * {
 *   message: string,
 *   incident: { description, incidentType, image, location, reportedAt, status },
 *   supportHotline: string
 * }
 */
router.post('/bookings/:id/emergency-report', (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const userId = req.user.id;
    const { description, incidentType, image, location } = req.body;

    // Validate mandatory field
    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        message: 'Trường "description" (mô tả sự cố) là bắt buộc.',
      });
    }

    const result = submitEmergencyIncidentReport(
      bookingId,
      userId,
      description,
      incidentType || 'other',
      image || null,
      location || null
    );

    return res.status(result.statusCode || (result.success ? 201 : 400)).json(
      result.success
        ? {
            message:        result.message,
            incident:       result.incident,
            supportHotline: result.supportHotline,
          }
        : { message: result.message }
    );
  } catch (error) {
    console.error('[RenterActionRouter] POST emergency-report error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi gửi báo cáo sự cố. Vui lòng gọi hotline 1900.8888 để được hỗ trợ khẩn cấp.' });
  }
});

/**
 * GET /api/renter/bookings/:id/emergency-report
 * Lấy thông tin sự cố của một chuyến đi (để hiển thị lại trên MyTrips).
 *
 * Response 200: { issueReport: object | null }
 */
router.get('/bookings/:id/emergency-report', (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const userId = req.user.id;

    const booking = db.bookings.findOne({ id: bookingId, userId });
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy chuyến đi.' });
    }

    return res.status(200).json({ issueReport: booking.issueReport || null });
  } catch (error) {
    console.error('[RenterActionRouter] GET emergency-report error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
});


// =============================================================================
// TASK 22: Đánh giá dịch vụ chuyến đi
// Base URL: /api/renter/bookings/:id/trip-review
// =============================================================================

/**
 * POST /api/renter/bookings/:id/trip-review
 * Gửi đánh giá sau khi chuyến đi hoàn thành.
 *
 * Request Body:
 * {
 *   rating:          number (bắt buộc, 1-5)
 *   comment:         string (bắt buộc, >= 5 ký tự)
 *   detailedRatings: {            (tùy chọn - đánh giá đa chiều)
 *     cleanliness: number (1-5),  // Độ sạch sẽ của xe
 *     service:     number (1-5),  // Thái độ phục vụ của Chủ xe
 *     vehicle:     number (1-5),  // Tình trạng phương tiện
 *   }
 * }
 *
 * Response 201:
 * {
 *   message: string,
 *   review: {
 *     id, bookingId, carId, userId, userName,
 *     rating, comment, detailedRatings, status, createdAt
 *   }
 * }
 */
router.post('/bookings/:id/trip-review', (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const userId   = req.user.id;
    const userName = req.user.name;
    const { rating, comment, detailedRatings } = req.body;

    // Validate mandatory fields
    if (rating === undefined || rating === null) {
      return res.status(400).json({ message: 'Trường "rating" (điểm đánh giá) là bắt buộc.' });
    }
    if (!comment || typeof comment !== 'string') {
      return res.status(400).json({ message: 'Trường "comment" (nhận xét) là bắt buộc.' });
    }

    const result = submitTripReview(
      bookingId,
      userId,
      userName,
      rating,
      comment,
      detailedRatings || null
    );

    return res.status(result.statusCode || (result.success ? 201 : 400)).json(
      result.success
        ? { message: result.message, review: result.review }
        : { message: result.message }
    );
  } catch (error) {
    console.error('[RenterActionRouter] POST trip-review error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi gửi đánh giá. Vui lòng thử lại sau.' });
  }
});

/**
 * GET /api/renter/bookings/:id/trip-review
 * Lấy đánh giá đã gửi của một booking (để check xem đã review chưa).
 *
 * Response 200: { review: object | null, hasReviewed: boolean }
 */
router.get('/bookings/:id/trip-review', (req, res) => {
  try {
    const { id: bookingId } = req.params;

    const review = getTripReview(bookingId);

    return res.status(200).json({
      hasReviewed: !!review,
      review:      review || null,
    });
  } catch (error) {
    console.error('[RenterActionRouter] GET trip-review error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
});


// =============================================================================
// UTILITY ROUTE: Lấy danh sách loại sự cố hợp lệ (cho dropdown trên frontend)
// =============================================================================

/**
 * GET /api/renter/incident-types
 * Trả về danh sách các loại sự cố hợp lệ để render dropdown trên UI.
 */
router.get('/incident-types', (_req, res) => {
  const INCIDENT_TYPE_LABELS = {
    accident:   'Tai nạn / Va chạm',
    breakdown:  'Hỏng xe / Hư hỏng kỹ thuật',
    flat_tire:  'Xịt lốp / Nổ lốp',
    theft:      'Trộm cắp tài sản',
    fuel_issue: 'Sự cố nhiên liệu',
    medical:    'Cấp cứu y tế',
    other:      'Sự cố khác',
  };

  const types = Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  return res.status(200).json({ incidentTypes: types });
});


export default router;
