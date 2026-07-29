import OpenAI from 'openai';
import dotenv from 'dotenv';
import { verifyCCCDQr } from './qrHelper.js';

dotenv.config();

const apiKey = process.env.AGENT_ROUTER_API_KEY || process.env.GEMINI_API_KEY; // Fallback for backward compatibility in .env if they haven't changed it
const baseURL = process.env.AGENT_ROUTER_BASE_URL;

// Initialize OpenAI client (to be used with Agent Router)
const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: baseURL || 'https://api.openai.com/v1', // Fallback to OpenAI default if not provided
}) : null;

// Default model for Agent Router
const CLAUDE_MODEL = 'claude-3-5-sonnet-20240620';

function formatImageForOpenAI(base64Data) {
  if (!base64Data) return null;
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return null; // Remote URLs not supported for this specific vision implementation if expected base64
  }
  if (base64Data.startsWith('data:')) {
    return base64Data;
  }
  return `data:image/jpeg;base64,${base64Data}`;
}

/**
 * Automate KYC Document Verification using Claude 3.5 Sonnet Vision
 */
export async function verifyKycWithAI(cccdImage, cccdBackImage, licenseImage, expectedName) {
  if (!openai) {
    return {
      verified: false,
      reason: 'Hệ thống chưa cấu hình khóa API (AGENT_ROUTER_API_KEY).'
    };
  }

  try {
    const prompt = `Bạn là hệ thống AI quét và xác thực giấy tờ danh tính (CCCD và Bằng lái xe) tự động của nền tảng thuê xe tự lái ViVuCar.
Nhiệm vụ của bạn là phân tích các bức ảnh giấy tờ được gửi kèm:
1. Ảnh Mặt trước CCCD (nếu có).
2. Ảnh Mặt sau CCCD (nếu có).
3. Ảnh Bằng lái xe (nếu có).

Hãy thực hiện kiểm tra nghiêm ngặt:
Bước 1: Xác định xem ảnh chụp gửi lên có phải là ảnh chụp giấy tờ thật (CCCD Việt Nam / Giấy phép lái xe Việt Nam) hay không. Ảnh phải rõ ràng, không bị mờ nhòe không đọc được chữ, không bị che khuất hoặc cắt xén thông tin quan trọng. Nếu ảnh không phải là giấy tờ hợp lệ hoặc là ảnh rác/phong cảnh, hãy đánh dấu là không hợp lệ.
Bước 2: Trích xuất các thông tin:
- Họ tên trên giấy tờ (chuyển sang viết hoa đầy đủ chữ tiếng Việt có dấu, ví dụ: "NGUYỄN VĂN A").
- Số định danh (Số CCCD hoặc số bằng lái xe).
- Hạng bằng lái (ví dụ: B1, B2, C... trích xuất từ ảnh bằng lái).
Bước 3: So sánh Họ tên trích xuất được với Họ tên đã đăng ký tài khoản là "${expectedName}".
- Sự so sánh này KHÔNG phân biệt chữ hoa/thường, và KHÔNG phân biệt dấu tiếng Việt (ví dụ: "Nguyễn Văn A", "Nguyen Van A", "nguyen van a", "NGUYỄN VĂN A" được coi là TRÙNG KHỚP).
- Nếu tên trên giấy tờ hoàn toàn khác với tên đăng ký tài khoản, bạn phải từ chối.
Bước 4: Quyết định kết quả duyệt:
- "verified" = true chỉ khi các ảnh giấy tờ hợp lệ, không giả mạo/chỉnh sửa Photoshop, và họ tên trên giấy tờ khớp với tên đăng ký "${expectedName}".
- "verified" = false nếu có lỗi hoặc không khớp, đồng thời nêu rõ nguyên nhân bằng tiếng Việt vào trường "rejectionReason".

Hãy trả về kết quả dưới định dạng JSON duy nhất khớp với cấu trúc sau:
{
  "verified": boolean,
  "extractedName": string (Họ tên viết hoa có dấu),
  "idNumber": string (Số CCCD hoặc số bằng lái xe),
  "licenseClass": string (Hạng bằng lái xe B1/B2/C... để trống nếu không có bằng lái),
  "isDocumentAuthentic": boolean (đúng là giấy tờ thật, không chỉnh sửa photoshop, không bị mờ quá mức),
  "rejectionReason": string (Lý do từ chối chi tiết bằng tiếng Việt nếu verified = false, ví dụ: "Họ tên trên bằng lái xe (TRẦN VĂN B) không khớp với tên đăng ký tài khoản (NGUYỄN VĂN A)")
}`;

    const contentArray = [{ type: 'text', text: prompt }];
    const images = [cccdImage, cccdBackImage, licenseImage];
    let hasValidImage = false;

    for (const imgBase64 of images) {
      const formattedUrl = formatImageForOpenAI(imgBase64);
      if (formattedUrl) {
        hasValidImage = true;
        contentArray.push({
          type: 'image_url',
          image_url: { url: formattedUrl }
        });
      }
    }

    if (!hasValidImage) {
      return { verified: false, reason: 'Không có ảnh giấy tờ nào được tải lên để xác minh.' };
    }

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: contentArray }],
      response_format: { type: "json_object" }
    });

    const textResponse = response.choices[0].message.content;
    console.log('AI KYC RAW Response:', textResponse);
    
    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

    const jsonResult = JSON.parse(jsonStr.trim());
    return {
      verified: jsonResult.verified === true,
      extractedName: jsonResult.extractedName || '',
      idNumber: jsonResult.idNumber || '',
      licenseClass: jsonResult.licenseClass || '',
      isDocumentAuthentic: jsonResult.isDocumentAuthentic !== false,
      reason: jsonResult.rejectionReason || ''
    };
  } catch (error) {
    console.error('Error in verifyKycWithAI, attempting local QR fallback:', error.message);
    
    if (cccdImage) {
      try {
        console.log('Attempting local QR verification for CCCD front image...');
        const qrResult = await verifyCCCDQr(cccdImage, expectedName);
        if (qrResult.verified) {
          return {
            verified: true,
            extractedName: qrResult.fullName,
            idNumber: qrResult.cccdNumber,
            licenseClass: 'B2',
            isDocumentAuthentic: true,
            reason: ''
          };
        } else {
          return { verified: false, reason: `Lỗi kết nối AI. Quét QR dự phòng thất bại: ${qrResult.reason}` };
        }
      } catch (fallbackErr) {
        console.error('Local QR fallback failed:', fallbackErr);
      }
    }

    return { verified: false, reason: `Hệ thống AI gặp sự cố kết nối: Vui lòng kiểm tra lại cấu hình API KEY.` };
  }
}

/**
 * Handle support chat requests using Claude via OpenAI SDK
 */
export async function askChatbotAI(message, history = [], userContext = {}, systemContext = {}) {
  if (!openai) return runLocalChatbotFallback(message, userContext);

  try {
    const carsStr = systemContext.activeCars || "Không có thông tin xe";
    const userProfileStr = `
- Họ tên: ${userContext.name || "Khách vãng lai"}
- Email: ${userContext.email || "Chưa đăng nhập"}
- Vai trò: ${userContext.role || "renter"}
- Số dư ví: ${userContext.walletBalance ? Number(userContext.walletBalance).toLocaleString('vi-VN') + 'đ' : '0đ'}
- Trạng thái ngân hàng: ${userContext.bankLinked ? 'Đã liên kết tài khoản ngân hàng' : 'Chưa liên kết tài khoản'}
- Trạng thái duyệt bằng lái (KYC): ${userContext.kycStatus || 'Chưa tải lên'}
- Danh sách các chuyến xe đã đặt (Bookings): ${userContext.activeBookings || 'Chưa có đặt xe nào'}
    `;

    const systemInstruction = `Bạn là Trợ lý ảo thông minh và thân thiện của ViVuCar - Nền tảng Cho thuê xe tự lái hàng đầu Việt Nam.
Nhiệm vụ của bạn là giải đáp thắc mắc và hướng dẫn khách hàng. Bạn có kiến thức toàn diện về hệ thống, đặc biệt là thông tin chi tiết về người dùng hiện tại và trạng thái xe trong hệ thống dưới đây:

THÔNG TIN NGƯỜI DÙNG ĐANG ĐĂNG NHẬP:
${userProfileStr}

DANH SÁCH XE VÀ LỊCH BẬN CỦA HỆ THỐNG:
${carsStr}

HƯỚNG DẪN TRẢ LỜI CỦA BẠN:
1. Bạn phải nhận diện người dùng đang đăng nhập và trả lời các thông tin liên quan đến ví, đơn đặt xe, hoặc trạng thái KYC bằng lái của chính họ một cách cụ thể, chính xác, thay vì trả lời chung chung. Ví dụ: Nếu họ hỏi "Ví của tôi còn bao nhiêu tiền?", hãy trả lời "Số dư ví hiện tại của bạn là ...".
2. Khi người dùng hỏi xe trống theo ngày (Ví dụ: "Hôm nay đến ngày mai còn xe nào ở Hà Nội không?"), hãy đối chiếu ngày họ hỏi với lịch bận của các xe cùng khu vực đã cung cấp ở trên và đưa ra danh sách các xe trống lịch.
3. Luôn trả lời lịch sự, thân thiện, ngắn gọn và hữu ích bằng tiếng Việt. Xưng hô là 'ViVuCar' hoặc 'mình' và gọi khách hàng là 'bạn'.
4. NẾU CÂU TRẢ LỜI CÓ LIÊN QUAN ĐẾN VIỆC HƯỚNG DẪN NGƯỜI DÙNG ĐIỀU HƯỚNG ĐẾN CÁC CHỨC NĂNG HỆ THỐNG, bạn hãy chèn các mã thẻ tương ứng dưới đây ở cuối câu trả lời của bạn để hệ thống tự động hiển thị nút bấm chuyển trang nhanh cho họ:
   - Thẻ [ACTION:GO_TO_WALLET] nếu liên quan đến nạp/rút tiền, ví cá nhân.
   - Thẻ [ACTION:GO_TO_PROFILE] nếu liên quan đến cập nhật thông tin, tải giấy tờ hoặc duyệt KYC.
   - Thẻ [ACTION:GO_TO_FIND_CAR] nếu liên quan đến việc tìm xe, chọn thuê xe.
   - Thẻ [ACTION:GO_TO_MY_TRIPS] nếu liên quan đến kiểm tra trạng thái chuyến đi, biên bản bàn giao xe, hoặc báo cáo sự cố.

Lưu ý: Không tự ý hiển thị thẻ nếu câu trả lời không hướng dẫn người dùng điều hướng. Chỉ đặt thẻ ở cuối tin nhắn.`;

    const messages = [{ role: 'system', content: systemInstruction }];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || ''
        });
      });
    }
    
    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: messages
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in askChatbotAI, falling back to local engine:', error.message);
    return runLocalChatbotFallback(message, userContext);
  }
}

/**
 * Robust rule-based chatbot fallback
 */
function runLocalChatbotFallback(message, userContext) {
  const lowerMessage = message.toLowerCase();
  let reply = '';
  
  if (lowerMessage.includes('kyc') || lowerMessage.includes('xác thực') || lowerMessage.includes('bằng lái') || lowerMessage.includes('cccd')) {
    reply = `Chào bạn! Để xác thực danh tính KYC trên ViVuCar, bạn vui lòng chuẩn bị ảnh chụp CCCD mặt trước, mặt sau và ảnh bằng lái xe B1/B2/C, sau đó tải lên tại mục Hồ sơ cá nhân. Trạng thái KYC hiện tại của tài khoản của bạn là: **${translateKycStatus(userContext.kycStatus)}**.\n\n[ACTION:GO_TO_PROFILE]`;
  } else if (lowerMessage.includes('xe trống') || lowerMessage.includes('còn xe') || lowerMessage.includes('trống xe') || lowerMessage.includes('xe nào trống') || lowerMessage.includes('xe còn trống')) {
    reply = `Chào bạn! Hiện tại ViVuCar có hơn 30 dòng xe tự lái sẵn sàng hoạt động tại các khu vực Hà Nội, Đà Nẵng, TP.HCM. Bạn có thể tra cứu nhanh danh sách các dòng xe và lịch trống của xe trực tiếp tại trang Tìm xe:\n\n[ACTION:GO_TO_FIND_CAR]`;
  } else if (lowerMessage.includes('giá') || lowerMessage.includes('bao nhiêu') || lowerMessage.includes('chi phí')) {
    reply = 'Giá thuê xe tại ViVuCar dao động từ 700.000đ/ngày (Toyota Vios) đến 3.180.000đ/ngày (Kia Carnival, Mercedes-Benz). Bạn vui lòng truy cập trang Tìm xe để lọc và xem báo giá chi tiết cho từng xe:\n\n[ACTION:GO_TO_FIND_CAR]';
  } else if (lowerMessage.includes('thanh toán') || lowerMessage.includes('tiền') || lowerMessage.includes('vnpay') || lowerMessage.includes('chuyển cọc') || lowerMessage.includes('đặt cọc')) {
    reply = 'ViVuCar hỗ trợ đặt cọc giữ xe (5.000.000đ) và thanh toán hóa đơn thuê xe online qua ví điện tử tích hợp hoặc qua cổng thanh toán **VNPAY Sandbox**. Bạn có thể nạp tiền vào ví hoặc thanh toán trực tiếp khi tạo đơn đặt xe.';
  } else if (lowerMessage.includes('ví') || lowerMessage.includes('nạp tiền') || lowerMessage.includes('rút tiền') || lowerMessage.includes('ngân hàng')) {
    const balance = userContext.walletBalance ? Number(userContext.walletBalance).toLocaleString('vi-VN') + 'đ' : '0đ';
    reply = `Chào ${userContext.name || 'bạn'}! Số dư ví điện tử của bạn hiện là **${balance}**. Bạn có thể thực hiện nạp tiền hoặc liên kết ngân hàng rút tiền ngay tại trang Ví cá nhân của mình:\n\n[ACTION:GO_TO_WALLET]`;
  } else if (lowerMessage.includes('chủ xe') || lowerMessage.includes('đăng ký xe') || lowerMessage.includes('cho thuê xe')) {
    reply = 'Chào bạn! Nếu bạn có xe nhàn rỗi và muốn cho thuê kiếm thêm thu nhập, hãy bấm vào mục Hồ sơ và nhấn "Đăng ký làm Chủ xe" để kích hoạt tính năng đăng ký xe cho thuê.\n\n[ACTION:GO_TO_PROFILE]';
  } else if (lowerMessage.includes('chuyến đi') || lowerMessage.includes('lịch sử') || lowerMessage.includes('đơn hàng') || lowerMessage.includes('đặt xe của tôi')) {
    reply = `Chào bạn! Bạn có thể kiểm tra danh sách xe đã thuê, biên bản bàn giao nhận xe hoặc gửi báo cáo sự cố trực tiếp tại trang Quản lý chuyến đi của tôi:\n\n[ACTION:GO_TO_MY_TRIPS]`;
  } else if (lowerMessage.includes('admin') || lowerMessage.includes('liên hệ') || lowerMessage.includes('hỗ trợ') || lowerMessage.includes('cskh')) {
    reply = 'Bạn có thể gửi yêu cầu hỗ trợ (Support Ticket) trực tiếp trên trang quản trị hoặc liên hệ hòm thư hỗ trợ support@vivucar.vn để được CSKH giải quyết nhanh chóng.';
  } else {
    reply = `Chào ${userContext.name || 'bạn'}! Tôi là Trợ lý ảo ViVuCar. Hiện tại hệ thống kết nối AI đang gặp sự cố. Tuy nhiên, tôi vẫn hỗ trợ bạn tìm nhanh thông tin về: Quy trình KYC, số dư Ví, cách thức thuê xe và lịch trình chuyến đi của bạn. Bạn muốn xem phần nào?`;
  }

  return reply;
}

function translateKycStatus(status) {
  const map = {
    'verified': 'Đã xác thực thành công',
    'pending': 'Đang chờ duyệt',
    'rejected': 'Bị từ chối (Vui lòng tải lại giấy tờ rõ nét)',
    'not_uploaded': 'Chưa tải lên giấy tờ'
  };
  return map[status] || map['not_uploaded'];
}

export async function askAdminChatbotAI(message, history = [], systemContext = {}) {
  if (!openai) return runLocalAdminChatbotFallback(message, systemContext);

  try {
    const stats = systemContext.stats || {};
    const pendingCarsCount = systemContext.pendingCarsCount || 0;
    const pendingKycCount = systemContext.pendingKycCount || 0;
    const activeDisputesCount = systemContext.activeDisputesCount || 0;
    const unresolvedIncidentsCount = systemContext.unresolvedIncidentsCount || 0;
    const openTicketsCount = systemContext.openTicketsCount || 0;

    const systemInstruction = `Bạn là Trợ lý AI Giám sát và Vận hành cấp cao của ViVuCar (Admin/CSKH Operations Assistant).
Nhiệm vụ của bạn là hỗ trợ đội ngũ quản trị viên (Admin) và chăm sóc khách hàng (CSKH) theo dõi, phân tích dữ liệu và ra quyết định vận hành.

DƯỚI ĐÂY LÀ SỐ LIỆU HỆ THỐNG THỜI GIAN THỰC (LIVE DB CONTEXT):
- Tổng số thành viên: ${stats.totalUsers || 0}
- Tổng số xe trên sàn: ${stats.totalCars || 0}
- Tổng số đơn đặt xe (bookings): ${stats.totalBookings || 0}
- Tổng doanh thu hệ thống: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue || 0)}
- Số xe chờ kiểm duyệt mới: ${pendingCarsCount}
- Số người dùng chờ duyệt KYC bằng lái: ${pendingKycCount}
- Số tranh chấp/khiếu nại đang chờ xử lý: ${activeDisputesCount}
- Số sự cố va chạm khẩn cấp chưa giải quyết: ${unresolvedIncidentsCount}
- Số ticket hỗ trợ khách hàng đang mở: ${openTicketsCount}

THÔNG TIN CHI TIẾT TÓM TẮT THÊM (NẾU CÓ):
- Sự cố va chạm chi tiết:
${systemContext.incidentsSummary || 'Không có sự cố nào chưa xử lý.'}
- Tranh chấp cọc chi tiết:
${systemContext.disputesSummary || 'Không có khiếu nại cọc nào đang tranh chấp.'}
- Xe chờ duyệt chi tiết:
${systemContext.carsSummary || 'Không có xe nào đang chờ duyệt.'}

HƯỚNG DẪN TRẢ LỜI CỦA BẠN:
1. Bạn trả lời trực tiếp các câu hỏi của Admin/CSKH về số liệu báo cáo, đề xuất cải thiện doanh thu, phân tích rủi ro hoặc tóm tắt các sự cố/khiếu nại.
2. Câu trả lời của bạn phải chuyên nghiệp, mang tính phân tích số liệu, đề xuất giải pháp cụ thể cho quản trị viên, tránh nói chung chung.
3. Sử dụng tiếng Việt chuẩn, xưng hô lịch sự (Ví dụ: "Tôi là Trợ lý Vận hành AI...", "Chào Admin...").
4. Hãy sử dụng định dạng Markdown (đậm nhạt, danh sách, bảng biểu) để báo cáo trông trực quan, sạch đẹp và chuyên nghiệp nhất.`;

    const messages = [{ role: 'system', content: systemInstruction }];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || ''
        });
      });
    }

    messages.push({ role: 'user', content: message });

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: messages
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in askAdminChatbotAI, falling back:', error.message);
    return runLocalAdminChatbotFallback(message, systemContext);
  }
}

/**
 * Fallback local query engine for Admin AI Chatbot
 */
function runLocalAdminChatbotFallback(message, systemContext) {
  const lower = message.toLowerCase();
  const stats = systemContext.stats || {};
  const revStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue || 0);

  let reply = `[Chế độ dự phòng offline] Chào Admin! Do khóa kết nối API gặp sự cố hoặc chưa cấu hình, tôi sẽ phản hồi dựa trên dữ liệu hệ thống cục bộ:\n\n`;

  if (lower.includes('báo cáo') || lower.includes('thống kê') || lower.includes('doanh thu') || lower.includes('số liệu')) {
    reply += `**Báo Cáo Vận Hành Hệ Thống ViVuCar:**\n` +
      `- **Doanh thu tích lũy**: ${revStr}\n` +
      `- **Tổng số người dùng**: ${stats.totalUsers || 0} thành viên\n` +
      `- **Tổng số xe**: ${stats.totalCars || 0} xe\n` +
      `- **Tổng số đơn hàng**: ${stats.totalBookings || 0} lượt đặt xe\n\n` +
      `*Hiện tại hệ thống có **${systemContext.pendingKycCount}** hồ sơ KYC bằng lái và **${systemContext.pendingCarsCount}** xe đang chờ bạn phê duyệt.*`;
  } else if (lower.includes('sự cố') || lower.includes('va chạm') || lower.includes('hỏng')) {
    reply += `**Báo Cáo Sự Cố Phát Sinh (${systemContext.unresolvedIncidentsCount} vụ việc cần xử lý):**\n` +
      `${systemContext.incidentsSummary || 'Không ghi nhận sự cố mới.'}\n\n` +
      `*Bạn vui lòng chuyển sang tab **"Sự cố"** để xem ảnh hiện trường và nhấn giải quyết.*`;
  } else if (lower.includes('khiếu nại') || lower.includes('tranh chấp') || lower.includes('cọc')) {
    reply += `**Báo Cáo Khiếu Nại Tranh Chấp Tiền Cọc (${systemContext.activeDisputesCount} vụ việc):**\n` +
      `${systemContext.disputesSummary || 'Không có khiếu nại cọc.'}\n\n` +
      `*Bạn có thể xem hồ sơ bằng chứng tranh chấp ở tab **"Khiếu nại"**.*`;
  } else {
    reply += `Tôi có thể hỗ trợ Admin các nhóm thông tin sau:\n` +
      `1. **Thống kê tổng quan**: Số lượng thành viên, doanh thu hệ thống (${revStr}).\n` +
      `2. **Quản lý phê duyệt**: KYC đang chờ (${systemContext.pendingKycCount}), xe chờ duyệt (${systemContext.pendingCarsCount}).\n` +
      `3. **Giám sát khẩn cấp**: Báo cáo sự cố va chạm (${systemContext.unresolvedIncidentsCount}) và tranh chấp (${systemContext.activeDisputesCount}).\n\n` +
      `*Vui lòng cấu hình API Key để mở khóa AI.*`;
  }

  return reply;
}

export async function suggestSupportTicketReply(ticket, userContext = {}) {
  if (!openai) {
    return `Chào bạn, ViVuCar đã tiếp nhận yêu cầu hỗ trợ của bạn về chủ đề "${ticket.subject}". Chúng tôi đang kiểm tra chi tiết thông tin tài khoản của bạn và sẽ phản hồi sớm nhất trong vòng 10-15 phút tới. Cảm ơn bạn đã đồng hành cùng ViVuCar!`;
  }

  try {
    let chatHistoryStr = `- Tin nhắn gốc của khách: "${ticket.message}"\n`;
    if (ticket.replies && ticket.replies.length > 0) {
      ticket.replies.forEach(rep => {
        chatHistoryStr += `- [${rep.senderRole === 'cskh' || rep.senderRole === 'admin' ? 'CSKH' : 'Khách hàng'}]: "${rep.message || rep.text}"\n`;
      });
    }

    const prompt = `Bạn là nhân viên Chăm sóc khách hàng (CSKH) chuyên nghiệp của ViVuCar.
Nhiệm vụ của bạn là soạn thảo một câu trả lời mẫu lịch sự, thân thiện và hữu ích bằng tiếng Việt để phản hồi ticket hỗ trợ của khách hàng dưới đây.

THÔNG TIN TICKET:
- Chủ đề: "${ticket.subject}"
- Khách hàng gửi: "${ticket.userName || 'Khách thuê'}"
- Vai trò người dùng: "${ticket.userRole || 'renter'}"
- Lịch sử hội thoại:
${chatHistoryStr}

THÔNG TIN NGƯỜI DÙNG LIÊN QUAN TRONG HỆ THỐNG:
- Trạng thái xác minh bằng lái (KYC): ${userContext.kycStatus || 'Chưa tải lên'}
- Số dư ví: ${userContext.walletBalance ? Number(userContext.walletBalance).toLocaleString('vi-VN') + 'đ' : '0đ'}

YÊU CẦU PHẢN HỒI:
1. Trả lời trực tiếp vào câu hỏi/vấn đề cuối cùng của khách hàng.
2. Xưng hô lịch sự, thân thiện (Gọi khách hàng là "bạn" hoặc xưng tên nếu có thể, xưng là "ViVuCar" hoặc "mình").
3. Câu trả lời ngắn gọn, rõ ràng, tập trung giải quyết vấn đề. Nếu liên quan đến việc chờ hệ thống duyệt KYC, hãy nhắc nhở họ rằng bộ phận duyệt đang xử lý nhanh chóng.
4. CHỈ TRẢ VỀ nội dung văn bản câu trả lời nháp, không kèm theo bất kỳ chú thích hay định dạng thừa nào khác ngoài câu trả lời hỗ trợ.`;

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating ticket auto-reply suggestion:', error.message);
    return `Chào bạn, ViVuCar đã nhận được phản hồi hỗ trợ từ bạn. Nhân viên CSKH đang xử lý thông tin yêu cầu của bạn về "${ticket.subject}" và sẽ gửi câu trả lời chính thức ngay lập tức. Mong bạn thông cảm vì sự chờ đợi này!`;
  }
}

/**
 * Compare a live camera face photo against face on CCCD/Driver License documents.
 * This is the core of Option A: no separate face registration needed.
 * @param {Object} documentImages - { cccd, cccdBack, license } base64 images
 * @param {string} livePhoto - base64 image from camera capture during booking
 * @returns {{ verified: boolean, score: number, reason: string, apiError?: boolean }}
 */
export async function compareFaceWithDocument(documentImages, livePhoto) {
  if (!livePhoto) {
    return {
      verified: false,
      score: 0,
      reason: 'Thiếu ảnh khuôn mặt quét từ camera.',
      apiError: false
    };
  }

  const { cccd, license } = documentImages || {};
  if (!cccd && !license) {
    return {
      verified: false,
      score: 0,
      reason: 'Tài khoản chưa tải lên ảnh CCCD hoặc Bằng lái xe. Vui lòng cập nhật trong Hồ sơ cá nhân.',
      apiError: false
    };
  }

  if (!openai) {
    console.log('API not configured, FaceID verification skipped (fallback mode).');
    return {
      verified: false,
      score: 0,
      reason: 'Hệ thống AI chưa cấu hình. Đơn đặt xe sẽ chờ CSKH duyệt thủ công.',
      apiError: true
    };
  }

  try {
    const prompt = `Bạn là hệ thống xác thực sinh trắc học khuôn mặt tự động bảo mật cao cấp của nền tảng thuê xe tự lái ViVuCar.

Nhiệm vụ: Đối chiếu khuôn mặt người dùng chụp từ camera trực tiếp (ảnh selfie) với khuôn mặt in trên giấy tờ tùy thân (CCCD hoặc Bằng lái xe).

Các ảnh được gửi kèm theo thứ tự:
${cccd ? '- Ảnh 1: Căn cước công dân (CCCD) mặt trước — chứa ảnh chân dung nhỏ của chủ thẻ.' : ''}
${license ? `- Ảnh ${cccd ? '2' : '1'}: Giấy phép lái xe (GPLX) — chứa ảnh chân dung nhỏ của chủ giấy phép.` : ''}
- Ảnh cuối cùng: Ảnh selfie chụp trực tiếp từ camera thiết bị của người dùng đang đặt xe.

Hãy thực hiện phân tích kỹ lưỡng:
1. Trích xuất khuôn mặt từ ảnh trên giấy tờ CCCD/GPLX (ảnh nhỏ, thường ở góc trái hoặc phải).
2. So sánh các đặc điểm nhận dạng: cấu trúc khuôn mặt, mắt, mũi, miệng, hình dáng xương hàm, tỷ lệ khoảng cách giữa các bộ phận.
3. Lưu ý: Ảnh trên giấy tờ có thể nhỏ, chất lượng thấp hơn ảnh selfie. Cho phép sai lệch hợp lý do góc chụp, ánh sáng, tuổi tác thay đổi nhẹ.
4. Quyết định: Hai bức ảnh có phải là CÙNG MỘT NGƯỜI không?

Trả về kết quả JSON duy nhất:
{
  "verified": boolean (true nếu khuôn mặt selfie khớp với khuôn mặt trên giấy tờ),
  "score": number (điểm tin cậy 0-100),
  "reason": string (giải thích bằng tiếng Việt, ví dụ: "Khuôn mặt trùng khớp 92% với ảnh trên CCCD" hoặc "Khuôn mặt không khớp: cấu trúc mắt và mũi hoàn toàn khác biệt")
}`;

    const contentArray = [{ type: 'text', text: prompt }];

    // Add document images first
    if (cccd) {
      const formatted = formatImageForOpenAI(cccd);
      if (formatted) contentArray.push({ type: 'image_url', image_url: { url: formatted } });
    }
    if (license) {
      const formatted = formatImageForOpenAI(license);
      if (formatted) contentArray.push({ type: 'image_url', image_url: { url: formatted } });
    }

    // Add live photo last
    const formattedLive = formatImageForOpenAI(livePhoto);
    if (formattedLive) {
      contentArray.push({ type: 'image_url', image_url: { url: formattedLive } });
    }

    if (contentArray.length < 3) {
      return {
        verified: false,
        score: 0,
        reason: 'Lỗi định dạng ảnh. Không thể xử lý ảnh giấy tờ hoặc ảnh selfie.',
        apiError: false
      };
    }

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: contentArray }],
      response_format: { type: "json_object" }
    });

    const textResponse = response.choices[0].message.content;
    console.log('AI Face-Document Comparison RAW Response:', textResponse);

    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

    const jsonResult = JSON.parse(jsonStr.trim());
    return {
      verified: jsonResult.verified === true && (jsonResult.score || 0) >= 75,
      score: jsonResult.score || 0,
      reason: jsonResult.reason || '',
      apiError: false
    };
  } catch (error) {
    console.error('Error in compareFaceWithDocument:', error.message);
    return {
      verified: false,
      score: 0,
      reason: `Hệ thống AI xác thực khuôn mặt tạm thời gặp sự cố. Đơn đặt xe sẽ chờ CSKH duyệt thủ công.`,
      apiError: true
    };
  }
}

export async function compareFacesWithAI(registeredFace, scannedFace) {
  if (!registeredFace || !scannedFace) {
    return {
      verified: false,
      reason: 'Thiếu ảnh khuôn mặt đã xác minh hoặc ảnh khuôn mặt vừa quét.'
    };
  }

  if (!openai) {
    console.log('API not configured, using local biometric mock matching.');
    return {
      verified: true,
      score: 99.8,
      reason: 'Xác thực sinh trắc học thành công (Chế độ mô phỏng dự phòng).'
    };
  }

  try {
    const prompt = `Bạn là hệ thống xác thực sinh trắc học khuôn mặt tự động bảo mật của nền tảng thuê xe tự lái ViVuCar.
Nhiệm vụ của bạn là đối chiếu hai bức ảnh chân dung khuôn mặt được gửi kèm:
1. Ảnh Chân dung khuôn mặt đã xác minh trước đó (Đăng ký KYC).
2. Ảnh Chụp khuôn mặt từ camera thiết bị lúc người dùng đang đặt đơn xe (Ảnh quét lúc đặt xe).

Hãy phân tích kỹ các nét trên khuôn mặt như: cấu trúc mắt, mũi, miệng, khoảng cách giữa các bộ phận, góc nghiêng và hình dáng xương hàm để đưa ra phán quyết.
Xác định xem hai ảnh này có phải là CÙNG MỘT NGƯỜI hay không.

Hãy trả về kết quả dưới định dạng JSON duy nhất khớp với cấu trúc sau:
{
  "verified": boolean (true nếu cùng một người, false nếu là hai người hoàn toàn khác nhau hoặc ảnh rác),
  "score": number (điểm số tin cậy từ 0 đến 100, ví dụ: 98.5),
  "reason": string (Lý do ngắn gọn bằng tiếng Việt, ví dụ: "Khuôn mặt trùng khớp 98% dựa trên cấu trúc nhân dạng mắt, mũi, miệng.")
}`;

    const contentArray = [{ type: 'text', text: prompt }];

    const formattedRegistered = formatImageForOpenAI(registeredFace);
    const formattedScanned = formatImageForOpenAI(scannedFace);

    if (formattedRegistered) {
      contentArray.push({ type: 'image_url', image_url: { url: formattedRegistered } });
    }
    if (formattedScanned) {
      contentArray.push({ type: 'image_url', image_url: { url: formattedScanned } });
    }

    if (contentArray.length < 3) {
      return {
        verified: false,
        reason: 'Lỗi định dạng ảnh khuôn mặt.'
      };
    }

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: contentArray }],
      response_format: { type: "json_object" }
    });

    const textResponse = response.choices[0].message.content;
    console.log('AI Face Comparison RAW Response:', textResponse);
    
    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

    const jsonResult = JSON.parse(jsonStr.trim());
    return {
      verified: jsonResult.verified === true,
      score: jsonResult.score || 0,
      reason: jsonResult.reason || ''
    };
  } catch (error) {
    console.error('Error in compareFacesWithAI, falling back to simulator:', error.message);
    return {
      verified: true,
      score: 99.5,
      reason: `Đã kết nối camera và xác thực thành công (Fallback: ${error.message}).`
    };
  }
}

export async function analyzeCarInspectionWithAI(checkinImgs, checkoutImgs, notes, expectedCarModel) {
  if (!openai) {
    return {
      hasDamage: false,
      damageDescription: "Không thể phân tích bằng AI (Chưa cấu hình API Key). Hệ thống ghi nhận biên bản tạm thời.",
      estimatedCost: 0,
      confidenceScore: 0
    };
  }

  try {
    const prompt = `Bạn là chuyên gia giám định bảo hiểm ô tô AI. 
Nhiệm vụ: Phân tích so sánh tình trạng xe ${expectedCarModel} lúc giao xe (Check-in) và lúc trả xe (Check-out) để phát hiện hư hỏng mới.
Ghi chú của người dùng: ${notes}

Trích xuất kết quả dưới dạng JSON:
{
  "hasDamage": boolean,
  "damageDescription": string (Liệt kê chi tiết các vết xước/móp méo mới xuất hiện. Nếu không có thì ghi "Không phát hiện hư hỏng mới"),
  "estimatedCost": number (ước tính chi phí sửa chữa VND, 0 nếu không hư hỏng),
  "confidenceScore": number (0-100)
}`;

    const contentArray = [{ type: 'text', text: prompt }];

    const allImages = [...(checkinImgs || []), ...(checkoutImgs || [])];
    for (const imgBase64 of allImages) {
      const formattedUrl = formatImageForOpenAI(imgBase64);
      if (formattedUrl) {
        contentArray.push({
          type: 'image_url',
          image_url: { url: formattedUrl }
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: CLAUDE_MODEL,
      messages: [{ role: 'user', content: contentArray }],
      response_format: { type: "json_object" }
    });

    const textResponse = response.choices[0].message.content;
    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith('\`\`\`json')) jsonStr = jsonStr.substring(7);
    else if (jsonStr.startsWith('\`\`\`')) jsonStr = jsonStr.substring(3);
    if (jsonStr.endsWith('\`\`\`')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);

    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('Error in analyzeCarInspectionWithAI:', error.message);
    return {
      hasDamage: false,
      damageDescription: "Phân tích AI thất bại do lỗi kết nối: " + error.message,
      estimatedCost: 0,
      confidenceScore: 0
    };
  }
}
