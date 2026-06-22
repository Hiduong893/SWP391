import React, { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, DollarSign, RefreshCw, XCircle, ShieldCheck, Compass, Info, FileText, AlertTriangle, Star, ShieldAlert, Award, Upload, MessageSquare, PhoneCall, Send, HelpCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { renterActionApi } from '../../utils/renterActionApi';
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
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (activeHandoverTrip && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height || 160;
      setHasSigned(false);
      setIsDrawing(false);
    }
  }, [activeHandoverTrip]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (e.cancelable) e.preventDefault();
    
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (e.cancelable) e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentImage, setIncidentImage] = useState(null);
  const [incidentType, setIncidentType] = useState('other');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [disputeDesc, setDisputeDesc] = useState('');

  // Cancel with refund preview state
  const [cancelPreview, setCancelPreview] = useState(null); // { trip, preview }
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);
  const [cancelConfirmLoading, setCancelConfirmLoading] = useState(false);

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

  const handleCancelPreview = async (trip) => {
    setCancelPreviewLoading(true);
    try {
      const preview = await renterActionApi.cancelBooking.getRefundPreview(trip.id);
      setCancelPreview({ trip, preview });
    } catch (error) {
      showToast(error.message || 'Không thể lấy thông tin hoàn cọc.', 'error');
    } finally {
      setCancelPreviewLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelPreview) return;
    setCancelConfirmLoading(true);
    try {
      const data = await renterActionApi.cancelBooking.cancelWithRefund(cancelPreview.trip.id);
      showToast(data.message, 'success');
      setCancelPreview(null);
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi hủy đơn đặt xe.', 'error');
    } finally {
      setCancelConfirmLoading(false);
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!hasSigned) {
      showToast('Vui lòng vẽ chữ ký xác nhận biên bản bàn giao xe.', 'warning');
      return;
    }

    const { trip, type } = activeHandoverTrip;
    const checklist = Object.keys(handoverChecks).filter(k => handoverChecks[k]);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureBase64 = canvas.toDataURL('image/png');

    try {
      const data = await api.bookings.signHandover(trip.id, type, checklist, signatureBase64);
      showToast(data.message, 'success');
      setActiveHandoverTrip(null);
      setHandoverChecks({ noScratches: false, fuelOk: false, cleanCar: false, tiresOk: false });
      setHasSigned(false);
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
      const data = await renterActionApi.emergencyReport.submit(activeIncidentTrip.id, {
        description: incidentDesc,
        image: incidentImage,
        incidentType: incidentType
      });
      showToast(data.message, 'success');
      setActiveIncidentTrip(null);
      setIncidentDesc('');
      setIncidentImage(null);
      setIncidentType('other');
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi báo cáo sự cố.', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const normalizedComment = reviewComment.trim();
    if (!normalizedComment) {
      showToast('Vui lòng nhập nhận xét chi tiết.', 'warning');
      return;
    }

    setReviewSubmitting(true);
    try {
      const data = await api.reviews.createReview(activeReviewTrip.id, reviewRating, normalizedComment);
      showToast(data.message, 'success');
      setActiveReviewTrip(null);
      setReviewRating(5);
      setReviewComment('');
      fetchTrips(true);
    } catch (error) {
      showToast(error.message || 'Lỗi đăng đánh giá.', 'error');
    } finally {
      setReviewSubmitting(false);
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
                          onClick={() => handleCancelPreview(trip)}
                          className="btn btn-secondary btn-cancel-trip"
                          disabled={cancelPreviewLoading}
                        >
                          <XCircle size={14} />
                          {cancelPreviewLoading ? 'Đang tải...' : 'Hủy đặt xe'}
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
      <div className="support-tickets-section mt-12" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', textAlign: 'left', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '16px' }}>
              <MessageSquare className="text-primary animate-bounce" size={20} />
              <span>Hỗ Trợ Trực Tuyến &amp; Hotline CSKH</span>
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
          <form onSubmit={handleCreateTicketSubmit} className="ticket-form mb-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, animation: 'fadeIn 0.2s' }}>
            <h4 style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, marginBottom: 12 }}>Tạo ticket hỗ trợ mới</h4>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Vấn đề cần hỗ trợ (Tiêu đề) *</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#0f172a' }}
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
                style={{ padding: '8px 12px', fontSize: '13px', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#0f172a' }}
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
                style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>{t.subject}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Gửi ngày: {new Date(t.createdAt).toLocaleDateString('vi-VN')} • Trạng thái:
                    <strong style={{ color: t.status === 'replied' ? '#a855f7' : t.status === 'resolved' ? '#34d399' : '#fbbf24' }}>
                      {t.status === 'open' ? ' Đang xử lý' : t.status === 'replied' ? ' Đã có phản hồi ✓' : ' Đã đóng'}
                    </strong>
                  </span>
                </div>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}>Xem chat</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: '#475569', fontSize: '12.5px' }}>
            Bạn chưa có yêu cầu hỗ trợ nào. Nhấn 'Gửi Yêu Cầu' nếu cần cứu hộ hoặc giải đáp thắc mắc.
          </div>
        )}
      </div>

      {/* --- MODAL XÁC NHẬN HỦY ĐẶT XE VỚI PREVIEW HOÀN CỌC THỰC TẾ --- */}
      {cancelPreview && (
        <div className="editor-modal-overlay" onClick={() => setCancelPreview(null)}>
          <div className="editor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', background: '#ffffff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #fee2e2', background: 'linear-gradient(135deg, #fff1f2, #fef2f2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <XCircle size={20} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#991b1b', fontWeight: 800 }}>Xác nhận hủy đặt xe</h3>
              </div>
              <button onClick={() => setCancelPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><XCircle size={18} /></button>
            </div>

            {/* Car info */}
            <div style={{ padding: '16px 22px', display: 'flex', gap: 12, alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <img src={cancelPreview.trip.car.image} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{cancelPreview.trip.car.brand} {cancelPreview.trip.car.model}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2 }}>
                  Mã vé: <strong>{cancelPreview.trip.id.slice(0,8).toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Refund Policy Info */}
            <div style={{ padding: '18px 22px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chính sách hoàn cọc giữ chỗ</div>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>{cancelPreview.preview.policyLabel}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4 }}>
                  Còn <strong style={{ color: '#0f172a' }}>{cancelPreview.preview.daysUntilPickup} ngày</strong> đến ngày nhận xe
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>Phí giữ chỗ (500.000đ)</div>
                  <div style={{ fontSize: '12px', color: '#78716c', marginTop: 2 }}>Hoàn trả {cancelPreview.preview.refundPercent}% = </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: cancelPreview.preview.refundAmount > 0 ? '#059669' : '#dc2626' }}>
                  {cancelPreview.preview.refundAmount > 0
                    ? `+${cancelPreview.preview.refundAmount.toLocaleString('vi-VN')}đ`
                    : '0đ (Không hoàn)'}
                </div>
              </div>

              <div style={{ background: '#f1f5f9', borderRadius: 10, padding: '10px 14px', fontSize: '11.5px', color: '#475569', lineHeight: 1.6, marginBottom: 18 }}>
                ⚠️ <strong>Lưu ý:</strong> Tiền cọc bảo đảm <strong>5.000.000đ</strong> sẽ được giữ nguyên và hoàn trả sau khi Admin xác nhận.
                {cancelPreview.preview.refundAmount === 0 && (
                  <span style={{ color: '#dc2626', display: 'block', marginTop: 4 }}>
                    ❌ Hủy trễ — Phí giữ chỗ <strong>500.000đ không được hoàn trả</strong> theo chính sách.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCancelPreview(null)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Giữ lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelConfirmLoading}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', fontWeight: 700, cursor: cancelConfirmLoading ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: cancelConfirmLoading ? 0.7 : 1 }}
                >
                  {cancelConfirmLoading ? 'Đang xử lý...' : '✓ Xác nhận hủy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP CHAT VỚI CSKH THÀNH VIÊN (UC07) --- */}
      {selectedMyTicket && (

        <div className="editor-modal-overlay" onClick={() => setSelectedMyTicket(null)}>
          <div className="editor-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div className="editor-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>Hội Thoại Trực Tuyến Với CSKH</h3>
              <button className="editor-close-btn" onClick={() => setSelectedMyTicket(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}><XCircle size={20} /></button>
            </div>

            <div className="editor-modal-body" style={{ display: 'flex', flexDirection: 'column', height: '400px', padding: 20 }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 12, textAlign: 'left', width: '100%' }}>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedMyTicket.subject}</strong>
                <p style={{ fontSize: '11px', color: '#94a3b8' }}>Mã ticket: {selectedMyTicket.id.slice(0, 8).toUpperCase()}</p>
              </div>

              {/* Chat list inside popup */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', paddingRight: 4, marginBottom: 12 }}>
                {/* Renter prompt */}
                <div style={{ alignSelf: 'flex-end', background: 'rgba(0, 150, 152, 0.1)', border: '1px solid rgba(0, 150, 152, 0.2)', padding: '10px 14px', borderRadius: '14px 14px 0 14px', maxWidth: '80%', textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#0f172a', lineHeight: '1.5' }}>{selectedMyTicket.message}</p>
                  <span style={{ fontSize: '10px', color: '#009698', display: 'block', marginTop: 6, fontWeight: 500 }}>Bạn - {new Date(selectedMyTicket.createdAt).toLocaleTimeString()}</span>
                </div>

                {/* Replies from CSKH */}
                {selectedMyTicket.replies.map((rep, idx) => {
                  const isCSKH = rep.senderRole === 'cskh' || rep.senderRole === 'admin' || rep.sender === 'cskh';
                  const text = rep.message || rep.text;
                  const senderName = isCSKH ? (rep.senderName || 'Hỗ trợ CSKH') : 'Bạn';
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isCSKH ? 'flex-start' : 'flex-end',
                        background: isCSKH ? '#f1f5f9' : 'rgba(0, 150, 152, 0.1)',
                        border: isCSKH ? '1px solid #e2e8f0' : '1px solid rgba(0, 150, 152, 0.2)',
                        padding: '10px 14px',
                        borderRadius: isCSKH ? '14px 14px 14px 0' : '14px 14px 0 14px',
                        maxWidth: '80%',
                        textAlign: 'left'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#0f172a', lineHeight: '1.5' }}>{text}</p>
                      <span style={{ fontSize: '10px', color: isCSKH ? '#64748b' : '#009698', display: 'block', marginTop: 6, fontWeight: 500 }}>{senderName} - {new Date(rep.sentAt).toLocaleTimeString()}</span>
                    </div>
                  );
                })}
              </div>

              <div className="editor-modal-footer" style={{ padding: '12px 0 0 0', borderTop: '1px solid #e2e8f0', background: 'none', width: '100%', display: 'flex', gap: 8 }}>
                {selectedMyTicket.status !== 'resolved' ? (
                  <form
                    style={{ display: 'flex', width: '100%', gap: 8 }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!replyText.trim()) return;
                      try {
                        const data = await api.support.replyTicket(selectedMyTicket.id, replyText);
                        setSelectedMyTicket(data.ticket);
                        setReplyText('');
                        showToast('Đã gửi phản hồi thành công!', 'success');
                        fetchMyTickets();
                      } catch (error) {
                        showToast(error.message || 'Lỗi gửi phản hồi.', 'error');
                      }
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ flex: 1, fontSize: '13.5px', padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '24px', outline: 'none', color: '#0f172a', background: '#f8fafc' }}
                    />
                    <button type="submit" style={{ background: '#009698', color: '#ffffff', border: 'none', borderRadius: '24px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,150,152,0.2)' }}>
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
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Vẽ chữ ký xác nhận (Dùng chuột hoặc chạm màn hình):</span>
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                      fontSize: '11px',
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Xóa chữ ký
                  </button>
                </label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  position: 'relative',
                  height: '160px',
                  marginTop: '6px',
                  cursor: 'crosshair'
                }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                  {!hasSigned && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                      color: '#94a3b8',
                      fontSize: '12.5px',
                      fontWeight: 500
                    }}>
                      Ký tên vào đây
                    </div>
                  )}
                </div>
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

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Loại sự cố phát sinh:</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#f8fafc',
                    outline: 'none'
                  }}
                >
                  <option value="accident">Tai nạn va chạm</option>
                  <option value="breakdown">Hỏng hóc động cơ / chết máy</option>
                  <option value="flat_tire">Xịt lốp / hỏng lốp</option>
                  <option value="theft">Trộm cắp bộ phận / mất xe</option>
                  <option value="fuel_issue">Hết nhiên liệu / lỗi nhiên liệu</option>
                  <option value="medical">Sự cố y tế / sức khỏe tài xế</option>
                  <option value="other">Khác</option>
                </select>
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
      {activeReviewTrip && (() => {
        const car = activeReviewTrip.car;
        const ratingLabels = {
          1: 'Rất tệ 😞',
          2: 'Không hài lòng 🙁',
          3: 'Bình thường 😐',
          4: 'Hài lòng 🙂',
          5: 'Tuyệt vời! 😍'
        };
        return (
          <div className="lightbox-overlay" onClick={() => setActiveReviewTrip(null)}>
            <div className="lightbox-card review-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="lightbox-header">
                <h4>Đánh Giá Chuyến Đi</h4>
                <button className="btn-close-lightbox" onClick={() => setActiveReviewTrip(null)}><XCircle size={20} /></button>
              </div>

              <form onSubmit={handleReviewSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
                
                {/* Car info preview card */}
                <div className="review-car-preview-card mb-6" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <img src={car.image} alt={car.model} style={{
                    width: '100px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#fff'
                  }} />
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#009698', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {car.brand}
                    </span>
                    <h5 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '2px 0 4px 0' }}>
                      {car.model}
                    </h5>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      Mã đơn: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{activeReviewTrip.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                {/* Star rating selection */}
                <div className="form-group" style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '14px', fontWeight: '600', color: '#475569' }}>
                    Chất lượng dịch vụ thế nào?
                  </label>
                  <div className="stars-rating-interactive-row" style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((val) => {
                      const isSelected = val <= reviewRating;
                      return (
                        <button
                          type="button"
                          key={val}
                          className={`star-interactive-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setReviewRating(val)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Star
                            size={38}
                            fill={isSelected ? "#fbbf24" : "none"}
                            color={isSelected ? "#fbbf24" : "#94a3b8"}
                            style={{ filter: isSelected ? 'drop-shadow(0 0 4px rgba(251,191,36,0.3))' : 'none', transition: 'all 0.2s' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="rating-desc-label" style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#6366f1',
                    minHeight: '20px',
                    transition: 'all 0.2s'
                  }}>
                    {ratingLabels[reviewRating]}
                  </div>
                </div>

                {/* Review comment field */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Viết nhận xét đánh giá:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={4}
                      className="form-control review-textarea"
                      placeholder="Chia sẻ trải nghiệm thực tế của bạn về chiếc xe (độ sạch sẽ, vận hành) và chủ xe (đưa đón đúng giờ, thân thiện)..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        color: '#0f172a',
                        outline: 'none',
                        resize: 'none',
                        transition: 'all 0.25s',
                        background: '#f8fafc'
                      }}
                      required
                    ></textarea>
                  </div>
                </div>

                {/* Popup Action buttons */}
                <div className="popup-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveReviewTrip(null)}
                    style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: 'auto',
                      padding: '10px 28px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #009698 0%, #00bfa5 100%)',
                      boxShadow: '0 4px 12px rgba(0, 150, 152, 0.2)'
                    }}
                  >
                    Gửi Đánh Giá
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* --- POPUP 4: GỬI KHIẾU NẠI TRANH CHẤP LÊN CSKH (UC34) --- */}
      {activeDisputeTrip && (() => {
        const car = activeDisputeTrip.car;
        return (
          <div className="lightbox-overlay" onClick={() => setActiveDisputeTrip(null)}>
            <div className="lightbox-card dispute-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="lightbox-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                  <ShieldAlert className="text-warning" size={20} />
                  <span>Khiếu Nại Tranh Chấp</span>
                </h4>
                <button className="btn-close-lightbox" onClick={() => setActiveDisputeTrip(null)}><XCircle size={20} /></button>
              </div>

              <form onSubmit={handleDisputeSubmit} className="lightbox-body" style={{ display: 'block', padding: '24px', textAlign: 'left' }}>
                
                {/* Trip & Car context details */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#fcf8f2',
                  border: '1px solid #fed7aa',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '24px' }}>🛡️</div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#451a03' }}>
                      Đơn hàng: {car.brand} {car.model}
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                      Mã đặt xe: <strong style={{ fontFamily: 'monospace' }}>{activeDisputeTrip.id.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>

                <div className="handover-notice alert-orange mb-4" style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  marginBottom: '18px'
                }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Hệ thống CSKH ViVuCar đóng vai trò là bên thứ ba trung lập đứng ra phân xử và bảo vệ quyền lợi của bạn dựa trên bằng chứng, hợp đồng và lịch sử bàn giao xe.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Nội dung khiếu nại chi tiết:
                  </label>
                  <textarea
                    rows={5}
                    className="form-control dispute-textarea"
                    placeholder="Vui lòng cung cấp chi tiết sự việc phát sinh mâu thuẫn (Ví dụ: Chủ xe trừ tiền cọc vô lý, xe hỏng hóc hoặc không đúng mô tả, thái độ bàn giao xe không đúng cam kết...)"
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none',
                      resize: 'none',
                      transition: 'all 0.25s',
                      background: '#f8fafc'
                    }}
                    required
                  ></textarea>
                </div>

                <div className="popup-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveDisputeTrip(null)}
                    style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: 'auto',
                      padding: '10px 28px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                      border: 'none',
                      color: 'white'
                    }}
                  >
                    Gửi Khiếu Nại
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
