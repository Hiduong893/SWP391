import React from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, BadgeCheck } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const MethodChip = ({ method }) => {
  const cfg = {
    wallet:  { label: 'Ví ViVuCar', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    vnpay:   { label: 'VNPAY',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    vietqr:  { label: 'VietQR',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };
  const c = cfg[method] || { label: method || 'Khác', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span className="cskh-method-chip" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
};

const DepositBadge = ({ status }) => {
  const map = {
    paid:     { label: 'Đang giữ cọc',   cls: 'cskh-badge-blue' },
    refunded: { label: 'Đã hoàn cọc',    cls: 'cskh-badge-green' },
    withheld: { label: 'Đã thu cọc',     cls: 'cskh-badge-red' },
    pending:  { label: 'Chưa đặt cọc',   cls: 'cskh-badge-amber' },
  };
  const d = map[status] || { label: status || 'Không rõ', cls: 'cskh-badge-gray' };
  return <span className={`cskh-badge ${d.cls}`}>{d.label}</span>;
};

export const CSKHPaymentTab = ({
  filteredBookings = [],
  handleRefundDeposit,
  handleConfirmVietqr,
  actionLoading,
}) => {
  const pendingVietqr = filteredBookings.filter(b => b.paymentMethod === 'vietqr' && b.depositStatus === 'pending');
  const needsRefund   = filteredBookings.filter(b => b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled'));
  const others        = filteredBookings.filter(b => !(b.paymentMethod === 'vietqr' && b.depositStatus === 'pending') && !(b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled')));

  return (
    <div className="cskh-fade">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Quản lý Thanh toán & Cọc cược</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8' }}>
          Xác nhận chuyển khoản VietQR và quyết định hoàn trả / giữ lại tiền cọc sau khi khách trả xe.
        </p>
      </div>

      {/* SECTION 1: Pending VietQR */}
      <div className="cskh-card" style={{ marginBottom: 20 }}>
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <CreditCard size={15} color="#f59e0b" />
            VietQR chờ xác nhận chuyển khoản
          </h4>
          {pendingVietqr.length > 0 && (
            <span className="cskh-badge cskh-badge-amber">{pendingVietqr.length} giao dịch</span>
          )}
        </div>

        {pendingVietqr.length === 0 ? (
          <div className="cskh-empty">
            <BadgeCheck size={36} color="#10b981" />
            <h5 style={{ color: '#10b981' }}>Không có giao dịch chờ duyệt</h5>
            <p>Tất cả VietQR đã được xác nhận hoặc chưa có giao dịch mới.</p>
          </div>
        ) : (
          <div className="cskh-table-wrap">
            <table className="cskh-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Xe thuê</th>
                  <th>Phương thức</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái cọc</th>
                  <th style={{ textAlign: 'center' }}>Xác nhận</th>
                </tr>
              </thead>
              <tbody>
                {pendingVietqr.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.userName}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{b.userEmail}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.carName}</td>
                    <td><MethodChip method={b.paymentMethod} /></td>
                    <td style={{ fontWeight: 700, color: '#818cf8' }}>{formatCurrency(b.totalPrice)}</td>
                    <td><DepositBadge status={b.depositStatus} /></td>
                    <td>
                      <div className="cskh-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="cskh-btn cskh-btn-orange"
                          onClick={() => handleConfirmVietqr(b.id)}
                          disabled={actionLoading}
                        >
                          <CheckCircle size={13} /> Đã nhận 500k
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Needs refund decision */}
      <div className="cskh-card" style={{ marginBottom: 20 }}>
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <CheckCircle size={15} color="#10b981" />
            Chuyến đi hoàn tất — Cần quyết định cọc bảo đảm (5.000.000đ)
          </h4>
          {needsRefund.length > 0 && (
            <span className="cskh-badge cskh-badge-green">{needsRefund.length} chờ xử lý</span>
          )}
        </div>

        {needsRefund.length === 0 ? (
          <div className="cskh-empty">
            <Clock size={36} />
            <h5>Chưa có chuyến đi cần xử lý cọc</h5>
            <p>Khi chuyến đi hoàn tất hoặc bị hủy, các case sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="cskh-table-wrap">
            <table className="cskh-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Xe thuê</th>
                  <th>Tổng tiền thuê</th>
                  <th>Cọc bảo đảm</th>
                  <th>Trạng thái chuyến</th>
                  <th style={{ textAlign: 'center' }}>Quyết định cọc</th>
                </tr>
              </thead>
              <tbody>
                {needsRefund.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.userName}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{b.userEmail}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.carName}</td>
                    <td style={{ color: '#818cf8', fontWeight: 600 }}>{formatCurrency(b.totalPrice)}</td>
                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>5.000.000đ</td>
                    <td>
                      <span className={`cskh-badge ${b.status === 'completed' ? 'cskh-badge-green' : 'cskh-badge-red'}`}>
                        {b.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                      </span>
                    </td>
                    <td>
                      <div className="cskh-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="cskh-btn cskh-btn-approve"
                          onClick={() => handleRefundDeposit(b.id, true)}
                          disabled={actionLoading}
                        >
                          <CheckCircle size={13} /> Hoàn cọc
                        </button>
                        <button
                          className="cskh-btn cskh-btn-reject"
                          onClick={() => handleRefundDeposit(b.id, false)}
                          disabled={actionLoading}
                        >
                          <XCircle size={13} /> Giữ cọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: All transactions overview */}
      <div className="cskh-card">
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <CreditCard size={15} color="#6366f1" />
            Tất cả giao dịch cọc
          </h4>
          <span className="cskh-badge cskh-badge-indigo">{filteredBookings.length} booking</span>
        </div>
        <div className="cskh-table-wrap">
          <table className="cskh-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Xe</th>
                <th>Phương thức</th>
                <th>Tổng tiền</th>
                <th>Trạng thái cọc</th>
                <th>Trạng thái chuyến</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(b => (
                <tr key={b.id} style={{ opacity: b.status === 'cancelled' ? 0.6 : 1 }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.userName}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{b.userEmail}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{b.carName}</td>
                  <td><MethodChip method={b.paymentMethod} /></td>
                  <td style={{ color: '#818cf8', fontWeight: 600 }}>{formatCurrency(b.totalPrice)}</td>
                  <td><DepositBadge status={b.depositStatus} /></td>
                  <td>
                    <span className={`cskh-badge ${
                      b.status === 'completed' ? 'cskh-badge-green' :
                      b.status === 'cancelled' ? 'cskh-badge-red' :
                      b.status === 'approved'  ? 'cskh-badge-blue' :
                      'cskh-badge-amber'
                    }`}>
                      {b.status === 'completed' ? 'Hoàn tất' :
                       b.status === 'cancelled' ? 'Đã hủy' :
                       b.status === 'approved'  ? 'Đã duyệt' : 'Đang chờ'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                    Không có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
