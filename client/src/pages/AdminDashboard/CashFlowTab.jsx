import React, { useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock, Filter, DollarSign, AlertTriangle } from 'lucide-react';

export const CashFlowTab = ({
  filteredBookings = [],
  formatCurrency,
  handleRefundDeposit,
  actionLoading
}) => {
  const [depositFilter, setDepositFilter] = useState('all'); // all | paid | refunded | withheld | pending

  // Stats tong quat
  const totalDeposit = filteredBookings.filter(b => b.depositStatus === 'paid').length;
  const totalRefunded = filteredBookings.filter(b => b.depositStatus === 'refunded').length;
  const totalWithheld = filteredBookings.filter(b => b.depositStatus === 'withheld').length;
  const pendingAction = filteredBookings.filter(b =>
    b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled')
  ).length;

  // Filter bookings theo depositFilter
  const displayedBookings = filteredBookings.filter(b => {
    if (depositFilter === 'all') return true;
    if (depositFilter === 'pending') return b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled');
    return b.depositStatus === depositFilter;
  });

  const getDepositStatusLabel = (b) => {
    if (b.depositStatus === 'paid') return 'Đang giữ cọc';
    if (b.depositStatus === 'refunded') return 'Đã hoàn cọc 100%';
    if (b.depositStatus === 'withheld') return 'Đã thu cọc';
    return 'Chưa cọc';
  };

  const getDepositStatusClass = (b) => {
    if (b.depositStatus === 'refunded') return 'verified';
    if (b.depositStatus === 'withheld') return 'rejected';
    if (b.depositStatus === 'paid') return 'pending';
    return '';
  };

  return (
    <div className="tab-pane-content fade-in-animation">

      {/* KPI SUMMARY ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={22} style={{ color: '#fb923c', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Đang Giữ Cọc</span>
            <strong style={{ fontSize: '20px', color: '#fb923c' }}>{totalDeposit}</strong>
          </div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={22} style={{ color: '#f87171', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Chờ Xử Lý Cọc</span>
            <strong style={{ fontSize: '20px', color: '#f87171' }}>{pendingAction}</strong>
          </div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle2 size={22} style={{ color: '#34d399', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Đã Hoàn Cọc</span>
            <strong style={{ fontSize: '20px', color: '#34d399' }}>{totalRefunded}</strong>
          </div>
        </div>
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <XCircle size={22} style={{ color: '#fb7185', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Đã Thu Cọc</span>
            <strong style={{ fontSize: '20px', color: '#fb7185' }}>{totalWithheld}</strong>
          </div>
        </div>
      </div>

      {/* TONG TIEN DANG GIAM SAT */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#94a3b8' }}>
        <DollarSign size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
        <span>Tổng cọc đang kiểm soát: <strong style={{ color: '#818cf8' }}>{formatCurrency(totalDeposit * 5000000)}</strong> từ {totalDeposit} giao dịch đang giữ cọc (mỗi cọc 5.000.000đ)</span>
      </div>

      <div className="data-table-panel glassmorphism">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="panel-title">Duyệt Hoàn Trả / Giữ Cọc Đặt Xe (UC38)</h4>
          {/* FILTER TABS */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: `⚠ Chờ xử lý (${pendingAction})` },
              { key: 'paid', label: 'Đang giữ cọc' },
              { key: 'refunded', label: 'Đã hoàn' },
              { key: 'withheld', label: 'Đã thu' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setDepositFilter(f.key)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: depositFilter === f.key ? 700 : 500,
                  borderRadius: 6,
                  border: '1px solid',
                  cursor: 'pointer',
                  background: depositFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                  borderColor: depositFilter === f.key ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                  color: depositFilter === f.key ? '#818cf8' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {displayedBookings.length === 0 ? (
          <div className="empty-state-panel">
            <CreditCard size={36} className="text-muted" />
            <h5>Không có giao dịch nào!</h5>
            <p>{depositFilter === 'pending' ? 'Không có cọc nào đang chờ xử lý.' : 'Hệ thống chưa phát sinh giao dịch đặt cọc nào.'}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-dashboard-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Phương tiện</th>
                  <th>Tổng giá thuê</th>
                  <th>Cọc giữ chỗ</th>
                  <th>Trạng thái cọc</th>
                  <th style={{ textAlign: 'center' }}>Hành động khóa/hoàn cọc</th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((b) => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>
                      <strong>{b.userName}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'block' }}>{b.userEmail}</span>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: 2 }}>
                        Đơn: <em style={{ color: '#475569' }}>{b.status === 'completed' ? '✅ Hoàn thành' : b.status === 'cancelled' ? '❌ Đã hủy' : b.status === 'active' ? '🚗 Đang thuê' : b.status === 'confirmed' ? '✓ Đã duyệt' : b.status}</em>
                      </span>
                    </td>
                    <td className="text-bold-cell">{b.carName}</td>
                    <td className="text-purple-cell">{formatCurrency(b.totalPrice)}</td>
                    <td>
                      <strong style={{ color: '#fb923c', fontSize: '13px', display: 'block' }}>5.000.000đ</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>tiền cọc cố định</span>
                    </td>
                    <td>
                      <span className={`kyc-status-label ${getDepositStatusClass(b)}`}>
                        {getDepositStatusLabel(b)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                        {b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled') ? (
                          <>
                            <button
                              className="btn-approve btn-success"
                              onClick={() => handleRefundDeposit(b.id, true)}
                              disabled={actionLoading}
                              title="Hoàn trả toàn bộ 5.000.000đ vào ví người dùng"
                            >
                              <CheckCircle2 size={13} style={{ marginRight: 4 }} />
                              Hoàn cọc
                            </button>
                            <button
                              className="btn-approve btn-danger"
                              onClick={() => handleRefundDeposit(b.id, false)}
                              disabled={actionLoading}
                              title="Giữ lại cọc do phát sinh thiệt hại"
                            >
                              <XCircle size={13} style={{ marginRight: 4 }} />
                              Giữ cọc
                            </button>
                          </>
                        ) : b.depositStatus === 'refunded' ? (
                          <span style={{ color: '#34d399', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> Đã hoàn trả khách ✓
                          </span>
                        ) : b.depositStatus === 'withheld' ? (
                          <span style={{ color: '#fb7185', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={13} /> Tịch thu sung công ✕
                          </span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '11px' }}>Chờ chuyến kết thúc</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
