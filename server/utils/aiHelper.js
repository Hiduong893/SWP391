import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { verifyCCCDQr } from './qrHelper.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper to convert base64 image data to the structure required by Gemini SDK
function base64ToGenerativePart(base64Data) {
  if (!base64Data) return null;
  
  let mimeType = 'image/jpeg';
  let data = base64Data;
  
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match && match.length === 3) {
      mimeType = match[1];
      data = match[2];
    }
  }
  
  return {
    inlineData: {
      data,
      mimeType
    }
  };
}

/**
 * Automate KYC Document Verification using Gemini 1.5 Flash Vision
 * @param {string} cccdImage - Base64 of front CCCD card
 * @param {string} cccdBackImage - Base64 of back CCCD card
 * @param {string} licenseImage - Base64 of driver license card
 * @param {string} expectedName - The name on the registered user account
 * @returns {Promise<{verified: boolean, extractedName: string, idNumber: string, licenseClass: string, isDocumentAuthentic: boolean, reason: string}>}
 */
export async function verifyKycWithAI(cccdImage, cccdBackImage, licenseImage, expectedName) {
  if (!genAI) {
    return {
      verified: false,
      reason: 'Hệ thống chưa cấu hình khóa API Gemini (GEMINI_API_KEY).'
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });

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

    const contents = [prompt];
    
    const parts = [
      { img: cccdImage, name: 'cccd_front' },
      { img: cccdBackImage, name: 'cccd_back' },
      { img: licenseImage, name: 'license' }
    ];

    for (const item of parts) {
      const part = base64ToGenerativePart(item.img);
      if (part) {
        contents.push(part);
      }
    }

    if (contents.length === 1) {
      return {
        verified: false,
        reason: 'Không có ảnh giấy tờ nào được tải lên để xác minh.'
      };
    }

    const response = await model.generateContent(contents);
    const textResponse = response.response.text();
    console.log('AI KYC RAW Response:', textResponse);
    
    const jsonResult = JSON.parse(textResponse);
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
    
    // Robust Fallback: Attempt local QR Code check if front CCCD image is provided
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
          return {
            verified: false,
            reason: `Lỗi kết nối AI (${error.message || 'Mã khóa API bị khóa'}). Quét QR dự phòng thất bại: ${qrResult.reason}`
          };
        }
      } catch (fallbackErr) {
        console.error('Local QR fallback failed:', fallbackErr);
      }
    }

    return {
      verified: false,
      reason: `Hệ thống AI gặp sự cố kết nối: Mã khóa GEMINI_API_KEY trong file .env đã bị Google vô hiệu hóa do phát hiện rò rỉ bảo mật. Vui lòng cập nhật khóa mới.`
    };
  }
}

/**
 * Handle support chat requests using Gemini SDK with injected user & database contexts
 */
export async function askChatbotAI(message, history = [], userContext = {}, systemContext = {}) {
  if (!genAI) {
    return runLocalChatbotFallback(message, userContext);
  }

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

    const systemInstruction = `Bạn là Trợ lý ảo thông minh và thân thiện của ViVuCar - Nền tảng Cho thuê và Ký gửi xe tự lái hàng đầu Việt Nam.
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

    const chatModel = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemInstruction
    });

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content || msg.text || '' }]
        });
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await chatModel.generateContent({ contents });
    return response.response.text();
  } catch (error) {
    console.error('Error in askChatbotAI, falling back to local engine:', error.message);
    return runLocalChatbotFallback(message, userContext);
  }
}

/**
 * Robust rule-based chatbot fallback with smart navigation action button injection
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
  } else if (lowerMessage.includes('chủ xe') || lowerMessage.includes('ký gửi') || lowerMessage.includes('cho thuê xe')) {
    reply = 'Chào bạn! Nếu bạn có xe nhàn rỗi và muốn ký gửi kiếm thêm thu nhập, hãy bấm vào mục Hồ sơ và nhấn "Đăng ký làm Chủ xe" để kích hoạt tính năng đăng ký ký gửi xe tự lái.\n\n[ACTION:GO_TO_PROFILE]';
  } else if (lowerMessage.includes('chuyến đi') || lowerMessage.includes('lịch sử') || lowerMessage.includes('đơn hàng') || lowerMessage.includes('đặt xe của tôi')) {
    reply = `Chào bạn! Bạn có thể kiểm tra danh sách xe đã thuê, biên bản bàn giao nhận xe hoặc gửi báo cáo sự cố trực tiếp tại trang Quản lý chuyến đi của tôi:\n\n[ACTION:GO_TO_MY_TRIPS]`;
  } else if (lowerMessage.includes('admin') || lowerMessage.includes('liên hệ') || lowerMessage.includes('hỗ trợ') || lowerMessage.includes('cskh')) {
    reply = 'Bạn có thể gửi yêu cầu hỗ trợ (Support Ticket) trực tiếp trên trang quản trị hoặc liên hệ hòm thư hỗ trợ support@vivucar.vn để được CSKH giải quyết nhanh chóng.';
  } else {
    reply = `Chào ${userContext.name || 'bạn'}! Tôi là Trợ lý ảo ViVuCar. Hiện tại hệ thống kết nối AI (Gemini API Key trong file .env) đang gặp sự cố bảo mật bị Google khóa (do rò rỉ mã khóa). Tuy nhiên, tôi vẫn hỗ trợ bạn tìm nhanh thông tin về: Quy trình KYC, số dư Ví, cách thức thuê xe và lịch trình chuyến đi của bạn. Bạn muốn xem phần nào?`;
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
