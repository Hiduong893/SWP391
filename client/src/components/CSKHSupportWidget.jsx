import React, { useState, useEffect, useRef } from 'react';
import { Headphones, X, Send, PhoneCall, ShieldAlert, FileText, CheckCircle2, MessageSquare, Plus, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export function CSKHSupportWidget({ user, setCurrentTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const messagesEndRef = useRef(null);

  const [hasUnread, setHasUnread] = useState(false);

  // Fetch tickets when opened
  const fetchTickets = async () => {
    if (!user) return;
    try {
      const res = await api.support.getTickets();
      const list = res.tickets || res || [];
      setTickets(list);
      if (list.length > 0 && !activeTicket) {
        setActiveTicket(list[0]);
      }
    } catch (err) {
      console.warn('Failed to load CSKH support tickets:', err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      fetchTickets();
    }
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket, tickets]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung yêu cầu hỗ trợ.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.support.createTicket({ subject, message });
      showToast(res.message || 'Đã gửi yêu cầu hỗ trợ tới ban CSKH 24/7!', 'success');
      setSubject('');
      setMessage('');
      setIsCreatingNew(false);
      await fetchTickets();
    } catch (err) {
      showToast(err.message || 'Lỗi gửi yêu cầu hỗ trợ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeTicket) return;

    const replyMsg = replyInput.trim();
    setReplyInput('');
    setLoading(true);

    try {
      const res = await api.support.createTicket({
        ticketId: activeTicket.id,
        subject: activeTicket.subject || 'Phản hồi hỗ trợ',
        message: replyMsg
      });
      showToast('Đã gửi phản hồi tới CSKH!', 'success');
      await fetchTickets();
    } catch (err) {
      showToast(err.message || 'Lỗi gửi phản hồi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* --- Floating Button (Right next to Chatbot widget) --- */}
      <div style={{ position: 'fixed', bottom: '24px', right: '92px', zIndex: 9998 }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Nhắn tin với Trợ lý CSKH 24/7"
        >
          {isOpen ? <X size={26} /> : <Headphones size={26} />}
          {hasUnread && !isOpen && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #ffffff'
            }} />
          )}
        </button>
      </div>

      {/* --- Support Popover Window --- */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '24px',
            width: '380px',
            height: '520px',
            maxHeight: '80vh',
            borderRadius: '20px',
            background: '#ffffff',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Headphones size={20} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                  Hỗ Trợ CSKH ViVuCar
                </div>
                <div style={{ fontSize: '11px', color: '#99f6e4', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                  Đội ngũ CSKH trực tuyến 24/7
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Headphones size={48} color="#0d9488" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Bạn cần hỗ trợ từ CSKH?
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                  Vui lòng đăng nhập để gửi yêu cầu hỗ trợ hoặc trò chuyện trực tiếp với nhân viên tư vấn ViVuCar.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (setCurrentTab) setCurrentTab('login');
                  }}
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Đăng Nhập Ngay
                </button>
              </div>
            ) : isCreatingNew ? (
              /* Create New Ticket Form */
              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Gửi Yêu Cầu Hỗ Trợ Mới</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Quay lại
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Chủ đề hỗ trợ
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ví dụ: Cần hỗ trợ hủy chuyến, đổi xe, hoàn cọc..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Nội dung chi tiết
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mô tả sự cố hoặc câu hỏi bạn cần CSKH giải đáp..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none'
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={15} />
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Cho CSKH'}
                </button>
              </form>
            ) : (
              /* Ticket List & Live Chat */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569' }}>
                    Danh sách hỗ trợ ({tickets.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(true)}
                    style={{
                      background: '#ccfbf1',
                      color: '#0f766e',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Gửi yêu cầu mới
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <MessageSquare size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Chưa có ticket khiếu nại nào</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Bấm "Gửi yêu cầu mới" để kết nối với CSKH.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {tickets.map((t) => {
                      const isActive = activeTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTicket(t)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: isActive ? '#f0fdf4' : '#ffffff',
                            border: `1px solid ${isActive ? '#86efac' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                              {t.subject || t.message}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              background: t.status === 'resolved' ? '#dcfce7' : t.status === 'replied' ? '#e0e7ff' : '#fef3c7',
                              color: t.status === 'resolved' ? '#15803d' : t.status === 'replied' ? '#4338ca' : '#b45309'
                            }}>
                              {t.status === 'resolved' ? 'Đã xong' : t.status === 'replied' ? 'Đã trả lời' : 'Chờ CSKH'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Conversation Chat View for Active Ticket */}
                {activeTicket && (
                  <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', pb: '6px', marginBottom: '8px' }}>
                      💬 Cuộc trò chuyện: {activeTicket.subject || 'Yêu cầu hỗ trợ'}
                    </div>

                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* User's original message */}
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px 10px 10px 2px', fontSize: '12px', color: '#1e293b' }}>
                        <strong>Bạn:</strong> {activeTicket.message}
                      </div>

                      {/* Multi-turn replies */}
                      {Array.isArray(activeTicket.replies) && activeTicket.replies.map((r, idx) => {
                        const isFromCSKH = r.senderRole === 'cskh' || r.senderRole === 'admin' || r.senderRole === 'staff' || (r.senderId && String(r.senderId) !== String(user.id));
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              background: isFromCSKH ? '#ccfbf1' : '#e0f2fe',
                              color: isFromCSKH ? '#0f766e' : '#0369a1',
                              alignSelf: isFromCSKH ? 'flex-start' : 'flex-end',
                              maxWidth: '90%'
                            }}
                          >
                            <strong>{isFromCSKH ? '🎧 Hỗ trợ viên CSKH ViVuCar' : 'Bạn'}:</strong> {r.message}
                          </div>
                        );
                      })}

                      {/* Legacy single reply string */}
                      {(!activeTicket.replies || activeTicket.replies.length === 0) && activeTicket.reply && (
                        <div style={{ background: '#ccfbf1', padding: '8px 12px', borderRadius: '10px 10px 2px 10px', fontSize: '12px', color: '#0f766e', alignSelf: 'flex-start' }}>
                          <strong>🎧 Hỗ trợ viên CSKH ViVuCar:</strong> {activeTicket.reply}
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Reply Form */}
                    {activeTicket.status !== 'resolved' && (
                      <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="Nhập tin nhắn cho CSKH..."
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                        />
                        <button
                          type="submit"
                          disabled={loading || !replyInput.trim()}
                          style={{
                            background: '#0d9488',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hotline Footer */}
          <div style={{
            background: '#ffffff',
            padding: '10px 16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#64748b'
          }}>
            <span>Hotline khẩn cấp: <strong style={{ color: '#0d9488' }}>1900-VIVU</strong></span>
            <a href="tel:19008488" style={{ color: '#0d9488', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <PhoneCall size={13} /> Gọi ngay
            </a>
          </div>
        </div>
      )}
    </>
  );
}
