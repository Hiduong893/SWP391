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
      cancellationPolicy: 'Hủy trước 24h: Hoàn 70% cọc giữ chỗ. Hủy trong 24h: Không hoàn.',
      damagePolicy: 'Thiệt hại vật chất sẽ được khấu trừ từ tiền cọc bảo đảm.',
      lateReturnPolicy: 'Trả xe muộn dưới 2h: phụ phí 200.000đ. Từ 2h trở lên: tính thêm 1 ngày thuê.',
      trafficViolationPolicy: 'Phạt nguội phát sinh trong thời gian thuê do người thuê chịu hoàn toàn.',
      refundPolicy: 'Tiền cọc bảo đảm hoàn trả trong vòng 3 ngày làm việc sau khi trả xe không phát sinh.',
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

    const newStatus = contract.renter_signed_at ? 'BothSigned' : 'RenterSigned';

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
};
