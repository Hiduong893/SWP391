import React, { useState } from 'react';
import { Settings } from 'lucide-react';

export const ConfigTab = ({
  maintenanceMode,
  setMaintenanceMode,
  platformName,
  setPlatformName,
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
  const [activeConfigTab, setActiveConfigTab] = useState('system');

  return (
    <div className="tab-pane-content fade-in-animation">
      {/* Local Tabs Navigation */}
      <div className="subtabs-bar mb-6">
        <button 
          className={`subtab-btn ${activeConfigTab === 'system' ? 'active' : ''}`} 
          onClick={() => setActiveConfigTab('system')}
          type="button"
        >
          Cài đặt hệ thống
        </button>
        <button 
          className={`subtab-btn ${activeConfigTab === 'finance' ? 'active' : ''}`} 
          onClick={() => setActiveConfigTab('finance')}
          type="button"
        >
          Cấu hình tài chính & VietQR
        </button>
      </div>

      {activeConfigTab === 'system' && (
      <div className="config-form-card glassmorphism mb-6">
        <div className="config-card-header">
          <Settings size={18} className="text-yellow" />
          <span>Trạng thái Vận hành</span>
        </div>

        <div className="config-inputs-form">
          <div className="config-form-row">
            <div className="config-input-group">
              <label className="config-input-label">Tên nền tảng</label>
              <input
                type="text"
                className="config-text-input"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>
          </div>

          <div className="config-form-row" style={{ marginTop: '16px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="config-input-label" style={{ margin: 0, fontSize: '15px' }}>Chế độ Bảo trì (Maintenance)</label>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <span className="input-helper-text" style={{ display: 'block', margin: 0 }}>Khi bật, toàn bộ hệ thống sẽ tạm ngừng hoạt động đối với người dùng để bảo trì kỹ thuật.</span>
            </div>
          </div>
          
          <button type="button" className="config-submit-btn" disabled={actionLoading} style={{ marginTop: '20px' }} onClick={handleUpdateConfig}>
            Lưu cài đặt hệ thống
          </button>
        </div>
      </div>
      )}

      {activeConfigTab === 'finance' && (
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
            <span>Cấu hình tài khoản nhận thanh toán tập trung (VietQR)</span>
          </div>

          <div className="config-form-row">
            <div className="config-input-group">
              <label className="config-input-label">Mã định danh ngân hàng (VietQR Bank ID) *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                placeholder="Ví dụ: mbbank, vietcombank, techcombank..."
                required
              />
              <span className="input-helper-text">Mã định danh của ngân hàng được hỗ trợ bởi VietQR để tạo mã QR.</span>
            </div>

            <div className="config-input-group">
              <label className="config-input-label">Tên hiển thị ngân hàng *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: ViVuCar Bank"
                required
              />
              <span className="input-helper-text">Tên ngân hàng ảo hoặc thật hiển thị cho người dùng (Ví dụ: ViVuCar Bank).</span>
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
                placeholder="Nhập số tài khoản nhận..."
                required
              />
              <span className="input-helper-text">Số tài khoản ngân hàng để nhận tiền chuyển khoản.</span>
            </div>

            <div className="config-input-group">
              <label className="config-input-label">Tên chủ tài khoản *</label>
              <input
                type="text"
                className="config-text-input"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Ví dụ: VIVUCAR SYSTEM"
                required
              />
              <span className="input-helper-text">Tên chủ tài khoản viết hoa không dấu đại diện cho hệ thống.</span>
            </div>
          </div>

          <button type="button" className="config-submit-btn" disabled={actionLoading} style={{ marginTop: '20px' }} onClick={handleUpdateConfig}>
            Lưu cấu hình tài chính
          </button>
        </form>
      </div>
      )}

    </div>
  );
};
