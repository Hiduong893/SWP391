import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, CreditCard, ShieldCheck, CheckCircle2, ChevronRight, Upload, Info, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export const BookingModal = ({ bookingDetails, user, onUpdateUser, onClose, setCurrentTab }) => {
  const [step, setStep] = useState(1); // 1: Confirmation & License, 2: VietQR Pay, 3: Success
  const [loading, setLoading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [bookingId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());

  const { car, pickupDate, returnDate, pickupLocation } = bookingDetails;
  const { showToast } = useToast();

  // Calculate rental days
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // Price breakdown
  const basePrice = car.pricePerDay * diffDays;
  const insurancePrice = 50000 * diffDays; // 50,000 VND / day for standard insurance
  const serviceFee = 80000;
  const totalPrice = basePrice + insurancePrice + serviceFee;

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
    setLoading(true);
    try {
      const bookingData = {
        carId: car.id,
        pickupDate,
        returnDate,
        pickupLocation,
        totalPrice,
        paymentMethod: 'bank_transfer'
      };

      await api.bookings.create(bookingData);
      showToast('Xác nhận thanh toán thành công!', 'success');
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

  // VietQR Dynamic Link Generator
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<MEMO>
  const vietQrUrl = `https://img.vietqr.io/image/mbbank-1900533588-compact.png?amount=${totalPrice}&addInfo=SWP391%20THUEXE%20${car.brand}%20${bookingId}&accountName=ViVuCar%20DEMO`;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-card">
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
                  <span className="detail-val">{pickupLocation}</span>
                </div>
              </div>
              <div className="detail-item">
                <Calendar size={16} className="text-info" />
                <div>
                  <span className="detail-lbl">Thời gian thuê</span>
                  <span className="detail-val">{pickupDate} ➔ {returnDate} ({diffDays} ngày)</span>
                </div>
              </div>
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
              <hr className="cost-divider" />
              <div className="cost-row total-row">
                <span>Tổng cộng phí thuê xe</span>
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
                disabled={user.licenseStatus !== 'verified'}
                onClick={() => setStep(2)}
              >
                <span>Tiếp tục thanh toán</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: VietQR Payment Simulation */}
        {step === 2 && (
          <div className="booking-modal-body text-center">
            <p className="payment-tip-alert">
              🔒 Hãy quét mã **VietQR** ngân hàng phía dưới bằng app ngân hàng của bạn để thanh toán đặt xe tự động.
            </p>

            <div className="payment-layout-grid mt-4">
              {/* QR Code Container */}
              <div className="qr-container-box">
                <img src={vietQrUrl} alt="VietQR Payment Code" className="vietqr-image" />
                <span className="qr-brand-sub">Quét bằng ứng dụng Ngân hàng / Ví điện tử</span>
              </div>

              {/* Bank Transfer Details Text */}
              <div className="payment-text-details">
                <div className="bank-detail-row">
                  <span className="lbl">Tên ngân hàng</span>
                  <strong className="val">Ngân hàng Quân Đội (MBBank)</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Số tài khoản nhận</span>
                  <strong className="val text-primary" style={{ fontSize: '16px' }}>1900533588</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Tên tài khoản</span>
                  <strong className="val">ViVuCar DEMO SYSTEM</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Số tiền cần chuyển</span>
                  <strong className="val text-primary" style={{ fontSize: '18px' }}>{formatCurrency(totalPrice)}</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Nội dung chuyển khoản (Memo)</span>
                  <strong className="val text-warning" style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                    SWP391 THUEXE {car.brand} {bookingId}
                  </strong>
                </div>
              </div>
            </div>

            {/* Step 2 Footer Action */}
            <div className="booking-modal-footer mt-6" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={loading}>Quay lại</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePaymentSubmit}
                disabled={loading}
              >
                <CreditCard size={18} />
                {loading ? 'Đang xử lý đặt xe...' : 'Xác Nhận Đã Chuyển Khoản'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Printable Receipt */}
        {step === 3 && (
          <div className="booking-modal-body text-center">
            <CheckCircle2 className="success-lottie-icon animate-bounce text-success mb-2" size={60} style={{ display: 'inline' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 8, color: '#10b981' }}>Thuê Xe Thành Công!</h2>
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
                  <strong>{pickupLocation}</strong>
                </div>
                <div className="receipt-row">
                  <span>Phương thức:</span>
                  <strong>Chuyển khoản (VietQR)</strong>
                </div>
                <hr className="receipt-line" />
                <div className="receipt-row total-receipt-row">
                  <span>Tổng tiền đã thanh toán:</span>
                  <strong className="text-primary">{formatCurrency(totalPrice)}</strong>
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
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .btn-close-modal:hover {
      color: white;
      background: rgba(255, 255, 255, 0.05);
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
    }

    .summary-car-img {
      width: 110px;
      height: 70px;
      object-fit: cover;
      border-radius: 8px;
      background: #f1f5f9;
    }

    .summary-car-info {
      text-align: left;
    }

    .car-brand-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-car-info h4 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .car-desc-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Details Grid */
    .booking-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
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
      color: #64748b;
      font-weight: 500;
      text-align: left;
    }

    .detail-val {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      text-align: left;
      display: block;
      margin-top: 2px;
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
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .cost-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 10px;
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
      border-radius: 12px;
      padding: 14px 18px;
    }

    .license-status-success {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #a7f3d0;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 12px;
      padding: 12px;
    }

    .license-status-success p {
      font-size: 12px;
      color: #34d399;
      margin-top: 2px;
    }

    .license-status-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #fde68a;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-radius: 12px;
      padding: 12px;
    }

    .license-status-warning p {
      font-size: 12px;
      color: #fbbf24;
      margin-top: 2px;
      line-height: 1.4;
    }

    .upload-license-inline-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fbbf24;
      color: #1e1b4b;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .upload-license-inline-btn:hover {
      background: #f59e0b;
      transform: translateY(-1px);
    }

    /* Step 2 Payments */
    .payment-tip-alert {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      color: #5b21b6;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      text-align: left;
      line-height: 1.4;
    }

    .payment-tip-alert strong {
      color: #4338ca;
    }

    .payment-layout-grid {
      display: grid;
      grid-template-columns: 1.2fr 1.8fr;
      gap: 20px;
      align-items: center;
    }

    .qr-container-box {
      background: white;
      padding: 16px;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .vietqr-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
    }

    .qr-brand-sub {
      color: #475569;
      font-size: 9px;
      font-weight: 700;
      margin-top: 8px;
    }

    .payment-text-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 14px;
      text-align: left;
    }

    .bank-detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
    }

    .bank-detail-row:last-child {
      border: none;
      padding-bottom: 0;
    }

    .bank-detail-row .lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .bank-detail-row .val {
      font-size: 13px;
      color: #1e293b;
    }

    @media (max-width: 600px) {
      .payment-layout-grid {
        grid-template-columns: 1fr;
      }
      .qr-container-box {
        max-width: 240px;
        margin: 0 auto;
      }
    }

    /* Receipt printable bill */
    .printable-receipt-card {
      background: white;
      color: #0f172a;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.5);
      position: relative;
      overflow: hidden;
      max-width: 420px;
      margin: 20px auto 0;
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
