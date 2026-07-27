import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones, Star, AlertTriangle, Shield, MessageSquare,
  Send, CheckCircle, XCircle, Eye, EyeOff, Clock, ChevronRight,
  Sparkles, User, Car, Calendar, DollarSign, Phone, Mail,
  Bell, FileText, RefreshCw, Info, ChevronDown, ChevronUp,
  Zap, MessageCircle
} from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

/* ─────────────────────────────────────────────────────────────
   Sub-tab configuration
   ───────────────────────────────────────────────────────────── */
const SUBTABS = [
  { key: 'tickets',   label: 'Hộp thư hỗ trợ', icon: <Headphones size={14} />, countKey: 'openTickets' },
  { key: 'incidents', label: 'Sự cố khẩn cấp',  icon: <AlertTriangle size={14} />, countKey: 'activeIncidents' },
  { key: 'disputes',  label: 'Tranh chấp',       icon: <Shield size={14} />, countKey: 'openDisputes' },
  { key: 'reviews',   label: 'Đánh giá',          icon: <Star size={14} />, countKey: null },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

/* ─── Ticket Status config ──────────────────────────────────── */
const getTicketStatusCfg = (status) => {
  switch (status) {
    case 'open':     return { label: 'Đang chờ',    cls: 'cskh-badge-amber', dot: '#f59e0b' };
    case 'replied':  return { label: 'Đã phản hồi', cls: 'cskh-badge-indigo', dot: '#6366f1' };
    case 'resolved': return { label: 'Hoàn tất',    cls: 'cskh-badge-green', dot: '#10b981' };
    default:         return { label: status,          cls: 'cskh-badge-gray', dot: '#64748b' };
  }
};

/* ─── Chat bubble ───────────────────────────────────────────── */
const ChatBubble = ({ msg, cskhUserId }) => {
  const isCSKH = msg.senderRole === 'cskh' || msg.senderRole === 'admin';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isCSKH ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 12,
      alignItems: 'flex-end'
    }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: isCSKH ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#334155,#475569)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff'
      }}>
        {isCSKH ? 'CS' : (msg.senderName || 'U').slice(0, 2).toUpperCase()}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '72%' }}>
        <div style={{
          background: isCSKH ? 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.14))' : 'var(--cskh-surface-3)',
          border: `1px solid ${isCSKH ? 'rgba(99,102,241,0.2)' : 'var(--cskh-border-light)'}`,
          borderRadius: isCSKH ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--cskh-text)',
          lineHeight: 1.55,
          wordBreak: 'break-word'
        }}>
          {msg.message}
        </div>
        <div style={{
          fontSize: 10.5, color: 'var(--cskh-text-dim)', marginTop: 4,
          textAlign: isCSKH ? 'right' : 'left'
        }}>
          {isCSKH ? '🟣 CSKH' : `👤 ${msg.senderName}`} · {formatDate(msg.sentAt)}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
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
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const chatBottomRef = useRef(null);

  // Dispute detail + owner notification
  const [disputeDetail, setDisputeDetail]       = useState(null);
  const [loadingDetail, setLoadingDetail]        = useState(false);
  const [notifyOwnerMsg, setNotifyOwnerMsg]      = useState('');
  const [notifyOwnerLoading, setNotifyOwnerLoading] = useState(false);
  const [showNotifyForm, setShowNotifyForm]      = useState(false);
  const [verdictType, setVerdictType]            = useState('');

  // Incident note
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentNote, setIncidentNote]          = useState('');
  const [incidentNoteLoading, setIncidentNoteLoading] = useState(false);

  const { showToast } = useToast();

  // ── Counts ──────────────────────────────────────────────────
  const openTickets     = ticketsList.filter(t => t.status === 'open').length;
  const activeIncidents = incidentsList.filter(i => i.incident?.status === 'pending').length;
  const openDisputes    = disputesList.filter(d => d.status === 'open' || d.status === 'pending').length;
  const counts = { openTickets, activeIncidents, openDisputes };

  // ── Scroll chat to bottom ──────────────────────────────────
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.replies?.length]);

  // ── Load dispute detail ────────────────────────────────────
  const loadDisputeDetail = async (dispute) => {
    setSelectedDispute(dispute);
    setDisputeDetail(null);
    setShowNotifyForm(false);
    setNotifyOwnerMsg('');
    setLoadingDetail(true);
    try {
      const detail = await api.admin.getDisputeDetail(dispute.id);
      setDisputeDetail(detail);
    } catch (e) {
      setDisputeDetail(dispute); // fallback to list data
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── AI suggest ────────────────────────────────────────────
  const handleAiSuggest = async () => {
    if (!selectedTicket) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const data = await api.admin.suggestTicketReply(selectedTicket.id);
      const suggestion = data.suggestion || '';
      setAiSuggestion(suggestion);
      setReplyText(suggestion);
      showToast('AI đã tạo gợi ý phản hồi!', 'success');
    } catch (e) {
      showToast('Không thể tạo gợi ý AI lúc này.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Notify owner (dispute) ────────────────────────────────
  const handleNotifyOwner = async (e) => {
    e.preventDefault();
    if (!notifyOwnerMsg.trim()) { showToast('Vui lòng nhập nội dung thông báo.', 'warning'); return; }
    setNotifyOwnerLoading(true);
    try {
      const data = await api.admin.notifyOwnerDispute(selectedDispute.id, notifyOwnerMsg.trim());
      showToast(data.message, 'success');
      setShowNotifyForm(false);
      setNotifyOwnerMsg('');
    } catch (e) {
      showToast(e.message || 'Lỗi gửi thông báo chủ xe.', 'error');
    } finally {
      setNotifyOwnerLoading(false);
    }
  };

  // ── Add incident note ─────────────────────────────────────
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!incidentNote.trim()) { showToast('Vui lòng nhập nội dung ghi chú.', 'warning'); return; }
    setIncidentNoteLoading(true);
    try {
      const data = await api.admin.addIncidentNote(selectedIncident.bookingId, incidentNote.trim());
      showToast(data.message, 'success');
      setIncidentNote('');
    } catch (e) {
      showToast(e.message || 'Lỗi ghi chú sự cố.', 'error');
    } finally {
      setIncidentNoteLoading(false);
    }
  };

  // ── Verdict type → text ───────────────────────────────────
  const VERDICT_TEMPLATES = {
    favor_renter:  'Sau khi xem xét, CSKH quyết định: Ủng hộ người thuê xe. Người thuê sẽ được hoàn tiền và không chịu trách nhiệm về sự kiện này.',
    favor_owner:   'Sau khi xem xét, CSKH quyết định: Ủng hộ chủ xe. Tiền cọc sẽ được giữ lại hoặc bồi thường theo điều khoản thuê xe.',
    mutual:        'Sau khi xem xét, hai bên đã thỏa thuận được phương án giải quyết phù hợp. CSKH đóng vụ tranh chấp này.',
  };

  return (
    <div className="cskh-fade">
      {/* ── Section header ─────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cskh-text)' }}>Hỗ trợ khách hàng & Xử lý sự cố</span>
        </div>
      </div>

      {/* ── Sub-tab pills ─────────────────────────────────── */}
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
                border: subTab === t.key ? '1px solid #6366f1' : '1px solid var(--cskh-border)',
                background: subTab === t.key ? 'rgba(99,102,241,0.15)' : 'var(--cskh-surface-2)',
                color: subTab === t.key ? '#818cf8' : 'var(--cskh-text-muted)',
                fontSize: 13, fontWeight: subTab === t.key ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {t.icon}
              {t.label}
              {cnt > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          TAB: SUPPORT TICKETS (Chat multi-turn)
         ════════════════════════════════════════════════════ */}
      {subTab === 'tickets' && (
        <div className="cskh-chat-layout">
          {/* ── Left: Ticket list ─────────────────────────── */}
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
                const lastMsg = t.replies?.[t.replies.length - 1];
                const unread = t.status === 'open';
                return (
                  <div
                    key={t.id}
                    className={`cskh-ticket-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setSelectedTicket(t); setAiSuggestion(''); }}
                    style={{ position: 'relative' }}
                  >
                    {unread && (
                      <div style={{
                        position: 'absolute', top: 12, right: 12,
                        width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                        boxShadow: '0 0 0 2px rgba(239,68,68,0.3)'
                      }} />
                    )}
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
                      <div className="cskh-ticket-preview">
                        {t.subject || (lastMsg?.message?.slice(0, 55)) || t.message?.slice(0, 55)}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--cskh-text-dim)', marginTop: 2 }}>
                        {t.replies?.length || 0} tin nhắn · {formatDate(t.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right: Chat panel ─────────────────────────── */}
          <div className="cskh-chat-panel">
            {!selectedTicket ? (
              <div className="cskh-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={40} />
                <h5>Chọn một ticket để xem cuộc hội thoại</h5>
                <p>Nhấn vào ticket ở bên trái để mở</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="cskh-chat-header">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--cskh-text)' }}>
                      {selectedTicket.userName}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{selectedTicket.subject || selectedTicket.message?.slice(0, 50)}</span>
                      <span style={{ color: 'var(--cskh-text-dim)' }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MessageCircle size={11} />
                        {selectedTicket.replies?.length || 0} tin nhắn
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

                {/* Messages — full history */}
                <div className="cskh-chat-messages">
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((msg, i) => (
                      <ChatBubble key={i} msg={msg} />
                    ))
                  ) : (
                    /* Fallback for old format */
                    <div className="cskh-msg">
                      <div className="cskh-msg-bubble">{selectedTicket.message}</div>
                      <div className="cskh-msg-time">
                        {selectedTicket.userName} · {formatDate(selectedTicket.createdAt)}
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input + AI suggest */}
                {selectedTicket.status !== 'resolved' && (
                  <div>
                    {/* AI Suggestion bar */}
                    {aiSuggestion && (
                      <div style={{
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 8, padding: '8px 12px', margin: '0 0 8px',
                        fontSize: 12, color: 'var(--cskh-text-muted)',
                        display: 'flex', alignItems: 'flex-start', gap: 8
                      }}>
                        <Sparkles size={13} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ flex: 1 }}>Gợi ý AI: {aiSuggestion.slice(0, 120)}{aiSuggestion.length > 120 ? '...' : ''}</span>
                        <button onClick={() => setAiSuggestion('')} style={{ background: 'none', border: 'none', color: 'var(--cskh-text-dim)', cursor: 'pointer', padding: 0 }}>✕</button>
                      </div>
                    )}

                    <form className="cskh-chat-input-bar" onSubmit={handleReplyTicket}>
                      <textarea
                        className="cskh-chat-textarea"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Nhập phản hồi cho khách hàng... (Enter để gửi, Shift+Enter xuống dòng)"
                        rows={2}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (replyText.trim()) handleReplyTicket(e);
                          }
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
                        {/* AI Suggest button */}
                        <button
                          type="button"
                          onClick={handleAiSuggest}
                          disabled={aiLoading}
                          title="Gợi ý phản hồi bằng AI"
                          style={{
                            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: aiLoading ? 'not-allowed' : 'pointer', color: '#818cf8'
                          }}
                        >
                          {aiLoading
                            ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                            : <Sparkles size={13} />
                          }
                        </button>
                        <button type="submit" className="cskh-chat-send-btn" disabled={actionLoading || !replyText.trim()}>
                          <Send size={15} />
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {selectedTicket.status === 'resolved' && (
                  <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', borderTop: '1px solid rgba(16,185,129,0.15)', fontSize: 13, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} /> Ticket này đã được giải quyết
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: INCIDENTS (Sự cố khẩn cấp)
         ════════════════════════════════════════════════════ */}
      {subTab === 'incidents' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedIncident ? '1fr 1fr' : '1fr', gap: 16, transition: 'all 0.3s' }}>
          {/* Incidents list */}
          <div className="cskh-card">
            <div className="cskh-card-header">
              <h4 className="cskh-card-title">
                <AlertTriangle size={15} color="#ef4444" />
                Sự cố được báo cáo
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
                      <th>Xe</th>
                      <th>Mô tả sự cố</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentsList.map(item => {
                      const inc = item.incident || {};
                      const isPending = inc.status === 'pending';
                      const isSelected = selectedIncident?.bookingId === item.bookingId;
                      return (
                        <tr key={item.bookingId} style={{ background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.userName}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{item.userEmail}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.carName}</div>
                            {item.carImage && (
                              <img src={item.carImage} alt="" style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 4, marginTop: 2 }} />
                            )}
                          </td>
                          <td style={{ maxWidth: 220, fontSize: 12.5, color: 'var(--cskh-text-muted)', lineHeight: 1.4 }}>
                            {inc.description || 'Không có mô tả'}
                            {inc.cskhNote && (
                              <div style={{ fontSize: 11, color: '#818cf8', marginTop: 3 }}>
                                📝 Ghi chú CSKH: {inc.cskhNote}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`cskh-badge ${isPending ? 'cskh-badge-red' : 'cskh-badge-green'}`}>
                              {isPending ? '⚡ Chưa xử lý' : '✓ Đã xử lý'}
                            </span>
                          </td>
                          <td>
                            <div className="cskh-actions" style={{ justifyContent: 'center', gap: 6 }}>
                              <button
                                className="cskh-btn cskh-btn-indigo cskh-btn-sm"
                                onClick={() => setSelectedIncident(isSelected ? null : item)}
                                title="Xem chi tiết & ghi chú"
                              >
                                <FileText size={12} /> {isSelected ? 'Đóng' : 'Chi tiết'}
                              </button>
                              {isPending && (
                                <button
                                  className="cskh-btn cskh-btn-approve cskh-btn-sm"
                                  onClick={() => handleResolveIncident(item.bookingId)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle size={12} /> Xử lý xong
                                </button>
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

          {/* Incident detail panel */}
          {selectedIncident && (
            <div className="cskh-card" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
              <div className="cskh-card-header">
                <h4 className="cskh-card-title"><Info size={15} color="#6366f1" /> Chi tiết sự cố</h4>
                <button className="cskh-btn cskh-btn-reject cskh-btn-sm" onClick={() => setSelectedIncident(null)}>
                  <XCircle size={13} />
                </button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {/* Incident info */}
                <div style={{ background: 'var(--cskh-surface-2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--cskh-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Thông tin sự cố</div>
                  <div style={{ fontSize: 13, color: 'var(--cskh-text)', lineHeight: 1.6 }}>
                    {selectedIncident.incident?.description || 'Không có mô tả'}
                  </div>
                  {selectedIncident.incident?.image && (
                    <img
                      src={selectedIncident.incident.image}
                      alt="Bằng chứng sự cố"
                      style={{ width: '100%', borderRadius: 8, marginTop: 10, cursor: 'pointer' }}
                      onClick={() => setSelectedLicenseImage(selectedIncident.incident.image)}
                    />
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 8, display: 'flex', gap: 16 }}>
                    <span><User size={10} style={{ marginRight: 4 }} />{selectedIncident.userName}</span>
                    <span><Car size={10} style={{ marginRight: 4 }} />{selectedIncident.carName}</span>
                  </div>
                </div>

                {/* CSKH note */}
                {selectedIncident.incident?.cskhNote && (
                  <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: 4 }}>📝 Ghi chú CSKH trước đó</div>
                    <div style={{ color: 'var(--cskh-text)' }}>{selectedIncident.incident.cskhNote}</div>
                    <div style={{ fontSize: 11, color: 'var(--cskh-text-dim)', marginTop: 4 }}>
                      {selectedIncident.incident.cskhStaffName} · {formatDate(selectedIncident.incident.cskhNoteAt)}
                    </div>
                  </div>
                )}

                {/* Add note form */}
                <form onSubmit={handleAddNote}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cskh-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Ghi chú xử lý mới
                  </div>
                  <textarea
                    value={incidentNote}
                    onChange={e => setIncidentNote(e.target.value)}
                    placeholder="Nhập ghi chú xử lý sự cố, kết quả điện thoại với khách, bước tiếp theo..."
                    style={{
                      width: '100%', background: 'var(--cskh-border-light)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 8, color: 'var(--cskh-text)', padding: '10px 14px', fontSize: 13,
                      fontFamily: 'inherit', resize: 'vertical', minHeight: 80, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="submit"
                    className="cskh-btn cskh-btn-indigo"
                    disabled={incidentNoteLoading || !incidentNote.trim()}
                    style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  >
                    {incidentNoteLoading
                      ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Đang lưu...</>
                      : <><Send size={13} /> Lưu ghi chú & Thông báo khách</>
                    }
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: DISPUTES (Tranh chấp)
         ════════════════════════════════════════════════════ */}
      {subTab === 'disputes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
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
                {disputesList.map(d => {
                  const isSelected = selectedDispute?.id === d.id;
                  const isOpen = d.status === 'open' || d.status === 'pending';
                  return (
                    <div
                      key={d.id}
                      onClick={() => loadDisputeDetail(d)}
                      style={{
                        padding: '14px 20px', cursor: 'pointer',
                        borderBottom: '1px solid var(--cskh-border-light)',
                        background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        transition: 'background 0.15s',
                        borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cskh-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isOpen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />}
                            {d.renterName || d.userName}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 3 }}>
                            vs Chủ xe: {d.ownerName}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--cskh-text-dim)', marginTop: 3 }}>
                            {(d.description || '').slice(0, 60)}{(d.description || '').length > 60 ? '...' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          <span className={`cskh-badge ${isOpen ? 'cskh-badge-red' : 'cskh-badge-green'}`} style={{ fontSize: 9.5 }}>
                            {isOpen ? 'Đang mở' : 'Đã giải quyết'}
                          </span>
                          <ChevronRight size={13} color="#64748b" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dispute detail + verdict */}
          <div className="cskh-card">
            <div className="cskh-card-header">
              <h4 className="cskh-card-title"><Shield size={15} color="#6366f1" /> Chi tiết & Phán quyết</h4>
            </div>

            {!selectedDispute ? (
              <div className="cskh-empty" style={{ flex: 1, padding: '40px 20px' }}>
                <Shield size={36} />
                <p>Chọn một khiếu nại để xem chi tiết<br />và đưa ra phán quyết</p>
              </div>
            ) : loadingDetail ? (
              <div className="cskh-empty" style={{ padding: '32px 20px' }}>
                <RefreshCw size={28} style={{ animation: 'spin 0.8s linear infinite', color: '#6366f1' }} />
                <p>Đang tải chi tiết tranh chấp...</p>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                {/* ── Parties info ────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {/* Renter */}
                  <div style={{ background: 'var(--cskh-surface-2)', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ fontSize: 10, color: 'var(--cskh-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>👤 Người thuê (khiếu nại)</div>
                    <div style={{ fontWeight: 600, color: 'var(--cskh-text)', fontSize: 13 }}>{disputeDetail?.renterName || selectedDispute.renterName}</div>
                    {disputeDetail?.renterEmail && <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{disputeDetail.renterEmail}</div>}
                    {disputeDetail?.renterPhone && <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{disputeDetail.renterPhone}</div>}
                  </div>
                  {/* Owner */}
                  <div style={{ background: 'var(--cskh-surface-2)', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #ec4899' }}>
                    <div style={{ fontSize: 10, color: 'var(--cskh-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>🚗 Chủ xe (bị khiếu nại)</div>
                    <div style={{ fontWeight: 600, color: 'var(--cskh-text)', fontSize: 13 }}>{disputeDetail?.ownerName || selectedDispute.ownerName}</div>
                    {disputeDetail?.ownerEmail && <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{disputeDetail.ownerEmail}</div>}
                    {disputeDetail?.ownerPhone && <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} />{disputeDetail.ownerPhone}</div>}
                  </div>
                </div>

                {/* ── Booking context ─────────────────────── */}
                {(disputeDetail?.booking || selectedDispute.bookingPrice !== undefined) && (
                  <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid rgba(99,102,241,0.12)' }}>
                    <div style={{ fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📋 Thông tin chuyến đi</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                      {disputeDetail?.booking?.carName && <div><Car size={10} style={{ marginRight: 4 }} /><strong>Xe:</strong> {disputeDetail.booking.carName} ({disputeDetail.booking.carPlate})</div>}
                      {disputeDetail?.booking?.pickupDate && <div><Calendar size={10} style={{ marginRight: 4 }} /><strong>Từ:</strong> {formatDate(disputeDetail.booking.pickupDate)}</div>}
                      {disputeDetail?.booking?.returnDate && <div><Calendar size={10} style={{ marginRight: 4 }} /><strong>Đến:</strong> {formatDate(disputeDetail.booking.returnDate)}</div>}
                      {(disputeDetail?.booking?.totalPrice || selectedDispute.bookingPrice) && (
                        <div><DollarSign size={10} style={{ marginRight: 4 }} /><strong>Giá:</strong> {formatCurrency(disputeDetail?.booking?.totalPrice || selectedDispute.bookingPrice)}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Dispute description ─────────────────── */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--cskh-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nội dung khiếu nại</div>
                  <div style={{ fontSize: 13, color: 'var(--cskh-text-muted)', lineHeight: 1.65, background: 'var(--cskh-surface-2)', borderRadius: 8, padding: '10px 14px' }}>
                    {selectedDispute.description || 'Không có nội dung'}
                  </div>
                </div>

                {/* ── Notify owner button ─────────────────── */}
                {(selectedDispute.status === 'open' || selectedDispute.status === 'pending') && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => setShowNotifyForm(!showNotifyForm)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
                        borderRadius: 8, border: '1px solid rgba(236,72,153,0.3)',
                        background: showNotifyForm ? 'rgba(236,72,153,0.1)' : 'transparent',
                        color: '#ec4899', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center'
                      }}
                    >
                      <Bell size={14} />
                      {showNotifyForm ? 'Đóng form thông báo' : '📢 Gửi thông báo tới Chủ xe để giải trình'}
                    </button>

                    {showNotifyForm && (
                      <form onSubmit={handleNotifyOwner} style={{ marginTop: 10, background: 'rgba(236,72,153,0.05)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(236,72,153,0.15)' }}>
                        <div style={{ fontSize: 12, color: 'var(--cskh-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                          Nội dung thông báo sẽ được gửi tới chủ xe qua Notification. Người thuê cũng sẽ được thông báo rằng CSKH đã liên hệ chủ xe.
                        </div>
                        <textarea
                          value={notifyOwnerMsg}
                          onChange={e => setNotifyOwnerMsg(e.target.value)}
                          placeholder="VD: Yêu cầu chủ xe cung cấp bằng chứng về tình trạng xe trước khi giao, hình ảnh xe sau khi nhận lại..."
                          style={{
                            width: '100%', background: 'var(--cskh-border-light)', border: '1px solid rgba(236,72,153,0.2)',
                            borderRadius: 8, color: 'var(--cskh-text)', padding: '10px 14px', fontSize: 13,
                            fontFamily: 'inherit', resize: 'vertical', minHeight: 80, outline: 'none', boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button type="submit" className="cskh-btn" disabled={notifyOwnerLoading || !notifyOwnerMsg.trim()}
                            style={{ background: '#ec4899', border: 'none', color: '#fff', fontWeight: 600, flex: 1, justifyContent: 'center' }}>
                            {notifyOwnerLoading ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Bell size={13} />}
                            {notifyOwnerLoading ? 'Đang gửi...' : 'Gửi thông báo chủ xe'}
                          </button>
                          <button type="button" className="cskh-btn cskh-btn-reject" onClick={() => setShowNotifyForm(false)} style={{ flex: '0 0 auto' }}>
                            Hủy
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ── Resolution ──────────────────────────── */}
                {selectedDispute.status === 'resolved' ? (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#10b981' }}>
                    <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Đã giải quyết: {selectedDispute.resolutionDetails?.resolution || selectedDispute.resolution || selectedDispute.verdict}
                  </div>
                ) : (
                  <form onSubmit={handleResolveDispute}>
                    <div style={{ fontSize: 11, color: 'var(--cskh-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Phán quyết của CSKH</div>

                    {/* Verdict type quick-fill */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                      {[
                        { key: 'favor_renter', label: '👤 Ủng hộ người thuê', color: '#3b82f6' },
                        { key: 'favor_owner',  label: '🚗 Ủng hộ chủ xe',    color: '#ec4899' },
                        { key: 'mutual',       label: '🤝 Hai bên thỏa thuận', color: '#10b981' },
                      ].map(v => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => { setVerdictType(v.key); setDisputeVerdict(VERDICT_TEMPLATES[v.key]); }}
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: `1px solid ${verdictType === v.key ? v.color : 'var(--cskh-border)'}`,
                            background: verdictType === v.key ? `${v.color}15` : 'transparent',
                            color: verdictType === v.key ? v.color : 'var(--cskh-text-muted)',
                            fontWeight: 600, fontSize: 11, cursor: 'pointer'
                          }}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={disputeVerdict}
                      onChange={e => setDisputeVerdict(e.target.value)}
                      placeholder="Nhập kết luận xử lý tranh chấp chi tiết hoặc chọn template ở trên..."
                      style={{
                        width: '100%', background: 'var(--cskh-border-light)',
                        border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
                        color: 'var(--cskh-text)', padding: '10px 14px', fontSize: 13,
                        fontFamily: 'inherit', resize: 'vertical', minHeight: 90,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="submit"
                      className="cskh-btn cskh-btn-indigo"
                      disabled={actionLoading || !disputeVerdict.trim()}
                      style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCircle size={14} />
                      {actionLoading ? 'Đang lưu phán quyết...' : 'Xác nhận phán quyết & Đóng tranh chấp'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: REVIEWS
         ════════════════════════════════════════════════════ */}
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
                      <td style={{ maxWidth: 220, fontSize: 12.5, color: 'var(--cskh-text-muted)' }}>
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
                            {r.status === 'hidden' ? <><Eye size={12} /> Hiện</> : <><EyeOff size={12} /> Ẩn</>}
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

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
