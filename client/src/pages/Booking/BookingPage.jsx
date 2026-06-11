import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import {
  Car, Calendar, MapPin, CreditCard, Shield, CheckCircle,
  ChevronRight, ChevronLeft, Upload, AlertTriangle, Info,
  Clock, Tag, Wallet, User, Phone, FileText, X, Copy, Check
} from 'lucide-react';

// ─────────────────────────────────────────────
// VietVR BookingPage - Đặt xe & Đặt cọc VietQR
// Author: VietVR
// NOTE: File này hoàn toàn độc lập, không ảnh hưởng code của thành viên khác
// ─────────────────────────────────────────────

export const BookingPage = ({ bookingDetails, user, onUpdateUser, onClose, setCurrentTab }) => {
  // ── State quản lý bước đặt xe (1: Nhập thông tin, 2: Xem hóa đơn, 3: Thanh toán, 4: Thành công)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [copied, setCopied] = useState(null); // track which field was copied

  // ── Thông tin chuyến đi từ props
  const { car, pickupDate: initPickup, returnDate: initReturn, pickupLocation: initLocation } = bookingDetails;
  const { showToast } = useToast();

  // ── State form thông tin người dùng
  const [renterInfo, setRenterInfo] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    note: '',
    agreeTerms: false,
  });

  // ── State ngày/địa điểm (có thể chỉnh sửa trong bước 1)
  const [pickupDate, setPickupDate] = useState(initPickup);
  const [returnDate, setReturnDate] = useState(initReturn);
  const [pickupLocation, setPickupLocation] = useState(initLocation);

  // ── ID booking ngẫu nhiên
  const [bookingRef] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return 'VR' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });

  // ── Tính toán giá
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  const diffDays = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)));
  const basePrice = car.pricePerDay * diffDays;
  const depositAmount = 10000; // Tiền cọc 10K (TEST - đổi lại sau)
  const insuranceFee = 50000 * diffDays;
  const serviceFee = 80000;
  const totalRentalPrice = basePrice + insuranceFee + serviceFee;
  const depositPercent = Math.round((depositAmount / totalRentalPrice) * 100);

  // ── VietQR URL (tiền cọc)
  const vietQrDepositUrl = `https://img.vietqr.io/image/agribank-3909205242273-compact2.png?amount=${depositAmount}&addInfo=DATCOC%20${bookingRef}%20${car.brand}&accountName=Le%20Quang%20Minh%20Duc`;

  // ── Format tiền VND
  const formatVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  // ── Upload bằng lái xe
  const handleLicenseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Chỉ chấp nhận file ảnh (JPG, PNG...)', 'warning');
      return;
    }
    setLicenseUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const data = await api.user.uploadLicense(reader.result);
        onUpdateUser(data.user);
        showToast('Tải bằng lái thành công! Đang chờ xét duyệt.', 'success');
      } catch (err) {
        showToast(err.message || 'Lỗi tải bằng lái xe.', 'error');
      } finally {
        setLicenseUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Bước 1: Kiểm tra form và chuyển bước 2
  const handleStep1Next = () => {
    if (!renterInfo.fullName.trim()) {
      showToast('Vui lòng nhập họ tên người thuê.', 'warning'); return;
    }
    if (!renterInfo.phone.trim() || !/^(0|\+84)[0-9]{9,10}$/.test(renterInfo.phone.trim())) {
      showToast('Số điện thoại không hợp lệ (VD: 0901234567).', 'warning'); return;
    }
    if (new Date(pickupDate) >= new Date(returnDate)) {
      showToast('Ngày trả xe phải sau ngày nhận xe.', 'warning'); return;
    }
    if (!renterInfo.agreeTerms) {
      showToast('Vui lòng đồng ý với điều khoản thuê xe trước khi tiếp tục.', 'warning'); return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Bước 2: Xác nhận hóa đơn → chuyển bước 3 (thanh toán cọc)
  const handleStep2Next = () => {
    if (user?.licenseStatus !== 'verified') {
      showToast('Bằng lái xe chưa được xác thực. Vui lòng tải lên và chờ duyệt.', 'warning'); return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Bước 3: Xác nhận đã chuyển cọc → gọi API tạo booking
  const handleConfirmDeposit = async () => {
    setLoading(true);
    try {
      const bookingData = {
        carId: car.id,
        pickupDate,
        returnDate,
        pickupLocation,
        totalPrice: totalRentalPrice,
        paymentMethod: 'bank_transfer',
      };
      await api.bookings.create(bookingData);
      showToast('Đặt cọc & đặt xe thành công!', 'success');
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast(err.message || 'Lỗi xác nhận đặt xe. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Inject CSS vào DOM
  useEffect(() => {
    injectBookingPageStyles();
  }, []);

  return (
    <div className="vr-booking-overlay">
      <div className="vr-booking-container">

        {/* ═══ HEADER ═══ */}
        <div className="vr-booking-header">
          <div className="vr-booking-header-info">
            <div className="vr-step-badge">BƯỚC {step} / 4</div>
            <h2 className="vr-booking-title">
              {step === 1 && '📋 Thông Tin Đặt Xe'}
              {step === 2 && '💰 Xác Nhận Hóa Đơn'}
              {step === 3 && '📲 Thanh Toán Đặt Cọc'}
              {step === 4 && '✅ Đặt Xe Thành Công!'}
            </h2>
          </div>
          <button className="vr-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* ═══ PROGRESS BAR ═══ */}
        <div className="vr-progress-bar-track">
          <div className="vr-progress-bar-fill" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        {/* ══════════════════════════════════════
            BƯỚC 1: THÔNG TIN ĐẶT XE
        ══════════════════════════════════════ */}
        {step === 1 && (
          <div className="vr-booking-body">
            {/* Tóm tắt xe */}
            <div className="vr-car-summary-card">
              <img src={car.image} alt={car.model} className="vr-car-thumb" />
              <div className="vr-car-summary-info">
                <span className="vr-car-brand-tag">{car.brand}</span>
                <h3 className="vr-car-name">{car.model}</h3>
                <p className="vr-car-specs">{car.seats} chỗ • {car.transmission} • {car.fuel}</p>
                <p className="vr-car-price-label">
                  <Tag size={13} /> {formatVND(car.pricePerDay)} / ngày
                </p>
              </div>
            </div>

            {/* Form thông tin */}
            <div className="vr-form-section">
              <h4 className="vr-section-title"><User size={16} /> Thông tin người thuê xe</h4>

              <div className="vr-form-grid">
                <div className="vr-form-group">
                  <label className="vr-form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="vr-form-input"
                    placeholder="Nguyễn Văn A"
                    value={renterInfo.fullName}
                    onChange={(e) => setRenterInfo(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div className="vr-form-group">
                  <label className="vr-form-label">Số điện thoại *</label>
                  <input
                    type="tel"
                    className="vr-form-input"
                    placeholder="0901234567"
                    value={renterInfo.phone}
                    onChange={(e) => setRenterInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="vr-form-section-divider" />
              <h4 className="vr-section-title"><MapPin size={16} /> Thông tin chuyến đi</h4>

              <div className="vr-form-group">
                <label className="vr-form-label">Địa điểm nhận xe</label>
                <select
                  className="vr-form-input vr-form-select"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                >
                  <option value="">-- Chọn địa điểm --</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                </select>
              </div>

              <div className="vr-form-grid">
                <div className="vr-form-group">
                  <label className="vr-form-label"><Calendar size={13} /> Ngày nhận xe *</label>
                  <input
                    type="date"
                    className="vr-form-input"
                    value={pickupDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
                <div className="vr-form-group">
                  <label className="vr-form-label"><Calendar size={13} /> Ngày trả xe *</label>
                  <input
                    type="date"
                    className="vr-form-input"
                    value={returnDate}
                    min={pickupDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="vr-form-group">
                <label className="vr-form-label"><FileText size={13} /> Ghi chú thêm (tùy chọn)</label>
                <textarea
                  className="vr-form-input vr-form-textarea"
                  placeholder="Yêu cầu đặc biệt, địa chỉ giao xe cụ thể..."
                  rows={3}
                  value={renterInfo.note}
                  onChange={(e) => setRenterInfo(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              {/* Bằng lái */}
              <div className="vr-form-section-divider" />
              <h4 className="vr-section-title"><Shield size={16} /> Xác thực bằng lái xe</h4>

              {user?.licenseStatus === 'verified' ? (
                <div className="vr-license-ok">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Bằng lái xe đã được xác thực!</strong>
                    <p>Bạn đủ điều kiện để thuê xe tự lái.</p>
                  </div>
                </div>
              ) : user?.licenseStatus === 'pending' ? (
                <div className="vr-license-pending">
                  <Clock size={20} />
                  <div>
                    <strong>Bằng lái đang chờ xét duyệt</strong>
                    <p>Nhân viên CSKH sẽ xác thực trong vòng 1-2 giờ làm việc. Bạn vẫn có thể tiếp tục đặt xe, nhưng cần được duyệt trước khi nhận xe.</p>
                  </div>
                </div>
              ) : (
                <div className="vr-license-warn">
                  <AlertTriangle size={20} />
                  <div style={{ flex: 1 }}>
                    <strong>Chưa có bằng lái xe!</strong>
                    <p>Luật Giao thông yêu cầu xác thực bằng lái trước khi thuê xe tự lái. Tải lên ngay để tiếp tục.</p>
                    <label className="vr-upload-btn">
                      <Upload size={13} />
                      <span>{licenseUploading ? 'Đang tải lên...' : 'Tải ảnh bằng lái'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleLicenseUpload}
                        disabled={licenseUploading}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Đồng ý điều khoản */}
              <div className="vr-terms-check">
                <label className="vr-checkbox-label">
                  <input
                    type="checkbox"
                    checked={renterInfo.agreeTerms}
                    onChange={(e) => setRenterInfo(prev => ({ ...prev, agreeTerms: e.target.checked }))}
                    className="vr-checkbox"
                  />
                  <span>
                    Tôi đã đọc và đồng ý với <span className="vr-link">Điều khoản thuê xe</span> và <span className="vr-link">Chính sách hoàn tiền</span> của ViVuCar.
                  </span>
                </label>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="vr-booking-footer">
              <button className="vr-btn-secondary" onClick={onClose}>Hủy</button>
              <button className="vr-btn-primary" onClick={handleStep1Next}>
                Xem hóa đơn <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BƯỚC 2: HÓA ĐƠN & XÁC NHẬN
        ══════════════════════════════════════ */}
        {step === 2 && (
          <div className="vr-booking-body">
            <div className="vr-invoice-card">
              <div className="vr-invoice-header">
                <h4>HÓA ĐƠN THUÊ XE</h4>
                <span className="vr-invoice-ref">Mã: {bookingRef}</span>
              </div>

              {/* Thông tin xe */}
              <div className="vr-invoice-car-row">
                <img src={car.image} alt={car.model} className="vr-invoice-car-img" />
                <div>
                  <div className="vr-invoice-car-name">{car.brand} {car.model}</div>
                  <div className="vr-invoice-car-sub">{car.seats} chỗ • {car.transmission}</div>
                </div>
              </div>

              <div className="vr-invoice-divider" />

              {/* Chi tiết chuyến */}
              <div className="vr-invoice-detail-grid">
                <div className="vr-invoice-detail-item">
                  <span className="vr-invoice-lbl"><User size={12} /> Người thuê</span>
                  <span className="vr-invoice-val">{renterInfo.fullName}</span>
                </div>
                <div className="vr-invoice-detail-item">
                  <span className="vr-invoice-lbl"><Phone size={12} /> SĐT</span>
                  <span className="vr-invoice-val">{renterInfo.phone}</span>
                </div>
                <div className="vr-invoice-detail-item">
                  <span className="vr-invoice-lbl"><MapPin size={12} /> Địa điểm</span>
                  <span className="vr-invoice-val">{pickupLocation || 'Chưa chọn'}</span>
                </div>
                <div className="vr-invoice-detail-item">
                  <span className="vr-invoice-lbl"><Clock size={12} /> Thời gian</span>
                  <span className="vr-invoice-val">{pickupDate} → {returnDate} ({diffDays} ngày)</span>
                </div>
              </div>

              <div className="vr-invoice-divider" />

              {/* Bảng giá */}
              <div className="vr-price-breakdown">
                <div className="vr-price-row">
                  <span>Giá thuê ({diffDays} ngày × {formatVND(car.pricePerDay)})</span>
                  <span>{formatVND(basePrice)}</span>
                </div>
                <div className="vr-price-row">
                  <span>Bảo hiểm chuyến đi ({diffDays} ngày × 50K)</span>
                  <span>{formatVND(insuranceFee)}</span>
                </div>
                <div className="vr-price-row">
                  <span>Phí dịch vụ nền tảng</span>
                  <span>{formatVND(serviceFee)}</span>
                </div>
                <div className="vr-price-divider" />
                <div className="vr-price-row vr-price-total">
                  <span>Tổng tiền thuê</span>
                  <span className="vr-total-highlight">{formatVND(totalRentalPrice)}</span>
                </div>
                <div className="vr-price-divider" />
                <div className="vr-price-row vr-deposit-row">
                  <span>
                    <Wallet size={14} /> Tiền cọc yêu cầu ({depositPercent}% tổng)
                    <span className="vr-deposit-note"> — Thanh toán ngay, hoàn trả khi trả xe</span>
                  </span>
                  <span className="vr-deposit-highlight">{formatVND(depositAmount)}</span>
                </div>
                <div className="vr-price-row vr-remaining-row">
                  <span>Còn lại thanh toán khi nhận xe</span>
                  <span>{formatVND(Math.max(0, totalRentalPrice - depositAmount))}</span>
                </div>
              </div>
            </div>

            {/* Bằng lái xác thực */}
            {user?.licenseStatus !== 'verified' && (
              <div className="vr-license-warn" style={{ marginTop: '16px' }}>
                <AlertTriangle size={20} />
                <div style={{ flex: 1 }}>
                  <strong>Bằng lái xe chưa được xác thực!</strong>
                  <p>Bạn cần xác thực bằng lái trước khi tiến hành thanh toán.</p>
                  <label className="vr-upload-btn">
                    <Upload size={13} />
                    <span>{licenseUploading ? 'Đang tải lên...' : 'Tải ảnh bằng lái'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLicenseUpload} disabled={licenseUploading} />
                  </label>
                </div>
              </div>
            )}

            <div className="vr-booking-footer">
              <button className="vr-btn-secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Quay lại
              </button>
              <button className="vr-btn-primary" onClick={handleStep2Next}>
                Tiến hành đặt cọc <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BƯỚC 3: THANH TOÁN VIETQR (ĐẶT CỌC)
        ══════════════════════════════════════ */}
        {step === 3 && (
          <div className="vr-booking-body">
            <div className="vr-payment-alert">
              🔒 Quét mã <strong>VietQR</strong> bằng ứng dụng ngân hàng để thanh toán <strong>tiền cọc {formatVND(depositAmount)}</strong>.
              Tiền cọc sẽ được hoàn lại 100% khi bạn trả xe đúng hạn.
            </div>

            <div className="vr-payment-grid">
              {/* QR Code */}
              <div className="vr-qr-box">
                <div className="vr-qr-header">ĐẶT CỌC - VIETQR</div>
                <img
                  src={vietQrDepositUrl}
                  alt="VietQR Đặt cọc"
                  className="vr-qr-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="vr-qr-amount">{formatVND(depositAmount)}</div>
                <div className="vr-qr-sub">Quét bằng app ngân hàng / ví điện tử</div>
              </div>

              {/* Thông tin chuyển khoản */}
              <div className="vr-bank-details">
                <h4 className="vr-bank-title">Thông tin chuyển khoản</h4>

                {[
                  { label: 'Ngân hàng', value: 'Agribank (Nông nghiệp & PTNT)', key: 'bank' },
                  { label: 'Số tài khoản', value: '3909205242273', key: 'account', highlight: true },
                  { label: 'Tên tài khoản', value: 'Le Quang Minh Duc', key: 'name' },
                  { label: 'Số tiền cọc', value: `${depositAmount.toLocaleString('vi-VN')} VND`, key: 'amount', big: true },
                  {
                    label: 'Nội dung CK',
                    value: `DATCOC ${bookingRef} ${car.brand}`,
                    key: 'memo',
                    warn: true,
                    copyable: true,
                  },
                ].map((item) => (
                  <div className="vr-bank-row" key={item.key}>
                    <span className="vr-bank-lbl">{item.label}</span>
                    <div className="vr-bank-val-wrap">
                      <strong
                        className={`vr-bank-val ${item.highlight ? 'vr-val-highlight' : ''} ${item.big ? 'vr-val-big' : ''} ${item.warn ? 'vr-val-warn' : ''}`}
                        style={{ fontFamily: item.warn ? 'monospace' : undefined }}
                      >
                        {item.value}
                      </strong>
                      {item.copyable && (
                        <button
                          className="vr-copy-btn"
                          onClick={() => handleCopy(item.value, item.key)}
                          title="Sao chép"
                        >
                          {copied === item.key ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="vr-bank-notice">
                  <Info size={13} />
                  Nhập <strong>chính xác nội dung chuyển khoản</strong> để hệ thống xác nhận tự động.
                </div>
              </div>
            </div>

            <div className="vr-booking-footer" style={{ marginTop: '20px' }}>
              <button className="vr-btn-secondary" onClick={() => setStep(2)} disabled={loading}>
                <ChevronLeft size={16} /> Quay lại
              </button>
              <button
                className="vr-btn-primary vr-btn-confirm"
                onClick={handleConfirmDeposit}
                disabled={loading}
              >
                <CreditCard size={16} />
                {loading ? 'Đang xử lý...' : 'Xác Nhận Đã Chuyển Cọc'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BƯỚC 4: THÀNH CÔNG
        ══════════════════════════════════════ */}
        {step === 4 && (
          <div className="vr-booking-body vr-success-body">
            <div className="vr-success-icon">✅</div>
            <h2 className="vr-success-title">Đặt Xe Thành Công!</h2>
            <p className="vr-success-sub">Hệ thống đã nhận được đặt cọc của bạn. Chúc bạn có một chuyến đi vui vẻ!</p>

            {/* Receipt */}
            <div className="vr-receipt">
              <div className="vr-receipt-head">
                <h4>HÓA ĐƠN ĐẶT XE — ViVuCar</h4>
                <span className="vr-receipt-ref">#{bookingRef}</span>
              </div>
              <div className="vr-receipt-divider-dashed" />
              <div className="vr-receipt-rows">
                {[
                  ['Khách hàng', renterInfo.fullName],
                  ['SĐT', renterInfo.phone],
                  ['Xe thuê', `${car.brand} ${car.model}`],
                  ['Địa điểm', pickupLocation],
                  ['Nhận xe', pickupDate],
                  ['Trả xe', returnDate],
                  ['Số ngày', `${diffDays} ngày`],
                  ['Phương thức', 'Chuyển khoản (VietQR)'],
                ].map(([label, value]) => (
                  <div className="vr-receipt-row" key={label}>
                    <span>{label}:</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="vr-receipt-divider-dashed" />
              <div className="vr-receipt-row vr-receipt-total">
                <span>Tiền cọc đã thanh toán:</span>
                <strong className="vr-receipt-total-val">{formatVND(depositAmount)}</strong>
              </div>
              <div className="vr-receipt-row" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                <span>Còn lại khi nhận xe:</span>
                <strong>{formatVND(Math.max(0, totalRentalPrice - depositAmount))}</strong>
              </div>
              <div className="vr-receipt-stamp">ĐÃ ĐẶT CỌC</div>
            </div>

            <div className="vr-success-actions">
              <button
                className="vr-btn-primary"
                onClick={() => { setCurrentTab('my-trips'); onClose(); }}
              >
                Xem chuyến đi của tôi
              </button>
              <button className="vr-btn-secondary" onClick={onClose}>
                Về trang chủ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CSS Styles – inject vào DOM khi component mount
// ─────────────────────────────────────────────
const injectBookingPageStyles = () => {
  const styleId = 'vr-booking-page-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* ── Overlay & Container ── */
    .vr-booking-overlay {
      position: fixed;
      inset: 0;
      background: rgba(4, 6, 14, 0.88);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 16px;
      animation: vrFadeIn 0.22s ease-out;
    }

    @keyframes vrFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes vrSlideUp {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .vr-booking-container {
      background: #0d1117;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 22px;
      width: 100%;
      max-width: 680px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7);
      animation: vrSlideUp 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
      scrollbar-width: thin;
      scrollbar-color: #1e293b transparent;
    }

    .vr-booking-container::-webkit-scrollbar { width: 5px; }
    .vr-booking-container::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

    /* ── Header ── */
    .vr-booking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .vr-step-badge {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .vr-booking-title {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
      font-family: 'Outfit', sans-serif;
    }

    .vr-close-btn {
      background: none;
      border: none;
      color: #475569;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }
    .vr-close-btn:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }

    /* ── Progress Bar ── */
    .vr-progress-bar-track {
      height: 3px;
      background: rgba(255,255,255,0.06);
    }
    .vr-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #38bdf8, #6366f1);
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Body ── */
    .vr-booking-body {
      padding: 24px;
      flex: 1;
    }

    /* ── Car Summary ── */
    .vr-car-summary-card {
      display: flex;
      gap: 16px;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 22px;
      align-items: center;
    }
    .vr-car-thumb {
      width: 110px;
      height: 68px;
      object-fit: cover;
      border-radius: 10px;
      background: #1e293b;
      flex-shrink: 0;
    }
    .vr-car-brand-tag {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .vr-car-name {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 3px 0;
    }
    .vr-car-specs {
      font-size: 12px;
      color: #64748b;
    }
    .vr-car-price-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
      margin-top: 4px;
    }

    /* ── Form ── */
    .vr-form-section { }
    .vr-section-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 14px 0;
    }
    .vr-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    @media (max-width: 500px) {
      .vr-form-grid { grid-template-columns: 1fr; }
    }
    .vr-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .vr-form-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .vr-form-input {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 14px;
      color: #f1f5f9;
      font-size: 14px;
      font-family: 'Outfit', sans-serif;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .vr-form-input:focus {
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(56,189,248,0.04);
    }
    .vr-form-select { cursor: pointer; }
    .vr-form-textarea { resize: vertical; min-height: 70px; }
    .vr-form-section-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 20px 0 16px;
    }

    /* ── License cards ── */
    .vr-license-ok {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(16,185,129,0.08);
      border: 1px solid rgba(16,185,129,0.22);
      border-radius: 12px;
      padding: 12px 14px;
      color: #6ee7b7;
      margin-bottom: 16px;
    }
    .vr-license-ok p { font-size: 12px; color: #34d399; margin: 2px 0 0; }

    .vr-license-pending {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(56,189,248,0.06);
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 12px;
      padding: 12px 14px;
      color: #7dd3fc;
      margin-bottom: 16px;
    }
    .vr-license-pending p { font-size: 12px; color: #38bdf8; margin: 2px 0 0; line-height: 1.5; }

    .vr-license-warn {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(245,158,11,0.07);
      border: 1px solid rgba(245,158,11,0.2);
      border-radius: 12px;
      padding: 12px 14px;
      color: #fde68a;
      margin-bottom: 16px;
    }
    .vr-license-warn p { font-size: 12px; color: #fbbf24; margin: 3px 0; line-height: 1.5; }

    .vr-upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f59e0b;
      color: #1a1000;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 8px;
      transition: all 0.2s;
    }
    .vr-upload-btn:hover { background: #d97706; }

    /* ── Terms checkbox ── */
    .vr-terms-check { margin-bottom: 4px; }
    .vr-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .vr-checkbox { accent-color: #38bdf8; width: 15px; height: 15px; margin-top: 2px; flex-shrink: 0; }
    .vr-link { color: #38bdf8; text-decoration: underline; cursor: pointer; }

    /* ── Footer buttons ── */
    .vr-booking-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .vr-btn-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all 0.25s;
      box-shadow: 0 4px 15px rgba(56,189,248,0.25);
    }
    .vr-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%);
      box-shadow: 0 6px 20px rgba(56,189,248,0.4);
      transform: translateY(-1px);
    }
    .vr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .vr-btn-secondary {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.05);
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Outfit', sans-serif;
      transition: all 0.2s;
    }
    .vr-btn-secondary:hover { background: rgba(255,255,255,0.08); color: #f1f5f9; }
    .vr-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Invoice (Step 2) ── */
    .vr-invoice-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 20px;
      position: relative;
    }
    .vr-invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .vr-invoice-header h4 {
      font-size: 13px;
      font-weight: 800;
      color: #cbd5e1;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .vr-invoice-ref {
      font-size: 11px;
      font-weight: 600;
      color: #38bdf8;
      font-family: monospace;
    }
    .vr-invoice-car-row {
      display: flex;
      gap: 14px;
      align-items: center;
      margin-bottom: 14px;
    }
    .vr-invoice-car-img {
      width: 80px;
      height: 52px;
      object-fit: cover;
      border-radius: 8px;
    }
    .vr-invoice-car-name { font-size: 15px; font-weight: 700; color: #f1f5f9; }
    .vr-invoice-car-sub { font-size: 12px; color: #64748b; }

    .vr-invoice-divider {
      border: none;
      border-top: 1px dashed rgba(255,255,255,0.08);
      margin: 14px 0;
    }

    .vr-invoice-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 4px;
    }
    @media (max-width: 500px) {
      .vr-invoice-detail-grid { grid-template-columns: 1fr; }
    }
    .vr-invoice-detail-item { display: flex; flex-direction: column; gap: 3px; }
    .vr-invoice-lbl {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .vr-invoice-val { font-size: 13px; font-weight: 600; color: #e2e8f0; }

    .vr-price-breakdown { }
    .vr-price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 9px;
    }
    .vr-price-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 10px 0;
    }
    .vr-price-total { font-size: 15px; font-weight: 700; color: #f1f5f9; }
    .vr-total-highlight { color: #38bdf8; font-size: 17px; }
    .vr-deposit-row { background: rgba(56,189,248,0.05); padding: 8px 10px; border-radius: 8px; font-weight: 600; color: #7dd3fc; }
    .vr-deposit-note { font-size: 11px; font-weight: 400; color: #64748b; }
    .vr-deposit-highlight { color: #38bdf8; font-size: 15px; white-space: nowrap; }
    .vr-remaining-row { font-size: 12px; color: #64748b; }

    /* ── Payment (Step 3) ── */
    .vr-payment-alert {
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.22);
      color: #c7d2fe;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .vr-payment-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 560px) {
      .vr-payment-grid { grid-template-columns: 1fr; }
    }

    .vr-qr-box {
      background: #ffffff;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 12px 35px rgba(0,0,0,0.4);
    }
    .vr-qr-header {
      font-size: 10px;
      font-weight: 800;
      color: #1e3a5f;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .vr-qr-img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
    }
    .vr-qr-amount {
      font-size: 14px;
      font-weight: 800;
      color: #1e293b;
      margin-top: 8px;
    }
    .vr-qr-sub {
      font-size: 9px;
      color: #64748b;
      text-align: center;
      margin-top: 4px;
    }

    .vr-bank-details {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 16px;
    }
    .vr-bank-title {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 14px 0;
    }
    .vr-bank-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .vr-bank-row:last-of-type { border: none; padding-bottom: 0; margin-bottom: 0; }
    .vr-bank-lbl { font-size: 11px; color: #64748b; font-weight: 500; }
    .vr-bank-val-wrap { display: flex; align-items: center; gap: 6px; }
    .vr-bank-val { font-size: 13px; color: #e2e8f0; }
    .vr-val-highlight { color: #38bdf8; font-size: 16px; }
    .vr-val-big { color: #38bdf8; font-size: 15px; }
    .vr-val-warn { color: #fbbf24; }

    .vr-copy-btn {
      background: rgba(255,255,255,0.07);
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      color: #64748b;
      transition: all 0.2s;
    }
    .vr-copy-btn:hover { background: rgba(255,255,255,0.12); color: #f1f5f9; }

    .vr-bank-notice {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
      margin-top: 12px;
      line-height: 1.5;
    }

    .vr-btn-confirm {
      flex: 1;
      justify-content: center;
    }

    /* ── Success (Step 4) ── */
    .vr-success-body { text-align: center; }
    .vr-success-icon { font-size: 56px; margin-bottom: 12px; }
    .vr-success-title {
      font-size: 22px;
      font-weight: 800;
      color: #34d399;
      margin: 0 0 8px;
    }
    .vr-success-sub {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .vr-receipt {
      background: #ffffff;
      color: #0f172a;
      border-radius: 14px;
      padding: 22px;
      max-width: 400px;
      margin: 0 auto 24px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .vr-receipt-head { text-align: left; margin-bottom: 4px; }
    .vr-receipt-head h4 {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .vr-receipt-ref {
      font-size: 11px;
      font-weight: 600;
      color: #0ea5e9;
      font-family: monospace;
    }
    .vr-receipt-divider-dashed {
      border: none;
      border-top: 1.5px dashed #cbd5e1;
      margin: 12px 0;
    }
    .vr-receipt-rows { display: flex; flex-direction: column; gap: 8px; }
    .vr-receipt-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #475569;
      text-align: left;
    }
    .vr-receipt-row strong { color: #0f172a; }
    .vr-receipt-total {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .vr-receipt-total-val { color: #0ea5e9; }

    .vr-receipt-stamp {
      position: absolute;
      bottom: 20px;
      right: 16px;
      border: 2.5px double #10b981;
      color: #10b981;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      transform: rotate(-12deg);
      border-radius: 4px;
      letter-spacing: 0.5px;
      opacity: 0.9;
      user-select: none;
    }

    .vr-success-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
  `;
  document.head.appendChild(style);
};
