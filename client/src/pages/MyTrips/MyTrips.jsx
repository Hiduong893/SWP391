import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, DollarSign, RefreshCw, X, ShieldCheck, Compass, Info, FileText, AlertTriangle, Star, ShieldAlert, Award, Upload, MessageSquare, PhoneCall, Send, CheckSquare, ClipboardList, Zap } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './MyTrips.css';

export const MyTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Support Tickets States (UC07)
  const [tickets, setTickets] = useState([]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [selectedMyTicket, setSelectedMyTicket] = useState(null);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Modal active states
  const [activeHandoverTrip, setActiveHandoverTrip] = useState(null); // { trip, type: 'pickup' | 'return' }
  const [activeIncidentTrip, setActiveIncidentTrip] = useState(null); // trip
  const [activeReviewTrip, setActiveReviewTrip] = useState(null); // trip
  const [activeDisputeTrip, setActiveDisputeTrip] = useState(null); // trip

  // Form states
  const [handoverChecks, setHandoverChecks] = useState({
    noScratches: false,
    fuelOk: false,
    cleanCar: false,
    tiresOk: false
  });
  const [renterSignature, setRenterSignature] = useState('');

  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentImage, setIncidentImage] = useState(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [disputeDesc, setDisputeDesc] = useState('');

  const fetchTrips = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.bookings.getMyTrips();
      setTrips(data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      showToast('Không thể tải lịch sử chuyến đi.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMyTickets = async () => {
    try {
      const data = await api.support.getMyTickets();
      setTickets(data);
    } catch (e) {
      console.warn("Lỗi tải danh sách yêu cầu hỗ trợ.");
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchMyTickets();
  }, []);

  const handleCancelTrip = async (id) => {
    const confirmCancel = window.confirm('Xác nhận hủy đơn đặt xe?\n\nTiền cọc 5.000.000 VND sẽ được hoàn trả tự động về Ví của bạn trong vòng vài phút.');
    if (!confirmCancel) return;

    try {
      const data = await api.bookings.cancel(id);
      showToast(data.message, 'success');
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi hủy đơn đặt xe.', 'error');
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!renterSignature.trim()) {
      showToast('Vui lòng ký tên xác nhận biên bản bàn giao xe.', 'warning');
      return;
    }

    const { trip, type } = activeHandoverTrip;
    const checklist = Object.keys(handoverChecks).filter(k => handoverChecks[k]);

    try {
      const data = await api.bookings.signHandover(trip.id, type, checklist, renterSignature);
      showToast(data.message, 'success');
      setActiveHandoverTrip(null);
      setRenterSignature('');
      setHandoverChecks({ noScratches: false, fuelOk: false, cleanCar: false, tiresOk: false });
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi ký biên bản bàn giao.', 'error');
    }
  };

  const handleIncidentImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setIncidentImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!incidentDesc.trim()) {
      showToast('Vui lòng nhập mô tả chi tiết sự cố phát sinh.', 'warning');
      return;
    }

    try {
      const data = await api.bookings.reportIncident(activeIncidentTrip.id, incidentDesc, incidentImage);
      showToast(data.message, 'success');
      setActiveIncidentTrip(null);
      setIncidentDesc('');
      setIncidentImage(null);
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi báo cáo sự cố.', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.reviews.createReview(activeReviewTrip.id, reviewRating, reviewComment);
      showToast(data.message, 'success');
      setActiveReviewTrip(null);
      setReviewRating(5);
      setReviewComment('');
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi đăng đánh giá.', 'error');
    }
  };

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeDesc.trim()) {
      showToast('Vui lòng điền nội dung khiếu nại tranh chấp.', 'warning');
      return;
    }

    try {
      const data = await api.support.createDispute(activeDisputeTrip.id, disputeDesc);
      showToast(data.message, 'success');
      setActiveDisputeTrip(null);
      setDisputeDesc('');
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi gửi khiếu nại.', 'error');
    }
  };

  // Support ticket creation (UC07)
  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMsg.trim()) return;

    try {
      const data = await api.support.createTicket(ticketSubject, ticketMsg);
      showToast(data.message, 'success');
      setTicketSubject('');
      setTicketMsg('');
      setShowSupportForm(false);
      fetchMyTickets();
    } catch (error) {
      showToast(error.message || 'Lỗi gửi yêu cầu hỗ trợ.', 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_owner':
        return <span className="trip-badge badge-pending">Chờ chủ xe duyệt</span>;
      case 'confirmed':
        return <span className="trip-badge badge-confirmed">Đã cọc - Chờ nhận xe</span>;
      case 'active':
        return <span className="trip-badge badge-active">Đang thuê (Hành trình)</span>;
      case 'completed':
        return <span className="trip-badge badge-completed">Đã hoàn thành</span>;
      case 'cancelled':
        return <span className="trip-badge badge-cancelled">Đã hủy</span>;
      case 'disputed':
        return <span className="trip-badge badge-dispute">Đang tranh chấp</span>;
      default:
        return <span className="trip-badge badge-pending">Đang xử lý</span>;
    }
  };

  const calculateDays = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  return (
    <div className="my-trips-page">
      <div className="trips-header">
        <h2 className="title">Chuyến Đi Của Tôi</h2>
        <button onClick={() => fetchTrips()} className="btn-refresh" title="Làm mới danh sách">
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="subtitle" style={{ textAlign: 'left', marginBottom: '24px' }}>
        Theo dõi hành trình, quản lý thanh toán, ký biên bản điện tử nhận/trả xe và gửi đánh giá tại ViVuCar.
      </p>

      {loading ? (
        <div className="trips-loading">Đang tải lịch sử chuyến đi...</div>
      ) : trips.length === 0 ? (
        <div className="trips-empty-state">
          <Compass size={48} className="text-muted mb-2 animate-pulse" />
          <h3>Chưa có chuyến đi nào!</h3>
          <p>Bạn chưa thực hiện bất kỳ giao dịch thuê xe tự lái nào.</p>
        </div>
      ) : (
        <div className="trips-list">
          {trips.map((trip) => {
            const car = trip.car;
            const days = calculateDays(trip.pickupDate, trip.returnDate);
            const isCancellable = (trip.status === 'confirmed' || trip.status === 'pending_owner') && new Date(trip.pickupDate) > new Date();

            return (
              <div key={trip.id} className={`trip-card-glass ${trip.status === 'cancelled' ? 'cancelled' : ''} ${trip.status === 'active' ? 'active-trip-glow' : ''}`}>
                {/* Car Photo */}
                <img src={car.image} alt={car.model} className="trip-car-img" />

                {/* Content */}
                <div className="trip-card-body">
                  <div className="trip-card-header">
                    <div>
                      <span className="trip-brand-lbl">{car.brand}</span>
                      <h3 className="trip-model-title">{car.model}</h3>
                    </div>
                    {getStatusBadge(trip.status)}
                  </div>

                  {/* Trip details */}
                  <div className="trip-meta-grid">
                    <div className="trip-meta-item">
                      <MapPin size={14} className="text-muted" />
                      <span>Nhận xe tại: <strong>{trip.pickupLocation}</strong></span>
                    </div>

                    <div className="trip-meta-item">
                      <Calendar size={14} className="text-muted" />
                      <span>Hành trình: <strong>{trip.pickupDate} ➔ {trip.returnDate} ({days} ngày)</strong></span>
                    </div>

                    <div className="trip-meta-item">
                      <DollarSign size={14} className="text-muted" />
                      <span>Tổng phí + Cọc: <strong className="text-primary">{formatCurrency(trip.totalPrice + 5000000)}</strong> (Đã cọc bảo đảm: 5.000.000đ)</span>
                    </div>

                    {trip.depositStatus && (
                      <div className="trip-meta-item">
                        <Award size={14} className="text-muted" />
                        <span>Trạng thái cọc: <strong style={{ color: trip.depositStatus === 'refunded' ? '#34d399' : '#fbbf24' }}>
                          {trip.depositStatus === 'paid' ? 'Đã thu cọc (Giữ bảo đảm)' : trip.depositStatus === 'refunded' ? 'Đã hoàn cọc 100% ✓' : 'Đang xử lý hoàn cọc'}
                        </strong></span>
                      </div>
                    )}
                  </div>

                  {trip.issueReport && (
                    <div className="trip-incident-box mt-2">
                      <ShieldAlert size={14} />
                      <span>Sự cố ghi nhận: <strong>{trip.issueReport.description}</strong> - Trạng thái:
                        <strong className={trip.issueReport.status === 'resolved' ? ' text-success' : ' text-warning'}>
                          {trip.issueReport.status === 'resolved' ? ' Đã xử lý' : ' Đang chờ xử lý'}
                        </strong>
                      </span>
                    </div>
                  )}

                  <hr className="trip-card-divider" />

                  {/* Actions Area */}
                  <div className="trip-card-footer">
                    <div className="booking-date-sub">
                      <span>Mã vé: <strong>{trip.id.slice(0, 8).toUpperCase()}</strong></span>
                      <span className="ml-2">• {new Date(trip.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <div className="trip-actions-buttons-row">
                      {/* UC18: Ký nhận bàn giao xe */}
                      {trip.status === 'confirmed' && (
                        <button
                          className="btn btn-primary btn-action-trip"
                          onClick={() => setActiveHandoverTrip({ trip, type: 'pickup' })}
                        >
                          <ClipboardList size={13} />
                          Nhận xe
                        </button>
                      )}

                      {/* UC18: Ký trả xe */}
                      {trip.status === 'active' && (
                        <>
                          <button
                            className="btn btn-primary btn-action-trip btn-success-bg"
                            onClick={() => setActiveHandoverTrip({ trip, type: 'return' })}
                          >
                            <CheckSquare size={13} />
                            Trả xe
                          </button>

                          {/* UC17: Báo sự cố */}
                          <button
                            className="btn btn-secondary btn-action-trip border-danger-glow"
                            onClick={() => setActiveIncidentTrip(trip)}
                          >
                            <Zap size={13} />
                            Báo sự cố
                          </button>
                        </>
                      )}

                      {/* UC16: Đánh giá & UC34: Khiếu nại */}
                      {trip.status === 'completed' && (
                        <>
                          {!trip.hasReviewed ? (
                            <button
                              className="btn btn-action-trip"
                              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(245,158,11,0.3)' }}
                              onClick={() => setActiveReviewTrip(trip)}
                            >
                              <Star size={13} fill="white" color="white" />
                              Đánh giá
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ShieldCheck size={13} /> Đã đánh giá
                            </span>
                          )}

                          <button
                            className="btn btn-secondary btn-action-trip"
                            style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#dc2626', background: 'rgba(239,68,68,0.05)' }}
                            onClick={() => setActiveDisputeTrip(trip)}
                          >
                            <ShieldAlert size={13} />
                            Khiếu nại
                          </button>
                        </>
                      )}

                      {isCancellable && (
                        <button
                          onClick={() => handleCancelTrip(trip.id)}
                          className="btn-cancel-trip"
                        >
                          <X size={14} />
                          Hủy đặt xe
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📞 UC07: HỆ THỐNG LIÊN HỆ CHĂM SÓC KHÁCH HÀNG 24/7 --- */}
      <div className="support-tickets-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              <MessageSquare size={20} style={{ color: '#009698' }} />
              <span>Hỗ Trợ & CSKH 24/7</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 4 }}>
              Gửi yêu cầu hỗ trợ hoặc gọi hotline 1900.8888 để được cứu hộ khẩn cấp.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a href="tel:19008888" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', background: 'rgba(0,150,152,0.08)', color: '#009698', border: '1px solid rgba(0,150,152,0.2)', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '10px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}>
              <PhoneCall size={14} />
              <span>1900.8888</span>
            </a>
            <button style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', background: 'var(--accent-gradient)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setShowSupportForm(!showSupportForm)}>
              + Gửi Yêu Cầu
            </button>
          </div>
        </div>

        {/* Create Ticket Form */}
        {showSupportForm && (
          <form onSubmit={handleCreateTicketSubmit} style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 12, padding: 20, marginBottom: 20, animation: 'fadeIn 0.2s' }}>
            <h4 style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={15} style={{ color: '#009698' }} />
              Tạo yêu cầu hỗ trợ mới
            </h4>

            <div className="form-group">
              <label className="form-label">Tiêu đề vấn đề cần hỗ trợ *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Vd: Không thanh toán được ví, Sự cố va quẹt xe..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group mt-4">
              <label className="form-label">Mô tả chi tiết *</label>
              <textarea
                rows={3}
                className="form-control"
                style={{ resize: 'vertical' }}
                placeholder="Cung cấp thông tin chi tiết về vấn đề để CSKH hỗ trợ nhanh hơn..."
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => setShowSupportForm(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '8px 20px', fontSize: '13px' }}>
                <Send size={14} /> Gửi yêu cầu
              </button>
            </div>
          </form>
        )}

        {/* Tickets list */}
        {tickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedMyTicket(t)}
                style={{ padding: '14px 18px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#009698'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,150,152,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', fontWeight: 600 }}>{t.subject}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b', marginTop: 2, display: 'block' }}>
                    {new Date(t.createdAt).toLocaleDateString('vi-VN')} •
                    <strong style={{ color: t.status === 'replied' ? '#7c3aed' : t.status === 'resolved' ? '#059669' : '#d97706', marginLeft: 4 }}>
                      {t.status === 'open' ? 'Đang xử lý' : t.status === 'replied' ? 'Đã có phản hồi ✓' : 'Đã đóng'}
                    </strong>
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#009698', fontWeight: 700, flexShrink: 0 }}>Xem chat →</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Chưa có yêu cầu hỗ trợ nào. Nhấn nút bên trên để gửi yêu cầu khi cần thiết.
          </div>
        )}
      </div>

      {/* --- POPUP CHAT VỚI CSKH THÀNH VIÊN (UC07) --- */}
      {selectedMyTicket && (
        <div className="lightbox-overlay" onClick={() => setSelectedMyTicket(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="lightbox-header" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}>
              <h4><MessageSquare size={18} style={{ color: '#009698' }} />Hội Thoại Trực Tuyến CSKH</h4>
              <button className="btn-close-lightbox" onClick={() => setSelectedMyTicket(null)}><X size={18} /></button>
            </div>

            <div className="editor-modal-body" style={{ display: 'flex', flexDirection: 'column', height: '400px', padding: 20 }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8, marginBottom: 12, textAlign: 'left', width: '100%' }}>
                <strong style={{ fontSize: '14px', color: 'white' }}>{selectedMyTicket.subject}</strong>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Mã ticket: {selectedMyTicket.id.slice(0, 8).toUpperCase()}</p>
              </div>

              {/* Chat list inside popup */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', paddingRight: 4, marginBottom: 12 }}>
                {/* Renter prompt */}
                <div style={{ alignSelf: 'flex-end', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', padding: 10, borderRadius: 8, maxWidth: '80%', textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', color: 'white' }}>{selectedMyTicket.message}</p>
                  <span style={{ fontSize: '9px', color: '#818cf8', display: 'block', marginTop: 4 }}>Bạn - {new Date(selectedMyTicket.createdAt).toLocaleTimeString()}</span>
                </div>

                {/* Replies from CSKH */}
                {selectedMyTicket.replies.map((rep, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: rep.sender === 'cskh' ? 'flex-start' : 'flex-end',
                      background: rep.sender === 'cskh' ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
                      padding: 10,
                      borderRadius: 8,
                      maxWidth: '80%',
                      textAlign: 'left'
                    }}
                  >
                    <p style={{ fontSize: '13px', color: '#e2e8f0' }}>{rep.text}</p>
                    <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: 4 }}>{rep.sender === 'cskh' ? 'CSKH Minh Anh' : 'Bạn'} - {new Date(rep.sentAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>

              <div className="editor-modal-footer" style={{ padding: 0, border: 'none', background: 'none', width: '100%', display: 'flex', gap: 8 }}>
                {selectedMyTicket.status !== 'resolved' ? (
                  <form 
                    style={{ display: 'flex', width: '100%', gap: 8 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!replyText.trim()) return;
                      const newReply = { sender: 'renter', text: replyText, sentAt: new Date().toISOString() };
                      setSelectedMyTicket(prev => ({ ...prev, replies: [...prev.replies, newReply] }));
                      setReplyText('');
                      showToast('Đã gửi phản hồi thành công!', 'success');
                    }}
                  >
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nhập tin nhắn..." 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ flex: 1, fontSize: '13px' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 16px' }}>
                      <Send size={14} /> Gửi
                    </button>
                  </form>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '12px', alignSelf: 'center', width: '100%', textAlign: 'center' }}>Hội thoại đã kết thúc</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP 1: BIÊN BẢN BÀN GIAO ĐIỆN TỬ (UC18) --- */}
      {activeHandoverTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveHandoverTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="lightbox-header" style={{ background: activeHandoverTrip.type === 'pickup' ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' }}>
              <h4>
                {activeHandoverTrip.type === 'pickup'
                  ? <><ClipboardList size={18} style={{ color: '#059669' }} />Biên Bản Nhận Xe Điện Tử</>
                  : <><CheckSquare size={18} style={{ color: '#2563eb' }} />Biên Bản Trả Xe Điện Tử</>}
              </h4>
              <button className="btn-close-lightbox" onClick={() => setActiveHandoverTrip(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleHandoverSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice mb-4">
                <Info size={16} />
                <span>Vui lòng kiểm tra thực tế tình trạng xe cùng chủ xe <strong>trước khi ký</strong> biên bản bàn giao điện tử.</span>
              </div>

              <div className="checklist-group">
                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={handoverChecks.noScratches}
                    onChange={(e) => setHandoverChecks({ ...handoverChecks, noScratches: e.target.checked })}
                    required
                  />
                  <span>Xác nhận không phát sinh vết trầy xước/va quẹt mới</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={handoverChecks.fuelOk}
                    onChange={(e) => setHandoverChecks({ ...handoverChecks, fuelOk: e.target.checked })}
                    required
                  />
                  <span>Xác nhận mức nhiên liệu/điện chuẩn theo quy định (&gt;50%)</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={handoverChecks.cleanCar}
                    onChange={(e) => setHandoverChecks({ ...handoverChecks, cleanCar: e.target.checked })}
                    required
                  />
                  <span>Xác nhận khoang cabin sạch sẽ, không mùi hôi</span>
                </label>

                <label className="checkbox-item-custom">
                  <input
                    type="checkbox"
                    checked={handoverChecks.tiresOk}
                    onChange={(e) => setHandoverChecks({ ...handoverChecks, tiresOk: e.target.checked })}
                    required
                  />
                  <span>Kiểm tra áp suất lốp, phanh xe, đèn và còi hoạt động tốt</span>
                </label>
              </div>

              <div className="form-group mt-4">
                <label className="form-label">Ký tên xác nhận (Nhập họ tên của bạn):</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={renterSignature}
                  onChange={(e) => setRenterSignature(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div className="popup-actions mt-6">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }} onClick={() => setActiveHandoverTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 28px', fontSize: '14px' }}>
                  <ShieldCheck size={15} /> Xác Nhận & Ký Tên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 2: BÁO CÁO SỰ CỐ KHẨN CẤP (UC17) --- */}
      {activeIncidentTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveIncidentTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="lightbox-header" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' }}>
              <h4><Zap size={18} style={{ color: '#dc2626' }} />Báo Cáo Sự Cố Khẩn Cấp</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveIncidentTrip(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleIncidentSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice alert-red mb-4">
                <AlertTriangle size={16} />
                <span>Khai báo sự cố va chạm, tai nạn hoặc hỏng hóc để <strong>kích hoạt bảo hiểm chuyến đi</strong> bảo vệ quyền lợi của bạn.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả chi tiết sự cố phát sinh:</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Vui lòng cung cấp địa điểm, tình huống xảy ra va chạm, xịt lốp hoặc hỏng động cơ..."
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group mt-4">
                <label className="form-label">Tải lên hình ảnh hiện trường va quẹt (nếu có):</label>
                <div className="image-upload-wrapper-cskh">
                  {incidentImage ? (
                    <div style={{ position: 'relative' }}>
                      <img src={incidentImage} alt="Incident Site Preview" className="uploaded-preview-incident" />
                      <button type="button" className="btn-remove-pic" onClick={() => setIncidentImage(null)}>Xóa</button>
                    </div>
                  ) : (
                    <label className="upload-placeholder-box">
                      <Upload size={24} />
                      <span>Chọn ảnh hiện trường</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIncidentImageChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="popup-actions mt-6">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }} onClick={() => setActiveIncidentTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 28px', fontSize: '14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 12px rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} /> Gửi Khai Báo Khẩn Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 3: ĐÁNH GIÁ DỊCH VỤ CHUYẾN ĐI (UC16) --- */}
      {activeReviewTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveReviewTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="lightbox-header" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)' }}>
              <h4><Star size={18} fill="#f59e0b" color="#f59e0b" />Đánh Giá Dịch Vụ</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveReviewTrip(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleReviewSubmit} className="lightbox-body" style={{ display: 'block', padding: '28px', textAlign: 'left' }}>
              {/* Car info summary */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border-color)' }}>
                <img src={activeReviewTrip.car?.image} alt={activeReviewTrip.car?.model} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{activeReviewTrip.car?.brand} {activeReviewTrip.car?.model}</strong>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{activeReviewTrip.pickupDate} → {activeReviewTrip.returnDate}</p>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'center' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 16, textAlign: 'center', fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>Chuyến đi này xứng đáng mấy sao?</label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      className="star-interactive-btn"
                      onClick={() => setReviewRating(val)}
                    >
                      <Star
                        size={36}
                        fill={val <= reviewRating ? "#f59e0b" : "none"}
                        color={val <= reviewRating ? "#f59e0b" : "#cbd5e1"}
                      />
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                  {reviewRating === 1 ? '😞 Rất tệ' : reviewRating === 2 ? '😐 Tạm ổn' : reviewRating === 3 ? '🙂 Khá tốt' : reviewRating === 4 ? '😊 Rất tốt' : '🤩 Xuất sắc!'}
                </p>
              </div>

              <div className="form-group mt-6">
                <label className="form-label">Nhận xét chi tiết về xe và chủ xe:</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Chia sẻ về độ sạch sẽ, tình trạng xe, thái độ chủ xe để giúp cộng đồng thuê xe..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="popup-actions mt-6">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }} onClick={() => setActiveReviewTrip(null)}>Hủy</button>
                <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 28px', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 800, boxShadow: '0 4px 12px rgba(245,158,11,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={15} fill="#0f172a" color="#0f172a" /> Gửi Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 4: GỬI KHIẾU NẠI TRANH CHẤP LÊN CSKH (UC34) --- */}
      {activeDisputeTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveDisputeTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="lightbox-header" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)' }}>
              <h4><ShieldAlert size={18} style={{ color: '#d97706' }} />Nộp Đơn Khiếu Nại Tranh Chấp</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveDisputeTrip(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice alert-orange mb-4">
                <ShieldAlert size={16} />
                <span>Khi có mâu thuẫn về tiền đền bù hoặc hoàn cọc, đội CSKH độc lập sẽ <strong>xem xét và ban hành phán quyết</strong>.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Lý do khiếu nại tranh chấp:</label>
                <textarea
                  rows={5}
                  className="form-control"
                  placeholder="Vui lòng nêu rõ các điểm bất đồng ý kiến đối với chủ xe nhàn rỗi (ví dụ: bị trừ tiền cọc vô lý, chủ xe bàn giao không đúng thỏa thuận...)"
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="popup-actions mt-6">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 20px', fontSize: '13px' }} onClick={() => setActiveDisputeTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 28px', fontSize: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: 800, boxShadow: '0 4px 12px rgba(245,158,11,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={15} /> Gửi Khiếu Nại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
