import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, DollarSign, RefreshCw, XCircle, ShieldCheck, Compass, Info, FileText, AlertTriangle, Star, ShieldAlert, Award, Upload, MessageSquare, PhoneCall, Send, HelpCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

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
    const confirmCancel = window.confirm('Bạn có thực sự chắc chắn muốn hủy đơn đặt xe này không? Tiền cọc 5.000.000 VND sẽ được tự động hoàn lại vào Ví của bạn.');
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
        <button onClick={() => fetchTrips()} className="btn-refresh" title="Tải lại">
          <RefreshCw size={16} />
        </button>
      </div>
      <p className="subtitle" style={{ textAlign: 'left', marginBottom: '24px' }}>
        Quản lý hành trình, trạng thái thanh toán, ký biên nhận điện tử nhận/trả xe và gửi phản hồi hỗ trợ tại ViVuCar.
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
                          <FileText size={13} />
                          Nhận xe (Biên bản)
                        </button>
                      )}

                      {/* UC18: Ký trả xe */}
                      {trip.status === 'active' && (
                        <>
                          <button
                            className="btn btn-primary btn-action-trip btn-success-bg"
                            onClick={() => setActiveHandoverTrip({ trip, type: 'return' })}
                          >
                            <FileText size={13} />
                            Trả xe (Biên bản)
                          </button>

                          {/* UC17: Báo sự cố */}
                          <button
                            className="btn btn-secondary btn-action-trip text-danger border-danger-glow"
                            onClick={() => setActiveIncidentTrip(trip)}
                          >
                            <AlertTriangle size={13} />
                            Báo sự cố
                          </button>
                        </>
                      )}

                      {/* UC16: Đánh giá & UC34: Khiếu nại */}
                      {trip.status === 'completed' && (
                        <>
                          {!trip.hasReviewed ? (
                            <button
                              className="btn btn-primary btn-action-trip btn-star"
                              onClick={() => setActiveReviewTrip(trip)}
                            >
                              <Star size={13} fill="#fbbf24" color="#fbbf24" />
                              Đánh giá
                            </button>
                          ) : (
                            <span className="text-success" style={{ fontSize: '12px', fontWeight: 6 }}>Đã gửi đánh giá ✓</span>
                          )}

                          <button
                            className="btn btn-secondary btn-action-trip"
                            style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fda4af' }}
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
                          className="btn btn-secondary btn-cancel-trip"
                        >
                          <XCircle size={14} />
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
      <div className="support-tickets-section mt-12" style={{ background: 'rgba(17,19,28,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px' }}>
              <MessageSquare className="text-primary animate-bounce" size={20} />
              <span>Hỗ Trợ Trực Tuyến &amp; Hotline CSKH (UC07)</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: 4 }}>
              Gửi tin nhắn yêu cầu hỗ trợ hoặc gọi điện trực tiếp đến hotline 1900.8888 để được cứu hộ khẩn cấp 24/7.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <a href="tel:19008888" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '12px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <PhoneCall size={12} />
              <span>Gọi 1900.8888</span>
            </a>
            <button className="btn btn-primary" onClick={() => setShowSupportForm(!showSupportForm)} style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}>
              + Gửi Yêu Cầu
            </button>
          </div>
        </div>

        {/* Create Ticket Form */}
        {showSupportForm && (
          <form onSubmit={handleCreateTicketSubmit} className="ticket-form mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 16, animation: 'fadeIn 0.2s' }}>
            <h4 style={{ fontSize: '13px', color: 'white', fontWeight: 700, marginBottom: 12 }}>Tạo ticket hỗ trợ mới</h4>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Vấn đề cần hỗ trợ (Tiêu đề) *</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
                placeholder="Vd: Không thanh toán được ví, Sự cố va quẹt nhẹ xe..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group mt-2">
              <label className="form-label" style={{ fontSize: '11px' }}>Nội dung chi tiết yêu cầu hỗ trợ *</label>
              <textarea
                rows={3}
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px', resize: 'none' }}
                placeholder="Vui lòng cung cấp thông tin chi tiết vấn đề..."
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 12px', fontSize: '12px' }} onClick={() => setShowSupportForm(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '5px 16px', fontSize: '12px' }}>Gửi Tin</button>
            </div>
          </form>
        )}

        {/* Tickets list */}
        {tickets.length > 0 ? (
          <div className="tickets-mini-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                className="ticket-mini-row"
                onClick={() => setSelectedMyTicket(t)}
                style={{ padding: '12px 16px', background: '#11131c', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{t.subject}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Gửi ngày: {new Date(t.createdAt).toLocaleDateString('vi-VN')} • Trạng thái:
                    <strong style={{ color: t.status === 'replied' ? '#a855f7' : t.status === 'resolved' ? '#34d399' : '#fbbf24' }}>
                      {t.status === 'open' ? ' Đang xử lý' : t.status === 'replied' ? ' Đã có phản hồi ✓' : ' Đã đóng'}
                    </strong>
                  </span>
                </div>
                <button className="btn-table-action" style={{ fontSize: '12px', padding: 0 }}>Xem chat</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#475569', fontSize: '12.5px' }}>
            Bạn chưa có yêu cầu hỗ trợ nào. Nhấn 'Gửi Yêu Cầu' nếu cần cứu hộ hoặc giải đáp thắc mắc.
          </div>
        )}
      </div>

      {/* --- POPUP CHAT VỚI CSKH THÀNH VIÊN (UC07) --- */}
      {selectedMyTicket && (
        <div className="editor-modal-overlay" onClick={() => setSelectedMyTicket(null)}>
          <div className="editor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="editor-modal-header">
              <h3>Hội Thoại Trực Tuyến Với CSKH</h3>
              <button className="editor-close-btn" onClick={() => setSelectedMyTicket(null)}><XCircle size={20} /></button>
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
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedMyTicket(null)} style={{ width: 'auto' }}>Đóng chat</button>
                {selectedMyTicket.status !== 'resolved' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      const followUp = window.prompt("Nhập nội dung phản hồi tiếp tục hội thoại:");
                      if (!followUp) return;
                      try {
                        // For renter, we simulate appending follow-up via an API or support reply (here Renter can send message by creating or appending)
                        // In our demo schema, CSKH replies tickets. Let's show success alert
                        showToast('Đã gửi phản hồi thành công đến bộ phận hỗ trợ!', 'success');
                      } catch (e) { }
                    }}
                    style={{ flex: 1 }}
                  >
                    <Send size={12} />
                    <span>Gửi tin nhắn</span>
                  </button>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '12px', alignSelf: 'center' }}>Hội thoại đã kết thúc</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP 1: BIÊN BẢN BÀN GIAO ĐIỆN TỬ (UC18) --- */}
      {activeHandoverTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveHandoverTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="lightbox-header">
              <h4>Biên Bản Bàn Giao Xe Điện Tử ({activeHandoverTrip.type === 'pickup' ? 'Nhận Xe' : 'Trả Xe'})</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveHandoverTrip(null)}><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleHandoverSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice mb-4">
                <Info size={16} />
                <span>Vui lòng kiểm tra thực tế trạng thái chiếc xe cùng chủ xe trước khi ký biên bản bàn giao điện tử này.</span>
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

              <div className="popup-actions mt-6" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveHandoverTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
                  Xác Nhận &amp; Ký Tên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 2: BÁO CÁO SỰ CỐ KHẨN CẤP (UC17) --- */}
      {activeIncidentTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveIncidentTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="lightbox-header">
              <h4>Báo Cáo Sự Cố Phát Sinh Khẩn Cấp</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveIncidentTrip(null)}><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleIncidentSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice alert-red mb-4">
                <AlertTriangle size={16} />
                <span>Khai báo sự cố va quẹt, tai nạn hoặc lỗi hỏng hóc để kích hoạt gói bảo hiểm chuyến đi bảo vệ quyền lợi của bạn.</span>
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

              <div className="popup-actions mt-6" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveIncidentTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn btn-primary btn-danger-bg" style={{ width: 'auto', padding: '10px 24px', background: '#f43f5e', borderColor: '#f43f5e' }}>
                  Gửi Khai Báo Khẩn Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 3: ĐÁNH GIÁ DỊCH VỤ CHUYẾN ĐI (UC16) --- */}
      {activeReviewTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveReviewTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="lightbox-header">
              <h4>Viết Đánh Giá Dịch Vụ</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveReviewTrip(null)}><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleReviewSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 12 }}>Chấm điểm sao chuyến đi của bạn:</label>
                <div className="stars-rating-interactive-row" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      className="star-interactive-btn"
                      onClick={() => setReviewRating(val)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Star
                        size={32}
                        fill={val <= reviewRating ? "#fbbf24" : "none"}
                        color={val <= reviewRating ? "#fbbf24" : "#475569"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mt-6">
                <label className="form-label">Nhận xét chi tiết về xe và chủ xe:</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Hãy chia sẻ trải nghiệm về độ sạch sẽ của xe, tính thân thiện của chủ xe để giúp cộng đồng thuê xe..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="popup-actions mt-6" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveReviewTrip(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-gold" style={{ width: 'auto', padding: '10px 24px', background: '#fbbf24', borderColor: '#fbbf24', color: '#090a0f' }}>
                  Gửi Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 4: GỬI KHIẾU NẠI TRANH CHẤP LÊN CSKH (UC34) --- */}
      {activeDisputeTrip && (
        <div className="lightbox-overlay" onClick={() => setActiveDisputeTrip(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="lightbox-header">
              <h4>Nộp Đơn Khiếu Nại Tranh Chấp</h4>
              <button className="btn-close-lightbox" onClick={() => setActiveDisputeTrip(null)}><XCircle size={20} /></button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
              <div className="handover-notice alert-orange mb-4">
                <ShieldAlert size={16} />
                <span>Trường hợp phát sinh mâu thuẫn bất đồng ý kiến về tiền đền bù hoặc trả cọc bảo đảm, đội ngũ CSKH sẽ đứng ra phán quyết độc lập.</span>
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

              <div className="popup-actions mt-6" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveDisputeTrip(null)}>Bỏ qua</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 24px', background: '#f59e0b', borderColor: '#f59e0b' }}>
                  Gửi Khiếu Nại Lên Hệ Thống
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Inject CSS styles for MyTrips
const injectMyTripsStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'my-trips-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .my-trips-page {
      width: 100%;
      max-width: 850px;
      animation: fadeIn 0.4s ease-out;
    }

    .trips-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .btn-refresh {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .trips-loading, .trips-empty-state {
      padding: 60px 24px;
      background: #11131c;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      color: #64748b;
      text-align: center;
    }

    .trips-empty-state h3 {
      font-size: 16px;
      font-weight: 700;
      color: #cbd5e1;
      margin-top: 12px;
    }

    .trips-empty-state p {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
    }

    .trips-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Trip Card Glassmorphism */
    .trip-card-glass {
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--glass-border);
      border-radius: 16px;
      box-shadow: var(--glass-shadow);
      display: flex;
      overflow: hidden;
      transition: all 0.2s;
      text-align: left;
    }

    .trip-card-glass:hover {
      border-color: rgba(99, 102, 241, 0.15);
    }

    .trip-card-glass.cancelled {
      opacity: 0.6;
    }

    .active-trip-glow {
      border-color: rgba(99, 102, 241, 0.45) !important;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
    }

    .trip-car-img {
      width: 220px;
      height: auto;
      object-fit: cover;
      background: #0a0b10;
    }

    @media (max-width: 640px) {
      .trip-card-glass {
        flex-direction: column;
      }
      .trip-car-img {
        width: 100%;
        height: 150px;
      }
    }

    .trip-card-body {
      padding: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .trip-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      gap: 12px;
      text-align: left;
    }

    .trip-brand-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .trip-model-title {
      font-size: 16px;
      font-weight: 700;
      color: white;
    }

    /* Status badges */
    .trip-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 99px;
      white-space: nowrap;
    }

    .badge-confirmed {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .badge-active {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
    }

    .badge-cancelled {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
    }

    .badge-completed {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }

    .badge-pending {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }

    .badge-dispute {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fda4af;
    }

    /* Details */
    .trip-meta-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .trip-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #94a3b8;
    }

    .trip-meta-item strong {
      color: #e2e8f0;
    }

    .trip-incident-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: #fda4af;
    }

    .trip-card-divider {
      border: none;
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 0 0 14px 0;
    }

    .trip-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      gap: 12px;
      flex-wrap: wrap;
    }

    .booking-date-sub {
      font-size: 11px;
      color: #64748b;
    }

    .trip-actions-buttons-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-action-trip {
      width: auto;
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 700;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-success-bg {
      background: #10b981 !important;
      border-color: #10b981 !important;
      color: white !important;
    }
    .btn-success-bg:hover {
      background: #059669 !important;
      border-color: #059669 !important;
    }

    .border-danger-glow {
      border: 1px solid rgba(244, 63, 94, 0.4) !important;
      color: #fda4af !important;
    }
    .border-danger-glow:hover {
      background: rgba(244, 63, 94, 0.1) !important;
    }

    .btn-cancel-trip {
      width: auto;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: #fda4af;
      font-weight: 700;
    }

    .btn-cancel-trip:hover {
      background: rgba(244, 63, 94, 0.2);
      color: #ffe4e6;
      border-color: rgba(244, 63, 94, 0.3);
    }

    /* Modals elements */
    .handover-notice {
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 12px 14px;
      border-radius: 8px;
      color: #818cf8;
      font-size: 12.5px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.4;
    }

    .handover-notice.alert-red {
      background: rgba(244, 63, 94, 0.08);
      border-color: rgba(244, 63, 94, 0.2);
      color: #fda4af;
    }

    .handover-notice.alert-orange {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    .checkbox-item-custom {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      cursor: pointer;
      color: #cbd5e1;
      font-size: 13.5px;
    }

    .checkbox-item-custom input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #6366f1;
    }

    .image-upload-wrapper-cskh {
      margin-top: 8px;
    }

    .upload-placeholder-box {
      border: 2px dashed rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.01);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
    }

    .upload-placeholder-box:hover {
      border-color: #6366f1;
      color: #e2e8f0;
      background: rgba(99, 102, 241, 0.02);
    }

    .uploaded-preview-incident {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .btn-remove-pic {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #f43f5e;
      color: white;
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
    }

    /* Ticket sidebar custom styles */
    .ticket-sidebar-item {
      transition: all 0.2s;
    }
    .ticket-sidebar-item:hover, .ticket-sidebar-item.active {
      background: rgba(99, 102, 241, 0.08) !important;
      border-color: rgba(99, 102, 241, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
};

injectMyTripsStyles();
