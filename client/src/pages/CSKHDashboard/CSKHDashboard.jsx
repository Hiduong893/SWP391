import React, { useState, useEffect } from 'react';
import {
  Headphones, ShieldCheck, CreditCard, MessageSquare,
  Home, LogOut, RefreshCw, Search, X, Sun, Moon,
  Car, Bell
} from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './CSKHDashboard.css';

import { CSKHHomeTab }    from './CSKHHomeTab';
import { CSKHKycTab }     from './CSKHKycTab';
import { CSKHPaymentTab } from './CSKHPaymentTab';
import { CSKHSupportTab } from './CSKHSupportTab';

const NAV_TABS = [
  { key: 'home',    label: 'Tổng quan',          icon: <Home size={17} /> },
  { key: 'kyc',     label: 'KYC & Tài khoản',    icon: <ShieldCheck size={17} />, countKey: 'pendingKyc' },
  { key: 'payment', label: 'Thanh toán & Cọc',   icon: <CreditCard size={17} />,  countKey: 'pendingPayment' },
  { key: 'support', label: 'Hỗ trợ & Sự cố',     icon: <Headphones size={17} />,  countKey: 'urgentSupport', pulse: true },
];

export const CSKHDashboard = ({ setCurrentTab }) => {
  const [activeTab, setActiveTab]       = useState('home');
  const [isDarkMode, setIsDarkMode]     = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cskhUser, setCskhUser]         = useState(null);

  // --- Data ---
  const [usersList,      setUsersList]      = useState([]);
  const [bookingsList,   setBookingsList]   = useState([]);
  const [reviewsList,    setReviewsList]    = useState([]);
  const [ticketsList,    setTicketsList]    = useState([]);
  const [incidentsList,  setIncidentsList]  = useState([]);
  const [disputesList,   setDisputesList]   = useState([]);

  // --- Interaction State ---
  const [selectedTicket,   setSelectedTicket]   = useState(null);
  const [replyText,        setReplyText]         = useState('');
  const [selectedDispute,  setSelectedDispute]   = useState(null);
  const [disputeVerdict,   setDisputeVerdict]    = useState('');
  const [selectedLicenseImage, setSelectedLicenseImage] = useState(null);

  const { showToast } = useToast();

  /* ---- Load data ---- */
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [usersData, bookingsData, reviews, tickets, incidents, disputes] = await Promise.allSettled([
        api.admin.getUsers(),
        api.admin.getBookings(),
        api.admin.getReviews(),
        api.admin.getSupportTickets(),
        api.admin.getIncidents(),
        api.admin.getDisputes(),
      ]);

      if (usersData.status    === 'fulfilled') setUsersList(usersData.value || []);
      if (bookingsData.status === 'fulfilled') setBookingsList(bookingsData.value || []);
      if (reviews.status      === 'fulfilled') setReviewsList(reviews.value || []);
      if (tickets.status      === 'fulfilled') setTicketsList(tickets.value || []);
      if (incidents.status    === 'fulfilled') setIncidentsList(incidents.value || []);
      if (disputes.status     === 'fulfilled') setDisputesList(disputes.value || []);

      // Load current user profile
      try {
        const profile = await api.user.getProfile();
        setCskhUser(profile.user);
      } catch (_) {}
    } catch (err) {
      showToast('Lỗi tải dữ liệu CSKH.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setReplyText(''); }, [selectedTicket]);
  useEffect(() => { setDisputeVerdict(''); }, [selectedDispute]);

  /* ---- Computed counts for badges ---- */
  const pendingKycUsers = usersList.filter(u => u.licenseStatus === 'pending');
  const pendingKyc      = pendingKycUsers.length;
  const pendingPayment  = bookingsList.filter(b =>
    (b.paymentMethod === 'vietqr' && b.depositStatus === 'pending') ||
    (b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled'))
  ).length;
  const openTickets      = ticketsList.filter(t => t.status === 'open').length;
  const activeIncidents  = incidentsList.filter(i => i.incident?.status === 'pending').length;
  const openDisputes     = disputesList.filter(d => d.status === 'open' || d.status === 'pending').length;
  const urgentSupport    = openTickets + activeIncidents + openDisputes;

  const badgeCounts = { pendingKyc, pendingPayment, urgentSupport };

  /* ---- Search filter ---- */
  const filteredUsers = usersList.filter(u =>
    !searchQuery ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredBookings = bookingsList.filter(b =>
    !searchQuery ||
    b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.carName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ---- Action Handlers ---- */
  const handleApproveKyc = async (userId, approve) => {
    setActionLoading(true);
    try {
      const status = approve ? 'verified' : 'rejected';
      const data = await api.admin.approveKyc(userId, status);
      showToast(data.message, 'success');
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi duyệt KYC.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleConfirmVietqr = async (bookingId) => {
    if (!window.confirm('Bạn xác nhận đã nhận được 500.000đ chuyển khoản VietQR cho booking này?')) return;
    setActionLoading(true);
    try {
      const data = await api.admin.confirmVietqr(bookingId);
      showToast(data.message, 'success');
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi xác nhận VietQR.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleRefundDeposit = async (bookingId, refund) => {
    const msg = refund
      ? 'Xác nhận HOÀN LẠI 5.000.000đ tiền cọc vào ví khách?'
      : 'Xác nhận GIỮ LẠI tiền cọc (khách vi phạm điều khoản)?';
    if (!window.confirm(msg)) return;
    setActionLoading(true);
    try {
      const status = refund ? 'refunded' : 'withheld';
      const data = await api.admin.refundDeposit(bookingId, status);
      showToast(data.message, 'success');
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi xử lý tiền cọc.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleReplyTicket = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setActionLoading(true);
    try {
      const data = await api.admin.replySupportTicket(selectedTicket.id, replyText);
      showToast(data.message, 'success');
      setReplyText('');
      if (data.ticket) setSelectedTicket(data.ticket);
      else setSelectedTicket(null);
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi gửi phản hồi.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleResolveTicket = async (ticketId) => {
    if (!window.confirm('Bạn có chắc muốn đóng ticket hỗ trợ này?')) return;
    setActionLoading(true);
    try {
      const data = await api.admin.resolveSupportTicket(ticketId);
      showToast(data.message, 'success');
      setSelectedTicket(null);
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi đóng ticket.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleToggleReviewVisibility = async (reviewId, hide) => {
    setActionLoading(true);
    try {
      const status = hide ? 'hidden' : 'visible';
      const data = await api.admin.updateReviewStatus(reviewId, status);
      showToast(data.message, 'success');
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi cập nhật đánh giá.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleResolveIncident = async (bookingId) => {
    setActionLoading(true);
    try {
      const data = await api.admin.resolveIncident(bookingId);
      showToast(data.message, 'success');
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi xử lý sự cố.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!disputeVerdict.trim()) return;
    setActionLoading(true);
    try {
      const data = await api.admin.resolveDispute(selectedDispute.id, disputeVerdict);
      showToast(data.message, 'success');
      setDisputeVerdict('');
      setSelectedDispute(null);
      fetchData(true);
    } catch (e) { showToast(e.message || 'Lỗi giải quyết khiếu nại.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleLogout = () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    localStorage.removeItem('token');
    showToast('Đã đăng xuất thành công!', 'success');
    window.location.reload();
  };

  /* ---- Tab info for topbar ---- */
  const tabInfo = {
    home:    { title: 'Tổng quan',         sub: 'Xem nhanh tất cả nhiệm vụ cần xử lý hôm nay' },
    kyc:     { title: 'KYC & Tài khoản',   sub: 'Xác minh danh tính CCCD và Giấy phép lái xe' },
    payment: { title: 'Thanh toán & Cọc',  sub: 'Duyệt VietQR và quyết định hoàn/giữ cọc bảo đảm' },
    support: { title: 'Hỗ trợ & Sự cố',   sub: 'Phản hồi ticket, xử lý sự cố và tranh chấp khiếu nại' },
  };

  if (loading) {
    return (
      <div className="cskh-dashboard" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--cskh-text-muted)', fontSize: 14, margin: 0 }}>Đang tải dữ liệu CSKH...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cskh-dashboard ${!isDarkMode ? 'cskh-light' : ''}`}>

      {/* ========== SIDEBAR ========== */}
      <aside className="cskh-sidebar">
        {/* Brand */}
        <div className="cskh-brand" onClick={() => setCurrentTab && setCurrentTab('rent-car')} title="Quay lại trang chính">
          <div className="cskh-brand-icon">
            <Headphones size={18} color="#fff" />
          </div>
          <div className="cskh-brand-text">
            <h1>ViVuCar</h1>
            <span>CSKH Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="cskh-nav">
          <div className="cskh-nav-section">Menu chính</div>

          {NAV_TABS.map(tab => {
            const cnt = tab.countKey ? badgeCounts[tab.countKey] : 0;
            return (
              <button
                key={tab.key}
                className={`cskh-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {cnt > 0 && tab.pulse && <span className="cskh-pulse" />}
                {cnt > 0 && !tab.pulse && (
                  <span className={`cskh-nav-badge ${tab.key === 'kyc' ? 'amber' : tab.key === 'payment' ? 'indigo' : 'red'}`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}

        </nav>

        {/* Footer */}
        <div className="cskh-sidebar-footer">
          <div className="cskh-user-card" onClick={() => setCurrentTab && setCurrentTab('profile')}>
            <div className="cskh-user-avatar">
              {cskhUser?.name ? cskhUser.name.slice(0, 2).toUpperCase() : 'CS'}
            </div>
            <div>
              <div className="cskh-user-name">{cskhUser?.name || 'CSKH Staff'}</div>
              <div className="cskh-user-role">Chăm Sóc Khách Hàng</div>
            </div>
          </div>

          <button className="cskh-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ========== MAIN ========== */}
      <div className="cskh-main">

        {/* Top Bar */}
        <header className="cskh-topbar">
          <div>
            <div className="cskh-topbar-title">{tabInfo[activeTab]?.title}</div>
            <div className="cskh-topbar-sub">{tabInfo[activeTab]?.sub}</div>
          </div>

          <div className="cskh-topbar-right">
            {/* Search */}
            <div className="cskh-search-wrap">
              <Search size={14} className="cskh-search-icon" />
              <input
                type="text"
                className="cskh-search-input"
                placeholder="Tìm kiếm khách hàng, xe..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Refresh */}
            <button className="cskh-refresh-btn" onClick={() => fetchData(true)} disabled={actionLoading}>
              <RefreshCw size={13} style={{ animation: actionLoading ? 'spin 0.8s linear infinite' : 'none' }} />
              Làm mới
            </button>

            {/* Theme toggle */}
            <button
              className="cskh-refresh-btn"
              onClick={() => setIsDarkMode(d => !d)}
              title="Đổi giao diện"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="cskh-content">

          {activeTab === 'home' && (
            <CSKHHomeTab
              ticketsList={ticketsList}
              incidentsList={incidentsList}
              disputesList={disputesList}
              bookingsList={bookingsList}
              pendingKycUsers={pendingKycUsers}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'kyc' && (
            <CSKHKycTab
              pendingKycUsers={pendingKycUsers}
              filteredUsers={filteredUsers}
              setSelectedLicenseImage={setSelectedLicenseImage}
              handleApproveKyc={handleApproveKyc}
              actionLoading={actionLoading}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'payment' && (
            <CSKHPaymentTab
              filteredBookings={filteredBookings}
              handleRefundDeposit={handleRefundDeposit}
              handleConfirmVietqr={handleConfirmVietqr}
              actionLoading={actionLoading}
            />
          )}

          {activeTab === 'support' && (
            <CSKHSupportTab
              ticketsList={ticketsList}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              replyText={replyText}
              setReplyText={setReplyText}
              handleReplyTicket={handleReplyTicket}
              handleResolveTicket={handleResolveTicket}
              reviewsList={reviewsList}
              handleToggleReviewVisibility={handleToggleReviewVisibility}
              incidentsList={incidentsList}
              handleResolveIncident={handleResolveIncident}
              disputesList={disputesList}
              selectedDispute={selectedDispute}
              setSelectedDispute={setSelectedDispute}
              disputeVerdict={disputeVerdict}
              setDisputeVerdict={setDisputeVerdict}
              handleResolveDispute={handleResolveDispute}
              setSelectedLicenseImage={setSelectedLicenseImage}
              actionLoading={actionLoading}
            />
          )}

        </main>
      </div>

      {/* ========== Image Lightbox ========== */}
      {selectedLicenseImage && (
        <div className="cskh-img-popup-overlay" onClick={() => setSelectedLicenseImage(null)}>
          <div className="cskh-img-popup" onClick={e => e.stopPropagation()}>
            <img src={selectedLicenseImage} alt="KYC Document" />
            <button className="cskh-img-popup-close" onClick={() => setSelectedLicenseImage(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
