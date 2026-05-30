import React, { useState, useEffect } from 'react';
import { Users, Car, CreditCard, DollarSign, ShieldAlert, Check, X, Trash2, Eye, RefreshCw, BarChart2, CheckCircle2, MessageSquare, AlertTriangle, ShieldCheck, Settings, HelpCircle, ArrowUpRight, Star } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const AdminDashboard = () => {
  // Tabs: kyc, cars_moderation, support, reviews, incidents, disputes, bookings, config, roles
  const [activeSubTab, setActiveSubTab] = useState('kyc');
  const [stats, setStats] = useState({ totalUsers: 0, totalCars: 0, totalBookings: 0, totalRevenue: 0 });
  const [currentUserRole, setCurrentUserRole] = useState('cskh'); // Detected from profile
  
  // Data lists
  const [usersList, setUsersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [carsList, setCarsList] = useState([]);
  const [pendingCars, setPendingCars] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [incidentsList, setIncidentsList] = useState([]);
  const [disputesList, setDisputesList] = useState([]);
  
  // Settings Config State (UC29)
  const [serviceFee, setServiceFee] = useState(5);
  const [insuranceMul, setInsuranceMul] = useState(1.1);
  const [sysNotice, setSysNotice] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLicenseImage, setSelectedLicenseImage] = useState(null); // Lightbox
  
  // Interaction/Reply states
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [disputeVerdict, setDisputeVerdict] = useState('');

  const { showToast } = useToast();

  const detectRoleAndData = async () => {
    try {
      const profile = await api.user.getProfile();
      setCurrentUserRole(profile.user.role);
    } catch (e) {
      console.warn("Lỗi tải thông tin quyền.");
    }
  };

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Stats
      const statsData = await api.admin.getStats();
      setStats(statsData.stats);

      // 2. Users
      const usersData = await api.admin.getUsers();
      setUsersList(usersData);

      // 3. Bookings
      const bookingsData = await api.admin.getBookings();
      setBookingsList(bookingsData);

      // 4. Cars
      const carsData = await api.cars.getCars({});
      setCarsList(carsData);

      // 5. Pending Cars (Moderation - UC27)
      const pCars = await api.admin.getPendingCars();
      setPendingCars(pCars);

      // 6. Reviews (UC33)
      const reviews = await api.admin.getReviews();
      setReviewsList(reviews);

      // 7. Support Tickets (UC32)
      const tickets = await api.admin.getSupportTickets();
      setTicketsList(tickets);

      // 8. Incidents (UC35)
      const incidents = await api.admin.getIncidents();
      setIncidentsList(incidents);

      // 9. Disputes (UC34)
      const disputes = await api.admin.getDisputes();
      setDisputesList(disputes);

      // 10. System Config (UC29)
      const config = await api.system.getConfig();
      setServiceFee(config.serviceFeePercent);
      setInsuranceMul(config.insuranceMultiplier);
      setSysNotice(config.systemNotice || '');

    } catch (error) {
      console.error('Fetch command center error:', error);
      showToast('Lỗi tải cơ sở dữ liệu kiểm duyệt.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    detectRoleAndData();
    fetchDashboardData();
  }, []);

  // 1. Duyệt KYC (UC31)
  const handleApproveKyc = async (userId, approve) => {
    setActionLoading(true);
    try {
      const status = approve ? 'verified' : 'rejected';
      const data = await api.admin.approveKyc(userId, status);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi duyệt KYC.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Kiểm duyệt xe mới (UC27)
  const handleModerateCar = async (carId, approve, reason = '') => {
    setActionLoading(true);
    try {
      const status = approve ? 'available' : 'rejected';
      const data = await api.admin.moderateCar(carId, status, reason);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi duyệt xe.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Phản hồi Support Ticket (UC32)
  const handleReplyTicket = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setActionLoading(true);
    try {
      const data = await api.admin.replySupportTicket(selectedTicket.id, replyText);
      showToast(data.message, 'success');
      setReplyText('');
      setSelectedTicket(null);
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi gửi phản hồi.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Giải quyết tranh chấp khiếu nại (UC34)
  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!disputeVerdict.trim()) return;

    setActionLoading(true);
    try {
      const data = await api.admin.resolveDispute(selectedDispute.id, disputeVerdict);
      showToast(data.message, 'success');
      setDisputeVerdict('');
      setSelectedDispute(null);
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi giải quyết khiếu nại.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Cấu hình hệ thống (Admin Only - UC29)
  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const data = await api.admin.updateSystemConfig({
        serviceFeePercent: serviceFee,
        insuranceMultiplier: insuranceMul,
        systemNotice: sysNotice
      });
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi cập nhật cấu hình.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Phân quyền thành viên (Admin Only - UC30)
  const handleUpdateUserRole = async (userId, role) => {
    setActionLoading(true);
    try {
      const data = await api.admin.updateUserRole(userId, role);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi phân quyền.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6.5. Xóa tài khoản thành viên (Admin Only)
  const handleDeleteUser = async (userId, userName) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${userName}" khỏi hệ thống không? Hành động này không thể hoàn tác!`);
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const data = await api.admin.deleteUser(userId);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi khi xóa tài khoản.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Duyệt hoàn trả cọc 5.000.000 VND (Admin/CSKH - UC28)
  const handleRefundDeposit = async (bookingId, refund) => {
    const confirmAct = window.confirm(refund ? 'Bạn đồng ý HOÀN LẠI 5.000.000đ tiền cọc vào ví người dùng?' : 'Bạn quyết định GIỮ LẠI tiền đặt cọc này?');
    if (!confirmAct) return;

    setActionLoading(true);
    try {
      const status = refund ? 'refunded' : 'withheld';
      const data = await api.admin.refundDeposit(bookingId, status);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi xử lý tiền cọc.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Ẩn/Hiện đánh giá dịch vụ (CSKH - UC33)
  const handleToggleReviewVisibility = async (reviewId, hide) => {
    setActionLoading(true);
    try {
      const status = hide ? 'hidden' : 'visible';
      const data = await api.admin.updateReviewStatus(reviewId, status);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi cập nhật đánh giá.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Đánh dấu giải quyết sự cố phát sinh (CSKH - UC35)
  const handleResolveIncident = async (bookingId) => {
    setActionLoading(true);
    try {
      const data = await api.admin.resolveIncident(bookingId);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi xử lý sự cố.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Standard cancellation / completions
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    setActionLoading(true);
    try {
      const data = await api.admin.updateBookingStatus(bookingId, newStatus);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi cập nhật booking.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCar = async (carId) => {
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa chiếc xe này khỏi chợ cho thuê xe không?');
    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const data = await api.admin.deleteCar(carId);
      showToast(data.message, 'success');
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi xóa xe.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Filter pending lists
  const pendingKycUsers = usersList.filter(u => u.licenseStatus === 'pending');
  const verifiedKycUsers = usersList.filter(u => u.licenseStatus === 'verified');

  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="admin-dashboard-page">
      <div className="dashboard-header">
        <h2 className="title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={28} className="text-info" />
          <span>{isAdmin ? 'QUẢN TRỊ TỐI CAO (ADMIN)' : 'BỘ PHẬN CSKH HỖ TRỢ'}</span>
        </h2>
        <button onClick={() => fetchDashboardData()} className="btn-refresh" title="Làm mới">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <p className="subtitle" style={{ textAlign: 'left', marginBottom: '24px' }}>
        Chào mừng {isAdmin ? 'Quản trị viên!' : 'Hỗ trợ viên!'} Sử dụng các thẻ nghiệp vụ dưới đây để kiểm duyệt danh tính, xe đăng, hỗ trợ khiếu nại, sự cố, hoàn cọc cược.
      </p>

      {/* 📊 SYSTEM STATS GRID */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-lbl">Tổng Doanh Thu</span>
            <h3 className="stat-val text-primary">{formatCurrency(stats.totalRevenue)}</h3>
          </div>
          <div className="stat-icon-box bg-purple"><DollarSign size={24} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-lbl">Thành Viên</span>
            <h3 className="stat-val">{stats.totalUsers} người</h3>
          </div>
          <div className="stat-icon-box bg-blue"><Users size={24} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-lbl">Tổng Xe Hệ Thống</span>
            <h3 className="stat-val">{stats.totalCars} xe</h3>
          </div>
          <div className="stat-icon-box bg-green"><Car size={24} /></div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-lbl">Giao Dịch Booking</span>
            <h3 className="stat-val">{stats.totalBookings} đơn</h3>
          </div>
          <div className="stat-icon-box bg-orange"><CreditCard size={24} /></div>
        </div>
      </div>

      {/* 🛠️ SUB-TABS NAVIGATION (UC27 - UC35) */}
      <div className="admin-tabs-nav mt-6" style={{ flexWrap: 'wrap', gap: 6 }}>
        <button className={`admin-tab-btn ${activeSubTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveSubTab('kyc')}>
          <ShieldAlert size={14} /> <span>Duyệt KYC ({pendingKycUsers.length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'cars_moderation' ? 'active' : ''}`} onClick={() => setActiveSubTab('cars_moderation')}>
          <Car size={14} /> <span>Duyệt Xe Mới ({pendingCars.length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'support' ? 'active' : ''}`} onClick={() => setActiveSubTab('support')}>
          <MessageSquare size={14} /> <span>Hòm Hỗ Trợ ({ticketsList.filter(t => t.status === 'open').length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveSubTab('reviews')}>
          <Star size={14} /> <span>Xét Đánh Giá ({reviewsList.length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveSubTab('incidents')}>
          <AlertTriangle size={14} /> <span>Báo Sự Cố ({incidentsList.filter(i => i.incident?.status === 'pending').length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'disputes' ? 'active' : ''}`} onClick={() => setActiveSubTab('disputes')}>
          <ShieldCheck size={14} /> <span>Hồ Sơ Khiếu Nại ({disputesList.filter(d => d.status === 'open').length})</span>
        </button>
        <button className={`admin-tab-btn ${activeSubTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveSubTab('bookings')}>
          <CreditCard size={14} /> <span>Hoàn Tiền Cọc ({bookingsList.length})</span>
        </button>

        {/* ADMIN ONLY TABS (UC29, UC30) */}
        {isAdmin && (
          <>
            <button className={`admin-tab-btn ${activeSubTab === 'config' ? 'active' : ''}`} onClick={() => setActiveSubTab('config')} style={{ color: '#fbbf24', borderLeft: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <Settings size={14} /> <span>Cấu Hình</span>
            </button>
            <button className={`admin-tab-btn ${activeSubTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveSubTab('roles')} style={{ color: '#c084fc' }}>
              <Users size={14} /> <span>Phân Quyền</span>
            </button>
          </>
        )}
      </div>

      {/* 📦 SUB-TAB VIEWPORT */}
      <div className="admin-tabs-viewport mt-4">
        {loading ? (
          <div className="admin-viewport-loading">Đang nạp kho dữ liệu...</div>
        ) : (
          <>
            {/* 1. KYC APPROVALS (UC31) */}
            {activeSubTab === 'kyc' && (
              <div className="admin-table-container">
                <h4 className="table-section-title">Hồ sơ người dùng tải CCCD &amp; Bằng lái xe chờ xác minh KYC</h4>
                {pendingKycUsers.length === 0 ? (
                  <div className="admin-empty-state">
                    <CheckCircle2 className="text-success mb-2" size={32} style={{ display: 'inline', color: '#10b981' }} />
                    <p>Không có hồ sơ thành viên nào chờ phê duyệt danh tính.</p>
                  </div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Thành Viên</th>
                        <th>Email</th>
                        <th>Ảnh CCCD</th>
                        <th>Ảnh Bằng Lái</th>
                        <th style={{ textAlign: 'center' }}>Hành Động KYC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingKycUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="table-user-cell">
                              <img src={u.avatar} alt={u.name} className="table-avatar" />
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td>
                            {u.kycDocuments?.cccd ? (
                              <button className="btn-table-action text-info" onClick={() => setSelectedLicenseImage(u.kycDocuments.cccd)}><Eye size={12} /> Xem CCCD</button>
                            ) : <span className="text-muted" style={{ fontSize: '11px' }}>Chưa tải</span>}
                          </td>
                          <td>
                            {u.licenseImage ? (
                              <button className="btn-table-action text-info" onClick={() => setSelectedLicenseImage(u.licenseImage)}><Eye size={12} /> Xem Bằng lái</button>
                            ) : <span className="text-muted" style={{ fontSize: '11px' }}>Chưa tải</span>}
                          </td>
                          <td>
                            <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                              <button className="btn-approve btn-success" onClick={() => handleApproveKyc(u.id, true)} disabled={actionLoading}>✓ Duyệt KYC</button>
                              <button className="btn-approve btn-danger" onClick={() => handleApproveKyc(u.id, false)} disabled={actionLoading}>✕ Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 2. CAR LISTING MODERATION (UC27) */}
            {activeSubTab === 'cars_moderation' && (
              <div className="admin-table-container">
                <h4 className="table-section-title">Phương tiện chủ xe ký gửi nhàn rỗi chờ kiểm duyệt lên sàn</h4>
                {pendingCars.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Không có phương tiện mới nào đang chờ kiểm duyệt.</p>
                  </div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Ảnh Xe</th>
                        <th>Hãng &amp; Dòng Xe</th>
                        <th>Biển Kiểm Soát</th>
                        <th>Giá/Ngày</th>
                        <th>Khu Vực</th>
                        <th style={{ textAlign: 'center' }}>Duyệt Ký Gửi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCars.map((car) => (
                        <tr key={car.id}>
                          <td><img src={car.image} alt={car.model} className="table-car-thumb-large" /></td>
                          <td>
                            <strong style={{ color: '#6366f1', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>{car.brand}</strong>
                            <strong>{car.model}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{car.seats} chỗ • {car.transmission}</span>
                          </td>
                          <td style={{ fontWeight: 6, color: '#818cf8' }}>{car.plateNumber}</td>
                          <td style={{ fontWeight: 7, color: '#a855f7' }}>{formatCurrency(car.pricePerDay)}</td>
                          <td>{car.location}</td>
                          <td>
                            <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                              <button className="btn-approve btn-success" onClick={() => handleModerateCar(car.id, true)} disabled={actionLoading}>✓ Duyệt đăng</button>
                              <button className="btn-approve btn-danger" onClick={() => {
                                const reason = window.prompt("Nhập lý do từ chối đăng tải xe:");
                                if (reason) handleModerateCar(car.id, false, reason);
                              }} disabled={actionLoading}>✕ Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 3. SUPPORT TICKETS INBOX (UC32) */}
            {activeSubTab === 'support' && (
              <div className="admin-table-container" style={{ textAlign: 'left' }}>
                <h4 className="table-section-title">Hòm thư tiếp tiếp nhận hỗ trợ khách hàng (Support Inbox)</h4>
                
                {ticketsList.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Không có yêu cầu hỗ trợ nào gửi lên.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px' }}>
                    {/* List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '400px', overflowY: 'auto' }}>
                      {ticketsList.map((ticket) => (
                        <div 
                          key={ticket.id} 
                          className={`ticket-sidebar-item ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                          onClick={() => setSelectedTicket(ticket)}
                          style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 7, textTransform: 'uppercase' }}>{ticket.userRole}</span>
                            <span className={`admin-status-badge badge-${ticket.status}`}>{ticket.status}</span>
                          </div>
                          <strong style={{ fontSize: '13px', display: 'block', marginTop: 4, color: 'white' }}>{ticket.subject}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Gửi bởi: {ticket.userName}</span>
                        </div>
                      ))}
                    </div>

                    {/* Chat view */}
                    {selectedTicket ? (
                      <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 16, background: '#0a0b10', display: 'flex', flexDirection: 'column', height: '400px' }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10, marginBottom: 10 }}>
                          <h4 style={{ fontSize: '14px', color: 'white', fontWeight: 700 }}>{selectedTicket.subject}</h4>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Khách hàng: <strong>{selectedTicket.userName}</strong> ({selectedTicket.userRole})</span>
                        </div>

                        {/* Thread */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, marginBottom: 12 }}>
                          {/* Original msg */}
                          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8, maxWidth: '80%' }}>
                            <p style={{ fontSize: '12.5px', color: '#e2e8f0' }}>{selectedTicket.message}</p>
                            <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: 4 }}>{new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                          </div>

                          {/* Replies */}
                          {selectedTicket.replies.map((rep, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                alignSelf: rep.sender === 'cskh' ? 'flex-end' : 'flex-start', 
                                background: rep.sender === 'cskh' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', 
                                border: rep.sender === 'cskh' ? '1px solid rgba(99,102,241,0.3)' : 'none', 
                                padding: 10, 
                                borderRadius: 8, 
                                maxWidth: '80%' 
                              }}
                            >
                              <p style={{ fontSize: '12.5px', color: rep.sender === 'cskh' ? '#c7d2fe' : '#e2e8f0' }}>{rep.text}</p>
                              <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: 4 }}>{rep.sender === 'cskh' ? 'Hỗ trợ viên' : 'Khách'} - {new Date(rep.sentAt).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>

                        {/* Reply Form */}
                        {selectedTicket.status !== 'resolved' ? (
                          <form onSubmit={handleReplyTicket} style={{ display: 'flex', gap: 8 }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Nhập nội dung trả lời hỗ trợ..." 
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              required 
                            />
                            <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 20px' }}>Gửi</button>
                          </form>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Ticket này đã đóng giải quyết.</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10 }}>
                        Chọn một yêu cầu hỗ trợ bên trái để xem hội thoại và trả lời.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. MODERATE REVIEWS (UC33) */}
            {activeSubTab === 'reviews' && (
              <div className="admin-table-container">
                <h4 className="table-section-title">Quản lý và ẩn/hiện đánh giá của khách hàng (UC33)</h4>
                {reviewsList.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Chưa có đánh giá nào trên hệ thống.</p>
                  </div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Khách Hàng</th>
                        <th>Nội Dung Đánh Giá</th>
                        <th>Điểm Sao</th>
                        <th>Ngày Bình Luận</th>
                        <th>Trạng Thái</th>
                        <th style={{ textAlign: 'center' }}>Thao Tác Ẩn/Hiện</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewsList.map((rev) => (
                        <tr key={rev.id}>
                          <td><strong>{rev.userName}</strong></td>
                          <td style={{ fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-all' }}>"{rev.comment}"</td>
                          <td>
                            <div className="stars-row">
                              {[...Array(5)].map((_, i) => <Star key={i} size={11} fill={i < rev.rating ? "#fbbf24" : "none"} color={i < rev.rating ? "#fbbf24" : "#475569"} />)}
                            </div>
                          </td>
                          <td>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <span className={`admin-status-badge badge-${rev.status}`}>
                              {rev.status === 'visible' ? 'Hiển thị' : 'Đã ẩn'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                              {rev.status === 'visible' ? (
                                <button className="btn-approve btn-danger" onClick={() => handleToggleReviewVisibility(rev.id, true)} disabled={actionLoading}>✕ Ẩn đi</button>
                              ) : (
                                <button className="btn-approve btn-success" onClick={() => handleToggleReviewVisibility(rev.id, false)} disabled={actionLoading}>✓ Hiện lại</button>
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

            {/* 5. INCIDENT REPORTS (UC35) */}
            {activeSubTab === 'incidents' && (
              <div className="admin-table-container">
                <h4 className="table-section-title">Khai báo sự cố va quẹt / hỏng hóc khẩn cấp từ khách hàng (UC35)</h4>
                
                {incidentsList.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Không ghi nhận bất kỳ sự cố khẩn cấp nào từ chuyến đi.</p>
                  </div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Người Thuê</th>
                        <th>Phương Tiện</th>
                        <th>Chi Tiết Sự Cố</th>
                        <th>Ảnh Hiện Trường</th>
                        <th>Trạng Thái</th>
                        <th style={{ textAlign: 'center' }}>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidentsList.map((inc) => (
                        <tr key={inc.bookingId}>
                          <td>
                            <strong>{inc.userName}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{inc.userEmail}</span>
                          </td>
                          <td>{inc.carName}</td>
                          <td style={{ color: '#fda4af', fontWeight: 6 }}>{inc.incident.description}</td>
                          <td>
                            {inc.incident.image ? (
                              <button className="btn-table-action text-info" onClick={() => setSelectedLicenseImage(inc.incident.image)}>
                                <Eye size={12} /> Xem ảnh hiện trường
                              </button>
                            ) : <span className="text-muted" style={{ fontSize: '11px' }}>Không có ảnh</span>}
                          </td>
                          <td>
                            <span className={`admin-status-badge badge-${inc.incident.status}`}>
                              {inc.incident.status === 'resolved' ? 'Đã xử lý xong' : 'Chờ xử lý'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                              {inc.incident.status !== 'resolved' ? (
                                <button className="btn-approve btn-success" onClick={() => handleResolveIncident(inc.bookingId)} disabled={actionLoading}>
                                  ✓ Đã xử lý xong
                                </button>
                              ) : (
                                <span className="text-success" style={{ fontSize: '12px' }}>Đã hoàn tất hỗ trợ</span>
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

            {/* 6. DISPUTES RESOLUTIONS (UC34) */}
            {activeSubTab === 'disputes' && (
              <div className="admin-table-container" style={{ textAlign: 'left' }}>
                <h4 className="table-section-title">Tiếp nhận giải quyết khiếu nại mâu thuẫn tranh chấp cọc (UC34)</h4>
                
                {disputesList.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Không có đơn khiếu nại mâu thuẫn nào đang chờ xử lý.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '400px', overflowY: 'auto' }}>
                      {disputesList.map((d) => (
                        <div 
                          key={d.id} 
                          className={`ticket-sidebar-item ${selectedDispute?.id === d.id ? 'active' : ''}`}
                          onClick={() => setSelectedDispute(d)}
                          style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 7 }}>TRANH CHẤP CỌC</span>
                            <span className={`admin-status-badge badge-${d.status}`}>{d.status === 'open' ? 'Chưa xử lý' : 'Đã phán quyết'}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</p>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: 4 }}>Người thuê: {d.renterName} ➔ Chủ xe: {d.ownerName}</span>
                        </div>
                      ))}
                    </div>

                    {selectedDispute ? (
                      <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 16, background: '#0a0b10', display: 'flex', flexDirection: 'column', height: '400px' }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10, marginBottom: 10 }}>
                          <h4 style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 700 }}>Hồ Sơ Tranh Chấp Trọng Tài</h4>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Nguyên đơn: <strong>{selectedDispute.renterName}</strong> | Bị đơn: <strong>{selectedDispute.ownerName}</strong></span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                          <div style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)', padding: 12, borderRadius: 8 }}>
                            <span style={{ fontSize: '10px', color: '#fda4af', fontWeight: 7, display: 'block', marginBottom: 4 }}>CHI TIẾT KHIẾU NẠI:</span>
                            <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>{selectedDispute.description}</p>
                          </div>

                          {selectedDispute.status === 'resolved' && (
                            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: 12, borderRadius: 8 }}>
                              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 7, display: 'block', marginBottom: 4 }}>PHÁN QUYẾT CSKH TRỌNG TÀI:</span>
                              <p style={{ fontSize: '13px', color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5 }}>"{selectedDispute.resolutionDetails}"</p>
                            </div>
                          )}
                        </div>

                        {selectedDispute.status === 'open' ? (
                          <form onSubmit={handleResolveDispute} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <textarea 
                              className="form-input" 
                              rows={2} 
                              placeholder="Nhập phán quyết giải quyết tranh chấp (vd: Hoàn cọc 100% cho renter vì lốp hỏng cũ...)" 
                              value={disputeVerdict}
                              onChange={(e) => setDisputeVerdict(e.target.value)}
                              required 
                            />
                            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', width: 'auto', padding: '8px 24px' }}>
                              Ban Hành Phán Quyết
                            </button>
                          </form>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>Tranh chấp này đã được đóng giải quyết xong.</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10 }}>
                        Chọn một vụ việc khiếu nại bên trái để xem hồ sơ tranh chấp trọng tài.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 7. GLOBAL BOOKINGS & DEPOSIT REFUNDS (UC28) */}
            {activeSubTab === 'bookings' && (
              <div className="admin-table-container">
                <h4 className="table-section-title">Danh sách giao dịch thuê xe toàn hệ thống &amp; Duyệt hoàn trả cọc (UC28)</h4>
                
                {bookingsList.length === 0 ? (
                  <div className="admin-empty-state">
                    <p>Không có giao dịch nào được ghi nhận.</p>
                  </div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Khách Hàng</th>
                        <th>Xe Thuê</th>
                        <th>Tổng Giá Phí</th>
                        <th>Cọc Bảo Đảm</th>
                        <th>Trạng Thái Cọc</th>
                        <th style={{ textAlign: 'center' }}>Hành Động Khóa Cọc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsList.map((b) => (
                        <tr key={b.id} className={b.status === 'cancelled' ? 'row-cancelled' : ''}>
                          <td>
                            <strong>{b.userName}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{b.userEmail}</span>
                          </td>
                          <td>{b.carName}</td>
                          <td style={{ fontWeight: 7, color: '#a855f7' }}>{formatCurrency(b.totalPrice)}</td>
                          <td style={{ color: '#fbbf24', fontWeight: 700 }}>5.000.000đ</td>
                          <td>
                            <span className={`admin-status-badge badge-${b.depositStatus}`}>
                              {b.depositStatus === 'paid' ? 'Đang giữ cọc' : b.depositStatus === 'refunded' ? 'Đã hoàn cọc 100%' : b.depositStatus === 'withheld' ? 'Đã tịch thu cọc' : 'Chưa thu'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                              {b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled') ? (
                                <>
                                  <button className="btn-approve btn-success" onClick={() => handleRefundDeposit(b.id, true)} disabled={actionLoading}>✓ Hoàn cọc</button>
                                  <button className="btn-approve btn-danger" onClick={() => handleRefundDeposit(b.id, false)} disabled={actionLoading}>✕ Giữ cọc</button>
                                </>
                              ) : b.depositStatus === 'refunded' ? (
                                <span className="text-success" style={{ fontSize: '12.5px', fontWeight: 6 }}>Đã hoàn trả người dùng ✓</span>
                              ) : b.depositStatus === 'withheld' ? (
                                <span className="text-danger" style={{ fontSize: '12.5px', fontWeight: 6 }}>Tịch thu sung công ✕</span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '11px' }}>Chưa cọc hoặc chuyến đi chưa kết thúc</span>
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

            {/* 8. SYSTEM CONFIGURATION (ADMIN ONLY - UC29) */}
            {activeSubTab === 'config' && isAdmin && (
              <div className="glass-card" style={{ maxWidth: '550px', margin: '0 auto', background: 'rgba(17,19,28,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h4 className="table-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
                  <Settings size={18} />
                  <span>Cấu hình dịch vụ toàn hệ thống (UC29)</span>
                </h4>

                <form onSubmit={handleUpdateConfig} className="list-car-form mt-4">
                  <div className="form-row-grid">
                    <div className="form-group">
                      <label className="form-label">Phí dịch vụ hệ thống (%) *</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="1" 
                        max="20" 
                        value={serviceFee}
                        onChange={(e) => setServiceFee(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Hệ số bảo hiểm chuyến đi *</label>
                      <input 
                        type="number" 
                        step="0.05"
                        min="1.0"
                        max="1.5"
                        className="form-input" 
                        value={insuranceMul}
                        onChange={(e) => setInsuranceMul(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group mt-4">
                    <label className="form-label">Thông báo nổi bật trang chủ (System Notice):</label>
                    <textarea 
                      rows={4}
                      className="form-input form-textarea"
                      placeholder="Nhập thông báo chính sách mới để hiển thị cho mọi người dùng tại đầu chợ xe..."
                      value={sysNotice}
                      onChange={(e) => setSysNotice(e.target.value)}
                      style={{ paddingLeft: 12, paddingTop: 10 }}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary mt-6" style={{ background: '#fbbf24', borderColor: '#fbbf24', color: '#000', fontWeight: 700 }}>
                    Lưu Thay Đổi Cấu Hình
                  </button>
                </form>
              </div>
            )}

            {/* 9. ROLE DELEGATION (ADMIN ONLY - UC30) */}
            {activeSubTab === 'roles' && isAdmin && (
              <div className="admin-table-container">
                <h4 className="table-section-title" style={{ color: '#c084fc' }}>Danh sách phân quyền vai trò người dùng (UC30)</h4>
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Họ Tên</th>
                      <th>Địa Chỉ Email</th>
                      <th>Vai Trò Hiện Tại</th>
                      <th>Xác Thực KYC</th>
                      <th style={{ textAlign: 'center' }}>Thay Đổi Quyền Vai Trò</th>
                      <th style={{ textAlign: 'center' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="table-user-cell">
                            <img src={u.avatar} alt={u.name} className="table-avatar" />
                            <strong>{u.name}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: u.role === 'admin' ? '#c084fc' : u.role === 'cskh' ? '#60a5fa' : u.role === 'owner' ? '#34d399' : '#cbd5e1' }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status-badge badge-${u.licenseStatus === 'verified' ? 'confirmed' : 'cancelled'}`}>
                            {u.licenseStatus === 'verified' ? 'Đã KYC' : 'Chưa KYC'}
                          </span>
                        </td>
                        <td>
                          <select 
                            value={u.role} 
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="filter-select"
                            style={{ width: 'auto', padding: '4px 10px', fontSize: '12px' }}
                            disabled={actionLoading || u.id === 'user-admin-1' /* Prevent self lock out */}
                          >
                            <option value="renter">Khách Thuê (Renter)</option>
                            <option value="owner">Chủ Xe (Owner)</option>
                            <option value="cskh">Chăm Sóc Khách (CSKH)</option>
                            <option value="admin">Quản Trị Viên (Admin)</option>
                          </select>
                        </td>
                        <td>
                          <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                            <button 
                              className="btn-approve btn-danger" 
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={actionLoading || u.role === 'admin' /* Prevent deleting admins for security */}
                              style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} /> Xóa Account
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- driver license / KYC image lightbox popup --- */}
      {selectedLicenseImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedLicenseImage(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="lightbox-header">
              <h4>Xem Hồ Sơ Giấy Tờ KYC Gốc</h4>
              <button className="btn-close-lightbox" onClick={() => setSelectedLicenseImage(null)}><X size={20} /></button>
            </div>
            <div className="lightbox-body" style={{ padding: 20, background: '#050508' }}>
              <img src={selectedLicenseImage} alt="Identity/License document review" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
