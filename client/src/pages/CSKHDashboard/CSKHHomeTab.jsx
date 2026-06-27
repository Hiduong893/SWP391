import React from 'react';
import {
  Headphones, CheckCircle, Clock, AlertTriangle, Star,
  CreditCard, Users, Zap, ArrowRight, ShieldCheck
} from 'lucide-react';

export const CSKHHomeTab = ({
  ticketsList = [],
  incidentsList = [],
  disputesList = [],
  bookingsList = [],
  pendingKycUsers = [],
  setActiveTab,
}) => {
  const openTickets    = ticketsList.filter(t => t.status === 'open').length;
  const pendingKyc     = pendingKycUsers.length;
  const activeIncidents = incidentsList.filter(i => i.incident?.status === 'pending').length;
  const openDisputes   = disputesList.filter(d => d.status === 'open' || d.status === 'pending').length;
  const pendingVietqr  = bookingsList.filter(b => b.paymentMethod === 'vietqr' && b.depositStatus === 'pending').length;
  const pendingRefunds = bookingsList.filter(b => b.depositStatus === 'paid' && (b.status === 'completed' || b.status === 'cancelled')).length;

  const kpis = [
    {
      label: 'Ticket hỗ trợ',
      value: openTickets,
      sub: 'đang chờ phản hồi',
      icon: <Headphones size={20} />,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
      tab: 'support',
      urgent: openTickets > 0,
    },
    {
      label: 'KYC chờ duyệt',
      value: pendingKyc,
      sub: 'hồ sơ chờ xác minh',
      icon: <ShieldCheck size={20} />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      tab: 'kyc',
      urgent: pendingKyc > 0,
    },
    {
      label: 'Sự cố khẩn cấp',
      value: activeIncidents,
      sub: 'chưa xử lý',
      icon: <AlertTriangle size={20} />,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
      tab: 'support',
      urgent: activeIncidents > 0,
    },
    {
      label: 'Tranh chấp mở',
      value: openDisputes,
      sub: 'khiếu nại cần giải quyết',
      icon: <Users size={20} />,
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.12)',
      tab: 'support',
      urgent: openDisputes > 0,
    },
    {
      label: 'Duyệt VietQR',
      value: pendingVietqr,
      sub: 'giao dịch đang chờ',
      icon: <CreditCard size={20} />,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
      tab: 'payment',
      urgent: pendingVietqr > 0,
    },
    {
      label: 'Hoàn/giữ cọc',
      value: pendingRefunds,
      sub: 'chuyến đi hoàn tất',
      icon: <CheckCircle size={20} />,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      tab: 'payment',
      urgent: pendingRefunds > 0,
    },
  ];

  const totalUrgent = openTickets + activeIncidents + openDisputes + pendingVietqr + pendingKyc;

  return (
    <div className="cskh-fade">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Headphones size={22} color="#818cf8" />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--cskh-text)' }}>
              Trung tâm Chăm sóc Khách hàng
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--cskh-text-muted)' }}>
            Tổng hợp các nhiệm vụ cần xử lý hôm nay · ViVuCar CSKH System
          </p>
        </div>
        {totalUrgent > 0 && (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{totalUrgent}</div>
            <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 3 }}>việc cần làm</div>
          </div>
        )}
        {totalUrgent === 0 && (
          <div style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>✓</div>
            <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)', marginTop: 3 }}>Đã xử lý hết</div>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cskh-text)' }}>Tình trạng theo dõi</span>
        </div>
        <div className="cskh-kpi-grid">
          {kpis.map((k, i) => (
            <div
              key={i}
              className="cskh-kpi-card"
              onClick={() => k.tab && setActiveTab(k.tab)}
              style={{ cursor: k.tab ? 'pointer' : 'default' }}
            >
              <div className="cskh-kpi-icon" style={{ background: k.bg, color: k.color }}>
                {k.icon}
              </div>
              <div>
                <div className="cskh-kpi-label">{k.label}</div>
                <div className="cskh-kpi-value" style={{ color: k.urgent && k.value > 0 ? k.color : undefined }}>
                  {k.value}
                </div>
                <div className="cskh-kpi-sub">{k.sub}</div>
              </div>
              {k.tab && (
                <ArrowRight size={14} style={{ marginLeft: 'auto', color: '#64748b', alignSelf: 'center' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {/* Recent Bookings Summary */}
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <Clock size={15} color="#6366f1" />
              Booking gần đây
            </h4>
          </div>
          <div className="cskh-card-body" style={{ padding: '12px 0 0' }}>
            {bookingsList.slice(0, 5).map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cskh-text)' }}>{b.userName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--cskh-text-muted)' }}>{b.carName}</div>
                </div>
                <span className={`cskh-badge ${b.status === 'completed' ? 'cskh-badge-green' : b.status === 'cancelled' ? 'cskh-badge-red' : b.status === 'approved' ? 'cskh-badge-blue' : 'cskh-badge-amber'}`}>
                  {b.status === 'completed' ? 'Hoàn tất' : b.status === 'cancelled' ? 'Đã hủy' : b.status === 'approved' ? 'Đã duyệt' : 'Đang chờ'}
                </span>
              </div>
            ))}
            {bookingsList.length === 0 && (
              <div className="cskh-empty" style={{ padding: '20px' }}>
                <p>Chưa có booking nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="cskh-card">
          <div className="cskh-card-header">
            <h4 className="cskh-card-title">
              <Star size={15} color="#f59e0b" />
              Đánh giá mới nhất
            </h4>
          </div>
          <div className="cskh-card-body" style={{ padding: '12px 0 0' }}>
            <div className="cskh-empty" style={{ padding: '30px 20px' }}>
              <Zap size={28} />
              <p style={{ fontSize: 12 }}>Chuyển sang tab <strong>Hỗ trợ & Sự cố</strong> để quản lý đánh giá</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
