import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Pen, Download, Printer, Shield, Building2, User, Car, Calendar, MapPin } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

/* ─── Inject styles once ─── */
const inject = () => {
  if (document.getElementById('cm2-styles')) return;
  const s = document.createElement('style');
  s.id = 'cm2-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700;800;900&display=swap');

    /* ── Overlay ── */
    .cm2-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:1200;padding:16px;animation:cm2In .2s ease}
    @keyframes cm2In{from{opacity:0}to{opacity:1}}

    /* ── Wrapper (scrollable) ── */
    .cm2-wrap{width:100%;max-width:780px;max-height:calc(100vh - 32px);overflow-y:auto;display:flex;flex-direction:column;gap:0;animation:cm2Up .3s cubic-bezier(.34,1.56,.64,1)}
    @keyframes cm2Up{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}

    /* ── Toolbar ── */
    .cm2-toolbar{background:rgba(30,41,59,.92);border-radius:16px 16px 0 0;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px}
    .cm2-toolbar-left{display:flex;align-items:center;gap:8px}
    .cm2-toolbar-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.5px}
    .badge-draft{background:#fef9c3;color:#92400e}
    .badge-rentersigned{background:#dbeafe;color:#1e40af}
    .badge-bothsigned{background:#dcfce7;color:#166534}
    .badge-active{background:#d1fae5;color:#065f46}
    .badge-completed{background:#f1f5f9;color:#475569}
    .badge-cancelled{background:#fee2e2;color:#991b1b}
    .cm2-toolbar-actions{display:flex;gap:6px}
    .cm2-icon-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#e2e8f0;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
    .cm2-icon-btn:hover{background:rgba(255,255,255,.2)}
    .cm2-close-btn{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.25);color:#fca5a5;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
    .cm2-close-btn:hover{background:rgba(239,68,68,.3)}

    /* ── Document paper ── */
    .cm2-paper{background:#fafaf8;border:1px solid #d4c9b0;box-shadow:0 4px 40px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.6);font-family:'Inter',sans-serif}

    /* ── Letterhead ── */
    .cm2-letterhead{background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 60%,#1e3a5f 100%);padding:28px 32px 22px;position:relative;overflow:hidden}
    .cm2-letterhead::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.04)}
    .cm2-letterhead::after{content:'';position:absolute;bottom:-30px;left:60px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.03)}
    .cm2-lh-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .cm2-lh-brand{display:flex;align-items:center;gap:12px}
    .cm2-lh-logo{width:44px;height:44px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;font-family:'Inter',sans-serif;box-shadow:0 4px 12px rgba(245,158,11,.4)}
    .cm2-lh-company h1{color:#fff;font-size:16px;font-weight:800;margin:0 0 2px;letter-spacing:.5px}
    .cm2-lh-company p{color:rgba(255,255,255,.65);font-size:10px;margin:0;letter-spacing:.3px}
    .cm2-lh-meta{text-align:right}
    .cm2-lh-meta .cm2-doc-type{color:rgba(255,255,255,.5);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;display:block;margin-bottom:4px}
    .cm2-lh-meta .cm2-doc-code{color:#fbbf24;font-family:'EB Garamond',serif;font-size:20px;font-weight:700;display:block;letter-spacing:1px}
    .cm2-lh-meta .cm2-doc-date{color:rgba(255,255,255,.5);font-size:10px;margin-top:2px;display:block}
    .cm2-lh-divider{border:none;border-top:1px solid rgba(255,255,255,.15);margin:16px 0 10px}
    .cm2-lh-bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
    .cm2-lh-bottom span{color:rgba(255,255,255,.5);font-size:9.5px}
    .cm2-lh-bottom strong{color:#fbbf24;font-size:9.5px}

    /* ── Body ── */
    .cm2-body{padding:28px 32px;display:flex;flex-direction:column;gap:22px;background:#fafaf8}
    .cm2-section{display:flex;flex-direction:column;gap:12px}
    .cm2-sec-title{font-size:12.5px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0}
    .cm2-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:580px){.cm2-grid-2{grid-template-columns:1fr}}
    .cm2-meta-item{font-size:12.5px;line-height:1.6;color:#334155}
    .cm2-meta-lbl{color:#64748b;font-weight:500;display:inline-block;width:120px}
    .cm2-meta-val{color:#0f172a;font-weight:600}

    /* ── Phase Card ── */
    .cm2-phase-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02)}
    .cm2-phase-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:6px}
    .cm2-phase-title{font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px}
    .cm2-phase-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px}
    .status-paid{background:#dcfce7;color:#166534}
    .status-unpaid{background:#fee2e2;color:#991b1b}
    .status-pending{background:#fef9c3;color:#92400e}
    .cm2-phase-body{display:flex;flex-direction:column;gap:6px}
    .cm2-phase-row{display:flex;justify-content:space-between;font-size:11.5px;color:#64748b}
    .cm2-phase-row strong{color:#0f172a}

    /* ── Terms Snap ── */
    .cm2-terms-wrap{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;max-height:180px;overflow-y:auto}
    .cm2-term-item{margin-bottom:10px;font-size:11.5px;line-height:1.5;color:#475569}
    .cm2-term-item strong{color:#1e3a5f;display:block;margin-bottom:2px}

    /* ── Sign Area ── */
    .cm2-sign-wrap{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:12px;padding:20px}
    .cm2-sign-title{font-size:12px;font-weight:800;color:#4f46e5;margin:0 0 12px;display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.5px}
    .cm2-sign-check{display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:14px}
    .cm2-sign-check input{width:16px;height:16px;accent-color:#6366f1;margin-top:2px;cursor:pointer;flex-shrink:0}
    .cm2-sign-check span{font-size:12px;color:#374151;line-height:1.6;font-weight:500}
    .cm2-sign-btn{width:100%;padding:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;letter-spacing:.3px}
    .cm2-sign-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.35)}
    .cm2-sign-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

    /* ── Already signed ── */
    .cm2-signed-ok{display:flex;align-items:center;gap:8px;color:#166534;font-size:13px;font-weight:700;padding:14px 16px;background:#dcfce7;border:1.5px solid #86efac;border-radius:10px}

    /* ── Seal area ── */
    .cm2-seal-area{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:18px 0 0;border-top:1px solid #e8e0d0;flex-wrap:wrap}
    .cm2-seal-party{flex:1;min-width:160px;text-align:center}
    .cm2-seal-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
    .cm2-seal-circle{width:80px;height:80px;border-radius:50%;border:3px dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;text-align:center;line-height:1.3;padding:6px}
    .seal-signed{border-color:#22c55e;background:#f0fdf4;color:#166534}
    .seal-unsigned{border-color:#d1d5db;background:#f9fafb;color:#9ca3af}
    .cm2-seal-name{font-size:11px;font-weight:700;color:#0f172a;font-family:'EB Garamond',serif}
    .cm2-seal-date{font-size:9.5px;color:#64748b;font-style:italic}

    /* ── Footer ── */
    .cm2-footer{background:#f5f1e8;border-top:1px solid #d4c9b0;padding:10px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px}
    .cm2-footer span{font-size:9.5px;color:#92785a}
  `;
  document.head.appendChild(s);
};

/* ─── Helpers ─── */
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDt = (iso) => iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtD = (iso) => iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const STATUS_MAP = {
  Draft: { label: 'Chờ ký', cls: 'draft' },
  RenterSigned: { label: 'Chờ chủ xe ký', cls: 'rentersigned' },
  BothSigned: { label: 'Có hiệu lực', cls: 'bothsigned' },
  Active: { label: 'Đang thực hiện', cls: 'active' },
  Completed: { label: 'Đã hoàn thành', cls: 'completed' },
  Cancelled: { label: 'Đã hủy', cls: 'cancelled' },
};

/* ─── Component ─── */
export const ContractModal = ({ bookingId, user, onClose, onContractSigned }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const { showToast } = useToast();

  useEffect(() => { inject(); load(); }, [bookingId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.contracts.getByBookingId(bookingId);
      setData(res);
    } catch (e) {
      showToast(e.message || 'Không tải được hợp đồng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!agreed) return;
    setSigning(true);
    try {
      const res = await api.contracts.renterSign(bookingId);
      showToast('Ký hợp đồng điện tử thành công!', 'success');
      if (onContractSigned) onContractSigned(res.contract);
      load();
    } catch (e) {
      showToast(e.message || 'Lỗi khi ký hợp đồng.', 'error');
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="cm2-overlay" onClick={onClose}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'cm2spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes cm2spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Đang tải hợp đồng...</div>
        </div>
      </div>
    );
  }

  if (!data || !data.contract) {
    return (
      <div className="cm2-overlay" onClick={onClose}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '360px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Lỗi hợp đồng</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Hợp đồng điện tử cho chuyến đi này chưa được tạo hoặc không tồn tại.</div>
          <button className="cm2-sign-btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    );
  }

  const { contract, booking, renter, car, owner } = data;
  const statusInfo = STATUS_MAP[contract.status] || { label: contract.status, cls: 'draft' };
  
  // Checking roles for signature CTA display
  const isRenter = user.id === booking.userId;
  const isRenterSigned = !!contract.renterSignedAt;
  const isOwnerSigned = !!contract.ownerSignedAt;

  // Set default snapshot terms if missing
  const terms = contract.termsSnapshot || {
    platformName: 'ViVuCar',
    cancellationPolicy: 'Hủy trước 24h: Hoàn 70% cọc giữ chỗ. Hủy trong 24h: Không hoàn.',
    damagePolicy: 'Thiệt hại vật chất sẽ được khấu trừ từ tiền cọc bảo đảm.',
    lateReturnPolicy: 'Trả xe muộn dưới 2h: phụ phí 200.000đ. Từ 2h trở lên: tính thêm 1 ngày thuê.',
    trafficViolationPolicy: 'Phạt nguội phát sinh trong thời gian thuê do người thuê chịu hoàn toàn.',
    refundPolicy: 'Tiền cọc bảo đảm hoàn trả trong vòng 3 ngày làm việc sau khi trả xe không phát sinh.'
  };

  return (
    <div className="cm2-overlay" onClick={onClose}>
      <div className="cm2-wrap" onClick={e => e.stopPropagation()}>
        
        {/* ========== Top Toolbar ========== */}
        <div className="cm2-toolbar">
          <div className="cm2-toolbar-left">
            <Shield size={16} color="#fbbf24" />
            <span style={{ color: '#fff', fontSize: '13.5px', fontWeight: 700 }}>Hợp Đồng Điện Tử (e-Contract)</span>
            <span className={`cm2-toolbar-badge badge-${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="cm2-toolbar-actions">
            <button className="cm2-icon-btn" onClick={handlePrint} title="In hợp đồng">
              <Printer size={15} />
            </button>
            <button className="cm2-close-btn" onClick={onClose} title="Đóng">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ========== Main Document Paper ========== */}
        <div className="cm2-paper">
          
          {/* Document Header / Letterhead */}
          <div className="cm2-letterhead">
            <div className="cm2-lh-top">
              <div className="cm2-lh-brand">
                <div className="cm2-lh-logo">V</div>
                <div className="cm2-lh-company">
                  <h1>{terms.platformName || 'ViVuCar'}</h1>
                  <p>Nền tảng cho thuê xe tự lái hàng đầu Việt Nam</p>
                </div>
              </div>
              <div className="cm2-lh-meta">
                <span className="cm2-doc-type">Hợp đồng thuê xe tự lái</span>
                <span className="cm2-doc-code">{contract.contractCode || 'HD-TEMP'}</span>
                <span className="cm2-doc-date">Ngày lập: {fmtD(contract.createdAt)}</span>
              </div>
            </div>
            <hr className="cm2-lh-divider" />
            <div className="cm2-lh-bottom">
              <span>Đơn vị làm chứng: <strong>Công ty Cổ phần Công nghệ ViVuCar</strong></span>
              <span>Mã bảo mật: <strong>SHA-256 E-SIGN SECURED</strong></span>
            </div>
          </div>

          <div className="cm2-body">
            {/* Section 1: Parties Info */}
            <div className="cm2-section">
              <h3 className="cm2-sec-title">Các bên liên quan</h3>
              <div className="cm2-grid-2">
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={13} /> Bên A (Chủ xe)
                  </div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Họ và tên:</span><span className="cm2-meta-val">{owner?.name || 'Hệ thống đối tác ViVuCar'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Số điện thoại:</span><span className="cm2-meta-val">{owner?.phone || '—'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Email:</span><span className="cm2-meta-val">{owner?.email || '—'}</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} /> Bên B (Người thuê)
                  </div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Họ và tên:</span><span className="cm2-meta-val">{renter?.name || '—'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Số điện thoại:</span><span className="cm2-meta-val">{renter?.phone || '—'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Email:</span><span className="cm2-meta-val">{renter?.email || '—'}</span></div>
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle Info */}
            <div className="cm2-section">
              <h3 className="cm2-sec-title">Thông tin phương tiện & Hành trình</h3>
              <div className="cm2-grid-2">
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Car size={13} /> Chi tiết xe
                  </div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Mẫu xe:</span><span className="cm2-meta-val">{car ? `${car.brand} ${car.model}` : '—'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Biển kiểm soát:</span><span className="cm2-meta-val" style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{car?.licensePlate || '—'}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Nhiên liệu nhận:</span><span className="cm2-meta-val">Theo hiện trạng bàn giao</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} /> Thời gian & Vị trí
                  </div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Nhận xe:</span><span className="cm2-meta-val">{fmtDt(booking?.start_datetime || booking?.startDatetime)}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Trả xe:</span><span className="cm2-meta-val">{fmtDt(booking?.end_datetime || booking?.endDatetime)}</span></div>
                  <div className="cm2-meta-item"><span className="cm2-meta-lbl">Vị trí giao xe:</span><span className="cm2-meta-val">{booking?.deliveryAddress || 'Nhận tại bãi xe Bên A'}</span></div>
                </div>
              </div>
            </div>

            {/* Section 3: 3-Phase Payment Schedule */}
            <div className="cm2-section">
              <h3 className="cm2-sec-title">Lịch trình thanh toán & Ký gửi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Phase 1 */}
                <div className="cm2-phase-card">
                  <div className="cm2-phase-header">
                    <span className="cm2-phase-title">Giai đoạn 1: Đặt cọc giữ xe (Phí giữ chỗ)</span>
                    <span className={`cm2-phase-status ${contract.reservationPaidAt ? 'status-paid' : 'status-unpaid'}`}>
                      {contract.reservationPaidAt ? '✓ ĐÃ THANH TOÁN' : '⚠ CHƯA THANH TOÁN'}
                    </span>
                  </div>
                  <div className="cm2-phase-body">
                    <div className="cm2-phase-row">Số tiền yêu cầu: <strong>{fmt(contract.reservationFee || 500000)}</strong></div>
                    <div className="cm2-phase-row">Thời điểm nộp: <strong>{contract.reservationPaidAt ? fmtDt(contract.reservationPaidAt) : 'Ngay sau khi gửi đơn đặt xe'}</strong></div>
                    <div className="cm2-phase-row">Hình thức: <strong>Ví ViVuCar / Cổng thanh toán (VietQR/VNPAY)</strong></div>
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="cm2-phase-card">
                  <div className="cm2-phase-header">
                    <span className="cm2-phase-title">Giai đoạn 2: Trả trước khi nhận xe</span>
                    <span className={`cm2-phase-status ${contract.prepaymentPaidAt ? 'status-paid' : 'status-unpaid'}`}>
                      {contract.prepaymentPaidAt ? `✓ ĐÃ THANH TOÁN (${contract.prepaymentMethod || 'Ví'})` : '⚠ TRẢ KHI NHẬN XE'}
                    </span>
                  </div>
                  <div className="cm2-phase-body">
                    <div className="cm2-phase-row">Số tiền yêu cầu: <strong>{fmt(contract.prepaymentAmount || (Number(booking?.rental_price || 0) + 5000000 - 500000))}</strong></div>
                    <div className="cm2-phase-row">Hạn thanh toán: <strong>Hạn chót vào lúc giao nhận xe {fmtD(booking?.start_datetime || booking?.startDatetime)}</strong></div>
                    <div className="cm2-phase-row">Chi tiết tiền trả trước: <strong>Tổng tiền thuê xe + Tiền cọc tài sản (5tr) - 500k cọc giữ xe đã nộp</strong></div>
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="cm2-phase-card">
                  <div className="cm2-phase-header">
                    <span className="cm2-phase-title">Giai đoạn 3: Hoàn trả tiền cọc bảo đảm</span>
                    <span className={`cm2-phase-status ${contract.depositRefundAt ? 'status-paid' : 'status-pending'}`}>
                      {contract.depositRefundAt ? '✓ ĐÃ HOÀN TRẢ' : '🔒 ĐANG GIỮ CỌC BẢO ĐẢM'}
                    </span>
                  </div>
                  <div className="cm2-phase-body">
                    <div className="cm2-phase-row">Số tiền ký cọc bảo đảm: <strong>{fmt(contract.depositAmount || 5000000)}</strong></div>
                    <div className="cm2-phase-row">Điều kiện hoàn trả: <strong>Trong vòng 3 ngày làm việc sau khi Bên B trả xe nguyên vẹn, không phát sinh sự cố, muộn xe, hư hỏng hoặc phạt nguội.</strong></div>
                    {contract.surchargeAmount > 0 && (
                      <div className="cm2-phase-row" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        Phát sinh khấu trừ: <strong>- {fmt(contract.surchargeAmount)} ({contract.surchargeReason})</strong>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Section 4: Terms and Conditions Toggle */}
            <div className="cm2-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="cm2-sec-title">Điều khoản hợp đồng</h3>
                <button 
                  onClick={() => setShowTerms(!showTerms)} 
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showTerms ? 'Thu gọn' : 'Xem chi tiết'} {showTerms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {showTerms && (
                <div className="cm2-terms-wrap">
                  <div className="cm2-term-item">
                    <strong>Điều 1: Trách nhiệm bàn giao phương tiện</strong>
                    <span>Bên A cam kết giao xe đúng chủng loại, chất lượng kỹ thuật an toàn, biển kiểm soát và sạch sẽ. Bên B chịu trách nhiệm kiểm tra kỹ xe tại thời điểm nhận xe (nhiên liệu, trầy xước) và ký biên bản handover.</span>
                  </div>
                  <div className="cm2-term-item">
                    <strong>Điều 2: Quy định hủy chuyến</strong>
                    <span>{terms.cancellationPolicy}</span>
                  </div>
                  <div className="cm2-term-item">
                    <strong>Điều 3: Xử lý thiệt hại vật chất & hư hỏng</strong>
                    <span>{terms.damagePolicy}</span>
                  </div>
                  <div className="cm2-term-item">
                    <strong>Điều 4: Phụ phí trả xe muộn hạn</strong>
                    <span>{terms.lateReturnPolicy}</span>
                  </div>
                  <div className="cm2-term-item">
                    <strong>Điều 5: Phạt nguội vi phạm giao thông</strong>
                    <span>{terms.trafficViolationPolicy}</span>
                  </div>
                  <div className="cm2-term-item">
                    <strong>Điều 6: Hoàn trả tiền cọc bảo đảm</strong>
                    <span>{terms.refundPolicy}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: Signature CTA area */}
            {isRenter && !isRenterSigned && contract.status !== 'Cancelled' && (
              <div className="cm2-sign-wrap">
                <h4 className="cm2-sign-title">
                  <Pen size={14} /> Ký hợp đồng điện tử pháp lý
                </h4>
                <label className="cm2-sign-check">
                  <input 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)} 
                  />
                  <span>Tôi đã đọc kỹ, hiểu rõ và cam kết tuân thủ đầy đủ tất cả các điều khoản, chính sách thanh toán, bồi hoàn thiệt hại và phụ phí nêu trong hợp đồng thuê xe điện tử này.</span>
                </label>
                <button 
                  className="cm2-sign-btn" 
                  disabled={!agreed || signing} 
                  onClick={handleSign}
                >
                  {signing ? 'Đang thực hiện ký kết...' : '✍ Xác nhận ký hợp đồng điện tử'}
                </button>
              </div>
            )}

            {isRenter && isRenterSigned && (
              <div className="cm2-signed-ok">
                <CheckCircle2 size={18} />
                <span>Bạn đã thực hiện ký kết hợp đồng điện tử này thành công.</span>
              </div>
            )}

            {/* Section 6: Double Seals Stamp visual */}
            <div className="cm2-seal-area">
              
              {/* Renter Seal */}
              <div className="cm2-seal-party">
                <div className="cm2-seal-label">BÊN B (Người thuê xe)</div>
                <div className={`cm2-seal-circle ${isRenterSigned ? 'seal-signed' : 'seal-unsigned'}`}>
                  {isRenterSigned ? (
                    <>
                      <span>ĐÃ KÝ</span>
                      <span style={{ fontSize: '7px', marginTop: '2px', opacity: 0.8 }}>E-SIGN SECURED</span>
                    </>
                  ) : (
                    <span>CHƯA KÝ</span>
                  )}
                </div>
                <div className="cm2-seal-name">{renter?.name || '—'}</div>
                {isRenterSigned && (
                  <div className="cm2-seal-date">
                    Ký lúc: {fmtDt(contract.renterSignedAt)}
                    <br />IP: {contract.renterIp}
                  </div>
                )}
              </div>

              {/* Owner Seal */}
              <div className="cm2-seal-party">
                <div className="cm2-seal-label">BÊN A (Chủ xe)</div>
                <div className={`cm2-seal-circle ${isOwnerSigned ? 'seal-signed' : 'seal-unsigned'}`}>
                  {isOwnerSigned ? (
                    <>
                      <span>ĐÃ KÝ</span>
                      <span style={{ fontSize: '7px', marginTop: '2px', opacity: 0.8 }}>E-SIGN SECURED</span>
                    </>
                  ) : (
                    <span>CHƯA KÝ</span>
                  )}
                </div>
                <div className="cm2-seal-name">{owner?.name || 'Hệ thống ViVuCar'}</div>
                {isOwnerSigned && (
                  <div className="cm2-seal-date">
                    Ký lúc: {fmtDt(contract.ownerSignedAt)}
                    <br />IP: {contract.ownerIp}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Document Footer */}
          <div className="cm2-footer">
            <span>Hợp đồng điện tử ký kết tự động dựa trên giao dịch được bảo chứng bởi ViVuCar E-Sign Service.</span>
            <span>Mã bản quyền: VIVUCAR-ESC-2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};