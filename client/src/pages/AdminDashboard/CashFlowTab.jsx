import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';

export const CashFlowTab = ({
  filteredBookings = [],
  formatCurrency,
  handleRefundDeposit,
  actionLoading
}) => {
  const [activeView, setActiveView] = useState('deposits');

  return (
    <div className="tab-pane-content fade-in-animation">
      
      {/* LOCAL TABS FOR CASHFLOW */}
      <div className="flex gap-4 mb-6" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveView('deposits')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeView === 'deposits' ? '#009698' : '#f1f5f9',
            color: activeView === 'deposits' ? '#fff' : '#475569',
            transition: 'all 0.2s'
          }}
        >
          Quản lý Cọc & Hoàn Cọc
        </button>
        <button 
          onClick={() => setActiveView('profits')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeView === 'profits' ? '#009698' : '#f1f5f9',
            color: activeView === 'profits' ? '#fff' : '#475569',
            transition: 'all 0.2s'
          }}
        >
          Bảng Đối Soát Doanh Thu
        </button>
      </div>

      {/* Table 1: Deposits */}
      {activeView === 'deposits' && (
      <div className="data-table-panel glassmorphism mb-6">
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
                    <td className="text-orange-cell font-bold">500.000đ</td>
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
      )}

      {/* Table 2: Revenue & Profit Reconciliation */}
      {activeView === 'profits' && (
      <div className="data-table-panel glassmorphism">
        <div className="panel-header">
          <h4 className="panel-title">Bảng đối soát doanh thu &amp; Phân bổ lợi nhuận sàn</h4>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-panel">
            <CreditCard size={36} className="text-muted" />
            <h5>Không có giao dịch nào!</h5>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-dashboard-table">
              <thead>
                <tr>
                  <th>Mã đơn & Khách</th>
                  <th>Phương tiện</th>
                  <th>Tổng dòng tiền (100%)</th>
                  <th style={{ color: '#d97706' }}>Đối soát Chủ xe (90%)</th>
                  <th style={{ color: '#10b981' }}>Lợi nhuận Sàn (10%)</th>
                  <th>Trạng thái thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={`profit-${b.id}`} className={b.status === 'cancelled' ? 'row-cancelled' : ''}>
                    <td>
                      <strong>#{b.id} - {b.userName}</strong>
                    </td>
                    <td className="text-bold-cell">{b.carName}</td>
                    <td className="text-purple-cell font-bold">{formatCurrency(b.totalPrice)}</td>
                    <td style={{ color: '#d97706', fontWeight: 'bold' }}>{formatCurrency(b.totalPrice * 0.9)}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(b.totalPrice * 0.1)}</td>
                    <td>
                      <span className={`kyc-status-label ${b.status === 'completed' ? 'verified' : b.status === 'cancelled' ? 'rejected' : 'pending'}`}>
                        {b.status === 'completed' ? 'Đã thanh toán (Hoàn thành)' : b.status === 'cancelled' ? 'Đã hủy' : 'Đang giữ tiền (Chuyến đi chưa xong)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
