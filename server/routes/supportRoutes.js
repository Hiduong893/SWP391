import express from 'express';
import { db } from '../models/index.js';
import { auth } from '../middleware/auth.js';

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
router.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Thiếu nội dung tin nhắn.' });
    }

    // Fetch real-time cars and booking schedules from database for context injection
    let carsContext = "";
    try {
      const activeCars = await db.cars.findMany();
      const allBookings = await db.bookings.findMany();
      
      carsContext = "DƯỚI ĐÂY LÀ THÔNG TIN DANH SÁCH XE VÀ LỊCH ĐÃ BẬN CỦA HỆ THỐNG VIVUCAR (HÃY SỬ DỤNG ĐỂ GIẢI ĐÁP CHÍNH XÁC KHI NGƯỜI DÙNG HỎI VỀ XE TRỐNG HOẶC ĐẶT XE THEO NGÀY):\n";
      
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
        
        carsContext += `- Xe ID ${car.id}: ${car.brand} ${car.model} (${car.seats} chỗ, truyền động ${car.transmission}, nhiên liệu ${car.fuel}, khu vực ${car.location}, Biển số ${car.plateNumber || car.license_plate}, Giá ${car.pricePerDay.toLocaleString('vi-VN')} VND/ngày). Lịch đã bận: ${scheduleStr}.\n`;
      });
    } catch (dbError) {
      console.error("Failed to query database for chatbot context:", dbError);
    }

    // Prepare contents history for Gemini API
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        const role = msg.role === 'user' ? 'user' : 'model';
        contents.push({
          role: role,
          parts: [{ text: msg.content || msg.text || '' }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{
                text: `Bạn là Trợ lý ảo thông minh của ViVuCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam.
Nhiệm vụ của bạn là giải đáp thắc mắc của người dùng về:
1. Danh sách xe và trạng thái trống lịch:
${carsContext}

2. Quy trình KYC: Để đặt xe, người thuê cần xác thực danh tính bằng lái xe và CCCD. Ảnh mặt trước CCCD phải có mã QR rõ ràng để quét đối chiếu họ tên thật trùng khớp với tài khoản đăng ký. Bằng lái xe sẽ được hệ thống duyệt tự động.
3. Ví điện tử & Nạp/Rút tiền: Người dùng có thể nạp tiền vào ví hoặc liên kết tài khoản ngân hàng để rút tiền. Khoản tiền đặt cọc giữ xe mặc định là 5.000.000đ.
4. Thanh toán: Hỗ trợ thanh toán qua Ví điện tử hoặc cổng thanh toán VNPAY (sandbox).
5. Ký gửi xe: Chủ xe có thể đăng tải thông tin xe nhàn rỗi kèm giấy tờ đăng ký để ký gửi cho thuê kiếm thêm thu nhập (Phí nền tảng là 5% trên doanh thu đặt xe).

HƯỚNG DẪN TRẢ LỜI LỊCH XE TRỐNG:
- Khi người dùng hỏi xe trống theo ngày/thời gian cụ thể (Ví dụ: "Ngày 20/06 đến 22/06 còn xe nào trống ở TP.HCM không?"), hãy đối chiếu ngày người dùng yêu cầu với lịch bận của các xe cùng khu vực được cung cấp ở trên.
- Chỉ đưa ra các xe thỏa mãn: Nằm ở khu vực/địa điểm người dùng hỏi và không bị trùng lịch bận (lịch đã bận).
- Nếu không có xe nào trống hoặc xe trùng lịch bận, hãy thông báo lịch bận của xe đó và gợi ý dòng xe khác hoặc ngày khác.
- Trình bày thông tin xe trống một cách rõ ràng (tên xe, số ghế, loại nhiên liệu, giá thuê, biển số).

Hãy trả lời một cách lịch sự, thân thiện, ngắn gọn và hữu ích bằng tiếng Việt. Xưng hô là 'ViVuCar' hoặc 'mình' và gọi khách hàng là 'bạn'.`
              }]
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return res.json({ reply: replyText });
          }
        } else {
          const errorText = await response.text();
          console.error(`Gemini API error: ${response.status} - ${errorText}`);
        }
      } catch (geminiError) {
        console.error('Gemini chatbot call failed, using rule-based fallback:', geminiError);
      }
    }

    // Rule-based Fallback Engine if Gemini API is unavailable or fails
    const lowerMessage = message.toLowerCase();
    let reply = '';
    if (lowerMessage.includes('kyc') || lowerMessage.includes('xác thực') || lowerMessage.includes('bằng lái') || lowerMessage.includes('cccd')) {
      reply = 'Để thuê xe trên ViVuCar, bạn cần hoàn tất xác thực KYC bằng cách tải lên ảnh CCCD (mặt trước có mã QR rõ nét để hệ thống quét đối chiếu họ tên) và ảnh Bằng lái xe trong phần "Hồ sơ". Hệ thống sẽ tự động phê duyệt nếu thông tin trùng khớp!';
    } else if (lowerMessage.includes('xe trống') || lowerMessage.includes('còn xe') || lowerMessage.includes('trống xe') || lowerMessage.includes('xe nào trống') || lowerMessage.includes('xe còn trống')) {
      // Build a dynamic list of cars and their schedules for the user
      try {
        const activeCars = await db.cars.findMany();
        const allBookings = await db.bookings.findMany();
        let listText = 'Hiện tại ViVuCar có các dòng xe tự lái sau đây cùng lịch bận:\n\n';
        
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
              return `${start} - ${end}`;
            }).join(', ');
            scheduleStr = `Bận lịch: ${scheduleStr}`;
          } else {
            scheduleStr = "Sẵn sàng cho thuê (Trống lịch)";
          }
          
          listText += `🚗 **${car.brand} ${car.model}** (${car.seats} chỗ, ${car.fuel}, địa điểm: ${car.location})\n  - Biển số: ${car.plateNumber || car.license_plate}\n  - Giá: ${car.pricePerDay.toLocaleString('vi-VN')}đ/ngày\n  - Trạng thái: ${scheduleStr}\n\n`;
        });
        
        reply = listText + '*(Lưu ý: Để tìm kiếm thông minh theo ngày cụ thể bằng AI, bạn vui lòng cấu hình GEMINI_API_KEY trong file .env)*';
      } catch (dbErr) {
        reply = 'Có lỗi xảy ra khi truy vấn danh sách xe trống từ cơ sở dữ liệu. Vui lòng thử lại sau!';
      }
    } else if (lowerMessage.includes('giá') || lowerMessage.includes('bao nhiêu') || lowerMessage.includes('chi phí')) {
      reply = 'Giá thuê xe tại ViVuCar dao động từ 700.000đ/ngày (dòng sedan phổ thông như Toyota Vios) đến 3.180.000đ/ngày (dòng xe cao cấp/MPV như Kia Carnival, Mercedes-Benz). Bạn có thể lọc xe theo giá tại trang "Tìm xe"!';
    } else if (lowerMessage.includes('thanh toán') || lowerMessage.includes('tiền') || lowerMessage.includes('vnpay') || lowerMessage.includes('chuyển cọc') || lowerMessage.includes('đặt cọc')) {
      reply = 'ViVuCar hỗ trợ thanh toán online qua cổng VNPAY Sandbox hoặc qua ví điện tử tích hợp trên hệ thống. Khi đặt xe, bạn cần đặt cọc trước một khoản phí giữ xe (5.000.000đ) để đảm bảo hành trình.';
    } else if (lowerMessage.includes('ví') || lowerMessage.includes('nạp tiền') || lowerMessage.includes('rút tiền') || lowerMessage.includes('ngân hàng')) {
      reply = 'Bạn có thể nạp tiền vào ví điện tử của mình để đặt xe nhanh chóng. Để rút tiền, bạn hãy liên kết tài khoản ngân hàng (MBBank, Vietcombank, Techcombank,...) trong mục "Ví của tôi" và thực hiện lệnh rút tiền.';
    } else if (lowerMessage.includes('chủ xe') || lowerMessage.includes('ký gửi') || lowerMessage.includes('cho thuê xe')) {
      reply = 'Nếu bạn có xe nhàn rỗi, hãy chuyển sang chế độ "Chủ xe" và đăng tải thông tin xe (hình ảnh, giấy tờ xe, giá thuê) tại mục "Ký gửi xe". Xe của bạn sẽ được hiển thị cho khách thuê sau khi được kiểm duyệt.';
    } else if (lowerMessage.includes('admin') || lowerMessage.includes('liên hệ') || lowerMessage.includes('hỗ trợ') || lowerMessage.includes('cskh')) {
      reply = 'Bạn có thể gửi yêu cầu hỗ trợ (Support Ticket) trong hệ thống hoặc liên hệ với đội ngũ CSKH của chúng tôi qua hòm thư hỗ trợ support@vivucar.vn hoặc hotline 1900-xxxx để được hỗ trợ trực tiếp.';
    } else {
      reply = 'Chào bạn! Tôi là Trợ lý ảo ViVuCar. Bạn có thể hỏi tôi về: Quy trình thuê xe, Xác thực KYC bằng lái/CCCD, Nạp/Rút tiền vào ví, hoặc Cổng thanh toán VNPAY. (Lưu ý: Để chatbot hoạt động thông minh hơn bằng AI, vui lòng cấu hình GEMINI_API_KEY trong file .env của máy chủ).';
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chatbot API Error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống xử lý chatbot.' });
  }
});

export default router;
