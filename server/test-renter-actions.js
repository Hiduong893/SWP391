/**
 * =============================================================================
 * test-renter-actions.js
 * =============================================================================
 * INTEGRATION / UNIT TEST SCRIPT - Kiểm thử toàn bộ 3 tính năng mới (Inter 2):
 *   - Task 19: Hủy đặt xe & Hoàn cọc (Refund Policy)
 *   - Task 21: Báo cáo sự cố khẩn cấp (Emergency Incident Report)
 *   - Task 22: Đánh giá dịch vụ chuyến đi (Trip Service Review)
 *
 * Cách chạy:
 *   cd server
 *   node test-renter-actions.js
 * =============================================================================
 */

import { db } from './database.js';
import renterService from './services/RenterActionService.js';

// Đếm số lượng test case
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    // Không crash chương trình để chạy tiếp các test khác
  }
}

console.log('================================================================');
console.log('🏁 KHỞI ĐỘNG HỆ THỐNG KIỂM THỬ TỰ ĐỘNG - RENTER ACTIONS (INTER 2)');
console.log('================================================================');

// 1. CHUẨN BỊ MOCK DATA
const TEST_USER_ID = 'test-user-renter-123';
const TEST_CAR_ID = 'test-car-vehicle-123';
const TEST_OWNER_ID = 'test-owner-user-123';

console.log('\n[1/4] Chuẩn bị dữ liệu kiểm thử...');

try {
  // Đảm bảo không trùng lặp cũ
  const existingUser = db.users.findOne({ id: TEST_USER_ID });
  if (!existingUser) {
    db.users.create({
      id: TEST_USER_ID,
      email: 'renter-test@bonboncar.vn',
      name: 'Renter Test User',
      walletBalance: 10_000_000, // Ví ban đầu 10M
      role: 'renter',
    });
    // database.js's db.users.create doesn't accept custom ID directly, let's force update the ID if it generated a random UUID
    const createdUser = db.users.findOne({ email: 'renter-test@bonboncar.vn' });
    if (createdUser && createdUser.id !== TEST_USER_ID) {
      // Force rewrite in db.json for cleaner testing
      const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
      const uIndex = data.users.findIndex(u => u.email === 'renter-test@bonboncar.vn');
      if (uIndex !== -1) {
        data.users[uIndex].id = TEST_USER_ID;
        data.users[uIndex].walletBalance = 10_000_000;
        // Thêm trường cars và bookings nếu chưa có
        if (!data.cars) data.cars = [];
        if (!data.bookings) data.bookings = [];
        if (!data.reviews) data.reviews = [];
        import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
      }
    }
  } else {
    // Reset wallet balance
    db.users.update(TEST_USER_ID, { walletBalance: 10_000_000 });
  }

  // Tạo Car giả lập
  const existingCar = db.cars.findOne({ id: TEST_CAR_ID });
  if (!existingCar) {
    const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
    data.cars.push({
      id: TEST_CAR_ID,
      brand: 'Toyota',
      model: 'Fortuner Test',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Dầu',
      pricePerDay: 1000000,
      location: 'Hà Nội',
      ownerId: TEST_OWNER_ID,
      status: 'available',
      plateNumber: '30F-TEST.99',
      createdAt: new Date().toISOString()
    });
    import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
  } else {
    db.cars.update(TEST_CAR_ID, { status: 'available' });
  }

  console.log('  ✔️ Thiết lập User ID: ' + TEST_USER_ID);
  console.log('  ✔️ Thiết lập Car ID: ' + TEST_CAR_ID);

} catch (err) {
  console.error('Lỗi khi chuẩn bị dữ liệu:', err);
  process.exit(1);
}

// 2. KHỞI CHẠY CÁC TEST CASES CHI TIẾT
console.log('\n[2/4] Bắt đầu chạy các Test Cases...');

// Helper để tạo ngày nhận xe
const getFutureDateString = (daysInFuture) => {
  const d = new Date();
  d.setDate(d.getDate() + daysInFuture);
  return d.toISOString().split('T')[0] + 'T09:00:00.000Z';
};

const getPastDateString = (daysInPast) => {
  const d = new Date();
  d.setDate(d.getDate() - daysInPast);
  return d.toISOString().split('T')[0] + 'T09:00:00.000Z';
};

// -----------------------------------------------------------------------------
// TASK 19 TESTS: HỦY ĐẶT XE & HOÀN CỌC
// -----------------------------------------------------------------------------
console.log('\n--- Task 19: Hủy Đặt Xe & Hoàn Cọc ---');

const bookingId100Percent = 'booking-test-refund-100';
const bookingId50Percent = 'booking-test-refund-50';
const bookingId0Percent = 'booking-test-refund-0';
const bookingIdPastDate = 'booking-test-past-date';

// Chuẩn bị các booking test trong db.json
try {
  const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
  
  // Xóa sạch booking test cũ nếu có
  data.bookings = data.bookings.filter(b => !b.id.startsWith('booking-test-'));

  // 1. Booking hủy sớm >= 7 ngày (Hoàn 100% = 5M)
  data.bookings.push({
    id: bookingId100Percent,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getFutureDateString(8), // 8 ngày sau
    returnDate: getFutureDateString(10),
    totalPrice: 2000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  });

  // 2. Booking hủy trung bình 3-6 ngày (Hoàn 50% = 2.5M)
  data.bookings.push({
    id: bookingId50Percent,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getFutureDateString(4), // 4 ngày sau
    returnDate: getFutureDateString(6),
    totalPrice: 2000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  });

  // 3. Booking hủy trễ 1-2 ngày (Hoàn 0%)
  data.bookings.push({
    id: bookingId0Percent,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getFutureDateString(2), // 2 ngày sau
    returnDate: getFutureDateString(4),
    totalPrice: 2000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  });

  // 4. Booking đã qua ngày nhận xe
  data.bookings.push({
    id: bookingIdPastDate,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getPastDateString(1), // Ngày hôm qua
    returnDate: getFutureDateString(2),
    totalPrice: 3000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  });

  await import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
} catch (err) {
  console.error('Không thể tạo booking test:', err);
}

// Chạy test logic
// Test Case 1: Xem trước hoàn cọc 100%
const preview100 = renterService.getRefundPreview(bookingId100Percent, TEST_USER_ID);
assert(preview100.canCancel === true, 'Xem trước hoàn cọc 100% phải cho phép hủy (canCancel = true)');
assert(preview100.refundPercent === 100, 'Số % hoàn cọc phải là 100%');
assert(preview100.refundAmount === 5000000, 'Số tiền hoàn cọc xem trước phải là 5,000,000 VND');

// Test Case 2: Hủy thực tế 100% & kiểm tra số dư ví
const balanceBefore = db.users.findOne({ id: TEST_USER_ID }).walletBalance || 0;
const cancel100 = renterService.cancelBookingAndRefund(bookingId100Percent, TEST_USER_ID);
const balanceAfter = db.users.findOne({ id: TEST_USER_ID }).walletBalance || 0;

assert(cancel100.success === true, 'Hủy đơn hàng 100% hoàn cọc phải thành công');
assert(cancel100.refundAmount === 5000000, 'Trả về số tiền hoàn cọc là 5,000,000 VND');
assert(balanceAfter === balanceBefore + 5000000, 'Số dư ví của Renter phải tăng thêm 5,000,000 VND');

// Test Case 3: Kiểm tra trạng thái Booking & Car sau khi hủy
const updatedBooking100 = db.bookings.findOne({ id: bookingId100Percent });
const updatedCar = db.cars.findOne({ id: TEST_CAR_ID });
assert(updatedBooking100.status === 'cancelled', 'Trạng thái Booking phải chuyển sang "cancelled"');
assert(updatedBooking100.depositStatus === 'refunded', 'depositStatus phải chuyển sang "refunded"');
assert(updatedCar.status === 'available', 'Xe phải được trả về trạng thái "available"');

// Test Case 4: Xem trước & hủy thực tế 50%
const preview50 = renterService.getRefundPreview(bookingId50Percent, TEST_USER_ID);
assert(preview50.refundPercent === 50 && preview50.refundAmount === 2500000, 'Xem trước hoàn cọc 50% trả về 2.500.000 VND');

const userWalletBefore50 = db.users.findOne({ id: TEST_USER_ID }).walletBalance || 0;
const cancel50 = renterService.cancelBookingAndRefund(bookingId50Percent, TEST_USER_ID);
const userWalletAfter50 = db.users.findOne({ id: TEST_USER_ID }).walletBalance || 0;

assert(cancel50.success === true, 'Hủy đơn hàng 50% hoàn cọc phải thành công');
assert(userWalletAfter50 === userWalletBefore50 + 2500000, 'Số dư ví renter tăng thêm đúng 2.500.000 VND');

// Test Case 5: Hủy thực tế 0% (Hủy quá trễ)
const preview0 = renterService.getRefundPreview(bookingId0Percent, TEST_USER_ID);
assert(preview0.refundPercent === 0 && preview0.refundAmount === 0, 'Xem trước hủy trễ 1-2 ngày trả về 0 VND hoàn cọc');

const cancel0 = renterService.cancelBookingAndRefund(bookingId0Percent, TEST_USER_ID);
assert(cancel0.success === true, 'Hủy đơn trễ vẫn thành công nhưng không hoàn cọc');
assert(cancel0.refundAmount === 0, 'Số tiền hoàn cọc thực tế là 0 VND');

// Test Case 6: Hủy đơn hàng đã qua ngày nhận xe (Phải thất bại)
const cancelPast = renterService.cancelBookingAndRefund(bookingIdPastDate, TEST_USER_ID);
assert(cancelPast.success === false, 'Hủy đơn hàng đã qua ngày nhận xe phải trả về thất bại');
assert(cancelPast.statusCode === 400, 'Status code trả về là 400 (Bad Request)');

// Test Case 7: Người dùng khác không được quyền hủy
const cancelUnauthorized = renterService.cancelBookingAndRefund(bookingIdPastDate, 'user-stranger-id');
assert(cancelUnauthorized.success === false, 'Không cho phép user lạ hủy booking của người khác');
assert(cancelUnauthorized.statusCode === 404, 'Trả về 404 (Không tìm thấy đơn hàng thuộc sở hữu của user)');


// -----------------------------------------------------------------------------
// TASK 21 TESTS: BÁO CÁO SỰ CỐ KHẨN CẤP
// -----------------------------------------------------------------------------
console.log('\n--- Task 21: Báo Cáo Sự Cố Khẩn Cấp ---');

const bookingIdActive = 'booking-test-active';
const bookingIdCompleted = 'booking-test-completed';

try {
  const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
  
  // Booking đang diễn ra (active)
  data.bookings.push({
    id: bookingIdActive,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getPastDateString(1),
    returnDate: getFutureDateString(2),
    totalPrice: 3000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'active', // Trạng thái active để báo cáo sự cố
    issueReport: null,
    createdAt: new Date().toISOString()
  });

  // Booking đã hoàn thành
  data.bookings.push({
    id: bookingIdCompleted,
    userId: TEST_USER_ID,
    carId: TEST_CAR_ID,
    pickupDate: getPastDateString(5),
    returnDate: getPastDateString(2),
    totalPrice: 3000000,
    depositAmount: 5000000,
    depositStatus: 'paid',
    status: 'completed',
    createdAt: new Date().toISOString()
  });

  await import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
} catch (err) {
  console.error('Không thể tạo booking test sự cố:', err);
}

// Test Case 8: Validate mô tả sự cố quá ngắn
const reportShort = renterService.submitEmergencyIncidentReport(
  bookingIdActive,
  TEST_USER_ID,
  'Hỏng xe', // < 10 ký tự
  'breakdown'
);
assert(reportShort.success === false && reportShort.statusCode === 400, 'Mô tả sự cố dưới 10 ký tự phải bị loại (400)');

// Test Case 9: Validate loại sự cố không hợp lệ
const reportInvalidType = renterService.submitEmergencyIncidentReport(
  bookingIdActive,
  TEST_USER_ID,
  'Xe bị vỡ kính chắn gió khi đang chạy',
  'invalid_incident_type_xyz'
);
assert(reportInvalidType.success === false && reportInvalidType.statusCode === 400, 'Loại sự cố lạ phải bị loại (400)');

// Test Case 10: Báo cáo sự cố thành công cho chuyến đi Active
const reportSuccess = renterService.submitEmergencyIncidentReport(
  bookingIdActive,
  TEST_USER_ID,
  'Xe bị nổ lốp trước bên phải trên Quốc lộ 1A',
  'flat_tire',
  'data:image/png;base64,mockimagedatabase64',
  'Km 120, Quốc Lộ 1A'
);
assert(reportSuccess.success === true, 'Gửi báo cáo sự cố khẩn cấp cho chuyến đi đang active phải thành công');
assert(reportSuccess.incident.incidentType === 'flat_tire', 'Lưu đúng loại sự cố là "flat_tire"');
assert(reportSuccess.incident.status === 'pending', 'Sự cố mới có trạng thái là "pending"');

// Test Case 11: Kiểm tra trường issueReport đã được cập nhật vào Booking chưa
const updatedBookingActive = db.bookings.findOne({ id: bookingIdActive });
assert(updatedBookingActive.issueReport !== null, 'Trường issueReport của booking phải được ghi nhận');
assert(updatedBookingActive.issueReport.description === 'Xe bị nổ lốp trước bên phải trên Quốc lộ 1A', 'Đúng mô tả sự cố đã gửi');

// Test Case 12: Không cho phép báo cáo sự cố khi chuyến đi đã kết thúc (completed)
const reportCompleted = renterService.submitEmergencyIncidentReport(
  bookingIdCompleted,
  TEST_USER_ID,
  'Tôi phát hiện xe xước nhẹ sau khi đã trả xe',
  'other'
);
assert(reportCompleted.success === false && reportCompleted.statusCode === 400, 'Không cho phép báo cáo sự cố khẩn cấp khi chuyến đi đã hoàn thành');


// -----------------------------------------------------------------------------
// TASK 22 TESTS: ĐÁNH GIÁ DỊCH VỤ CHUYẾN ĐI
// -----------------------------------------------------------------------------
console.log('\n--- Task 22: Đánh Giá Dịch Vụ Chuyến Đi ---');

// Đảm bảo reviews được reset trước khi test
try {
  const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
  data.reviews = data.reviews.filter(r => r.bookingId !== bookingIdCompleted && r.bookingId !== bookingIdActive);
  await import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
} catch (err) {
  console.error('Không thể dọn dẹp reviews cũ:', err);
}

// Test Case 13: Đánh giá chuyến đi chưa hoàn thành (đang active) -> Thất bại
const reviewActive = renterService.submitTripReview(
  bookingIdActive,
  TEST_USER_ID,
  'Renter Test',
  5,
  'Xe rất tốt nhưng không được review khi đang chạy!'
);
assert(reviewActive.success === false && reviewActive.statusCode === 400, 'Không cho phép đánh giá chuyến đi chưa hoàn thành (status != completed)');

// Test Case 14: Đánh giá điểm không hợp lệ (ví dụ: 0 hoặc 6)
const reviewInvalidScore = renterService.submitTripReview(
  bookingIdCompleted,
  TEST_USER_ID,
  'Renter Test',
  6,
  'Chuyến đi tuyệt vời nhưng chấm 6 sao!'
);
assert(reviewInvalidScore.success === false && reviewInvalidScore.statusCode === 400, 'Điểm số 6 sao phải bị từ chối');

// Test Case 15: Đánh giá thành công chuyến đi hoàn thành
const reviewSuccess = renterService.submitTripReview(
  bookingIdCompleted,
  TEST_USER_ID,
  'Renter Test',
  5,
  'Xe chạy rất êm, chủ xe nhiệt tình và giao xe đúng giờ!',
  { cleanliness: 5, service: 5, vehicle: 4 } // chi tiết đa chiều
);
assert(reviewSuccess.success === true, 'Đánh giá chuyến đi hoàn thành thành công');
assert(reviewSuccess.review.rating === 5, 'Rating lưu thành công 5 sao');

// Test Case 16: Lấy đánh giá đã lưu
const savedReview = renterService.getTripReview(bookingIdCompleted);
assert(savedReview !== null, 'Hàm getTripReview phải trả về dữ liệu review');
assert(savedReview.comment === 'Xe chạy rất êm, chủ xe nhiệt tình và giao xe đúng giờ!', 'Nhận xét khớp với dữ liệu đã lưu');

// Test Case 17: Không cho phép đánh giá lần thứ 2 cho cùng 1 booking
const reviewDuplicate = renterService.submitTripReview(
  bookingIdCompleted,
  TEST_USER_ID,
  'Renter Test',
  4,
  'Muốn đánh giá thêm lần nữa để sửa điểm'
);
assert(reviewDuplicate.success === false && reviewDuplicate.statusCode === 409, 'Chặn đánh giá trùng lặp thành công (statusCode 409)');


// 3. DỌN DẸP DỮ LIỆU SAU TEST
console.log('\n[3/4] Dọn dẹp dữ liệu test để giữ DB sạch sẽ...');
try {
  const data = JSON.parse(await import('fs').then(fs => fs.readFileSync('./db.json', 'utf8')));
  
  data.bookings = data.bookings.filter(b => !b.id.startsWith('booking-test-'));
  data.cars = data.cars.filter(c => c.id !== TEST_CAR_ID);
  data.users = data.users.filter(u => u.id !== TEST_USER_ID);
  data.reviews = data.reviews.filter(r => r.bookingId !== bookingIdCompleted && r.bookingId !== bookingIdActive);

  await import('fs').then(fs => fs.writeFileSync('./db.json', JSON.stringify(data, null, 2)));
  console.log('  ✔️ Dọn dẹp Bookings thành công.');
  console.log('  ✔️ Dọn dẹp Cars thành công.');
  console.log('  ✔️ Dọn dẹp Users thành công.');
  console.log('  ✔️ Dọn dẹp Reviews thành công.');
} catch (err) {
  console.error('Lỗi khi dọn dẹp dữ liệu:', err);
}

// 4. KẾT LUẬN KẾT QUẢ
console.log('\n[4/4] Báo cáo kết quả kiểm thử:');
console.log('================================================================');
if (passedTests === totalTests) {
  console.log(`🎉 HOÀN THÀNH XUẤT SẮC: ${passedTests}/${totalTests} tests PASS.`);
  console.log('Tất cả các nghiệp vụ của Task 19, 21, 22 chạy chính xác tuyệt đối!');
} else {
  console.error(`⚠️  CẢNH BÁO: Chỉ có ${passedTests}/${totalTests} tests PASS.`);
  console.error('Vui lòng kiểm tra lại logic nghiệp vụ.');
}
console.log('================================================================\n');
