import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, BadgeCheck, Zap, RefreshCw, ChevronRight, AlertTriangle, Terminal, History } from 'lucide-react';
import { api } from '../../utils/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const MethodChip = ({ method }) => {
  const cfg = {
    wallet: { label: 'Ví ViVuCar', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    vnpay: { label: 'VNPAY', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    vietqr: { label: 'VietQR', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };
  const c = cfg[method] || { label: method || 'Khác', color: 'var(--cskh-text-muted)', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span className="cskh-method-chip" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
};

const DepositBadge = ({ status }) => {
  const map = {
    paid: { label: 'Đang giữ cọc', cls: 'cskh-badge-blue' },
    refunded: { label: 'Đã hoàn cọc', cls: 'cskh-badge-green' },
    withheld: { label: 'Đã thu cọc', cls: 'cskh-badge-red' },
    pending: { label: 'Chưa đặt cọc', cls: 'cskh-badge-amber' },
  };
  const d = map[status] || { label: status || 'Không rõ', cls: 'cskh-badge-gray' };
  return <span className={`cskh-badge ${d.cls}`}>{d.label}</span>;
};

// Webhook Simulator Panel
const WebhookSimulator = ({ pendingQrBookings = [] }) => {
  const generateTxnId = () => `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const [form, setForm] = useState({
    transaction_id: generateTxnId(),
    transfer_content: '',
    amount: '',
    bank_name: 'MB Bank',
    account_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [txnHistory, setTxnHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  const presets = pendingQrBookings.map(b => ({
    label: `#${b.id} — ${b.carName || 'Xe'} (${b.groupId ? 'Giỏ ' + b.groupId : 'Đơn lẻ'})`,
    value: b.id,
    content: b.groupId
      ? `VIVUCAR GROUP ${b.groupId}`
      : `THUEXE ${b.carName || 'Xe'} ${b.id}`,
    amount: b.depositAmount || Math.round((b.totalPrice || 0) * 0.3),
  }));

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.webhook.getTransactions(20);
      setTxnHistory(Array.isArray(data) ? data : []);
    } catch (_) {
      setTxnHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    if (!val) return;
    const preset = presets.find(p => String(p.value) === val);
    if (preset) {
      setForm(f => ({
        ...f,
        transfer_content: preset.content,
        amount: String(preset.amount),
      }));
    }
  };

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transaction_id.trim() || !form.amount || !form.transfer_content.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.webhook.simulate({
        transaction_id: form.transaction_id.trim(),
        amount: Number(form.amount),
        transfer_content: form.transfer_content.trim(),
        account_number: form.account_number.trim(),
        bank_name: form.bank_name.trim(),
      });
      setResult({ success: true, message: res.message || 'Xác nhận thành công!', detail: res.detail, type: res.type });
      setForm(f => ({ ...f, transaction_id: generateTxnId() }));
      setSelectedPreset('');
      await loadHistory();
    } catch (err) {
      const msg = err?.message || 'Lỗi không xác định.';
      const isDup = msg.includes('409') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('da duoc');
      setResult({ success: false, message: msg, isDuplicate: isDup });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = { matched: '#10b981', unmatched: '#f59e0b', duplicate: '#6366f1' };
  const statusLabel = { matched: '✅ Khớp đơn', unmatched: '⚠️ Không khớp', duplicate: '🔁 Trùng lặp' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}>
        <Terminal size={18} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>
            Demo Mode — Mô phỏng Webhook Ngân Hàng
          </div>
          <div style={{ fontSize: 12, color: 'var(--cskh-text-muted)', lineHeight: 1.6 }}>
            Gửi thông báo biến động số dư giả lập để kiểm tra tính năng tự động xác nhận cọc VietQR.
            Khi nhận webhook, hệ thống sẽ tự tìm đơn khớp và confirm — <strong>không cần CSKH thao tác thủ công</strong>.
          </div>
        </div>
      </div>

      <div className="cskh-card">
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <Zap size={15} color="#f59e0b" />
            Gửi Webhook Giả
          </h4>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          {presets.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
                Chọn nhanh từ đơn đang chờ VietQR:
              </label>
              <select
                value={selectedPreset}
                onChange={handlePresetChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: '1px solid rgba(99,102,241,0.3)',
                  background: 'var(--cskh-card)',
                  color: 'var(--cskh-text)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="">— Chọn đơn để auto-fill —</option>
                {presets.map(p => (
                  <option key={p.value} value={String(p.value)}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
                Mã giao dịch *
              </label>
              <input
                type="text"
                value={form.transaction_id}
                onChange={handleChange('transaction_id')}
                placeholder="TXN_..."
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
                Số tiền (VND) *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={handleChange('amount')}
                placeholder="150000"
                required
                min={1}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
              Nội dung chuyển khoản * &nbsp;
              <span style={{ fontWeight: 400, color: 'var(--cskh-text-dim)' }}>
                (VD: THUEXE Toyota 42 &nbsp;|&nbsp; VIVUCAR GROUP 5)
              </span>
            </label>
            <input
              type="text"
              value={form.transfer_content}
              onChange={handleChange('transfer_content')}
              placeholder="THUEXE Toyota Corolla 42"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
                Ngân hàng gửi
              </label>
              <input
                type="text"
                value={form.bank_name}
                onChange={handleChange('bank_name')}
                placeholder="MB Bank"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', marginBottom: 5, display: 'block' }}>
                Số TK gửi
              </label>
              <input
                type="text"
                value={form.account_number}
                onChange={handleChange('account_number')}
                placeholder="0987654321"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.amount || !form.transfer_content.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              transition: 'all 0.2s',
              alignSelf: 'flex-start',
            }}
          >
            {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {loading ? 'Đang xử lý...' : 'Gửi Webhook Giả'}
          </button>
        </form>

        {result && (
          <div style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 8,
            background: result.success
              ? 'rgba(16,185,129,0.1)'
              : result.isDuplicate
                ? 'rgba(99,102,241,0.1)'
                : 'rgba(245,158,11,0.1)',
            border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : result.isDuplicate ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            {result.success
              ? <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />
              : result.isDuplicate
                ? <RefreshCw size={18} color="#818cf8" style={{ flexShrink: 0 }} />
                : <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            }
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: result.success ? '#10b981' : result.isDuplicate ? '#818cf8' : '#f59e0b', marginBottom: 3 }}>
                {result.success ? '✅ Xác nhận tự động thành công!' : result.isDuplicate ? '🔁 Giao dịch đã xử lý' : '⚠️ Không khớp đơn'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--cskh-text-muted)' }}>{result.message}</div>
              {result.detail && (
                <div style={{ fontSize: 11.5, color: 'var(--cskh-text-dim)', marginTop: 4 }}>
                  {result.type === 'group'
                    ? `Group #${result.detail.groupId} — ${result.detail.confirmedBookingIds?.length || 0} đơn con xác nhận`
                    : `Booking #${result.detail.bookingId} đã chuyển sang Chờ Chủ xe duyệt`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="cskh-card">
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <History size={15} color="#6366f1" />
            Lịch sử giao dịch webhook
          </h4>
          <button
            onClick={loadHistory}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cskh-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <RefreshCw size={13} style={historyLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            Làm mới
          </button>
        </div>

        {txnHistory.length === 0 ? (
          <div className="cskh-empty">
            <History size={32} color="var(--cskh-text-dim)" />
            <h5 style={{ color: "var(--cskh-text-muted)" }}>Chưa có giao dịch nào</h5>
            <p>Gửi webhook đầu tiên để xem lịch sử tại đây.</p>
          </div>
        ) : (
          <div className="cskh-table-wrap">
            <table className="cskh-table">
              <thead>
                <tr>
                  <th>Mã GD</th>
                  <th>Nội dung</th>
                  <th>Số tiền</th>
                  <th>Kết quả</th>
                  <th>Đơn khớp</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {txnHistory.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--cskh-text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.transaction_id}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.transfer_content || '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#818cf8', whiteSpace: 'nowrap' }}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: t.status === 'matched' ? 'rgba(16,185,129,0.12)' : t.status === 'duplicate' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                        color: statusColor[t.status] || '#f59e0b',
                      }}>
                        {statusLabel[t.status] || t.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--cskh-text-muted)' }}>
                      {t.matched_booking_id ? `#${t.matched_booking_id}` : t.matched_group_id ? `G#${t.matched_group_id}` : '—'}
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--cskh-text-dim)', whiteSpace: 'nowrap' }}>
                      {formatDate(t.created_at)}
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

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid rgba(99,102,241,0.25)',
  background: 'var(--cskh-card)',
  color: 'var(--cskh-text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const TABS = [
  { key: 'pending', label: 'Chờ xác nhận VietQR', icon: CreditCard },
  { key: 'refund', label: 'Cần xử lý cọc', icon: CheckCircle },
  { key: 'simulator', label: 'Mô phỏng Webhook', icon: Zap },
  { key: 'all', label: 'Tất cả giao dịch', icon: History },
];

export const CSKHPaymentTab = ({
  filteredBookings = [],
  handleRefundDeposit,
  handleConfirmVietqr,
  actionLoading,
}) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [simulatingId, setSimulatingId] = useState(null);

  const isQr = (m) => {
    const pm = String(m || '').toLowerCase();
    return pm === 'vietqr' || pm === 'qr' || pm === 'bank_transfer';
  };

  const pendingVietqr = filteredBookings.filter(b => isQr(b.paymentMethod) && b.depositStatus === 'pending');
  const needsRefund = filteredBookings.filter(b => b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled'));

  const handleSimulateOneClick = async (b) => {
    setSimulatingId(b.id);
    try {
      const depositAmt = b.depositAmount || Math.round((b.totalPrice || 0) * 0.3);
      const content = b.groupId ? `VIVUCAR GROUP ${b.groupId}` : `THUEXE ${b.carName || 'Xe'} ${b.id}`;
      await api.webhook.simulate({
        transaction_id: `TXN_CSKH_${Date.now()}`,
        amount: depositAmt,
        transfer_content: content,
        bank_name: 'MB Bank',
      });
      if (handleConfirmVietqr) await handleConfirmVietqr(b.id);
    } catch (err) {
      console.error('Simulate error:', err);
      if (handleConfirmVietqr) await handleConfirmVietqr(b.id);
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="cskh-fade">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cskh-text)' }}>Quản lý Thanh toán & Cọc cược</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cskh-text-muted)' }}>
          Xác nhận chuyển khoản VietQR, mô phỏng webhook ngân hàng tự động, và quyết định hoàn/giữ cọc.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        background: 'rgba(15,23,42,0.5)',
        borderRadius: 10,
        padding: 4,
        border: '1px solid rgba(99,102,241,0.15)',
        flexWrap: 'wrap',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const badge = tab.key === 'pending' ? pendingVietqr.length : tab.key === 'refund' ? needsRefund.length : null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                background: isActive ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                color: isActive ? '#fff' : 'var(--cskh-text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={13} />
              {tab.label}
              {badge > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(245,158,11,0.8)',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 800,
                  minWidth: 18,
                  textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'pending' && (
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <CreditCard size={15} color="#f59e0b" />
              VietQR chờ xác nhận (Tự động / Thủ công)
            </h4>
            {pendingVietqr.length > 0 && (
              <span className="cskh-badge cskh-badge-amber">{pendingVietqr.length} giao dịch</span>
            )}
          </div>

          {pendingVietqr.length === 0 ? (
            <div className="cskh-empty">
              <BadgeCheck size={36} color="#10b981" />
              <h5 style={{ color: '#10b981' }}>Không có giao dịch chờ duyệt</h5>
              <p>Tất cả VietQR đã được xác nhận hoặc chưa có giao dịch mới.<br />
                <span style={{ color: '#818cf8' }}>Dùng tab "Mô phỏng Webhook" để xem lịch sử nhận dữ liệu từ ngân hàng!</span>
              </p>
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
                    <th style={{ textAlign: 'center' }}>Hành động CSKH</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVietqr.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.userName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{b.userEmail}</div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.carName}</td>
                      <td><MethodChip method={b.paymentMethod} /></td>
                      <td style={{ fontWeight: 700, color: '#818cf8' }}>{formatCurrency(b.totalPrice)}</td>
                      <td><DepositBadge status={b.depositStatus} /></td>
                      <td>
                        <div className="cskh-actions" style={{ justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                          <button
                            className="cskh-btn"
                            style={{
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '7px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: (actionLoading || simulatingId === b.id) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => handleSimulateOneClick(b)}
                            disabled={actionLoading || simulatingId === b.id}
                          >
                            <Zap size={13} /> {simulatingId === b.id ? 'Đang chạy giả lập...' : '⚡ 1-Click Chạy Thử Webhook Khớp'}
                          </button>
                          <button
                            className="cskh-btn cskh-btn-orange"
                            onClick={() => handleConfirmVietqr(b.id)}
                            disabled={actionLoading || simulatingId === b.id}
                          >
                            <CheckCircle size={13} /> Duyệt thủ công (CSKH)
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
      )}

      {activeTab === 'refund' && (
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <CheckCircle size={15} color="#10b981" />
              Chuyến đi hoàn tất — Cần quyết định cọc
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
                          <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{b.userEmail}</div>
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
      )}

      {activeTab === 'simulator' && (
        <WebhookSimulator pendingQrBookings={pendingVietqr} />
      )}

      {activeTab === 'all' && (
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
                      <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{b.userEmail}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.carName}</td>
                    <td><MethodChip method={b.paymentMethod} /></td>
                    <td style={{ color: '#818cf8', fontWeight: 600 }}>{formatCurrency(b.totalPrice)}</td>
                    <td><DepositBadge status={b.depositStatus} /></td>
                    <td>
                      <span className={`cskh-badge ${b.status === 'completed' ? 'cskh-badge-green' :
                          b.status === 'cancelled' ? 'cskh-badge-red' :
                            b.status === 'approved' ? 'cskh-badge-blue' :
                              'cskh-badge-amber'
                        }`}>
                        {b.status === 'completed' ? 'Hoàn tất' :
                          b.status === 'cancelled' ? 'Đã hủy' :
                            b.status === 'approved' ? 'Đã duyệt' : 'Đang chờ'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--cskh-text-dim)', padding: '32px' }}>
                      Không có giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
