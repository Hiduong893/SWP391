import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import { OwnerDashboard } from './pages/OwnerDashboard/OwnerDashboard';
import { BookingModal } from './components/BookingModal';
import { SimulatedInbox } from './components/SimulatedInbox';
import { ChatbotWidget } from './components/ChatbotWidget';
import { Blog } from './pages/Blog/Blog';
import { BlogDetail } from './pages/Blog/BlogDetail';
import { Recruitment } from './pages/Recruitment/Recruitment';

import { api } from './utils/api';
import { useToast } from './components/Toast';
import { Loader } from 'lucide-react';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState(null);
  const [verificationToken, setVerificationToken] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authModal, setAuthModal] = useState(null); // 'login', 'register', 'forgot-password'
  const [activeBooking, setActiveBooking] = useState(null);
  const [searchParams, setSearchParams] = useState(null);

  // Parse currentTab from URL path for Navbar highlighting
  const currentTab = location.pathname === '/' ? 'rent-car' : location.pathname.substring(1).replace(/\/$/, '');

  const { showToast } = useToast();

  const handleSearch = (params) => {
    setSearchParams(params);
    navigate('/find-car');
  };

  const handleSetTabOrModal = (tab) => {
    if (['login', 'register', 'forgot-password'].includes(tab)) {
      setAuthModal(tab);
    } else {
      setAuthModal(null);
      if (tab === 'rent-car') navigate('/');
      else navigate(`/${tab}`);
    }
  };

  // Provide an alias for child components still using setCurrentTab
  const setCurrentTab = handleSetTabOrModal;

  const checkAutoLogin = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.user.getProfile();
      setUser(data.user);
      
      if (data.user && data.user.role === 'owner' && location.pathname === '/') {
        navigate('/owner-dashboard');
      }
    } catch (error) {
      console.warn('Auto-login session expired.');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Parse URL on startup for direct link clicks (e.g. from external sources)
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const vnpayStatus = params.get('vnpay_status');

    if (token) {
      if (path.includes('verify-email')) {
        setVerificationToken(token);
        navigate('/verify-email');
      } else if (path.includes('reset-password')) {
        setResetToken(token);
        navigate('/reset-password');
      }
      setLoading(false);
      window.history.replaceState({}, document.title, path);
    } else {
      checkAutoLogin();
    }

    if (vnpayStatus) {
      if (vnpayStatus === 'success') {
        showToast('Thanh toán đặt xe qua VNPAY thành công!', 'success');
        navigate('/my-trips');
      } else if (vnpayStatus === 'failed') {
        showToast('Thanh toán đặt xe qua VNPAY thất bại hoặc đã bị hủy.', 'error');
        navigate('/');
      } else if (vnpayStatus === 'invalid_signature') {
        showToast('Chữ ký thanh toán VNPAY không hợp lệ.', 'error');
      } else if (vnpayStatus === 'error') {
        showToast('Lỗi xử lý thanh toán VNPAY.', 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
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
          setAuthModal('verify-email');
          showToast('Đang chuyển hướng đến trang xác thực email...', 'info');
        } else if (pathname.includes('reset-password')) {
          setResetToken(token);
          setAuthModal('reset-password');
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
          setAuthModal('verify-email');
        } else if (path === 'reset-password') {
          setResetToken(token);
          setAuthModal('reset-password');
        }
      }
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);

    if (loggedInUser.role === 'admin') {
      navigate('/admin-dashboard');
    } else if (loggedInUser.role === 'cskh') {
      navigate('/cskh-dashboard');
    } else if (loggedInUser.role === 'owner') {
      navigate('/owner-dashboard');
    }
  };

  return (
    <>
      {currentTab !== 'cskh-dashboard' && currentTab !== 'admin-dashboard' && (
        <Navbar
          user={user}
          onLogout={handleLogout}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          authModal={authModal}
          setAuthModal={setAuthModal}
        />
      )}

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader className="spin text-info" size={48} />
          <p style={{ marginTop: 16, color: '#94a3b8', fontSize: '15px' }}>Đang tải ứng dụng...</p>
        </div>
      ) : (
        <div className={`app-container ${currentTab === 'rent-car' ? 'rent-car-layout' : ''}`}>
          <main className="main-content">
            <Routes>
              {/* Core Marketplace Tab */}
              <Route path="/" element={
                <RentCar
                  user={user}
                  onRentCarClick={setActiveBooking}
                  setCurrentTab={setCurrentTab}
                  onSearch={handleSearch}
                />
              } />

              {/* Find Car (Search catalog) Tab */}
              <Route path="/find-car" element={
                <FindCar
                  user={user}
                  setCurrentTab={setCurrentTab}
                  onRentCarClick={setActiveBooking}
                  initialSearchParams={searchParams}
                />
              } />

              {/* Blog & Blog Detail pages */}
              <Route path="/blog" element={
                <Blog
                  setCurrentTab={setCurrentTab}
                  onSelectPost={(post) => {
                    setSelectedBlogPost(post);
                    navigate('/blog-detail');
                  }}
                />
              } />

              <Route path="/blog-detail" element={
                selectedBlogPost ? (
                  <BlogDetail
                    post={selectedBlogPost}
                    onBack={() => {
                      setSelectedBlogPost(null);
                      navigate('/blog');
                    }}
                    onSelectPost={(post) => {
                      setSelectedBlogPost(post);
                      navigate('/blog-detail');
                    }}
                  />
                ) : (
                  <Navigate to="/blog" />
                )
              } />

              <Route path="/recruitment" element={
                <Recruitment
                  setCurrentTab={setCurrentTab}
                />
              } />

              {/* List Car (Owner listing) Tab - Protected */}
              <Route path="/list-car" element={
                user ? <ListCar setCurrentTab={setCurrentTab} user={user} setUser={setUser} onUpdateUser={setUser} /> : <Navigate to="/" />
              } />

              {/* Owner Dashboard Tab - Protected */}
              <Route path="/owner-dashboard" element={
                user && user.role === 'owner' ? <OwnerDashboard setCurrentTab={setCurrentTab} /> : <Navigate to="/" />
              } />

              {/* My Trips (Rental history) Tab - Protected */}
              <Route path="/my-trips" element={
                user ? <MyTrips user={user} /> : <Navigate to="/" />
              } />

              <Route path="/admin-dashboard" element={
                user && user.role === 'admin' ? <AdminDashboard setCurrentTab={setCurrentTab} /> : <Navigate to="/" />
              } />

              <Route path="/cskh-dashboard" element={
                user && user.role === 'cskh' ? <CSKHDashboard setCurrentTab={setCurrentTab} /> : <Navigate to="/" />
              } />

              <Route path="/verify-email" element={
                <VerifyEmail
                  token={verificationToken}
                  setCurrentTab={setCurrentTab}
                />
              } />

              <Route path="/reset-password" element={
                <ResetPassword
                  token={resetToken}
                  setCurrentTab={setCurrentTab}
                />
              } />

              <Route path="/profile" element={
                user ? <Profile user={user} onUpdateUser={setUser} setCurrentTab={setCurrentTab} /> : <Navigate to="/" />
              } />

              <Route path="/change-password" element={
                user ? <ChangePassword user={user} /> : <Navigate to="/" />
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
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
                setCurrentTab={setCurrentTab}
              />
            )}
            {authModal === 'register' && (
              <Register setCurrentTab={setCurrentTab} />
            )}
            {authModal === 'forgot-password' && (
              <ForgotPassword setCurrentTab={setCurrentTab} />
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
          setCurrentTab={setCurrentTab}
        />
      )}

      {/* --- AI SUPPORT CHATBOT WIDGET --- */}
      <ChatbotWidget user={user} setCurrentTab={setCurrentTab} />
    </>
  );
}

export default App;
