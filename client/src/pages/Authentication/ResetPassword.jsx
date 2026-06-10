import React, { useState } from 'react';
import { Lock, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const ResetPassword = ({ token, setCurrentTab }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showToast('Token khôi phục mật khẩu không tìm thấy.', 'error');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ thông tin.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải chứa ít nhất 6 ký tự.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.resetPassword(token, newPassword);
      showToast(data.message, 'success');
      setSuccess(true);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title">Đặt Lại Mật Khẩu</h2>

      {!success ? (
        <>
          <p className="subtitle">Nhập mật khẩu mới cho tài khoản của bạn để khôi phục quyền truy cập.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mật khẩu Mới</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '42px' }}
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="form-group">
              <label className="form-label">Xác nhận Mật khẩu Mới</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '42px' }}
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
              <Lock size={18} />
              {loading ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center" style={{ padding: '20px 0' }}>
          <CheckCircle2 className="text-success animate-bounce mb-4" size={56} style={{ display: 'inline' }} />
          <h3 className="mt-2" style={{ fontSize: '20px', fontWeight: 6 }}>Thành Công!</h3>
          <p className="subtitle mt-2">
            Mật khẩu của bạn đã được thay đổi. Hãy dùng mật khẩu mới để đăng nhập tài khoản.
          </p>

          <button 
            onClick={() => setCurrentTab('login')} 
            className="btn btn-primary mt-6"
          >
            Đăng Nhập
          </button>
        </div>
      )}

      {!success && (
        <div className="text-center mt-6" style={{ fontSize: '14px', color: '#94a3b8' }}>
          <button 
            className="link-btn" 
            onClick={() => setCurrentTab('login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#009698', fontWeight: 6 }}
          >
            <ArrowLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Hủy và quay lại Đăng nhập
          </button>
        </div>
      )}
    </div>
  );
};
