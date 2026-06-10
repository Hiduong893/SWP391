import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, Chrome, ArrowRight, AlertTriangle, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const Login = ({ onLoginSuccess, setCurrentTab }) => {
  const [loginMode, setLoginMode] = useState('renter'); // renter, admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const { showToast } = useToast();

  const GOOGLE_CLIENT_ID = '685695521533-f6f90q2icshojk8lcsbo2etf0oma73jc.apps.googleusercontent.com';

  useEffect(() => {
    // Initialize official Google Sign-In
    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });

        window.google.accounts.id.renderButton(
          document.getElementById('official-google-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular'
          }
        );
      } else {
        console.warn('Google Identity Services SDK not loaded yet.');
      }
    };

    // Try to initialize, or wait a bit
    const timer = setTimeout(initializeGoogleSignIn, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    try {
      const data = await api.auth.googleLogin(response.credential);
      if (data.user.role === 'admin' || data.user.role === 'cskh') {
        showToast('Tài khoản Quản trị/CSKH vui lòng đăng nhập tại cổng Ban Quản Trị.', 'error');
        return;
      }
      localStorage.setItem('token', data.token);
      showToast(data.message, 'success');
      onLoginSuccess(data.user);
    } catch (error) {
      showToast(error.message || 'Xác thực Google thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async (mockEmail) => {
    setLoading(true);
    try {
      // Send a mock token starting with 'mock_google_' which server handles as Dev bypass
      const data = await api.auth.googleLogin(`mock_google_${mockEmail}`);
      localStorage.setItem('token', data.token);
      showToast(data.message, 'success');
      onLoginSuccess(data.user);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Vui lòng điền đầy đủ email và mật khẩu.', 'warning');
      return;
    }

    setLoading(true);
    setUnverifiedEmail(null);
    try {
      const data = await api.auth.login(email, password);

      // Phân quyền cổng đăng nhập nghiêm ngặt
      if (loginMode === 'admin') {
        if (data.user.role !== 'admin' && data.user.role !== 'cskh') {
          showToast('Tài khoản này không có quyền truy cập cổng Quản trị.', 'error');
          return;
        }
      } else {
        if (data.user.role === 'admin' || data.user.role === 'cskh') {
          showToast('Tài khoản Quản trị/CSKH vui lòng đăng nhập tại cổng Ban Quản Trị.', 'error');
          return;
        }
      }

      localStorage.setItem('token', data.token);
      showToast(data.message, 'success');
      onLoginSuccess(data.user);
    } catch (error) {
      showToast(error.message, 'error');
      // If server returned 403 unverified, allow resending verification email
      if (error.message.includes('chưa được xác thực email')) {
        setUnverifiedEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
        {loginMode === 'renter' ? 'ĐĂNG NHẬP KHÁCH HÀNG' : 'ĐĂNG NHẬP BAN QUẢN TRỊ'}
      </h2>
      <p className="subtitle">
        {loginMode === 'renter'
          ? 'Chào mừng quý khách đến với ViVuCar! Đăng nhập để thuê xe ngay.'
          : 'Cổng thông tin chuyên biệt dành cho Ban Quản trị & bộ phận CSKH.'}
      </p>

      {/* 🔄 Segmented Tab Control */}
      <div className="login-mode-tabs mb-6" style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: 4, borderRadius: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => {
            setLoginMode('renter');
            setEmail('');
            setPassword('');
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: loginMode === 'renter' ? 'linear-gradient(135deg, #009698 0%, #00bfa5 100%)' : 'transparent',
            color: loginMode === 'renter' ? 'white' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <User size={14} />
          <span>Khách Thuê Xe</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('admin');
            setEmail('');
            setPassword('');
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: '13px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            background: loginMode === 'admin' ? 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' : 'transparent',
            color: loginMode === 'admin' ? 'white' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={14} />
          <span>Ban Quản Trị</span>
        </button>
      </div>

      {unverifiedEmail && (
        <div className="alert alert-error">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <div>
            <strong>Tài khoản chưa xác thực!</strong>
            <p style={{ fontSize: '12px', marginTop: 4 }}>
              Email xác thực mới đã được gửi tự động tới <strong>Hộp thư mô phỏng</strong>. Vui lòng kiểm tra và nhấp xác thực.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Địa chỉ Email</label>
          <div className="input-container">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              className="form-input"
              placeholder={loginMode === 'renter' ? 'name@example.com' : 'admin@vivucar.vn'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Mật khẩu</label>
            <button
              type="button"
              className="link-btn"
              onClick={() => setCurrentTab('forgot-password')}
              style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: '#009698' }}
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="input-container">
            <Lock className="input-icon" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              style={{ paddingRight: '42px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#009698'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn mt-4"
          disabled={loading}
          style={{
            width: '100%',
            background: loginMode === 'renter' ? 'linear-gradient(135deg, #009698 0%, #00bfa5 100%)' : 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            color: 'white',
            fontWeight: 700
          }}
        >
          <LogIn size={18} />
          {loading ? 'Đang xử lý...' : loginMode === 'renter' ? 'Đăng Nhập Khách' : 'Đăng Nhập Quản Trị'}
        </button>
      </form>

      {loginMode === 'renter' && (
        <>
          <div className="divider">Hoặc đăng nhập với</div>
          {/* Official Google Button container */}
          <div id="official-google-btn" style={{ width: '100%', marginBottom: 12 }}></div>
        </>
      )}


      {loginMode === 'renter' && (
        <div className="text-center mt-6" style={{ fontSize: '14px', color: '#94a3b8' }}>
          Chưa có tài khoản?{' '}
          <button
            className="link-btn"
            onClick={() => setCurrentTab('register')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#009698', fontWeight: 6 }}
          >
            Đăng ký ngay <ArrowRight size={14} style={{ display: 'inline', marginLeft: 2 }} />
          </button>
        </div>
      )}
    </div>
  );
};

// Inject CSS styles for developer login boxes
const injectLoginStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'login-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .glass-card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06) !important;
      border-radius: 24px !important;
      padding: 40px !important;
      position: relative;
      overflow: hidden;
    }
    
    .glass-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(90deg, #009698 0%, #a855f7 100%) !important;
    }

    .login-mode-tabs button {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .login-mode-tabs button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 150, 152, 0.08);
      filter: brightness(1.03);
    }

    .login-mode-tabs button:active {
      transform: scale(0.97);
    }

    button[type="submit"].btn {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 4px 14px rgba(0, 150, 152, 0.2);
    }

    button[type="submit"].btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 150, 152, 0.35) !important;
      filter: brightness(1.05);
    }

    button[type="submit"].btn:active {
      transform: translateY(0) scale(0.98);
    }

    .dev-login-box {
      margin-top: 24px;
      padding: 16px;
      background: rgba(0, 150, 152, 0.03) !important;
      border: 1px dashed rgba(0, 150, 152, 0.25) !important;
      border-radius: 12px;
      text-align: left;
    }

    .dev-title {
      font-size: 11px;
      font-weight: 700;
      color: #009698 !important;
      margin-bottom: 8px;
      letter-spacing: 0.8px;
      text-align: center;
      text-transform: uppercase;
    }

    .dev-buttons-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }

    .dev-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-dev-admin, .btn-dev-cskh, .btn-dev-owner, .btn-dev-renter, .btn-dev-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 8px;
      border-radius: 8px;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      text-align: center;
    }

    .btn-dev-admin {
      background: rgba(168, 85, 247, 0.04) !important;
      border: 1px solid rgba(168, 85, 247, 0.2) !important;
      color: #7e22ce !important;
    }
    .btn-dev-admin:hover {
      background: rgba(168, 85, 247, 0.1) !important;
      border-color: rgba(168, 85, 247, 0.4) !important;
      box-shadow: 0 4px 10px rgba(168, 85, 247, 0.08);
      transform: translateY(-1px);
    }

    .btn-dev-cskh {
      background: rgba(236, 72, 153, 0.04) !important;
      border: 1px solid rgba(236, 72, 153, 0.2) !important;
      color: #db2777 !important;
    }
    .btn-dev-cskh:hover {
      background: rgba(236, 72, 153, 0.1) !important;
      border-color: rgba(236, 72, 153, 0.4) !important;
      box-shadow: 0 4px 10px rgba(236, 72, 153, 0.08);
      transform: translateY(-1px);
    }

    .btn-dev-owner {
      background: rgba(14, 165, 233, 0.04) !important;
      border: 1px solid rgba(14, 165, 233, 0.2) !important;
      color: #0369a1 !important;
    }
    .btn-dev-owner:hover {
      background: rgba(14, 165, 233, 0.1) !important;
      border-color: rgba(14, 165, 233, 0.4) !important;
      box-shadow: 0 4px 10px rgba(14, 165, 233, 0.08);
      transform: translateY(-1px);
    }

    .btn-dev-renter {
      background: rgba(34, 197, 94, 0.04) !important;
      border: 1px solid rgba(34, 197, 94, 0.2) !important;
      color: #15803d !important;
    }
    .btn-dev-renter:hover {
      background: rgba(34, 197, 94, 0.1) !important;
      border-color: rgba(34, 197, 94, 0.4) !important;
      box-shadow: 0 4px 10px rgba(34, 197, 94, 0.08);
      transform: translateY(-1px);
    }

    .btn-dev-google {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      color: #475569 !important;
    }
    .btn-dev-google:hover {
      background: rgba(0, 150, 152, 0.04) !important;
      color: #009698 !important;
      border-color: rgba(0, 150, 152, 0.3) !important;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
};

injectLoginStyles();
