import React from 'react';
import { Play, Pause, Edit, Trash2 } from 'lucide-react';

export const OwnerVehicleTable = ({ vehicles = [], onEdit, onDelete, onToggleStatus, onPauseClick }) => {
  const inlineStyles = {
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' },
    td: { padding: '12px', borderBottom: '1px solid #e5e7eb' },
    vehicleImage: { width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', marginRight: '10px' },
    badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
    actions: { display: 'flex', gap: '8px' },
    actionButton: { padding: '4px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' },
    pauseButton: { color: '#f59e0b', backgroundColor: '#fef3c7' },
    playButton: { color: '#10b981', backgroundColor: '#d1fae5' },
    editButton: { color: '#3b82f6', backgroundColor: '#dbeafe' },
    deleteButton: { color: '#ef4444', backgroundColor: '#fee2e2' }
  };

  const StatusBadge = ({ status }) => {
    const statusMap = {
      available: { label: 'Sẵn sàng', styles: { background: '#dcfce7', color: '#166534' } },
      rented: { label: 'Đang thuê', styles: { background: '#dbeafe', color: '#1e40af' } },
      inactive: { label: 'Tạm dừng', styles: { background: '#f1f5f9', color: '#475569' } },
      pending_moderation: { label: 'Chờ duyệt', styles: { background: '#fef9c3', color: '#92400e' } },
      rejected: { label: 'Bị từ chối', styles: { background: '#fee2e2', color: '#991b1b' } },
    };
    const { label, styles: badgeStyles } = statusMap[status] || { label: status, styles: {} };
    return <span style={{ ...inlineStyles.badge, ...badgeStyles }}>{label}</span>;
  };

  return (
    <div style={inlineStyles.tableContainer}>
      <table style={inlineStyles.table}>
        <thead>
          <tr>
            <th style={inlineStyles.th}>Phương tiện</th>
            <th style={inlineStyles.th}>Đơn giá / ngày</th>
            <th style={inlineStyles.th}>Trạng thái</th>
            <th style={inlineStyles.th}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td style={inlineStyles.td}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src={vehicle.image} alt={vehicle.model} style={inlineStyles.vehicleImage} />
                  <span style={{ fontWeight: '600' }}>{vehicle.brand} {vehicle.model}</span>
                </div>
              </td>
              <td style={{...inlineStyles.td, fontWeight: '600', color: 'var(--accent-primary)'}}>{new Intl.NumberFormat('vi-VN').format(vehicle.pricePerDay)}đ</td>
              <td style={inlineStyles.td}><StatusBadge status={vehicle.status} /></td>
              <td style={inlineStyles.td}>
                <div style={inlineStyles.actions}>
                  {vehicle.status === 'available' && (
                    <button onClick={() => onPauseClick(vehicle)} style={{ ...inlineStyles.actionButton, ...inlineStyles.pauseButton }} title="Tạm dừng cho thuê"><Pause size={16} /></button>
                  )}
                  {vehicle.status === 'inactive' && (
                    <button onClick={() => onToggleStatus(vehicle.id, vehicle.status)} style={{ ...inlineStyles.actionButton, ...inlineStyles.playButton }} title="Cho thuê lại"><Play size={16} /></button>
                  )}
                  <button onClick={() => onEdit(vehicle)} style={{ ...inlineStyles.actionButton, ...inlineStyles.editButton }} title="Sửa thông tin xe"><Edit size={16} /></button>
                  <button onClick={() => onDelete(vehicle.id, `${vehicle.brand} ${vehicle.model}`)} style={{ ...inlineStyles.actionButton, ...inlineStyles.deleteButton }} title="Xóa xe"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
