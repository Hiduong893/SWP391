import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, MapPin, PlusCircle, Sparkles, Check, Car, Compass, ShieldCheck, Eye, Trash2, X, RefreshCw, BarChart3, CreditCard, FileText } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { ContractModal } from '../../components/ContractModal';
import './ListCar.css';

export const ListCar = ({ setCurrentTab, user, onUpdateUser }) => {
  const [activeSubTab, setActiveSubTab] = useState(user?.role === 'renter' ? 'register' : 'stats'); // stats, register, my-cars
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedBookingForContract, setSelectedBookingForContract] = useState(null);

  // Stats & Bookings list (UC22, UC23)
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [myCarsList, setMyCarsList] = useState([]);

  // New Car Form State (UC21)
  const [brand, setBrand] = useState('VinFast');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState(5);
  const [transmission, setTransmission] = useState('Tự động');
  const [fuel, setFuel] = useState('Xăng');
  const [pricePerDay, setPricePerDay] = useState('');
  const [location, setLocation] = useState('Hà Nội');
  const [plateNumber, setPlateNumber] = useState('');
  const [carImage, setCarImage] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  // Edit Car Form State
  const [editingCar, setEditingCar] = useState(null);
  const [editPricePerDay, setEditPricePerDay] = useState('');
  const [editLocation, setEditLocation] = useState('Hà Nội');
  const [editCarImage, setEditCarImage] = useState('');
  const [editImageLoading, setEditImageLoading] = useState(false);

  const { showToast } = useToast();

  const fetchOwnerDashboard = async (silent = false) => {
    if (user?.role === 'renter') return;
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

  const handleImageUpload = (e) => {
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

    setImageLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCarImage(reader.result);
      setImageLoading(false);
      showToast('Tải ảnh xe lên thành công!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitNewCar = async (e) => {
    e.preventDefault();

    if (!brand || !model || !seats || !pricePerDay || !location || !plateNumber) {
      showToast('Vui lòng nhập đầy đủ các thông tin bắt buộc.', 'warning');
      return;
    }

    if (!carImage) {
      showToast('Vui lòng tải lên một hình ảnh thực tế của xe.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const carData = {
        brand,
        model,
        seats: parseInt(seats),
        transmission,
        fuel,
        pricePerDay: parseInt(pricePerDay),
        location,
        plateNumber,
        image: carImage
      };

      const data = await api.cars.listCar(carData);
      showToast(data.message, 'success');
      setSuccess(true);
      fetchOwnerDashboard(true);
    } catch (error) {
      showToast(error.message || 'Lỗi khi đăng ký xe cho thuê.', 'error');
    } finally {
      setLoading(false);
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

  const handleResetForm = () => {
    setModel('');
    setSeats(5);
    setTransmission('Tự động');
    setFuel('Xăng');
    setPricePerDay('');
    setPlateNumber('');
    setCarImage('');
    setSuccess(false);
    setActiveSubTab('my-cars');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const pendingBookings = ownerBookings.filter(b => b.status === 'pending_owner');

  return (
    <div className="owner-dashboard-page" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* HEADER SECTION */}
      <div className="owner-header-bar mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 className="title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass className="text-primary animate-pulse" size={26} />
            <span>KHÔNG GIAN HỢP TÁC CHỦ XE</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14.5px', marginTop: 4 }}>
            Quản lý đội xe cho thuê, phê duyệt yêu cầu đặt lịch từ khách thuê và theo dõi số dư thu nhập của bạn.
          </p>
        </div>
        <button onClick={() => fetchOwnerDashboard()} className="btn-refresh" title="Làm mới">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* 📊 STATS CARDS FOR OWNER (UC23) */}
      {user?.role !== 'renter' && (
        <div className="owner-stats-grid mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="owner-stat-card-glass">
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tổng Thu Nhập</span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: 4 }}>{formatCurrency(totalEarnings)}</h3>
            </div>
            <div className="owner-stat-icon bg-purple"><DollarSign size={20} /></div>
          </div>

          <div className="owner-stat-card-glass">
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Đội Xe Sở Hữu</span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{myCarsList.length} xe</h3>
            </div>
            <div className="owner-stat-icon bg-blue"><Car size={20} /></div>
          </div>

          <div className="owner-stat-card-glass">
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Số Đơn Đặt Lịch</span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{ownerBookings.length} lượt</h3>
            </div>
            <div className="owner-stat-icon bg-green"><BarChart3 size={20} /></div>
          </div>
        </div>
      )}

      {/* SUB-TABS NAVIGATION */}
      <div className="owner-sub-nav mb-6" style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
        {user?.role !== 'renter' && (
          <>
            <button 
              className={`owner-nav-btn ${activeSubTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('stats')}
            >
              <CreditCard size={15} />
              <span>Yêu Cầu Cho Thuê ({pendingBookings.length})</span>
            </button>

            <button 
              className={`owner-nav-btn ${activeSubTab === 'my-cars' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('my-cars')}
            >
              <Car size={15} />
              <span>Đội Xe Của Tôi ({myCarsList.length})</span>
            </button>
          </>
        )}

        <button 
          className={`owner-nav-btn ${activeSubTab === 'register' ? 'active' : ''}`}
          onClick={() => { setSuccess(false); setActiveSubTab('register'); }}
        >
          <PlusCircle size={15} />
          <span>Đăng kí xe cho thuê</span>
        </button>
      </div>

      {/* VIEWPORT CONTROLS */}
      <div className="owner-viewport-box">
        {loading ? (
          <div className="owner-loading-box" style={{ padding: 48, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
            Đang tải kho dữ liệu chủ xe...
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: STATS & BOOKINGS QUEUE (UC22, UC23) */}
            {activeSubTab === 'stats' && (
              <div className="owner-glass-table-container" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Yêu cầu đặt thuê xe chờ chủ xe duyệt (UC22)
                </h4>

                {pendingBookings.length === 0 ? (
                  <div style={{ padding: 32, background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
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

                {/* All Bookings History Log */}
                {ownerBookings.length > pendingBookings.length && (
                  <div className="mt-8">
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                      Lịch sử cho thuê & Lịch trình hành trình
                    </h4>
                    <table className="owner-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khách Hàng</th>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phương Tiện</th>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thời Gian</th>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doanh Thu</th>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trạng Thái</th>
                          <th style={{ padding: 12, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Hợp đồng</th>
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
                            </td>
                            <td style={{ padding: 14, fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(b.totalPrice)}</td>
                            <td style={{ padding: 14 }}>
                              <span className={`owner-booking-status-badge badge-${b.status}`}>
                                {b.status === 'confirmed' ? 'Đã duyệt' : b.status === 'active' ? 'Đang thuê' : b.status === 'completed' ? 'Hoàn thành ✓' : b.status === 'disputed' ? 'Khiếu nại' : 'Đã hủy'}
                              </span>
                            </td>
                            <td style={{ padding: 14, textAlign: 'center' }}>
                              <button 
                                className="btn btn-secondary"
                                style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setSelectedBookingForContract(b.id)}
                              >
                                <FileText size={12} /> Chi tiết HĐ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: MY OWN REGISTERED VEHICLES GRID (UC25) */}
            {activeSubTab === 'my-cars' && (
              <div className="owner-glass-table-container" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Danh sách đội phương tiện đã đăng ký (UC25)
                </h4>

                {myCarsList.length === 0 ? (
                  <div style={{ padding: 32, background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: 12, color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                    Bạn chưa đăng ký chiếc xe nào trên sàn. Hãy nhấn 'Đăng ký xe cho thuê' để đăng ký chiếc xe đầu tiên của bạn!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {myCarsList.map((car) => (
                      <div key={car.id} style={{ display: 'flex', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, textAlign: 'left' }}>
                        <img src={car.image} alt={car.model} style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 6, background: '#050508' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                          <div>
                            <strong style={{ fontSize: '10px', color: 'var(--accent-primary)', display: 'block', textTransform: 'uppercase' }}>{car.brand}</strong>
                            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{car.model}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>Biển số: {car.plateNumber}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <strong style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{formatCurrency(car.pricePerDay)}/ngày</strong>
                            
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button 
                                type="button"
                                className="owner-booking-status-badge badge-confirmed" 
                                style={{ background: 'rgba(0, 150, 152, 0.15)', border: '1px solid rgba(0, 150, 152, 0.3)', color: 'var(--accent-primary)', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
                                onClick={() => handleStartEditCar(car)}
                              >
                                Sửa xe
                              </button>
                              <span className={`car-moderation-badge badge-${car.status}`}>
                                {car.status === 'pending_moderation' ? 'Chờ kiểm duyệt' : car.status === 'available' ? 'Sẵn sàng' : car.status === 'rented' ? 'Đang cho thuê' : 'Từ chối'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: REGISTER NEW VEHICLE (UC21) */}
            {activeSubTab === 'register' && (
              <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', padding: user?.role === 'renter' ? '40px 24px' : '' }}>
                {user?.role === 'renter' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', width: '100%' }}>
                    <div style={{ background: 'rgba(0, 150, 152, 0.1)', padding: '16px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Car className="text-primary" size={48} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Đăng ký xe cho thuê mới</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '480px', lineHeight: '1.6', margin: '0 auto' }}>
                      Để đăng ký xe cho thuê mới trên hệ thống, bạn cần nâng cấp tài khoản của mình thành **Chủ xe**. Trước tiên, bạn phải hoàn tất các điều kiện xác thực dưới đây:
                    </p>

                    {/* Checklist */}
                    <div style={{
                      width: '100%',
                      maxWidth: '480px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      margin: '10px 0'
                    }}>
                      {/* Item 1: KYC status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {user?.licenseStatus === 'verified' ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Check size={16} />
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <X size={16} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>Xác thực bằng lái xe (KYC)</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {user?.licenseStatus === 'verified' ? (
                              <span style={{ color: '#10b981', fontWeight: '500' }}>Đã xác thực thành công.</span>
                            ) : user?.licenseStatus === 'pending' ? (
                              <span style={{ color: '#f59e0b', fontWeight: '500' }}>Bằng lái xe đang chờ duyệt bởi hệ thống.</span>
                            ) : user?.licenseStatus === 'rejected' ? (
                              <span style={{ color: '#ef4444', fontWeight: '500' }}>Bằng lái xe bị từ chối. Vui lòng tải lại ảnh.</span>
                            ) : (
                              <span>Chưa xác thực bằng lái.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item 2: Bank account linking */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {user?.bankAccount && user?.bankAccount.bankName && user?.bankAccount.accountNumber ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Check size={16} />
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <X size={16} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>Liên kết tài khoản ngân hàng</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {user?.bankAccount && user?.bankAccount.bankName && user?.bankAccount.accountNumber ? (
                              <span style={{ color: '#10b981', fontWeight: '500' }}>Đã liên kết tài khoản ngân hàng.</span>
                            ) : (
                              <span>Chưa liên kết tài khoản để nhận tiền thuê xe.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '480px' }}>
                      {!(user?.licenseStatus === 'verified' && user?.bankAccount && user?.bankAccount.bankName && user?.bankAccount.accountNumber) ? (
                        <>
                          <div style={{ fontSize: '13px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'left' }}>
                            ⚠️ Bạn cần vào trang cá nhân để hoàn thành KYC bằng lái và liên kết tài khoản ngân hàng trước khi nâng cấp.
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px 32px', fontSize: '15px', fontWeight: '600' }}
                            onClick={() => setCurrentTab('profile')}
                          >
                            Đến trang Hồ sơ & Ví ngay
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '12px 32px', fontSize: '15px', fontWeight: '600' }}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const data = await api.user.registerOwner();
                              showToast(data.message || 'Đăng ký làm Chủ xe thành công!', 'success');
                              if (onUpdateUser) {
                                onUpdateUser({ ...user, role: 'owner' });
                              }
                              setActiveSubTab('register');
                            } catch (err) {
                              showToast(err.message || 'Lỗi khi đăng ký làm chủ xe.', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                        >
                          {loading ? 'Đang xử lý...' : 'Nâng cấp lên Chủ xe'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : !success ? (
                  <>
                    <h2 className="title" style={{ fontSize: '18px', textAlign: 'left' }}>Đăng Ký Xe Cho Thuê Mới</h2>
                    <p className="subtitle" style={{ fontSize: '13px', textAlign: 'left', marginBottom: 20 }}>
                      Nhập thông tin biển số xe, tải ảnh thực tế cùng giấy tờ xe để bộ phận CSKH phê duyệt lên hệ thống.
                    </p>

                    <form onSubmit={handleSubmitNewCar} className="list-car-form">
                      <div className="form-row-grid">
                        <div className="form-group">
                          <label className="form-label">Hãng xe *</label>
                          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                            <option value="VinFast">VinFast</option>
                            <option value="Toyota">Toyota</option>
                            <option value="Honda">Honda</option>
                            <option value="Hyundai">Hyundai</option>
                            <option value="Kia">Kia</option>
                            <option value="Mazda">Mazda</option>
                            <option value="Mitsubishi">Mitsubishi</option>
                            <option value="Ford">Ford</option>
                            <option value="Chevrolet">Chevrolet</option>
                            <option value="Suzuki">Suzuki</option>
                            <option value="Nissan">Nissan</option>
                            <option value="MG">MG</option>
                            <option value="Peugeot">Peugeot</option>
                            <option value="Subaru">Subaru</option>
                            <option value="Mercedes-Benz">Mercedes-Benz</option>
                            <option value="BMW">BMW</option>
                            <option value="Audi">Audi</option>
                            <option value="Lexus">Lexus</option>
                            <option value="Volvo">Volvo</option>
                            <option value="Porsche">Porsche</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Dòng xe (Model) *</label>
                          <input 
                            type="text" 
                            placeholder="Vd: VF 8, Vios, Accent..." 
                            className="form-input" 
                            style={{ paddingLeft: '14px' }}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-row-grid">
                        <div className="form-group">
                          <label className="form-label">Số ghế *</label>
                          <select value={seats} onChange={(e) => setSeats(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                            <option value={4}>4 chỗ</option>
                            <option value={5}>5 chỗ</option>
                            <option value={7}>7 chỗ</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Hộp số *</label>
                          <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                            <option value="Tự động">Tự động</option>
                            <option value="Số sàn">Số sàn</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row-grid">
                        <div className="form-group">
                          <label className="form-label">Nhiên liệu *</label>
                          <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                            <option value="Xăng">Xăng</option>
                            <option value="Dầu">Dầu</option>
                            <option value="Điện">Điện</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Khu vực cho thuê *</label>
                          <select value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                            <option value="Hà Nội">Hà Nội</option>
                            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                            <option value="Đà Nẵng">Đà Nẵng</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row-grid">
                        <div className="form-group">
                          <label className="form-label">Biển số xe (Biển kiểm soát) *</label>
                          <input 
                            type="text" 
                            placeholder="Vd: 30K-123.45" 
                            className="form-input" 
                            style={{ paddingLeft: '14px' }}
                            value={plateNumber}
                            onChange={(e) => setPlateNumber(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Đơn giá thuê / Ngày (VND) *</label>
                          <div className="input-container">
                            <DollarSign className="input-icon" size={16} />
                            <input 
                              type="number" 
                              placeholder="Vd: 800000" 
                              className="form-input"
                              value={pricePerDay}
                              onChange={(e) => setPricePerDay(e.target.value)}
                              min="300000"
                              max="5000000"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Hình ảnh thực tế của xe *</label>
                        <div className="car-photo-upload-zone">
                          {carImage ? (
                            <div className="uploaded-car-preview">
                              <img src={carImage} alt="Car Uploaded Preview" />
                              <button type="button" className="btn-remove-photo" onClick={() => setCarImage('')}>✕ Xóa ảnh</button>
                            </div>
                          ) : (
                            <label className="photo-upload-label">
                              <Upload className="upload-photo-icon" size={24} />
                              <span>{imageLoading ? 'Đang tải...' : 'Chọn ảnh thực tế của xe'}</span>
                              <p>Ảnh chụp rõ mặt trước, sườn xe dưới 5MB</p>
                              <input type="file" onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} disabled={imageLoading} />
                            </label>
                          )}
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary mt-6" disabled={loading || imageLoading}>
                        <PlusCircle size={18} />
                        {loading ? 'Đang nộp hồ sơ...' : 'Đăng Ký Xe Cho Thuê'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center" style={{ padding: '30px 10px' }}>
                    <Sparkles className="success-lottie-icon animate-bounce text-success mb-4" size={56} style={{ display: 'inline' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>Đăng Ký Xe Cho Thuê Thành Công!</h2>
                    <p className="subtitle mt-2" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Cảm ơn bạn! Xe **{brand} {model}** đã được nộp hồ sơ phê duyệt lên hệ thống. CSKH sẽ kiểm duyệt hồ sơ xe và đăng tải lên hệ thống trong chốc lát!
                    </p>

                    <div className="success-actions mt-6">
                      <button type="button" className="btn btn-secondary" onClick={handleResetForm}>
                        Đăng ký tiếp xe khác
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={handleResetForm}
                      >
                        <Check size={18} />
                        Xem đội xe sở hữu
                      </button>
                    </div>
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
                <h4>Chỉnh sửa phương tiện cho thuê</h4>
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
    </div>
  </div>
  );
};


