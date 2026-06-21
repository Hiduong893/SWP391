import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Calendar, FileText, Camera, Edit2, Check, X, Upload, Link, CheckCircle, ZoomIn, RotateCw, Move, ShieldCheck, CreditCard, DollarSign, ArrowDownLeft, ArrowUpRight, ShieldAlert, Key } from 'lucide-react';
import { api } from '../../../utils/api';
import { useToast } from '../../../components/Toast';
import './Profile.css';

export const Profile = ({ user, onUpdateUser, setCurrentTab }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [loading, setLoading] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [cccdUploading, setCccdUploading] = useState(false);

  // Wallet States (UC19)
  const [walletBalance, setWalletBalance] = useState(user.walletBalance || 0);
  const [bankAccount, setBankAccount] = useState(user.bankAccount || null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTxType, setWalletTxType] = useState('deposit'); // deposit | withdraw
  const [walletTxAmount, setWalletTxAmount] = useState('');

  // Bank Account linking form states (UC24)
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState(user.bankAccount?.bankName || 'MBBank');
  const [accountNumber, setAccountNumber] = useState(user.bankAccount?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(user.bankAccount?.accountHolder || '');

  // Avatar selector drawers
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Image Editor Modal States
  const [showEditor, setShowEditor] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { showToast } = useToast();
  const [previewImage, setPreviewImage] = useState(null);

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80'
  ];

  const fetchWalletDetails = async () => {
    try {
      const data = await api.user.getWallet();
      setWalletBalance(data.walletBalance);
      setBankAccount(data.bankAccount);
    } catch (e) {
      console.warn("Lỗi tải ví tiền.");
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, [user]);

  // Draw image on canvas whenever editor states change
  useEffect(() => {
    if (!editorImageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const wrh = img.width / img.height;
      let newWidth = canvas.width;
      let newHeight = newWidth / wrh;
      if (newHeight < canvas.height) {
        newHeight = canvas.height;
        newWidth = newHeight * wrh;
      }

      ctx.drawImage(img, -newWidth / 2 + xOffset, -newHeight / 2 + yOffset, newWidth, newHeight);
      ctx.restore();
    };

    img.src = editorImageSrc;
  }, [editorImageSrc, zoom, rotation, xOffset, yOffset]);

  // Drag handlers for Canvas
  const handleDragStart = (clientX, clientY) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const sensitivity = 1 / zoom;
    const rad = (rotation * Math.PI) / 180;
    const rotatedDx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
    const rotatedDy = dx * Math.sin(-rad) + dy * Math.cos(-rad);

    setXOffset(prev => prev + rotatedDx * sensitivity);
    setYOffset(prev => prev + rotatedDy * sensitivity);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      showToast('Họ tên không được để trống.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await api.user.editProfile(name, bio);
      onUpdateUser(data.user);
      setIsEditing(false);
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // CCCD & Bằng lái upload KYC (UC04 - Enhanced with AI Verification)
  const handleKycUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ tải lên file hình ảnh.', 'warning');
      return;
    }

    if (type === 'cccd' || type === 'cccdBack') setCccdUploading(true);
    else setLicenseUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        let cccdFront = type === 'cccd' ? base64Data : null;
        let cccdBack = type === 'cccdBack' ? base64Data : null;
        let license = type === 'license' ? base64Data : null;

        showToast('AI đang quét và đối chiếu dữ liệu hình ảnh giấy tờ...', 'info');

        const data = await api.user.uploadKyc(cccdFront, license, null, cccdBack);
        onUpdateUser(data.user);
        
        if (data.user.licenseStatus === 'rejected') {
          showToast(data.message, 'error');
        } else {
          showToast(data.message, 'success');
        }
      } catch (error) {
        showToast(error.message || 'Lỗi tải ảnh KYC.', 'error');
      } finally {
        setCccdUploading(false);
        setLicenseUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Link bank Account (UC24)
  const handleLinkBankSubmit = async (e) => {
    e.preventDefault();
    if (!accountNumber || !accountHolder) {
      showToast('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.', 'warning');
      return;
    }

    try {
      const data = await api.user.linkBank(bankName, accountNumber, accountHolder.toUpperCase());
      onUpdateUser(data.user);
      showToast(data.message, 'success');
      setShowBankForm(false);
    } catch (error) {
      showToast(error.message || 'Lỗi liên kết ngân hàng.', 'error');
    }
  };

  // Wallet deposit/withdrawal (UC19)
  const handleWalletTxSubmit = async (e) => {
    e.preventDefault();
    if (!walletTxAmount || parseInt(walletTxAmount) <= 0) {
      showToast('Vui lòng nhập số tiền giao dịch hợp lệ.', 'warning');
      return;
    }

    try {
      const data = await api.user.transactWallet(walletTxType, walletTxAmount);
      setWalletBalance(data.walletBalance);
      showToast(data.message, 'success');
      setShowWalletModal(false);
      setWalletTxAmount('');
    } catch (error) {
      showToast(error.message || 'Lỗi giao dịch ví.', 'error');
    }
  };

  const handleOpenEditor = (imageSrc) => {
    setEditorImageSrc(imageSrc);
    setZoom(1);
    setRotation(0);
    setXOffset(0);
    setYOffset(0);
    setShowEditor(true);
  };

  const handleSelectPresetAvatar = (url) => {
    handleOpenEditor(url);
  };

  const handleUrlAvatarSubmit = (e) => {
    e.preventDefault();
    if (!avatarUrl) return;
    handleOpenEditor(avatarUrl);
    setAvatarUrl('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ tải lên file hình ảnh.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleOpenEditor(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedImage = async () => {
    if (!canvasRef.current) return;
    setAvatarLoading(true);

    try {
      const croppedBase64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
      const data = await api.user.updateAvatar(croppedBase64);
      onUpdateUser(data.user);
      showToast('Cập nhật ảnh đại diện thành công!', 'success');
      setShowEditor(false);
      setShowAvatarSelector(false);
    } catch (error) {
      showToast(error.message || 'Lỗi cập nhật ảnh.', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const rotate90 = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="profile-container-glass-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>

      {/* 👤 LEFT BLOCK: PROFILE INFORMATION & KYC CARD */}
      <div className="glass-card" style={{ width: '100%' }}>
        <div className="profile-header-card">
          <div className="avatar-wrapper">
            <img src={user.avatar} alt={user.name} className={`profile-avatar-large ${avatarLoading ? 'loading-blur' : ''}`} />
            <button className="avatar-change-badge" onClick={() => setShowAvatarSelector(!showAvatarSelector)} title="Đổi ảnh đại diện" disabled={avatarLoading}>
              <Camera size={16} />
            </button>
          </div>

          <div className="profile-title-area">
            <div className="profile-name-badge">
              <h2 className="profile-name">{user.name}</h2>
              {user.isEmailVerified && <span className="badge-verified">Verified ✓</span>}
            </div>
            <p className="profile-email-sub">{user.email}</p>
            <span className="user-role-badge-pill">{user.role === 'admin' ? 'QTV Admin' : user.role === 'cskh' ? 'CSKH Staff' : user.role === 'owner' ? 'Chủ Xe (Owner)' : 'Khách Thuê (Renter)'}</span>
          </div>
        </div>

        {showAvatarSelector && (
          <div className="avatar-selector-box">
            <div className="selector-header">
              <h4>Chọn và Sửa Ảnh</h4>
              <button className="btn-close-selector" onClick={() => setShowAvatarSelector(false)}><X size={16} /></button>
            </div>
            <div className="preset-avatars-grid">
              {PRESET_AVATARS.map((url, idx) => (
                <img key={idx} src={url} alt={`avatar-${idx}`} className={`preset-item ${user.avatar === url ? 'active' : ''}`} onClick={() => handleSelectPresetAvatar(url)} />
              ))}
            </div>
            <div className="selector-divider">hoặc</div>
            <div className="upload-container">
              <label className="upload-btn">
                <Upload size={16} />
                <span>Tải ảnh lên</span>
                <input type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        )}

        <hr className="profile-divider" />

        {!isEditing ? (
          <div className="profile-info-grid">
            <div className="info-row">
              <User size={18} className="info-icon text-muted" />
              <div className="info-data">
                <span className="info-label">Họ và Tên</span>
                <span className="info-value">{user.name}</span>
              </div>
            </div>

            <div className="info-row">
              <Mail size={18} className="info-icon text-muted" />
              <div className="info-data">
                <span className="info-label">Email</span>
                <span className="info-value">{user.email}</span>
              </div>
            </div>

            <div className="info-row">
              <FileText size={18} className="info-icon text-muted" />
              <div className="info-data">
                <span className="info-label">Tiểu sử (Bio)</span>
                <span className="info-value bio-text">{user.bio || 'Chưa cập nhật tiểu sử.'}</span>
              </div>
            </div>

            <div className="info-row">
              <Calendar size={18} className="info-icon text-muted" />
              <div className="info-data">
                <span className="info-label">Thành viên từ</span>
                <span className="info-value">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* 🛡️ KYC CCCD & BẰNG LÁI CARD (UC04) */}
            <div className="kyc-verifications-card-box mt-4">
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} />
                <span>Hồ Sơ Xác Minh KYC Bằng AI (UC04)</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* 1. CCCD Mặt Trước */}
                <div className="kyc-item-box">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CCCD MẶT TRƯỚC</span>
                  {user.kycDocuments?.cccd ? (
                    <div style={{ marginTop: 4 }}>
                      <span className={`badge-verified ${user.licenseStatus === 'rejected' ? 'badge-rejected-style' : ''}`} style={{ fontSize: '10px', background: user.licenseStatus === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: user.licenseStatus === 'rejected' ? '#ef4444' : '#059669' }}>
                        {user.licenseStatus === 'rejected' ? 'Từ chối ✗' : 'Đã tải lên ✓'}
                      </span>
                      <button type="button" onClick={() => setPreviewImage({ src: user.kycDocuments.cccd, title: 'Mặt trước Căn cước công dân (CCCD)' })} style={{ display: 'block', background: 'none', border: 'none', padding: 0, fontSize: '11px', color: 'var(--accent-primary)', marginTop: 4, textDecoration: 'underline', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>Xem ảnh</button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6 }}>
                      <label className="upload-license-inline-btn" style={{ cursor: 'pointer', fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Upload size={11} />
                        <span>{cccdUploading ? 'Đang tải...' : 'Tải mặt trước'}</span>
                        <input type="file" onChange={(e) => handleKycUpload(e, 'cccd')} accept="image/*" style={{ display: 'none' }} disabled={cccdUploading} />
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. CCCD Mặt Sau */}
                <div className="kyc-item-box">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CCCD MẶT SAU</span>
                  {user.kycDocuments?.cccdBack ? (
                    <div style={{ marginTop: 4 }}>
                      <span className={`badge-verified ${user.licenseStatus === 'rejected' ? 'badge-rejected-style' : ''}`} style={{ fontSize: '10px', background: user.licenseStatus === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: user.licenseStatus === 'rejected' ? '#ef4444' : '#059669' }}>
                        {user.licenseStatus === 'rejected' ? 'Từ chối ✗' : 'Đã tải lên ✓'}
                      </span>
                      <button type="button" onClick={() => setPreviewImage({ src: user.kycDocuments.cccdBack, title: 'Mặt sau Căn cước công dân (CCCD)' })} style={{ display: 'block', background: 'none', border: 'none', padding: 0, fontSize: '11px', color: 'var(--accent-primary)', marginTop: 4, textDecoration: 'underline', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>Xem ảnh</button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6 }}>
                      <label className="upload-license-inline-btn" style={{ cursor: 'pointer', fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Upload size={11} />
                        <span>{cccdUploading ? 'Đang tải...' : 'Tải mặt sau'}</span>
                        <input type="file" onChange={(e) => handleKycUpload(e, 'cccdBack')} accept="image/*" style={{ display: 'none' }} disabled={cccdUploading} />
                      </label>
                    </div>
                  )}
                </div>

                {/* 3. Bằng lái */}
                <div className="kyc-item-box">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>BẰNG LÁI B1/B2/C</span>
                  {user.licenseStatus === 'verified' ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="badge-verified" style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>Đã duyệt ✓</span>
                      {user.licenseImage && <button type="button" onClick={() => setPreviewImage({ src: user.licenseImage, title: 'Bằng lái xe B1/B2/C' })} style={{ display: 'block', background: 'none', border: 'none', padding: 0, fontSize: '11px', color: 'var(--accent-primary)', marginTop: 4, textDecoration: 'underline', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>Xem ảnh</button>}
                    </div>
                  ) : user.licenseStatus === 'pending' ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="badge-pending" style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Chờ duyệt</span>
                    </div>
                  ) : user.licenseStatus === 'rejected' ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="badge-rejected" style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>Từ chối ✗</span>
                      {user.licenseImage && <button type="button" onClick={() => setPreviewImage({ src: user.licenseImage, title: 'Bằng lái xe B1/B2/C' })} style={{ display: 'block', background: 'none', border: 'none', padding: 0, fontSize: '11px', color: 'var(--accent-primary)', marginTop: 4, textDecoration: 'underline', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>Xem ảnh</button>}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6 }}>
                      <label className="upload-license-inline-btn" style={{ cursor: 'pointer', fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Upload size={11} />
                        <span>{licenseUploading ? 'Đang tải...' : 'Tải bằng lái'}</span>
                        <input type="file" onChange={(e) => handleKycUpload(e, 'license')} accept="image/*" style={{ display: 'none' }} disabled={licenseUploading} />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* ⚠️ AI REJECTION FEEDBACK ALERT */}
              {user.kycRejectionReason && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#fda4af', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '10px', fontSize: '12.5px', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={14} />
                    <span>AI Từ chối Xác minh KYC tự động:</span>
                  </span>
                  <span>{user.kycRejectionReason}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }} className="mt-6">
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Chỉnh sửa thông tin
              </button>
              {setCurrentTab && (
                <button type="button" className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-gradient)' }} onClick={() => setCurrentTab('change-password')}>
                  <Key size={16} /> Đổi mật khẩu
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleEditSubmit} className="profile-edit-form">
            <div className="form-group">
              <label className="form-label">Họ và Tên</label>
              <div className="input-container">
                <User className="input-icon" size={18} />
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tiểu sử (Bio)</label>
              <div className="input-container">
                <FileText className="input-icon" style={{ alignSelf: 'flex-start', marginTop: 14 }} size={18} />
                <textarea className="form-input form-textarea" rows="3" value={bio} onChange={(e) => setBio(e.target.value)} style={{ paddingLeft: 42, paddingTop: 12 }} />
              </div>
            </div>

            <div className="edit-form-buttons mt-6">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}><X size={16} /> Hủy</button>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-gradient)' }}><Check size={16} /> Lưu thay đổi</button>
            </div>
          </form>
        )}
      </div>

      {/* 💳 RIGHT BLOCK: PERSONAL WALLET & BANK LINKING CARDS (UC19, UC24) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

        {/* WALLET BALANCE CARD */}
        <div className="glass-card wallet-card-premium">
          <div className="wallet-card-shine"></div>
          <div className="wallet-card-pattern"></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative', zIndex: 2 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={16} />
              <span>Ví Điện Tử Cá Nhân</span>
            </h4>
            <span className="balance-badge-live">Live</span>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: '11px', color: '#b9e6e8', fontWeight: 500 }}>Số dư ví hiện tại</span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: -0.5 }}>{formatCurrency(walletBalance)}</h2>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, position: 'relative', zIndex: 2 }}>
            <button className="btn btn-wallet-action btn-wallet-deposit" onClick={() => { setWalletTxType('deposit'); setShowWalletModal(true); }}>
              <ArrowDownLeft size={16} />
              <span>Nạp Tiền</span>
            </button>
            <button className="btn btn-wallet-action btn-wallet-withdraw" onClick={() => { setWalletTxType('withdraw'); setShowWalletModal(true); }}>
              <ArrowUpRight size={16} />
              <span>Rút Tiền</span>
            </button>
          </div>
        </div>

        {/* BANKING LINK CARD (UC24) */}
        <div className="glass-card" style={{ width: '100%', textAlign: 'left', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Liên Kết Tài Khoản Ngân Hàng</span>
            </h4>
            {!bankAccount && <span style={{ fontSize: '10px', color: '#e11d48', padding: '2px 6px', background: 'rgba(225,29,72,0.08)', borderRadius: 4, fontWeight: 700 }}>Chưa liên kết</span>}
          </div>

          {bankAccount ? (
            <div>
              <div className="linked-bank-card-premium">
                <div className="card-chip-glow"></div>
                <div className="card-header-premium">
                  <span className="card-bank-name">{bankAccount.bankName}</span>
                  <span className="card-type-label">ATM DEBIT</span>
                </div>
                <div className="card-chip-icon">
                  <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="36" height="28" rx="4" fill="url(#chip-grad)" />
                    <path d="M0 6H12M0 14H16M0 22H12" stroke="#1e293b" strokeWidth="1.2" />
                    <path d="M36 6H24M36 14H20M36 22H24" stroke="#1e293b" strokeWidth="1.2" />
                    <path d="M12 0V6M24 0V6M16 28V14M20 28V14" stroke="#1e293b" strokeWidth="1.2" />
                    <rect x="12" y="6" width="12" height="8" rx="1.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.2" />
                    <defs>
                      <linearGradient id="chip-grad" x1="0" y1="0" x2="36" y2="28" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f59e0b" />
                        <stop offset="1" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="card-number-premium">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>{bankAccount.accountNumber.slice(-4) || '1234'}</span>
                </div>
                <div className="card-footer-premium">
                  <div className="card-holder-area">
                    <span className="card-holder-label">CARD HOLDER</span>
                    <span className="card-holder-name">{bankAccount.accountHolder.toUpperCase()}</span>
                  </div>
                  <div className="card-logo-area">
                    <div className="card-logo-circles">
                      <span className="logo-circle-1"></span>
                      <span className="logo-circle-2"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button className="btn-link-reset-premium" onClick={() => setShowBankForm(true)}>Thay đổi tài khoản ngân hàng</button>
              </div>
            </div>
          ) : (
            <div className="bank-placeholder-card">
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Liên kết tài khoản ngân hàng để thực hiện rút tiền cọc và nhận doanh thu từ việc cho thuê xe.</p>
              <button className="btn btn-secondary mt-4" style={{ width: 'auto', padding: '10px 24px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'transparent' }} onClick={() => setShowBankForm(true)}>
                <Link size={14} /> Liên kết ngay
              </button>
            </div>
          )}

          {/* BANK ACCOUNT FORM MODAL DROPDOWN */}
          {showBankForm && (
            <form onSubmit={handleLinkBankSubmit} className="linked-bank-form mt-4" style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Chọn ngân hàng:</label>
                <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="form-input" style={{ padding: '8px 12px', fontSize: '13px' }}>
                  <option value="MBBank">MBBank (Ngân Hàng Quân Đội)</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="ACB">ACB</option>
                </select>
              </div>

              <div className="form-group mt-2">
                <label className="form-label" style={{ fontSize: '11px' }}>Số tài khoản:</label>
                <input type="text" placeholder="Nhập số tài khoản ngân hàng..." className="form-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              </div>

              <div className="form-group mt-2">
                <label className="form-label" style={{ fontSize: '11px' }}>Chủ tài khoản (Viết hoa không dấu):</label>
                <input type="text" placeholder="Ví dụ: NGUYEN VAN A" className="form-input" style={{ padding: '8px 12px', fontSize: '13px', textTransform: 'uppercase' }} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowBankForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '6px 16px', fontSize: '12px' }}>Xác Nhận</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* --- POPUP MODAL: WALLET TRANSACTION (Deposit / Withdraw - UC19) --- */}
      {showWalletModal && (
        <div className="editor-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="editor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="editor-modal-header">
              <h3>{walletTxType === 'deposit' ? 'Nạp Tiền Vào Ví' : 'Rút Tiền Về Ngân Hàng'}</h3>
              <button className="editor-close-btn" onClick={() => setShowWalletModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleWalletTxSubmit} className="editor-modal-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: '12.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={14} className="text-primary" />
                <span>{walletTxType === 'deposit' ? 'Mô phỏng nạp tiền tức thì qua cổng thanh toán liên kết.' : 'Tiền sẽ được giải ngân rút về số tài khoản ngân hàng liên kết.'}</span>
              </div>

              {walletTxType === 'withdraw' && !bankAccount && (
                <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: '12.5px', color: '#fda4af', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} />
                  <span>Vui lòng liên kết tài khoản ngân hàng ở thẻ bên ngoài trước khi rút tiền!</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nhập số tiền giao dịch (VND):</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Ví dụ: 1000000"
                  value={walletTxAmount}
                  onChange={(e) => setWalletTxAmount(e.target.value)}
                  disabled={walletTxType === 'withdraw' && !bankAccount}
                  required
                />
              </div>

              <div className="editor-modal-footer mt-6" style={{ padding: 0, border: 'none', background: 'none' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWalletModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={walletTxType === 'withdraw' && !bankAccount} style={{ width: 'auto', padding: '10px 24px' }}>
                  Xác Nhận Giao Dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PREMIUM CROPPING EDITOR MODAL --- */}
      {showEditor && (
        <div className="editor-modal-overlay">
          <div className="editor-modal-card">
            <div className="editor-modal-header">
              <h3>Chỉnh Sửa & Cắt Ảnh Đại Diện</h3>
              <button className="editor-close-btn" onClick={() => setShowEditor(false)}><X size={20} /></button>
            </div>
            <div className="editor-modal-body">
              <p className="editor-tip">💡 Kéo ảnh để di chuyển, dùng các thanh trượt phía dưới để căn chỉnh ảnh.</p>
              <div className="crop-container" ref={containerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleDragEnd}>
                <canvas ref={canvasRef} width={320} height={320} className="editor-canvas" />
                <div className="crop-overlay-circle"></div>
                <div className="drag-helper-icon"><Move size={24} /></div>
              </div>
              <div className="editor-controls">
                <div className="control-row">
                  <span className="control-label"><ZoomIn size={16} /> Phóng To</span>
                  <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="editor-slider" />
                  <span className="control-value">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="control-row">
                  <span className="control-label"><RotateCw size={16} /> Xoay Ảnh</span>
                  <input type="range" min="0" max="360" step="1" value={rotation} onChange={(e) => setRotation(parseInt(e.target.value))} className="editor-slider" />
                  <span className="control-value">{rotation}°</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><button type="button" onClick={rotate90} className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '13px' }}><RotateCw size={12} /> Xoay nhanh 90°</button></div>
              </div>
            </div>
            <div className="editor-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditor(false)} disabled={avatarLoading}>Hủy bỏ</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveCroppedImage} disabled={avatarLoading}><Check size={18} /> {avatarLoading ? 'Đang lưu...' : 'Áp Dụng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX POPUP PREVIEW KYC DOCUMENTS --- */}
      {previewImage && (
        <div className="kyc-lightbox-overlay" onClick={() => setPreviewImage(null)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="kyc-lightbox-card" onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-secondary, #11131c)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="kyc-lightbox-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
            }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary, #f8fafc)', fontSize: '15px', fontWeight: 700 }}>{previewImage.title}</h4>
              <button className="kyc-close-btn" onClick={() => setPreviewImage(null)} style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}><X size={20} /></button>
            </div>
            <div className="kyc-lightbox-body" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#0a0b10',
              padding: '20px'
            }}>
              <img src={previewImage.src} alt={previewImage.title} style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
