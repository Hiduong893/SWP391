import React from 'react';
import { DollarSign, Car, Users, CreditCard } from 'lucide-react';

export const OverviewTab = ({
  stats = { totalUsers: 0, totalCars: 0, totalBookings: 0, totalRevenue: 0 },
  usersList = [],
  handleUpdateUserRole,
  handleApproveKyc,
  actionLoading,
  showToast,
  setActiveTab,
  setActiveSubTab,
  formatCurrency
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      <div className="datepicker-left-wrapper mb-6" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <input
          type="date"
          className="dashboard-datepicker-pill"
          defaultValue="2026-06-09"
          onChange={(e) => showToast(`Đã lọc báo cáo theo ngày: ${e.target.value}`, 'success')}
        />
      </div>

      {/* KPI STATS GRID */}
      <div className="kpi-grid">

        {/* CARD 1: REVENUE */}
        <div className="kpi-card glassmorphism" onClick={() => setActiveTab('cashflow')} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label">TỔNG DOANH THU</span>
              <h3 className="kpi-value">{formatCurrency(stats.totalRevenue || 0)}</h3>
            </div>
            <div className="kpi-icon-box bg-green-tint">
              <DollarSign size={20} className="text-green" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-green">↑ 12.5%</span>
            <span className="trend-label">so với tháng trước</span>
          </div>
        </div>

        {/* CARD 2: ACTIVE CARS */}
        <div className="kpi-card glassmorphism" onClick={() => { setActiveTab('fleet'); setActiveSubTab('all_cars'); }} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label">XE ĐANG HOẠT ĐỘNG</span>
              <h3 className="kpi-value">{(stats.totalCars || 0)} xe</h3>
            </div>
            <div className="kpi-icon-box bg-teal-tint">
              <Car size={20} className="text-teal" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-green">↑ 5%</span>
            <span className="trend-label">so với tuần trước</span>
          </div>
        </div>

        {/* CARD 3: USERS */}
        <div className="kpi-card glassmorphism" onClick={() => { setActiveTab('accounts'); setActiveSubTab('roles'); }} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label">TỔNG NGƯỜI DÙNG</span>
              <h3 className="kpi-value">{(stats.totalUsers || 0)} hội viên</h3>
            </div>
            <div className="kpi-icon-box bg-blue-tint">
              <Users size={20} className="text-blue" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-green">↑ 18%</span>
            <span className="trend-label">trong 30 ngày qua</span>
          </div>
        </div>

        {/* CARD 4: PENDING BOOKINGS */}
        <div className="kpi-card glassmorphism" onClick={() => { setActiveTab('cashflow'); }} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label">ĐẶT XE CHỜ DUYỆT</span>
              <h3 className="kpi-value">{(stats.totalBookings || 0)} đơn</h3>
            </div>
            <div className="kpi-icon-box bg-orange-tint">
              <CreditCard size={20} className="text-orange" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="kpi-badge badge-warning-solid">Cần xử lý hôm nay</span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="charts-grid mt-6">

        {/* COLUMN 1: REVENUE TREND (SVG LINE CHART) */}
        <div className="chart-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Xu hướng doanh thu</h4>
            <div className="chart-legends">
              <span className="legend-item"><span className="legend-dot bg-green"></span>Tháng này</span>
              <span className="legend-item"><span className="legend-dot bg-grey dashed"></span>Tháng trước</span>
            </div>
          </div>

          <div className="svg-chart-container">
            <svg viewBox="0 0 500 240" className="svg-chart">
              {/* Grid Lines */}
              <line x1="40" y1="40" x2="480" y2="40" stroke="var(--admin-border-color)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="var(--admin-border-color)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="var(--admin-border-color)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="190" x2="480" y2="190" stroke="var(--admin-border-color)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="210" x2="480" y2="210" stroke="var(--admin-border-color)" strokeWidth="1" />

              {/* Y-Axis Labels */}
              <text x="30" y="44" className="chart-axis-text" textAnchor="end">$40k</text>
              <text x="30" y="94" className="chart-axis-text" textAnchor="end">$30k</text>
              <text x="30" y="144" className="chart-axis-text" textAnchor="end">$20k</text>
              <text x="30" y="194" className="chart-axis-text" textAnchor="end">$10k</text>
              <text x="30" y="214" className="chart-axis-text" textAnchor="end">$0</text>

              {/* X-Axis Labels */}
              <text x="50" y="230" className="chart-axis-text" textAnchor="middle">T1</text>
              <text x="120" y="230" className="chart-axis-text" textAnchor="middle">T2</text>
              <text x="190" y="230" className="chart-axis-text" textAnchor="middle">T3</text>
              <text x="260" y="230" className="chart-axis-text" textAnchor="middle">T4</text>
              <text x="330" y="230" className="chart-axis-text" textAnchor="middle">T5</text>
              <text x="400" y="230" className="chart-axis-text" textAnchor="middle">T6</text>
              <text x="470" y="230" className="chart-axis-text" textAnchor="middle">T7</text>

              {/* Wave Line - Last Month (Dashed grey) */}
              <path
                d="M 50 190 Q 120 160 190 170 T 330 150 T 470 120"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.6"
              />

              {/* Wave Line - This Month (Gradient Green) */}
              <path
                d="M 50 180 Q 120 130 190 150 T 330 120 T 470 70"
                fill="none"
                stroke="#00bfa5"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Coordinates markers */}
              <circle cx="190" cy="150" r="4" fill="#ffffff" stroke="#009698" strokeWidth="2" />
              <circle cx="330" cy="120" r="4" fill="#ffffff" stroke="#009698" strokeWidth="2" />
              <circle cx="400" cy="85" r="4" fill="#ffffff" stroke="#009698" strokeWidth="2" />

              {/* Area Under Curve Fill */}
              <path
                d="M 50 180 Q 120 130 190 150 T 330 120 T 470 70 L 470 210 L 50 210 Z"
                fill="url(#gradient-chart-fill)"
                opacity="0.1"
              />

              {/* SVG Definitions */}
              <defs>
                <linearGradient id="gradient-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00bfa5" />
                  <stop offset="100%" stopColor="#009698" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* COLUMN 2: VEHICLE ALLOCATION (SVG DONUT CHART) */}
        <div className="chart-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Cơ cấu xe trên hệ thống</h4>
          </div>

          <div className="donut-chart-flex">
            <div className="donut-svg-wrapper">
              <svg viewBox="0 0 160 160" width="100%" height="100%">
                {/* Circle Segments */}
                {/* Total Circumference = 2 * pi * r = 2 * 3.14159 * 50 = 314.15 */}

                {/* Segment 1: Rented (Blue) - 60% = dasharray="188.5 125.6" offset="0" */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#1e3a8a"
                  strokeWidth="14"
                  strokeDasharray="188.5 125.6"
                  strokeDashoffset="0"
                  transform="rotate(-90 80 80)"
                />

                {/* Segment 2: Ready (Green) - 30% = dasharray="94.2 219.9" offset="-188.5" */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="14"
                  strokeDasharray="94.2 219.9"
                  strokeDashoffset="-188.5"
                  transform="rotate(-90 80 80)"
                />

                {/* Segment 3: Maintenance (Grey) - 10% = dasharray="31.4 282.7" offset="-282.7" */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="14"
                  strokeDasharray="31.4 282.7"
                  strokeDashoffset="-282.7"
                  transform="rotate(-90 80 80)"
                />

                {/* Center label */}
                <text x="80" y="75" className="donut-center-num" textAnchor="middle">{stats.totalCars || 57}</text>
                <text x="80" y="93" className="donut-center-lbl" textAnchor="middle">Tổng xe</text>
              </svg>
            </div>

            <div className="donut-legends">
              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-blue-dark"></span>
                  <span className="legend-name">Đang thuê</span>
                </div>
                <span className="legend-value-bold">60%</span>
              </div>

              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-green-emerald"></span>
                  <span className="legend-name">Sẵn sàng</span>
                </div>
                <span className="legend-value-bold">30%</span>
              </div>

              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-slate-grey"></span>
                  <span className="legend-name">Bảo dưỡng</span>
                </div>
                <span className="legend-value-bold">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTION TABLE: USERS PENDING VALIDATION */}
      <div className="data-table-panel glassmorphism mt-6">
        <div className="panel-header">
          <h4 className="panel-title">Tài khoản mới cần cấp quyền</h4>
          <button className="text-link" onClick={() => { setActiveTab('accounts'); setActiveSubTab('kyc'); }}>Xem tất cả</button>
        </div>

        <div className="table-responsive">
          <table className="custom-dashboard-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {usersList.slice(0, 3).map((u, idx) => (
                <tr key={u.id || idx}>
                  <td>
                    <div className="table-user-cell">
                      <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"} alt={u.name} className="table-avatar" />
                      <span className="table-username">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-secondary-cell">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                      className={`role-select-badge select-${u.role}`}
                      disabled={actionLoading || u.id === 'user-admin-1'}
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Chủ xe</option>
                      <option value="cskh">CSKH</option>
                      <option value="renter">Khách</option>
                    </select>
                  </td>
                  <td>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        defaultChecked={u.licenseStatus === 'verified'}
                        onChange={() => showToast(`Đã thay đổi trạng thái tài khoản ${u.name}!`, 'success')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>
                  <td>
                    {u.licenseStatus === 'pending' ? (
                      <div className="table-quick-actions">
                        <button className="icon-btn-action text-green" onClick={() => handleApproveKyc(u.id, true)} title="Duyệt KYC">✓</button>
                        <button className="icon-btn-action text-red" onClick={() => handleApproveKyc(u.id, false)} title="Từ chối">✕</button>
                      </div>
                    ) : (
                      <span className="kyc-status-label verified">Đã KYC</span>
                    )}
                  </td>
                </tr>
              ))}
              {usersList.slice(0, 3).length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center-placeholder">Không tìm thấy tài khoản mới nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
