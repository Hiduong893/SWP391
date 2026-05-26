import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertOctagon, Loader, LogIn } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const VerifyEmail = ({ token, setCurrentTab }) => {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Đang tiến hành xác thực tài khoản của bạn...');
  const { showToast } = useToast();

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Không tìm thấy token xác thực hợp lệ.');
        return;
      }

      try {
        const data = await api.auth.verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Xác thực tài khoản thành công!');
        showToast('Tài khoản đã kích hoạt thành công!', 'success');
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Mã xác thực không đúng hoặc đã hết hạn.');
        showToast(error.message || 'Xác thực thất bại.', 'error');
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="glass-card text-center" style={{ padding: '40px 32px' }}>
      {status === 'verifying' && (
        <div className="verify-container">
          <Loader className="verify-icon spin text-info" size={64} />
          <h2 className="title mt-4">Đang Xác Thực</h2>
          <p className="subtitle mt-2">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="verify-container">
          <CheckCircle className="verify-icon text-success animate-bounce" size={64} />
          <h2 className="title mt-4" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Thành Công!
          </h2>
          <p className="subtitle mt-2" style={{ color: '#e2e8f0' }}>{message}</p>
          
          <button 
            onClick={() => setCurrentTab('login')} 
            className="btn btn-primary mt-6"
          >
            <LogIn size={18} />
            Đăng Nhập Ngay
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="verify-container">
          <AlertOctagon className="verify-icon text-error" size={64} />
          <h2 className="title mt-4" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fda4af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Thất Bại
          </h2>
          <p className="subtitle mt-2" style={{ color: '#e2e8f0' }}>{message}</p>

          <button 
            onClick={() => setCurrentTab('login')} 
            className="btn btn-secondary mt-6"
          >
            Quay Lại Đăng Nhập
          </button>
        </div>
      )}
    </div>
  );
};

// Inject CSS styles for verification bounce/loader
const injectVerifyStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'verify-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .verify-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .verify-icon {
      filter: drop-shadow(0 0 16px rgba(255, 255, 255, 0.05));
    }

    .verify-icon.text-success {
      color: #10b981;
      filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.3));
    }

    .verify-icon.text-error {
      color: #f43f5e;
      filter: drop-shadow(0 0 16px rgba(244, 63, 94, 0.3));
    }

    .verify-icon.text-info {
      color: #6366f1;
      filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.3));
    }

    .animate-bounce {
      animation: bounce 1s infinite;
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(-5%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }
  `;
  document.head.appendChild(style);
};

injectVerifyStyles();
