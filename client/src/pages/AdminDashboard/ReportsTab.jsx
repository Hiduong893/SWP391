import React, { useState, useEffect, useRef } from 'react';

import {

  MessageSquare, Star, AlertTriangle, Eye, Shield, Brain,

  ShieldAlert, Info, TrendingUp, CheckCircle, Clock, User,

  Headphones, Send, XCircle, Zap, ArrowUpRight, BarChart2,

  ChevronRight, Sparkles, RefreshCw

} from 'lucide-react';

import { api } from '../../utils/api';



const formatMarkdownToHtml = (text) => {

  if (!text) return '';



  // 1. Strip raw heading marks

  let processed = text

    .replace(/###/g, '')

    .replace(/##/g, '')

    .replace(/#/g, '');



  // 2. Parse Markdown Tables

  const lines = processed.split('\n');

  let inTable = false;

  let htmlLines = [];

  let tableRows = [];



  for (let i = 0; i < lines.length; i++) {

    const line = lines[i].trim();



    // Check if line is a table row (starts and ends with |)

    if (line.startsWith('|') && line.endsWith('|')) {

      // Check if it's the separator row e.g., | :--- | :---: |

      if (line.includes(':---') || line.includes('---:') || line.replace(/[|\s-:]/g, '') === '') {

        // Skip separator row

        continue;

      }



      const cells = line.split('|')

        .slice(1, -1) // remove empty first and last cells from split

        .map(cell => cell.trim());



      if (!inTable) {

        inTable = true;

        tableRows.push('<table>');

        tableRows.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');

      } else {

        tableRows.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');

      }

    } else {

      if (inTable) {

        inTable = false;

        tableRows.push('</tbody></table>');

        htmlLines.push(tableRows.join(''));

        tableRows = [];

      }

      htmlLines.push(line);

    }

  }



  if (inTable) {

    tableRows.push('</tbody></table>');

    htmlLines.push(tableRows.join(''));

  }



  // Join lines back

  processed = htmlLines.join('\n');



  // 3. Render bold and bullets

  processed = processed

    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    .replace(/^\s*-\s+(.*?)$/gm, '• $1')

    .replace(/^\s*\*\s+(.*?)$/gm, '• $1')

    .replace(/^\s*•\s+(.*?)$/gm, '• $1')

    .replace(/\*(.*?)\*/g, '$1');



  return processed;

};



export const ReportsTab = ({

  activeSubTab,

  ticketsList = [],

  selectedTicket,

  setSelectedTicket,

  replyText,

  setReplyText,

  handleReplyTicket,

  handleResolveTicket,

  reviewsList = [],

  handleToggleReviewVisibility,

  incidentsList = [],

  setSelectedLicenseImage,

  handleResolveIncident,

  disputesList = [],

  selectedDispute,

  setSelectedDispute,

  disputeVerdict,

  setDisputeVerdict,

  handleResolveDispute,

  actionLoading

}) => {



  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const handleGetAiSuggestion = async () => {
    if (!selectedTicket) return;
    setAiSuggestLoading(true);
    try {
      const data = await api.admin.suggestTicketReply(selectedTicket.id);
      if (data.suggestion) {
        setReplyText(data.suggestion);
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi lấy gợi ý phản hồi AI.');
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const [adminAiMessages, setAdminAiMessages] = useState([
    {
      role: 'model',
      text: 'Xin chào Admin! Tôi là Trợ lý Vận hành và Giám sát AI của ViVuCar. Tôi có thể giúp gì cho việc kiểm duyệt, phân tích số liệu hoặc xử lý sự cố hôm nay?'
    }
  ]);
  const [adminAiInput, setAdminAiInput] = useState('');
  const [adminAiLoading, setAdminAiLoading] = useState(false);
  const [selectedRiskAlert, setSelectedRiskAlert] = useState(null);

  const chatBodyRef = useRef(null);
  const ticketMessagesRef = useRef(null);

  // Auto-scroll AI Assistant Chat Body
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [adminAiMessages, adminAiLoading]);

  // Auto-scroll Support Ticket Messages
  useEffect(() => {
    if (ticketMessagesRef.current) {
      ticketMessagesRef.current.scrollTop = ticketMessagesRef.current.scrollHeight;
    }
  }, [selectedTicket?.replies]);

  const handleSendAdminAiMessage = async (customText) => {
    const text = customText || adminAiInput;
    if (!text.trim()) return;

    if (!customText) setAdminAiInput('');

    const newMsg = { role: 'user', text };
    setAdminAiMessages(prev => [...prev, newMsg]);
    setAdminAiLoading(true);

    try {
      const history = adminAiMessages.map(m => ({
        role: m.role,
        content: m.text
      }));

      const data = await api.admin.queryAIAssistant(text, history);
      const replyMsg = {
        role: 'model',
        text: data.reply || 'Rất tiếc, tôi gặp sự cố kết nối AI. Hãy thử lại.'
      };
      setAdminAiMessages(prev => [...prev, replyMsg]);
    } catch (err) {
      const errMsg = {
        role: 'model',
        text: `Đã xảy ra lỗi: ${err.message || 'Lỗi không xác định.'}`
      };
      setAdminAiMessages(prev => [...prev, errMsg]);
    } finally {
      setAdminAiLoading(false);
    }
  };

  const handleApplyRevenueSuggestion = async (type, desc) => {
    const confirmApply = window.confirm(`Bạn có chắc chắn muốn phê duyệt và áp dụng đề xuất: "${desc}"?`);
    if (!confirmApply) return;

    try {
      const current = await api.system.getConfig();
      let updatedPayload = {
        serviceFeePercent: current.serviceFeePercent,
        insuranceMultiplier: current.insuranceMultiplier,
        systemNotice: current.systemNotice,
        bankId: current.bankId,
        bankName: current.bankName,
        bankAccountNumber: current.bankAccountNumber
      };

      if (type === 'fee_adjustment') {
        updatedPayload.serviceFeePercent = 10;
      } else if (type === 'discount_weekday') {
        updatedPayload.systemNotice = "Khuyến mãi lấp đầy giữa tuần: giảm giá 5% cho các chuyến thuê trên 3 ngày!";
      }

      await api.system.updateConfig(updatedPayload);
      alert('Đã áp dụng đề xuất thành công và cập nhật cấu hình hệ thống!');
    } catch (err) {
      alert(`Lỗi khi áp dụng đề xuất: ${err.message || 'Không xác định'}`);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'open': return { label: 'Đang mở', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={10} /> };
      case 'replied': return { label: 'Đã phản hồi', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <MessageSquare size={10} /> };
      case 'resolved': return { label: 'Hoàn tất', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle size={10} /> };
      default: return { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: null };
    }
  };

  return (

    <div className="tab-pane-content fade-in-animation">



      {/* ============================

          SUB-VIEW 1: SUPPORT TICKETS

      ============================= */}

      {activeSubTab === 'support' && (

        <div className="rt-chat-layout">



          {/* LEFT: Ticket List */}

          <div className="rt-ticket-sidebar glassmorphism">

            <div className="rt-sidebar-header">

              <div className="rt-sidebar-title">

                <Headphones size={16} className="text-teal" />

                <span>Hộp thư hỗ trợ</span>

              </div>

              <span className="rt-ticket-count-badge">{ticketsList.length}</span>

            </div>



            {ticketsList.length === 0 ? (

              <div className="rt-empty-list">

                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 10 }} />

                <p>Chưa có yêu cầu nào</p>

              </div>

            ) : (

              <div className="rt-ticket-list">

                {ticketsList.map((ticket) => {

                  const sc = getStatusConfig(ticket.status);

                  const isActive = selectedTicket?.id === ticket.id;

                  const initials = (ticket.userName || 'U').slice(0, 2).toUpperCase();

                  return (

                    <div

                      key={ticket.id}

                      className={`rt-ticket-row ${isActive ? 'active' : ''}`}

                      onClick={() => setSelectedTicket(ticket)}

                    >

                      <div className="rt-ticket-avatar" style={{ background: isActive ? 'linear-gradient(135deg,#009698,#00bfa5)' : 'linear-gradient(135deg,#334155,#475569)' }}>

                        {initials}

                      </div>

                      <div className="rt-ticket-info">

                        <div className="rt-ticket-name-row">

                          <span className="rt-ticket-name">{ticket.userName || 'Khách hàng'}</span>

                          <span className="rt-ticket-date">{new Date(ticket.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>

                        </div>

                        <div className="rt-ticket-subject">{ticket.subject}</div>

                        <div className="rt-ticket-status-row">

                          <span className="rt-status-chip" style={{ color: sc.color, background: sc.bg }}>

                            {sc.icon}&nbsp;{sc.label}

                          </span>

                          <span className="rt-ticket-role-chip">{ticket.userRole}</span>

                        </div>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </div>



          {/* RIGHT: Chat Window */}

          <div className="rt-chat-window glassmorphism">

            {selectedTicket ? (

              <div className="rt-chat-inner">

                {/* Chat Header */}

                <div className="rt-chat-header">

                  <div className="rt-chat-header-left">

                    <div className="rt-chat-avatar-lg">

                      {(selectedTicket.userName || 'U').slice(0, 2).toUpperCase()}

                    </div>

                    <div>

                      <div className="rt-chat-contact-name">{selectedTicket.userName}</div>

                      <div className="rt-chat-contact-meta">

                        <span className="rt-status-dot-online" />

                        {selectedTicket.userRole} &nbsp;·&nbsp; {selectedTicket.subject}

                      </div>

                    </div>

                  </div>

                  {selectedTicket.status !== 'resolved' && (

                    <button

                      className="rt-resolve-btn"

                      onClick={() => handleResolveTicket(selectedTicket.id)}

                    >

                      <CheckCircle size={13} />

                      Đóng ticket

                    </button>

                  )}

                  {selectedTicket.status === 'resolved' && (

                    <span className="rt-resolved-tag">

                      <CheckCircle size={12} /> Đã giải quyết

                    </span>

                  )}

                </div>



                {/* Messages Body */}

                <div className="rt-messages-body" ref={ticketMessagesRef}>

                  {/* First message from user */}

                  <div className="rt-msg-group rt-msg-received">

                    <div className="rt-msg-avatar-sm">

                      {(selectedTicket.userName || 'U').slice(0, 1).toUpperCase()}

                    </div>

                    <div className="rt-msg-col">

                      <div className="rt-msg-bubble rt-bubble-received">

                        <p>{selectedTicket.message}</p>

                      </div>

                      <span className="rt-msg-time">{new Date(selectedTicket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>

                    </div>

                  </div>



                  {/* Replies */}

                  {selectedTicket.replies?.map((rep, idx) => {

                    const isCSKH = rep.senderRole === 'cskh' || rep.senderRole === 'admin' || rep.sender === 'cskh';

                    const text = rep.message || rep.text;

                    const senderName = isCSKH ? 'CSKH' : (rep.senderName || selectedTicket.userName || 'Hội viên');

                    const time = new Date(rep.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                    return (

                      <div key={idx} className={`rt-msg-group ${isCSKH ? 'rt-msg-sent' : 'rt-msg-received'}`}>

                        {!isCSKH && (

                          <div className="rt-msg-avatar-sm">

                            {senderName.slice(0, 1).toUpperCase()}

                          </div>

                        )}

                        <div className="rt-msg-col">

                          <div className={`rt-msg-bubble ${isCSKH ? 'rt-bubble-sent' : 'rt-bubble-received'}`}>

                            <p>{text}</p>

                          </div>

                          <span className="rt-msg-time" style={{ textAlign: isCSKH ? 'right' : 'left' }}>

                            {senderName} · {time}

                          </span>

                        </div>

                        {isCSKH && (

                          <div className="rt-msg-avatar-sm rt-avatar-cskh">

                            CS

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>



                {/* Input Footer */}

                <div className="rt-chat-footer">

                  {selectedTicket.status !== 'resolved' ? (

                    <form onSubmit={handleReplyTicket} className="rt-reply-form">

                      <input

                        type="text"

                        placeholder="Nhập phản hồi hỗ trợ..."

                        value={replyText}

                        onChange={(e) => setReplyText(e.target.value)}

                        className="rt-reply-input"

                        required

                      />

                      <button

                        type="button"

                        className="rt-ai-suggest-btn"

                        onClick={handleGetAiSuggestion}

                        disabled={aiSuggestLoading || actionLoading}

                        title="Trợ lý AI gợi ý phản hồi"

                      >

                        <Sparkles size={15} className={aiSuggestLoading ? 'rt-animate-spin' : ''} />

                      </button>

                      <button type="submit" className="rt-send-btn" disabled={actionLoading || aiSuggestLoading}>

                        <Send size={15} />

                      </button>

                    </form>

                  ) : (

                    <div className="rt-resolved-footer">

                      <CheckCircle size={14} style={{ color: '#10b981' }} />

                      <span>Ticket này đã được xử lý xong và đóng lại.</span>

                    </div>

                  )}

                </div>

              </div>

            ) : (

              <div className="rt-no-selection">

                <div className="rt-no-selection-icon">

                  <MessageSquare size={28} />

                </div>

                <h4>Chọn yêu cầu hỗ trợ</h4>

                <p>Chọn một ticket từ danh sách bên trái để xem nội dung và phản hồi trực tuyến.</p>

              </div>

            )}

          </div>

        </div>

      )}



      {/* ============================

          SUB-VIEW 2: REVIEWS

      ============================= */}

      {activeSubTab === 'reviews' && (

        <div className="data-table-panel glassmorphism">

          <div className="panel-header">

            <h4 className="panel-title">Đánh giá & Bình luận từ khách hàng</h4>

          </div>

          {reviewsList.length === 0 ? (

            <div className="rt-empty-state-full">

              <Star size={40} style={{ color: '#fbbf24', opacity: 0.4 }} />

              <h5>Chưa có đánh giá nào!</h5>

              <p>Các đánh giá từ khách thuê sẽ xuất hiện ở đây</p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="custom-dashboard-table">

                <thead>

                  <tr>

                    <th>Khách hàng</th>

                    <th>Nội dung nhận xét</th>

                    <th>Đánh giá</th>

                    <th>Ngày viết</th>

                    <th>Trạng thái</th>

                    <th style={{ textAlign: 'center' }}>Thao tác</th>

                  </tr>

                </thead>

                <tbody>

                  {reviewsList.map((rev) => (

                    <tr key={rev.id}>

                      <td className="font-bold">{rev.userName}</td>

                      <td className="italic-cell">"{rev.comment}"</td>

                      <td>

                        <div className="rt-stars-row">

                          {[...Array(5)].map((_, i) => (

                            <Star key={i} size={12} fill={i < rev.rating ? '#fbbf24' : 'none'} color={i < rev.rating ? '#fbbf24' : '#475569'} />

                          ))}

                          <span style={{ fontSize: 12, marginLeft: 4, color: '#fbbf24', fontWeight: 700 }}>{rev.rating}.0</span>

                        </div>

                      </td>

                      <td className="text-secondary-cell">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</td>

                      <td>

                        <span className={`status-badge-mini ${rev.status === 'visible' ? 'open' : 'resolved'}`}>

                          {rev.status === 'visible' ? 'Hiển thị' : 'Đã ẩn'}

                        </span>

                      </td>

                      <td>

                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>

                          {rev.status === 'visible' ? (

                            <button className="btn-approve btn-danger" onClick={() => handleToggleReviewVisibility(rev.id, true)} disabled={actionLoading}>✕ Ẩn đi</button>

                          ) : (

                            <button className="btn-approve btn-success" onClick={() => handleToggleReviewVisibility(rev.id, false)} disabled={actionLoading}>✓ Hiện lại</button>

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



      {/* ============================

          SUB-VIEW 3: INCIDENTS

      ============================= */}

      {activeSubTab === 'incidents' && (

        <div className="data-table-panel glassmorphism">

          <div className="panel-header">

            <h4 className="panel-title">Khai báo sự cố va chạm, hỏng hóc khẩn cấp</h4>

          </div>

          {incidentsList.length === 0 ? (

            <div className="rt-empty-state-full">

              <AlertTriangle size={40} style={{ color: '#10b981', opacity: 0.5 }} />

              <h5>Không ghi nhận sự cố!</h5>

              <p>Không có sự cố khẩn cấp nào được báo cáo từ hành trình.</p>

            </div>

          ) : (

            <div className="table-responsive">

              <table className="custom-dashboard-table">

                <thead>

                  <tr>

                    <th>Người thuê</th>

                    <th>Phương tiện</th>

                    <th>Mô tả sự cố</th>

                    <th>Ảnh hiện trường</th>

                    <th>Trạng thái</th>

                    <th style={{ textAlign: 'center' }}>Thao tác</th>

                  </tr>

                </thead>

                <tbody>

                  {incidentsList.map((inc) => (

                    <tr key={inc.bookingId}>

                      <td>

                        <strong>{inc.userName}</strong>

                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'block' }}>{inc.userEmail}</span>

                      </td>

                      <td className="font-bold">{inc.carName}</td>

                      <td className="text-red font-bold">{inc.incident.description}</td>

                      <td>

                        {inc.incident.image ? (

                          <button className="action-btn text-teal btn-sm" onClick={() => setSelectedLicenseImage(inc.incident.image)}>

                            <Eye size={12} style={{ marginRight: 4 }} /> Xem ảnh

                          </button>

                        ) : <span className="text-muted small">Không có ảnh</span>}

                      </td>

                      <td>

                        <span className={`kyc-status-label ${inc.incident.status === 'resolved' ? 'verified' : 'pending'}`}>

                          {inc.incident.status === 'resolved' ? 'Đã xử lý' : 'Đang xử lý'}

                        </span>

                      </td>

                      <td>

                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>

                          {inc.incident.status !== 'resolved' ? (

                            <button className="btn-approve btn-success" onClick={() => handleResolveIncident(inc.bookingId)} disabled={actionLoading}>

                              ✓ Giải quyết xong

                            </button>

                          ) : (

                            <span className="text-green font-bold small">Đã hỗ trợ xong</span>

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



      {/* ============================

          SUB-VIEW 4: DISPUTES

      ============================= */}

      {activeSubTab === 'disputes' && (

        <div className="rt-chat-layout">

          <div className="rt-ticket-sidebar glassmorphism">

            <div className="rt-sidebar-header">

              <div className="rt-sidebar-title">

                <Shield size={16} style={{ color: '#f59e0b' }} />

                <span>Đơn khiếu nại</span>

              </div>

              <span className="rt-ticket-count-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>

                {disputesList.length}

              </span>

            </div>



            {disputesList.length === 0 ? (

              <div className="rt-empty-list">

                <Shield size={32} style={{ opacity: 0.3, marginBottom: 10 }} />

                <p>Không có khiếu nại nào</p>

              </div>

            ) : (

              <div className="rt-ticket-list">

                {disputesList.map((d) => {

                  const isActive = selectedDispute?.id === d.id;

                  return (

                    <div

                      key={d.id}

                      className={`rt-ticket-row ${isActive ? 'active' : ''}`}

                      onClick={() => setSelectedDispute(d)}

                    >

                      <div className="rt-ticket-avatar" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>

                        ⚖️

                      </div>

                      <div className="rt-ticket-info">

                        <div className="rt-ticket-name-row">

                          <span className="rt-ticket-name">{d.renterName}</span>

                          <span className={`rt-status-chip`} style={{ color: d.status === 'open' ? '#f59e0b' : '#10b981', background: d.status === 'open' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}>

                            {d.status === 'open' ? 'Chờ' : 'Xong'}

                          </span>

                        </div>

                        <div className="rt-ticket-subject" style={{ fontSize: 11.5 }}>{d.description?.slice(0, 60)}{d.description?.length > 60 ? '...' : ''}</div>

                        <div className="rt-ticket-status-row">

                          <span style={{ fontSize: 10.5, color: 'var(--admin-text-muted)' }}>Chủ xe: {d.ownerName}</span>

                        </div>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </div>



          <div className="rt-chat-window glassmorphism">

            {selectedDispute ? (

              <div className="rt-chat-inner">

                <div className="rt-chat-header">

                  <div className="rt-chat-header-left">

                    <div className="rt-chat-avatar-lg" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', fontSize: 22 }}>⚖️</div>

                    <div>

                      <div className="rt-chat-contact-name">Hồ sơ tranh chấp tiền cọc</div>

                      <div className="rt-chat-contact-meta">

                        Nguyên đơn: <strong>{selectedDispute.renterName}</strong> &nbsp;·&nbsp; Bị đơn: <strong>{selectedDispute.ownerName}</strong>

                      </div>

                    </div>

                  </div>

                </div>



                <div className="rt-messages-body" style={{ padding: 24, gap: 16 }}>

                  <div className="rt-dispute-evidence">

                    <div className="rt-evidence-tag danger">

                      <XCircle size={12} /> LÝ DO KHIẾU NẠI CỦA KHÁCH THUÊ

                    </div>

                    <p className="rt-evidence-text">{selectedDispute.description}</p>

                  </div>



                  {selectedDispute.status === 'resolved' && (

                    <div className="rt-dispute-evidence resolved">

                      <div className="rt-evidence-tag success">

                        <CheckCircle size={12} /> PHÁN QUYẾT ĐỘC LẬP TỪ CSKH

                      </div>

                      <p className="rt-evidence-text italic">"{selectedDispute.resolutionDetails}"</p>

                    </div>

                  )}

                </div>



                <div className="rt-chat-footer">

                  {selectedDispute.status === 'open' ? (

                    <form onSubmit={handleResolveDispute} className="rt-verdict-form">

                      <textarea

                        placeholder="Nhập phán quyết trọng tài (vd: Hoàn cọc 100% cho renter do xe bị lỗi kỹ thuật...)"

                        value={disputeVerdict}

                        onChange={(e) => setDisputeVerdict(e.target.value)}

                        className="rt-verdict-textarea"

                        rows="3"

                        required

                      />

                      <button type="submit" className="rt-verdict-submit-btn" disabled={actionLoading}>

                        <Shield size={13} /> Ban hành phán quyết

                      </button>

                    </form>

                  ) : (

                    <div className="rt-resolved-footer">

                      <CheckCircle size={14} style={{ color: '#10b981' }} />

                      <span>Trọng tài đã giải quyết thành công.</span>

                    </div>

                  )}

                </div>

              </div>

            ) : (

              <div className="rt-no-selection">

                <div className="rt-no-selection-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>

                  <Shield size={28} />

                </div>

                <h4>Chọn hồ sơ khiếu nại</h4>

                <p>Chọn một vụ việc tranh chấp tiền cọc để xem chi tiết và ban hành phán quyết.</p>

              </div>

            )}

          </div>

        </div>

      )}



      {/* ============================

          SUB-VIEW 5: AI ALERTS

      ============================= */}

      {activeSubTab === 'ai_alerts' && (
        <div className="rt-ai-grid">
          {/* LEFT: AI Chatbot Panel */}
          <div className="rt-admin-ai-chat-panel glassmorphism">
            <div className="rt-admin-ai-chat-header">
              <div className="rt-admin-ai-chat-header-title">
                <Brain size={18} className="text-teal" />
                <div>
                  <h4>Trợ lý Vận hành & Giám sát AI</h4>
                  <p>Hệ thống tự động phân tích và xử lý ngôn ngữ tự nhiên</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử cuộc trò chuyện với AI?")) {
                      setAdminAiMessages([
                        {
                          role: 'model',
                          text: 'Xin chào Admin! Tôi là Trợ lý Vận hành và Giám sát AI của ViVuCar. Tôi có thể giúp gì cho việc kiểm duyệt, phân tích số liệu hoặc xử lý sự cố hôm nay?'
                        }
                      ]);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--admin-border-color)',
                    color: 'var(--admin-text-muted)',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#00bfa5';
                    e.target.style.color = '#00bfa5';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = 'var(--admin-border-color)';
                    e.target.style.color = 'var(--admin-text-muted)';
                  }}
                >
                  Xóa lịch sử
                </button>
                <span className="rt-live-badge">
                  <span className="rt-live-dot" /> HOẠT ĐỘNG
                </span>
              </div>
            </div>

            <div className="rt-admin-ai-chat-body" ref={chatBodyRef}>
              {adminAiMessages.map((msg, index) => (
                <div key={index} className={`rt-admin-ai-msg ${msg.role}`}>
                  <div
                    className="rt-admin-ai-msg-bubble"
                    dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(msg.text) }}
                  />
                </div>
              ))}
              {adminAiLoading && (
                <div className="rt-admin-ai-msg model">
                  <div className="rt-admin-ai-msg-bubble">
                    <span className="rt-animate-spin" style={{ display: 'inline-block', marginRight: 8 }}>⏳</span>
                    AI đang phân tích dữ liệu hệ thống...
                  </div>
                </div>
              )}
            </div>

            <div className="rt-admin-ai-quick-prompts">
              <div
                className="rt-admin-ai-quick-chip"
                onClick={() => handleSendAdminAiMessage("Báo cáo số liệu doanh thu và hiệu suất")}
              >
                📊 Xem báo cáo chung
              </div>
              <div
                className="rt-admin-ai-quick-chip"
                onClick={() => handleSendAdminAiMessage("Có sự cố va chạm khẩn cấp nào mới không?")}
              >
                ⚠️ Tìm sự cố va chạm
              </div>
              <div
                className="rt-admin-ai-quick-chip"
                onClick={() => handleSendAdminAiMessage("Kiểm tra danh sách hồ sơ xe hoặc KYC bằng lái đang chờ duyệt")}
              >
                🚗 Phê duyệt KYC/Xe
              </div>
              <div
                className="rt-admin-ai-quick-chip"
                onClick={() => handleSendAdminAiMessage("Có tranh chấp khiếu nại tiền cọc nào cần giải quyết không?")}
              >
                ⚖️ Tranh chấp cọc
              </div>
              <div
                className="rt-admin-ai-quick-chip"
                onClick={() => handleSendAdminAiMessage("Đề xuất cải thiện doanh thu và tối ưu hóa hệ thống")}
              >
                💡 Đề xuất doanh thu
              </div>
            </div>

            <div className="rt-admin-ai-chat-footer">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAdminAiMessage();
                }}
                className="rt-admin-ai-chat-form"
              >
                <input
                  type="text"
                  placeholder="Hỏi AI về doanh thu, sự cố, KYC..."
                  value={adminAiInput}
                  onChange={(e) => setAdminAiInput(e.target.value)}
                  className="rt-admin-ai-chat-input"
                  disabled={adminAiLoading}
                />
                <button
                  type="submit"
                  className="rt-send-btn"
                  disabled={adminAiLoading || !adminAiInput.trim()}
                  style={{ marginRight: 4 }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Alerts & Suggestions Vertical Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* AI Risk Alerts*/}
            <div className="rt-ai-panel glassmorphism">
              <div className="rt-ai-panel-header">
                <div className="rt-ai-panel-title">
                  <div className="rt-ai-icon-box">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--admin-text-primary)' }}>Cảnh báo rủi ro & Gian lận</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>Powered by AI Detection Engine</div>
                  </div>
                </div>
                <span className="rt-live-badge">
                  <span className="rt-live-dot" /> LIVE
                </span>
              </div>

              <div className="rt-alerts-list">
                {/* Alert 1 - High */}
                <div className="rt-alert-card danger">
                  <div className="rt-alert-icon-col danger">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="rt-alert-body">
                    <div className="rt-alert-top-row">
                      <strong>Trùng lặp CCCD bất thường</strong>
                      <span className="rt-risk-badge danger">● Rủi ro Cao</span>
                    </div>
                    <p className="rt-alert-desc">
                      Phát hiện hình ảnh CCCD trên tài khoản mới trùng khớp với CCCD của tài khoản đã bị đình chỉ trước đó lúc 02:45 AM. Giao dịch đã bị chặn tự động.
                    </p>
                    <div className="rt-alert-footer">
                      <span className="rt-alert-time">Vừa phát hiện · 02:45 AM</span>
                      <button
                        className="rt-alert-action-btn danger"
                        onClick={() => setSelectedRiskAlert({
                          code: 'Risk-20491',
                          title: 'Trùng lặp CCCD bất thường',
                          severity: 'Cao',
                          time: 'Vừa phát hiện · 02:45 AM',
                          user: 'Nguyễn Văn H. (nguyenvanh99@gmail.com)',
                          details: 'Phát hiện hình ảnh CCCD được tải lên trên tài khoản mới có số sê-ri và họ tên trùng khớp hoàn toàn với một tài khoản CCCD đã bị hệ thống chặn/đình chỉ vĩnh viễn trước đó (nguyenvanh88@gmail.com). Tài khoản gốc bị cấm do có hành vi quẹt thẻ ảo thanh toán gian lận lợi dụng ví điện tử.',
                          recommendation: 'Từ chối duyệt xác minh bằng lái của tài khoản mới này ngay lập tức. Giữ nguyên trạng thái khóa/đình chỉ đối với các tài khoản liên kết.'
                        })}
                      >
                        Xem chi tiết <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert 2 - Medium */}
                <div className="rt-alert-card warning">
                  <div className="rt-alert-icon-col warning">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="rt-alert-body">
                    <div className="rt-alert-top-row">
                      <strong>Giao dịch đêm rủi ro</strong>
                      <span className="rt-risk-badge warning">● Rủi ro Trung bình</span>
                    </div>
                    <p className="rt-alert-desc">
                      Hội viên mới đăng ký thực hiện đặt cọc xe điện hạng sang VinFast VF9 mà không xác minh lịch sử bằng lái trước đó. Hệ thống đã phát cảnh báo đỏ và yêu cầu cọc tiền mặt bổ sung.
                    </p>
                    <div className="rt-alert-footer">
                      <span className="rt-alert-time">3 giờ trước</span>
                      <button
                        className="rt-alert-action-btn warning"
                        onClick={() => setSelectedRiskAlert({
                          code: 'Risk-19385',
                          title: 'Giao dịch đêm rủi ro',
                          severity: 'Trung bình',
                          time: '3 giờ trước',
                          user: 'Trần Minh K. (minhkhoa@outlook.com)',
                          details: 'Hội viên mới đăng ký thực hiện đặt cọc xe điện hạng sang VinFast VF9 (BKS: 43A-938.12) trị giá trị lớn (8.500.000đ) vào khung giờ muộn (01:15 AM) mà chưa có bất kỳ lịch sử duyệt xác minh bằng lái xe nào trước đó trên hệ thống. Dữ liệu phòng ngừa rủi ro của AI cảnh báo mối đe dọa cao về va chạm hoặc lừa đảo xe.',
                          recommendation: 'Yêu cầu nhân viên CSKH trực tiếp gọi điện thoại xác nhận lộ trình chuyến đi, kiểm tra hình ảnh GPLX gốc của khách hoặc yêu cầu nâng mức ký quỹ tiền mặt bảo đảm bổ sung lên 10.000.000 VND trước khi bàn giao xe.'
                        })}
                      >
                        Xem chi tiết <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert 3 - Low */}
                <div className="rt-alert-card info">
                  <div className="rt-alert-icon-col info">
                    <Info size={16} />
                  </div>
                  <div className="rt-alert-body">
                    <div className="rt-alert-top-row">
                      <strong>Khoảng cách giao xe bất thường</strong>
                      <span className="rt-risk-badge info">● Rủi ro Thấp</span>
                    </div>
                    <p className="rt-alert-desc">
                      Khoảng cách từ vị trí GPS định vị của khách đến điểm nhận xe vượt quá 150km. Phát đi cảnh báo nhắc nhở chủ xe gọi điện xác nhận lộ trình.
                    </p>
                    <div className="rt-alert-footer">
                      <span className="rt-alert-time">5 giờ trước</span>
                      <button
                        className="rt-alert-action-btn info"
                        onClick={() => setSelectedRiskAlert({
                          code: 'Risk-10492',
                          title: 'Khoảng cách giao xe bất thường',
                          severity: 'Thấp',
                          time: '5 giờ trước',
                          user: 'Lê Thị Thu T. (thuthao.le@gmail.com)',
                          details: 'Hệ thống định vị GPS phát hiện khoảng cách giữa vị trí thực tế của khách hàng (Hà Nội) và điểm nhận phương tiện đã chọn (TP. Hồ Chí Minh) vượt quá 1.150km. Tỷ lệ đặt nhầm vị trí chiếm 76% trong các trường hợp tương tự.',
                          recommendation: 'Phát cảnh báo thông báo nhắc nhở chủ xe liên hệ trực tiếp để xác nhận chuyến bay/lộ trình nhận xe của khách để tránh việc hủy chuyến đột xuất gây lãng phí thời gian của chủ xe.'
                        })}
                      >
                        Xem chi tiết <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Revenue Suggestions (UC38) */}
            <div className="rt-ai-panel glassmorphism">
              <div className="rt-ai-panel-header">
                <div className="rt-ai-panel-title">
                  <div className="rt-ai-icon-box" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--admin-text-primary)' }}>Đề xuất cải thiện doanh thu</div>
                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>AI Revenue Optimizer</div>
                  </div>
                </div>
                <div className="rt-ai-accuracy">
                  <BarChart2 size={12} /> 94% độ chính xác
                </div>
              </div>

              <div className="rt-suggestions-list">
                <div className="rt-suggestion-card">
                  <div className="rt-suggestion-top">
                    <div className="rt-suggestion-icon" style={{ background: 'rgba(0,191,165,0.1)', color: '#00bfa5' }}>
                      <TrendingUp size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--admin-text-primary)' }}>Tối ưu giá thuê cuối tuần</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Phân tích từ dữ liệu 30 ngày qua</div>
                    </div>
                    <span className="rt-profit-chip">
                      <ArrowUpRight size={11} /> +12% Doanh thu
                    </span>
                  </div>
                  <p className="rt-suggestion-desc">
                    Nhu cầu du lịch cuối tuần tăng mạnh tại khu vực Đà Nẵng. Đề xuất tăng giá trần thuê xe 10% đối với các dòng xe Sedan trong khoảng thời gian từ thứ Sáu đến Chủ Nhật.
                  </p>
                  <button
                    className="rt-apply-btn"
                    onClick={() => handleApplyRevenueSuggestion('fee_adjustment', 'Tối ưu giá thuê cuối tuần')}
                  >
                    Áp dụng đề xuất →
                  </button>
                </div>

                <div className="rt-suggestion-card">
                  <div className="rt-suggestion-top">
                    <div className="rt-suggestion-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                      <Zap size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--admin-text-primary)' }}>Kích cầu ngày thấp điểm (Thứ 2 - Thứ 4)</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Dựa trên tỷ lệ xe nhàn rỗi 3 tuần qua</div>
                    </div>
                    <span className="rt-profit-chip" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                      <ArrowUpRight size={11} /> +8% Lấp đầy
                    </span>
                  </div>
                  <p className="rt-suggestion-desc">
                    Tỷ lệ xe nhàn rỗi tăng cao vào giữa tuần. Đề xuất áp dụng chương trình giảm giá tự động 5% cho khách hàng thuê từ 3 ngày trở lên bắt đầu từ thứ Hai.
                  </p>
                  <button
                    className="rt-apply-btn"
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                    onClick={() => handleApplyRevenueSuggestion('discount_weekday', 'Kích cầu ngày thấp điểm (Thứ 2 - Thứ 4)')}
                  >
                    Áp dụng đề xuất →
                  </button>
                </div>

                <div className="rt-suggestion-card">
                  <div className="rt-suggestion-top">
                    <div className="rt-suggestion-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                      <Star size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--admin-text-primary)' }}>Chương trình khách hàng thân thiết</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Phân tích churn rate 60 ngày</div>
                    </div>
                    <span className="rt-profit-chip" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                      <ArrowUpRight size={11} /> +5% Giữ chân
                    </span>
                  </div>
                  <p className="rt-suggestion-desc">
                    Khách hàng quay lại thuê lần 2+ giảm 18% trong tháng này. Đề xuất triển khai chương trình tích điểm thưởng và ưu đãi dành riêng cho khách thuê thường xuyên.
                  </p>
                  <button
                    className="rt-apply-btn"
                    style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                    onClick={() => handleApplyRevenueSuggestion('loyalty_program', 'Chương trình khách hàng thân thiết')}
                  >
                    Áp dụng đề xuất →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XEM CHI TIẾT CẢNH BÁO RỦI RO (UC36) --- */}
      {selectedRiskAlert && (
        <div className="kyc-lightbox-overlay" onClick={() => setSelectedRiskAlert(null)}>
          <div className="kyc-lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="kyc-lightbox-header" style={{ borderBottom: '1px solid var(--admin-border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={16} style={{ color: selectedRiskAlert.severity === 'Cao' ? '#f43f5e' : (selectedRiskAlert.severity === 'Trung bình' ? '#f59e0b' : '#3b82f6') }} />
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>Chi tiết cảnh báo: {selectedRiskAlert.title}</h4>
              </div>
              <button
                onClick={() => setSelectedRiskAlert(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="kyc-lightbox-body" style={{ background: 'var(--admin-bg-secondary)', padding: '20px', color: 'var(--admin-text-primary)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '12px', fontSize: '13px' }}>
                <strong style={{ color: 'var(--admin-text-muted)' }}>Mã cảnh báo:</strong>
                <span>{selectedRiskAlert.code}</span>

                <strong style={{ color: 'var(--admin-text-muted)' }}>Mức độ rủi ro:</strong>
                <span style={{ fontWeight: 700, color: selectedRiskAlert.severity === 'Cao' ? '#f43f5e' : (selectedRiskAlert.severity === 'Trung bình' ? '#f59e0b' : '#3b82f6') }}>
                  {selectedRiskAlert.severity}
                </span>

                <strong style={{ color: 'var(--admin-text-muted)' }}>Thời gian:</strong>
                <span>{selectedRiskAlert.time}</span>

                <strong style={{ color: 'var(--admin-text-muted)' }}>Đối tượng:</strong>
                <span>{selectedRiskAlert.user}</span>

                <strong style={{ color: 'var(--admin-text-muted)' }}>Chi tiết kỹ thuật:</strong>
                <span style={{ lineHeight: 1.5 }}>{selectedRiskAlert.details}</span>

                <strong style={{ color: 'var(--admin-text-muted)' }}>AI Khuyến nghị:</strong>
                <span style={{ color: '#00bfa5', fontWeight: 600, lineHeight: 1.4 }}>{selectedRiskAlert.recommendation}</span>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => setSelectedRiskAlert(null)}
                  className="rt-apply-btn"
                  style={{ borderColor: 'var(--admin-border-color)', color: 'var(--admin-text-secondary)' }}
                >
                  Đóng lại
                </button>
                <button
                  onClick={() => {
                    alert(`Đã kích hoạt hành động xử lý khẩn cấp cho sự cố: ${selectedRiskAlert.code}`);
                    setSelectedRiskAlert(null);
                  }}
                  className="rt-apply-btn"
                  style={{ background: 'linear-gradient(135deg, #009698, #00bfa5)', color: 'white', border: 'none' }}
                >
                  Kích hoạt xử lý
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );

};

