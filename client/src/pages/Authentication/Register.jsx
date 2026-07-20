import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const Register = ({ setCurrentTab }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Nam');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ tất cả các trường.', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu phải chứa ít nhất 6 ký tự.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu nhập lại không khớp.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.register(name, email, password, gender);
      showToast(data.message, 'success', 6000);
      setCurrentTab('login'); // Switch to login screen
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title">Đăng Ký</h2>
      <p className="subtitle">Tạo tài khoản mới và bắt đầu hành trình của bạn.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Họ và Tên</label>
          <div className="input-container">
            <User className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '42px' }}
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Giới tính</label>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '42px', paddingLeft: '10px' }}>
            {['Nam', 'Nữ', 'Khác'].map((option) => (
              <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#334155', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={gender === option}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ width: '16px', height: '16px', accentColor: '#009698', cursor: 'pointer' }}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Địa chỉ Email</label>
          <div className="input-container">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              className="form-input"
              style={{ paddingLeft: '42px' }}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <div className="input-container">
            <Lock className="input-icon" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              style={{ paddingLeft: '42px', paddingRight: '42px' }}
              placeholder="Ít nhất 6 ký tự"
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

        <div className="form-group">
          <label className="form-label">Nhập lại Mật khẩu</label>
          <div className="input-container">
            <Lock className="input-icon" size={18} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              style={{ paddingLeft: '42px', paddingRight: '42px' }}
              placeholder="Trùng khớp mật khẩu trên"
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
          <UserPlus size={18} />
          {loading ? 'Đang đăng ký...' : 'Tạo Tài Khoản'}
        </button>
      </form>

      <div className="text-center mt-6" style={{ fontSize: '14px', color: '#94a3b8' }}>
        Đã có tài khoản?{' '}
        <button 
          className="link-btn" 
          onClick={() => setCurrentTab('login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#009698', fontWeight: 6 }}
        >
          <ArrowLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Quay lại Đăng nhập
        </button>
      </div>
    </div>
  );
};
