import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// 13. GET Cars (Lấy danh sách xe với bộ lọc)
router.get('/api/cars', async (req, res) => {
  try {
    const { location, seats, transmission, fuel, search } = req.query;

    const filters = {};
    if (location) filters.location = location;
    if (seats) filters.seats = seats;
    if (transmission) filters.transmission = transmission;
    if (fuel) filters.fuel = fuel;

    let cars = await db.cars.findMany(filters);
    cars = cars.filter(car => car.status === 'available' || car.status === 'rented');

    if (search) {
      const keyword = search.toLowerCase();
      cars = cars.filter(car =>
        car.brand.toLowerCase().includes(keyword) ||
        car.model.toLowerCase().includes(keyword)
      );
    }

    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách xe.' });
  }
});

// 14. POST Cars (Ký gửi xe mới)
router.post('/api/cars', auth, async (req, res) => {
  try {
    const { brand, model, seats, transmission, fuel, pricePerDay, image, location, plateNumber, carPapers } = req.body;

    if (!brand || !model || !seats || !pricePerDay || !location || !plateNumber) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin ký gửi xe.' });
    }

    const newCar = await db.cars.create({
      brand,
      model,
      seats,
      transmission,
      fuel,
      pricePerDay,
      image,
      location,
      plateNumber,
      carPapers,
      ownerId: req.user.id
    });

    if (req.user.role === 'renter') {
      await db.users.update(req.user.id, { role: 'owner' });
    }

    res.status(201).json({
      message: 'Ký gửi xe thành công! Xe của bạn đang chờ CSKH/Admin phê duyệt kiểm duyệt chất lượng.',
      car: newCar
    });
  } catch (error) {
    console.error('List car error:', error);
    res.status(500).json({ message: 'Lỗi ký gửi xe.' });
  }
});

// View Owner's Cars
router.get('/api/owner/cars', auth, async (req, res) => {
  try {
    const cars = await db.cars.findMany({ ownerId: req.user.id });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách xe của bạn.' });
  }
});

// View Owner's Rental Requests and Earnings
router.get('/api/owner/stats', auth, async (req, res) => {
  try {
    const myCars = await db.cars.findMany({ ownerId: req.user.id });
    const carIds = myCars.map(c => c.id);

    const allBookings = await db.bookings.findMany();
    const myBookings = allBookings.filter(b => carIds.includes(b.carId));

    const detailedBookings = await Promise.all(myBookings.map(async (booking) => {
      const user = await db.users.findOne({ id: booking.userId }) || { name: 'Khách hàng ẩn' };
      const car = myCars.find(c => c.id === booking.carId);
      return {
        ...booking,
        userName: user.name,
        userEmail: user.email,
        carName: `${car.brand} ${car.model}`,
        carImage: car.image
      };
    }));

    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const totalEarnings = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    res.json({
      bookings: detailedBookings,
      totalEarnings,
      carsCount: myCars.length,
      bookingsCount: myBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy số liệu chủ xe.' });
  }
});

// Approve or Reject Rental Requests (Car Owner)
router.put('/api/owner/bookings/:id/approve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const booking = await db.bookings.findOne({ id });
    if (!booking) return res.status(404).json({ message: 'Yêu cầu đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car || car.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý đơn đặt xe này.' });
    }

    const newStatus = approved ? 'confirmed' : 'cancelled';
    await db.bookings.update(id, { status: newStatus });

    res.json({
      message: approved ? 'Đã phê duyệt yêu cầu đặt xe! Chuyến đi đã sẵn sàng.' : 'Đã từ chối đơn đặt xe và giải phóng phương tiện.',
      bookingStatus: newStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xét duyệt đơn đặt xe.' });
  }
});

// GET Car Reviews
router.get('/api/cars/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await db.reviews.findMany({ carId: id, status: 'visible' });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải đánh giá xe.' });
  }
});

export default router;
