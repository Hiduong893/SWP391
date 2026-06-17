import React from 'react';
import { Settings } from 'lucide-react';

export const ConfigTab = ({
  serviceFee,
  setServiceFee,
  insuranceMul,
  setInsuranceMul,
  sysNotice,
  setSysNotice,
  bankId,
  setBankId,
  bankName,
  setBankName,
  bankAccountNumber,
  setBankAccountNumber,
  bankAccountHolder,
  setBankAccountHolder,
  handleUpdateConfig,
  actionLoading
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      <div className="config-form-card glassmorphism">
        <div className="config-card-header">
          <Settings size={18} className="text-yellow" />
          <span>Cấu hình thông số tài chính hệ thống (UC29)</span>
        </div>

        <form onSubmit={handleUpdateConfig} className="config-inputs-form">
          <div className="config-form-row">
            <div className="config-input-group">
              <label className="config-input-label">Phí dịch vụ hệ thống (%) *</label>
              <input
                type="number"
                className="config-text-input"
                min="1"
                max="20"
                value={serviceFee}
                onChange={(e) => setServiceFee(e.target.value)}
                required
              />
              <span className="input-helper-text">Hoa hồng tự động thu trên mỗi giao dịch thuê xe thành công.</span>
            </div>

            <div className="config-input-group">
              <label className="config-input-label">Hệ số nhân bảo hiểm chuyến đi *</label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="1.5"
                className="config-text-input"
                value={insuranceMul}
                onChange={(e) => setInsuranceMul(e.target.value)}
                required
              />
              <span className="input-helper-text">Hệ số bảo hiểm chuyến đi áp dụng khi tính tổng tiền thuê.</span>
            </div>
          </div>

          <div className="config-form-row">
            <div className="config-input-group" style={{ gridColumn: 'span 2' }}>
              <label className="config-input-label">Thông báo toàn hệ thống</label>
              <textarea
                className="config-textarea-input"
                rows="3"
                value={sysNotice}
                onChange={(e) => setSysNotice(e.target.value)}
                placeholder="Nhập thông báo chung hiển thị cho người dùng toàn hệ thống..."
              />
              <span className="input-helper-text">Thông báo hiển thị dạng banner cho người dùng.</span>
            </div>
          </div>

          <div className="config-card-header mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Settings size={18} className="text-yellow" />
            <span>Cấu hình tài khoản nhận thanh toán (VietQR)</span>
          </div>

          <div className="config-form-row">
            <div className="config-input-group">
              <label className="config-input-label">Mã ngân hàng (VietQR Bank ID) *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                placeholder="Ví dụ: mbbank, vietcombank, techcombank..."
                required
              />
              <span className="input-helper-text">Mã định danh viết thường của ngân hàng hỗ trợ bởi VietQR.</span>
            </div>

            <div className="config-input-group">
              <label className="config-input-label">Tên ngân hàng *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: Ngân hàng Quân Đội (MBBank)"
                required
              />
              <span className="input-helper-text">Tên hiển thị đầy đủ của ngân hàng nhận tiền.</span>
            </div>
          </div>

          <div className="config-form-row">
            <div className="config-input-group">
              <label className="config-input-label">Số tài khoản nhận *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Nhập số tài khoản nhận tiền..."
                required
              />
              <span className="input-helper-text">Số tài khoản ngân hàng để tạo mã QR và nhận chuyển khoản.</span>
            </div>

            <div className="config-input-group">
              <label className="config-input-label">Tên chủ tài khoản *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Nhập tên chủ tài khoản viết hoa..."
                required
              />
              <span className="input-helper-text">Tên chủ tài khoản viết hoa không dấu (ví dụ: NGUYEN VAN A).</span>
            </div>
          </div>

          <button type="submit" className="config-submit-btn" disabled={actionLoading}>
            Lưu cấu hình hệ thống
          </button>
        </form>
      </div>

    </div>
  );
};
