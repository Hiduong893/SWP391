import React from 'react';
import { CreditCard } from 'lucide-react';

export const CashFlowTab = ({
  filteredBookings = [],
  formatCurrency,
  handleRefundDeposit,
  actionLoading
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      <div className="data-table-panel glassmorphism">
        <div className="panel-header">
          <h4 className="panel-title">Giao dịch cọc thuê xe &amp; Duyệt trả cọc cho người dùng</h4>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-panel">
            <CreditCard size={36} className="text-muted" />
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
                  <th>Tổng giá thuê</th>
                  <th>Cọc giữ chỗ</th>
                  <th>Trạng thái cọc</th>
                  <th style={{ textAlign: 'center' }}>Hành động khóa/hoàn cọc</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>
                      <strong>{b.userName}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'block' }}>{b.userEmail}</span>
                    </td>
                    <td className="text-bold-cell">{b.carName}</td>
                    <td className="text-purple-cell">{formatCurrency(b.totalPrice)}</td>
                    <td className="text-orange-cell font-bold">5.000.000đ</td>
                    <td>
                      <span className={`kyc-status-label ${b.depositStatus === 'refunded' ? 'verified' : b.depositStatus === 'withheld' ? 'rejected' : 'pending'}`}>
                        {b.depositStatus === 'paid' ? 'Đang giữ cọc' : b.depositStatus === 'refunded' ? 'Đã hoàn cọc 100%' : b.depositStatus === 'withheld' ? 'Đã thu cọc' : 'Chưa cọc'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                        {b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled') ? (
                          <>
                            <button className="btn-approve btn-success" onClick={() => handleRefundDeposit(b.id, true)} disabled={actionLoading}>✓ Hoàn cọc</button>
                            <button className="btn-approve btn-danger" onClick={() => handleRefundDeposit(b.id, false)} disabled={actionLoading}>✕ Giữ cọc</button>
                          </>
                        ) : b.depositStatus === 'refunded' ? (
                          <span className="text-green font-bold small">Đã hoàn cọc ✓</span>
                        ) : b.depositStatus === 'withheld' ? (
                          <span className="text-red font-bold small">Đã giữ cọc ✕</span>
                        ) : (
                          <span className="text-muted small">Chưa hoàn cọc (Chuyến đi chưa xong)</span>
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
