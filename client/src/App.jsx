import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Authentication/Login';
import { Register } from './pages/Authentication/Register';
import { VerifyEmail } from './pages/Authentication/VerifyEmail';
import { ForgotPassword } from './pages/Authentication/ForgotPassword';
import { ResetPassword } from './pages/Authentication/ResetPassword';
import { Profile } from './pages/Authentication/Profile';
import { ChangePassword } from './pages/Authentication/ChangePassword';

// Car Rental Pages & Components
import { RentCar } from './pages/RentCar/RentCar';
import { FindCar } from './pages/FindCar/FindCar';
import { ListCar } from './pages/ListCar/ListCar';
import { MyTrips } from './pages/MyTrips/MyTrips';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard';
import { BookingModal } from './components/BookingModal';
import { SimulatedInbox } from './components/SimulatedInbox';

import { api } from './utils/api';
import { useToast } from './components/Toast';
import { Loader } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('rent-car'); // rent-car, list-car, my-trips, login, register, verify-email, forgot-password, reset-password, profile, change-password
  const [verificationToken, setVerificationToken] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeBooking, setActiveBooking] = useState(null);
  const [searchParams, setSearchParams] = useState(null);

  const handleSearch = (params) => {
    setSearchParams(params);
    setCurrentTab('find-car');
  };

  const { showToast } = useToast();

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

    if (token) {
      if (path.includes('verify-email')) {
        setVerificationToken(token);
        setCurrentTab('verify-email');
      } else if (path.includes('reset-password')) {
        setResetToken(token);
        setCurrentTab('reset-password');
      }
      setLoading(false);
      // Clear query params to make URL clean
      window.history.replaceState({}, document.title, '/');
    } else {
      checkAutoLogin();
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
          setCurrentTab('verify-email');
          showToast('Đang chuyển hướng đến trang xác thực email...', 'info');
        } else if (pathname.includes('reset-password')) {
          setResetToken(token);
          setCurrentTab('reset-password');
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
          setCurrentTab('verify-email');
        } else if (path === 'reset-password') {
          setResetToken(token);
          setCurrentTab('reset-password');
        }
      }
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);

    if (loggedInUser.role === 'admin' || loggedInUser.role === 'cskh') {
      setCurrentTab('admin-dashboard');
    } else {
      // Switch to previously intended page if any, or default to rent-car
      const savedTab = sessionStorage.getItem('activeTab');
      if (savedTab && savedTab !== 'login' && savedTab !== 'register') {
        setCurrentTab(savedTab);
      } else {
        setCurrentTab('rent-car');
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
      />

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader className="spin text-info" size={48} />
          <p style={{ marginTop: 16, color: '#94a3b8', fontSize: '15px' }}>Đang tải ứng dụng...</p>
        </div>
      ) : (
        <div className="app-container">
          <main className="main-content">
            {/* Core Marketplace Tab */}
            {currentTab === 'rent-car' && (
              <RentCar
                user={user}
                onRentCarClick={setActiveBooking}
                setCurrentTab={setCurrentTab}
                onSearch={handleSearch}
              />
            )}

            {/* Find Car (Search catalog) Tab */}
            {currentTab === 'find-car' && (
              <FindCar
                user={user}
                setCurrentTab={setCurrentTab}
                onRentCarClick={setActiveBooking}
                initialSearchParams={searchParams}
              />
            )}

            {/* List Car (Owner listing) Tab - Protected */}
            {currentTab === 'list-car' && user && (
              <ListCar setCurrentTab={setCurrentTab} />
            )}

            {/* My Trips (Rental history) Tab - Protected */}
            {currentTab === 'my-trips' && user && (
              <MyTrips />
            )}

            {currentTab === 'admin-dashboard' && user && (user.role === 'admin' || user.role === 'cskh') && (
              <AdminDashboard setCurrentTab={setCurrentTab} />
            )}

            {/* Auth pages */}
            {currentTab === 'login' && (
              <Login
                onLoginSuccess={handleLoginSuccess}
                setCurrentTab={setCurrentTab}
              />
            )}

            {currentTab === 'register' && (
              <Register setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'verify-email' && (
              <VerifyEmail
                token={verificationToken}
                setCurrentTab={setCurrentTab}
              />
            )}

            {currentTab === 'forgot-password' && (
              <ForgotPassword setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'reset-password' && (
              <ResetPassword
                token={resetToken}
                setCurrentTab={setCurrentTab}
              />
            )}

            {user && currentTab === 'profile' && (
              <Profile
                user={user}
                onUpdateUser={setUser}
                setCurrentTab={setCurrentTab}
              />
            )}

            {user && currentTab === 'change-password' && (
              <ChangePassword user={user} />
            )}
          </main>
        </div>
      )}

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
    </>
  );
}

export default App;
