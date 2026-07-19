import { sql, getPool } from '../config/db.js';

// Helper: map DB row → JS object
const mapContractRow = (row) => ({
  id: String(row.contract_id),
  bookingId: String(row.booking_id),
  contractCode: row.contract_code,
  status: row.status,

  // Giai đoạn 1: Cọc giữ chỗ (đã trả online)
  reservationFee: Number(row.reservation_fee),
  reservationPaidAt: row.reservation_paid_at ? new Date(row.reservation_paid_at).toISOString() : null,

  // Giai đoạn 2: Trả trước khi nhận xe
  prepaymentAmount: Number(row.prepayment_amount),
  prepaymentDueDate: row.prepayment_due_date ? new Date(row.prepayment_due_date).toISOString() : null,
  prepaymentPaidAt: row.prepayment_paid_at ? new Date(row.prepayment_paid_at).toISOString() : null,
  prepaymentMethod: row.prepayment_method || null,

  // Giai đoạn 3: Cọc bảo đảm (hoàn sau trả xe)
  depositAmount: Number(row.deposit_amount),
  depositRefundAt: row.deposit_refund_at ? new Date(row.deposit_refund_at).toISOString() : null,

  // Phát sinh
  surchargeAmount: Number(row.surcharge_amount),
  surchargeReason: row.surcharge_reason || null,
  surchargeAddedAt: row.surcharge_added_at ? new Date(row.surcharge_added_at).toISOString() : null,

  // Chữ ký
  renterSignedAt: row.renter_signed_at ? new Date(row.renter_signed_at).toISOString() : null,
  renterIp: row.renter_ip || null,
  ownerSignedAt: row.owner_signed_at ? new Date(row.owner_signed_at).toISOString() : null,
  ownerIp: row.owner_ip || null,

  // Điều khoản
  termsSnapshot: row.terms_snapshot ? JSON.parse(row.terms_snapshot) : null,

  createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
});

/**
 * Danh sách chủ đề điều khoản bổ sung hợp pháp mà chủ xe được phép thêm.
 * Mỗi topic có id, nhãn hiển thị và placeholder gợi ý nội dung.
 * ViVuCar kiểm soát danh sách này — chủ xe KHÔNG được tự tạo topic ngoài danh sách.
 */
export const ALLOWED_CUSTOM_TERM_TOPICS = [
  {
    id: 'no_smoking',
    label: 'Không hút thuốc trong xe',
    placeholder: 'Ví dụ: Nghiêm cấm hút thuốc lá, thuốc lào và các sản phẩm có khói trong xe. Vi phạm phạt vệ sinh 500.000đ.',
    maxLength: 300,
  },
  {
    id: 'no_pets',
    label: 'Không chở thú cưng',
    placeholder: 'Ví dụ: Không chở thú cưng (chó, mèo, ...) lên xe. Vi phạm phạt vệ sinh 500.000đ.',
    maxLength: 300,
  },
  {
    id: 'fuel_policy',
    label: 'Quy định nhiên liệu',
    placeholder: 'Ví dụ: Bên B phải trả xe với mức nhiên liệu không thấp hơn khi nhận xe. Thiếu hụt tính theo giá thực tế + 50.000đ phí đổ xăng.',
    maxLength: 400,
  },
  {
    id: 'travel_area',
    label: 'Giới hạn địa bàn di chuyển',
    placeholder: 'Ví dụ: Chỉ được di chuyển trong phạm vi tỉnh/thành phố. Ra ngoài tỉnh cần thông báo và được chấp thuận trước.',
    maxLength: 400,
  },
  {
    id: 'mileage_limit',
    label: 'Giới hạn km/ngày',
    placeholder: 'Ví dụ: Giới hạn 200km/ngày. Vượt quá tính thêm 3.000đ/km.',
    maxLength: 300,
  },
  {
    id: 'parking_rules',
    label: 'Quy định đỗ xe & bảo quản',
    placeholder: 'Ví dụ: Không đậu xe dưới trời mưa lớn hoặc nơi ngập lụt. Ưu tiên đỗ trong bãi có mái che.',
    maxLength: 300,
  },
  {
    id: 'return_condition',
    label: 'Điều kiện trả xe',
    placeholder: 'Ví dụ: Xe phải được vệ sinh sạch sẽ (nội thất + ngoại thất) trước khi trả. Không sạch phạt 300.000đ.',
    maxLength: 400,
  },
  {
    id: 'additional_driver',
    label: 'Quy định người lái phụ',
    placeholder: 'Ví dụ: Chỉ người thuê xe trong hợp đồng mới được lái xe. Người lái phụ phải đăng ký và được chấp thuận trước.',
    maxLength: 300,
  },
];

// Tạo mã hợp đồng tự động: HD-YYYY-XXXXX
const generateContractCode = (contractId) => {
  const year = new Date().getFullYear();
  const seq = String(contractId).padStart(5, '0');
  return `HD-${year}-${seq}`;
};

export const contractModel = {
  /**
   * Tạo hợp đồng từ booking đã được thanh toán cọc giữ chỗ
   * Gọi ngay sau khi booking.create() thành công
   */
  create: async (bookingId, isPaid = false) => {
    const p = await getPool();
    const bookingIdInt = parseInt(bookingId);

    // Lấy thông tin booking
    const bookingRes = await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .query(`
        SELECT b.*, 
               v.deposit_amount as vehicle_deposit,
               v.owner_id
         FROM Booking b
         LEFT JOIN Vehicle v ON b.vehicle_id = v.vehicle_id
         WHERE b.booking_id = @bookingId
      `);

    if (bookingRes.recordset.length === 0) {
      throw new Error('Booking không tồn tại.');
    }

    const booking = bookingRes.recordset[0];

    const RESERVATION_FEE = 500000;            // 500k cọc giữ chỗ online
    const DEPOSIT_AMOUNT = 5000000;            // 5tr cọc bảo đảm tài sản
    // Tiền trả trước khi nhận xe = tổng tiền thuê + cọc bảo đảm - cọc giữ chỗ đã trả
    const rentalPrice = Number(booking.rental_price);
    const prepaymentAmount = rentalPrice + DEPOSIT_AMOUNT - RESERVATION_FEE;

    // Điều khoản mặc định - snapshot tại thời điểm tạo
    const termsSnapshot = {
      platformName: 'ViVuCar',
      version: '1.0',
      generatedAt: new Date().toISOString(),
      cancellationPolicy: 'Hủy chuyến miễn phí trong vòng 1 giờ sau khi đặt cọc giữ xe thành công (trừ trường hợp sát giờ nhận xe dưới 6 tiếng). Hủy trước giờ khởi hành > 24 giờ: Khách hàng chịu phí hủy chuyến tương đương 30% giá trị cọc giữ xe (hoàn trả 70%). Hủy chuyến trong vòng 24 giờ trước giờ nhận xe: Khách hàng chịu phí hủy chuyến tương đương 100% giá trị cọc giữ xe (không hoàn trả).',
      damagePolicy: 'Bên B phải chịu trách nhiệm bồi thường hoàn toàn đối với mọi thiệt hại vật chất, trầy xước, móp méo thân vỏ xe xảy ra trong suốt thời gian thuê xe. Trong trường hợp xảy ra tai nạn nghiêm trọng: (1) Bên B có trách nhiệm giữ nguyên hiện trường và liên hệ ngay với CSKH ViVuCar cùng bên bảo hiểm trong vòng 15 phút. (2) Bên B chịu chi phí khấu trừ bảo hiểm tối thiểu 2.000.000đ/vụ việc và tiền thuê xe trong những ngày xe nằm xưởng sửa chữa (tối đa 15 ngày). (3) Nếu xe bị hư hỏng do lỗi cố ý hoặc lái xe khi có nồng độ cồn vượt quá quy định pháp luật, Bên B bồi thường 100% chi phí sửa chữa thực tế.',
      lateReturnPolicy: 'Bên B có nghĩa vụ hoàn trả phương tiện đúng thời gian quy định. Phí trả xe muộn giờ (Late Return Fee): Dưới 1 giờ: Miễn phí nếu thông báo trước 30 phút. Từ 1 đến 5 giờ: Phụ phí 100.000đ/giờ. Từ 5 giờ trở lên hoặc qua đêm: Tính thêm 1 ngày thuê xe theo bảng giá hiện tại. Trong trường hợp Bên B tự ý giữ xe quá 12 giờ mà không thông báo và không liên lạc được, Bên A có quyền báo cơ quan chức năng cứu hộ xe và áp dụng hình phạt chiếm đoạt tài sản.',
      trafficViolationPolicy: 'Bên B chịu trách nhiệm chi trả 100% tiền phạt đối với các lỗi vi phạm luật giao thông đường bộ phát sinh trong thời gian thuê xe (bao gồm cả phạt nguội được ghi nhận bởi camera giao thông). Khi nhận được thông báo phạt nguội từ cơ quan chức năng hoặc từ ViVuCar, Bên B có nghĩa vụ thanh toán trực tiếp hoặc ủy quyền khấu trừ từ tiền cọc bảo đảm. ViVuCar có quyền cung cấp thông tin định danh của Bên B cho cơ quan công an để phối hợp xử lý.',
      refundPolicy: 'Tiền cọc bảo đảm tài sản 5.000.000đ (hoặc tài sản thế chấp tương đương) sẽ được ViVuCar phong tỏa tạm thời. Khoản cọc này sẽ được hoàn trả 100% sau 3 ngày làm việc kể từ thời điểm trả xe thành công nếu không phát sinh: (1) Trả xe muộn giờ, (2) Xe bị bẩn hoặc có mùi hôi (phạt vệ sinh 200.000đ - 500.000đ), (3) Thiếu hụt nhiên liệu so với ban đầu (tính theo giá xăng thực tế + 100.000đ phí dịch vụ đổ xăng), (4) Va quẹt trầy xước hoặc các lỗi phạt nguội đang chờ xử lý.',
    };

    const reservationPaidAt = isPaid ? new Date() : null;

    // Insert contract (chưa có contract_id nên dùng SCOPE_IDENTITY)
    const insertRes = await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .input('contractCode', sql.NVarChar, 'TEMP') // update sau
      .input('reservationFee', sql.Decimal(18, 2), RESERVATION_FEE)
      .input('reservationPaidAt', sql.DateTime2, reservationPaidAt)
      .input('prepaymentAmount', sql.Decimal(18, 2), prepaymentAmount)
      .input('prepaymentDueDate', sql.DateTime2, new Date(booking.start_datetime))
      .input('depositAmount', sql.Decimal(18, 2), DEPOSIT_AMOUNT)
      .input('termsSnapshot', sql.NVarChar, JSON.stringify(termsSnapshot))
      .query(`
        INSERT INTO RentalContract 
          (booking_id, contract_code, reservation_fee, reservation_paid_at,
           prepayment_amount, prepayment_due_date, deposit_amount,
           terms_snapshot, status, created_at, updated_at)
        VALUES 
          (@bookingId, @contractCode, @reservationFee, @reservationPaidAt,
           @prepaymentAmount, @prepaymentDueDate, @depositAmount,
           @termsSnapshot, 'Draft', GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() AS contract_id;
      `);

    const contractId = insertRes.recordset[0].contract_id;
    const contractCode = generateContractCode(contractId);

    // Cập nhật lại mã hợp đồng thực
    await p.request()
      .input('contractId', sql.Int, contractId)
      .input('contractCode', sql.NVarChar, contractCode)
      .query('UPDATE RentalContract SET contract_code = @contractCode WHERE contract_id = @contractId');

    return contractModel.findById(String(contractId));
  },

  /** Lấy contract theo ID */
  findById: async (contractId) => {
    const p = await getPool();
    const res = await p.request()
      .input('contractId', sql.Int, parseInt(contractId))
      .query('SELECT * FROM RentalContract WHERE contract_id = @contractId');
    if (res.recordset.length === 0) return null;
    return mapContractRow(res.recordset[0]);
  },

  /** Lấy contract theo bookingId */
  findByBookingId: async (bookingId) => {
    const p = await getPool();
    const res = await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .query('SELECT * FROM RentalContract WHERE booking_id = @bookingId');
    if (res.recordset.length === 0) return null;
    return mapContractRow(res.recordset[0]);
  },

  /** Lấy tất cả contracts (admin) */
  findMany: async () => {
    const p = await getPool();
    const res = await p.request()
      .query('SELECT * FROM RentalContract ORDER BY created_at DESC');
    return res.recordset.map(mapContractRow);
  },

  /**
   * Người thuê ký hợp đồng
   * → Status: Draft → RenterSigned
   */
  renterSign: async (bookingId, renterId, ipAddress) => {
    const p = await getPool();
    const bookingIdInt = parseInt(bookingId);

    const contractRes = await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .query('SELECT * FROM RentalContract WHERE booking_id = @bookingId');

    if (contractRes.recordset.length === 0) throw new Error('Hợp đồng không tồn tại.');
    const contract = contractRes.recordset[0];

    if (contract.renter_signed_at) throw new Error('Người thuê đã ký hợp đồng này rồi.');
    if (contract.status === 'Cancelled') throw new Error('Hợp đồng đã bị hủy.');

    const newStatus = contract.owner_signed_at ? 'BothSigned' : 'RenterSigned';

    await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .input('renterIp', sql.NVarChar, ipAddress || '0.0.0.0')
      .input('newStatus', sql.NVarChar, newStatus)
      .query(`
        UPDATE RentalContract 
        SET renter_signed_at = GETDATE(), renter_ip = @renterIp, 
            status = @newStatus, updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);

    // Nếu cả 2 đã ký → kích hoạt booking
    if (newStatus === 'BothSigned') {
      await p.request()
        .input('bookingId', sql.Int, bookingIdInt)
        .query(`UPDATE Booking SET status = 'Approved', updated_at = GETDATE() WHERE booking_id = @bookingId`);
    }

    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Chủ xe ký hợp đồng
   * → Status: RenterSigned → BothSigned (hoặc Draft → BothSigned nếu ký trước)
   * Khi BothSigned → Booking chuyển Approved
   */
  ownerSign: async (bookingId, ownerId, ipAddress) => {
    const p = await getPool();
    const bookingIdInt = parseInt(bookingId);

    const contractRes = await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .query('SELECT * FROM RentalContract WHERE booking_id = @bookingId');

    if (contractRes.recordset.length === 0) throw new Error('Hợp đồng không tồn tại.');
    const contract = contractRes.recordset[0];

    if (contract.owner_signed_at) throw new Error('Chủ xe đã ký hợp đồng này rồi.');
    if (contract.status === 'Cancelled') throw new Error('Hợp đồng đã bị hủy.');

    const newStatus = contract.renter_signed_at ? 'BothSigned' : 'OwnerSigned';

    await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .input('ownerIp', sql.NVarChar, ipAddress || '0.0.0.0')
      .input('newStatus', sql.NVarChar, newStatus)
      .query(`
        UPDATE RentalContract 
        SET owner_signed_at = GETDATE(), owner_ip = @ownerIp, 
            status = @newStatus, updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);

    // Nếu cả 2 đã ký → kích hoạt booking
    if (newStatus === 'BothSigned') {
      await p.request()
        .input('bookingId', sql.Int, bookingIdInt)
        .query(`UPDATE Booking SET status = 'Approved', updated_at = GETDATE() WHERE booking_id = @bookingId`);
    }

    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Xác nhận đã thanh toán trước khi nhận xe (prepayment)
   * Gọi khi admin/CSKH xác nhận hoặc khi người thuê trả tại bãi
   */
  confirmPrepayment: async (bookingId, method) => {
    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .input('method', sql.NVarChar, method || 'Cash')
      .query(`
        UPDATE RentalContract 
        SET prepayment_paid_at = GETDATE(), prepayment_method = @method, updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);
    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Hoàn trả tiền cọc sau khi trả xe
   */
  confirmDepositRefund: async (bookingId) => {
    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .query(`
        UPDATE RentalContract 
        SET deposit_refund_at = GETDATE(), status = 'Completed', updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);
    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Thêm phụ phí phát sinh (admin/CSKH)
   * Ví dụ: hư hỏng, trả muộn, phạt nguội
   */
  addSurcharge: async (bookingId, amount, reason, addedBy) => {
    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .input('amount', sql.Decimal(18, 2), parseFloat(amount))
      .input('reason', sql.NVarChar, reason)
      .input('addedBy', sql.Int, parseInt(addedBy))
      .query(`
        UPDATE RentalContract 
        SET surcharge_amount = surcharge_amount + @amount,
            surcharge_reason = ISNULL(surcharge_reason + N'; ', '') + @reason,
            surcharge_added_at = GETDATE(),
            surcharge_added_by = @addedBy,
            updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);
    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Chủ xe bổ sung điều khoản riêng vào hợp đồng
   * Chỉ được phép khi status = 'Draft' (trước khi người thuê ký)
   * @param {string} bookingId
   * @param {string} ownerId - id của chủ xe (để verify quyền)
   * @param {Array} customTerms - Mảng tối đa 3 phần tử: [{topicId, content}]
   */
  updateOwnerTerms: async (bookingId, ownerId, customTerms) => {
    const p = await getPool();
    const bookingIdInt = parseInt(bookingId);

    // 1. Lấy hợp đồng hiện tại
    const contractRes = await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .query('SELECT * FROM RentalContract WHERE booking_id = @bookingId');

    if (contractRes.recordset.length === 0) throw new Error('Hợp đồng không tồn tại.');
    const contract = contractRes.recordset[0];

    // 2. Chỉ được chỉnh sửa khi còn Draft
    if (contract.status !== 'Draft') {
      throw new Error('Không thể chỉnh sửa điều khoản sau khi hợp đồng đã được ký. Vui lòng liên hệ CSKH ViVuCar.');
    }

    // 3. Validate danh sách điều khoản
    if (!Array.isArray(customTerms)) throw new Error('Dữ liệu điều khoản không hợp lệ.');
    if (customTerms.length > 3) throw new Error('Chỉ được phép thêm tối đa 3 điều khoản bổ sung.');

    const allowedTopicIds = ALLOWED_CUSTOM_TERM_TOPICS.map(t => t.id);
    const seenTopics = new Set();

    for (const term of customTerms) {
      if (!term.topicId || !term.content) {
        throw new Error('Mỗi điều khoản phải có chủ đề và nội dung.');
      }
      if (!allowedTopicIds.includes(term.topicId)) {
        throw new Error(`Chủ đề điều khoản "${term.topicId}" không nằm trong danh sách được phép của ViVuCar.`);
      }
      if (seenTopics.has(term.topicId)) {
        throw new Error(`Không được thêm 2 điều khoản trùng chủ đề "${term.topicId}".`);
      }
      const topicConfig = ALLOWED_CUSTOM_TERM_TOPICS.find(t => t.id === term.topicId);
      const content = String(term.content).trim();
      if (content.length < 10) {
        throw new Error(`Nội dung điều khoản "${topicConfig.label}" quá ngắn (tối thiểu 10 ký tự).`);
      }
      if (content.length > topicConfig.maxLength) {
        throw new Error(`Nội dung điều khoản "${topicConfig.label}" vượt quá ${topicConfig.maxLength} ký tự.`);
      }
      seenTopics.add(term.topicId);
    }

    // 4. Gộp điều khoản bổ sung vào termsSnapshot hiện tại
    const existingSnapshot = contract.terms_snapshot ? JSON.parse(contract.terms_snapshot) : {};
    const updatedSnapshot = {
      ...existingSnapshot,
      ownerCustomTerms: customTerms.map(t => ({
        topicId: t.topicId,
        topicLabel: ALLOWED_CUSTOM_TERM_TOPICS.find(cfg => cfg.id === t.topicId)?.label || t.topicId,
        content: String(t.content).trim(),
        addedAt: new Date().toISOString(),
      })),
      ownerTermsUpdatedAt: new Date().toISOString(),
    };

    await p.request()
      .input('bookingId', sql.Int, bookingIdInt)
      .input('termsSnapshot', sql.NVarChar, JSON.stringify(updatedSnapshot))
      .query(`
        UPDATE RentalContract 
        SET terms_snapshot = @termsSnapshot, updated_at = GETDATE()
        WHERE booking_id = @bookingId
      `);

    return contractModel.findByBookingId(String(bookingId));
  },

  /**
   * Lấy danh sách chủ đề điều khoản được phép (dùng cho frontend dropdown)
   */
  getCustomTermTopics: () => ALLOWED_CUSTOM_TERM_TOPICS,

  /**
   * Hủy hợp đồng (khi booking bị cancel)
   */
  cancel: async (bookingId) => {
    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .query(`
        UPDATE RentalContract 
        SET status = 'Cancelled', updated_at = GETDATE()
        WHERE booking_id = @bookingId AND status NOT IN ('Completed', 'Cancelled')
      `);
  },

  /**
   * Đồng bộ hóa trạng thái cọc đã thanh toán từ Booking sang RentalContract
   */
  syncReservationPaid: async (bookingId) => {
    const p = await getPool();
    await p.request()
      .input('bookingId', sql.Int, parseInt(bookingId))
      .query(`
        UPDATE RentalContract 
        SET reservation_paid_at = GETDATE(), updated_at = GETDATE()
        WHERE booking_id = @bookingId AND reservation_paid_at IS NULL
      `);
  },
};
