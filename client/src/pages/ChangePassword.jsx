import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const ChangePassword = ({ user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Accounts signed up via Google don't have passwords. They don't need currentPassword validation.
    const hasPassword = user.googleId === null || currentPassword !== '';

    if (user.googleId === null && !currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại.', 'warning');
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
      showToast('Mật khẩu nhập lại không khớp.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.user.changePassword(currentPassword, newPassword);
      showToast('Thay đổi mật khẩu thành công!', 'success');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title">Đổi Mật Khẩu</h2>
      
      {!success ? (
        <>
          <p className="subtitle">
            {user.googleId && !user.password 
              ? 'Tài khoản của bạn được tạo qua Google và chưa có mật khẩu gốc. Hãy tạo một mật khẩu tại đây.' 
              : 'Hãy bảo mật tài khoản của bạn bằng cách thiết lập mật khẩu mới có độ bảo mật cao.'
            }
          </p>

          <form onSubmit={handleSubmit}>
            {/* Display current password only if user isn't Google-only (or if they've already set a password) */}
            {(!user.googleId || user.password) && (
              <div className="form-group">
                <label className="form-label">Mật khẩu Hiện tại</label>
                <div className="input-container">
                  <KeyRound className="input-icon" size={18} />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingRight: '42px' }}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Mật khẩu Mới</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '42px' }}
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              <KeyRound size={18} />
              {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center" style={{ padding: '20px 0' }}>
          <CheckCircle2 className="text-success animate-bounce mb-4" size={56} style={{ display: 'inline' }} />
          <h3 className="mt-2" style={{ fontSize: '20px', fontWeight: 6 }}>Cập Nhật Thành Công!</h3>
          <p className="subtitle mt-2">
            Mật khẩu tài khoản của bạn đã được cập nhật thành công. Mật khẩu mới có hiệu lực ngay lập tức.
          </p>

          <button 
            onClick={() => setSuccess(false)} 
            className="btn btn-primary mt-6"
          >
            Quay Lại
          </button>
        </div>
      )}
    </div>
  );
};
