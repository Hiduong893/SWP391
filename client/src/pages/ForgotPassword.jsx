import React, { useState } from 'react';
import { Mail, KeyRound, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const ForgotPassword = ({ setCurrentTab }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP Code, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Step 1: Send OTP code (Gửi mã OTP)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Vui lòng điền địa chỉ email của bạn.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.forgotPassword(email);
      showToast(data.message, 'success');
      setStep(2); // Go to OTP verification step
    } catch (error) {
      showToast(error.message || 'Lỗi gửi mã xác thực.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code (Xác nhận OTP)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      showToast('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.verifyResetCode(email, code);
      showToast(data.message, 'success');
      setStep(3); // Go to Reset Password step
    } catch (error) {
      showToast(error.message || 'Mã xác nhận OTP không đúng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password (Đặt lại mật khẩu)
  const handleResetPassword = async (e) => {
    e.preventDefault();

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
      const data = await api.auth.resetPassword(email, code, newPassword);
      showToast(data.message, 'success');
      setStep(4); // Go to Success step
    } catch (error) {
      showToast(error.message || 'Lỗi đặt lại mật khẩu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="title">Khôi Phục Mật Khẩu</h2>

      {/* STEP 1: Enter Email */}
      {step === 1 && (
        <>
          <p className="subtitle">
            Nhập địa chỉ email đăng ký. Chúng tôi sẽ gửi một mã xác nhận OTP gồm 6 chữ số tới Gmail của bạn.
          </p>

          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Địa chỉ Email của bạn</label>
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
              {loading ? 'Đang gửi mã...' : 'Nhận Mã OTP Qua Email'}
            </button>
          </form>
        </>
      )}

      {/* STEP 2: Enter 6-digit OTP */}
      {step === 2 && (
        <>
          <p className="subtitle">
            Mã OTP gồm 6 chữ số đã được gửi tới <strong>{email}</strong> (và hiển thị ở hộp thư ảo bên phải). Vui lòng nhập mã để tiếp tục.
          </p>

          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label">Nhập Mã OTP Xác Thực</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  className="form-input"
                  placeholder="Nhập 6 chữ số OTP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // only digits
                  style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary mt-4" 
                onClick={() => setStep(1)} 
                disabled={loading}
                style={{ width: '40%' }}
              >
                Gửi lại
              </button>
              <button 
                type="submit" 
                className="btn btn-primary mt-4" 
                disabled={loading}
                style={{ width: '60%' }}
              >
                Xác Thực OTP
              </button>
            </div>
          </form>
        </>
      )}

      {/* STEP 3: Enter New Password */}
      {step === 3 && (
        <>
          <p className="subtitle">
            Mã xác nhận OTP chính xác! Vui lòng nhập mật khẩu mới để đặt lại quyền truy cập tài khoản.
          </p>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Mật khẩu Mới</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận Mật khẩu Mới</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
              <Lock size={18} />
              {loading ? 'Đang cập nhật...' : 'Đổi Mật Khẩu'}
            </button>
          </form>
        </>
      )}

      {/* STEP 4: Success State */}
      {step === 4 && (
        <div className="text-center" style={{ padding: '20px 0' }}>
          <CheckCircle2 className="text-success animate-bounce mb-4" size={56} style={{ display: 'inline' }} />
          <h3 className="mt-2" style={{ fontSize: '20px', fontWeight: 6 }}>Thành Công!</h3>
          <p className="subtitle mt-2">
            Mật khẩu của bạn đã được cập nhật thành công. Hãy quay lại đăng nhập bằng mật khẩu mới này.
          </p>

          <button 
            onClick={() => setCurrentTab('login')} 
            className="btn btn-primary mt-6"
          >
            Đăng Nhập Ngay
          </button>
        </div>
      )}

      {/* Back to Login link */}
      {step !== 4 && (
        <div className="text-center mt-6" style={{ fontSize: '14px', color: '#94a3b8' }}>
          <button 
            className="link-btn" 
            onClick={() => setCurrentTab('login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#009698', fontWeight: 6 }}
          >
            <ArrowLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Quay lại Đăng nhập
          </button>
        </div>
      )}
    </div>
  );
};
