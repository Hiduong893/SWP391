import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Authentication/Login';
import { Register } from './pages/Authentication/Register';
import { VerifyEmail } from './pages/Authentication/VerifyEmail';
import { ForgotPassword } from './pages/Authentication/ForgotPassword';
import { ResetPassword } from './pages/Authentication/ResetPassword';
import { Profile } from './pages/Authentication/Profile/Profile';
import { ChangePassword } from './pages/Authentication/ChangePassword';

// Car Rental Pages & Components
import { RentCar } from './pages/RentCar/RentCar';
import { FindCar } from './pages/FindCar/FindCar';
import { ListCar } from './pages/ListCar/ListCar';
import { MyTrips } from './pages/MyTrips/MyTrips';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard';
import { CSKHDashboard } from './pages/CSKHDashboard/CSKHDashboard'; 
import { BookingModal } from './components/BookingModal';
import { SimulatedInbox } from './components/SimulatedInbox';
import { ChatbotWidget } from './components/ChatbotWidget';

import { api } from './utils/api';
import { useToast } from './components/Toast';
import { Loader } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('rent-car'); // rent-car, list-car, my-trips, login, register, verify-email, forgot-password, reset-password, profile, change-password
  const [verificationToken, setVerificationToken] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authModal, setAuthModal] = useState(null); // 'login', 'register', 'forgot-password'
  const [activeBooking, setActiveBooking] = useState(null);
  const [searchParams, setSearchParams] = useState(null);

  const handleSearch = (params) => {
    setSearchParams(params);
    setCurrentTab('find-car');
  };

  const { showToast } = useToast();

  const handleSetTabOrModal = (tab) => {
    if (['login', 'register', 'forgot-password'].includes(tab)) {
      setAuthModal(tab);
    } else {
      setAuthModal(null);
      setCurrentTab(tab);
    }
  };

  const checkAutoLogin = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.user.getProfile();
      setUser(data.user);
      // Stay on the same tab if it's already a valid page, otherwise default to rent-car
      const savedTab = sessionStorage.getItem('activeTab');
      if (savedTab) {
        setCurrentTab(savedTab);
      } else {
        setCurrentTab('rent-car');
      }
    } catch (error) {
      console.warn('Auto-login session expired.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Save tab selection in sessionStorage to persist across refreshes
    if (currentTab !== 'verify-email' && currentTab !== 'reset-password') {
      sessionStorage.setItem('activeTab', currentTab);
    }
  }, [currentTab]);

  useEffect(() => {
    // Parse URL on startup for direct link clicks (e.g. from external sources)
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const vnpayStatus = params.get('vnpay_status');

    if (token) {
      if (path.includes('verify-email')) {
        setVerificationToken(token);
        setCurrentTab('verify-email');
      } else if (path.includes('reset-password')) {
        setResetToken(token);
        setCurrentTab('reset-password');
      }
      setLoading(false);
      window.history.replaceState({}, document.title, '/');
    } else {
      checkAutoLogin();
    }

    if (vnpayStatus) {
      if (vnpayStatus === 'success') {
        showToast('Thanh toán đặt xe qua VNPAY thành công!', 'success');
        setCurrentTab('my-trips');
      } else if (vnpayStatus === 'failed') {
        showToast('Thanh toán đặt xe qua VNPAY thất bại hoặc đã bị hủy.', 'error');
        setCurrentTab('rent-car');
      } else if (vnpayStatus === 'invalid_signature') {
        showToast('Chữ ký thanh toán VNPAY không hợp lệ.', 'error');
      } else if (vnpayStatus === 'error') {
        showToast('Lỗi xử lý thanh toán VNPAY.', 'error');
      }
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentTab('rent-car');
    showToast('Đã đăng xuất thành công!', 'success');
  };

  // Intercept click on links in simulated emails
  const handleNavigateToLink = (href) => {
    try {
      const url = new URL(href);
      const pathname = url.pathname;
      const token = url.searchParams.get('token');

      if (token) {
        if (pathname.includes('verify-email')) {
          setVerificationToken(token);
          handleSetTabOrModal('verify-email');
          showToast('Đang chuyển hướng đến trang xác thực email...', 'info');
        } else if (pathname.includes('reset-password')) {
          setResetToken(token);
          handleSetTabOrModal('reset-password');
          showToast('Đang chuyển hướng đến trang đặt lại mật khẩu...', 'info');
        }
      }
    } catch (e) {
      // Handles relative links as well
      const match = href.match(/\/([a-zA-Z0-9-]+)\?token=([a-zA-Z0-9-]+)/);
      if (match) {
        const path = match[1];
        const token = match[2];
        if (path === 'verify-email') {
          setVerificationToken(token);
          handleSetTabOrModal('verify-email');
        } else if (path === 'reset-password') {
          setResetToken(token);
          handleSetTabOrModal('reset-password');
        }
      }
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);

    if (loggedInUser.role === 'admin') {
      setCurrentTab('admin-dashboard');
    } else if (loggedInUser.role === 'cskh') {
      setCurrentTab('cskh-dashboard');
    } else {
      // Switch to previously intended page if any, or default to rent-car
      const savedTab = sessionStorage.getItem('activeTab');
      if (savedTab && savedTab !== 'login' && savedTab !== 'register') {
        handleSetTabOrModal(savedTab);
      } else {
        handleSetTabOrModal('rent-car');
      }
    }
  };

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        authModal={authModal}
        setAuthModal={setAuthModal}
      />

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader className="spin text-info" size={48} />
          <p style={{ marginTop: 16, color: '#94a3b8', fontSize: '15px' }}>Đang tải ứng dụng...</p>
        </div>
      ) : (
        <div className={`app-container ${currentTab === 'rent-car' ? 'rent-car-layout' : ''}`}>
          <main className="main-content">
            {/* Core Marketplace Tab */}
            {currentTab === 'rent-car' && (
              <RentCar
                user={user}
                onRentCarClick={setActiveBooking}
                setCurrentTab={handleSetTabOrModal}
                onSearch={handleSearch}
              />
            )}

            {/* Find Car (Search catalog) Tab */}
            {currentTab === 'find-car' && (
              <FindCar
                user={user}
                setCurrentTab={handleSetTabOrModal}
                onRentCarClick={setActiveBooking}
                initialSearchParams={searchParams}
              />
            )}

            {/* List Car (Owner listing) Tab - Protected */}
            {currentTab === 'list-car' && user && (
              <ListCar setCurrentTab={handleSetTabOrModal} user={user} onUpdateUser={setUser} />
            )}

            {/* My Trips (Rental history) Tab - Protected */}
            {currentTab === 'my-trips' && user && (
              <MyTrips />
            )}

            {currentTab === 'admin-dashboard' && user && user.role === 'admin' && (
              <AdminDashboard setCurrentTab={handleSetTabOrModal} />
            )}

            {currentTab === 'cskh-dashboard' && user && user.role === 'cskh' && (
              <CSKHDashboard setCurrentTab={handleSetTabOrModal} />
            )}

            {currentTab === 'verify-email' && (
              <VerifyEmail
                token={verificationToken}
                setCurrentTab={handleSetTabOrModal}
              />
            )}

            {currentTab === 'reset-password' && (
              <ResetPassword
                token={resetToken}
                setCurrentTab={handleSetTabOrModal}
              />
            )}

            {user && currentTab === 'profile' && (
              <Profile
                user={user}
                onUpdateUser={setUser}
                setCurrentTab={handleSetTabOrModal}
              />
            )}

            {user && currentTab === 'change-password' && (
              <ChangePassword user={user} />
            )}
          </main>
        </div>
      )}

      {/* --- AUTH MODALS --- */}
      {authModal && (
        <div
          className="auth-modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuthModal(null);
          }}
        >
          <div
            style={{
              position: 'relative', width: '100%', maxWidth: '480px',
              maxHeight: '95vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease-out',
              borderRadius: '24px'
            }}
          >
            <button
              onClick={() => setAuthModal(null)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(0,0,0,0.05)', border: 'none',
                cursor: 'pointer', zIndex: 10, color: '#64748b',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#64748b'; }}
            >
              ✕
            </button>
            {authModal === 'login' && (
              <Login
                onLoginSuccess={(loggedInUser) => {
                  setAuthModal(null);
                  handleLoginSuccess(loggedInUser);
                }}
                setCurrentTab={handleSetTabOrModal}
              />
            )}
            {authModal === 'register' && (
              <Register setCurrentTab={handleSetTabOrModal} />
            )}
            {authModal === 'forgot-password' && (
              <ForgotPassword setCurrentTab={handleSetTabOrModal} />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* --- PRE-COMPUTED VietQR BOOKING CHECKOUT MODAL --- */}
      {activeBooking && user && (
        <BookingModal
          bookingDetails={activeBooking}
          user={user}
          onUpdateUser={setUser}
          onClose={() => setActiveBooking(null)}
          setCurrentTab={handleSetTabOrModal}
        />
      )}

      {/* --- AI SUPPORT CHATBOT WIDGET --- */}
      <ChatbotWidget user={user} setCurrentTab={handleSetTabOrModal} />
    </>
  );
}

export default App;
