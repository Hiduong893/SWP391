import React from 'react';
import { ShieldCheck, LogOut, User, Key, Car, PlusCircle, Compass, BookOpen, Briefcase } from 'lucide-react';
import { useToast } from './Toast';

export const Navbar = ({ user, onLogout, currentTab, setCurrentTab }) => {
  const { showToast } = useToast();

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
          <button
            className={`nav-item ${currentTab === 'rent-car' ? 'active' : ''}`}
            onClick={() => setCurrentTab('rent-car')}
          >
            <span>Thuê xe</span>
          </button>

          <button
            className={`nav-item ${currentTab === 'list-car' ? 'active' : ''}`}
            onClick={() => {
              if (!user) {
                showToast('Vui lòng đăng nhập để ký gửi xe!', 'warning');
                setCurrentTab('login');
              } else {
                setCurrentTab('list-car');
              }
            }}
          >
            <span>Ký gửi xe</span>
          </button>

          <button
            className="nav-item"
            onClick={() => handleDummyClick('Blog')}
          >
            <span>Blog</span>
          </button>

          <button
            className="nav-item"
            onClick={() => handleDummyClick('Tuyển dụng')}
          >
            <span>Tuyển dụng</span>
          </button>

          {user && (
            <>
              <button
                className={`nav-item ${currentTab === 'my-trips' ? 'active' : ''}`}
                onClick={() => setCurrentTab('my-trips')}
              >
                <span>Chuyến đi</span>
              </button>

              {(user.role === 'admin' || user.role === 'cskh') && (
                <button
                  className={`nav-item admin-nav-btn ${currentTab === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('admin-dashboard')}
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
                className={`nav-btn-login ${currentTab === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentTab('login')}
              >
                Đăng nhập
              </button>
              <button
                className={`nav-btn-signup ${currentTab === 'register' ? 'active' : ''}`}
                onClick={() => setCurrentTab('register')}
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
      font-family: 'Outfit', sans-serif;
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
      font-family: 'Outfit', sans-serif;
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
      font-family: 'Outfit', sans-serif;
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
      font-family: 'Outfit', sans-serif;
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
      font-family: 'Outfit', sans-serif;
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

