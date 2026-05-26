import React, { useState } from 'react';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const ForgotPassword = ({ setCurrentTab }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showToast('Vui lòng điền địa chỉ email của bạn.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.forgotPassword(email);
      showToast(data.message, 'success', 6000);
      setSubmitted(true);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title">Quên Mật Khẩu</h2>
      
      {!submitted ? (
        <>
          <p className="subtitle">
            Nhập email tài khoản của bạn. Chúng tôi sẽ gửi một liên kết khôi phục mật khẩu vào <strong>Hộp thư mô phỏng</strong>.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Địa chỉ Email</label>
              <div className="input-container">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
              <KeyRound size={18} />
              {loading ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Khôi Phục'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center" style={{ padding: '20px 0' }}>
          <div className="alert alert-success mb-6">
            📧 Đã gửi liên kết khôi phục mật khẩu! Vui lòng kiểm tra <strong>Hộp thư mô phỏng</strong> bên phải màn hình để nhấp đặt lại mật khẩu mới.
          </div>
          <p className="subtitle">
            Sau khi đổi mật khẩu thành công tại liên kết khôi phục, bạn có thể quay lại trang đăng nhập.
          </p>
        </div>
      )}

      <div className="text-center mt-6" style={{ fontSize: '14px', color: '#94a3b8' }}>
        <button 
          className="link-btn" 
          onClick={() => setCurrentTab('login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 6 }}
        >
          <ArrowLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Quay lại Đăng nhập
        </button>
      </div>
    </div>
  );
};
