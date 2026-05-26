import React from 'react';
import { ShieldCheck, LogOut, User, Key, Car, PlusCircle, Compass } from 'lucide-react';

export const Navbar = ({ user, onLogout, currentTab, setCurrentTab }) => {
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => setCurrentTab('rent-car')}>
          <Car className="brand-icon" size={28} />
          <span className="brand-text">BONBONCAR</span>
          <span className="brand-badge">PRO</span>
        </div>

        <div className="nav-links">
          {/* Rent Car tab is always accessible */}
          <button 
            className={`nav-item ${currentTab === 'rent-car' ? 'active' : ''}`}
            onClick={() => setCurrentTab('rent-car')}
          >
            <Car size={18} />
            <span>Thuê Xe</span>
          </button>

          {user ? (
            <>
              {/* Owner listing & Trips tabs are accessible only when logged in */}
              <button 
                className={`nav-item ${currentTab === 'list-car' ? 'active' : ''}`}
                onClick={() => setCurrentTab('list-car')}
              >
                <PlusCircle size={18} />
                <span>Ký Gửi Xe</span>
              </button>
              
              <button 
                className={`nav-item ${currentTab === 'my-trips' ? 'active' : ''}`}
                onClick={() => setCurrentTab('my-trips')}
              >
                <Compass size={18} />
                <span>Chuyến Đi</span>
              </button>

              {(user.role === 'admin' || user.role === 'cskh') && (
                <button 
                  className={`nav-item admin-nav-btn ${currentTab === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentTab('admin-dashboard')}
                >
                  <ShieldCheck size={18} />
                  <span>{user.role === 'admin' ? 'Quản Trị' : 'CSKH & Hỗ Trợ'}</span>
                </button>
              )}

              <div className="nav-user-divider"></div>

              <button 
                className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
                onClick={() => setCurrentTab('profile')}
              >
                <User size={18} />
                <span>Hồ Sơ</span>
              </button>
              
              <button 
                className={`nav-item ${currentTab === 'change-password' ? 'active' : ''}`}
                onClick={() => setCurrentTab('change-password')}
              >
                <Key size={18} />
                <span>Đổi Mật Khẩu</span>
              </button>
              
              <div className="nav-user-divider"></div>

              <div className="nav-profile-summary">
                <img src={user.avatar} alt={user.name} className="nav-avatar" />
                <span className="nav-username">{user.name}</span>
              </div>

              <button className="nav-btn-logout" onClick={onLogout}>
                <LogOut size={18} />
                <span>Đăng Xuất</span>
              </button>
            </>
          ) : (
            <>
              <div className="nav-user-divider"></div>
              
              <button 
                className={`nav-item ${currentTab === 'login' || currentTab === 'forgot-password' || currentTab === 'reset-password' ? 'active' : ''}`}
                onClick={() => setCurrentTab('login')}
              >
                Đăng Nhập
              </button>
              <button 
                className={`nav-btn-signup ${currentTab === 'register' ? 'active' : ''}`}
                onClick={() => setCurrentTab('register')}
              >
                Đăng Ký
              </button>
            </>
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
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .main-nav {
      background: rgba(17, 19, 28, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .brand-icon {
      color: #6366f1;
      filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
    }

    .brand-text {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #f8fafc 30%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-badge {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nav-item {
      background: none;
      border: none;
      color: #94a3b8;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .nav-item:hover, .nav-item.active {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-item.active {
      background: rgba(99, 102, 241, 0.1);
      color: #818cf8;
    }

    .nav-item.admin-nav-btn {
      color: #c084fc;
      border: 1px dashed rgba(168, 85, 247, 0.4);
      background: rgba(168, 85, 247, 0.05);
    }

    .nav-item.admin-nav-btn:hover, .nav-item.admin-nav-btn.active {
      color: #f8fafc;
      background: rgba(168, 85, 247, 0.15);
      border-color: rgba(168, 85, 247, 0.7);
    }

    .nav-item.admin-nav-btn.active {
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
    }

    .nav-btn-signup {
      background: #6366f1;
      border: none;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 18px;
      border-radius: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }

    .nav-btn-signup:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }

    .nav-user-divider {
      height: 24px;
      width: 1px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 4px;
    }

    .nav-profile-summary {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .nav-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(99, 102, 241, 0.4);
    }

    .nav-username {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-btn-logout {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: #fda4af;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }

    .nav-btn-logout:hover {
      background: rgba(244, 63, 94, 0.2);
      color: #ffe4e6;
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
      .nav-username, .nav-user-divider {
        display: none;
      }
      .nav-links {
        gap: 4px;
      }
      .nav-item {
        padding: 6px 10px;
        font-size: 13px;
      }
      .nav-item span {
        display: none; /* Hide labels, show only icons on mobile */
      }
    }
  `;
  document.head.appendChild(style);
};

injectNavbarStyles();
