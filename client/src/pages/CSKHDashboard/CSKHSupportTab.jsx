import React, { useState } from 'react';
import {
  Headphones, Star, AlertTriangle, Shield, MessageSquare,
  Send, CheckCircle, XCircle, Eye, EyeOff, Clock, ChevronRight
} from 'lucide-react';

/* ---- Sub-tab navigation ---- */
const SUBTABS = [
  { key: 'tickets',   label: 'Support Tickets', icon: <Headphones size={14} />, countKey: 'openTickets' },
  { key: 'incidents', label: 'Sự cố khẩn cấp',  icon: <AlertTriangle size={14} />, countKey: 'activeIncidents' },
  { key: 'disputes',  label: 'Tranh chấp',       icon: <Shield size={14} />, countKey: 'openDisputes' },
  { key: 'reviews',   label: 'Đánh giá',          icon: <Star size={14} />, countKey: null },
];

export const CSKHSupportTab = ({
  ticketsList = [],
  selectedTicket, setSelectedTicket,
  replyText, setReplyText,
  handleReplyTicket, handleResolveTicket,
  reviewsList = [],
  handleToggleReviewVisibility,
  incidentsList = [],
  handleResolveIncident,
  disputesList = [],
  selectedDispute, setSelectedDispute,
  disputeVerdict, setDisputeVerdict,
  handleResolveDispute,
  setSelectedLicenseImage,
  actionLoading,
}) => {
  const [subTab, setSubTab] = useState('tickets');

  const openTickets      = ticketsList.filter(t => t.status === 'open').length;
  const activeIncidents  = incidentsList.filter(i => i.incident?.status === 'pending').length;
  const openDisputes     = disputesList.filter(d => d.status === 'open' || d.status === 'pending').length;

  const counts = { openTickets, activeIncidents, openDisputes };

  const getTicketStatusCfg = (status) => {
    switch(status) {
      case 'open':     return { label: 'Đang mở',      cls: 'cskh-badge-amber' };
      case 'replied':  return { label: 'Đã phản hồi',  cls: 'cskh-badge-indigo' };
      case 'resolved': return { label: 'Hoàn tất',     cls: 'cskh-badge-green' };
      default:         return { label: status,          cls: 'cskh-badge-gray' };
    }
  };

  return (
    <div className="cskh-fade">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cskh-text)' }}>Hỗ trợ khách hàng & Xử lý sự cố</span>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUBTABS.map(t => {
          const cnt = t.countKey ? counts[t.countKey] : null;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: subTab === t.key ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                background: subTab === t.key ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                color: subTab === t.key ? '#818cf8' : 'var(--cskh-text-muted)',
                fontSize: 13, fontWeight: subTab === t.key ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {t.icon}
              {t.label}
              {cnt > 0 && (
                <span style={{
                  background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======== SUPPORT TICKETS ======== */}
      {subTab === 'tickets' && (
        <div className="cskh-chat-layout">
          {/* Left: Ticket list */}
          <div className="cskh-ticket-list">
            <div className="cskh-ticket-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Headphones size={14} color="#6366f1" />
                <span>Hộp thư ({ticketsList.length})</span>
              </div>
              {openTickets > 0 && <span className="cskh-badge cskh-badge-red">{openTickets} mới</span>}
            </div>

            {ticketsList.length === 0 ? (
              <div className="cskh-empty" style={{ padding: 24 }}>
                <MessageSquare size={28} />
                <p>Chưa có yêu cầu nào</p>
              </div>
            ) : (
              ticketsList.map(t => {
                const sc = getTicketStatusCfg(t.status);
                const isActive = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    className={`cskh-ticket-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(t)}
                  >
                    <div className="cskh-ticket-avatar" style={{
                      background: isActive ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#334155,#475569)'
                    }}>
                      {(t.userName || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <div className="cskh-ticket-name">{t.userName}</div>
                        <span className={`cskh-badge ${sc.cls}`} style={{ fontSize: 9.5, padding: '2px 6px' }}>{sc.label}</span>
                      </div>
                      <div className="cskh-ticket-preview">{t.subject || t.message}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Chat panel */}
          <div className="cskh-chat-panel">
            {!selectedTicket ? (
              <div className="cskh-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={40} />
                <h5>Chọn một ticket để xem chi tiết</h5>
                <p>Nhấn vào ticket ở bên trái để mở cuộc hội thoại</p>
              </div>
            ) : (
              <>
                <div className="cskh-chat-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--cskh-text)' }}>{selectedTicket.userName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{selectedTicket.subject || selectedTicket.message?.slice(0, 60)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        className="cskh-btn cskh-btn-approve"
                        onClick={() => handleResolveTicket(selectedTicket.id)}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={13} /> Đóng ticket
                      </button>
                    )}
                    <button className="cskh-btn cskh-btn-reject cskh-btn-sm" onClick={() => setSelectedTicket(null)}>
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="cskh-chat-messages">
                  <div className="cskh-msg">
                    <div className="cskh-msg-bubble">{selectedTicket.message}</div>
                    <div className="cskh-msg-time">
                      {selectedTicket.userName} · {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('vi-VN') : ''}
                    </div>
                  </div>
                  {selectedTicket.reply && (
                    <div className="cskh-msg cskh-msg-user">
                      <div className="cskh-msg-bubble">{selectedTicket.reply}</div>
                      <div className="cskh-msg-time">CSKH đã phản hồi</div>
                    </div>
                  )}
                </div>

                {/* Input */}
                {selectedTicket.status !== 'resolved' && (
                  <form className="cskh-chat-input-bar" onSubmit={handleReplyTicket}>
                    <textarea
                      className="cskh-chat-textarea"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Nhập phản hồi cho khách hàng..."
                      rows={1}
                    />
                    <button type="submit" className="cskh-chat-send-btn" disabled={actionLoading || !replyText.trim()}>
                      <Send size={15} />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ======== INCIDENTS ======== */}
      {subTab === 'incidents' && (
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <AlertTriangle size={15} color="#ef4444" />
              Sự cố khẩn cấp được báo cáo
            </h4>
            {activeIncidents > 0 && <span className="cskh-badge cskh-badge-red">{activeIncidents} chưa xử lý</span>}
          </div>

          {incidentsList.length === 0 ? (
            <div className="cskh-empty">
              <CheckCircle size={36} color="#10b981" />
              <h5 style={{ color: '#10b981' }}>Không có sự cố nào</h5>
              <p>Tất cả chuyến đi diễn ra bình thường.</p>
            </div>
          ) : (
            <div className="cskh-table-wrap">
              <table className="cskh-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Xe / Chuyến đi</th>
                    <th>Mô tả sự cố</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentsList.map(item => {
                    const inc = item.incident || {};
                    const isPending = inc.status === 'pending';
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.userName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{item.userEmail}</div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.carName}</td>
                        <td style={{ maxWidth: 260, fontSize: 12.5, color: '#cbd5e1' }}>
                          {inc.description || 'Không có mô tả'}
                        </td>
                        <td>
                          <span className={`cskh-badge ${isPending ? 'cskh-badge-red' : 'cskh-badge-green'}`}>
                            {isPending ? '⚡ Chưa xử lý' : '✓ Đã xử lý'}
                          </span>
                        </td>
                        <td>
                          <div className="cskh-actions" style={{ justifyContent: 'center' }}>
                            {isPending ? (
                              <button
                                className="cskh-btn cskh-btn-approve"
                                onClick={() => handleResolveIncident(item.id)}
                                disabled={actionLoading}
                              >
                                <CheckCircle size={13} /> Đã xử lý
                              </button>
                            ) : (
                              <span style={{ fontSize: 12, color: '#10b981' }}>✓ Hoàn tất</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======== DISPUTES ======== */}
      {subTab === 'disputes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Disputes list */}
          <div className="cskh-card">
            <div className="cskh-card-header">
              <h4 className="cskh-card-title"><Shield size={15} color="#ec4899" /> Danh sách khiếu nại</h4>
              {openDisputes > 0 && <span className="cskh-badge cskh-badge-pink">{openDisputes} cần giải quyết</span>}
            </div>
            {disputesList.length === 0 ? (
              <div className="cskh-empty">
                <CheckCircle size={32} color="#10b981" />
                <h5 style={{ color: '#10b981' }}>Không có khiếu nại</h5>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {disputesList.map(d => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDispute(d)}
                    style={{
                      padding: '12px 20px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedDispute?.id === d.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cskh-text)' }}>{d.userName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 2 }}>{(d.description || d.message || '').slice(0, 60)}...</div>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dispute detail + verdict */}
          <div className="cskh-card">
            <div className="cskh-card-header">
              <h4 className="cskh-card-title"><Shield size={15} color="#6366f1" /> Chi tiết & Phán quyết</h4>
            </div>
            {!selectedDispute ? (
              <div className="cskh-empty">
                <Shield size={32} />
                <p>Chọn một khiếu nại để xem chi tiết</p>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Người khiếu nại</div>
                  <div style={{ fontWeight: 600, color: 'var(--cskh-text)' }}>{selectedDispute.userName}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Nội dung</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px' }}>
                    {selectedDispute.description || selectedDispute.message || 'Không có nội dung'}
                  </div>
                </div>
                {selectedDispute.status === 'resolved' ? (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#10b981' }}>
                    ✓ Đã giải quyết: {selectedDispute.resolution || selectedDispute.verdict}
                  </div>
                ) : (
                  <form onSubmit={handleResolveDispute}>
                    <div style={{ marginBottom: 10, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phán quyết của CSKH</div>
                    <textarea
                      value={disputeVerdict}
                      onChange={e => setDisputeVerdict(e.target.value)}
                      placeholder="Nhập kết luận xử lý tranh chấp..."
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                        color: 'var(--cskh-text)', padding: '10px 14px', fontSize: 13,
                        fontFamily: 'inherit', resize: 'vertical', minHeight: 80,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="submit"
                      className="cskh-btn cskh-btn-indigo"
                      disabled={actionLoading || !disputeVerdict.trim()}
                      style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCircle size={14} /> Xác nhận phán quyết
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======== REVIEWS ======== */}
      {subTab === 'reviews' && (
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <Star size={15} color="#f59e0b" />
              Đánh giá dịch vụ của khách hàng
            </h4>
            <span className="cskh-badge cskh-badge-amber">{reviewsList.length} đánh giá</span>
          </div>

          {reviewsList.length === 0 ? (
            <div className="cskh-empty">
              <Star size={36} />
              <h5>Chưa có đánh giá nào</h5>
            </div>
          ) : (
            <div className="cskh-table-wrap">
              <table className="cskh-table">
                <thead>
                  <tr>
                    <th>Người đánh giá</th>
                    <th>Xe</th>
                    <th>Điểm</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewsList.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.userName || r.renterName}</div>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{r.carName}</td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 12.5, color: '#cbd5e1' }}>
                        {(r.comment || r.review || '').slice(0, 80)}{r.comment?.length > 80 ? '...' : ''}
                      </td>
                      <td>
                        <span className={`cskh-badge ${r.status === 'hidden' ? 'cskh-badge-red' : 'cskh-badge-green'}`}>
                          {r.status === 'hidden' ? 'Đã ẩn' : 'Hiển thị'}
                        </span>
                      </td>
                      <td>
                        <div className="cskh-actions" style={{ justifyContent: 'center' }}>
                          <button
                            className={`cskh-btn cskh-btn-sm ${r.status === 'hidden' ? 'cskh-btn-approve' : 'cskh-btn-reject'}`}
                            onClick={() => handleToggleReviewVisibility(r.id, r.status !== 'hidden')}
                            disabled={actionLoading}
                          >
                            {r.status === 'hidden' ? <><Eye size={12} /> Hiện</>  : <><EyeOff size={12} /> Ẩn</>}
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
    </div>
  );
};
