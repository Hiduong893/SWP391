import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { askChatbotAI } from '../utils/aiHelper.js';

const router = express.Router();

// 1. Create support ticket
router.post('/api/support/tickets', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Vui lòng điền tiêu đề và nội dung yêu cầu hỗ trợ.' });
    }

    const ticket = await db.support_tickets.create({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      subject,
      message
    });

    res.status(201).json({
      message: 'Gửi yêu cầu hỗ trợ thành công! Nhân viên chăm sóc khách hàng sẽ phản hồi trong chốc lát.',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo ticket hỗ trợ.' });
  }
});

// 2. Get user's support tickets
router.get('/api/support/tickets', auth, async (req, res) => {
  try {
    const tickets = await db.support_tickets.findMany({ userId: req.user.id });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải danh sách yêu cầu hỗ trợ.' });
  }
});

// 3. Resolve support ticket
router.put('/api/support/tickets/:id/resolve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.support_tickets.findOne({ id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: 'Yêu cầu hỗ trợ không tồn tại.' });

    await db.support_tickets.update(id, { status: 'resolved' });
    res.json({ message: 'Đã đóng yêu cầu hỗ trợ thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đóng ticket.' });
  }
});

// 4. Create booking dispute
router.post('/api/support/disputes', auth, async (req, res) => {
  try {
    const { bookingId, description } = req.body;
    if (!bookingId || !description) return res.status(400).json({ message: 'Thiếu thông tin khiếu nại.' });

    const booking = await db.bookings.findOne({ id: bookingId });
    if (!booking) return res.status(404).json({ message: 'Đơn đặt xe không tồn tại.' });

    const car = await db.cars.findOne({ id: booking.carId });
    if (!car) return res.status(400).json({ message: 'Không tìm thấy xe.' });

    const dispute = await db.disputes.create({
      bookingId,
      renterId: req.user.id,
      ownerId: car.ownerId || 'admin',
      description
    });

    await db.bookings.update(bookingId, { status: 'disputed' });

    res.json({ message: 'Nộp đơn khiếu nại lên ban CSKH thành công. Trạng thái chuyến đi chuyển sang: Tranh Chấp.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi nộp đơn khiếu nại.' });
  }
});

// --- AI SUPPORT CHATBOT API ---
// --- AI SUPPORT CHATBOT API (Enhanced with Google Gen AI SDK & Personalization) ---
router.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Thiếu nội dung tin nhắn.' });
    }

    // 1. Optional Authentication check to fetch personal user profile, wallet, and bookings
    let userContext = {};
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'swp391-super-secret-key-12345';
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await db.users.findOne({ id: decoded.userId });
          if (user) {
            // Fetch their bookings details to include in context
            const myBookings = await db.bookings.findMany({ renterId: user.id });
            let bookingsStr = "";
            if (myBookings.length > 0) {
              const bookingsInfo = await Promise.all(myBookings.map(async b => {
                const car = await db.cars.findOne({ id: b.carId });
                const carName = car ? `${car.brand} ${car.model}` : `Xe ID ${b.carId}`;
                const start = new Date(b.pickupDate || b.start_datetime).toLocaleDateString('vi-VN');
                const end = new Date(b.returnDate || b.end_datetime).toLocaleDateString('vi-VN');
                return `- Đơn đặt xe ID ${b.id}: Xe ${carName}, từ ${start} đến ${end}, Trạng thái đơn: ${b.status}, Tổng chi phí: ${Number(b.totalAmount).toLocaleString('vi-VN')}đ`;
              }));
              bookingsStr = bookingsInfo.join('\n');
            } else {
              bookingsStr = "Không có lịch sử chuyến đi nào.";
            }

            userContext = {
              name: user.name,
              email: user.email,
              role: user.role,
              walletBalance: user.walletBalance || 0,
              bankLinked: !!user.bankAccount,
              kycStatus: user.licenseStatus || 'not_uploaded',
              activeBookings: bookingsStr
            };
          }
        } catch (authError) {
          console.warn("Chatbot optional auth decoding failed:", authError.message);
        }
      }
    }

    // 2. Fetch real-time cars and booking schedules from database for context injection
    let carsContext = "";
    try {
      const activeCars = await db.cars.findMany();
      const allBookings = await db.bookings.findMany();
      
      const lines = [];
      activeCars.forEach(car => {
        if (car.status !== 'available' && car.status !== 'rented') return;
        
        const carBookings = allBookings.filter(b => 
          b.carId === car.id && 
          !['cancelled', 'rejected'].includes(b.status.toLowerCase())
        );
        
        let scheduleStr = "";
        if (carBookings.length > 0) {
          scheduleStr = carBookings.map(b => {
            const start = new Date(b.pickupDate || b.start_datetime).toLocaleDateString('vi-VN');
            const end = new Date(b.returnDate || b.end_datetime).toLocaleDateString('vi-VN');
            return `từ ${start} đến ${end} (${b.status})`;
          }).join(', ');
        } else {
          scheduleStr = "Trống lịch hoàn toàn";
        }
        
        lines.push(`- Xe ID ${car.id}: ${car.brand} ${car.model} (${car.seats} chỗ, truyền động ${car.transmission}, nhiên liệu ${car.fuel}, khu vực ${car.location}, Biển số ${car.plateNumber || car.license_plate}, Giá ${car.pricePerDay.toLocaleString('vi-VN')} VND/ngày). Lịch đã bận: ${scheduleStr}.`);
      });
      carsContext = lines.join('\n');
    } catch (dbError) {
      console.error("Failed to query database for chatbot context:", dbError);
    }

    // 3. Query Gemini AI using the official SDK
    const reply = await askChatbotAI(message, history, userContext, { activeCars: carsContext });
    res.json({ reply });
  } catch (error) {
    console.error('Chatbot API Error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống xử lý chatbot.' });
  }
});

// 5. User reply to ticket
router.post('/api/support/tickets/:id/reply', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });
    }

    const ticket = await db.support_tickets.findOne({ id, userId: req.user.id });
    if (!ticket) {
      return res.status(404).json({ message: 'Yêu cầu hỗ trợ không tồn tại.' });
    }

    const replies = [...(ticket.replies || []), {
      senderId: String(req.user.id),
      senderName: req.user.name,
      senderRole: req.user.role,
      message: replyText,
      sentAt: new Date().toISOString()
    }];

    await db.support_tickets.update(id, {
      replies,
      status: 'open'
    });

    const updatedTicket = await db.support_tickets.findOne({ id });
    res.json({ message: 'Gửi phản hồi thành công!', ticket: updatedTicket });
  } catch (error) {
    console.error("Error in user reply to ticket:", error);
    res.status(500).json({ message: 'Lỗi gửi phản hồi.' });
  }
});

export default router;
