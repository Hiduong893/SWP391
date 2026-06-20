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
        paymentMethod: 'wallet'
      };

      const result = await api.bookings.create(bookingData);

      // Cập nhật số dư ví mới nhất cho parent component
      if (result.newWalletBalance !== undefined) {
        onUpdateUser({ ...user, walletBalance: result.newWalletBalance });
      }

      showToast('Đặt xe và trừ cọc thành công! Đã trừ 5.000.000đ tiền cọc từ ví.', 'success');
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

  // Lấy thông tin ngân hàng của chủ xe (nếu có) hoặc dùng tài khoản ViVuCar demo
  const ownerBank = car.ownerBankName || 'MBBank';
  const ownerAccount = car.ownerAccountNumber || '1900533588';
  const ownerAccountName = car.ownerAccountHolder || 'VIVUCAR SYSTEM DEMO';

  // Quy chia ngân hàng sang bank_id VietQR
  const bankIdMap = {
    'MBBank': 'mbbank', 'Vietcombank': 'vietcombank', 'Techcombank': 'techcombank',
    'ACB': 'acb', 'VPBank': 'vpbank', 'BIDV': 'bidv', 'Agribank': 'agribank',
    'VietinBank': 'vietinbank', 'TPBank': 'tpbank', 'OCB': 'ocb'
  };
  const bankId = bankIdMap[ownerBank] || 'mbbank';

  // VietQR Dynamic Link Generator
  const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${ownerAccount}-compact.png?amount=5000000&addInfo=VIVUCAR%20COC%20${bookingId}&accountName=${encodeURIComponent(ownerAccountName)}`;

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

        {/* Step Progress Bar */}
        <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center', gap: 0 }}>
          {[1, 2, 3].map((s, i) => (
            <>
              <div
                key={s}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step >= s ? '#009698' : '#e2e8f0',
                  color: step >= s ? 'white' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 800, flexShrink: 0,
                  transition: 'all 0.3s ease',
                  boxShadow: step >= s ? '0 2px 8px rgba(0,150,152,0.35)' : 'none'
                }}
              >{s}</div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: step > s ? '#009698' : '#e2e8f0', transition: 'background 0.3s ease' }} />}
            </>
          ))}
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
              <div className="cost-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(0,150,152,0.15)', color: '#d97706', fontWeight: 700, fontSize: '14px' }}>
                <span>💳 Tiền cọc bảo đảm (thu hồi sau chuyến)</span>
                <span>5.000.000đ</span>
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
                  <span className="lbl">Ngân hàng nhận</span>
                  <strong className="val">{ownerBank}</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Số tài khoản nhận</span>
                  <strong className="val text-primary" style={{ fontSize: '16px', letterSpacing: '1px', fontFamily: 'monospace' }}>{ownerAccount}</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Tên tài khoản</span>
                  <strong className="val">{ownerAccountName}</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Số tiền cần chuyển (Tiền cọc)</span>
                  <strong className="val text-primary" style={{ fontSize: '18px' }}>{formatCurrency(5000000)}</strong>
                </div>
                <div className="bank-detail-row">
                  <span className="lbl">Nội dung chuyển khoản (Memo)</span>
                  <strong className="val" style={{ fontFamily: 'monospace', fontSize: '13px', color: '#d97706' }}>
                    VIVUCAR COC {bookingId}
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
            <p className="subtitle mt-1" style={{ color: '#cbd5e1' }}>Hệ thống đã nhận được thanh toán đặt xe của bạn.</p>

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
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: bm-fadeIn 0.2s ease-out;
      padding: 16px;
    }

    @keyframes bm-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .booking-modal-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
      border-radius: 20px;
      width: 100%;
      max-width: 620px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      animation: bm-slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes bm-slideIn {
      from { opacity: 0; transform: scale(0.94) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .booking-modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      border-radius: 20px 20px 0 0;
    }

    .header-title-box {
      text-align: left;
    }

    .step-indicator {
      font-size: 10px;
      font-weight: 800;
      color: #009698;
      letter-spacing: 1.5px;
      display: block;
      margin-bottom: 3px;
    }

    .booking-modal-header h3 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .btn-close-modal {
      background: rgba(15, 23, 42, 0.06);
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close-modal:hover {
      color: #dc2626;
      background: rgba(239, 68, 68, 0.1);
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
      border-radius: 14px;
      padding: 14px;
      align-items: center;
    }

    .summary-car-img {
      width: 120px;
      height: 75px;
      object-fit: cover;
      border-radius: 10px;
      background: #e2e8f0;
    }

    .summary-car-info {
      text-align: left;
    }

    .car-brand-lbl {
      font-size: 10px;
      font-weight: 800;
      color: #009698;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .summary-car-info h4 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    .car-desc-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
    }

    /* Details Grid */
    .booking-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px;
      border-radius: 12px;
      transition: border-color 0.2s;
    }

    .detail-item:hover {
      border-color: rgba(0, 150, 152, 0.2);
    }

    .detail-lbl {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
      text-align: left;
    }

    .detail-val {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      text-align: left;
      display: block;
      margin-top: 2px;
    }

    .text-info { color: #009698; }

    @media (max-width: 480px) {
      .booking-details-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }

    /* Cost Breakdown */
    .cost-breakdown-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
    }

    .cost-breakdown-card h5 {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .cost-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }

    .cost-divider {
      border: none;
      height: 1px;
      background: #e2e8f0;
      margin: 14px 0;
    }

    .total-row {
      font-weight: 700;
      color: #0f172a;
      font-size: 15px;
      margin-bottom: 0;
    }

    .text-primary { color: #009698 !important; }

    /* License card */
    .license-verification-card {
      border-radius: 12px;
      padding: 4px 0;
    }

    .license-status-success {
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #059669;
      display: flex;
      gap: 12px;
      align-items: center;
      border-radius: 12px;
      padding: 14px;
    }

    .license-status-success strong { color: #059669; }
    .license-status-success p {
      font-size: 12px;
      color: #047857;
      margin-top: 2px;
    }

    .license-status-warning {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #d97706;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-radius: 12px;
      padding: 14px;
    }

    .license-status-warning strong { color: #92400e; }
    .license-status-warning p {
      font-size: 12px;
      color: #92400e;
      margin-top: 3px;
      line-height: 1.5;
    }

    .text-success { color: #10b981 !important; }
    .text-warning { color: #d97706 !important; }

    .upload-license-inline-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #1c1917;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      margin-top: 8px;
      box-shadow: 0 2px 8px rgba(245,158,11,0.3);
    }

    .upload-license-inline-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245,158,11,0.4);
    }

    /* Step 2 Payments */
    .payment-tip-alert {
      background: rgba(0, 150, 152, 0.06);
      border: 1px solid rgba(0, 150, 152, 0.2);
      color: #0f766e;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13.5px;
      text-align: left;
      line-height: 1.5;
      font-weight: 500;
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
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .vietqr-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
    }

    .qr-brand-sub {
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      margin-top: 8px;
      text-align: center;
    }

    .payment-text-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 18px;
      border-radius: 14px;
      text-align: left;
    }

    .bank-detail-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
    }

    .bank-detail-row:last-child {
      border: none;
      padding-bottom: 0;
    }

    .bank-detail-row .lbl {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }

    .bank-detail-row .val {
      font-size: 13px;
      color: #0f172a;
      font-weight: 600;
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
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
      max-width: 440px;
      margin: 20px auto 0;
      border: 1px solid #e2e8f0;
    }

    .receipt-header {
      text-align: left;
    }

    .receipt-header h4 {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
    }

    .receipt-id {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      display: block;
      margin-top: 3px;
    }

    .receipt-line {
      border: none;
      border-bottom: 1px dashed #e2e8f0;
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
      font-size: 12.5px;
      color: #475569;
    }

    .receipt-row strong {
      color: #0f172a;
      font-weight: 600;
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
      border: 3px double #009698;
      color: #009698;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      transform: rotate(-12deg);
      border-radius: 4px;
      user-select: none;
      letter-spacing: 0.5px;
      opacity: 0.9;
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
