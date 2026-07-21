import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Eye, EyeOff, RefreshCw, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export const SimulatedInbox = ({ onNavigateToLink, triggerReload }) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.emails.getEmails();
      setEmails(data);
      if (!silent) {
        // Automatically mark all as read
        await api.emails.markRead();
      }
    } catch (error) {
      console.error('Error fetching simulated emails:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll for new emails silently every 3 seconds to keep inbox updated!
  useEffect(() => {
    fetchEmails(true);
    const interval = setInterval(() => {
      fetchEmails(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch emails manually when triggerReload changes
  useEffect(() => {
    if (triggerReload) {
      fetchEmails();
    }
  }, [triggerReload]);

  const handleClearAll = async () => {
    try {
      await api.emails.clearAll();
      setEmails([]);
      setSelectedEmail(null);
      showToast('Đã xóa sạch hòm thư ảo!', 'success');
    } catch (error) {
      showToast('Không thể xóa hòm thư.', 'error');
    }
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email === selectedEmail ? null : email);
  };

  const handleBodyLinkClick = (e) => {
    // Intercept clicks on links inside the email body to navigate within the React App!
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href) {
        onNavigateToLink(href);
        setSelectedEmail(null);
      }
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="inbox-card">
      <div className="inbox-header">
        <div className="inbox-title">
          <Mail className="inbox-icon" size={20} />
          <span>HỘP THƯ MÔ PHỎNG</span>
          {emails.length > 0 && <span className="inbox-count">{emails.length}</span>}
        </div>
        <div className="inbox-actions">
          <button onClick={() => fetchEmails()} className="inbox-btn-icon" title="Làm mới">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          {emails.length > 0 && (
            <button onClick={handleClearAll} className="inbox-btn-icon text-error" title="Xóa hết thư">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="inbox-info-banner">
        <span>📧 Toàn bộ email kích hoạt và reset mật khẩu từ server sẽ hiển thị tại đây để bạn tiện demo.</span>
      </div>

      <div className="inbox-body">
        {loading && emails.length === 0 ? (
          <div className="inbox-empty">Đang tải thư...</div>
        ) : emails.length === 0 ? (
          <div className="inbox-empty">
            <Mail size={36} className="mb-2 text-muted" />
            <p>Hòm thư trống</p>
            <p className="sub">Đăng ký hoặc yêu cầu Quên mật khẩu để nhận email</p>
          </div>
        ) : (
          <div className="email-list">
            {emails.map((email) => {
              const isExpanded = selectedEmail?.id === email.id;
              return (
                <div
                  key={email.id}
                  className={`email-item ${isExpanded ? 'expanded' : ''} ${!email.isRead ? 'unread' : ''}`}
                >
                  <div className="email-summary" onClick={() => handleEmailClick(email)}>
                    <div className="email-meta">
                      <span className="email-to">Đến: {email.to}</span>
                      <span className="email-time">
                        <Clock size={10} style={{ marginRight: 4 }} />
                        {formatTime(email.sentAt)}
                      </span>
                    </div>
                    <div className="email-subject">{email.subject}</div>
                  </div>

                  {isExpanded && (
                    <div className="email-details">
                      <div
                        className="email-content"
                        dangerouslySetInnerHTML={{ __html: email.body }}
                        onClick={handleBodyLinkClick}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Inject CSS styles for Simulated Inbox
const injectInboxStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'inbox-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .inbox-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.02);
    }

    .inbox-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #e2e8f0;
    }

    .inbox-icon {
      color: #6366f1;
    }

    .inbox-count {
      background: #6366f1;
      color: white;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 99px;
      font-weight: 700;
    }

    .inbox-actions {
      display: flex;
      gap: 8px;
    }

    .inbox-btn-icon {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .inbox-btn-icon:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .inbox-btn-icon.text-error:hover {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
      border-color: rgba(244, 63, 94, 0.3);
    }

    .inbox-info-banner {
      background: rgba(99, 102, 241, 0.07);
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      padding: 10px 16px;
      font-size: 12px;
      color: #818cf8;
      line-height: 1.4;
      text-align: left;
    }

    .inbox-body {
      flex: 1;
      overflow-y: auto;
    }

    .inbox-empty {
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      font-size: 14px;
      text-align: center;
    }

    .inbox-empty .sub {
      font-size: 12px;
      margin-top: 4px;
      color: #475569;
    }

    .email-list {
      display: flex;
      flex-direction: column;
    }

    .email-item {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      background: rgba(17, 19, 28, 0.3);
      transition: all 0.2s;
    }

    .email-item:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .email-item.unread {
      background: rgba(99, 102, 241, 0.03);
      border-left: 3px solid #6366f1;
    }

    .email-summary {
      padding: 14px 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .email-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .email-to {
      color: #64748b;
      font-weight: 500;
    }

    .email-time {
      color: #64748b;
      display: flex;
      align-items: center;
    }

    .email-item.unread .email-to {
      color: #818cf8;
    }

    .email-subject {
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }

    .email-item.unread .email-subject {
      color: #f8fafc;
    }

    .email-details {
      padding: 0 16px 16px 16px;
      animation: fadeIn 0.2s ease-out;
    }

    .email-content {
      background: #0a0b10;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 16px;
      font-size: 13px;
      color: #94a3b8;
      text-align: left;
      line-height: 1.5;
    }

    .email-content h3 {
      color: #f8fafc;
      margin-bottom: 10px;
      font-size: 15px;
    }

    .email-content p {
      margin-bottom: 8px;
    }

    .email-content a {
      color: #6366f1;
      word-break: break-all;
    }

    .email-content a:hover {
      text-decoration: underline;
    }

    .spin {
      animation: spinAnimation 1s linear infinite;
    }

    @keyframes spinAnimation {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

injectInboxStyles();
