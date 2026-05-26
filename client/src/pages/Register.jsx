import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const Register = ({ setCurrentTab }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      const data = await api.auth.register(name, email, password);
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
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

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

        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <div className="input-container">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              className="form-input"
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nhập lại Mật khẩu</label>
          <div className="input-container">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              className="form-input"
              placeholder="Trùng khớp mật khẩu trên"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 6 }}
        >
          <ArrowLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Quay lại Đăng nhập
        </button>
      </div>
    </div>
  );
};
