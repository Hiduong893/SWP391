import React, { useState, useRef } from 'react';
import { XCircle, Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, FileText, Image as ImageIcon, FolderPlus, PlusCircle, Link as LinkIcon, Info, RotateCcw } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export const InspectionModal = ({ booking, user, onClose, onInspectionUpdated }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const parsedOut = typeof booking?.inspectionCheckout === 'string' ? JSON.parse(booking.inspectionCheckout) : booking?.inspectionCheckout;
      const parsedIn = typeof booking?.inspectionCheckin === 'string' ? JSON.parse(booking.inspectionCheckin) : booking?.inspectionCheckin;
      if (parsedOut?.aiReport || parsedIn?.aiReport) return 'ai_report';
      if (parsedOut?.photos?.length > 0) return 'checkout';
      if (parsedIn?.photos?.length > 0) return 'checkin';
    } catch (e) {}
    return 'checkin';
  });
  
  // Safely initialize checkin photos from booking
  const [checkinImgs, setCheckinImgs] = useState(() => {
    if (booking?.inspectionCheckin) {
      try {
        const parsed = typeof booking.inspectionCheckin === 'string' ? JSON.parse(booking.inspectionCheckin) : booking.inspectionCheckin;
        if (parsed && Array.isArray(parsed.photos)) return parsed.photos;
      } catch (e) {}
    }
    return booking?.inspection?.checkinPhotos || booking?.checkinPhotos || [];
  });

  // Safely initialize checkout photos from booking
  const [checkoutImgs, setCheckoutImgs] = useState(() => {
    if (booking?.inspectionCheckout) {
      try {
        const parsed = typeof booking.inspectionCheckout === 'string' ? JSON.parse(booking.inspectionCheckout) : booking.inspectionCheckout;
        if (parsed && Array.isArray(parsed.photos)) return parsed.photos;
      } catch (e) {}
    }
    return booking?.inspection?.checkoutPhotos || booking?.checkoutPhotos || [];
  });

  const [notes, setNotes] = useState(() => {
    try {
      const parsedOut = typeof booking?.inspectionCheckout === 'string' ? JSON.parse(booking.inspectionCheckout) : booking?.inspectionCheckout;
      if (parsedOut && parsedOut.notes) return parsedOut.notes;
      const parsedIn = typeof booking?.inspectionCheckin === 'string' ? JSON.parse(booking.inspectionCheckin) : booking?.inspectionCheckin;
      if (parsedIn && parsedIn.notes) return parsedIn.notes;
    } catch (e) {}
    return booking?.inspection?.notes || booking?.inspectionNotes || '';
  });

  const [newImgUrl, setNewImgUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aiReport, setAiReport] = useState(() => {
    try {
      const parsedOut = typeof booking?.inspectionCheckout === 'string' ? JSON.parse(booking.inspectionCheckout) : booking?.inspectionCheckout;
      if (parsedOut && parsedOut.aiReport) return parsedOut.aiReport;
      const parsedIn = typeof booking?.inspectionCheckin === 'string' ? JSON.parse(booking.inspectionCheckin) : booking?.inspectionCheckin;
      if (parsedIn && parsedIn.aiReport) return parsedIn.aiReport;
    } catch (e) {}
    return booking?.inspection?.aiReport || null;
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleReset = () => {
    if (checkinImgs.length === 0 && checkoutImgs.length === 0 && !aiReport) {
      showToast('Hiện chưa có hình ảnh hoặc báo cáo nào để đặt lại.', 'info');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả ảnh hiện tại và báo cáo AI để chọn/gửi lại ảnh mới không?')) {
      setCheckinImgs([]);
      setCheckoutImgs([]);
      setAiReport(null);
      setNotes('');
      setActiveTab('checkin');
      showToast('Đã làm mới dữ liệu! Vui lòng tải lên danh sách ảnh mới.', 'success');
    }
  };

  // Promise wrapper for reading file as Data URL (Base64)
  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Process selected or dropped image files
  const processFiles = async (files, type) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      showToast('Vui lòng chọn các file hình ảnh hợp lệ (PNG, JPG, WEBP)!', 'error');
      return;
    }

    try {
      const newBase64Images = await Promise.all(validFiles.map(file => readFileAsDataURL(file)));
      if (type === 'checkin') {
        setCheckinImgs(prev => [...prev, ...newBase64Images]);
      } else {
        setCheckoutImgs(prev => [...prev, ...newBase64Images]);
      }
      showToast(`Đã thêm thành công ${newBase64Images.length} ảnh!`, 'success');
    } catch (err) {
      console.error('File reading error:', err);
      showToast('Có lỗi xảy ra khi đọc file ảnh.', 'error');
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, activeTab);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, activeTab);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleAddImageUrl = (type) => {
    if (!newImgUrl.trim()) {
      showToast('Vui lòng nhập hoặc dán đường dẫn hình ảnh (URL)!', 'error');
      return;
    }
    if (type === 'checkin') {
      setCheckinImgs(prev => [...prev, newImgUrl.trim()]);
    } else {
      setCheckoutImgs(prev => [...prev, newImgUrl.trim()]);
    }
    setNewImgUrl('');
    showToast('Đã thêm hình ảnh từ URL!', 'success');
  };

  const handleRemoveImage = (type, index) => {
    if (type === 'checkin') {
      setCheckinImgs(prev => prev.filter((_, i) => i !== index));
    } else {
      setCheckoutImgs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAnalyzeAI = async () => {
    if (checkinImgs.length === 0 && checkoutImgs.length === 0) {
      showToast('Cần ít nhất 1 ảnh bàn giao để AI quét và phân tích!', 'warning');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await api.bookings.analyzeInspection(booking.id, {
        checkinPhotos: checkinImgs,
        checkoutPhotos: checkoutImgs,
        notes
      });
      if (res && res.report) {
        setAiReport(res.report);
        setActiveTab('ai_report');
        showToast('Phân tích bàn giao xe bằng Gemini AI thành công!', 'success');
      } else {
        showToast(res.message || 'Phân tích thành công!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi khi phân tích hình ảnh AI.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveInspection = async () => {
    setSaving(true);
    try {
      const payload = {
        inspectionType: activeTab === 'ai_report' ? 'checkin' : activeTab,
        photos: activeTab === 'checkout' ? checkoutImgs : checkinImgs,
        checkinPhotos: checkinImgs,
        checkoutPhotos: checkoutImgs,
        notes,
        aiReport
      };
      const res = await api.bookings.saveInspection(booking.id, payload);
      showToast(res.message || 'Đã lưu biên bản bàn giao hình ảnh xe!', 'success');
      if (onInspectionUpdated) onInspectionUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi lưu biên bản bàn giao.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDisputeDirectly = async () => {
    setSaving(true);
    try {
      // 1. Save inspection first
      const payload = {
        inspectionType: activeTab === 'ai_report' ? 'checkin' : activeTab,
        photos: activeTab === 'checkout' ? checkoutImgs : checkinImgs,
        checkinPhotos: checkinImgs,
        checkoutPhotos: checkoutImgs,
        notes,
        aiReport
      };
      await api.bookings.saveInspection(booking.id, payload);

      // 2. Submit dispute to Admin
      const description = `[Báo cáo sự cố từ Biên Bản AI]: ${aiReport?.aiAssessment || notes || 'Phát hiện va chạm/hư hỏng phương tiện khi bàn giao trả xe.'} ${aiReport?.suggestedCompensation ? 'Chi phí đền bù đề xuất: ' + aiReport.suggestedCompensation.toLocaleString('vi-VN') + 'đ' : 'Cần giám định lại mẫu xe'}`;
      await api.support.createDispute({ bookingId: booking.id, description });

      showToast('Đã lưu biên bản & chuyển hồ sơ khiếu nại tới Admin ViVuCar xử lý!', 'success');
      if (onInspectionUpdated) onInspectionUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi khi nộp đơn khiếu nại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const carName = booking?.car ? `${booking.car.brand} ${booking.car.model}` : (booking?.carName || 'Phương tiện thuê');
  const carImage = booking?.car?.image || booking?.carImage || booking?.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500';

  return (
    <div
      className="lightbox-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 9999 }}
    >
      <div
        className="lightbox-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '840px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          background: '#ffffff'
        }}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          onClick={(e) => e.stopPropagation()}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
        />

        {/* Rich Dark Sapphire & Indigo Gradient Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Registered Vehicle Photo Thumbnail */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid #38bdf8',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
              background: '#0f172a',
              flexShrink: 0
            }}>
              <img
                src={carImage}
                alt={carName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500';
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '17.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                  Biên Bản Hình Ảnh Bàn Giao Xe
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                Đơn hàng #{booking?.id} • Xe hợp đồng: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{carName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <XCircle size={22} />
          </button>
        </div>

        {/* Modern Square Pill Tab Switcher Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '10px 20px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('checkin')}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '10px',
                background: activeTab === 'checkin' ? '#2563eb' : 'transparent',
                color: activeTab === 'checkin' ? '#ffffff' : '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'checkin' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <ImageIcon size={15} /> Check-in Nhận Xe ({checkinImgs.length})
            </button>

            <button
              onClick={() => setActiveTab('checkout')}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '10px',
                background: activeTab === 'checkout' ? '#059669' : 'transparent',
                color: activeTab === 'checkout' ? '#ffffff' : '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'checkout' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Camera size={15} /> Check-out Trả Xe ({checkoutImgs.length})
            </button>

            <button
              onClick={() => setActiveTab('ai_report')}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: '10px',
                background: activeTab === 'ai_report' ? '#7c3aed' : 'transparent',
                color: activeTab === 'ai_report' ? '#ffffff' : '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'ai_report' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Sparkles size={15} /> Đánh Giá Gemini AI {aiReport ? '✓' : ''}
            </button>
          </div>

          {(checkinImgs.length > 0 || checkoutImgs.length > 0 || aiReport) && (
            <button
              type="button"
              onClick={handleReset}
              title="Xóa toàn bộ ảnh & kết quả AI để chọn/gửi lại ảnh mới"
              style={{
                padding: '8px 14px',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <RotateCcw size={14} /> Gửi ảnh mới (Reset)
            </button>
          )}
        </div>


        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, maxHeight: '62vh' }}>
          {/* TAB 1 & TAB 2: CHECKIN / CHECKOUT IMAGES */}
          {(activeTab === 'checkin' || activeTab === 'checkout') && (
            <div>
              {/* UNIFIED COMPACT DROPZONE */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                style={{
                  border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`,
                  background: isDragging ? '#eff6ff' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  marginBottom: '8px'
                }}>
                  <Upload size={22} />
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Kéo & Thả ảnh vào đây hoặc{' '}
                  <span style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>
                    Chọn ảnh từ máy
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  🚗 Vui lòng tải đúng ảnh của xe <strong style={{ color: '#0284c7' }}>{carName}</strong>. Nên chụp rõ 4 góc ngoại thất, cản xe, lốp xe & Odometer.
                </p>
              </div>

              {/* URL INPUT TOGGLE BUTTON */}
              <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <LinkIcon size={14} /> {showUrlInput ? 'Ẩn ô dán URL ảnh' : 'Hoặc dán đường dẫn ảnh (URL)'}
                </button>
              </div>

              {/* OPTIONAL COMPACT URL INPUT BAR */}
              {showUrlInput && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <input
                    type="url"
                    placeholder="Dán URL hình ảnh tại đây (http://...)..."
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl(activeTab);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddImageUrl(activeTab);
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <PlusCircle size={15} /> Thêm URL
                  </button>
                </div>
              )}

              {/* Gallery Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '14px'
              }}>
                {(activeTab === 'checkin' ? checkinImgs : checkoutImgs).map((url, idx) => (
                  <div key={idx} style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    height: '130px',
                    background: '#000'
                  }}>
                    <img src={url} alt={`Inspection ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(activeTab, idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Notes input */}
              <div style={{ marginTop: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Ghi chú tình trạng xe (Vết trầy xước, mức nhiên liệu, lốp...):
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: GEMINI AI REPORT */}
          {activeTab === 'ai_report' && (
            <div>
              {aiReport ? (
                <div>
                  {/* Car Model Matching Verification Alert Box */}
                  {(aiReport.carMatch === false || aiReport.carMismatchWarning) ? (
                    <div style={{
                      background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                      border: '2px solid #fca5a5',
                      borderRadius: '20px',
                      padding: '24px',
                      marginBottom: '20px',
                      boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.15)',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'inline-flex', padding: '12px', background: '#fee2e2', borderRadius: '50%', marginBottom: '12px' }}>
                        <AlertTriangle size={36} style={{ color: '#e11d48' }} />
                      </div>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800, color: '#9f1239' }}>
                        CẢNH BÁO: SAI MẪU XE BÀN GIAO!
                      </h4>
                      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#be123c', lineHeight: 1.6 }}>
                        AI phát hiện ảnh tải lên là xe <strong style={{ color: '#e11d48', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>{aiReport.detectedCarModel || 'Xe khác / Sai chủng loại'}</strong>, không đúng với mẫu xe <strong style={{ color: '#2563eb', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>{carName}</strong> của hợp đồng.
                      </p>
                      <div style={{
                        background: '#ffffff',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: '1px solid #fecaca',
                        fontSize: '13px',
                        color: '#881337',
                        marginBottom: '20px',
                        textAlign: 'left',
                        lineHeight: 1.5
                      }}>
                        {aiReport.carMismatchWarning || 'Hệ thống từ chối thẩm định vết xước & chi phí đền bù đối với phương tiện không trùng khớp hợp đồng. Vui lòng kiểm tra và chụp lại ảnh xe chuẩn.'}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('checkin')}
                        style={{
                          background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 24px',
                          fontWeight: 800,
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Camera size={18} /> Tải Lại Ảnh Xe Đúng Hợp Đồng ({carName})
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Valid car match - show green badge & full detailed damage assessment */}
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#166534'
                      }}>
                        <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                          ✓ Xác thực AI: Mẫu xe trùng khớp 100% với hợp đồng ({aiReport.detectedCarModel || carName})
                        </span>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        border: '1px solid #ddd6fe',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={22} style={{ color: '#7c3aed' }} />
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#5b21b6' }}>
                              Báo Cáo Thẩm Định Thiệt Hại Gemini AI
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={handleReset}
                              title="Xóa kết quả & gửi ảnh mới"
                              style={{
                                background: '#ffffff',
                                border: '1px solid #7c3aed',
                                color: '#7c3aed',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <RotateCcw size={13} /> Gửi lại ảnh mới
                            </button>
                            <span style={{
                              background: '#7c3aed',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 800,
                              padding: '4px 12px',
                              borderRadius: '20px'
                            }}>
                              Điểm toàn vẹn: {aiReport.healthScore || 95}/100
                            </span>
                          </div>
                        </div>

                        <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#4c1d95', fontWeight: 600 }}>
                          Tình trạng chung: <strong>{aiReport.overallCondition}</strong>
                        </p>

                        <p style={{ margin: 0, fontSize: '13px', color: '#5b21b6', lineHeight: 1.5 }}>
                          {aiReport.aiAssessment}
                        </p>
                      </div>

                      {/* Issues Detected */}
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                        Danh sách chi tiết vết trầy xước / biến dạng phát hiện:
                      </h4>
                      {aiReport.detectedIssues && aiReport.detectedIssues.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                          {aiReport.detectedIssues.map((issue, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: issue.isNew ? '#fef2f2' : '#f8fafc',
                              border: `1px solid ${issue.isNew ? '#fecaca' : '#e2e8f0'}`,
                              borderRadius: '12px',
                              padding: '12px 16px'
                            }}>
                              <div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  📍 {issue.part}: {issue.type}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: issue.isNew ? '#dc2626' : '#64748b',
                                    background: issue.isNew ? '#fee2e2' : '#e2e8f0',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    {issue.isNew ? '⚠️ Phát sinh MỚI' : '✓ Vết cũ sẵn có'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>Mức độ: {issue.severity}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: Number(issue?.estimatedCost) > 0 ? '#dc2626' : '#16a34a' }}>
                                  {Number(issue?.estimatedCost) > 0 ? `${Number(issue.estimatedCost).toLocaleString('vi-VN')} đ` : 'Không tính phí'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginBottom: '20px' }}>
                          ✓ Không phát hiện vết trầy xước hay đền bù hư hỏng nào.
                        </p>
                      )}

                      {Number(aiReport?.suggestedCompensation) > 0 && (
                        <div style={{
                          background: '#fff1f2',
                          border: '1px solid #ffe4e6',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#be123c' }}>
                            Tổng chi phí đền bù đề xuất:
                          </span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#e11d48' }}>
                            {Number(aiReport.suggestedCompensation).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      )}

                      {/* Operational Workflow Guidance Banner */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        fontSize: '12.5px',
                        color: '#475569',
                        lineHeight: 1.6
                      }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Info size={16} style={{ color: '#2563eb' }} /> QUY TRÌNH XỬ LÝ BIÊN BẢN BÀN GIAO & HƯ HỎNG:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          <li><strong>Bước 1 - Lưu hồ sơ:</strong> Bấm <em>"Lưu Biên Bản Bàn Giao"</em> ở dưới để lưu toàn bộ ảnh thực tế & Báo cáo AI làm bằng chứng pháp lý trong Hợp đồng điện tử.</li>
                          <li><strong>Bước 2 - Thỏa thuận:</strong> Khách thuê & Chủ xe đối chiếu chi phí đền bù đề xuất để tự thống nhất thanh toán đền bù.</li>
                          <li><strong>Bước 3 - Can thiệp Admin (Nếu có tranh chấp):</strong> Nếu không đồng ý chi phí hoặc gặp sự cố nặng, bấm <em>"Gửi Khiếu Nại"</em> tại trang Chuyến đi để <strong>Đội ngũ Admin/CSKH ViVuCar</strong> trực tiếp làm việc với Hãng xe & Giám định viên.</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Sparkles size={44} style={{ color: '#8b5cf6', marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Quét & Thẩm Định Hình Ảnh Với AI Gemini
                  </h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                    AI sẽ tự động so sánh điểm ảnh Check-in và Check-out để phát hiện chính xác vết xước phát sinh mới và tính toán đền bù minh bạch.
                  </p>
                  <button
                    type="button"
                    onClick={handleAnalyzeAI}
                    disabled={analyzing}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Sparkles size={18} /> {analyzing ? 'Đang phân tích AI...' : 'Chạy Phân Tích Gemini Vision'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div>
            {aiReport && (aiReport.suggestedCompensation > 0 || aiReport.carMatch === false) && (
              <button
                type="button"
                onClick={handleCreateDisputeDirectly}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertTriangle size={16} /> {saving ? 'Đang chuyển hồ sơ...' : '🚨 Báo Cáo Sự Cố Cho Admin'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {(checkinImgs.length > 0 || checkoutImgs.length > 0 || aiReport) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || analyzing}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <RotateCcw size={15} /> Gửi ảnh mới (Reset)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveInspection}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu Biên Bản Bàn Giao'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
