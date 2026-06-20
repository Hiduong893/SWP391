import { sql, getPool } from '../config/db.js';

export const mapBookingRow = async (p, row) => {
  const carRes = await p.request().input('vehicleId', sql.Int, row.vehicle_id)
    .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @vehicleId');
  const isOwnerCar = carRes.recordset.length > 0 && carRes.recordset[0].owner_id !== null;

  let mappedStatus = 'pending';
  if (row.status === 'Pending') {
    mappedStatus = isOwnerCar ? 'pending_owner' : 'pending';
  } else if (row.status === 'Approved') {
    mappedStatus = 'confirmed';
  } else if (row.status === 'Active') {
    mappedStatus = 'active';
  } else if (row.status === 'Completed') {
    mappedStatus = 'completed';
  } else if (row.status === 'Cancelled') {
    mappedStatus = 'cancelled';
  } else if (row.status === 'Rejected') {
    mappedStatus = 'rejected';
  }

  const payRes = await p.request().input('bookingId', sql.Int, row.booking_id)
    .query('SELECT TOP 1 payment_method, status FROM Payment WHERE booking_id = @bookingId ORDER BY created_at DESC');
  const paymentMethod = payRes.recordset.length > 0 ? payRes.recordset[0].payment_method.toLowerCase() : 'bank_transfer';
  const paymentStatus = payRes.recordset.length > 0 ? payRes.recordset[0].status.toLowerCase() : 'pending';

  return {
    id: String(row.booking_id),
    userId: String(row.renter_id),
    carId: String(row.vehicle_id),
    pickupDate: row.start_datetime ? new Date(row.start_datetime).toISOString() : '',
    returnDate: row.end_datetime ? new Date(row.end_datetime).toISOString() : '',
    pickupLocation: row.pickup_address,
    totalPrice: Number(row.rental_price),
    depositAmount: Number(row.deposit_amount),
    depositStatus: paymentStatus,
    status: mappedStatus,
    paymentMethod: paymentMethod,
    handoverDocs: row.handover_docs ? JSON.parse(row.handover_docs) : { pickup: null, return: null },
    issueReport: row.issue_report ? JSON.parse(row.issue_report) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

export const bookingModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = 'SELECT b.* FROM Booking b';
    let where = [];
    const request = p.request();

    if (filter.userId !== undefined && filter.userId !== '') {
      where.push('b.renter_id = @userId');
      request.input('userId', sql.Int, parseInt(filter.userId));
    }
    if (filter.carId !== undefined && filter.carId !== '') {
      where.push('b.vehicle_id = @carId');
      request.input('carId', sql.Int, parseInt(filter.carId));
    }
    if (filter.status !== undefined && filter.status !== '') {
      const dbStatusMap = {
        'pending_owner': 'Pending',
        'pending': 'Pending',
        'confirmed': 'Approved',
        'active': 'Active',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rejected': 'Rejected'
      };
      const dbStatus = dbStatusMap[filter.status] || filter.status;
      where.push('b.status = @status');
      request.input('status', sql.NVarChar, dbStatus);
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY b.created_at DESC';

    const res = await request.query(query);
    return Promise.all(res.recordset.map(async (row) => await mapBookingRow(p, row)));
  },
  findOne: async (filter) => {
    const p = await getPool();
    let query = 'SELECT b.* FROM Booking b';
    let where = [];
    const request = p.request();

    if (filter.id) {
      where.push('b.booking_id = @id');
      request.input('id', sql.Int, parseInt(filter.id));
    }

    if (where.length === 0) return null;
    query += ' WHERE ' + where.join(' AND ');
    const res = await request.query(query);
    if (res.recordset.length === 0) return null;
    return await mapBookingRow(p, res.recordset[0]);
  },
  create: async (bookingData) => {
    const p = await getPool();

    const renterId = parseInt(bookingData.userId);
    const vehicleId = parseInt(bookingData.carId);

    const carRes = await p.request().input('vehicleId', sql.Int, vehicleId)
      .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @vehicleId');
    const isOwnerCar = carRes.recordset.length > 0 && carRes.recordset[0].owner_id !== null;

    const status = isOwnerCar ? 'Pending' : 'Approved';
    const price = parseInt(bookingData.totalPrice);
    const deposit = 5000000;

    // Check wallet balance if paymentMethod is wallet
    if (bookingData.paymentMethod === 'wallet') {
      const walletRes = await p.request()
        .input('userId', sql.Int, renterId)
        .query('SELECT balance FROM Wallet WHERE user_id = @userId');
      if (walletRes.recordset.length === 0 || Number(walletRes.recordset[0].balance) < 500000) {
        throw new Error('Số dư ví không đủ để thanh toán giữ chỗ (500.000đ).');
      }
    }

    // Append time segments to ensure end_datetime > start_datetime even for same-day rentals
    const pickupDateTime = bookingData.pickupDate.includes(' ')
      ? bookingData.pickupDate
      : `${bookingData.pickupDate} 09:00:00`;
    const returnDateTime = bookingData.returnDate.includes(' ')
      ? bookingData.returnDate
      : `${bookingData.returnDate} 21:00:00`;

    const request = p.request()
      .input('renterId', sql.Int, renterId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('pickupDate', sql.VarChar, pickupDateTime)
      .input('returnDate', sql.VarChar, returnDateTime)
      .input('pickupLocation', sql.NVarChar, bookingData.pickupLocation)
      .input('price', sql.Decimal(18, 2), price)
      .input('deposit', sql.Decimal(18, 2), deposit)
      .input('status', sql.NVarChar, status);

    const insertBookingQuery = `
      INSERT INTO Booking (renter_id, vehicle_id, start_datetime, end_datetime, pickup_address, return_address, rental_price, deposit_amount, platform_fee, total_amount, status, created_at, updated_at)
      VALUES (@renterId, @vehicleId, CAST(@pickupDate AS DATETIME2), CAST(@returnDate AS DATETIME2), @pickupLocation, @pickupLocation, @price, @deposit, 0, @price + @deposit, @status, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as booking_id;
    `;
    const res = await request.query(insertBookingQuery);
    const bookingId = res.recordset[0].booking_id;

    // Update car status
    await p.request().input('vehicleId', sql.Int, vehicleId).query('UPDATE Vehicle SET status = \'Rented\' WHERE vehicle_id = @vehicleId');

    // If wallet payment, process wallet transaction (deduct 500,000 VND)
    if (bookingData.paymentMethod === 'wallet') {
      await p.request()
        .input('userId', sql.Int, renterId)
        .input('bookingId', sql.Int, bookingId)
        .input('amount', sql.Decimal(18, 2), 500000)
        .input('txnType', sql.NVarChar, 'BookingPayment')
        .input('description', sql.NVarChar, `Thanh toán phí giữ chỗ cho mã đặt xe #${bookingId}`)
        .query('EXEC usp_ProcessWalletTransaction @user_id = @userId, @booking_id = @bookingId, @amount = @amount, @txn_type = @txnType, @description = @description');
    }

    // Create Payment row
    const payRequest = p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('payerId', sql.Int, renterId)
      .input('amount', sql.Decimal(18, 2), bookingData.paymentMethod === 'wallet' ? 500000 : price + deposit)
      .input('method', sql.NVarChar, bookingData.paymentMethod || 'bank_transfer');
    await payRequest.query(`
      INSERT INTO Payment (booking_id, payer_id, amount, payment_type, payment_method, status, paid_at, created_at)
      VALUES (@bookingId, @payerId, @amount, 'RentalFee', @method, 'Success', GETDATE(), GETDATE());
    `);

    return await bookingModel.findOne({ id: String(bookingId) });
  },
  update: async (id, updateData) => {
    const p = await getPool();
    const bookingId = parseInt(id);

    let updates = [];
    const request = p.request().input('bookingId', sql.Int, bookingId);

    if (updateData.status !== undefined) {
      const dbStatusMap = {
        'pending_owner': 'Pending',
        'pending': 'Pending',
        'confirmed': 'Approved',
        'active': 'Active',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'rejected': 'Rejected'
      };
      const dbStatus = dbStatusMap[updateData.status] || updateData.status;
      updates.push('status = @status');
      request.input('status', sql.NVarChar, dbStatus);

      if (updateData.status === 'cancelled' || updateData.status === 'rejected') {
        await p.request().input('bookingId', sql.Int, bookingId).query(`
          UPDATE Vehicle SET status = 'Available'
          WHERE vehicle_id = (SELECT vehicle_id FROM Booking WHERE booking_id = @bookingId)
        `);
      }
    }
    if (updateData.handoverDocs !== undefined) {
      updates.push('handover_docs = @handoverDocs');
      request.input('handoverDocs', sql.NVarChar, JSON.stringify(updateData.handoverDocs));
    }
    if (updateData.issueReport !== undefined) {
      updates.push('issue_report = @issueReport');
      request.input('issueReport', sql.NVarChar, JSON.stringify(updateData.issueReport));
    }
    if (updateData.depositStatus !== undefined) {
      const dbDepositStatusMap = {
        'pending': 'Pending',
        'paid': 'Paid',
        'success': 'Paid',
        'failed': 'Failed',
        'refunded': 'Refunded'
      };
      const dbDepositStatus = dbDepositStatusMap[updateData.depositStatus.toLowerCase()] || updateData.depositStatus;
      updates.push('payment_status = @depositStatus');
      request.input('depositStatus', sql.NVarChar, dbDepositStatus);

      await p.request()
        .input('bookingId', sql.Int, bookingId)
        .input('paymentStatus', sql.NVarChar, dbDepositStatus === 'Paid' ? 'Success' : dbDepositStatus)
        .query('UPDATE Payment SET status = @paymentStatus WHERE booking_id = @bookingId');
    }

    if (updates.length > 0) {
      await request.query(`UPDATE Booking SET ${updates.join(', ')}, updated_at = GETDATE() WHERE booking_id = @bookingId`);
    }

    return await bookingModel.findOne({ id: String(bookingId) });
  }
};

export const reviewModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = 'SELECT r.*, u.full_name as userName FROM Review r INNER JOIN [User] u ON r.reviewer_id = u.user_id';
    let where = [];
    const request = p.request();

    if (filter.carId) {
      where.push('r.vehicle_id = @carId');
      request.input('carId', sql.Int, parseInt(filter.carId));
    }
    if (filter.bookingId) {
      where.push('r.booking_id = @bookingId');
      request.input('bookingId', sql.Int, parseInt(filter.bookingId));
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC';

    const res = await request.query(query);
    return res.recordset.map(row => ({
      id: String(row.review_id),
      bookingId: String(row.booking_id),
      carId: String(row.vehicle_id),
      userId: String(row.reviewer_id),
      userName: row.userName,
      rating: row.rating_vehicle,
      comment: row.comment || '',
      status: row.is_visible === true || row.is_visible === 1 ? 'visible' : 'hidden',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    }));
  },
  create: async (reviewData) => {
    const p = await getPool();

    const bookingId = parseInt(reviewData.bookingId);
    const carId = parseInt(reviewData.carId);
    const userId = parseInt(reviewData.userId);
    const rating = parseInt(reviewData.rating) || 5;

    const ownerRes = await p.request().input('carId', sql.Int, carId)
      .query('SELECT owner_id FROM Vehicle WHERE vehicle_id = @carId');
    const ownerId = ownerRes.recordset.length > 0 ? (ownerRes.recordset[0].owner_id || 1) : 1;

    const request = p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('reviewerId', sql.Int, userId)
      .input('vehicleId', sql.Int, carId)
      .input('ownerId', sql.Int, ownerId)
      .input('rating', sql.Int, rating)
      .input('comment', sql.NVarChar, reviewData.comment || '');

    const insertReviewQuery = `
      INSERT INTO Review (booking_id, reviewer_id, vehicle_id, owner_id, rating_vehicle, rating_owner, comment, is_visible, created_at, updated_at)
      VALUES (@bookingId, @reviewerId, @vehicleId, @ownerId, @rating, @rating, @comment, 1, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as review_id;
    `;
    const res = await request.query(insertReviewQuery);
    const reviewId = res.recordset[0].review_id;

    const userRes = await p.request().input('userId', sql.Int, userId).query('SELECT full_name FROM [User] WHERE user_id = @userId');
    const userName = userRes.recordset[0].full_name;

    return {
      id: String(reviewId),
      bookingId: String(bookingId),
      carId: String(carId),
      userId: String(userId),
      userName,
      rating,
      comment: reviewData.comment || '',
      status: 'visible',
      createdAt: new Date().toISOString()
    };
  },
  update: async (id, updateData) => {
    const p = await getPool();
    const reviewId = parseInt(id);

    let updates = [];
    const request = p.request().input('reviewId', sql.Int, reviewId);
    if (updateData.status !== undefined) {
      updates.push('is_visible = @isVisible');
      request.input('isVisible', sql.Bit, updateData.status === 'visible' ? 1 : 0);
    }

    if (updates.length > 0) {
      await request.query(`UPDATE Review SET ${updates.join(', ')}, updated_at = GETDATE() WHERE review_id = @reviewId`);
    }

    const res = await p.request().input('reviewId', sql.Int, reviewId)
      .query('SELECT r.*, u.full_name as userName FROM Review r INNER JOIN [User] u ON r.reviewer_id = u.user_id WHERE r.review_id = @reviewId');
    const row = res.recordset[0];
    return {
      id: String(row.review_id),
      bookingId: String(row.booking_id),
      carId: String(row.vehicle_id),
      userId: String(row.reviewer_id),
      userName: row.userName,
      rating: row.rating_vehicle,
      comment: row.comment || '',
      status: row.is_visible ? 'visible' : 'hidden',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }
};

export const disputeModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = 'SELECT * FROM Complaint';
    let where = [];
    const request = p.request();

    if (filter.bookingId) {
      where.push('booking_id = @bookingId');
      request.input('bookingId', sql.Int, parseInt(filter.bookingId));
    }
    if (filter.renterId) {
      where.push('complainant_id = @renterId');
      request.input('renterId', sql.Int, parseInt(filter.renterId));
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }

    const res = await request.query(query);
    return res.recordset.map(row => ({
      id: String(row.complaint_id),
      bookingId: String(row.booking_id),
      renterId: String(row.complainant_id),
      ownerId: String(row.defendant_id),
      description: row.description,
      status: row.status.toLowerCase(),
      resolutionDetails: row.resolution ? { resolution: row.resolution, resolvedAt: row.resolved_at } : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    }));
  },
  create: async (disputeData) => {
    const p = await getPool();

    const bookingId = parseInt(disputeData.bookingId);
    const renterId = parseInt(disputeData.renterId);
    const ownerId = parseInt(disputeData.ownerId);
    const description = disputeData.description;

    const request = p.request()
      .input('bookingId', sql.Int, bookingId)
      .input('renterId', sql.Int, renterId)
      .input('ownerId', sql.Int, ownerId)
      .input('description', sql.NVarChar, description);

    const insertQuery = `
      INSERT INTO Complaint (booking_id, complainant_id, defendant_id, title, description, status, created_at, updated_at)
      VALUES (@bookingId, @renterId, @ownerId, 'Dispute', @description, 'Open', GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as complaint_id;
    `;
    const res = await request.query(insertQuery);
    const complaintId = res.recordset[0].complaint_id;

    return {
      id: String(complaintId),
      bookingId: String(bookingId),
      renterId: String(renterId),
      ownerId: String(ownerId),
      description,
      status: 'open',
      resolutionDetails: null,
      createdAt: new Date().toISOString()
    };
  },
  update: async (id, updateData) => {
    const p = await getPool();
    const complaintId = parseInt(id);

    let updates = [];
    const request = p.request().input('complaintId', sql.Int, complaintId);

    if (updateData.status !== undefined) {
      const dbStatus = updateData.status === 'resolved' ? 'Resolved' : 'Open';
      updates.push('status = @status');
      request.input('status', sql.NVarChar, dbStatus);
    }
    if (updateData.resolutionDetails !== undefined && updateData.resolutionDetails) {
      updates.push('resolution = @resolution, resolved_at = GETDATE()');
      request.input('resolution', sql.NVarChar, updateData.resolutionDetails.resolution || '');
    }

    if (updates.length > 0) {
      await request.query(`UPDATE Complaint SET ${updates.join(', ')}, updated_at = GETDATE() WHERE complaint_id = @complaintId`);
    }

    const res = await p.request().input('complaintId', sql.Int, complaintId).query('SELECT * FROM Complaint WHERE complaint_id = @complaintId');
    const row = res.recordset[0];
    return {
      id: String(row.complaint_id),
      bookingId: String(row.booking_id),
      renterId: String(row.complainant_id),
      ownerId: String(row.defendant_id),
      description: row.description,
      status: row.status.toLowerCase(),
      resolutionDetails: row.resolution ? { resolution: row.resolution, resolvedAt: row.resolved_at } : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }
};
