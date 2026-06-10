/**
 * =============================================================================
 * RenterActionService.js
 * =============================================================================
 * SERVICE LAYER - Chứa toàn bộ Business Logic cho 3 tính năng Renter Actions:
 *   - Task 19: Hủy đặt xe & Hoàn cọc (Cancel Booking & Refund)
 *   - Task 21: Báo cáo sự cố khẩn cấp (Emergency Incident Report)
 *   - Task 22: Đánh giá dịch vụ chuyến đi (Trip Service Review)
 *
 * QUAN TRỌNG:
 *   - File này hoàn toàn ĐỘC LẬP, không sửa bất kỳ file gốc nào (server.js, database.js).
 *   - Tất cả data access đi qua db object được import từ database.js gốc.
 *   - Có thể commit riêng trên nhánh Git mà không gây conflict.
 *
 * Author: [Tên sinh viên]
 * Task:   Inter 2 - Task 19, 21, 22
 * =============================================================================
 */

import { db } from '../database.js';

// =============================================================================
// CONSTANTS - Hằng số nghiệp vụ (theo Spec của dự án BonBonCar)
// =============================================================================

const DEPOSIT_AMOUNT = 5_000_000; // 5,000,000 VND - Tiền cọc bảo đảm cố định

/**
 * Chính sách hoàn cọc theo số ngày trước ngày bắt đầu thuê:
 *  - Hủy trước >= 7 ngày : Hoàn 100% tiền cọc
 *  - Hủy trước 3-6 ngày  : Hoàn 50%  tiền cọc
 *  - Hủy trước 1-2 ngày  : Hoàn 0%   (Không hoàn - Phí hủy trễ)
 *  - Đã qua ngày khởi hành: Không thể hủy
 */
const REFUND_POLICY = [
  { minDays: 7,  refundPercent: 100, label: 'Hoàn 100% (Hủy sớm trước ≥7 ngày)' },
  { minDays: 3,  refundPercent: 50,  label: 'Hoàn 50%  (Hủy trước 3-6 ngày)'     },
  { minDays: 1,  refundPercent: 0,   label: 'Không hoàn (Hủy trễ, 1-2 ngày)'     },
  { minDays: 0,  refundPercent: 0,   label: 'Không thể hủy (Đã qua ngày khởi hành)' },
];

// Loại sự cố hợp lệ
const VALID_INCIDENT_TYPES = [
  'accident',       // Tai nạn / Va chạm
  'breakdown',      // Hỏng xe / Hư hỏng kỹ thuật
  'flat_tire',      // Xịt lốp
  'theft',          // Trộm cắp
  'fuel_issue',     // Hết nhiên liệu / Sự cố nhiên liệu
  'medical',        // Cấp cứu y tế
  'other',          // Sự cố khác
];

// =============================================================================
// HELPER FUNCTIONS - Hàm tiện ích nội bộ
// =============================================================================

/**
 * Tính số ngày giữa ngày hiện tại và ngày bắt đầu thuê xe.
 * @param {string} pickupDateStr - Chuỗi ngày nhận xe (ISO 8601 hoặc 'YYYY-MM-DD')
 * @returns {number} Số ngày còn lại (âm = đã qua)
 */
const getDaysUntilPickup = (pickupDateStr) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Đặt về 00:00 để so sánh theo ngày

  const pickupDate = new Date(pickupDateStr);
  pickupDate.setHours(0, 0, 0, 0);

  const diffMs = pickupDate - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Áp dụng chính sách hoàn cọc dựa vào số ngày trước khi khởi hành.
 * @param {number} daysUntilPickup - Số ngày trước ngày nhận xe
 * @returns {{ refundPercent: number, refundAmount: number, policyLabel: string }}
 */
const applyRefundPolicy = (daysUntilPickup) => {
  for (const policy of REFUND_POLICY) {
    if (daysUntilPickup >= policy.minDays) {
      return {
        refundPercent: policy.refundPercent,
        refundAmount: Math.floor((DEPOSIT_AMOUNT * policy.refundPercent) / 100),
        policyLabel: policy.label,
      };
    }
  }
  // Fallback: không hoàn nếu không khớp
  return { refundPercent: 0, refundAmount: 0, policyLabel: 'Không hoàn cọc' };
};

// =============================================================================
// TASK 19: Hủy đặt xe & Hoàn cọc (Cancel Booking & Smart Refund)
// =============================================================================

/**
 * cancelBookingAndRefund
 * Hủy một booking và tính toán số tiền cọc được hoàn theo chính sách.
 *
 * Business Rules:
 *  1. Chỉ Renter sở hữu booking mới được hủy.
 *  2. Chỉ hủy được khi status = 'confirmed' hoặc 'pending_owner'.
 *  3. Không hủy được khi status = 'active', 'completed', 'cancelled'.
 *  4. Số tiền hoàn cọc tính theo REFUND_POLICY dựa vào ngày còn lại.
 *  5. Tiền hoàn được cộng trực tiếp vào walletBalance của Renter.
 *
 * @param {string} bookingId  - ID của booking cần hủy
 * @param {string} userId     - ID của user thực hiện hủy (phải là chủ booking)
 * @returns {{ success: boolean, message: string, refundAmount: number, policyLabel: string }}
 */
export const cancelBookingAndRefund = (bookingId, userId) => {
  // --- Bước 1: Kiểm tra booking tồn tại và quyền sở hữu ---
  const booking = db.bookings.findOne({ id: bookingId, userId });
  if (!booking) {
    return {
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy chuyến đi hoặc bạn không có quyền hủy chuyến đi này.',
    };
  }

  // --- Bước 2: Kiểm tra trạng thái booking có cho phép hủy không ---
  const cancellableStatuses = ['confirmed', 'pending_owner'];
  if (!cancellableStatuses.includes(booking.status)) {
    const reasonMap = {
      active:    'Chuyến đi đang diễn ra (xe đã được nhận), không thể hủy.',
      completed: 'Chuyến đi đã hoàn thành, không thể hủy.',
      cancelled: 'Chuyến đi này đã được hủy trước đó.',
      disputed:  'Chuyến đi đang trong tình trạng tranh chấp, vui lòng liên hệ CSKH.',
    };
    return {
      success: false,
      statusCode: 400,
      message: reasonMap[booking.status] || `Không thể hủy chuyến đi ở trạng thái: ${booking.status}.`,
    };
  }

  // --- Bước 3: Tính số ngày trước khi nhận xe để áp dụng chính sách hoàn cọc ---
  const daysUntilPickup = getDaysUntilPickup(booking.pickupDate);

  // Không cho hủy nếu đã qua ngày nhận xe (daysUntilPickup < 0)
  if (daysUntilPickup < 0) {
    return {
      success: false,
      statusCode: 400,
      message: 'Ngày nhận xe đã qua, không thể hủy chuyến đi này. Vui lòng liên hệ CSKH để được hỗ trợ.',
    };
  }

  // --- Bước 4: Xác định số tiền hoàn cọc theo chính sách ---
  const { refundPercent, refundAmount, policyLabel } = applyRefundPolicy(daysUntilPickup);

  // --- Bước 5: Cập nhật trạng thái booking ---
  db.bookings.update(bookingId, {
    status:        'cancelled',
    cancelledAt:   new Date().toISOString(),
    cancelledBy:   userId,
    depositStatus: refundAmount > 0 ? 'refunded' : 'forfeited', // Đã hoàn / Bị tịch thu
    refundAmount,
    refundPercent,
    refundPolicy:  policyLabel,
    daysUntilPickupAtCancel: daysUntilPickup,
  });

  // --- Bước 6: Hoàn tiền cọc vào ví Renter (nếu có) ---
  if (refundAmount > 0) {
    const user = db.users.findOne({ id: userId });
    if (user) {
      db.users.update(userId, {
        walletBalance: (user.walletBalance || 0) + refundAmount,
      });
    }
  }

  // --- Bước 7: Trả kết quả ---
  const refundMsg =
    refundAmount > 0
      ? `Tiền cọc hoàn trả: ${refundAmount.toLocaleString('vi-VN')} VND (${refundPercent}%) đã vào Ví cá nhân của bạn.`
      : 'Tiền cọc không được hoàn do hủy trễ (theo chính sách hủy của BonBonCar).';

  return {
    success: true,
    statusCode: 200,
    message: `Hủy đặt xe thành công! ${refundMsg}`,
    refundAmount,
    refundPercent,
    policyLabel,
    daysUntilPickup,
    depositAmount: DEPOSIT_AMOUNT,
  };
};

/**
 * getRefundPreview
 * Cho phép Renter xem trước số tiền cọc sẽ được hoàn TRƯỚC KHI thực sự hủy.
 * Dùng để hiển thị popup xác nhận trên giao diện MyTrips.
 *
 * @param {string} bookingId  - ID của booking
 * @param {string} userId     - ID của user
 * @returns {{ canCancel: boolean, refundAmount: number, policyLabel: string, daysUntilPickup: number }}
 */
export const getRefundPreview = (bookingId, userId) => {
  const booking = db.bookings.findOne({ id: bookingId, userId });
  if (!booking) {
    return { canCancel: false, message: 'Booking không tồn tại.' };
  }

  const cancellableStatuses = ['confirmed', 'pending_owner'];
  if (!cancellableStatuses.includes(booking.status)) {
    return { canCancel: false, message: `Không thể hủy ở trạng thái: ${booking.status}.` };
  }

  const daysUntilPickup = getDaysUntilPickup(booking.pickupDate);
  if (daysUntilPickup < 0) {
    return { canCancel: false, message: 'Đã qua ngày nhận xe.', daysUntilPickup };
  }

  const { refundPercent, refundAmount, policyLabel } = applyRefundPolicy(daysUntilPickup);

  return {
    canCancel: true,
    daysUntilPickup,
    depositAmount: DEPOSIT_AMOUNT,
    refundAmount,
    refundPercent,
    policyLabel,
    message: `Nếu hủy ngay, bạn sẽ được hoàn: ${refundAmount.toLocaleString('vi-VN')} VND (${refundPercent}% tiền cọc).`,
  };
};


// =============================================================================
// TASK 21: Báo cáo sự cố khẩn cấp (Emergency Incident Report)
// =============================================================================

/**
 * submitEmergencyIncidentReport
 * Ghi nhận sự cố khẩn cấp phát sinh trong chuyến đi đang diễn ra.
 *
 * Business Rules:
 *  1. Chỉ Renter sở hữu booking mới được báo cáo sự cố.
 *  2. Chỉ báo sự cố khi booking đang ở trạng thái 'active' (đã nhận xe).
 *  3. Mô tả sự cố là bắt buộc; hình ảnh là tùy chọn.
 *  4. incidentType phải nằm trong danh sách VALID_INCIDENT_TYPES.
 *  5. Nếu booking đã có sự cố đang pending, cho phép cập nhật thêm thông tin.
 *
 * @param {string} bookingId      - ID booking đang hoạt động
 * @param {string} userId         - ID Renter
 * @param {string} description    - Mô tả chi tiết sự cố (bắt buộc)
 * @param {string} incidentType   - Loại sự cố (từ VALID_INCIDENT_TYPES)
 * @param {string|null} image     - Base64 ảnh hiện trường (tùy chọn)
 * @param {string|null} location  - Địa điểm xảy ra sự cố (tùy chọn)
 * @returns {{ success: boolean, message: string, incident: object }}
 */
export const submitEmergencyIncidentReport = (bookingId, userId, description, incidentType, image, location) => {
  // --- Bước 1: Validate đầu vào ---
  if (!description || description.trim().length < 10) {
    return {
      success: false,
      statusCode: 400,
      message: 'Vui lòng mô tả chi tiết sự cố (ít nhất 10 ký tự) để đội ngũ CSKH có thể hỗ trợ hiệu quả.',
    };
  }

  const normalizedType = incidentType || 'other';
  if (!VALID_INCIDENT_TYPES.includes(normalizedType)) {
    return {
      success: false,
      statusCode: 400,
      message: `Loại sự cố không hợp lệ. Các loại hợp lệ: ${VALID_INCIDENT_TYPES.join(', ')}.`,
    };
  }

  // --- Bước 2: Kiểm tra booking ---
  const booking = db.bookings.findOne({ id: bookingId, userId });
  if (!booking) {
    return {
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy chuyến đi tương ứng.',
    };
  }

  // --- Bước 3: Kiểm tra trạng thái booking ---
  // Chỉ cho phép báo sự cố khi đang chạy (active)
  // Ngoài ra cũng cho phép ở trạng thái confirmed (sự cố trước khi nhận xe)
  const allowedStatuses = ['active', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) {
    return {
      success: false,
      statusCode: 400,
      message: `Chỉ có thể báo cáo sự cố khi chuyến đi đang diễn ra. Trạng thái hiện tại: ${booking.status}.`,
    };
  }

  // --- Bước 4: Xây dựng đối tượng sự cố ---
  const incidentRecord = {
    description:  description.trim(),
    incidentType: normalizedType,
    image:        image || null,
    location:     location ? location.trim() : null,
    reportedAt:   new Date().toISOString(),
    reportedBy:   userId,
    status:       'pending', // Chờ CSKH xử lý
    resolvedAt:   null,
    resolvedBy:   null,
    resolution:   null,
  };

  // --- Bước 5: Nếu đã có sự cố pending, append vào lịch sử; nếu chưa, tạo mới ---
  let updatedIncidentData;
  if (booking.issueReport && booking.issueReport.status === 'pending') {
    // Lưu lịch sử nhiều sự cố (nếu cần mở rộng)
    const history = booking.issueReport.history || [];
    history.push(booking.issueReport);
    updatedIncidentData = {
      ...incidentRecord,
      history,
    };
  } else {
    updatedIncidentData = incidentRecord;
  }

  // --- Bước 6: Ghi vào DB ---
  db.bookings.update(bookingId, {
    issueReport: updatedIncidentData,
  });

  return {
    success: true,
    statusCode: 201,
    message: 'Báo cáo sự cố khẩn cấp đã được gửi thành công! Đội ngũ CSKH BonBonCar sẽ liên hệ hỗ trợ bạn trong vòng 15 phút. Hotline cứu hộ: 1900.8888.',
    incident: incidentRecord,
    supportHotline: '1900.8888',
  };
};


// =============================================================================
// TASK 22: Đánh giá dịch vụ chuyến đi (Trip Service Review)
// =============================================================================

/**
 * submitTripReview
 * Lưu đánh giá (rating + comment) của Renter cho một chuyến đi đã hoàn thành.
 *
 * Business Rules:
 *  1. Chỉ Renter sở hữu booking mới được đánh giá.
 *  2. Chỉ đánh giá được khi booking status = 'completed'.
 *  3. Mỗi booking chỉ được đánh giá 1 lần (hasReviewed check).
 *  4. Rating phải là số nguyên từ 1 đến 5.
 *  5. Comment là bắt buộc, tối thiểu 5 ký tự.
 *  6. Đánh giá được lưu vào collection reviews và có thể hiển thị công khai.
 *  7. Danh sách rating đa chiều (tùy chọn): overallRating, cleanlinessRating, serviceRating, vehicleRating.
 *
 * @param {string} bookingId        - ID booking đã hoàn thành
 * @param {string} userId           - ID Renter
 * @param {string} userName         - Tên Renter (để hiển thị trên review)
 * @param {number} rating           - Điểm đánh giá tổng thể (1-5)
 * @param {string} comment          - Nhận xét chi tiết
 * @param {object} detailedRatings  - Đánh giá chi tiết (tùy chọn): { cleanliness, service, vehicle }
 * @returns {{ success: boolean, message: string, review: object }}
 */
export const submitTripReview = (bookingId, userId, userName, rating, comment, detailedRatings) => {
  // --- Bước 1: Validate rating ---
  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return {
      success: false,
      statusCode: 400,
      message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5.',
    };
  }

  // --- Bước 2: Validate comment ---
  if (!comment || comment.trim().length < 5) {
    return {
      success: false,
      statusCode: 400,
      message: 'Vui lòng nhập nhận xét chi tiết (ít nhất 5 ký tự).',
    };
  }

  // --- Bước 3: Kiểm tra booking ---
  const booking = db.bookings.findOne({ id: bookingId, userId });
  if (!booking) {
    return {
      success: false,
      statusCode: 404,
      message: 'Không tìm thấy chuyến đi tương ứng.',
    };
  }

  // --- Bước 4: Kiểm tra chuyến đi đã hoàn thành chưa ---
  if (booking.status !== 'completed') {
    return {
      success: false,
      statusCode: 400,
      message: 'Chỉ có thể đánh giá sau khi chuyến đi đã hoàn thành và trả xe thành công.',
    };
  }

  // --- Bước 5: Kiểm tra đã đánh giá chưa (không cho đánh giá 2 lần) ---
  const existingReviews = db.reviews.findMany({ bookingId, userId });
  if (existingReviews && existingReviews.length > 0) {
    return {
      success: false,
      statusCode: 409,
      message: 'Bạn đã gửi đánh giá cho chuyến đi này rồi. Mỗi chuyến đi chỉ được đánh giá một lần.',
    };
  }

  // --- Bước 6: Xây dựng và lưu đánh giá ---
  const reviewData = {
    bookingId,
    carId:    booking.carId,
    userId,
    userName: userName || 'Ẩn danh',
    rating:   numericRating,
    comment:  comment.trim(),
    // Đánh giá đa chiều (nâng cao - tùy chọn)
    detailedRatings: detailedRatings
      ? {
          cleanliness: parseInt(detailedRatings.cleanliness) || numericRating,
          service:     parseInt(detailedRatings.service)     || numericRating,
          vehicle:     parseInt(detailedRatings.vehicle)     || numericRating,
        }
      : null,
    status: 'visible', // Hiển thị công khai ngay lập tức
  };

  const newReview = db.reviews.create(reviewData);

  return {
    success: true,
    statusCode: 201,
    message: 'Cảm ơn bạn đã gửi đánh giá! Phản hồi của bạn giúp cộng đồng BonBonCar ngày càng tốt hơn.',
    review: newReview,
  };
};

/**
 * getTripReview
 * Lấy đánh giá của một booking cụ thể (để hiển thị lại trong MyTrips).
 *
 * @param {string} bookingId - ID booking
 * @returns {object|null} Review object hoặc null
 */
export const getTripReview = (bookingId) => {
  const reviews = db.reviews.findMany({ bookingId });
  return reviews && reviews.length > 0 ? reviews[0] : null;
};

// =============================================================================
// EXPORT PUBLIC API của Service
// =============================================================================

export default {
  // Task 19
  cancelBookingAndRefund,
  getRefundPreview,
  // Task 21
  submitEmergencyIncidentReport,
  // Task 22
  submitTripReview,
  getTripReview,
  // Utilities (export để test)
  _getDaysUntilPickup: getDaysUntilPickup,
  _applyRefundPolicy:  applyRefundPolicy,
  REFUND_POLICY,
  DEPOSIT_AMOUNT,
  VALID_INCIDENT_TYPES,
};
