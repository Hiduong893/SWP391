import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, LogOut, User, Key, Car, PlusCircle, Compass, BookOpen, Briefcase, Bell } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../utils/api';

export const Navbar = ({ user, onLogout, currentTab, setCurrentTab, authModal, setAuthModal }) => {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.notifications.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000); // Polling every 10s

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.notifications.markAsRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);
      
      // Smart navigation
      if (user.role === 'renter') {
        setCurrentTab('my-trips');
      } else if (user.role === 'owner') {
        setCurrentTab('owner-dashboard');
      } else if (user.role === 'cskh' || user.role === 'admin') {
        setCurrentTab('admin-dashboard');
      }
    } catch (err) {
      console.error('Failed to process notification click:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleDummyClick = (title) => {
    showToast(`Tính năng "${title}" đang được phát triển. Cảm ơn bạn đã quan tâm!`, 'info');
  };

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => setCurrentTab('rent-car')}>
          <div className="brand-logo-container">
            <svg viewBox="0 0 100 100" className="brand-logo-svg" width="36" height="36">
              <rect width="100" height="100" rx="24" fill="#009698" />
              <path d="M50 18 C62 18, 76 28, 76 50 C76 72, 62 82, 50 82 C38 82, 24 72, 24 50 C24 28, 38 18, 50 18 Z" fill="none" stroke="white" strokeWidth="6" />
              <circle cx="50" cy="50" r="12" fill="white" />
              <path d="M50 18 L50 82" stroke="white" strokeWidth="4" />
            </svg>
          </div>
          <span className="brand-text">
            <span className="brand-dark">ViVu</span>
            <span className="brand-teal">Car</span>
          </span>
        </div>

        <div className="nav-links">
          {/* Main active links */}
          {user?.role !== 'owner' && (
            <button
              className={`nav-item ${currentTab === 'rent-car' ? 'active' : ''}`}
              onClick={() => setCurrentTab('rent-car')}
            >
              <span>Thuê xe</span>
            </button>
          )}

          <button
            className={`nav-item ${currentTab === 'list-car' ? 'active' : ''}`}
            onClick={() => {
              if (!user) {
                showToast('Vui lòng đăng nhập để thêm xe cho thuê!', 'warning');
                setAuthModal('login');
              } else {
                setCurrentTab('list-car');
              }
            }}
          >
            <span>Thêm xe cho thuê</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'blog' || currentTab === 'blog-detail' ? 'active' : ''}`}
            onClick={() => setCurrentTab('blog')}
          >
            <span>Blog</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'recruitment' ? 'active' : ''}`}
            onClick={() => setCurrentTab('recruitment')}
          >
            <span>Tuyển dụng</span>
          </button>

          {user && (
            <>
              {user.role === 'owner' && (
                <button
                  className={`nav-item ${currentTab === 'owner-dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('owner-dashboard')}
                >
                  <span>Quản lý xe</span>
                </button>
              )}

              {user.role !== 'owner' && (
                <button
                  className={`nav-item ${currentTab === 'my-trips' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('my-trips')}
                >
                  <span>Chuyến đi</span>
                </button>
              )}

              {(user.role === 'admin' || user.role === 'cskh') && (
                <button
                  className={`nav-item admin-nav-btn ${(currentTab === 'admin-dashboard' || currentTab === 'cskh-dashboard') ? 'active' : ''}`}
                  onClick={() => setCurrentTab(user.role === 'admin' ? 'admin-dashboard' : 'cskh-dashboard')}
                >
                  <ShieldCheck size={16} />
                  <span>{user.role === 'admin' ? 'Quản trị' : 'CSKH & Hỗ trợ'}</span>
                </button>
              )}
            </>
          )}

          <div className="nav-user-divider"></div>

          {user ? (
            <div className="nav-user-area">
              <div className="nav-notification-container" ref={dropdownRef}>
                <button 
                  className={`nav-notification-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                  onClick={() => setIsOpen(!isOpen)}
                  title="Thông báo"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="nav-notification-badge">{unreadCount}</span>}
                </button>

                {isOpen && (
                  <div className="nav-notification-dropdown">
                    <div className="nav-notif-header">
                      <h3>Thông báo</h3>
                      {unreadCount > 0 && (
                        <button className="nav-notif-mark-all" onClick={handleMarkAllRead}>
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="nav-notif-body">
                      {notifications.length === 0 ? (
                        <div className="nav-notif-empty">Không có thông báo mới.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`nav-notif-item ${notif.isRead ? 'read' : 'unread'}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="notif-dot-container">
                              {!notif.isRead && <span className="notif-unread-dot"></span>}
                            </div>
                            <div className="notif-content">
                              <h4 className="notif-title">{notif.title}</h4>
                              <p className="notif-message">{notif.message}</p>
                              <span className="notif-time">
                                {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' - '}
                                {new Date(notif.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="nav-profile-summary" onClick={() => setCurrentTab('profile')} title="Xem hồ sơ cá nhân">
                <img src={user.avatar} alt={user.name} className="nav-avatar" />
                <span className="nav-username">{user.name}</span>
              </div>

              <button className="nav-btn-logout" onClick={onLogout} title="Đăng xuất">
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="nav-auth-buttons">
              <button
                className={`nav-btn-login ${authModal === 'login' ? 'active' : ''}`}
                onClick={() => setAuthModal('login')}
              >
                Đăng nhập
              </button>
              <button
                className={`nav-btn-signup ${authModal === 'register' ? 'active' : ''}`}
                onClick={() => setAuthModal('register')}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Inject CSS styles for Navbar
const injectNavbarStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'navbar-styles';
  if (document.getElementById(styleId)) {
    // Remove existing styles to replace
    const oldStyle = document.getElementById(styleId);
    oldStyle.parentNode.removeChild(oldStyle);
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .main-nav {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      transition: all 0.3s ease;
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .brand-logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-logo-svg {
      filter: drop-shadow(0 4px 8px rgba(0, 150, 152, 0.15));
      transition: all 0.3s ease;
    }

    .nav-brand:hover .brand-logo-svg {
      transform: rotate(10deg) scale(1.05);
    }

    .brand-text {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      font-family: 'Inter', sans-serif;
    }

    .brand-dark {
      color: #0f172a;
    }

    .brand-teal {
      color: #009698;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-item {
      background: none;
      border: none;
      color: #334155;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      color: #009698;
      background: #f8fafc;
    }

    .nav-item.active {
      color: #009698;
      font-weight: 600;
    }

    .nav-item.admin-nav-btn {
      color: #8b5cf6;
      border: 1px dashed rgba(139, 92, 246, 0.3);
      background: rgba(139, 92, 246, 0.02);
    }

    .nav-item.admin-nav-btn:hover {
      color: #7c3aed;
      background: rgba(139, 92, 246, 0.08);
      border-color: rgba(139, 92, 246, 0.6);
    }

    .nav-user-divider {
      height: 24px;
      width: 1px;
      background: #e2e8f0;
      margin: 0 10px;
    }

    .nav-user-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .nav-notification-container {
      position: relative;
    }

    .nav-notification-btn {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      color: #64748b;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }

    .nav-notification-btn:hover {
      background: #f1f5f9;
      border-color: #e2e8f0;
      color: #009698;
    }

    .nav-notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
    }

    .nav-notification-dropdown {
      position: absolute;
      top: 48px;
      right: 0;
      width: 350px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 2px 10px rgba(0, 0, 0, 0.05);
      border: 1px solid #f1f5f9;
      z-index: 1000;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      animation: navNotifFadeIn 0.2s ease-out;
    }

    @keyframes navNotifFadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nav-notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    .nav-notif-header h3 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      text-transform: none;
    }

    .nav-notif-mark-all {
      background: none;
      border: none;
      color: #009698;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s ease;
    }

    .nav-notif-mark-all:hover {
      background: rgba(0, 150, 152, 0.08);
      color: #00797b;
    }

    .nav-notif-body {
      max-height: 380px;
      overflow-y: auto;
    }

    .nav-notif-empty {
      padding: 30px 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }

    .nav-notif-item {
      display: flex;
      padding: 14px 16px;
      border-bottom: 1px solid #f8fafc;
      cursor: pointer;
      transition: background 0.15s ease;
      gap: 10px;
      text-align: left;
    }

    .nav-notif-item:hover {
      background: #f8fafc;
    }

    .nav-notif-item.unread {
      background: rgba(0, 150, 152, 0.03);
    }

    .nav-notif-item.unread:hover {
      background: rgba(0, 150, 152, 0.06);
    }

    .notif-dot-container {
      display: flex;
      align-items: flex-start;
      padding-top: 4px;
    }

    .notif-unread-dot {
      width: 8px;
      height: 8px;
      background: #009698;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 6px rgba(0, 150, 152, 0.6);
    }

    .notif-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .notif-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
      text-transform: none;
    }

    .nav-notif-item.unread .notif-title {
      color: #0f172a;
      font-weight: 700;
    }

    .notif-message {
      font-size: 12.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .nav-notif-item.unread .notif-message {
      color: #334155;
    }

    .notif-time {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .nav-profile-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 99px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      transition: all 0.2s ease;
    }

    .nav-profile-summary:hover {
      background: #f1f5f9;
      border-color: #e2e8f0;
    }

    .nav-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #009698;
    }

    .nav-username {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      max-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-btn-logout {
      background: none;
      border: 1px solid #f1f5f9;
      color: #64748b;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .nav-btn-logout:hover {
      background: #fdf2f2;
      border-color: #fde8e8;
      color: #ef4444;
    }

    .nav-auth-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-btn-login {
      background: none;
      border: none;
      color: #334155;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 16px;
      transition: all 0.2s;
    }

    .nav-btn-login:hover {
      color: #009698;
    }

    .nav-btn-signup {
      background: #009698;
      border: none;
      color: #ffffff;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 20px;
      border-radius: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 150, 152, 0.2);
    }

    .nav-btn-signup:hover {
      background: #00797b;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 150, 152, 0.3);
    }

    @media (max-width: 1024px) {
      .nav-container {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
      }
      .nav-links {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 768px) {
      .nav-user-divider {
        display: none;
      }
      .nav-links {
        gap: 4px;
      }
      .nav-item {
        padding: 6px 10px;
        font-size: 13px;
      }
    }
  `;
  document.head.appendChild(style);
};

injectNavbarStyles();

