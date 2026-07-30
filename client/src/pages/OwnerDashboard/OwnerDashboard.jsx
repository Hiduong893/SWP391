import React, { useState, useEffect } from 'react';
import { CreditCard, Car, BarChart3, DollarSign, Compass, PlusCircle, Upload, X, FileText, FileWarning, ReceiptText, Camera, Sparkles, Edit, Trash2, Play, Pause, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { ContractModal } from '../../components/ContractModal';
import { InspectionModal } from '../../components/InspectionModal';
import './OwnerDashboard.css';


// ====================================================================================
// INLINE COMPONENT 1: Revenue Chart Modal
// ====================================================================================
const RevenueChartModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const currencyFormatter = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
  };

  return (
    <div style={inlineStyles.overlay}>
      <div style={{...inlineStyles.modal, maxWidth: '800px'}}>
        <div style={inlineStyles.modalHeader}>
          <h3 style={inlineStyles.modalTitle}>Biểu đồ Doanh thu theo Tháng - 2026</h3>
          <button onClick={onClose} style={inlineStyles.closeButton}><X size={20} /></button>
        </div>
        <div className="chart-container" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ====================================================================================
// INLINE COMPONENT 2: Pause Vehicle Modal
// ====================================================================================
const PauseVehicleModal = ({ vehicle, isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  const [reason, setReason] = useState('Bảo dưỡng định kỳ');
  const [duration, setDuration] = useState('');

  const handleConfirm = () => {
    onConfirm();
    onClose();
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

// ====================================================================================
// INLINE COMPONENT 3: Owner Vehicle Table
// ====================================================================================
const OwnerVehicleTable = ({ vehicles = [], onEdit, onDelete, onToggleStatus, onPauseClick }) => {
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
export const OwnerDashboard = ({ setCurrentTab, user }) => {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats, my-cars
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats & Bookings list (UC23)
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [myCarsList, setMyCarsList] = useState([]);
  const [selectedBookingForContract, setSelectedBookingForContract] = useState(null);
  const [activeInspectionBooking, setActiveInspectionBooking] = useState(null);

  // Dispute & Traffic Violation Modals State
  const [isGeneralDisputeModalOpen, setIsGeneralDisputeModalOpen] = useState(false);
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState(null);
  const [generalDisputeDetails, setGeneralDisputeDetails] = useState({ description: '', amount: '' });
  const [generalDisputeEvidenceImage, setGeneralDisputeEvidenceImage] = useState('');
  const [generalDisputeImageLoading, setGeneralDisputeImageLoading] = useState(false);

  const [isTrafficViolationModalOpen, setIsTrafficViolationModalOpen] = useState(false);
  const [selectedBookingForTrafficViolation, setSelectedBookingForTrafficViolation] = useState(null);
  const [trafficViolationDetails, setTrafficViolationDetails] = useState({ amount: '', description: '' });
  const [trafficViolationTicketImage, setTrafficViolationTicketImage] = useState('');
  const [trafficViolationImageLoading, setTrafficViolationImageLoading] = useState(false);

  // Edit Car Form State
  const [editingCar, setEditingCar] = useState(null);
  const [editPricePerDay, setEditPricePerDay] = useState('');
  const [editLocation, setEditLocation] = useState('Hà Nội');
  const [editCarImage, setEditCarImage] = useState('');
  const [editImageLoading, setEditImageLoading] = useState(false);

  const { showToast } = useToast();

  const fetchOwnerDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch owner stats & bookings
      const statsData = await api.owner.getStats();
      setOwnerBookings(statsData.bookings);
      setTotalEarnings(statsData.totalEarnings);

      // 2. Fetch owner registered cars list
      const carsData = await api.owner.getCars();
      setMyCarsList(carsData);
    } catch (e) {
      console.warn("Lỗi tải thông tin chủ xe.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerDashboard();
  }, []);

  const handleApproveBooking = async (bookingId, approved) => {
    setActionLoading(true);
    try {
      const data = await api.owner.approveBooking(bookingId, approved);
      showToast(data.message, 'success');
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || 'Lỗi xét duyệt đơn đặt xe.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondExtension = async (bookingId, action) => {
    setActionLoading(true);
    try {
      const data = await api.bookings.respondExtension(bookingId, action);
      showToast(data.message, 'success');
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || 'Lỗi xử lý yêu cầu gia hạn.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditCar = (car) => {
    setEditingCar(car);
    setEditPricePerDay(car.pricePerDay);
    setEditLocation(car.location);
    setEditCarImage(car.image);
  };

  const handleEditCarImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ chọn tệp hình ảnh.', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh phải nhỏ hơn 5MB.', 'warning');
      return;
    }

    setEditImageLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditCarImage(reader.result);
      setEditImageLoading(false);
      showToast('Tải ảnh mới của xe lên thành công!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitEditCar = async (e) => {
    e.preventDefault();

    if (!editPricePerDay || !editLocation || !editCarImage) {
      showToast('Vui lòng nhập đầy đủ các thông tin.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        pricePerDay: parseInt(editPricePerDay),
        location: editLocation,
        image: editCarImage
      };

      const data = await api.owner.updateCar(editingCar.id, updatedData);
      showToast(data.message, 'success');
      setEditingCar(null);
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || 'Lỗi khi cập nhật xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCarStatus = async (carId, currentStatus) => {
    const nextStatus = currentStatus === 'available' ? 'inactive' : 'available';
    const actionText = nextStatus === 'inactive' ? 'Tạm dừng cho thuê' : 'Kích hoạt cho thuê lại';
    
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText.toLowerCase()} phương tiện này?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const data = await api.owner.updateCar(carId, { status: nextStatus });
      showToast(data.message || `${actionText} thành công!`, 'success');
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || `Lỗi khi ${actionText.toLowerCase()} phương tiện.`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCar = async (carId, modelName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phương tiện "${modelName}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const data = await api.owner.deleteCar(carId);
      showToast(data.message || 'Xóa phương tiện thành công!', 'success');
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || 'Lỗi khi xóa phương tiện.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Generic Image Upload Handler
  const handleImageUpload = (e, setImage, setLoading, toastMessage) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chỉ chọn tệp hình ảnh.', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh phải nhỏ hơn 5MB.', 'warning');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setLoading(false);
      showToast(toastMessage, 'success');
    };
    reader.readAsDataURL(file);
  };

  // General Dispute Functions
  const openGeneralDisputeModal = (booking) => {
    setSelectedBookingForDispute(booking);
    setGeneralDisputeDetails({ description: '', amount: '' });
    setGeneralDisputeEvidenceImage('');
    setIsGeneralDisputeModalOpen(true);
  };

  const handleGeneralDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForDispute || !generalDisputeDetails.description) {
      showToast('Vui lòng nhập mô tả khiếu nại.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const evidenceUrls = generalDisputeEvidenceImage ? [generalDisputeEvidenceImage] : [];
      const data = await api.owner.createDispute(
        selectedBookingForDispute.id,
        generalDisputeDetails.description,
        generalDisputeDetails.amount,
        evidenceUrls
      );
      showToast(data.message, 'success');
      setIsGeneralDisputeModalOpen(false);
      fetchOwnerDashboard(true); // Refresh data
    } catch (error) {
      showToast(error.message || 'Lỗi khi gửi khiếu nại.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Traffic Violation Functions
  const openTrafficViolationModal = (booking) => {
    setSelectedBookingForTrafficViolation(booking);
    setTrafficViolationDetails({ amount: '', description: '' });
    setTrafficViolationTicketImage('');
    setIsTrafficViolationModalOpen(true);
  };

  const handleTrafficViolationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingForTrafficViolation || !trafficViolationDetails.amount || !trafficViolationDetails.description) {
      showToast('Vui lòng nhập đầy đủ số tiền phạt và mô tả.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const data = await api.owner.reportTrafficViolation(selectedBookingForTrafficViolation.id, trafficViolationDetails.amount, trafficViolationDetails.description, trafficViolationTicketImage);
      showToast(data.message, 'success');
      setIsTrafficViolationModalOpen(false);
      fetchOwnerDashboard(true); // Refresh data
    } catch (error) {
      showToast(error.message || 'Lỗi khi báo cáo phạt nguội.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingBookings = ownerBookings.filter(b => b.status === 'pending_owner');

  return (
    <div className="owner-dashboard-page" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '20px 0' }}>
      
      {/* HEADER SECTION */}
      <div className="owner-header-bar mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass className="text-primary animate-pulse" size={26} />
            <span>KHÔNG GIAN HỢP TÁC CHỦ XE</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', marginTop: 4 }}>
            Quản lý đội xe ký gửi, phê duyệt yêu cầu đặt lịch từ khách thuê và theo dõi số dư thu nhập của bạn.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button 
            onClick={() => setCurrentTab('list-car')} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#009698', border: 'none', fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}
          >
            <PlusCircle size={16} /> Ký gửi xe mới
          </button>
          <button onClick={() => fetchOwnerDashboard()} className="btn-refresh" title="Làm mới">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="owner-stats-grid mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="owner-stat-card-glass">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tổng Thu Nhập</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: 4 }}>{formatCurrency(totalEarnings)}</h3>
          </div>
          <div className="owner-stat-icon bg-purple"><DollarSign size={20} /></div>
        </div>

        <div 
          className="owner-stat-card-glass" 
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => setActiveSubTab('my-cars')}
          title="Xem danh sách xe của tôi"
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Đội Xe Sở Hữu</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{myCarsList.length} xe</h3>
          </div>
          <div className="owner-stat-icon bg-blue"><Car size={20} /></div>
        </div>

        <div 
          className="owner-stat-card-glass"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => setActiveSubTab('stats')}
          title="Xem danh sách đơn đặt lịch"
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Số Đơn Đặt Lịch</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{ownerBookings.length} lượt</h3>
          </div>
          <div className="owner-stat-icon bg-green"><BarChart3 size={20} /></div>
        </div>
      </div>

      {/* VIEWPORT CONTROLS */}
      <div className="owner-viewport-box">
        {loading ? (
          <div className="owner-loading-box" style={{ padding: 48, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
            Đang tải kho dữ liệu chủ xe...
          </div>
        ) : (
          <>
            {/* PENDING BOOKINGS - ALWAYS PERSISTENT AT THE TOP */}
            <div className="owner-glass-table-container mb-6" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: 20 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                Yêu cầu đặt thuê xe chờ chủ xe duyệt
              </h4>

              {pendingBookings.length === 0 ? (
                <div style={{ padding: 24, background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                  Không có lịch thuê xe nào đang chờ duyệt. Đội xe của bạn đang sẵn sàng đón nhận những chuyến đi mới!
                </div>
              ) : (
                <table className="owner-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khách Hàng</th>
                      <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Xe Yêu Cầu</th>
                      <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thời Gian Nhận/Trả</th>
                      <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doanh Thu</th>
                      <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Duyệt Đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBookings.map((b) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: 14, fontSize: '13px', color: 'var(--text-primary)' }}>
                          <strong>{b.userName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{b.userEmail}</span>
                        </td>
                        <td style={{ padding: 14, fontSize: '13px', color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={b.carImage} alt={b.carName} style={{ width: 44, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                            <strong>{b.carName}</strong>
                          </div>
                        </td>
                        <td style={{ padding: 14, fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <strong>{b.pickupLocation}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{b.pickupDate} ➔ {b.returnDate}</span>
                        </td>
                        <td style={{ padding: 14, fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(b.totalPrice)}</td>
                        <td style={{ padding: 14 }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                              onClick={() => handleApproveBooking(b.id, true)}
                              disabled={actionLoading}
                            >
                              Phê duyệt
                            </button>
                            <button 
                              className="btn btn-secondary"
                              style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}
                              onClick={() => handleApproveBooking(b.id, false)}
                              disabled={actionLoading}
                            >
                              Từ chối
                            </button>
                            <button 
                              className="btn btn-secondary"
                              style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setSelectedBookingForContract(b.id)}
                              disabled={actionLoading}
                            >
                              <FileText size={12} /> Hợp đồng
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* SUB-TABS NAVIGATION */}
            <div className="owner-sub-nav mb-6" style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
              <button 
                className={`owner-nav-btn ${activeSubTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('stats')}
              >
                <CreditCard size={15} />
                <span>Lịch Sử Cho Thuê ({ownerBookings.filter(b => b.status !== 'pending_owner').length})</span>
              </button>

              <button 
                className={`owner-nav-btn ${activeSubTab === 'my-cars' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('my-cars')}
              >
                <Car size={15} />
                <span>Đội Xe Của Tôi ({myCarsList.length})</span>
              </button>
            </div>

            {/* SUB-TAB 1: BOOKINGS HISTORY LOG */}
            {activeSubTab === 'stats' && (
              <div className="owner-glass-table-container" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Lịch sử cho thuê & Lịch trình hành trình
                </h4>
                
                {ownerBookings.filter(b => b.status !== 'pending_owner').length === 0 ? (
                  <div style={{ padding: 32, background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                    Chưa có lịch trình cho thuê xe nào hoàn thành hoặc đã duyệt trước đây.
                  </div>
                ) : (
                  <table className="owner-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khách Hàng</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phương Tiện</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thời Gian</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doanh Thu</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trạng Thái</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hợp đồng</th>
                        <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerBookings.filter(b => b.status !== 'pending_owner').map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: 14, fontSize: '13px', color: 'var(--text-primary)' }}>
                            <strong>{b.userName}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{b.userEmail}</span>
                          </td>
                          <td style={{ padding: 14, fontSize: '13px', color: 'var(--text-primary)' }}>
                            <strong>{b.carName}</strong>
                          </td>
                          <td style={{ padding: 14, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span>{b.pickupDate} ➔ {b.returnDate}</span>
                            {(() => {
                              let ext = null;
                              try {
                                if (b.extensionRequest) {
                                  ext = typeof b.extensionRequest === 'string' ? JSON.parse(b.extensionRequest) : b.extensionRequest;
                                }
                              } catch (e) {}

                              if (ext && ext.status === 'pending') {
                                return (
                                  <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: '8px', padding: '6px 8px', marginTop: '6px', fontSize: '11px', color: '#92400e' }}>
                                    <strong>⏳ Xin gia hạn đến {ext.requestedReturnDate} (+{ext.extraDays} ngày)</strong>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                      <button
                                        onClick={() => handleRespondExtension(b.id, 'approve')}
                                        disabled={actionLoading}
                                        style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                      >
                                        Duyệt
                                      </button>
                                      <button
                                        onClick={() => handleRespondExtension(b.id, 'reject')}
                                        disabled={actionLoading}
                                        style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                                      >
                                        Từ chối
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </td>
                          <td style={{ padding: 14, fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(b.totalPrice)}</td>
                          <td style={{ padding: 14 }}>
                            <span className={`owner-booking-status-badge badge-${b.status}`}>
                              {b.status === 'confirmed' ? 'Đã duyệt' : b.status === 'active' ? 'Đang thuê' : b.status === 'completed' ? 'Hoàn thành ✓' : b.status === 'disputed' ? 'Khiếu nại' : 'Đã hủy'}
                            </span>
                          </td>
                          <td style={{ padding: 14 }}>
                            {b.status !== 'rejected' && b.status !== 'cancelled' && (
                              <button 
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                onClick={() => setSelectedBookingForContract(b.id)}
                              >
                                <FileText size={12} /> Chi tiết HĐ
                              </button>                            )}
                          </td>
                          <td style={{ padding: 14 }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {/* NEW: Dispute and Traffic Violation buttons */}
                              {b.status === 'completed' && (
                                  <>
                                      <button
                                          type="button"
                                          className="btn btn-secondary"
                                          style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                          onClick={() => openGeneralDisputeModal(b)}
                                          disabled={actionLoading}
                                      >
                                          <FileWarning size={12} /> Khiếu nại
                                      </button>
                                      <button
                                          type="button"
                                          className="btn btn-secondary"
                                          style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                          onClick={() => openTrafficViolationModal(b)}
                                          disabled={actionLoading}
                                      >
                                          <ReceiptText size={12} /> Phạt nguội
                                      </button>
                                  </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SUB-TAB 2: MY OWN REGISTERED VEHICLES GRID */}
            {activeSubTab === 'my-cars' && (
              <div className="owner-glass-table-container" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Danh sách đội phương tiện ký gửi đã đăng ký
                </h4>

                {myCarsList.length === 0 ? (
                  <div style={{ padding: 32, background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                    Bạn chưa ký gửi chiếc xe nào trên sàn. Hãy nhấn 'Ký gửi xe mới' để đăng ký chiếc xe đầu tiên của bạn!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {myCarsList.map((car) => (
                      <div key={car.id} style={{ display: 'flex', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, textAlign: 'left' }}>
                        <img src={car.image} alt={car.model} style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 6, background: '#050508' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ fontSize: '10px', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{car.brand}</strong>
                              <span className={`car-moderation-badge badge-${car.status}`} style={{ transform: 'scale(0.85)', transformOrigin: 'top right', marginTop: -2 }}>
                                {car.status === 'pending_moderation' ? 'Chờ kiểm duyệt' : car.status === 'available' ? 'Sẵn sàng' : car.status === 'rented' ? 'Đang cho thuê' : car.status === 'inactive' ? 'Tạm dừng' : 'Từ chối'}
                              </span>
                            </div>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{car.model}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>Biển số: {car.plateNumber}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <strong style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{formatCurrency(car.pricePerDay)}/ngày</strong>
                            
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {car.status !== 'rented' && (
                                <button 
                                  type="button"
                                  className="owner-booking-status-badge badge-confirmed" 
                                  style={{ background: 'rgba(0, 150, 152, 0.15)', border: '1px solid rgba(0, 150, 152, 0.3)', color: 'var(--accent-primary)', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
                                  onClick={() => handleStartEditCar(car)}
                                >
                                  Sửa xe
                                </button>
                              )}
                              
                              {car.status === 'available' && (
                                <button 
                                  type="button"
                                  className="owner-booking-status-badge" 
                                  style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
                                  onClick={() => handleToggleCarStatus(car.id, car.status)}
                                  disabled={actionLoading}
                                >
                                  Tạm dừng
                                </button>
                              )}

                              {car.status === 'inactive' && (
                                <button 
                                  type="button"
                                  className="owner-booking-status-badge" 
                                  style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
                                  onClick={() => handleToggleCarStatus(car.id, car.status)}
                                  disabled={actionLoading}
                                >
                                  Cho thuê lại
                                </button>
                              )}

                              {car.status !== 'rented' && (
                                <button 
                                  type="button"
                                  className="owner-booking-status-badge" 
                                  style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
                                  onClick={() => handleDeleteCar(car.id, `${car.brand} ${car.model}`)}
                                  disabled={actionLoading}
                                >
                                  Xóa xe
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ✏️ EDIT VEHICLE MODAL POPUP */}
        {editingCar && (
          <div className="owner-modal-overlay">
            <div className="owner-modal-card glassmorphism">
              <div className="owner-modal-header">
                <h4>Chỉnh sửa phương tiện ký gửi</h4>
                <button className="owner-modal-close" onClick={() => setEditingCar(null)}>✕</button>
              </div>
              <form onSubmit={handleSubmitEditCar} className="list-car-form">
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>
                    Xe: {editingCar.brand} {editingCar.model} ({editingCar.plateNumber})
                  </strong>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Đơn giá thuê / Ngày (VND) *</label>
                    <div className="input-container">
                      <DollarSign className="input-icon" size={16} />
                      <input 
                        type="number" 
                        placeholder="Vd: 800000" 
                        className="form-input"
                        value={editPricePerDay}
                        onChange={(e) => setEditPricePerDay(e.target.value)}
                        min="300000"
                        max="5000000"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Khu vực cho thuê *</label>
                    <select value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Hình ảnh thực tế mới của xe *</label>
                  <div className="car-photo-upload-zone">
                    {editCarImage ? (
                      <div className="uploaded-car-preview">
                        <img src={editCarImage} alt="Car Uploaded Preview" />
                        <button type="button" className="btn-remove-photo" onClick={() => setEditCarImage('')}>✕ Xóa ảnh</button>
                      </div>
                    ) : (
                      <label className="photo-upload-label">
                        <Upload className="upload-photo-icon" size={24} />
                        <span>{editImageLoading ? 'Đang tải...' : 'Chọn ảnh thực tế của xe'}</span>
                        <p>Ảnh chụp rõ mặt trước, sườn xe dưới 5MB</p>
                        <input type="file" onChange={handleEditCarImageUpload} accept="image/*" style={{ display: 'none' }} disabled={editImageLoading} />
                      </label>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingCar(null)}>Hủy bỏ</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || editImageLoading}>
                    {loading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contract Modal Render for Owner */}
        {selectedBookingForContract && (
          <ContractModal
            bookingId={selectedBookingForContract}
            user={user}
            onClose={() => setSelectedBookingForContract(null)}
          />
        )}

        {/* General Dispute Modal */}
        {isGeneralDisputeModalOpen && (
            <div className="owner-modal-overlay">
                <div className="owner-modal-card glassmorphism">
                    <div className="owner-modal-header">
                        <h4>Tạo Khiếu nại chung cho chuyến đi #{selectedBookingForDispute?.id}</h4>
                        <button className="owner-modal-close" onClick={() => setIsGeneralDisputeModalOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleGeneralDisputeSubmit} className="list-car-form">
                        <div className="form-group">
                            <label className="form-label">Mô tả chi tiết khiếu nại *</label>
                            <textarea
                                placeholder="Ví dụ: Khách làm xước xe bên phải, trả xe muộn 2 tiếng, xe bị bẩn nặng..."
                                className="form-input"
                                value={generalDisputeDetails.description}
                                onChange={(e) => setGeneralDisputeDetails({ ...generalDisputeDetails, description: e.target.value })}
                                rows="4"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số tiền yêu cầu bồi thường (VND)</label>
                            <div className="input-container">
                                <DollarSign className="input-icon" size={16} />
                                <input
                                    type="number"
                                    placeholder="Vd: 500000"
                                    className="form-input"
                                    value={generalDisputeDetails.amount}
                                    onChange={(e) => setGeneralDisputeDetails({ ...generalDisputeDetails, amount: e.target.value })}
                                    min="0"
                                />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label className="form-label">Ảnh bằng chứng (nếu có)</label>
                            <div className="car-photo-upload-zone">
                                {generalDisputeEvidenceImage ? (
                                    <div className="uploaded-car-preview">
                                        <img src={generalDisputeEvidenceImage} alt="Dispute Evidence Preview" />
                                        <button type="button" className="btn-remove-photo" onClick={() => setGeneralDisputeEvidenceImage('')}>✕ Xóa ảnh</button>
                                    </div>
                                ) : (
                                    <label className="photo-upload-label">
                                        <Upload className="upload-photo-icon" size={24} />
                                        <span>{generalDisputeImageLoading ? 'Đang tải...' : 'Chọn ảnh bằng chứng'}</span>
                                        <p>Ảnh chụp rõ ràng, dưới 5MB</p>
                                        <input type="file" onChange={(e) => handleImageUpload(e, setGeneralDisputeEvidenceImage, setGeneralDisputeImageLoading, 'Tải ảnh bằng chứng lên thành công!')} accept="image/*" style={{ display: 'none' }} disabled={generalDisputeImageLoading} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsGeneralDisputeModalOpen(false)}>Hủy bỏ</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={actionLoading || generalDisputeImageLoading}>
                                {actionLoading ? 'Đang gửi...' : 'Gửi khiếu nại'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Traffic Violation Modal */}
        {isTrafficViolationModalOpen && (
            <div className="owner-modal-overlay">
                <div className="owner-modal-card glassmorphism">
                    <div className="owner-modal-header">
                        <h4>Báo cáo Phạt nguội cho chuyến đi #{selectedBookingForTrafficViolation?.id}</h4>
                        <button className="owner-modal-close" onClick={() => setIsTrafficViolationModalOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleTrafficViolationSubmit} className="list-car-form">
                        <div className="form-group">
                            <label className="form-label">Số tiền phạt (VND) *</label>
                            <div className="input-container">
                                <DollarSign className="input-icon" size={16} />
                                <input
                                    type="number"
                                    placeholder="Vd: 1500000"
                                    className="form-input"
                                    value={trafficViolationDetails.amount}
                                    onChange={(e) => setTrafficViolationDetails({ ...trafficViolationDetails, amount: e.target.value })}
                                    min="1000"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả chi tiết phạt nguội *</label>
                            <textarea
                                placeholder="Ví dụ: Xe bị phạt quá tốc độ tại cao tốc Pháp Vân - Cầu Giẽ, biển số 30A-123.45, ngày 10/06/2026..."
                                className="form-input"
                                value={trafficViolationDetails.description}
                                onChange={(e) => setTrafficViolationDetails({ ...trafficViolationDetails, description: e.target.value })}
                                rows="3"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label className="form-label">Ảnh phiếu phạt nguội *</label>
                            <div className="car-photo-upload-zone">
                                {trafficViolationTicketImage ? (
                                    <div className="uploaded-car-preview">
                                        <img src={trafficViolationTicketImage} alt="Traffic Violation Ticket Preview" />
                                        <button type="button" className="btn-remove-photo" onClick={() => setTrafficViolationTicketImage('')}>✕ Xóa ảnh</button>
                                    </div>
                                ) : (
                                    <label className="photo-upload-label">
                                        <Upload className="upload-photo-icon" size={24} />
                                        <span>{trafficViolationImageLoading ? 'Đang tải...' : 'Chọn ảnh phiếu phạt nguội'}</span>
                                        <p>Ảnh chụp rõ ràng, dưới 5MB</p>
                                        <input type="file" onChange={(e) => handleImageUpload(e, setTrafficViolationTicketImage, setTrafficViolationImageLoading, 'Tải ảnh phiếu phạt nguội lên thành công!')} accept="image/*" style={{ display: 'none' }} disabled={trafficViolationImageLoading} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsTrafficViolationModalOpen(false)}>Hủy bỏ</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={actionLoading || trafficViolationImageLoading}>
                                {actionLoading ? 'Đang gửi...' : 'Gửi báo cáo phạt nguội'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Photo Inspection & AI Damage Report Modal for Owner */}
        {activeInspectionBooking && (
          <InspectionModal
            booking={activeInspectionBooking}
            user={user}
            onClose={() => setActiveInspectionBooking(null)}
            onInspectionUpdated={() => fetchOwnerDashboard(true)}
          />

        )}
      </div>
    </div>
  );
};