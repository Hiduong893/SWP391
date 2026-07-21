import { sql, getPool } from '../config/db.js';

export const mapCarRow = (row) => {
  const statusMap = { 
    'Available': 'available', 
    'Rented': 'rented', 
    'Pending': 'pending_moderation', 
    'Rejected': 'rejected',
    'Inactive': 'inactive',
    'Maintenance': 'maintenance'
  };
  const mappedStatus = statusMap[row.status] || 'available';

  return {
    id: String(row.vehicle_id),
    brand: row.brand_name,
    model: row.model_name,
    seats: row.seat_count,
    transmission: row.transmission || 'Tự động',
    fuel: row.fuel || 'Xăng',
    pricePerDay: Number(row.daily_price),
    image: row.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    location: row.location_address,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    status: mappedStatus,
    plateNumber: row.license_plate,
    yearOfManufacture: Number(row.year_of_manufacture || 2023),
    odo: row.odo ? Number(row.odo) : null,
    carPapers: null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
};

export const carModel = {
  findMany: async (filter = {}) => {
    const p = await getPool();
    let query = `
      SELECT v.*, b.brand_name, c.category_name,
             (SELECT TOP 1 image_url FROM VehicleImage vi WHERE vi.vehicle_id = v.vehicle_id ORDER BY sort_order) as image,
             (SELECT TOP 1 r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = v.owner_id) as owner_role
      FROM Vehicle v
      INNER JOIN Brand b ON v.brand_id = b.brand_id
      INNER JOIN VehicleCategory c ON v.category_id = c.category_id
      WHERE v.is_active = 1
    `;
    let where = [];
    const request = p.request();

    if (filter.seats !== undefined && filter.seats !== '') {
      where.push('v.seat_count = @seats');
      request.input('seats', sql.Int, parseInt(filter.seats));
    }
    if (filter.transmission !== undefined && filter.transmission !== '') {
      where.push('v.transmission = @transmission');
      request.input('transmission', sql.NVarChar, filter.transmission);
    }
    if (filter.fuel !== undefined && filter.fuel !== '') {
      where.push('v.fuel = @fuel');
      request.input('fuel', sql.NVarChar, filter.fuel);
    }
    if (filter.location !== undefined && filter.location !== '') {
      where.push('v.location_address LIKE @location');
      request.input('location', sql.NVarChar, '%' + filter.location + '%');
    }
    if (filter.ownerId !== undefined && filter.ownerId !== null) {
      if (filter.ownerId === '') {
        where.push('v.owner_id IS NULL');
      } else {
        where.push('v.owner_id = @ownerId');
        request.input('ownerId', sql.Int, parseInt(filter.ownerId));
      }
    }
    if (filter.status !== undefined && filter.status !== '') {
      const dbStatusMap = { 'available': 'Available', 'rented': 'Rented', 'pending_moderation': 'Pending', 'rejected': 'Rejected' };
      const dbStatus = dbStatusMap[filter.status] || filter.status;
      where.push('v.status = @status');
      request.input('status', sql.NVarChar, dbStatus);
    }

    if (where.length > 0) {
      query += ' AND ' + where.join(' AND ');
    }

    const res = await request.query(query);
    return res.recordset.map(mapCarRow);
  },
  findOne: async (filter) => {
    const p = await getPool();
    let query = `
      SELECT v.*, b.brand_name, c.category_name,
             (SELECT TOP 1 image_url FROM VehicleImage vi WHERE vi.vehicle_id = v.vehicle_id ORDER BY sort_order) as image,
             (SELECT TOP 1 r.role_name FROM UserRole ur INNER JOIN Role r ON ur.role_id = r.role_id WHERE ur.user_id = v.owner_id) as owner_role
      FROM Vehicle v
      INNER JOIN Brand b ON v.brand_id = b.brand_id
      INNER JOIN VehicleCategory c ON v.category_id = c.category_id
    `;
    let where = [];
    const request = p.request();

    if (filter.id) {
      where.push('v.vehicle_id = @id');
      request.input('id', sql.Int, parseInt(filter.id));
    }

    if (where.length === 0) return null;
    query += ' WHERE ' + where.join(' AND ');
    const res = await request.query(query);
    if (res.recordset.length === 0) return null;
    return mapCarRow(res.recordset[0]);
  },
  create: async (carData) => {
    const p = await getPool();

    // Resolve Brand
    let brandRes = await p.request().input('brandName', sql.NVarChar, carData.brand)
      .query('SELECT brand_id FROM Brand WHERE brand_name = @brandName');
    let brandId;
    if (brandRes.recordset.length === 0) {
      const newBrand = await p.request().input('brandName', sql.NVarChar, carData.brand)
        .query('INSERT INTO Brand (brand_name, is_active) VALUES (@brandName, 1); SELECT SCOPE_IDENTITY() as brand_id');
      brandId = newBrand.recordset[0].brand_id;
    } else {
      brandId = brandRes.recordset[0].brand_id;
    }

    // Resolve Category
    const seats = parseInt(carData.seats) || 5;
    const catName = seats > 5 ? 'MPV' : 'Sedan';
    let catRes = await p.request().input('catName', sql.NVarChar, catName)
      .query('SELECT category_id FROM VehicleCategory WHERE category_name = @catName');
    let categoryId;
    if (catRes.recordset.length === 0) {
      const newCat = await p.request().input('catName', sql.NVarChar, catName)
        .query('INSERT INTO VehicleCategory (category_name, is_active) VALUES (@catName, 1); SELECT SCOPE_IDENTITY() as category_id');
      categoryId = newCat.recordset[0].category_id;
    } else {
      categoryId = catRes.recordset[0].category_id;
    }

    const ownerId = carData.ownerId ? parseInt(carData.ownerId) : null;
    const price = parseInt(carData.pricePerDay) || 800000;
    const deposit = 5000000; // Fixed deposit
    const status = ownerId ? 'Pending' : 'Available';
    const yearOfManufacture = parseInt(carData.yearOfManufacture) || 2023;
    const odo = carData.odo ? parseInt(carData.odo) : null;

    const request = p.request()
      .input('ownerId', sql.Int, ownerId)
      .input('brandId', sql.Int, brandId)
      .input('categoryId', sql.Int, categoryId)
      .input('model', sql.NVarChar, carData.model)
      .input('plateNumber', sql.VarChar, carData.plateNumber)
      .input('price', sql.Decimal(18, 2), price)
      .input('deposit', sql.Decimal(18, 2), deposit)
      .input('location', sql.NVarChar, carData.location)
      .input('transmission', sql.NVarChar, carData.transmission || 'Tự động')
      .input('fuel', sql.NVarChar, carData.fuel || 'Xăng')
      .input('yearOfManufacture', sql.Int, yearOfManufacture)
      .input('odo', sql.Int, odo)
      .input('seats', sql.Int, seats)
      .input('status', sql.NVarChar, status);

    const insertVehicleQuery = `
      INSERT INTO Vehicle (owner_id, brand_id, category_id, model_name, license_plate, year_of_manufacture, daily_price, deposit_amount, location_address, transmission, fuel, odo, seat_count, status, is_active, created_at, updated_at)
      VALUES (@ownerId, @brandId, @categoryId, @model, @plateNumber, @yearOfManufacture, @price, @deposit, @location, @transmission, @fuel, @odo, @seats, @status, 1, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() as vehicle_id;
    `;
    const res = await request.query(insertVehicleQuery);
    const vehicleId = res.recordset[0].vehicle_id;

    // Insert Primary Image
    if (carData.image) {
      await p.request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('image', sql.NVarChar, carData.image)
        .query('INSERT INTO VehicleImage (vehicle_id, image_url, is_primary, sort_order) VALUES (@vehicleId, @image, 1, 0)');
    }

    // Insert Car Papers document if any
    if (carData.carPapers) {
      await p.request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('docUrl', sql.NVarChar, carData.carPapers)
        .query('INSERT INTO VehicleDocument (vehicle_id, document_type, document_url) VALUES (@vehicleId, \'Registration\', @docUrl)');
    }

    return await carModel.findOne({ id: String(vehicleId) });
  },
  update: async (id, updateData) => {
    const p = await getPool();
    const vehicleId = parseInt(id);

    let updates = [];
    const request = p.request().input('vehicleId', sql.Int, vehicleId);

    if (updateData.brand !== undefined) {
      let brandRes = await p.request().input('brandName', sql.NVarChar, updateData.brand)
        .query('SELECT brand_id FROM Brand WHERE brand_name = @brandName');
      let brandId;
      if (brandRes.recordset.length === 0) {
        const newBrand = await p.request().input('brandName', sql.NVarChar, updateData.brand)
          .query('INSERT INTO Brand (brand_name, is_active) VALUES (@brandName, 1); SELECT SCOPE_IDENTITY() as brand_id');
        brandId = newBrand.recordset[0].brand_id;
      } else {
        brandId = brandRes.recordset[0].brand_id;
      }
      updates.push('brand_id = @brandId');
      request.input('brandId', sql.Int, brandId);
    }
    if (updateData.model !== undefined) {
      updates.push('model_name = @model');
      request.input('model', sql.NVarChar, updateData.model);
    }
    if (updateData.seats !== undefined) {
      updates.push('seat_count = @seats');
      request.input('seats', sql.Int, parseInt(updateData.seats));
    }
    if (updateData.pricePerDay !== undefined) {
      updates.push('daily_price = @price');
      request.input('price', sql.Decimal(18, 2), parseInt(updateData.pricePerDay));
    }
    if (updateData.location !== undefined) {
      updates.push('location_address = @location');
      request.input('location', sql.NVarChar, updateData.location);
    }
    if (updateData.transmission !== undefined) {
      updates.push('transmission = @transmission');
      request.input('transmission', sql.NVarChar, updateData.transmission);
    }
    if (updateData.fuel !== undefined) {
      updates.push('fuel = @fuel');
      request.input('fuel', sql.NVarChar, updateData.fuel);
    }
    if (updateData.status !== undefined) {
      const dbStatusMap = { 
        'available': 'Available', 
        'rented': 'Rented', 
        'pending_moderation': 'Pending', 
        'rejected': 'Rejected',
        'inactive': 'Inactive',
        'maintenance': 'Maintenance'
      };
      const dbStatus = dbStatusMap[updateData.status] || updateData.status;
      updates.push('status = @status');
      request.input('status', sql.NVarChar, dbStatus);
    }
    if (updateData.rejectionReason !== undefined) {
      updates.push('rejection_reason = @rejectionReason');
      request.input('rejectionReason', sql.NVarChar, updateData.rejectionReason);
    }
    if (updateData.yearOfManufacture !== undefined) {
      updates.push('year_of_manufacture = @yearOfManufacture');
      request.input('yearOfManufacture', sql.Int, parseInt(updateData.yearOfManufacture));
    }
    if (updateData.odo !== undefined) {
      updates.push('odo = @odo');
      request.input('odo', sql.Int, updateData.odo ? parseInt(updateData.odo) : null);
    }

    if (updates.length > 0) {
      await request.query(`UPDATE Vehicle SET ${updates.join(', ')}, updated_at = GETDATE() WHERE vehicle_id = @vehicleId`);
    }

    // Update image
    if (updateData.image !== undefined && updateData.image) {
      await p.request()
        .input('vehicleId', sql.Int, vehicleId)
        .input('image', sql.NVarChar, updateData.image)
        .query(`
          IF EXISTS (SELECT 1 FROM VehicleImage WHERE vehicle_id = @vehicleId AND is_primary = 1)
            UPDATE VehicleImage SET image_url = @image WHERE vehicle_id = @vehicleId AND is_primary = 1
          ELSE
            INSERT INTO VehicleImage (vehicle_id, image_url, is_primary) VALUES (@vehicleId, @image, 1)
        `);
    }

    return await carModel.findOne({ id: String(vehicleId) });
  },
  delete: async (id) => {
    const p = await getPool();
    const vehicleId = parseInt(id);
    
    // Check if bookings exist
    const bookingRes = await p.request().input('vehicleId', sql.Int, vehicleId)
      .query('SELECT COUNT(*) as cnt FROM Booking WHERE vehicle_id = @vehicleId');
    const hasBookings = bookingRes.recordset[0].cnt > 0;
    
    if (hasBookings) {
      // Soft delete by setting is_active = 0
      await p.request().input('vehicleId', sql.Int, vehicleId)
        .query('UPDATE Vehicle SET is_active = 0, updated_at = GETDATE() WHERE vehicle_id = @vehicleId');
    } else {
      // Hard delete
      await p.request().input('vehicleId', sql.Int, vehicleId).query(`
        DELETE FROM VehicleFeature WHERE vehicle_id = @vehicleId;
        DELETE FROM VehicleImage WHERE vehicle_id = @vehicleId;
        DELETE FROM VehicleDocument WHERE vehicle_id = @vehicleId;
        DELETE FROM Vehicle WHERE vehicle_id = @vehicleId;
      `);
    }
    return true;
  }
};
