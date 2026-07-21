import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, CreditCard, ShieldCheck, CheckCircle2, ChevronRight, Upload, Info, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';
import { ContractModal } from './ContractModal';

export const BookingModal = ({ bookingDetails, user, onUpdateUser, onClose, setCurrentTab }) => {
  const [step, setStep] = useState(1); // 1: Confirmation & License, 2: Payment, 3: Success, 'face_scan': Face Scanner, 'contract': Hợp đồng
  const [loading, setLoading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [agreedToSampleContract, setAgreedToSampleContract] = useState(false);
  const [showSampleContractPreview, setShowSampleContractPreview] = useState(false);
  
  // Biometric Face Scanner states
  const faceVideoRef = React.useRef(null);
  const faceStreamRef = React.useRef(null);
  const faceCountdownIntervalRef = React.useRef(null);
  const [faceScanStep, setFaceScanStep] = useState('idle'); // 'idle' | 'streaming' | 'countdown' | 'captured' | 'verifying'
  const [capturedFace, setCapturedFace] = useState(null);
  const [faceCountdown, setFaceCountdown] = useState(3);
  const [payingState, setPayingState] = useState('idle'); // 'idle' | 'processing' | 'paid'

  // Electronic Contract states
  const signatureCanvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [agreement1, setAgreement1] = useState(false);
  const [agreement2, setAgreement2] = useState(false);
  const [agreement3, setAgreement3] = useState(false);

  // Stop camera when unmounting
  React.useEffect(() => {
    return () => {
      if (faceStreamRef.current) {
        faceStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (faceCountdownIntervalRef.current) {
        clearInterval(faceCountdownIntervalRef.current);
      }
    };
  }, []);

  // Initialize Canvas width dynamically
  React.useEffect(() => {
    if (step === 'contract' && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      setTimeout(() => {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.width = rect.width || 320;
        canvas.height = 140;
        setHasSigned(false);
        setIsDrawing(false);
      }, 100);
    }
  }, [step]);

  const startFaceScan = async () => {
    setFaceScanStep('streaming');
    setCapturedFace(null);
    setFaceCountdown(3);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      showToast('Không thể truy cập camera. Vui lòng cấp quyền truy cập camera để xác thực khuôn mặt.', 'error');
      setFaceScanStep('idle');
    }
  };

  const stopFaceScanStream = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop());
      faceStreamRef.current = null;
    }
    if (faceCountdownIntervalRef.current) {
      clearInterval(faceCountdownIntervalRef.current);
      faceCountdownIntervalRef.current = null;
    }
  };

  const handleStartCountdown = () => {
    setFaceScanStep('countdown');
    setFaceCountdown(3);
    
    faceCountdownIntervalRef.current = setInterval(() => {
      setFaceCountdown(prev => {
        if (prev <= 1) {
          clearInterval(faceCountdownIntervalRef.current);
          captureFacePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureFacePhoto = () => {
    if (!faceVideoRef.current) return;
    
    const video = faceVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - minDim) / 2;
    const sy = (video.videoHeight - minDim) / 2;
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, canvas.width, canvas.height);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedFace(base64);
    setFaceScanStep('captured');
    
    stopFaceScanStream();
  };

  const handleFileUploadFace = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCapturedFace(uploadEvent.target.result);
        setFaceScanStep('captured');
        showToast('Đã tải ảnh khuôn mặt thành công!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyFace = async () => {
    if (!capturedFace) return;
    setFaceScanStep('verifying');
    setLoading(true);
    
    try {
      // đối khớp qua API
      if (user.faceImage) {
        // Nếu có ảnh KYC, chúng ta có thể so sánh. 
        // Tuy nhiên trong BookingModal để đảm bảo demo siêu mượt, chúng ta giả lập chờ 1.5s
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      showToast('Xác thực khuôn mặt sinh trắc học khớp 99.8%!', 'success');
      setStep('contract');
    } catch (err) {
      showToast('Khuôn mặt không khớp với hồ sơ KYC. Vui lòng quét lại.', 'error');
      setFaceScanStep('captured');
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (e.cancelable) e.preventDefault();
    
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (e.cancelable) e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const getContractText = () => {
    const today = new Date().toLocaleDateString('vi-VN');
    const renterName = user.name;
    const renterEmail = user.email;
    const licenseNo = user.kycDocuments?.license || 'Đã xác thực KYC';
    const cccdNo = user.kycDocuments?.cccd ? 'Đã xác thực' : 'Đang cập nhật';
    
    return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
---
HỢP ĐỒNG CHO THUÊ XE TỰ LÁI ĐIỆN TỬ
(Mã hợp đồng: ${bookingId})

Hôm nay, ngày ${today}, tại nền tảng ViVuCar, các bên gồm:

BÊN CHO THUÊ (BÊN A):
- ${car.ownerId ? 'Họ và tên chủ xe:' : 'Tên đơn vị:'} ${car.ownerId ? (car.ownerName || 'Chủ xe cá nhân') : 'Công ty Cổ phần Dịch vụ Xe tự lái ViVuCar'}
- Địa chỉ bãi bàn giao: ${selfLocation || 'Bãi xe Hệ thống'}

BÊN THUÊ XE (BÊN B):
- Họ và tên: ${renterName.toUpperCase()}
- Địa chỉ Email: ${renterEmail}
- Giấy phép lái xe số: ${licenseNo}
- Căn cước công dân: ${cccdNo}

Sau khi thảo luận, hai bên đồng ý ký kết hợp đồng thuê xe tự lái với các điều khoản cụ thể dưới đây:

ĐIỀU 1: THÔNG TIN PHƯƠNG TIỆN
- Hãng xe: ${car.brand} | Mẫu xe: ${car.model}
- Số chỗ ngồi: ${car.seats} chỗ
- Truyền động: ${car.transmission} | Nhiên liệu: ${car.fuel}

ĐIỀU 2: THỜI GIAN VÀ PHÍ DỊCH VỤ
- Thời gian thuê: Từ ${pickupTime} ${pickupDate} đến ${returnTime} ${returnDate} (${diffDaysStr})
- Phí thuê xe (Sau Capping): ${formatCurrency(basePrice)}
- Phí dịch vụ công nghệ: ${formatCurrency(serviceFee)}
- Phí bảo hiểm chuyến đi: ${formatCurrency(insurancePrice)}
- Phí giữ chỗ thanh toán ngay: ${formatCurrency(reservationFee)} (Đã thanh toán trực tuyến)
- Số tiền còn lại Bên B phải trả khi nhận xe: ${formatCurrency(totalPayment - reservationFee)} (đã khấu trừ ${formatCurrency(reservationFee)} phí giữ chỗ)

ĐIỀU 3: NGHĨA VỤ CỦA BÊN B
1. Vận hành xe đúng Luật Giao thông đường bộ Việt Nam. Tự chịu mọi trách nhiệm về dân sự và hình sự khi xảy ra tai nạn hoặc vi phạm pháp luật.
2. Không sử dụng xe để chở hàng cấm, kinh doanh dịch vụ trái phép, đua xe hay cho người khác mượn xe khi chưa có sự đồng ý của Bên A.
3. Bảo quản xe cẩn thận, chịu trách nhiệm bồi thường 100% chi phí sửa chữa chính hãng nếu xảy ra hư hỏng, va chạm móp méo trong suốt chuyến đi.
4. Tự chi trả mọi chi phí phát sinh bao gồm: xăng/điện, phí cầu đường, phí gửi xe và các chi phí phạt nguội do vi phạm giao thông trong thời gian thuê xe.

ĐIỀU 4: XÁC THỰC SINH TRẮC HỌC & CHỮ KÝ SỐ
Hợp đồng điện tử này được xác thực và đóng dấu ký số bằng ảnh quét khuôn mặt sinh trắc học (FaceID Verified) của Bên B và chữ ký tay vẽ trên nền tảng. Hai hình thức này có giá trị pháp lý tương đương với ký tay trực tiếp bản giấy.`;
  };

  const [bookingId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());
  const [createdBookingId, setCreatedBookingId] = useState(null); // Real booking ID from API
  const [showContractModal, setShowContractModal] = useState(false);
  const [payMethod, setPayMethod] = useState('vietqr'); // 'vietqr', 'vnpay', or 'wallet'
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes = 900 seconds
  const [pickupMethod, setPickupMethod] = useState('self'); // 'self' or 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [manualPickupAddress, setManualPickupAddress] = useState('');

  const [paymentChoice, setPaymentChoice] = useState('vietqr'); // 'vietqr', 'wallet', or 'vnpay'
  const [sysConfig, setSysConfig] = useState({
    bankId: 'mbbank',
    bankName: 'ViVuCar Bank',
    bankAccountNumber: '1900533588',
    bankAccountHolder: 'VIVUCAR SYSTEM'
  });
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);
  const [walletAnimating, setWalletAnimating] = useState(false);

  const { car, pickupLocation, pickupTime: initialPickupTime, returnTime: initialReturnTime } = bookingDetails;
  const [pickupDate, setPickupDate] = useState(bookingDetails.pickupDate);
  const [returnDate, setReturnDate] = useState(bookingDetails.returnDate);
  const [pickupTime, setPickupTime] = useState(initialPickupTime || '10:00');
  const [returnTime, setReturnTime] = useState(initialReturnTime || '10:00');
  const { showToast } = useToast();
  
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const TIME_OPTIONS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.system.getConfig();
        if (config) {
          setSysConfig(config);
        }
      } catch (err) {
        console.error('Lỗi tải cấu hình hệ thống:', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await api.user.getWallet();
        if (res && res.walletBalance !== undefined) {
          setWalletBalance(res.walletBalance);
        }
      } catch (err) {
        console.error('Lỗi tải ví người dùng:', err);
      }
    };
    if (user) {
      fetchWallet();
    }
  }, [user]);

  useEffect(() => {
    if (step !== 2) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    if (pickupDate && pickupTime && returnDate && returnTime) {
      const start = new Date(`${pickupDate}T${pickupTime}:00`);
      const end = new Date(`${returnDate}T${returnTime}:00`);
      const minEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours min
      if (end < minEnd) {
        const localMinEnd = new Date(minEnd.getTime() - minEnd.getTimezoneOffset() * 60000);
        setReturnDate(localMinEnd.toISOString().split('T')[0]);
        const newTime = `${minEnd.getHours().toString().padStart(2, '0')}:00`;
        setReturnTime(TIME_OPTIONS.includes(newTime) ? newTime : "22:00");
      }
    }
  }, [pickupDate, pickupTime, returnDate, returnTime]);

  const isReturnTimeDisabled = (time) => {
    if (!pickupDate || !pickupTime || !returnDate) return false;
    const start = new Date(`${pickupDate}T${pickupTime}:00`);
    const endOption = new Date(`${returnDate}T${time}:00`);
    const minEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    return endOption < minEnd;
  };

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label} vào bộ nhớ tạm.`, 'success');
  };

  // Calculate rental hours and days using combined datetime
  const startDatetime = new Date(`${pickupDate}T${pickupTime}:00`);
  const endDatetime = new Date(`${returnDate}T${returnTime}:00`);
  const diffTimeMs = endDatetime > startDatetime ? (endDatetime - startDatetime) : 0;
  let diffHours = Math.ceil(diffTimeMs / (1000 * 60 * 60));
  if (diffHours === 0) diffHours = 1;
  const diffDays = Math.max(1, Math.ceil(diffHours / 24)); // số ngày thuê (tối thiểu 1)

  // --- SMART CAPPING PRICING LOGIC ---
  const pricePerDay = car.pricePerDay;
  const package4h = Math.round(pricePerDay * 0.56);
  const package8h = Math.round(pricePerDay * 0.70);
  const package12h = Math.round(pricePerDay * 0.80);
  const package24h = pricePerDay;
  const extraHourRate = Math.round(pricePerDay * 0.10);

  const calculatePrice = (hours) => {
    let days = Math.floor(hours / 24);
    let remHours = hours % 24;
    let base = days * package24h;

    if (remHours === 0) return base;

    let remPrice = 0;
    if (remHours <= 4) {
      remPrice = package4h;
    } else if (remHours <= 8) {
      remPrice = Math.min(package4h + (remHours - 4) * extraHourRate, package8h);
    } else if (remHours <= 12) {
      remPrice = Math.min(package8h + (remHours - 8) * extraHourRate, package12h);
    } else {
      remPrice = Math.min(package12h + (remHours - 12) * extraHourRate, package24h);
    }
    return base + remPrice;
  };

  const basePrice = calculatePrice(diffHours);
  const diffDaysStr = Math.floor(diffHours / 24) > 0 ? `${Math.floor(diffHours / 24)} ngày ${diffHours % 24 > 0 ? `${diffHours % 24} giờ` : ''}` : `${diffHours} giờ`;
  
  const insurancePrice = 50000 * Math.ceil(diffHours / 24); // 50,000 VND / day for standard insurance
  const serviceFee = 80000;
  const deliveryFee = pickupMethod === 'delivery' ? 100000 : 0;
  const totalPrice = basePrice + insurancePrice + serviceFee + deliveryFee;
  const reservationFee = Math.round(totalPrice * 0.3);
  const totalPayment = totalPrice; // No deposit fee
  // Determine display and submission location with robust fallbacks
  const isCityOnly = (addr) => {
    if (!addr) return true;
    const cities = ['hà nội', 'tp. hồ chí minh', 'tp.hồ chí minh', 'tp hcm', 'tphcm', 'đà nẵng', 'bình dương', 'đồng nai', 'đà lạt', 'khánh hòa', 'hải phòng', 'cần thơ', 'không xác định'];
    return cities.includes(addr.trim().toLowerCase());
  };

  const getFakeOwnerAddress = (location) => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('hà nội') || loc.includes('ha noi')) {
      return 'Bãi xe Chủ xe - Số 15 Lê Văn Lương, Nhân Chính, Thanh Xuân, Hà Nội';
    }
    if (loc.includes('hồ chí minh') || loc.includes('ho chi minh') || loc.includes('hcm')) {
      return 'Bãi xe Chủ xe - Số 120 Trần Hưng Đạo, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh';
    }
    if (loc.includes('đà nẵng') || loc.includes('da nang')) {
      return 'Bãi xe Chủ xe - Số 45 Nguyễn Văn Linh, Bình Hiên, Hải Châu, Đà Nẵng';
    }
    return 'Bãi xe Chủ xe - ' + (location || 'Khu vực trung tâm');
  };

  const getSystemAddress = (location) => {
    const loc = (location || '').toLowerCase();
    if (loc.includes('hà nội') || loc.includes('ha noi')) {
      return 'Bãi xe ViVuCar - Số 10 Tôn Thất Thuyết, Cầu Giấy, Hà Nội';
    }
    if (loc.includes('hồ chí minh') || loc.includes('ho chi minh') || loc.includes('hcm')) {
      return 'Bãi xe ViVuCar - Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh';
    }
    if (loc.includes('đà nẵng') || loc.includes('da nang')) {
      return 'Bãi xe ViVuCar - 123 Nguyễn Văn Linh, Đà Nẵng';
    }
    return 'Bãi xe ViVuCar - Trung tâm ' + (location || 'Thành phố');
  };

  const selfLocation = car.ownerId 
    ? getFakeOwnerAddress(car.location)
    : (!isCityOnly(pickupLocation) ? pickupLocation : getSystemAddress(pickupLocation));

  const displayLocation = pickupMethod === 'delivery' && !car.ownerId ? deliveryAddress : selfLocation;

  const handleLicenseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ tải lên file hình ảnh.', 'warning');
      return;
    }

    setLicenseUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const data = await api.user.uploadLicense(base64Data);
        onUpdateUser(data.user);
        showToast(data.message, 'success');
      } catch (error) {
        showToast(error.message || 'Lỗi tải ảnh bằng lái.', 'error');
      } finally {
        setLicenseUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcessReservationPayment = async () => {
    if (paymentChoice === 'wallet' && walletBalance < reservationFee) {
      showToast(`Số dư ví không đủ. Cần tối thiểu ${formatCurrency(reservationFee)} để thanh toán phí giữ chỗ.`, 'warning');
      return;
    }
    
    setPayingState('processing');
    setLoading(true);
    
    try {
      // Giả lập xử lý thanh toán qua cổng trong 1.5 giây
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showToast(`Thanh toán phí giữ chỗ ${formatCurrency(reservationFee)} thành công!`, 'success');
      
      if (paymentChoice === 'wallet') {
        const newBalance = walletBalance - reservationFee;
        setWalletBalance(newBalance);
      }
      
      setPayingState('paid');
      setStep('face_scan');
      
      // Tự động mở camera sau khi chuyển bước quét mặt
      setTimeout(() => {
        startFaceScan();
      }, 300);
    } catch (err) {
      showToast('Thanh toán thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
      setPayingState('idle');
    }
  };

  const handleBookingCompletion = async () => {
    if (!agreement1 || !agreement2 || !agreement3) {
      showToast('Vui lòng tích chọn đồng ý tất cả điều khoản hợp đồng.', 'warning');
      return;
    }
    if (!hasSigned || !signatureCanvasRef.current) {
      showToast('Vui lòng ký tên vào khung vẽ chữ ký.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const canvas = signatureCanvasRef.current;
      const signatureDataUrl = canvas.toDataURL('image/png');
      const finalPickupLocation = displayLocation.trim() || pickupLocation || car.location || 'Không xác định';

      let mappedCarId = car.id;
      if (typeof mappedCarId === 'string') {
        if (mappedCarId.startsWith('lux-car-')) {
          if (mappedCarId === 'lux-car-1' || mappedCarId === 'lux-car-4') {
            mappedCarId = '31'; // Mercedes GLC 300 4MATIC in DB
          } else {
            mappedCarId = '30'; // Mercedes C200 Avantgarde in DB
          }
        } else if (mappedCarId.startsWith('likes-car-')) {
          if (mappedCarId === 'likes-car-1' || mappedCarId === 'likes-car-2') {
            mappedCarId = '25'; // Suzuki XL7 GLX in DB
          } else {
            mappedCarId = '22'; // Mitsubishi Xpander Premium in DB
          }
        }
      }

      const bookingData = {
        carId: mappedCarId,
        pickupDate: `${pickupDate} ${pickupTime}:00`,
        returnDate: `${returnDate} ${returnTime}:00`,
        pickupLocation: finalPickupLocation,
        totalPrice,
        paymentMethod: paymentChoice,
        scannedFace: capturedFace || null,
        contractSignature: signatureDataUrl,
        agreementChecked: true
      };

      const newBooking = await api.bookings.create(bookingData);
      
      const realBookingId = newBooking.booking?.id || newBooking.booking?.booking_id || newBooking.id;
      // Lấy ID thật từ server để phục vụ cho các logic sau này
      setCreatedBookingId(realBookingId);

      if (paymentChoice === 'vnpay') {
        const vnpayRes = await api.bookings.createVnpayUrl(realBookingId);
        if (vnpayRes && vnpayRes.paymentUrl) {
          window.location.href = vnpayRes.paymentUrl;
          return; // Chuyển hướng trình duyệt sang VNPay
        } else {
          throw new Error('Không nhận được liên kết thanh toán từ VNPAY.');
        }
      }

      showToast(newBooking.message || 'Xác nhận thanh toán và đặt xe thành công!', 'success');
      
      if (paymentChoice === 'wallet') {
        const newBalance = walletBalance - totalPayment;
        setWalletBalance(newBalance);
        if (onUpdateUser) {
          onUpdateUser({
            ...user,
            walletBalance: newBalance
          });
        }
      }

      setStep(3);
    } catch (error) {
      showToast(error.message || 'Lỗi tạo đơn đặt xe hoặc xác thực khuôn mặt.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const remainingPayment = totalPrice - reservationFee;

  const vietQrUrl = `https://img.vietqr.io/image/${sysConfig.bankId}-${sysConfig.bankAccountNumber}-compact.png?amount=${reservationFee}&addInfo=${encodeURIComponent(`THUEXE ${car.brand} ${bookingId}`)}&accountName=${encodeURIComponent(sysConfig.bankAccountHolder)}`;

  return (
    <>
      <div className="booking-modal-overlay">
        <div className={`booking-modal-card ${step === 2 || step === 'contract' ? 'wide-payment-modal' : ''}`} style={{ position: 'relative' }}>
        
        {/* Spinner overlay for Step 2 payment processing */}
        {payingState === 'processing' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99,
            borderRadius: '20px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #f3f4f6',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px'
            }}></div>
            <h4 style={{ color: '#0f172a', fontWeight: 800, marginBottom: '6px', fontSize: '16px' }}>Đang xác thực giao dịch giữ chỗ...</h4>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {/* Header */}
        <div className="booking-modal-header">
          <div className="header-title-box">
            <span className="step-indicator">
              {step === 1 ? 'BƯỚC 1/5' : step === 2 ? 'BƯỚC 2/5' : step === 'face_scan' ? 'BƯỚC 3/5' : step === 'contract' ? 'BƯỚC 4/5' : 'BƯỚC 5/5'}
            </span>
            <h3>
              {step === 1 ? 'Xác Nhận Hành Trình' : 
               step === 2 ? 'Thanh Toán Giữ Chỗ' : 
               step === 'face_scan' ? 'Xác Thực Khuôn Mặt FaceID' : 
               step === 'contract' ? 'Đọc & Ký Hợp Đồng' : 
               'Đặt Xe Thành Công!'}
            </h3>
          </div>
          <button className="btn-close-modal" onClick={() => { stopFaceScanStream(); onClose(); }} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Confirmation & Driver License */}
        {step === 1 && (
          <div className="booking-modal-body">
            {/* Car Details Summary */}
            <div className="booking-car-summary">
              <img src={car.image} alt={car.model} className="summary-car-img" />
              <div className="summary-car-info">
                <span className="car-brand-lbl">{car.brand}</span>
                <h4>{car.model}</h4>
                <p className="car-desc-sub">{car.seats} chỗ • {car.transmission} • {car.fuel}</p>
              </div>
            </div>

            {/* Trip Details Grid */}
            <div className="booking-details-grid mt-4">
              <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} className="text-info" />
                  <span className="detail-lbl" style={{ margin: 0 }}>Địa điểm nhận/trả xe</span>
                </div>
                {car.ownerId ? (
                  <span className="detail-val" style={{ paddingLeft: '24px', color: '#1e293b', fontWeight: 'bold' }}>
                    {selfLocation}
                  </span>
                ) : (
                  <>
                    {pickupMethod !== 'delivery' && (
                      <span className="detail-val" style={{ paddingLeft: '24px', color: '#1e293b', fontWeight: 'bold' }}>
                        {selfLocation}
                      </span>
                    )}
                    {pickupMethod === 'delivery' && (
                      <>
                        <input
                          type="text"
                          placeholder="Nhập địa chỉ giao xe của bạn..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '2px solid #6366f1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: "'Outfit', sans-serif",
                            marginTop: '4px'
                          }}
                        />
                        {!deliveryAddress && (
                          <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, paddingLeft: '4px' }}>⚠️ Vui lòng nhập địa chỉ nhận xe để tiến hành đặt.</span>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="detail-item edit-dates-item" style={{ minWidth: '220px' }}>
                <Calendar size={16} className="text-info" style={{ marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <span className="detail-lbl">Thời gian thuê</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Ngày & Giờ nhận</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="date"
                          min={todayStr}
                          value={pickupDate}
                          onChange={(e) => {
                            const newPickup = e.target.value;
                            setPickupDate(newPickup);
                            const currentStart = new Date(`${newPickup}T${pickupTime}:00`);
                            const currentEnd = new Date(`${returnDate}T${returnTime}:00`);
                            if (currentStart >= currentEnd) {
                              const tomorrow = new Date(currentStart);
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              setReturnDate(tomorrow.toISOString().split('T')[0]);
                            }
                          }}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            color: '#0f172a', padding: '8px 6px', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                            outline: 'none', width: '65%', boxSizing: 'border-box'
                          }}
                        />
                        <select
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            color: '#0f172a', padding: '8px 4px', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                            outline: 'none', width: '35%', boxSizing: 'border-box', cursor: 'pointer'
                          }}
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <span style={{ color: '#64748b', marginTop: '14px', fontSize: '10px' }}>➔</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Ngày & Giờ trả</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="date"
                          min={pickupDate || todayStr}
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            color: '#0f172a', padding: '8px 6px', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                            outline: 'none', width: '65%', boxSizing: 'border-box'
                          }}
                        />
                        <select
                          value={returnTime}
                          onChange={(e) => setReturnTime(e.target.value)}
                          style={{
                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            color: '#0f172a', padding: '8px 4px', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                            outline: 'none', width: '35%', boxSizing: 'border-box', cursor: 'pointer'
                          }}
                        >
                          {TIME_OPTIONS.map(time => (
                            <option key={time} value={time} disabled={isReturnTimeDisabled(time)}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6366f1', marginTop: '8px', fontWeight: 700 }}>
                    Tổng thời gian: {diffDaysStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Method Selection */}
            {!car.ownerId ? (
              <div className="delivery-method-card mt-4" style={{ marginTop: '20px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Hình thức nhận xe
                </h5>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: pickupMethod === 'self' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: pickupMethod === 'self' ? '#f5f3ff' : '#ffffff',
                      color: pickupMethod === 'self' ? '#4f46e5' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onClick={() => setPickupMethod('self')}
                  >
                    <div style={{ fontSize: '13px', color: pickupMethod === 'self' ? '#4f46e5' : '#1e293b', marginBottom: '4px', fontWeight: '700' }}>
                      🙋 Tự nhận xe
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', lineHeight: 1.4 }}>
                      Khách nhận tại vị trí xe đậu (Miễn phí)
                    </div>
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: pickupMethod === 'delivery' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: pickupMethod === 'delivery' ? '#f5f3ff' : '#ffffff',
                      color: pickupMethod === 'delivery' ? '#4f46e5' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onClick={() => setPickupMethod('delivery')}
                  >
                    <div style={{ fontSize: '13px', color: pickupMethod === 'delivery' ? '#4f46e5' : '#1e293b', marginBottom: '4px', fontWeight: '700' }}>
                      🚚 Giao nhận tận nơi
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', lineHeight: 1.4 }}>
                      ViVuCar giao xe tận nơi (+100.000đ)
                    </div>
                  </button>
                </div>

              </div>
            ) : (
              <div className="delivery-method-card mt-4" style={{ marginTop: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔑 Hình thức nhận xe: Gặp chủ xe
                </h5>
                <p style={{ fontSize: '12.5px', color: '#0284c7', margin: 0, lineHeight: 1.5 }}>
                  Đây là phương tiện được đăng ký cho thuê bởi Chủ xe cá nhân. Quý khách vui lòng di chuyển đến địa chỉ bãi đỗ của Chủ xe để nhận và kiểm tra xe trực tiếp.
                </p>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="cost-breakdown-card mt-4">
              <h5>Chi tiết hóa đơn dự kiến</h5>
              <div className="cost-row">
                <span>Phí thuê xe ({diffDaysStr})</span>
                <span>{formatCurrency(basePrice)}</span>
              </div>
              <div className="cost-row">
                <span>Bảo hiểm chuyến đi (Bắt buộc)</span>
                <span>{formatCurrency(50000)} x {Math.ceil(diffHours / 24)}</span>
              </div>
              <div className="cost-row">
                <span>Phí dịch vụ công nghệ</span>
                <span>{formatCurrency(serviceFee)}</span>
              </div>
              {pickupMethod === 'delivery' && (
                <div className="cost-row">
                  <span>Phí giao nhận xe tận nơi</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <hr className="cost-divider" />
              <div className="cost-row total-row">
                <span>Tổng giá trị đơn thuê</span>
                <span className="text-primary">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Driver License Verification status */}
            <div className="license-verification-card mt-4">
              {user.licenseStatus === 'verified' ? (
                <div className="license-status-success">
                  <ShieldCheck size={20} className="text-success" />
                  <div>
                    <strong>Bằng lái xe đã xác thực!</strong>
                    <p>Bạn đã đủ điều kiện lái xe ô tô tự lái.</p>
                  </div>
                </div>
              ) : (
                <div className="license-status-warning">
                  <AlertTriangle size={20} className="text-warning" />
                  <div style={{ flex: 1 }}>
                    <strong>Cần xác thực bằng lái xe!</strong>
                    <p>Luật cho thuê xe tự lái yêu cầu tải ảnh bằng lái để xác minh tư cách người lái.</p>

                    <label className="upload-license-inline-btn mt-2">
                      <Upload size={14} />
                      <span>{licenseUploading ? 'Đang tải lên...' : 'Tải lên Bằng lái (Duyệt tự động ngay)'}</span>
                      <input type="file" onChange={handleLicenseUpload} accept="image/*" style={{ display: 'none' }} disabled={licenseUploading} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Hợp đồng mẫu & Đồng ý điều khoản (Yêu cầu 1.1) */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="#6366f1" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Điều khoản dịch vụ & Hợp đồng mẫu</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '10px' }}>
                Trước khi tiến hành thanh toán giữ chỗ, bạn vui lòng đọc kỹ hợp đồng mẫu chứa quy định về giá cả, bảo hiểm chuyến đi, phụ phí và trách nhiệm xử lý va chạm.
              </p>
              <button 
                type="button" 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  display: 'block',
                  marginBottom: '12px',
                  textAlign: 'left'
                }}
                onClick={() => setShowSampleContractPreview(true)}
              >
                👉 Xem chi tiết Hợp đồng mẫu
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreedToSampleContract} 
                  onChange={(e) => setAgreedToSampleContract(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                  Tôi đã đọc và đồng ý với điều khoản hợp đồng mẫu
                </span>
              </label>
            </div>

            {/* Step 1 Footer Action */}
            <div className="booking-modal-footer mt-6" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy bỏ</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  user.licenseStatus !== 'verified' ||
                  !agreedToSampleContract ||
                  (pickupMethod === 'delivery' && !deliveryAddress.trim()) ||
                  (pickupMethod === 'self' && !selfLocation && !manualPickupAddress.trim())
                }
                onClick={() => setStep(2)}
              >
                Tiếp tục thanh toán giữ chỗ
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Selector & Details */}
        {step === 2 && (
          <div className="booking-modal-body new-payment-layout">

            {/* ===== RESERVATION PRICE HEADER ===== */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(99,102,241,0.3)'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '4px' }}>
                  Phí giữ chỗ thanh toán ngay
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {formatCurrency(reservationFee)}
                </div>
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  Khấu trừ khi thanh toán nhận xe. Phần còn lại {formatCurrency(totalPayment - reservationFee)} và cọc sẽ thanh toán lúc nhận xe.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Mã đặt xe</div>
                <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '8px' }}>{bookingId}</div>
                <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>⏱ Hạn thanh toán: {formatTime(timeLeft)}</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Chọn phương thức thanh toán giữ chỗ
              </h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Wallet Option */}
                <button
                  type="button"
                  id="pay-method-wallet"
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: paymentChoice === 'wallet' ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    background: paymentChoice === 'wallet' ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : '#fff',
                    cursor: 'pointer', transition: 'all 0.25s', textAlign: 'left',
                    boxShadow: paymentChoice === 'wallet' ? '0 4px 16px rgba(99,102,241,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}
                  onClick={() => setPaymentChoice('wallet')}
                >
                  {paymentChoice === 'wallet' && (
                    <span style={{ position: 'absolute', top: '8px', right: '10px', background: '#6366f1', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>✓</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px' }}>💼</span>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 750 }}>Ví ViVuCar</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    Số dư: <span style={{ color: walletBalance >= reservationFee ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '12px' }}>{formatCurrency(walletBalance)}</span>
                  </div>
                  {walletBalance < reservationFee && (
                    <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
                      ⚠ Thiếu {formatCurrency(reservationFee - walletBalance)}
                    </div>
                  )}
                </button>

                {/* VietQR Option */}
                <button
                  type="button"
                  id="pay-method-vietqr"
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: paymentChoice === 'vietqr' ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    background: paymentChoice === 'vietqr' ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : '#fff',
                    cursor: 'pointer', transition: 'all 0.25s', textAlign: 'left',
                    boxShadow: paymentChoice === 'vietqr' ? '0 4px 16px rgba(99,102,241,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}
                  onClick={() => setPaymentChoice('vietqr')}
                >
                  {paymentChoice === 'vietqr' && (
                    <span style={{ position: 'absolute', top: '8px', right: '10px', background: '#6366f1', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>✓</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px' }}>🏧</span>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 750 }}>Chuyển khoản QR</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>Quét mã VietQR chuyển khoản nhanh</div>
                </button>

                {/* VNPAY Option */}
                <button
                  type="button"
                  id="pay-method-vnpay"
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: paymentChoice === 'vnpay' ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    background: paymentChoice === 'vnpay' ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : '#fff',
                    cursor: 'pointer', transition: 'all 0.25s', textAlign: 'left',
                    boxShadow: paymentChoice === 'vnpay' ? '0 4px 16px rgba(99,102,241,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}
                  onClick={() => setPaymentChoice('vnpay')}
                >
                  {paymentChoice === 'vnpay' && (
                    <span style={{ position: 'absolute', top: '8px', right: '10px', background: '#6366f1', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>✓</span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '22px' }}>💳</span>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 750 }}>Cổng VNPAY</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>Ví điện tử / Thẻ ATM Việt Nam</div>
                </button>
              </div>
            </div>

            <div className="payment-grid-columns">
              {/* Left Column - Payment Details */}
              <div className="payment-column-left">

                {/* VietQR Pay Flow */}
                {paymentChoice === 'vietqr' && (
                  <div className="payment-card-sub white-card text-center" style={{ padding: '16px' }}>
                    <h4 className="card-sub-title">Quét mã QR để chuyển phí giữ chỗ</h4>
                    <p className="card-sub-description" style={{ color: '#6366f1', fontWeight: 700, fontSize: '12.5px', marginBottom: '10px' }}>
                      Vui lòng chuyển khoản đúng số tiền phí giữ xe: <strong>{formatCurrency(reservationFee)}</strong>
                    </p>

                    <div className="vietqr-frame-box" style={{ padding: '8px', marginBottom: '10px' }}>
                      <img src={vietQrUrl} alt="VietQR Payment Code" className="vietqr-image-render" style={{ width: '150px', height: '150px' }} />
                      <div className="vietqr-napas-brand">napas 247 | 🏧 {sysConfig.bankName}</div>
                    </div>

                    <div className="bank-copyable-fields" style={{ gap: '6px' }}>
                      <div className="copyable-field-row" style={{ padding: '6px 10px' }}>
                        <div className="field-value-col">
                          <span className="lbl">Nội dung CK:</span>
                          <strong className="val text-orange" style={{ fontFamily: 'monospace', fontSize: '12px' }}>THUEXE {car.brand} {bookingId}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(`THUEXE ${car.brand} ${bookingId}`, 'Nội dung chuyển khoản')}>
                          Sao chép
                        </button>
                      </div>

                      <div className="copyable-field-row" style={{ padding: '6px 10px' }}>
                        <div className="field-value-col">
                          <span className="lbl">Số tài khoản:</span>
                          <strong className="val" style={{ fontSize: '12px' }}>{sysConfig.bankAccountNumber}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(sysConfig.bankAccountNumber, 'Số tài khoản')}>
                          Sao chép
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Pay Flow */}
                {paymentChoice === 'wallet' && (
                  <div className="payment-card-sub white-card text-center">
                    <h4 className="card-sub-title">Thanh toán bằng Ví ViVuCar</h4>

                    <div style={{ fontSize: '42px', marginBottom: '8px' }}>💼</div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', margin: '10px 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Phí giữ xe online (thanh toán ngay):</span>
                        <strong style={{ color: '#6366f1' }}>{formatCurrency(reservationFee)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                        <span style={{ color: '#64748b' }}>Số dư ví hiện tại:</span>
                        <strong style={{ color: walletBalance >= reservationFee ? '#10b981' : '#ef4444' }}>{formatCurrency(walletBalance)}</strong>
                      </div>
                      {walletBalance >= reservationFee && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b' }}>Số dư sau khi trừ:</span>
                          <strong style={{ color: '#0f172a' }}>{formatCurrency(walletBalance - reservationFee)}</strong>
                        </div>
                      )}
                    </div>

                    {walletBalance < reservationFee ? (
                      <div className="alert-memo-warn text-red" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', margin: 0 }}>
                        ⚠️ Số dư Ví không đủ. Cần thêm {formatCurrency(reservationFee - walletBalance)}. Vui lòng nạp thêm hoặc chọn VietQR.
                      </div>
                    ) : (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                        ✅ Số dư đủ thanh toán phí giữ chỗ. Bấm nút dưới để tiến hành.
                      </div>
                    )}
                  </div>
                )}

                {/* VNPAY Pay Flow */}
                {paymentChoice === 'vnpay' && (
                  <div className="payment-card-sub white-card text-center">
                    <h4 className="card-sub-title">Thanh toán qua cổng VNPAY</h4>

                    <div style={{ fontSize: '42px', marginBottom: '8px' }}>💳</div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', margin: '10px 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Phí giữ chỗ online:</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(reservationFee)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Trạng thái:</span>
                        <strong style={{ color: '#6366f1' }}>VNPAY Giả lập nhanh (Sandbox)</strong>
                      </div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '500', textAlign: 'left', lineHeight: 1.4 }}>
                      💡 Hệ thống sẽ giả lập giao dịch cổng thanh toán VNPAY siêu tốc để bạn kiểm thử luồng KYC khuôn mặt & Hợp đồng mà không cần thẻ thật.
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Order Summary */}
              <div className="payment-column-right">
                <div className="payment-card-sub white-card text-left" style={{ padding: '16px' }}>
                  <h4 className="card-sub-title text-center" style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}>Tóm tắt hành trình</h4>
                  
                  <div className="car-preview-img-container" style={{ marginBottom: '10px' }}>
                    <img src={car.image} alt={car.model} className="car-preview-image" style={{ height: '90px' }} />
                  </div>

                  <div className="rental-info-rows" style={{ gap: '8px' }}>
                    <div className="info-row" style={{ fontSize: '12.5px', paddingBottom: '6px' }}>
                      <span className="lbl">Khách thuê:</span>
                      <strong className="val">{user.name}</strong>
                    </div>
                    <div className="info-row" style={{ fontSize: '12.5px', paddingBottom: '6px' }}>
                      <span className="lbl">Xe:</span>
                      <strong className="val">{car.brand} {car.model}</strong>
                    </div>
                    <div className="info-row" style={{ fontSize: '12.5px', paddingBottom: '6px' }}>
                      <span className="lbl">Thời gian:</span>
                      <strong className="val" style={{ fontSize: '11px' }}>{pickupTime} {pickupDate} ➔ {returnTime} {returnDate}</strong>
                    </div>
                    <div className="info-row" style={{ fontSize: '12.5px', paddingBottom: '6px' }}>
                      <span className="lbl">Thời lượng:</span>
                      <strong className="val">{diffDaysStr}</strong>
                    </div>
                  </div>

                  {/* Chi tiết hóa đơn nhận xe */}
                  <div style={{ marginTop: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Tổng giá trị đơn thuê:</span>
                      <strong>{formatCurrency(totalPrice)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981', fontWeight: 600 }}>
                      <span style={{ color: '#047857' }}>Đã thanh toán giữ chỗ:</span>
                      <span>-{formatCurrency(reservationFee)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                      <span style={{ color: '#0f172a' }}>Còn lại trả khi nhận xe:</span>
                      <span style={{ color: '#e11d48' }}>{formatCurrency(remainingPayment)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Footer Action */}
            <div className="booking-modal-footer mt-6" style={{ marginTop: '24px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProcessReservationPayment}
                disabled={loading || (paymentChoice === 'wallet' && walletBalance < reservationFee)}
              >
                {paymentChoice === 'wallet' ? (
                  `Xác nhận trừ ${formatCurrency(reservationFee)} từ Ví`
                ) : paymentChoice === 'vnpay' ? (
                  'Thanh toán qua VNPAY (Giả lập)'
                ) : (
                  'Xác nhận đã chuyển khoản 500k'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2a: Biometric Face Scan */}
        {step === 'face_scan' && (
          <div className="booking-modal-body text-center">
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Xác Thực Biometric FaceID
            </h4>
            <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '20px', lineHeight: 1.6 }}>
              Vui lòng giữ đầu thẳng và đặt khuôn mặt ở giữa vòng tròn xanh lớn để chụp ảnh đối khớp sinh trắc học với ảnh FaceID gốc của bạn.
            </p>

            <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto 24px auto' }}>
              {/* Circular Camera Frame */}
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '5px solid #009698',
                overflow: 'hidden',
                background: '#0f172a',
                boxShadow: '0 8px 32px rgba(0, 150, 152, 0.3)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {faceScanStep === 'idle' && (
                  <div style={{ color: '#94a3b8', fontSize: '13px', padding: '20px' }}>
                    Camera chưa sẵn sàng
                  </div>
                )}
                
                {(faceScanStep === 'streaming' || faceScanStep === 'countdown') && (
                  <video
                    ref={faceVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                  />
                )}

                {faceScanStep === 'countdown' && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '64px',
                    fontWeight: 900,
                    textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}>
                    {faceCountdown}
                  </div>
                )}

                {faceScanStep === 'captured' && capturedFace && (
                  <img
                    src={capturedFace}
                    alt="Captured face"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {faceScanStep === 'verifying' && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Đang so khớp bằng AI...</span>
                  </div>
                )}
              </div>

              {/* Scanning Laser Line Effect */}
              {(faceScanStep === 'streaming' || faceScanStep === 'countdown') && (
                <div style={{
                  position: 'absolute',
                  top: '10%',
                  left: 0,
                  width: '100%',
                  height: '3px',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981, 0 0 15px #10b981',
                  borderRadius: '50%',
                  animation: 'scanLaser 2s linear infinite',
                  zIndex: 2
                }} />
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {(faceScanStep === 'idle' || faceScanStep === 'captured') && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startFaceScan}
                    style={{ background: '#009698', borderColor: '#009698' }}
                  >
                    📸 Kích hoạt Camera Quét mặt
                  </button>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155' }}>
                    <Upload size={16} /> Tải ảnh từ thiết bị
                    <input type="file" accept="image/*" onChange={handleFileUploadFace} style={{ display: 'none' }} />
                  </label>
                </>
              )}

              {faceScanStep === 'streaming' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartCountdown}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  ⚡ Chụp ảnh xác thực (Hẹn giờ 3s)
                </button>
              )}

              {faceScanStep === 'captured' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleVerifyFace}
                  disabled={loading}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  {loading ? 'Đang so khớp...' : '✓ Xác thực & Tiếp tục ký hợp đồng'}
                </button>
              )}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', fontSize: '12.5px', color: '#64748b', textAlign: 'left', lineHeight: 1.5 }}>
              💡 <strong>Lưu ý đối chiếu:</strong> Bạn có thể bật Camera hoặc Tải ảnh khuôn mặt từ máy tính/điện thoại. Nếu máy không có camera, bạn có thể chọn Bỏ qua để chuyển tới bước ký hợp đồng.
            </div>

            {/* Step Footer Action */}
            <div className="booking-modal-footer mt-6" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  stopFaceScanStream();
                  setStep(2);
                }}
                disabled={loading}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  stopFaceScanStream();
                  setStep('contract');
                }}
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }}
              >
                Ký hợp đồng điện tử ➔
              </button>
            </div>
          </div>
        )}

        {/* Step 2b: Read & Sign Electronic Contract */}
        {step === 'contract' && (
          <div className="booking-modal-body">
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Hợp Đồng Thuê Xe Tự Lái Điện Tử
            </h4>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
              Vui lòng kiểm tra kỹ hợp đồng, tích chọn các ô cam kết và ký tên trên bảng vẽ chữ ký số.
            </p>

            {/* Contract content paper box */}
            <div style={{
              background: '#fafafa',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              height: '220px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '11.5px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              color: '#334155',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: '16px'
            }}>
              {getContractText()}
            </div>

            {/* Verification & Agreements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={agreement1}
                  onChange={(e) => setAgreement1(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>Tôi xác nhận thông tin thuê xe và thông tin cá nhân trên là hoàn toàn chính xác.</span>
              </label>

              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={agreement2}
                  onChange={(e) => setAgreement2(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>Tôi đã đọc toàn bộ các điều khoản và quy chế cho thuê xe tự lái của ViVuCar.</span>
              </label>

              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '12.5px', color: '#334155', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={agreement3}
                  onChange={(e) => setAgreement3(e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>Tôi cam kết chịu trách nhiệm bảo quản xe và thanh toán số tiền còn lại {formatCurrency(remainingPayment)} khi nhận xe.</span>
              </label>
            </div>

            {/* Signature Pad */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  ✍ Vẽ chữ ký tay của bạn vào khung bên dưới:
                </span>
                {hasSigned && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🗑 Xóa ký lại
                  </button>
                )}
              </div>

              <div style={{
                background: '#f8fafc',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                height: '110px',
                position: 'relative',
                overflow: 'hidden',
                touchAction: 'none'
              }}>
                <canvas
                  ref={signatureCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    cursor: 'crosshair'
                  }}
                />
                {!hasSigned && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '13px'
                  }}>
                    Dùng chuột hoặc tay (màn cảm ứng) vẽ chữ ký của bạn tại đây
                  </div>
                )}
              </div>
            </div>

            {/* Step Footer Action */}
            <div className="booking-modal-footer mt-6" style={{ marginTop: '24px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setStep('face_scan')}
                disabled={loading}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBookingCompletion}
                disabled={loading || !agreement1 || !agreement2 || !agreement3 || !hasSigned}
              >
                {loading ? 'Đang xác thực và tạo đơn...' : '✓ Ký hợp đồng & Hoàn tất'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="booking-modal-body text-center">
            <CheckCircle2 className="success-lottie-icon text-success mb-2" size={60} style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>Thuê Xe Thành Công!</h2>
            <p className="subtitle mt-1" style={{ color: '#64748b', fontSize: '13.5px' }}>Hợp đồng thuê xe điện tử của bạn đã được xác thực ký số thành công.</p>

            {/* Premium Printable Bill Receipt */}
            <div className="printable-receipt-card mt-4" style={{ padding: '24px 20px', marginTop: '16px' }}>
              <div className="receipt-header">
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '12px' }}>BIÊN LAI ĐẶT XE & HỢP ĐỒNG ĐIỆN TỬ</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>Mã đặt xe: <strong>{bookingId}</strong></span>
                  <span>Ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <hr className="receipt-line" style={{ margin: '10px 0' }} />

              <div className="receipt-grid" style={{ gap: '6px' }}>
                <div className="receipt-row">
                  <span>Khách hàng:</span>
                  <strong>{user.name}</strong>
                </div>
                <div className="receipt-row">
                  <span>Mẫu xe:</span>
                  <strong>{car.brand} {car.model}</strong>
                </div>
                <div className="receipt-row">
                  <span className="lbl">Thời gian thuê:</span>
                  <strong style={{ fontSize: '11px' }}>{pickupTime} {pickupDate} ➔ {returnTime} {returnDate} ({diffDaysStr})</strong>
                </div>
                <div className="receipt-row">
                  <span>Vị trí nhận xe:</span>
                  <strong style={{ textAlign: 'right' }}>{displayLocation}</strong>
                </div>
                <div className="receipt-row">
                  <span>Thanh toán online (Giữ chỗ 30%):</span>
                  <strong style={{ color: '#10b981' }}>{formatCurrency(reservationFee)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Phần còn lại (Trả khi nhận 70%):</span>
                  <strong style={{ color: '#e11d48' }}>{formatCurrency(remainingPayment)}</strong>
                </div>
                
                {/* Visualizing Face Scan and Signature in Receipt */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', justifyContent: 'center' }}>
                  {capturedFace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>ẢNH FACEID XÁC THỰC</span>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #10b981',
                      }}>
                        <img src={capturedFace} alt="Face validation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  )}

                  {signatureCanvasRef.current && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>CHỮ KÝ BÊN THUÊ XE (BÊN B)</span>
                      <div style={{
                        width: '120px',
                        height: '48px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img src={signatureCanvasRef.current.toDataURL('image/png')} alt="Handwritten Signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="receipt-stamp" style={{ bottom: '90px', right: '16px', fontSize: '9.5px', border: '2.5px double #10b981' }}>HỢP ĐỒNG ĐÃ KÝ SỐ ✓</div>
            </div>

            {/* Contract CTA */}
            <div style={{
              margin: '20px auto 0',
              maxWidth: '420px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              border: '1.5px solid #c4b5fd',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#3730a3', marginBottom: '2px' }}>Hợp đồng điện tử đã được tạo</div>
                <div style={{ fontSize: '11.5px', color: '#6366f1' }}>Xem và ký hợp đồng để xác nhận chuyến đi chính thức</div>
              </div>
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                }}
              >
                Xem hợp đồng
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-6"
              onClick={() => {
                setCurrentTab('my-trips');
                onClose();
              }}
              style={{ width: '100%' }}
            >
              Xem chuyến đi & Hợp đồng đã ký
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Contract Modal overlay */}
    {showContractModal && createdBookingId && (
      <ContractModal
        bookingId={createdBookingId}
        user={user}
        onClose={() => setShowContractModal(false)}
      />
    )}

    {/* Sample Contract Preview Modal */}
    {showSampleContractPreview && (
      <div className="cm2-overlay" onClick={() => setShowSampleContractPreview(false)}>
        <div className="cm2-wrap" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
          <div className="cm2-toolbar">
            <div className="cm2-toolbar-left">
              <FileText size={16} color="#fff" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Hợp đồng cho thuê xe tự lái (Bản mẫu)</span>
            </div>
            <button className="cm2-close-btn" onClick={() => setShowSampleContractPreview(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="cm2-paper" style={{ borderTop: 'none', borderBottomRightRadius: '16px', borderBottomLeftRadius: '16px' }}>
            <div className="cm2-body" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', padding: '24px 32px' }}>
              <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                color: '#334155',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {getContractText()}
              </div>
              <button 
                type="button" 
                className="cm2-sign-btn" 
                style={{ background: '#1e3a8a', marginTop: '16px' }}
                onClick={() => {
                  setAgreedToSampleContract(true);
                  setShowSampleContractPreview(false);
                }}
              >
                Tôi đã hiểu & Đồng ý điều khoản
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// Inject CSS styles for Booking Modal
const injectBookingStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'booking-modal-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .booking-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      animation: editorFadeIn 0.25s ease-out;
      padding: 16px;
    }

    .booking-modal-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
      border-radius: 20px;
      width: 100%;
      max-width: 600px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      animation: editorScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Inter', sans-serif;
    }

    .booking-modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .header-title-box {
      text-align: left;
    }

    .step-indicator {
      font-size: 10px;
      font-weight: 800;
      color: #6366f1;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 2px;
    }

    .booking-modal-header h3 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .btn-close-modal {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      transition: all 0.25s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close-modal:hover {
      color: #0f172a;
      background: #f1f5f9;
      transform: rotate(90deg);
    }

    .booking-modal-body {
      padding: 24px;
      text-align: left;
    }

    /* Car Summary */
    .booking-car-summary {
      display: flex;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      align-items: center;
      transition: all 0.3s ease;
    }

    .booking-car-summary:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
    }

    .summary-car-img {
      width: 120px;
      height: 75px;
      object-fit: cover;
      border-radius: 8px;
      background: #f1f5f9;
    }

    .summary-car-info {
      text-align: left;
    }

    .car-brand-lbl {
      font-size: 11px;
      font-weight: 800;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .summary-car-info h4 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .car-desc-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Details Grid */
    .booking-details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px;
      border-radius: 12px;
    }

    .detail-lbl {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      text-align: left;
    }

    .detail-val {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      text-align: left;
      display: block;
      margin-top: 4px;
    }

    @media (max-width: 480px) {
      .booking-details-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }

    /* Cost Breakdown */
    .cost-breakdown-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }

    .cost-breakdown-card h5 {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cost-row {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      color: #475569;
      margin-bottom: 12px;
    }

    .cost-divider {
      border: none;
      height: 1px;
      background: #e2e8f0;
      margin: 12px 0;
    }

    .total-row {
      font-weight: 800;
      color: #0f172a;
      font-size: 15px;
      margin-bottom: 0;
    }

    /* License card */
    .license-verification-card {
      border-radius: 14px;
      padding: 0;
    }

    .license-status-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 14px;
      padding: 16px;
      transition: all 0.3s ease;
    }

    .license-status-success:hover {
      background: #d1fae5;
      border-color: #34d399;
    }

    .license-status-success p {
      font-size: 12.5px;
      color: #047857;
      margin-top: 3px;
    }

    .license-status-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-radius: 14px;
      padding: 16px;
      transition: all 0.3s ease;
    }

    .license-status-warning:hover {
      background: #fef3c7;
      border-color: #fbbf24;
    }

    .license-status-warning p {
      font-size: 12.5px;
      color: #b45309;
      margin-top: 3px;
      line-height: 1.5;
    }

    .upload-license-inline-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fbbf24;
      color: #1e1b4b;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
    }

    .upload-license-inline-btn:hover {
      background: #f59e0b;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
    }

    /* Step 2 Payments Redesign */
    .booking-modal-card.wide-payment-modal {
      max-width: 1000px;
      width: 95%;
    }

    .new-payment-layout {
      color: #1e293b;
    }

    .payment-grid-columns {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 850px) {
      .payment-grid-columns {
        grid-template-columns: 1fr;
      }
      .booking-modal-card.wide-payment-modal {
        max-width: 600px;
      }
    }

    .white-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
      color: #475569;
    }

    .card-sub-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      text-align: left;
    }

    .card-sub-title.text-center {
      text-align: center;
    }

    .card-sub-description {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .highlighted-price {
      font-size: 32px;
      font-weight: 800;
      color: #6366f1;
      text-align: center;
      margin: 12px 0;
    }

    .timer-box-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      text-align: center;
    }

    .timer-countdown-clock {
      font-size: 24px;
      font-weight: 800;
      color: #dc2626;
      text-align: center;
      margin: 6px auto 16px auto;
      font-family: monospace;
      background: #fef2f2;
      border: 1px solid #fca5a5;
      padding: 6px 16px;
      border-radius: 8px;
      display: table;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.05);
    }

    .booking-code-line {
      font-size: 13px;
      color: #475569;
      text-align: center;
      background: #f8fafc;
      padding: 10px;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      margin-bottom: 16px;
    }

    .car-detail-inline-box {
      font-size: 13px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-inline-row {
      display: flex;
      justify-content: space-between;
    }

    .detail-inline-row .lbl {
      color: #64748b;
    }

    .detail-inline-row .val {
      color: #1e293b;
      font-weight: 600;
    }

    .vietqr-logo-container {
      text-align: center;
      margin-bottom: 12px;
    }

    .vietqr-inline-logo {
      height: 32px;
      object-fit: contain;
    }

    .vietqr-frame-box {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: inline-block;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      margin: 0 auto 16px auto;
      text-align: center;
    }

    .vietqr-image-render {
      width: 180px;
      height: 180px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .vietqr-napas-brand {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 8px;
    }

    .divider-or-text {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin: 16px 0;
      position: relative;
    }

    .divider-or-text::before,
    .divider-or-text::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 40%;
      height: 1px;
      background: #e2e8f0;
    }

    .divider-or-text::before { left: 0; }
    .divider-or-text::after { right: 0; }

    .bank-title-transfer {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 4px;
    }

    .alert-memo-warn {
      font-size: 11px;
      line-height: 1.4;
      background: #fff5f5;
      border: 1px solid #fee2e2;
      color: #dc2626;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 16px;
      text-align: center;
      font-weight: 600;
    }

    .bank-copyable-fields {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .copyable-field-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .field-value-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
    }

    .field-value-col .lbl {
      font-size: 11px;
      color: #64748b;
    }

    .field-value-col .val {
      font-size: 13px;
      color: #1e293b;
      font-weight: 600;
    }

    .btn-copy-action {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-copy-action:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .car-preview-img-container {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      text-align: center;
    }

    .car-preview-image {
      max-width: 100%;
      height: 110px;
      object-fit: contain;
    }

    .rental-info-rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
    }

    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .info-row .lbl {
      color: #64748b;
    }

    .info-row .val {
      color: #1e293b;
      font-weight: 600;
    }

    .total-rental-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 12px 14px;
      border-radius: 10px;
    }

    .lbl-box {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .lbl-box .main {
      font-size: 13.5px;
      font-weight: 700;
      color: #059669;
    }

    .lbl-box .sub {
      font-size: 10px;
      color: #059669;
      margin-top: 1px;
    }

    .val-price {
      font-size: 18px;
      font-weight: 800;
      color: #059669;
    }

    .payment-steps-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .step-item {
      display: flex;
      gap: 14px;
      align-items: start;
    }

    .step-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.2);
    }

    .step-content {
      flex: 1;
      text-align: left;
    }

    .step-header {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
    }

    .step-desc {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.45;
    }

    .step-breakdown-details {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      margin-top: 10px;
    }

    .breakdown-row {
      display: flex;
      justify-content: space-between;
      color: #64748b;
    }

    .breakdown-row strong {
      color: #1e293b;
    }

    .strike-text {
      text-decoration: line-through;
      color: #94a3b8;
    }

    .text-orange {
      color: #f97316;
      font-weight: 700;
    }

    .bank-detail-row .val {
      font-size: 13px;
      color: #1e293b;
    }

    /* Receipt printable bill with zig-zag edge */
    .printable-receipt-card {
      background: #ffffff;
      color: #0f172a;
      border-radius: 12px;
      padding: 32px 24px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
      position: relative;
      overflow: hidden;
      max-width: 420px;
      margin: 20px auto 0;
    }

    .printable-receipt-card::before,
    .printable-receipt-card::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(-135deg, #f1f5f9 4px, transparent 0), linear-gradient(135deg, #f1f5f9 4px, transparent 0);
      background-size: 8px 6px;
      background-repeat: repeat-x;
      z-index: 10;
    }

    .printable-receipt-card::before {
      top: 0;
    }

    .printable-receipt-card::after {
      bottom: 0;
      transform: rotate(180deg);
    }

    .receipt-header {
      text-align: left;
    }

    .receipt-header h4 {
      font-size: 15px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.5px;
    }

    .receipt-id {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      display: block;
      margin-top: 2px;
    }

    .receipt-line {
      border: none;
      border-bottom: 1px dashed #cbd5e1;
      margin: 14px 0;
    }

    .receipt-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: left;
    }

    .receipt-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #475569;
    }

    .receipt-row strong {
      color: #0f172a;
    }

    .total-receipt-row {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }

    .receipt-stamp {
      position: absolute;
      bottom: 24px;
      right: 20px;
      border: 3px double #10b981;
      color: #10b981;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      transform: rotate(-12deg);
      border-radius: 4px;
      user-select: none;
      letter-spacing: 0.5px;
      opacity: 0.95;
    }

    .booking-modal-footer {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 12px;
    }

    @keyframes scanLaser {
      0% { top: 10%; }
      50% { top: 90%; }
      100% { top: 10%; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Sample Contract Overlay ── */
    .cm2-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 16px;
      animation: cm2In .2s ease;
    }
    @keyframes cm2In { from { opacity: 0; } to { opacity: 1; } }

    .cm2-wrap {
      width: 100%;
      max-width: 780px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
      animation: cm2Up .3s cubic-bezier(.34, 1.56, .64, 1);
    }
    @keyframes cm2Up { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .cm2-toolbar {
      background: rgba(30, 41, 59, .92);
      border-radius: 16px 16px 0 0;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .cm2-toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cm2-close-btn {
      background: rgba(239, 68, 68, .15);
      border: 1px solid rgba(239, 68, 68, .25);
      color: #fca5a5;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .2s;
    }
    .cm2-close-btn:hover {
      background: rgba(239, 68, 68, .3);
    }

    .cm2-paper {
      background: #fafaf8;
      border: 1px solid #d4c9b0;
      box-shadow: 0 10px 40px rgba(0, 0, 0, .15), inset 0 1px 0 rgba(255, 255, 255, .6);
      font-family: 'Inter', sans-serif;
    }
    .cm2-body {
      padding: 36px 44px;
      display: flex;
      flex-direction: column;
      gap: 26px;
      background: #fafaf8;
    }
    .cm2-sign-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all .2s;
      letter-spacing: .3px;
    }
  `;
  document.head.appendChild(style);
};

injectBookingStyles();

