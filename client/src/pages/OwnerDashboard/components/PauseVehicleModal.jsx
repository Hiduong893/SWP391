import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export const PauseVehicleModal = ({ vehicle, isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('Bảo dưỡng định kỳ');
  const [duration, setDuration] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const inlineStyles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '100%' },
    modalTitle: { margin: '0 0 15px', fontSize: '18px' },
    modalText: { marginBottom: '15px' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    button: { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    buttonPrimary: { backgroundColor: '#2563eb', color: '#fff' },
    buttonSecondary: { backgroundColor: '#e5e7eb', color: '#374151' }
  };

  return (
    <div style={inlineStyles.overlay}>
      <div style={{...inlineStyles.modal, maxWidth: '450px'}}>
        <h3 style={{...inlineStyles.modalTitle, display: 'flex', alignItems: 'center' }}><AlertTriangle size={20} style={{ marginRight: 8, color: '#f59e0b' }} />Tạm dừng cho thuê xe</h3>
        <p style={inlineStyles.modalText}>Bạn sắp tạm dừng cho thuê xe <strong>{vehicle.model}</strong>. Vui lòng cung cấp lý do.</p>
        <div style={inlineStyles.formGroup}>
          <label style={inlineStyles.label}>Lý do tạm dừng</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={inlineStyles.input}>
            <option>Bảo dưỡng định kỳ</option> <option>Sửa chữa hư hỏng</option>
            <option>Sử dụng cho mục đích cá nhân</option> <option>Lý do khác</option>
          </select>
        </div>
        <div style={inlineStyles.formGroup}>
          <label style={inlineStyles.label}>Tạm dừng đến ngày (bỏ trống nếu vô hạn)</label>
          <input type="date" value={duration} onChange={(e) => setDuration(e.target.value)} style={inlineStyles.input} />
        </div>
        <div style={inlineStyles.modalActions}>
          <button onClick={onClose} style={{ ...inlineStyles.button, ...inlineStyles.buttonSecondary }}>Hủy</button>
          <button onClick={handleConfirm} style={{ ...inlineStyles.button, ...inlineStyles.buttonPrimary }}>Xác nhận Tạm dừng</button>
        </div>
      </div>
    </div>
  );
};
