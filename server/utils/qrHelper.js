import { Jimp } from 'jimp';
import jsQR from 'jsqr';

// Helper to normalize Vietnamese string (remove accents and casing)
export function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Helper to extract & verify QR from base64 image
export async function verifyCCCDQr(base64Image, expectedName) {
  try {
    // 1. Convert base64 to Buffer
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    if (matches && matches.length === 3) {
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(base64Image, 'base64');
    }

    // 2. Read image using Jimp
    const image = await Jimp.read(imageBuffer);
    const { data, width, height } = image.bitmap;

    // 3. Scan QR using jsQR
    const qrCode = jsQR(new Uint8ClampedArray(data), width, height);
    if (!qrCode) {
      return { verified: false, reason: 'Không tìm thấy mã QR trên ảnh mặt trước CCCD. Vui lòng chụp rõ nét, thẳng góc, không bị chói sáng hoặc che khuất mã QR.' };
    }

    const qrText = qrCode.data;
    console.log('Decoded QR Text:', qrText);

    // CCCD QR format is typically: Số_CCCD|Số_CMND_Cũ|Họ_Tên|Ngày_Sinh|Giới_Tính|Địa_Chỉ|Ngày_Cấp
    const parts = qrText.split('|');
    if (parts.length < 5) {
      return { verified: false, reason: 'Mã QR không đúng định dạng Căn cước công dân Việt Nam.' };
    }

    const cccdNumber = parts[0];
    const fullName = parts[2];
    
    // Normalize both names for matching
    const normExpected = normalizeName(expectedName);
    const normActual = normalizeName(fullName);

    if (normExpected !== normActual) {
      return { 
        verified: false, 
        reason: `Họ tên trên CCCD (${fullName}) không trùng khớp với họ tên đã đăng ký (${expectedName}).`
      };
    }

    return { verified: true, cccdNumber, fullName };
  } catch (error) {
    console.error('Error during CCCD QR verification:', error);
    return { verified: false, reason: 'Lỗi xử lý hình ảnh. Vui lòng gửi tệp ảnh hợp lệ (PNG/JPG).' };
  }
}
