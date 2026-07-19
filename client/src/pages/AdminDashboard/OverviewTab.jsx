import React from 'react';
import { DollarSign, Car, Users, CreditCard } from 'lucide-react';

export const OverviewTab = ({
  stats = { totalUsers: 0, totalCars: 0, totalBookings: 0, totalRevenue: 0 },
  usersList = [],
  monthlyStats = [],
  handleUpdateUserRole,
  handleApproveKyc,
  actionLoading,
  showToast,
  setActiveTab,
  setActiveSubTab,
  formatCurrency
}) => {
  // Build dynamic SVG chart from monthlyStats
  // Chart area: x from 50 to 480, y from 40 to 210 (170px height)
  const chartMonths = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const revenues = monthlyStats.length > 0
    ? monthlyStats.map(m => m.revenue)
    : Array(12).fill(0);
  const maxRev = Math.max(...revenues, 1);

  // Map month index to x coordinate (0..11 → 50..480)
  const toX = (i) => 50 + (i / 11) * 430;
  // Map revenue to y coordinate (high revenue = low y)
  const toY = (rev) => 210 - Math.round((rev / maxRev) * 170);

  const points = revenues.map((rev, i) => ({ x: toX(i), y: toY(rev) }));

  // Build SVG polyline path
  const polyPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = polyPath + ` L ${points[points.length - 1].x} 210 L 50 210 Z`;

  // Y-axis labels
  const yLabels = [
    { y: 40, val: maxRev },
    { y: 90, val: maxRev * 0.75 },
    { y: 140, val: maxRev * 0.50 },
    { y: 190, val: maxRev * 0.25 },
  ];

  const formatM = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(Math.round(v));
  };

  // Donut chart calculations
  const totalCars = stats.totalCars || 0;
  const denom = totalCars || 1;
  const rentedVal = stats.rentedCars || 0;
  const availableVal = stats.availableCars || 0;
  const maintenanceVal = (stats.maintenanceCars || 0) + (stats.pendingCars || 0) + (stats.rejectedCars || 0);

  const rentedPct = totalCars > 0 ? Math.round((rentedVal / denom) * 100) : 0;
  const availablePct = totalCars > 0 ? Math.round((availableVal / denom) * 100) : 0;
  const maintenancePct = totalCars > 0 ? Math.max(0, 100 - rentedPct - availablePct) : 0;

  const circ = 314.16;
  const strokeRented = (rentedPct / 100) * circ;
  const strokeAvailable = (availablePct / 100) * circ;
  const strokeMaintenance = (maintenancePct / 100) * circ;

  const offsetRented = 0;
  const offsetAvailable = -strokeRented;
  const offsetMaintenance = -(strokeRented + strokeAvailable);


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

        {/* CARD 1: TOTAL CASH FLOW */}
        <div className="kpi-card glassmorphism" onClick={() => setActiveTab('cashflow')} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label" style={{ fontSize: '11px', fontWeight: '800' }}>TỔNG DÒNG TIỀN (100%)</span>
              <h3 className="kpi-value">{formatCurrency(stats.totalCashFlow || stats.totalRevenue || 0)}</h3>
            </div>
            <div className="kpi-icon-box bg-blue-tint">
              <DollarSign size={20} className="text-blue" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-blue">↑ 100%</span>
            <span className="trend-label">Tổng thu từ khách hàng</span>
          </div>
        </div>

        {/* CARD 2: OWNER PAYOUTS */}
        <div className="kpi-card glassmorphism" onClick={() => setActiveTab('cashflow')} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label" style={{ fontSize: '11px', fontWeight: '800' }}>ĐỐI SOÁT CHỦ XE</span>
              <h3 className="kpi-value">{formatCurrency(stats.ownerPayouts || 0)}</h3>
            </div>
            <div className="kpi-icon-box bg-orange-tint">
              <CreditCard size={20} className="text-orange" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-orange">Thanh toán</span>
            <span className="trend-label">Tiền cho thuê xe gộp</span>
          </div>
        </div>

        {/* CARD 3: PLATFORM PROFIT */}
        <div className="kpi-card glassmorphism" onClick={() => setActiveTab('cashflow')} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label" style={{ fontSize: '11px', fontWeight: '800' }}>LỢI NHUẬN SÀN</span>
              <h3 className="kpi-value" style={{ color: '#00bfa5' }}>{formatCurrency(stats.platformProfit || 0)}</h3>
            </div>
            <div className="kpi-icon-box bg-green-tint">
              <DollarSign size={20} className="text-green" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-green">Doanh thu ròng</span>
            <span className="trend-label">Phí dịch vụ + Hoa hồng</span>
          </div>
        </div>

        {/* CARD 4: ACTIVE CARS */}
        <div className="kpi-card glassmorphism" onClick={() => { setActiveTab('fleet'); setActiveSubTab('all_cars'); }} style={{ cursor: 'pointer' }}>
          <div className="kpi-body">
            <div>
              <span className="kpi-label" style={{ fontSize: '11px', fontWeight: '800' }}>TỔNG XE TRÊN SÀN</span>
              <h3 className="kpi-value">{(stats.totalCars || 0)} xe</h3>
            </div>
            <div className="kpi-icon-box bg-teal-tint">
              <Car size={20} className="text-teal" />
            </div>
          </div>
          <div className="kpi-footer">
            <span className="trend-percentage text-teal">↑ 5%</span>
            <span className="trend-label">so với tuần trước</span>
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

              {/* Y-Axis Labels (dynamic) */}
              {yLabels.map((yl, i) => (
                <text key={i} x="30" y={yl.y + 4} className="chart-axis-text" textAnchor="end">{formatM(yl.val)}</text>
              ))}

              {/* X-Axis Labels (months) */}
              {chartMonths.map((m, i) => (
                <text key={i} x={toX(i)} y="230" className="chart-axis-text" textAnchor="middle">{m}</text>
              ))}

              {/* Area Under Curve Fill (dynamic) */}
              <path d={areaPath} fill="url(#gradient-chart-fill)" opacity="0.15" />

              {/* Revenue Line (dynamic) */}
              <path
                d={polyPath}
                fill="none"
                stroke="#00bfa5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {points.map((p, i) => revenues[i] > 0 && (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#009698" strokeWidth="2" />
                  <title>{chartMonths[i]}: {formatM(revenues[i])}đ</title>
                </g>
              ))}

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

                {/* Segment 1: Rented */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#1e3a8a"
                  strokeWidth="14"
                  strokeDasharray={`${strokeRented} ${circ}`}
                  strokeDashoffset={offsetRented}
                  transform="rotate(-90 80 80)"
                />

                {/* Segment 2: Ready */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="14"
                  strokeDasharray={`${strokeAvailable} ${circ}`}
                  strokeDashoffset={offsetAvailable}
                  transform="rotate(-90 80 80)"
                />

                {/* Segment 3: Maintenance */}
                <circle
                  cx="80" cy="80" r="50"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="14"
                  strokeDasharray={`${strokeMaintenance} ${circ}`}
                  strokeDashoffset={offsetMaintenance}
                  transform="rotate(-90 80 80)"
                />

                {/* Center label */}
                <text x="80" y="75" className="donut-center-num" textAnchor="middle">{totalCars}</text>
                <text x="80" y="93" className="donut-center-lbl" textAnchor="middle">Tổng xe</text>
              </svg>
            </div>

            <div className="donut-legends">
              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-blue-dark"></span>
                  <span className="legend-name">Đang thuê ({rentedVal})</span>
                </div>
                <span className="legend-value-bold">{rentedPct}%</span>
              </div>

              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-green-emerald"></span>
                  <span className="legend-name">Sẵn sàng ({availableVal})</span>
                </div>
                <span className="legend-value-bold">{availablePct}%</span>
              </div>

              <div className="legend-row">
                <div className="legend-info">
                  <span className="legend-color-indicator bg-slate-grey"></span>
                  <span className="legend-name">Bảo dưỡng/Khác ({maintenanceVal})</span>
                </div>
                <span className="legend-value-bold">{maintenancePct}%</span>
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
