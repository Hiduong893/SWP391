import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../utils/api';

export const NotificationBell = ({ user, setCurrentTab }) => {
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

    const interval = setInterval(fetchNotifications, 10000);

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

      if (setCurrentTab) {
        if (user.role === 'renter') {
          setCurrentTab('my-trips');
        } else if (user.role === 'owner') {
          setCurrentTab('owner-dashboard');
        }
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

  return (
    <div className="nav-notification-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--cskh-text-muted, var(--admin-text-secondary, #64748b))',
          width: '36px', height: '36px',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--cskh-surface-2, var(--admin-hover-bg, #f1f5f9))';
          e.currentTarget.style.color = 'var(--cskh-text, var(--admin-text-primary, #009698))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--cskh-text-muted, var(--admin-text-secondary, #64748b))';
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, background: '#ef4444',
            color: '#fff', fontSize: '9px', fontWeight: 700,
            width: '16px', height: '16px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--cskh-surface, var(--admin-header-bg, #fff))'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="nav-notification-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '320px',
          background: 'var(--cskh-surface, var(--admin-bg-secondary, #fff))',
          borderRadius: '8px',
          border: '1px solid var(--cskh-border, var(--admin-border-color, #e2e8f0))',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 1000, overflow: 'hidden',
          color: 'var(--cskh-text, var(--admin-text-primary, #0f172a))',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--cskh-border, var(--admin-border-color, #e2e8f0))',
            background: 'var(--cskh-surface-2, var(--admin-bg-tertiary, #f8fafc))'
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{
                background: 'none', border: 'none', color: '#009698',
                fontSize: '11.5px', fontWeight: 600, cursor: 'pointer'
              }}>Đọc tất cả</button>
            )}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--cskh-text-muted, var(--admin-text-muted, #94a3b8))', fontSize: '13px' }}>
                Không có thông báo mới.
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} onClick={() => handleNotificationClick(notif)} style={{
                  padding: '12px 16px', display: 'flex', gap: '10px',
                  borderBottom: '1px solid var(--cskh-border-light, var(--admin-border-color, #f1f5f9))',
                  background: notif.isRead ? 'transparent' : 'var(--cskh-accent-dim, rgba(0, 150, 152, 0.05))',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ paddingTop: '4px' }}>
                    {!notif.isRead && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cskh-accent-light, #009698)', boxShadow: '0 0 6px var(--cskh-accent-glow, rgba(0, 150, 152, 0.6))' }} />}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: notif.isRead ? 500 : 600, color: 'var(--cskh-text, var(--admin-text-primary, #1e293b))' }}>
                      {notif.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--cskh-text-muted, var(--admin-text-secondary, #64748b))' }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '10.5px', color: 'var(--cskh-text-dim, var(--admin-text-muted, #94a3b8))', display: 'block', margin: '6px 0 0' }}>
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
  );
};
