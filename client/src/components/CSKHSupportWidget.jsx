import React, { useState, useEffect, useRef } from 'react';
import { Headphones, X, Send, User, MessageSquare, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export function CSKHSupportWidget({ user, setCurrentTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const chatEndRef = useRef(null);

  const fetchMyTickets = async () => {
    if (!user) return;
    try {
      const data = await api.support.getMyTickets();
      setTickets(data || []);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (e) {
      console.warn("Lỗi tải ticket CSKH.");
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchMyTickets();
      const interval = setInterval(fetchMyTickets, 8000);
      return () => clearInterval(interval);
    }
  }, [user, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.replies]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Vui lòng nhập tiêu đề và nội dung cần hỗ trợ.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.support.createTicket(subject, message);
      showToast(data.message || 'Đã gửi yêu cầu hỗ trợ tới CSKH!', 'success');
      setSubject('');
      setMessage('');
      setIsCreating(false);
      await fetchMyTickets();
      if (data.ticket) setSelectedTicket(data.ticket);
    } catch (err) {
      showToast(err.message || 'Lỗi gửi yêu cầu hỗ trợ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const data = await api.support.replyTicket(selectedTicket.id, replyText);
      setSelectedTicket(data.ticket);
      setReplyText('');
      showToast('Đã gửi tin nhắn tới CSKH!', 'success');
      fetchMyTickets();
    } catch (err) {
      showToast(err.message || 'Lỗi gửi tin nhắn.', 'error');
    }
  };

  const unreadCSKHCount = tickets.filter(t => {
    if (!t.replies || t.replies.length === 0) return false;
    const last = t.replies[t.replies.length - 1];
    return (last.senderRole === 'cskh' || last.senderRole === 'admin') && t.status !== 'resolved';
  }).length;

  return (
    <>
      <style>{`
        .cskh-widget-container {
          position: fixed;
          bottom: 24px;
          right: 92px;
          z-index: 1050;
        }

        .cskh-toggle-btn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
          color: #ffffff;
          border: none;
          box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .cskh-toggle-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 28px rgba(13, 148, 136, 0.5);
        }

        .cskh-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: pulse 1.5s infinite;
        }

        .cskh-panel {
          position: absolute;
          bottom: 68px;
          right: 0;
          width: 380px;
          height: 520px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: cskhUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cskhUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cskh-panel-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        @media (max-width: 480px) {
          .cskh-widget-container {
            bottom: 16px;
            right: 80px;
          }
          .cskh-panel {
            width: calc(100vw - 32px);
            height: 480px;
            right: -64px;
          }
        }
      `}</style>

      <div className="cskh-widget-container">
        {/* Toggle Button */}
        <button
          className="cskh-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Đóng Chat CSKH" : "Nhắn tin trực tiếp với CSKH"}
        >
          {isOpen ? <X size={22} /> : <Headphones size={24} />}
          {unreadCSKHCount > 0 && !isOpen && (
            <span className="cskh-badge">{unreadCSKHCount}</span>
          )}
        </button>

        {/* Panel Container */}
        {isOpen && (
          <div className="cskh-panel">
            {/* Header */}
            <div className="cskh-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'rgba(13, 148, 136, 0.2)', border: '1px solid rgba(13, 148, 136, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf'
                }}>
                  <Headphones size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>CSKH ViVuCar (Live)</h4>
                  <span style={{ fontSize: '10.5px', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                    Staff Online 24/7
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            {!user ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1, justifyContent: 'center' }}>
                <User size={40} color="#94a3b8" />
                <h5 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Bạn chưa đăng nhập</h5>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                  Vui lòng đăng nhập tài khoản để chat trực tiếp và gửi yêu cầu hỗ trợ tới Nhân viên CSKH.
                </p>
              </div>
            ) : selectedTicket ? (
              /* --- VIEW 1: CHAT 1-1 WITH CSKH --- */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                {/* Ticket Top Banner */}
                <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ← Tất cả yêu cầu
                  </button>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                    #{selectedTicket.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa' }}>
                  <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0', marginBottom: 4 }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: 2 }}>{selectedTicket.subject}</strong>
                    <span>{selectedTicket.message}</span>
                  </div>

                  {selectedTicket.replies?.map((rep, idx) => {
                    const isCSKH = rep.senderRole === 'cskh' || rep.senderRole === 'admin' || rep.sender === 'cskh';
                    const text = rep.message || rep.text;
                    const senderName = isCSKH ? (rep.senderName || 'Hỗ trợ CSKH') : 'Bạn';
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isCSKH ? 'flex-start' : 'flex-end',
                          background: isCSKH ? '#ffffff' : 'rgba(13, 148, 136, 0.12)',
                          border: isCSKH ? '1px solid #e2e8f0' : '1px solid rgba(13, 148, 136, 0.25)',
                          padding: '10px 12px',
                          borderRadius: isCSKH ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                          maxWidth: '85%',
                          textAlign: 'left',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', lineHeight: 1.4 }}>{text}</p>
                        <span style={{ fontSize: '9.5px', color: isCSKH ? '#64748b' : '#0d9488', display: 'block', marginTop: 4, fontWeight: 600 }}>
                          {senderName} • {new Date(rep.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input area */}
                {selectedTicket.status !== 'resolved' ? (
                  <form onSubmit={handleReplySubmit} style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, background: '#ffffff' }}>
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn cho CSKH..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', outline: 'none', background: '#f8fafc' }}
                    />
                    <button type="submit" style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: '20px', padding: '0 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Send size={13} />
                    </button>
                  </form>
                ) : (
                  <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#64748b', background: '#f1f5f9' }}>
                    Hội thoại này đã hoàn tất
                  </div>
                )}
              </div>
            ) : isCreating ? (
              /* --- VIEW 2: CREATE NEW SUPPORT TICKET FORM --- */
              <form onSubmit={handleCreateTicket} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Tạo Yêu Cầu Hỗ Trợ Mới</h5>
                  <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Quay lại</button>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Vấn đề cần hỗ trợ:</label>
                  <input
                    type="text"
                    placeholder="VD: Cần hỗ trợ hủy chuyến, thắc mắc cọc..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nội dung tin nhắn:</label>
                  <textarea
                    rows={5}
                    placeholder="Mô tả chi tiết câu hỏi hoặc vấn đề của bạn..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc', flex: 1, resize: 'none', boxSizing: 'border-box' }}
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                  <button type="submit" disabled={loading} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? 'Đang gửi...' : 'Gửi tới CSKH ➔'}
                  </button>
                </div>
              </form>
            ) : (
              /* --- VIEW 3: TICKETS LIST --- */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Yêu cầu hỗ trợ của bạn ({tickets.length})
                  </span>
                  <button
                    onClick={() => setIsCreating(true)}
                    style={{ background: '#0d9488', color: '#ffffff', border: 'none', borderRadius: '16px', padding: '5px 12px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={14} /> Gửi yêu cầu mới
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                    <MessageSquare size={36} color="#cbd5e1" />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Bạn chưa có cuộc trò chuyện nào với CSKH.</span>
                    <button
                      onClick={() => setIsCreating(true)}
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 18px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Bắt đầu nhắn với CSKH
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(t => {
                      const isResolved = t.status === 'resolved';
                      const lastReply = t.replies && t.replies.length > 0 ? t.replies[t.replies.length - 1] : null;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          style={{
                            padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0',
                            background: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0d9488'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{t.subject}</strong>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                              background: isResolved ? '#dcfce7' : '#fef9c3',
                              color: isResolved ? '#166534' : '#854d0e'
                            }}>
                              {isResolved ? 'Hoàn tất' : 'Đang xử lý'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lastReply ? lastReply.message || lastReply.text : t.message}
                          </p>
                          <span style={{ fontSize: '9.5px', color: '#94a3b8', display: 'block', marginTop: 6 }}>
                            {new Date(t.createdAt).toLocaleDateString('vi-VN')} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
