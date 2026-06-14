import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Calendar, FileText, Camera, Edit2, Check, X, Upload, Link, CheckCircle, ZoomIn, RotateCw, Move, ShieldCheck, CreditCard, DollarSign, ArrowDownLeft, ArrowUpRight, ShieldAlert, Key } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

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
  const [previewImage, setPreviewImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { showToast } = useToast();

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

  // CCCD & Bằng lái upload KYC (UC04)
  const handleKycUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ tải lên file hình ảnh.', 'warning');
      return;
    }

    if (type === 'cccdFront' || type === 'cccdBack') setCccdUploading(true);
    else setLicenseUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        let cccdFront = type === 'cccdFront' ? base64Data : null;
        let cccdBack = type === 'cccdBack' ? base64Data : null;
        let license = type === 'license' ? base64Data : null;

        const data = await api.user.uploadKyc(cccdFront, license, null, cccdBack);
        onUpdateUser(data.user);
        showToast(data.message, 'success');
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
                <span className="info-label">Thành viên từ ngày</span>
                <span className="info-value">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* 🛡️ KYC CCCD & BẰNG LÁI CARD (UC04) - Hủy hiển thị đối với Admin/CSKH */}
            {user.role !== 'admin' && user.role !== 'cskh' && (
              <div className="kyc-verifications-card-box">
                <h4 className="kyc-header-title">
                  <ShieldCheck size={18} />
                  <span>Hồ Sơ Xác Minh KYC Danh Tính (UC04)</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* 1. CCCD Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* CCCD Front */}
                    <div className="kyc-item-card">
                      <span className="kyc-title">CCCD MẶT TRƯỚC (QUÉT QR)</span>
                      <div className="kyc-status-container">
                        {user.kycDocuments?.cccd ? (
                          <>
                            <span className="badge-verified" style={{ fontSize: '10px' }}>Đã Tải Lên ✓</span>
                            <button onClick={() => setPreviewImage({ src: user.kycDocuments.cccd, title: 'Căn cước công dân (Mặt trước)' })} className="btn-link-premium-button">
                              <ZoomIn size={12} />
                              <span>Xem mặt trước</span>
                            </button>
                          </>
                        ) : (
                          <label className="kyc-upload-btn-premium">
                            <Upload size={12} />
                            <span>{cccdUploading ? 'Đang tải...' : 'Tải mặt trước'}</span>
                            <input type="file" onChange={(e) => handleKycUpload(e, 'cccdFront')} accept="image/*" style={{ display: 'none' }} disabled={cccdUploading} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* CCCD Back */}
                    <div className="kyc-item-card">
                      <span className="kyc-title">CCCD MẶT SAU</span>
                      <div className="kyc-status-container">
                        {user.kycDocuments?.cccdBack ? (
                          <>
                            <span className="badge-verified" style={{ fontSize: '10px' }}>Đã Tải Lên ✓</span>
                            <button onClick={() => setPreviewImage({ src: user.kycDocuments.cccdBack, title: 'Căn cước công dân (Mặt sau)' })} className="btn-link-premium-button">
                              <ZoomIn size={12} />
                              <span>Xem mặt sau</span>
                            </button>
                          </>
                        ) : (
                          <label className="kyc-upload-btn-premium">
                            <Upload size={12} />
                            <span>{cccdUploading ? 'Đang tải...' : 'Tải mặt sau'}</span>
                            <input type="file" onChange={(e) => handleKycUpload(e, 'cccdBack')} accept="image/*" style={{ display: 'none' }} disabled={cccdUploading} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Bằng lái Row */}
                  <div className="kyc-item-card">
                    <span className="kyc-title">BẰNG LÁI XE HẠNG B1/B2</span>
                    <div className="kyc-status-container">
                      {user.licenseStatus === 'verified' ? (
                        <>
                          <span className="kyc-badge-premium verified">Đã Xác Minh ✓</span>
                          {user.licenseImage && (
                            <button onClick={() => setPreviewImage({ src: user.licenseImage, title: 'Bằng lái xe B1/B2' })} className="btn-link-premium-button">
                              <ZoomIn size={12} />
                              <span>Xem bằng lái</span>
                            </button>
                          )}
                        </>
                      ) : user.licenseStatus === 'pending' ? (
                        <span className="kyc-badge-premium pending">Đang chờ duyệt</span>
                      ) : (
                        <label className="kyc-upload-btn-premium" style={{ color: '#fda4af', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.04)' }}>
                          <Upload size={12} />
                          <span>{licenseUploading ? 'Đang tải...' : 'Tải bằng lái xe'}</span>
                          <input type="file" onChange={(e) => handleKycUpload(e, 'license')} accept="image/*" style={{ display: 'none' }} disabled={licenseUploading} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }} className="mt-6">
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Chỉnh sửa thông tin
              </button>
              {setCurrentTab && (
                <button type="button" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }} onClick={() => setCurrentTab('change-password')}>
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
              <button type="submit" className="btn btn-primary"><Check size={16} /> Lưu thay đổi</button>
            </div>
          </form>
        )}
      </div>

      {/* 💳 RIGHT BLOCK: PERSONAL WALLET & BANK LINKING CARDS (UC19, UC24) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        
        {/* WALLET BALANCE CARD */}
        <div className="glass-card wallet-card-premium" style={{ width: '100%', textAlign: 'left', padding: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarSign size={16} />
              <span>Ví Điện Tử Cá Nhân (UC19)</span>
            </h4>
            <span className="balance-badge-live">Live</span>
          </div>

          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Số dư ví hiện tại</span>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'white', marginTop: 4, letterSpacing: -0.5 }}>{formatCurrency(walletBalance)}</h2>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => { setWalletTxType('deposit'); setShowWalletModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <ArrowDownLeft size={16} />
              <span>Nạp Tiền</span>
            </button>
            <button className="btn btn-secondary" onClick={() => { setWalletTxType('withdraw'); setShowWalletModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ArrowUpRight size={16} />
              <span>Rút Tiền</span>
            </button>
          </div>
        </div>

        {/* BANKING LINK CARD (UC24) */}
        <div className="glass-card" style={{ width: '100%', textAlign: 'left', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={16} className="text-info" />
              <span>Liên Kết Tài Khoản Ngân Hàng (UC24)</span>
            </h4>
            {!bankAccount && <span style={{ fontSize: '10px', color: '#fda4af', padding: '2px 6px', background: 'rgba(244,63,94,0.1)', borderRadius: 4, fontWeight: 700 }}>Chưa liên kết</span>}
          </div>

          {bankAccount ? (
            <div className="linked-bank-info-box" style={{ background: '#0a0b10', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>NGÂN HÀNG LIÊN KẾT</span>
              <strong style={{ fontSize: '15px', color: '#818cf8', display: 'block', marginTop: 2 }}>{bankAccount.bankName}</strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <div>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>SỐ TÀI KHOẢN</span>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: 6, display: 'block' }}>{bankAccount.accountNumber}</span>
                </div>
                <div>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>CHỦ TÀI KHOẢN</span>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: 6, display: 'block', textTransform: 'uppercase' }}>{bankAccount.accountHolder}</span>
                </div>
              </div>

              <button className="btn-link-reset mt-4" onClick={() => setShowBankForm(true)} style={{ fontSize: '12px', padding: 0 }}>Thay đổi tài khoản</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Liên kết tài khoản ngân hàng để thực hiện rút tiền cọc và tiền doanh thu thuê xe.</p>
              <button className="btn btn-secondary mt-4" onClick={() => setShowBankForm(true)}>Liên kết ngay</button>
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

      {/* --- PREVIEW DOCUMENT MODAL --- */}
      {previewImage && (
        <div className="editor-modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="editor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="editor-modal-header">
              <h3>{previewImage.title}</h3>
              <button className="editor-close-btn" onClick={() => setPreviewImage(null)}><X size={20} /></button>
            </div>
            <div className="editor-modal-body" style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#050508', alignItems: 'center' }}>
              <img src={previewImage.src} alt={previewImage.title} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div className="editor-modal-footer" style={{ padding: '12px 24px', background: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'flex-end', margin: 0 }}>
              <button className="btn btn-secondary" onClick={() => setPreviewImage(null)} style={{ width: 'auto' }}>Đóng</button>
            </div>
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
    </div>
  );
};

// Inject CSS styles for Profile details & HTML5 Canvas Editor
const injectProfileStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'profile-styles';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.id = styleId;
  style.textContent = `
    .profile-header-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .avatar-wrapper {
      position: relative;
      width: 110px;
      height: 110px;
    }

    .profile-avatar-large {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid rgba(99, 102, 241, 0.4);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
    }

    .loading-blur {
      filter: blur(4px) brightness(0.6);
    }

    .avatar-change-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      background: #6366f1;
      border: 2px solid var(--bg-secondary);
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transition: all 0.2s;
    }

    .avatar-change-badge:hover {
      background: #4f46e5;
      transform: scale(1.1);
    }

    .profile-title-area {
      text-align: center;
    }

    .profile-name-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .profile-name {
      font-size: 22px;
      font-weight: 800;
      color: var(--text-primary);
    }

    .user-role-badge-pill {
      display: inline-block;
      margin-top: 6px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #c084fc;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 99px;
    }

    .badge-verified {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      display: inline-flex;
      align-items: center;
    }

    .profile-email-sub {
      color: var(--text-secondary);
      font-size: 14px;
      margin-top: 4px;
    }

    .profile-divider {
      border: none;
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 24px 0;
    }

    /* Avatar Selector Drawer */
    .avatar-selector-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
      animation: fadeIn 0.2s ease-out;
      text-align: left;
    }

    .selector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .selector-header h4 {
      font-size: 14px;
      font-weight: 700;
      color: #cbd5e1;
    }

    .btn-close-selector {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .btn-close-selector:hover {
      color: #f8fafc;
      background: rgba(255,255,255,0.05);
    }

    .preset-title {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .preset-avatars-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
    }

    .preset-item {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 50%;
      object-fit: cover;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .preset-item:hover {
      transform: scale(1.08);
      border-color: rgba(99,102,241,0.5);
    }

    .preset-item.active {
      border-color: #6366f1;
      box-shadow: 0 0 10px rgba(99,102,241,0.3);
    }

    .selector-divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: #64748b;
      font-size: 11px;
      margin: 12px 0;
    }

    .selector-divider::before, .selector-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .selector-divider::before { margin-right: 8px; }
    .selector-divider::after { margin-left: 8px; }

    .upload-container {
      display: flex;
      justify-content: center;
    }

    .upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99,102,241,0.1);
      border: 1px dashed rgba(99,102,241,0.4);
      color: #818cf8;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upload-btn:hover {
      background: rgba(99,102,241,0.18);
      color: white;
      border-color: rgba(99,102,241,0.6);
    }

    .url-avatar-form {
      display: flex;
      gap: 8px;
    }

    /* Info Grid */
    .profile-info-grid {
      display: flex;
      flex-direction: column;
      gap: 18px;
      text-align: left;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .info-icon {
      margin-top: 4px;
      color: #64748b;
      flex-shrink: 0;
    }

    .info-data {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
    }

    .info-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .info-value {
      font-size: 15px;
      color: var(--text-primary);
      font-weight: 700;
    }

    .info-value.bio-text {
      font-weight: 500;
      color: var(--text-secondary);
      font-style: italic;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .edit-form-buttons {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 12px;
    }

    /* --- PREMIUM EDITOR MODAL STYLES --- */
    .editor-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(5, 5, 8, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: editorFadeIn 0.25s ease-out;
      padding: 16px;
    }

    .editor-modal-card {
      background: #11131c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      border-radius: 16px;
      width: 100%;
      max-width: 440px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: editorScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .editor-modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editor-modal-header h3 {
      font-size: 16px;
      font-weight: 700;
      background: linear-gradient(135deg, #f8fafc 30%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .editor-close-btn {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .editor-close-btn:hover {
      color: white;
      background: rgba(255, 255, 255, 0.05);
    }

    .editor-modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .editor-tip {
      font-size: 12px;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.15);
      padding: 8px 12px;
      border-radius: 8px;
      width: 100%;
      margin-bottom: 20px;
      text-align: left;
    }

    /* Cropper Container */
    .crop-container {
      position: relative;
      width: 320px;
      height: 320px;
      border-radius: 12px;
      overflow: hidden;
      cursor: grab;
      background: #050508;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .crop-container:active {
      cursor: grabbing;
    }

    .editor-canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Circular overlay simulating the avatar shape */
    .crop-overlay-circle {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 50%;
      border: 2px solid #6366f1;
      box-shadow: 0 0 0 9999px rgba(5, 5, 8, 0.7);
      pointer-events: none;
      transition: border-color 0.2s;
    }

    .crop-container:hover .crop-overlay-circle {
      border-color: #a855f7;
    }

    .drag-helper-icon {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(5, 5, 8, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .crop-container:hover .drag-helper-icon {
      opacity: 1;
    }

    /* Control Sliders */
    .editor-controls {
      width: 100%;
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .control-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      text-align: left;
    }

    .control-label {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      width: 90px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .editor-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      border-radius: 99px;
      background: #171a26;
      outline: none;
      cursor: pointer;
    }

    .editor-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #6366f1;
      border: 2px solid white;
      transition: transform 0.1s;
    }

    .editor-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      background: #a855f7;
    }

    .control-value {
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      width: 42px;
      text-align: right;
    }

    .editor-modal-footer {
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.01);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 12px;
    }

    .balance-badge-live {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Premium KYC Redesign Styles */
    .kyc-verifications-card-box {
      background: var(--bg-secondary) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: var(--radius-lg) !important;
      padding: 24px !important;
      margin-top: 24px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
      transition: all 0.3s var(--transition-normal) !important;
    }
    
    .kyc-header-title {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: var(--accent-primary) !important;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
      text-align: left;
    }

    .kyc-item-card {
      text-align: left;
      background: var(--bg-primary);
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100px;
    }

    .kyc-item-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 150, 152, 0.3);
      box-shadow: 0 8px 20px rgba(0, 150, 152, 0.05);
      background: var(--bg-secondary);
    }

    .kyc-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: block;
      margin-bottom: 6px;
    }

    .kyc-status-container {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .kyc-badge-premium {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .kyc-badge-premium.verified {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #059669;
    }

    .kyc-badge-premium.pending {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #d97706;
    }

    .kyc-badge-premium.unuploaded {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }

    .kyc-link-premium {
      font-size: 12px;
      color: var(--accent-primary);
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
      width: fit-content;
      margin-top: 6px;
    }

    .kyc-link-premium:hover {
      color: var(--accent-secondary);
      text-decoration: underline;
    }

    .btn-link-premium-button {
      background: rgba(0, 150, 152, 0.05) !important;
      border: 1px solid rgba(0, 150, 152, 0.15) !important;
      color: var(--accent-primary) !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      padding: 8px 16px !important;
      border-radius: var(--radius-md) !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      cursor: pointer !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      margin-top: 10px !important;
      width: 100% !important;
      font-family: var(--font-primary) !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01) !important;
      outline: none !important;
    }

    .btn-link-premium-button:hover {
      background: var(--accent-gradient) !important;
      color: white !important;
      border-color: transparent !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(0, 150, 152, 0.18) !important;
    }

    .kyc-upload-btn-premium {
      cursor: pointer;
      font-size: 11px;
      color: var(--accent-primary);
      font-weight: 700;
      display: inline-flex;
      gap: 6px;
      align-items: center;
      padding: 6px 12px;
      background: rgba(0, 150, 152, 0.06);
      border: 1px dashed rgba(0, 150, 152, 0.3);
      border-radius: var(--radius-sm);
      transition: all 0.2s;
      width: fit-content;
      margin-top: 8px;
    }

    .kyc-upload-btn-premium:hover {
      background: var(--accent-gradient);
      color: white;
      border-style: solid;
      border-color: transparent;
      box-shadow: 0 4px 10px rgba(0, 150, 152, 0.2);
    }

    @keyframes editorFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes editorScaleIn {
      from { transform: scale(0.9) translateY(10px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    @media (max-width: 900px) {
      .profile-container-glass-row {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
};

injectProfileStyles();
