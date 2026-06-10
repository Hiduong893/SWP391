/**
 * =============================================================================
 * renterActionApi.js
 * =============================================================================
 * FRONTEND API CLIENT - Các hàm gọi API cho 3 tính năng Renter Actions.
 * File này độc lập, KHÔNG SỬA api.js gốc, import riêng vào component cần dùng.
 *
 * Sử dụng trong component:
 *   import { renterActionApi } from '../utils/renterActionApi';
 *
 *   // Ví dụ xem trước hoàn cọc trước khi hủy:
 *   const preview = await renterActionApi.cancelBooking.getRefundPreview(trip.id);
 *
 *   // Ví dụ hủy booking với hoàn cọc thông minh:
 *   const result = await renterActionApi.cancelBooking.cancelWithRefund(trip.id);
 *
 * Author: [Tên sinh viên]
 * Task:   Inter 2 - Task 19, 21, 22
 * =============================================================================
 */

const API_BASE = '/api/renter';

/**
 * Internal helper: gọi fetch với Authorization header tự động.
 * Pattern giống hệt api.js gốc để nhất quán.
 */
const renterRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Đã xảy ra lỗi không xác định.');
  }

  return data;
};

// =============================================================================
// EXPORTED API OBJECT
// =============================================================================

export const renterActionApi = {

  // ---------------------------------------------------------------------------
  // TASK 19: Hủy đặt xe & Hoàn cọc
  // ---------------------------------------------------------------------------
  cancelBooking: {
    /**
     * Lấy preview số tiền hoàn cọc trước khi hủy.
     * Gọi endpoint: GET /api/renter/bookings/:id/refund-preview
     *
     * @param {string} bookingId - ID booking
     * @returns {Promise<{
     *   canCancel: boolean,
     *   daysUntilPickup: number,
     *   depositAmount: number,
     *   refundAmount: number,
     *   refundPercent: number,
     *   policyLabel: string,
     *   message: string
     * }>}
     */
    getRefundPreview: (bookingId) =>
      renterRequest(`/bookings/${bookingId}/refund-preview`, { method: 'GET' }),

    /**
     * Thực hiện hủy booking và nhận hoàn cọc theo chính sách.
     * Gọi endpoint: PUT /api/renter/bookings/:id/cancel-with-refund
     *
     * @param {string} bookingId - ID booking cần hủy
     * @returns {Promise<{
     *   message: string,
     *   refundAmount: number,
     *   refundPercent: number,
     *   policyLabel: string,
     *   daysUntilPickup: number,
     *   depositAmount: number
     * }>}
     */
    cancelWithRefund: (bookingId) =>
      renterRequest(`/bookings/${bookingId}/cancel-with-refund`, { method: 'PUT' }),
  },

  // ---------------------------------------------------------------------------
  // TASK 21: Báo cáo sự cố khẩn cấp
  // ---------------------------------------------------------------------------
  emergencyReport: {
    /**
     * Gửi báo cáo sự cố khẩn cấp.
     * Gọi endpoint: POST /api/renter/bookings/:id/emergency-report
     *
     * @param {string} bookingId - ID booking đang diễn ra
     * @param {object} reportData
     * @param {string}      reportData.description  - Mô tả sự cố (bắt buộc, >= 10 ký tự)
     * @param {string}      [reportData.incidentType='other'] - Loại sự cố
     *          Các giá trị: 'accident' | 'breakdown' | 'flat_tire' |
     *                       'theft' | 'fuel_issue' | 'medical' | 'other'
     * @param {string|null} [reportData.image=null]    - Base64 ảnh hiện trường
     * @param {string|null} [reportData.location=null] - Địa điểm xảy ra
     * @returns {Promise<{ message: string, incident: object, supportHotline: string }>}
     */
    submit: (bookingId, reportData) =>
      renterRequest(`/bookings/${bookingId}/emergency-report`, {
        method: 'POST',
        body: JSON.stringify({
          description:  reportData.description,
          incidentType: reportData.incidentType || 'other',
          image:        reportData.image        || null,
          location:     reportData.location     || null,
        }),
      }),

    /**
     * Lấy thông tin sự cố của một booking.
     * Gọi endpoint: GET /api/renter/bookings/:id/emergency-report
     *
     * @param {string} bookingId - ID booking
     * @returns {Promise<{ issueReport: object | null }>}
     */
    get: (bookingId) =>
      renterRequest(`/bookings/${bookingId}/emergency-report`, { method: 'GET' }),

    /**
     * Lấy danh sách loại sự cố hợp lệ (để render dropdown).
     * Gọi endpoint: GET /api/renter/incident-types
     *
     * @returns {Promise<{ incidentTypes: Array<{ value: string, label: string }> }>}
     */
    getIncidentTypes: () =>
      renterRequest('/incident-types', { method: 'GET' }),
  },

  // ---------------------------------------------------------------------------
  // TASK 22: Đánh giá dịch vụ chuyến đi
  // ---------------------------------------------------------------------------
  tripReview: {
    /**
     * Gửi đánh giá sau khi hoàn thành chuyến đi.
     * Gọi endpoint: POST /api/renter/bookings/:id/trip-review
     *
     * @param {string} bookingId - ID booking đã completed
     * @param {object} reviewData
     * @param {number}      reviewData.rating    - Điểm tổng thể (1-5, bắt buộc)
     * @param {string}      reviewData.comment   - Nhận xét chi tiết (bắt buộc, >= 5 ký tự)
     * @param {object|null} [reviewData.detailedRatings=null] - Đánh giá đa chiều (tùy chọn):
     *          { cleanliness: 1-5, service: 1-5, vehicle: 1-5 }
     * @returns {Promise<{ message: string, review: object }>}
     */
    submit: (bookingId, reviewData) =>
      renterRequest(`/bookings/${bookingId}/trip-review`, {
        method: 'POST',
        body: JSON.stringify({
          rating:          reviewData.rating,
          comment:         reviewData.comment,
          detailedRatings: reviewData.detailedRatings || null,
        }),
      }),

    /**
     * Lấy đánh giá đã gửi của một booking.
     * Gọi endpoint: GET /api/renter/bookings/:id/trip-review
     *
     * @param {string} bookingId - ID booking
     * @returns {Promise<{ hasReviewed: boolean, review: object | null }>}
     */
    get: (bookingId) =>
      renterRequest(`/bookings/${bookingId}/trip-review`, { method: 'GET' }),
  },
};

export default renterActionApi;
