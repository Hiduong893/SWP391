import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, MapPin, PlusCircle, Sparkles, Check, Car, Compass, ShieldCheck, Eye, Trash2, X, RefreshCw, BarChart3, CreditCard, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const ListCar = ({ setCurrentTab }) => {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats, register, my-cars
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
      showToast(error.message || 'Lỗi khi ký gửi xe.', 'error');
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
            Quản lý đội xe ký gửi, phê duyệt yêu cầu đặt lịch từ khách thuê và theo dõi số dư thu nhập của bạn.
          </p>
        </div>
        <button onClick={() => fetchOwnerDashboard()} className="btn-refresh" title="Làm mới">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* 📊 STATS CARDS FOR OWNER (UC23) */}
      <div className="owner-stats-grid mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="owner-stat-card-glass">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tổng Thu Nhập</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#a855f7', marginTop: 4 }}>{formatCurrency(totalEarnings)}</h3>
          </div>
          <div className="owner-stat-icon bg-purple"><DollarSign size={20} /></div>
        </div>

        <div className="owner-stat-card-glass">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Đội Xe Sở Hữu</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'white', marginTop: 4 }}>{myCarsList.length} xe</h3>
          </div>
          <div className="owner-stat-icon bg-blue"><Car size={20} /></div>
        </div>

        <div className="owner-stat-card-glass">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Số Đơn Đặt Lịch</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'white', marginTop: 4 }}>{ownerBookings.length} lượt</h3>
          </div>
          <div className="owner-stat-icon bg-green"><BarChart3 size={20} /></div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="owner-sub-nav mb-6" style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
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

        <button 
          className={`owner-nav-btn ${activeSubTab === 'register' ? 'active' : ''}`}
          onClick={() => { setSuccess(false); setActiveSubTab('register'); }}
        >
          <PlusCircle size={15} />
          <span>Ký Gửi Xe Mới</span>
        </button>

        <button 
          className={`owner-nav-btn ${activeSubTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('revenue')}
        >
          <TrendingUp size={15} />
          <span>Thống Kê Doanh Thu</span>
        </button>
      </div>

      {/* VIEWPORT CONTROLS */}
      <div className="owner-viewport-box">
        {loading ? (
          <div className="owner-loading-box" style={{ padding: 48, background: '#11131c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, color: '#64748b', textAlign: 'center' }}>
            Đang tải kho dữ liệu chủ xe...
          </div>
        ) : (
          <>
            {/* SUB-TAB 1: STATS & BOOKINGS QUEUE (UC22, UC23) */}
            {activeSubTab === 'stats' && (
              <div className="owner-glass-table-container" style={{ background: 'rgba(17,19,28,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Yêu cầu đặt thuê xe chờ chủ xe duyệt (UC22)
                </h4>

                {pendingBookings.length === 0 ? (
                  <div style={{ padding: 32, background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12, color: '#64748b', textAlign: 'center', fontSize: '13px' }}>
                    Không có lịch thuê xe nào đang chờ duyệt. Đội xe của bạn đang sẵn sàng đón nhận những chuyến đi mới!
                  </div>
                ) : (
                  <table className="owner-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Khách Hàng</th>
                        <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Xe Yêu Cầu</th>
                        <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Thời Gian Nhận/Trả</th>
                        <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Doanh Thu</th>
                        <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Duyệt Đơn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBookings.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: 14, fontSize: '13px', color: '#cbd5e1' }}>
                            <strong>{b.userName}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{b.userEmail}</span>
                          </td>
                          <td style={{ padding: 14, fontSize: '13px', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img src={b.carImage} alt={b.carName} style={{ width: 44, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                              <strong>{b.carName}</strong>
                            </div>
                          </td>
                          <td style={{ padding: 14, fontSize: '12px', color: '#94a3b8' }}>
                            <strong>{b.pickupLocation}</strong>
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{b.pickupDate} ➔ {b.returnDate}</span>
                          </td>
                          <td style={{ padding: 14, fontSize: '13px', color: '#a855f7', fontWeight: 700 }}>{formatCurrency(b.totalPrice)}</td>
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
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                      Lịch sử cho thuê & Lịch trình hành trình
                    </h4>
                    <table className="owner-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Khách Hàng</th>
                          <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Phương Tiện</th>
                          <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Thời Gian</th>
                          <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Doanh Thu</th>
                          <th style={{ padding: 12, fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerBookings.filter(b => b.status !== 'pending_owner').map((b) => (
                          <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: 14, fontSize: '13px', color: '#cbd5e1' }}>
                              <strong>{b.userName}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{b.userEmail}</span>
                            </td>
                            <td style={{ padding: 14, fontSize: '13px', color: '#cbd5e1' }}>
                              <strong>{b.carName}</strong>
                            </td>
                            <td style={{ padding: 14, fontSize: '12px', color: '#94a3b8' }}>
                              <span>{b.pickupDate} ➔ {b.returnDate}</span>
                            </td>
                            <td style={{ padding: 14, fontSize: '13px', color: '#a855f7', fontWeight: 700 }}>{formatCurrency(b.totalPrice)}</td>
                            <td style={{ padding: 14 }}>
                              <span className={`owner-booking-status-badge badge-${b.status}`}>
                                {b.status === 'confirmed' ? 'Đã duyệt' : b.status === 'active' ? 'Đang thuê' : b.status === 'completed' ? 'Hoàn thành ✓' : b.status === 'disputed' ? 'Khiếu nại' : 'Đã hủy'}
                              </span>
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
              <div className="owner-glass-table-container" style={{ background: 'rgba(17,19,28,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                  Danh sách đội phương tiện ký gửi đã đăng ký (UC25)
                </h4>

                {myCarsList.length === 0 ? (
                  <div style={{ padding: 32, background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12, color: '#64748b', textAlign: 'center', fontSize: '13px' }}>
                    Bạn chưa ký gửi chiếc xe nào trên sàn. Hãy nhấn 'Ký Gửi Xe Mới' để đăng ký chiếc xe đầu tiên của bạn!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {myCarsList.map((car) => (
                      <div key={car.id} style={{ display: 'flex', gap: 12, background: '#11131c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'left' }}>
                        <img src={car.image} alt={car.model} style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 6, background: '#050508' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                          <div>
                            <strong style={{ fontSize: '10px', color: '#6366f1', display: 'block', textTransform: 'uppercase' }}>{car.brand}</strong>
                            <strong style={{ fontSize: '14px', color: 'white' }}>{car.model}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: 2 }}>Biển số: {car.plateNumber}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <strong style={{ fontSize: '12px', color: '#c084fc' }}>{formatCurrency(car.pricePerDay)}/ngày</strong>
                            
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button 
                                type="button"
                                className="owner-booking-status-badge badge-confirmed" 
                                style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', cursor: 'pointer', outline: 'none', padding: '3px 8px', fontSize: '10.5px' }}
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
              <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto', background: 'rgba(17,19,28,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {!success ? (
                  <>
                    <h2 className="title" style={{ fontSize: '18px', textAlign: 'left' }}>Đăng Ký Ký Gửi Xe Mới</h2>
                    <p className="subtitle" style={{ fontSize: '13px', textAlign: 'left', marginBottom: 20 }}>
                      Nhập thông tin biển số xe, tải ảnh thực tế cùng giấy tờ tờ xe để bộ phận CSKH phê duyệt lên chợ thuê.
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
                        {loading ? 'Đang nộp hồ sơ...' : 'Đăng Ký Ký Gửi Xe'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center" style={{ padding: '30px 10px' }}>
                    <Sparkles className="success-lottie-icon animate-bounce text-success mb-4" size={56} style={{ display: 'inline' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>Đăng Ký Ký Gửi Xe Thành Công!</h2>
                    <p className="subtitle mt-2" style={{ color: '#cbd5e1', fontSize: '13px' }}>
                      Cảm ơn bạn! Xe **{brand} {model}** đã được nộp hồ sơ phê duyệt lên hệ thống. CSKH sẽ kiểm duyệt hồ sơ xe và đăng tải lên sàn trong chốc lát!
                    </p>

                    <div className="success-actions mt-6">
                      <button type="button" className="btn btn-secondary" onClick={handleResetForm}>
                        Đăng ký ký gửi tiếp xe khác
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
                <h4>Chỉnh sửa phương tiện ký gửi</h4>
                <button className="owner-modal-close" onClick={() => setEditingCar(null)}>✕</button>
              </div>
              <form onSubmit={handleSubmitEditCar} className="list-car-form">
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: '#cbd5e1', fontSize: '13.5px' }}>
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

            {/* SUB-TAB 4: REVENUE STATISTICS (UC31) */}
            {activeSubTab === 'revenue' && (() => {
              // Tinh toan thong ke doanh thu
              const completedBookings = ownerBookings.filter(b => b.status === 'completed');
              const activeBookings = ownerBookings.filter(b => b.status === 'active');
              const cancelledBookings = ownerBookings.filter(b => b.status === 'cancelled');
              const completionRate = ownerBookings.length > 0 ? Math.round((completedBookings.length / ownerBookings.length) * 100) : 0;

              // Doanh thu theo tung xe
              const carRevenueMap = {};
              ownerBookings.forEach(b => {
                if (!carRevenueMap[b.carId]) carRevenueMap[b.carId] = { carName: b.carName, carImage: b.carImage, total: 0, trips: 0, completed: 0 };
                carRevenueMap[b.carId].total += (b.status === 'completed') ? b.totalPrice : 0;
                carRevenueMap[b.carId].trips++;
                if (b.status === 'completed') carRevenueMap[b.carId].completed++;
              });
              const carRevenueSorted = Object.values(carRevenueMap).sort((a, b) => b.total - a.total);
              const maxRevenue = carRevenueSorted[0]?.total || 1;

              return (
                <div className="owner-glass-table-container" style={{ background: 'rgba(17,19,28,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 20, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={15} style={{ color: '#a855f7' }} />
                    Thống Kê Doanh Thu Chi Tiết (UC31)
                  </h4>

                  {/* KPI SUMMARY CARDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Tổng Doanh Thu</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#a855f7', marginTop: 4 }}>{formatCurrency(totalEarnings)}</div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Chuyến Hoàn Thành</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', marginTop: 4 }}>{completedBookings.length} chuyến</div>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Đang Cho Thuê</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#818cf8', marginTop: 4 }}>{activeBookings.length} xe</div>
                    </div>
                    <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Tỷ Lệ Hoàn Thành</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#fb923c', marginTop: 4 }}>{completionRate}%</div>
                    </div>
                  </div>

                  {/* DOANH THU THEO XE */}
                  {carRevenueSorted.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12, fontSize: '13px' }}>
                      Chưa có chuyến đi nào hoàn thành. Hãy phê duyệt các yêu cầu thuê xe để bắt đầu kiếm doanh thu!
                    </div>
                  ) : (
                    <div>
                      <h5 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Award size={13} /> Xếp Hạng Doanh Thu Theo Xe
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {carRevenueSorted.map((car, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#475569', width: 24, flexShrink: 0, textAlign: 'center' }}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            {car.carImage && <img src={car.carImage} alt={car.carName} style={{ width: 54, height: 34, objectFit: 'cover', borderRadius: 6 }} />}
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>{car.carName}</strong>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{car.trips} chuyến · {car.completed} hoàn thành</span>
                              {/* Revenue bar */}
                              <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(car.total / maxRevenue) * 100}%`, background: idx === 0 ? 'linear-gradient(90deg, #a855f7, #6366f1)' : 'rgba(99,102,241,0.5)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '14px', color: '#a855f7', display: 'block' }}>{formatCurrency(car.total)}</strong>
                              <span style={{ fontSize: '10.5px', color: '#64748b' }}>doanh thu</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* CHI TIET TUNG CHUYEN DI HOAN THANH */}
                      {completedBookings.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <h5 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Lịch Sử Chuyến Đã Hoàn Thành</h5>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>Khách hàng</th>
                                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>Xe</th>
                                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>Thời gian</th>
                                <th style={{ padding: '8px 10px', color: '#a855f7', fontWeight: 700, textAlign: 'right' }}>Doanh thu</th>
                              </tr>
                            </thead>
                            <tbody>
                              {completedBookings.map(b => (
                                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '10px 10px', color: '#cbd5e1' }}><strong>{b.userName}</strong></td>
                                  <td style={{ padding: '10px 10px', color: '#94a3b8' }}>{b.carName}</td>
                                  <td style={{ padding: '10px 10px', color: '#64748b', fontSize: '11px' }}>{b.pickupDate} → {b.returnDate}</td>
                                  <td style={{ padding: '10px 10px', color: '#a855f7', fontWeight: 700, textAlign: 'right' }}>{formatCurrency(b.totalPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
      </div>
    </div>
  );
};

// Inject CSS styles for ListCar
const injectListCarStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'list-car-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .owner-dashboard-page {
      animation: fadeIn 0.4s ease-out;
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

    /* Owner stats card */
    .owner-stat-card-glass {
      background: rgba(17, 19, 28, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      text-align: left;
    }

    .owner-stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .bg-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .bg-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .bg-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    /* Owner sub-tab nav button */
    .owner-nav-btn {
      background: none;
      border: none;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px 8px 0 0;
      transition: all 0.2s;
      position: relative;
    }

    .owner-nav-btn:hover {
      color: white;
    }

    .owner-nav-btn.active {
      color: #6366f1;
    }

    .owner-nav-btn.active::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 0;
      right: 0;
      height: 2px;
      background: #6366f1;
    }

    /* Custom badges */
    .owner-booking-status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .owner-booking-status-badge.badge-confirmed { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .owner-booking-status-badge.badge-active { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .owner-booking-status-badge.badge-completed { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .owner-booking-status-badge.badge-cancelled { background: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); }
    .owner-booking-status-badge.badge-disputed { background: rgba(239, 68, 68, 0.15); color: #fda4af; border: 1px solid rgba(239, 68, 68, 0.3); }

    .car-moderation-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .car-moderation-badge.badge-pending_moderation { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .car-moderation-badge.badge-available { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .car-moderation-badge.badge-rented { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    .car-moderation-badge.badge-rejected { background: rgba(244, 63, 94, 0.15); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.3); }

    /* Form and grids */
    .list-car-form {
      text-align: left;
    }

    .form-row-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .form-row-grid {
        grid-template-columns: 1fr;
        gap: 0;
      }
      .owner-stats-grid {
        grid-template-columns: 1fr !important;
      }
    }

    /* Car Upload Zone */
    .car-photo-upload-zone {
      border: 2px dashed rgba(255,255,255,0.08);
      background: rgba(10,11,16,0.4);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: all 0.2s;
    }

    .car-photo-upload-zone:hover {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.03);
    }

    .photo-upload-label {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .upload-photo-icon {
      color: #64748b;
      margin-bottom: 4px;
    }

    .photo-upload-label span {
      font-size: 13px;
      font-weight: 700;
      color: #cbd5e1;
    }

    .photo-upload-label p {
      font-size: 11px;
      color: #475569;
    }

    .uploaded-car-preview {
      position: relative;
      width: 100%;
      max-height: 200px;
      border-radius: 8px;
      overflow: hidden;
    }

    .uploaded-car-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove-photo {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(244, 63, 94, 0.9);
      border: none;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-remove-photo:hover {
      background: #f43f5e;
    }

    .success-actions {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 12px;
    }

    /* Owner Edit Modal Styles */
    .owner-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(5, 5, 8, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    .owner-modal-card {
      background: rgba(17, 19, 28, 0.95) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px;
      width: 100%;
      max-width: 580px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .owner-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 12px;
    }

    .owner-modal-header h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
    }

    .owner-modal-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 18px;
      cursor: pointer;
      transition: color 0.2s;
    }

    .owner-modal-close:hover {
      color: white;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
};

injectListCarStyles();
