import React from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export const CashFlowTab = ({
  filteredBookings = [],
  formatCurrency,
  handleRefundDeposit,
  actionLoading
}) => {

  const getDepositStatusBadge = (depositStatus) => {
    switch (depositStatus) {
      case 'paid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#d97706', fontSize: '11.5px', fontWeight: 700 }}>
            <Clock size={11} /> Đang giữ cọc
          </span>
        );
      case 'refunded':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>
            <CheckCircle size={11} /> Đã hoàn cọc
          </span>
        );
      case 'withheld':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: '11.5px', fontWeight: 700 }}>
            <XCircle size={11} /> Đã thu cọc
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#64748b', fontSize: '11.5px', fontWeight: 700 }}>
            <AlertCircle size={11} /> Chưa cọc
          </span>
        );
    }
  };

  return (
    <div className="tab-pane-content fade-in-animation">

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--admin-glass-bg)', border: '1px solid var(--admin-glass-border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Tổng đơn cọc</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>{filteredBookings.length}</p>
        </div>
        <div style={{ background: 'var(--admin-glass-bg)', border: '1px solid var(--admin-glass-border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Đang giữ cọc</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', margin: 0 }}>{formatCurrency(filteredBookings.filter(b => b.depositStatus === 'paid').length * 5000000)}</p>
        </div>
        <div style={{ background: 'var(--admin-glass-bg)', border: '1px solid var(--admin-glass-border)', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Chờ duyệt hoàn cọc</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', margin: 0 }}>
            {filteredBookings.filter(b => b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled')).length} đơn
          </p>
        </div>
      </div>

      <div className="data-table-panel glassmorphism">
        <div className="panel-header">
          <h4 className="panel-title">
            <CreditCard size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#009698' }} />
            Giao dịch cọc & Duyệt hoàn trả cọc cho khách
          </h4>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-panel">
            <CreditCard size={40} className="text-muted" />
            <h5>Không có giao dịch nào!</h5>
            <p>Hệ thống chưa phát sinh giao dịch đặt cọc nào.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-dashboard-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Phương tiện</th>
                  <th>Phí thuê xe</th>
                  <th>Tiền cọc</th>
                  <th>Trạng thái cọc</th>
                  <th style={{ textAlign: 'center' }}>Thao tác duyệt</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>
                      <strong style={{ display: 'block', fontSize: '13.5px' }}>{b.userName}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{b.userEmail}</span>
                    </td>
                    <td>
                      <strong>{b.carName}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                        {b.status === 'completed' ? '✅ Hoàn thành' : b.status === 'cancelled' ? '❌ Đã hủy' : b.status === 'active' ? '🚗 Đang thuê' : '⏳ Chờ duyệt'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#009698' }}>{formatCurrency(b.totalPrice)}</td>
                    <td style={{ fontWeight: 800, color: '#d97706', fontSize: '13.5px' }}>5.000.000đ</td>
                    <td>
                      {getDepositStatusBadge(b.depositStatus)}
                    </td>
                    <td>
                      <div className="table-actions-cell" style={{ justifyContent: 'center', gap: 8 }}>
                        {b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled') ? (
                          <>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              onClick={() => handleRefundDeposit(b.id, true)}
                              disabled={actionLoading}
                              onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.color = '#059669'; }}
                            >
                              <CheckCircle size={13} /> Hoàn cọc
                            </button>
                            <button
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                              onClick={() => handleRefundDeposit(b.id, false)}
                              disabled={actionLoading}
                              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                            >
                              <XCircle size={13} /> Giữ cọc
                            </button>
                          </>
                        ) : b.depositStatus === 'refunded' ? (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={13} /> Đã hoàn trả ✓
                          </span>
                        ) : b.depositStatus === 'withheld' ? (
                          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={13} /> Đã thu giữ cọc
                          </span>
                        ) : (
                          <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>
                            Chuyến đi chưa kết thúc
                          </span>
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
