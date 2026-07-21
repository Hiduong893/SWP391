import React, { useState, useEffect } from 'react';
import {
  Users, Car, DollarSign, X, Settings, HelpCircle, Sun, Moon, Bell, LogOut,
  LayoutDashboard, Gift
} from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './AdminDashboard.css';

// Subcomponents
import { OverviewTab } from './OverviewTab';
import { FleetTab } from './FleetTab';
import { AccountsTab } from './AccountsTab';
import { CashFlowTab } from './CashFlowTab';
import { VoucherTab } from './VoucherTab';
import { ConfigTab } from './ConfigTab';

export const AdminDashboard = ({ setCurrentTab }) => {
  // Tabs: Overview, Fleet, Accounts, CashFlow, Reports, ConfigSystem
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('kyc'); // sub-tabs: kyc, cars_moderation, support, reviews, incidents, disputes, roles, ai_alerts

  // Theme state: light or dark
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('adminTheme') === 'dark');

  // Search filter inside tables
  const [searchQuery, setSearchQuery] = useState('');

  // Project statistics & states
  const [stats, setStats] = useState({ totalUsers: 0, totalCars: 0, totalBookings: 0, totalRevenue: 0 });
  const [currentUserRole, setCurrentUserRole] = useState('cskh'); // CSKH or Admin

  // Data lists
  const [usersList, setUsersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [carsList, setCarsList] = useState([]);
  const [pendingCars, setPendingCars] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [incidentsList, setIncidentsList] = useState([]);
  const [disputesList, setDisputesList] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  // Settings Config State (UC29)
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [platformName, setPlatformName] = useState('ViVuCar');
  const [serviceFee, setServiceFee] = useState(5);
  const [insuranceMul, setInsuranceMul] = useState(1.1);
  const [sysNotice, setSysNotice] = useState('');
  const [bankId, setBankId] = useState('mbbank');
  const [bankName, setBankName] = useState('ViVuCar Bank');
  const [bankAccountNumber, setBankAccountNumber] = useState('1900533588');
  const [bankAccountHolder, setBankAccountHolder] = useState('VIVUCAR SYSTEM');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLicenseImage, setSelectedLicenseImage] = useState(null); // Lightbox popup

  // Interaction/Reply states
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [disputeVerdict, setDisputeVerdict] = useState('');

  const { showToast } = useToast();

  // Load and apply theme
  useEffect(() => {
    localStorage.setItem('adminTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);



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
      const carsData = await api.cars.getCars({ all: 'true' });
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
      setMaintenanceMode(config.maintenanceMode === 'true' || config.maintenanceMode === true);
      setPlatformName(config.platformName || 'ViVuCar');
      setServiceFee(config.serviceFeePercent);
      setInsuranceMul(config.insuranceMultiplier);
      setSysNotice(config.systemNotice || '');
      setBankId(config.bankId || 'mbbank');
      setBankName(config.bankName || 'ViVuCar Bank');
      setBankAccountNumber(config.bankAccountNumber || '1900533588');
      setBankAccountHolder(config.bankAccountHolder || 'VIVUCAR SYSTEM');

      // 11. Monthly Revenue Stats (for chart)
      try {
        const monthly = await api.admin.getMonthlyStats();
        setMonthlyStats(monthly.monthlyStats || []);
      } catch (e) {
        console.warn('Monthly stats unavailable:', e.message);
      }

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

  // Reset chat reply inputs when switching between tickets
  useEffect(() => {
    setReplyText('');
  }, [selectedTicket]);

  // Reset dispute resolution text when switching between disputes
  useEffect(() => {
    setDisputeVerdict('');
  }, [selectedDispute]);

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

  // 1b. Lọc doanh thu theo ngày/tháng/năm
  const handleFilterRevenue = async (filterParams = {}) => {
    try {
      const statsData = await api.admin.getStats(filterParams);
      setStats(statsData.stats);

      const monthly = await api.admin.getMonthlyStats(filterParams);
      setMonthlyStats(monthly.monthlyStats || []);

      showToast('Đã trích xuất số liệu doanh thu!', 'success');
    } catch (error) {
      showToast('Lỗi lọc số liệu doanh thu.', 'error');
    }
  };

  // 1c. Xuất file Báo cáo Excel (.csv UTF-8 BOM chuẩn Microsoft Excel)
  const handleExportExcelReport = () => {
    try {
      const todayStr = new Date().toLocaleDateString('vi-VN');
      let csv = "\uFEFF"; // UTF-8 BOM for Microsoft Excel Vietnamese accents

      // Section 1: Overview KPIs
      csv += "=== BÁO CÁO TỔNG QUAN HỆ THỐNG VIVUCAR ===\n";
      csv += `Ngày xuất báo cáo:,${todayStr}\n`;
      csv += `Tổng doanh thu hệ thống:,${(stats.totalCashFlow || stats.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ\n`;
      csv += `Tổng số thành viên:,${usersList.length || stats.totalUsers || 0} tài khoản\n`;
      csv += `Tổng số chuyến xe đã đặt:,${bookingsList.length || stats.totalBookings || 0} đơn\n`;
      csv += `Tổng số xe cho thuê:,${carsList.length || stats.totalCars || 0} xe\n\n`;

      // Section 2: Bookings & Transactions
      csv += "=== CHI TIẾT ĐƠN HÀNG & CHUYẾN XE ===\n";
      csv += "Mã đơn,Khách hàng,Email,Dòng xe,Ngày đặt,Tổng tiền (VNĐ),Trạng thái\n";

      if (bookingsList && bookingsList.length > 0) {
        bookingsList.forEach((b, idx) => {
          const code = `BOOK-${b.id || b.booking_id || idx + 1}`;
          const name = `"${(b.renterName || b.userName || b.renter_name || 'Khách hàng').replace(/"/g, '""')}"`;
          const email = `"${(b.renterEmail || b.userEmail || b.renter_email || '').replace(/"/g, '""')}"`;
          const car = `"${(b.carName || b.car_name || 'VinFast VF 8 Plus').replace(/"/g, '""')}"`;
          const date = b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : (b.pickupDate ? new Date(b.pickupDate).toLocaleDateString('vi-VN') : todayStr);
          const amount = Number(b.totalPrice || b.total_amount || b.amount || 0);
          const status = b.status === 'completed' || b.status === 'confirmed' || b.status === 'paid' ? 'Đã thanh toán' : (b.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý');

          csv += `${code},${name},${email},${car},${date},${amount},${status}\n`;
        });
      }

      // Section 3: Users List
      csv += "\n=== DANH SÁCH THÀNH VIÊN ===\n";
      csv += "ID,Họ và tên,Email,Vai trò,Ngày đăng ký,Trạng thái KYC\n";
      if (usersList && usersList.length > 0) {
        usersList.forEach(u => {
          const uId = u.id || u.user_id;
          const uName = `"${(u.name || u.fullName || u.full_name || 'Thành viên').replace(/"/g, '""')}"`;
          const uEmail = `"${(u.email || '').replace(/"/g, '""')}"`;
          const uRole = u.role === 'admin' ? 'Admin' : (u.role === 'cskh' ? 'CSKH' : (u.role === 'owner' ? 'Chủ xe' : 'Khách thuê'));
          const uDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : todayStr;
          const uKyc = u.licenseStatus === 'verified' ? 'Đã xác thực KYC' : 'Chưa xác thực';

          csv += `${uId},${uName},${uEmail},${uRole},${uDate},${uKyc}\n`;
        });
      }

      // Section 4: Cars List
      csv += "\n=== DANH SÁCH XE HỆ THỐNG ===\n";
      csv += "ID,Tên xe,Biển số,Giá thuê/ngày (VNĐ),Địa điểm,Trạng thái\n";
      if (carsList && carsList.length > 0) {
        carsList.forEach(c => {
          const cId = c.id || c.vehicle_id;
          const cName = `"${(c.brand ? `${c.brand} ${c.model}` : (c.name || 'Mẫu xe')).replace(/"/g, '""')}"`;
          const cPlate = `"${(c.licensePlate || c.license_plate || c.plateNumber || '').replace(/"/g, '""')}"`;
          const cPrice = Number(c.pricePerDay || c.price_per_day || 0);
          const cLoc = `"${(c.location || c.city || 'TP.HCM').replace(/"/g, '""')}"`;
          const cStatus = c.status === 'available' ? 'Sẵn sàng cho thuê' : (c.status === 'busy' ? 'Đang được thuê' : 'Bảo trì');

          csv += `${cId},${cName},${cPlate},${cPrice},${cLoc},${cStatus}\n`;
        });
      }

      // Trigger file download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_Cao_Tong_Quan_ViVuCar_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("📊 Đã xuất file Báo cáo Excel (.csv) thành công!", "success");
    } catch (error) {
      console.error("Lỗi xuất báo cáo Excel:", error);
      showToast("Lỗi xuất file báo cáo Excel.", "error");
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
      if (data.ticket) {
        setSelectedTicket(data.ticket);
      } else {
        setSelectedTicket(null);
      }
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi gửi phản hồi.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    const confirmResolve = window.confirm("Bạn có chắc chắn muốn đóng và hoàn tất yêu cầu hỗ trợ này?");
    if (!confirmResolve) return;

    setActionLoading(true);
    try {
      const data = await api.admin.resolveSupportTicket(ticketId);
      showToast(data.message, 'success');
      setSelectedTicket(null);
      fetchDashboardData(true);
    } catch (error) {
      showToast(error.message || 'Lỗi đóng ticket hỗ trợ.', 'error');
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
    if (e && e.preventDefault) e.preventDefault();
    setActionLoading(true);
    try {
      const data = await api.admin.updateSystemConfig({
        maintenanceMode: String(maintenanceMode),
        platformName,
        serviceFeePercent: serviceFee,
        insuranceMultiplier: insuranceMul,
        systemNotice: sysNotice,
        bankId,
        bankName,
        bankAccountNumber,
        bankAccountHolder
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

  const handleLogout = () => {
    const confirmLog = window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?");
    if (!confirmLog) return;
    localStorage.removeItem('token');
    showToast("Đã đăng xuất thành công!", "success");
    window.location.reload();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper selectors
  const pendingKycUsers = usersList.filter(u => u.licenseStatus === 'pending' || u.cccdStatus === 'pending' || u.cccdBackStatus === 'pending' || u.faceStatus === 'pending');
  const verifiedKycUsers = usersList.filter(u => u.licenseStatus === 'verified');
  const isAdmin = currentUserRole === 'admin';

  // Search logic for dynamic filtering
  const filteredUsers = usersList.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCars = carsList.filter(c =>
    c.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = bookingsList.filter(b =>
    b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.carName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`admin-dashboard-page-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>

      {/*  SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div
          className="sidebar-brand"
          onClick={() => setCurrentTab && setCurrentTab('rent-car')}
          title="Quay lại màn hình chính"
        >
          <div className="brand-logo-circle">
            <Car size={22} className="brand-icon" />
          </div>
          <div className="brand-text-box">
            <h1 className="brand-title">ViVuCar</h1>
            <span className="brand-subtitle">Dashboard</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setActiveSubTab('kyc'); }}
          >
            <LayoutDashboard size={18} />
            <span>Tổng quan</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'fleet' ? 'active' : ''}`}
            onClick={() => { setActiveTab('fleet'); setActiveSubTab('cars_moderation'); }}
          >
            <Car size={18} />
            <span>Đội xe</span>
            {pendingCars.length > 0 && <span className="badge-count bg-green">{pendingCars.length}</span>}
          </button>

          <button
            className={`menu-item ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => { setActiveTab('accounts'); setActiveSubTab('kyc'); }}
          >
            <Users size={18} />
            <span>Tài khoản</span>
            {pendingKycUsers.length > 0 && <span className="badge-count bg-blue">{pendingKycUsers.length}</span>}
          </button>

          <button
            className={`menu-item ${activeTab === 'cashflow' ? 'active' : ''}`}
            onClick={() => { setActiveTab('cashflow'); setActiveSubTab('bookings'); }}
          >
            <DollarSign size={18} />
            <span>Dòng tiền</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports'); setActiveSubTab('vouchers'); }}
          >
            <Gift size={18} />
            <span>Gói & Thanh toán</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          {/* Profile widget in sidebar footer */}
          <div
            className="sidebar-profile"
            onClick={() => setCurrentTab && setCurrentTab('profile')}
            title="Xem hồ sơ cá nhân"
          >
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-circle" style={{ background: 'linear-gradient(135deg, #009698 0%, #00bfa5 100%)' }}>AD</div>
            </div>
            <div className="profile-text-box">
              <span className="profile-name">Administrator</span>
              <span className="profile-role">{currentUserRole === 'admin' ? 'Quản trị viên' : 'Hỗ trợ CSKH'}</span>
            </div>
          </div>

          {isAdmin && (
            <button
              className={`menu-item ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => { setActiveTab('config'); setActiveSubTab('config'); }}
            >
              <Settings size={18} />
              <span>Cấu hình</span>
            </button>
          )}

          <button className="menu-item logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="admin-main">

        {/* HEADER BAR */}
        <header className="admin-header">
          <div className="header-title-area">
            <h2 className="viewport-title">
              {activeTab === 'overview' && 'Tổng quan hệ thống'}
              {activeTab === 'fleet' && 'Quản lý đội xe hệ thống'}
              {activeTab === 'accounts' && 'Quản trị người dùng & KYC'}
              {activeTab === 'cashflow' && 'Giám sát dòng tiền & Thanh toán'}
              {activeTab === 'reports' && 'Quản lý Gói dịch vụ & Mã Giảm Giá'}
              {activeTab === 'config' && 'Cấu hình hệ thống dịch vụ'}
            </h2>


            {activeTab === 'fleet' && (
              <div className="subtabs-bar">
                <button className={`subtab-btn ${activeSubTab === 'cars_moderation' ? 'active' : ''}`} onClick={() => setActiveSubTab('cars_moderation')}>
                  Xe chờ duyệt ({pendingCars.length})
                </button>
                <button className={`subtab-btn ${activeSubTab === 'all_cars' ? 'active' : ''}`} onClick={() => setActiveSubTab('all_cars')}>
                  Tất cả xe ({carsList.length})
                </button>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="subtabs-bar">
                <button className={`subtab-btn ${activeSubTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveSubTab('kyc')}>
                  Duyệt KYC ({pendingKycUsers.length})
                </button>
                <button className={`subtab-btn ${activeSubTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveSubTab('roles')}>
                  Thành viên ({usersList.length})
                </button>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="subtabs-bar flex-wrap" style={{ gap: 2 }}>
                <button className={`subtab-btn ${activeSubTab === 'vouchers' ? 'active' : ''}`} onClick={() => setActiveSubTab('vouchers')}>
                  Mã Giảm Giá
                </button>
              </div>
            )}
          </div>

          <div className="header-actions">
            {activeTab === 'overview' && (
              <button
                className="action-btn btn-outline header-report-btn"
                onClick={handleExportExcelReport}
              >
                📊 Xuất báo cáo Excel
              </button>
            )}

            {/* Notification bell */}
            <button className="icon-btn notification-btn" title="Thông báo" onClick={() => showToast("Chưa có thông báo hệ thống mới.", "success")}>
              <Bell size={18} />
              {(pendingCars.length > 0 || pendingKycUsers.length > 0) && <span className="notification-dot"></span>}
            </button>

            {/* Theme toggle */}
            <button
              className="icon-btn theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
            >
              {isDarkMode ? <Sun size={18} className="text-yellow" /> : <Moon size={18} />}
            </button>

            {/* Help circle */}
            <button className="icon-btn" title="Trợ giúp" onClick={() => showToast("Hệ thống Hỗ trợ ViVuCar 24/7", "info")}>
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* VIEWPORTS CONTAINER */}
        <div className="admin-viewport">
          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              usersList={usersList}
              bookingsList={bookingsList}
              carsList={carsList}
              monthlyStats={monthlyStats}
              handleUpdateUserRole={handleUpdateUserRole}
              handleApproveKyc={handleApproveKyc}
              onFilterRevenue={handleFilterRevenue}
              onExportExcel={handleExportExcelReport}
              actionLoading={actionLoading}
              showToast={showToast}
              setActiveTab={setActiveTab}
              setActiveSubTab={setActiveSubTab}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetTab
              activeSubTab={activeSubTab}
              pendingCars={pendingCars}
              filteredCars={filteredCars}
              handleModerateCar={handleModerateCar}
              handleDeleteCar={handleDeleteCar}
              actionLoading={actionLoading}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsTab
              activeSubTab={activeSubTab}
              pendingKycUsers={pendingKycUsers}
              filteredUsers={filteredUsers}
              setSelectedLicenseImage={setSelectedLicenseImage}
              handleApproveKyc={handleApproveKyc}
              handleUpdateUserRole={handleUpdateUserRole}
              handleDeleteUser={handleDeleteUser}
              actionLoading={actionLoading}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowTab
              filteredBookings={filteredBookings}
              formatCurrency={formatCurrency}
              handleRefundDeposit={handleRefundDeposit}
              actionLoading={actionLoading}
            />
          )}

          {activeTab === 'reports' && (
            <VoucherTab
              actionLoading={actionLoading}
              setActionLoading={setActionLoading}
              carsList={carsList}
              bookingsList={bookingsList}
            />
          )}

          {activeTab === 'config' && isAdmin && (
            <ConfigTab
              maintenanceMode={maintenanceMode}
              setMaintenanceMode={setMaintenanceMode}
              platformName={platformName}
              setPlatformName={setPlatformName}
              serviceFee={serviceFee}
              setServiceFee={setServiceFee}
              insuranceMul={insuranceMul}
              setInsuranceMul={setInsuranceMul}
              sysNotice={sysNotice}
              setSysNotice={setSysNotice}
              bankId={bankId}
              setBankId={setBankId}
              bankName={bankName}
              setBankName={setBankName}
              bankAccountNumber={bankAccountNumber}
              setBankAccountNumber={setBankAccountNumber}
              bankAccountHolder={bankAccountHolder}
              setBankAccountHolder={setBankAccountHolder}
              handleUpdateConfig={handleUpdateConfig}
              actionLoading={actionLoading}
            />
          )}
        </div>
      </main>

      {/* --- LIGHTBOX POPUP REVIEW KYC DOCUMENTS --- */}
      {selectedLicenseImage && (
        <div className="kyc-lightbox-overlay" onClick={() => setSelectedLicenseImage(null)}>
          <div className="kyc-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="kyc-lightbox-header">
              <h4>Chi tiết giấy tờ tùy thân kiểm duyệt</h4>
              <button className="kyc-close-btn" onClick={() => setSelectedLicenseImage(null)}><X size={20} /></button>
            </div>
            <div className="kyc-lightbox-body">
              <img src={selectedLicenseImage} alt="Identity verification doc review" className="kyc-large-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
