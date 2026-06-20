import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, CreditCard, ShieldCheck, CheckCircle2, ChevronRight, Upload, Info, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export const BookingModal = ({ bookingDetails, user, onUpdateUser, onClose, setCurrentTab }) => {
  const [step, setStep] = useState(1); // 1: Confirmation & License, 2: VietQR Pay, 3: Success
  const [loading, setLoading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [bookingId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());
  const [payMethod, setPayMethod] = useState('vietqr'); // 'vietqr' or 'vnpay'
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes = 900 seconds
  const [pickupMethod, setPickupMethod] = useState('self'); // 'self' or 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [paymentChoice, setPaymentChoice] = useState('vietqr'); // 'vietqr' or 'wallet'
  const [sysConfig, setSysConfig] = useState({
    bankId: 'mbbank',
    bankName: 'ViVuCar Bank',
    bankAccountNumber: '1900533588',
    bankAccountHolder: 'VIVUCAR SYSTEM'
  });
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);

  const { car, pickupLocation } = bookingDetails;
  const [pickupDate, setPickupDate] = useState(bookingDetails.pickupDate);
  const [returnDate, setReturnDate] = useState(bookingDetails.returnDate);
  const { showToast } = useToast();

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

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label} vào bộ nhớ tạm.`, 'success');
  };

  // Calculate rental days
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // Price breakdown
  const basePrice = car.pricePerDay * diffDays;
  const insurancePrice = 50000 * diffDays; // 50,000 VND / day for standard insurance
  const serviceFee = 80000;
  const deliveryFee = pickupMethod === 'delivery' ? 100000 : 0;
  const totalPrice = basePrice + insurancePrice + serviceFee + deliveryFee;
  const securityDeposit = 5000000;
  const totalPayment = totalPrice + securityDeposit;
  const displayLocation = pickupMethod === 'delivery' ? deliveryAddress : pickupLocation;

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

  const handlePaymentSubmit = async () => {
    if (paymentChoice === 'wallet' && walletBalance < 500000) {
      showToast('Số dư ví không đủ. Vui lòng chọn phương thức khác hoặc nạp thêm tiền.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        carId: car.id,
        pickupDate,
        returnDate,
        pickupLocation: displayLocation,
        totalPrice,
        paymentMethod: paymentChoice
      };

      await api.bookings.create(bookingData);

      showToast('Xác nhận thanh toán thành công!', 'success');
      if (paymentChoice === 'wallet') {
        const newBalance = walletBalance - 500000;
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
      showToast(error.message || 'Lỗi tạo giao dịch đặt xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const reservationFee = 500000;
  const remainingDeposit = securityDeposit - reservationFee;
  const remainingPayment = totalPrice + remainingDeposit;

  const vietQrUrl = `https://img.vietqr.io/image/${sysConfig.bankId}-${sysConfig.bankAccountNumber}-compact.png?amount=${reservationFee}&addInfo=${encodeURIComponent(`THUEXE ${car.brand} ${bookingId}`)}&accountName=${encodeURIComponent(sysConfig.bankAccountHolder)}`;

  return (
    <div className="booking-modal-overlay">
      <div className={`booking-modal-card ${step === 2 ? 'wide-payment-modal' : ''}`}>
        {/* Header */}
        <div className="booking-modal-header">
          <div className="header-title-box">
            <span className="step-indicator">BƯỚC {step}/3</span>
            <h3>{step === 1 ? 'Xác Nhận Hành Trình' : step === 2 ? 'Thanh Toán Đặt Xe' : 'Đặt Xe Thành Công!'}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} disabled={loading}>
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
              <div className="detail-item">
                <MapPin size={16} className="text-info" />
                <div>
                  <span className="detail-lbl">Địa điểm nhận/trả xe</span>
                  <span className="detail-val">{displayLocation || 'Chưa nhập địa chỉ'}</span>
                </div>
              </div>
              <div className="detail-item edit-dates-item" style={{ minWidth: '220px' }}>
                <Calendar size={16} className="text-info" style={{ marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <span className="detail-lbl">Thời gian thuê</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Ngày nhận</span>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => {
                          const newPickup = e.target.value;
                          setPickupDate(newPickup);
                          if (new Date(newPickup) >= new Date(returnDate)) {
                            const tomorrow = new Date(newPickup);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setReturnDate(tomorrow.toISOString().split('T')[0]);
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          color: '#0f172a',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: "'Outfit', sans-serif",
                          outline: 'none',
                          width: '100%',
                          colorScheme: 'light',
                          cursor: 'pointer',
                          fontWeight: '500',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <span style={{ color: '#64748b', marginTop: '14px', fontSize: '10px' }}>➔</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>Ngày trả</span>
                      <input
                        type="date"
                        value={returnDate}
                        min={pickupDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          color: '#0f172a',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: "'Outfit', sans-serif",
                          outline: 'none',
                          width: '100%',
                          colorScheme: 'light',
                          cursor: 'pointer',
                          fontWeight: '500',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6366f1', marginTop: '8px', fontWeight: 700 }}>
                    Tổng thời gian: {diffDays} ngày
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Method Selection */}
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
                  disabled={!!car.ownerId}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: !!car.ownerId
                      ? '1px dashed #cbd5e1'
                      : (pickupMethod === 'delivery' ? '2px solid #6366f1' : '1px solid #e2e8f0'),
                    background: !!car.ownerId
                      ? '#f1f5f9'
                      : (pickupMethod === 'delivery' ? '#f5f3ff' : '#ffffff'),
                    color: !!car.ownerId
                      ? '#94a3b8'
                      : (pickupMethod === 'delivery' ? '#4f46e5' : '#64748b'),
                    fontWeight: '700',
                    cursor: !!car.ownerId ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    opacity: !!car.ownerId ? 0.6 : 1
                  }}
                  onClick={() => !car.ownerId && setPickupMethod('delivery')}
                >
                  <div style={{ fontSize: '13px', color: !!car.ownerId ? '#94a3b8' : (pickupMethod === 'delivery' ? '#4f46e5' : '#1e293b'), marginBottom: '4px', fontWeight: '700' }}>
                    🚚 Giao nhận tận nơi
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: !!car.ownerId ? '#94a3b8' : '#64748b', lineHeight: 1.4 }}>
                    {car.ownerId ? 'Chỉ áp dụng nhận xe trực tiếp từ Chủ xe' : 'Bonbon giao xe tận nơi (+100.000đ)'}
                  </div>
                </button>
              </div>

              {pickupMethod === 'delivery' && !car.ownerId && (
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>
                    Địa chỉ nhận xe chi tiết
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ giao xe của bạn..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="cost-breakdown-card mt-4">
              <h5>Chi tiết hóa đơn</h5>
              <div className="cost-row">
                <span>Đơn giá thuê ({diffDays} ngày)</span>
                <span>{formatCurrency(car.pricePerDay)} x {diffDays}</span>
              </div>
              <div className="cost-row">
                <span>Bảo hiểm chuyến đi (Bắt buộc)</span>
                <span>{formatCurrency(50000)} x {diffDays}</span>
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
              <div className="cost-row">
                <span>Tiền đặt cọc bảo đảm (Hoàn trả sau)</span>
                <span>{formatCurrency(securityDeposit)}</span>
              </div>
              <hr className="cost-divider" />
              <div className="cost-row total-row">
                <span>Tổng tiền cần thanh toán</span>
                <span className="text-primary">{formatCurrency(totalPayment)}</span>
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
                      <span>{licenseUploading ? 'Đang tải lên...' : 'Tải lên Bằng lái (Sửa & Duyệt ngay)'}</span>
                      <input type="file" onChange={handleLicenseUpload} accept="image/*" style={{ display: 'none' }} disabled={licenseUploading} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1 Footer Action */}
            <div className="booking-modal-footer mt-6">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy bỏ</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={user.licenseStatus !== 'verified' || (pickupMethod === 'delivery' && !deliveryAddress.trim())}
                onClick={() => setStep(2)}
              >
                Tiếp tục thanh toán
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Payment Selector & Details */}
        {step === 2 && (
          <div className="booking-modal-body new-payment-layout">
            {/* Payment Method Selector */}
            <div className="payment-method-selection" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Chọn phương thức thanh toán giữ chỗ (500.000đ)
              </h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: paymentChoice === 'wallet' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
                    background: paymentChoice === 'wallet' ? '#f5f3ff' : '#ffffff',
                    color: '#1e293b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: paymentChoice === 'wallet' ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={() => setPaymentChoice('wallet')}
                >
                  <span style={{ fontSize: '20px' }}>💼</span>
                  <div>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '750' }}>Ví ViVuCar</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', marginTop: '1px' }}>
                      Số dư: <span style={{ color: walletBalance >= 500000 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{formatCurrency(walletBalance)}</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: paymentChoice === 'vietqr' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
                    background: paymentChoice === 'vietqr' ? '#f5f3ff' : '#ffffff',
                    color: '#1e293b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: paymentChoice === 'vietqr' ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={() => setPaymentChoice('vietqr')}
                >
                  <span style={{ fontSize: '20px' }}>🏧</span>
                  <div>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '750' }}>Chuyển khoản (VietQR)</div>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', marginTop: '1px' }}>
                      Quét mã VietQR chuyển khoản nhanh
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="payment-grid-columns">
              {/* Left Column */}
              <div className="payment-column-left">
                {/* Card 1: Thanh toán phí giữ chỗ */}
                <div className="payment-card-sub white-card text-center">
                  <h4 className="card-sub-title">Thanh toán phí giữ chỗ</h4>
                  <div className="highlighted-price">{formatCurrency(reservationFee)}</div>
                  
                  <div className="timer-box-lbl">Thời gian giữ chỗ còn lại</div>
                  <div className="timer-countdown-clock">
                    {formatTime(timeLeft)}
                  </div>
                  
                  <div className="booking-code-line">
                    Mã đặt xe của bạn: <strong>{bookingId}</strong>
                  </div>
                  
                  <div className="car-detail-inline-box">
                    <div className="detail-inline-row">
                      <span className="lbl">Loại xe:</span>
                      <strong className="val">{car.brand} {car.model}</strong>
                    </div>
                    <div className="detail-inline-row">
                      <span className="lbl">Ngày nhận trả xe:</span>
                      <strong className="val">{pickupDate} đến {returnDate}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: VietQR Pay Flow */}
                {paymentChoice === 'vietqr' && (
                  <div className="payment-card-sub white-card text-center mt-4">
                    <h4 className="card-sub-title">Thanh toán bằng mã QR</h4>
                    <p className="card-sub-description">
                      Vui lòng quét mã QR Code hoặc chụp ảnh màn hình QR Code để thanh toán bằng ứng dụng ngân hàng
                    </p>

                    <div className="vietqr-logo-container">
                      <img src="https://vietqr.net/portal-service/img/Logo-VietQR.png" alt="VietQR" className="vietqr-inline-logo" />
                    </div>

                    <div className="vietqr-frame-box">
                      <img src={vietQrUrl} alt="VietQR Payment Code" className="vietqr-image-render" />
                      <div className="vietqr-napas-brand">napas 247 | 🏧 {sysConfig.bankName}</div>
                    </div>

                    <div className="divider-or-text">Hoặc</div>

                    <h5 className="bank-title-transfer">Chuyển khoản qua ngân hàng</h5>
                    <p className="alert-memo-warn text-red">
                      Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống ghi nhận thông tin đơn hàng
                    </p>

                    <div className="bank-copyable-fields">
                      <div className="copyable-field-row">
                        <div className="field-value-col">
                          <span className="lbl">Nội dung CK:</span>
                          <strong className="val text-orange" style={{ fontFamily: 'monospace' }}>THUEXE {car.brand} {bookingId}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(`THUEXE ${car.brand} ${bookingId}`, 'Nội dung chuyển khoản')}>
                          📋 Sao chép
                        </button>
                      </div>

                      <div className="copyable-field-row">
                        <div className="field-value-col">
                          <span className="lbl">Số tài khoản:</span>
                          <strong className="val">{sysConfig.bankAccountNumber}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(sysConfig.bankAccountNumber, 'Số tài khoản')}>
                          📋 Sao chép
                        </button>
                      </div>

                      <div className="copyable-field-row">
                        <div className="field-value-col">
                          <span className="lbl">Ngân hàng:</span>
                          <strong className="val">{sysConfig.bankName}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(sysConfig.bankName, 'Tên ngân hàng')}>
                          📋 Sao chép
                        </button>
                      </div>

                      <div className="copyable-field-row">
                        <div className="field-value-col">
                          <span className="lbl">Chủ tài khoản:</span>
                          <strong className="val">{sysConfig.bankAccountHolder}</strong>
                        </div>
                        <button type="button" className="btn-copy-action" onClick={() => handleCopyText(sysConfig.bankAccountHolder, 'Chủ tài khoản')}>
                          📋 Sao chép
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 2: Wallet Pay Flow */}
                {paymentChoice === 'wallet' && (
                  <div className="payment-card-sub white-card text-center mt-4">
                    <h4 className="card-sub-title">Thanh toán bằng số dư Ví</h4>
                    <p className="card-sub-description">
                      Hệ thống sẽ khấu trừ trực tiếp 500.000đ từ ví ViVuCar của bạn
                    </p>

                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      margin: '16px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748b' }}>Phí đặt cọc giữ chỗ:</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(reservationFee)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <span style={{ color: '#64748b' }}>Số dư ví hiện tại:</span>
                        <strong style={{ color: walletBalance >= reservationFee ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(walletBalance)}
                        </strong>
                      </div>
                    </div>

                    {walletBalance < reservationFee ? (
                      <div className="alert-memo-warn text-red" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', margin: 0 }}>
                        ⚠️ Số dư Ví của bạn không đủ. Vui lòng nạp thêm tiền hoặc chọn phương thức chuyển khoản VietQR ở trên.
                      </div>
                    ) : (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', textAlign: 'center' }}>
                        ✅ Số dư khả dụng. Bạn có thể sử dụng Ví để thanh toán giữ chỗ.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="payment-column-right">
                {/* Card 1: Thông tin đơn thuê */}
                <div className="payment-card-sub white-card text-left">
                  <h4 className="card-sub-title text-center">Thông tin đơn thuê</h4>
                  
                  <div className="car-preview-img-container">
                    <img src={car.image} alt={car.model} className="car-preview-image" />
                  </div>

                  <div className="rental-info-rows">
                    <div className="info-row">
                      <span className="lbl">Mã đặt xe:</span>
                      <strong className="val">{bookingId}</strong>
                    </div>
                    <div className="info-row">
                      <span className="lbl">Tên khách thuê:</span>
                      <strong className="val">{user.name}</strong>
                    </div>
                    <div className="info-row">
                      <span className="lbl">Số điện thoại:</span>
                      <strong className="val">{user.phone || 'Chưa cập nhật'}</strong>
                    </div>
                    <div className="info-row">
                      <span className="lbl">Ngày nhận:</span>
                      <strong className="val">{pickupDate}</strong>
                    </div>
                    <div className="info-row">
                      <span className="lbl">Ngày trả:</span>
                      <strong className="val">{returnDate}</strong>
                    </div>
                    <div className="info-row">
                      <span className="lbl">Loại xe:</span>
                      <strong className="val">{car.brand} {car.model}</strong>
                    </div>
                    
                    <div className="total-rental-box mt-4">
                      <div className="lbl-box">
                        <span className="main">Tổng cộng tiền thuê xe</span>
                        <span className="sub">Bạn sẽ thanh toán khi nhận xe</span>
                      </div>
                      <strong className="val-price">{formatCurrency(totalPrice)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Các bước thanh toán */}
                <div className="payment-card-sub white-card text-left mt-4">
                  <h4 className="card-sub-title">Các bước thanh toán</h4>

                  <div className="payment-steps-list">
                    <div className="step-item">
                      <div className="step-circle">1</div>
                      <div className="step-content">
                        <div className="step-header">
                          <span>Thanh toán giữ chỗ qua BonbonCar</span>
                          <strong>{formatCurrency(reservationFee)}</strong>
                        </div>
                        <p className="step-desc">
                          Tiền này để xác nhận đơn thuê và giữ xe, sẽ được trừ vào tiền thế chấp khi nhận xe
                        </p>
                      </div>
                    </div>

                    <div className="step-item mt-4">
                      <div className="step-circle">2</div>
                      <div className="step-content">
                        <div className="step-header">
                          <span>Thanh toán khi nhận xe</span>
                          <strong className="text-primary">{formatCurrency(remainingPayment)}</strong>
                        </div>
                        <div className="step-breakdown-details mt-2">
                          <div className="breakdown-row">
                            <span>Tiền thuê</span>
                            <strong>{formatCurrency(totalPrice)}</strong>
                          </div>
                          <div className="breakdown-row">
                            <span>Tiền thế chấp</span>
                            <div>
                              <span className="strike-text mr-2">{formatCurrency(securityDeposit)}</span>
                              <strong className="text-orange">{formatCurrency(remainingDeposit)}</strong>
                            </div>
                          </div>
                        </div>
                        <p className="step-desc mt-2">
                          Sẽ hoàn lại khi trả xe
                        </p>
                      </div>
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
                onClick={handlePaymentSubmit}
                disabled={loading || (paymentChoice === 'wallet' && walletBalance < reservationFee)}
              >
                {loading ? (
                  <span>Đang xử lý...</span>
                ) : paymentChoice === 'wallet' ? (
                  'Xác nhận trừ số dư Ví'
                ) : (
                  'Xác nhận đã chuyển khoản'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="booking-modal-body text-center">
            <CheckCircle2 className="success-lottie-icon animate-bounce text-success mb-2" size={60} style={{ display: 'inline-block' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>Thuê Xe Thành Công!</h2>
            <p className="subtitle mt-1" style={{ color: '#64748b' }}>Hệ thống đã nhận được thanh toán đặt xe của bạn.</p>

            {/* Premium Printable Bill Receipt */}
            <div className="printable-receipt-card mt-4">
              <div className="receipt-header">
                <h4>HÓA ĐƠN THUÊ XE TỰ LÁI</h4>
                <span className="receipt-id">Mã đặt xe: {bookingId}</span>
              </div>
              <hr className="receipt-line" />

              <div className="receipt-grid">
                <div className="receipt-row">
                  <span>Khách hàng:</span>
                  <strong>{user.name}</strong>
                </div>
                <div className="receipt-row">
                  <span>Mẫu xe:</span>
                  <strong>{car.brand} {car.model}</strong>
                </div>
                <div className="receipt-row">
                  <span>Thời gian thuê:</span>
                  <strong>{pickupDate} ➔ {returnDate}</strong>
                </div>
                <div className="receipt-row">
                  <span>Số ngày thuê:</span>
                  <strong>{diffDays} ngày</strong>
                </div>
                <div className="receipt-row">
                  <span>Vị trí nhận xe:</span>
                  <strong>{displayLocation}</strong>
                </div>
                <div className="receipt-row">
                  <span>Phương thức:</span>
                  <strong>{paymentChoice === 'wallet' ? 'Số dư Ví ViVuCar' : 'Chuyển khoản (VietQR)'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Phí thuê xe:</span>
                  <strong>{formatCurrency(totalPrice)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Đặt cọc bảo đảm:</span>
                  <strong>{formatCurrency(securityDeposit)}</strong>
                </div>
                <hr className="receipt-line" />
                <div className="receipt-row total-receipt-row">
                  <span>Tổng tiền đã thanh toán:</span>
                  <strong className="text-primary">{formatCurrency(totalPayment)}</strong>
                </div>
              </div>

              <div className="receipt-stamp">PAID / ĐÃ THANH TOÁN</div>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-6"
              onClick={() => {
                setCurrentTab('my-trips');
                onClose();
              }}
            >
              Xem chuyến đi của tôi
            </button>
          </div>
        )}
      </div>
    </div>
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
      font-family: 'Outfit', sans-serif;
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
  `;
  document.head.appendChild(style);
};

injectBookingStyles();

