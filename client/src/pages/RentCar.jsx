import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Clock, SlidersHorizontal, Users, Fuel, Shield, CheckCircle, Info, Star, HelpCircle, X, ChevronDown, MessageSquare } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const RentCar = ({ user, onRentCarClick, setCurrentTab }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [location, setLocation] = useState('Hà Nội');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  
  // Filters state
  const [seats, setSeats] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuel, setFuel] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // System config & policies notice
  const [systemConfig, setSystemConfig] = useState(null);

  // Car Details & Reviews Popup state
  const [selectedCarDetails, setSelectedCarDetails] = useState(null);
  const [selectedCarReviews, setSelectedCarReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Collapsible Policies state
  const [activePolicyIndex, setActivePolicyIndex] = useState(null);

  const { showToast } = useToast();

  const fetchCars = async (filters = {}) => {
    setLoading(true);
    try {
      const data = await api.cars.getCars(filters);
      setCars(data);
    } catch (error) {
      showToast('Không thể lấy danh sách xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const config = await api.system.getConfig();
      setSystemConfig(config);
    } catch (e) {
      console.warn("Lỗi tải thông tin cấu hình hệ thống.");
    }
  };

  useEffect(() => {
    // Set default dates to tomorrow and next day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    setPickupDate(tomorrow.toISOString().split('T')[0]);
    setReturnDate(dayAfter.toISOString().split('T')[0]);

    fetchCars();
    fetchSystemConfig();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (new Date(pickupDate) >= new Date(returnDate)) {
      showToast('Ngày trả xe phải sau ngày nhận xe ít nhất 1 ngày.', 'warning');
      return;
    }
    
    const filters = {
      location,
      seats,
      transmission,
      fuel,
      search: searchKeyword
    };
    fetchCars(filters);
    showToast(`Đã tìm thấy xe phù hợp tại ${location}!`, 'success');
  };

  const handleResetFilters = () => {
    setSeats('');
    setTransmission('');
    setFuel('');
    setSearchKeyword('');
    fetchCars({ location });
  };

  const handleBooking = (car) => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản để tiến hành đặt xe.', 'warning');
      setCurrentTab('login');
      return;
    }
    
    onRentCarClick({
      car,
      pickupDate,
      returnDate,
      pickupLocation: location
    });
    setSelectedCarDetails(null); // Close details modal if open
  };

  const handleViewCarDetails = async (car) => {
    setSelectedCarDetails(car);
    setReviewsLoading(true);
    try {
      const reviewsList = await api.reviews.getCarReviews(car.id);
      setSelectedCarReviews(reviewsList);
    } catch (e) {
      setSelectedCarReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const togglePolicy = (index) => {
    setActivePolicyIndex(activePolicyIndex === index ? null : index);
  };

  // Preset policies (UC11)
  const systemPolicies = [
    {
      title: "1. Hồ sơ thuê xe tự lái cần những gì?",
      content: "Để thuê xe tự lái tại BonBonCar, bạn cần hoàn thành xác thực KYC danh tính bao gồm: (1) Căn cước công dân (CCCD) và (2) Bằng lái xe hạng B1 trở lên còn thời hạn. CSKH sẽ phê duyệt hồ sơ của bạn trong vòng tối đa 30 phút."
    },
    {
      title: "2. Quy định đặt cọc bảo đảm là như thế nào?",
      content: "Tất cả các chuyến đi tại BonBonCar đều áp dụng tiền đặt cọc cố định là 5.000.000 VND. Tiền cọc được thanh toán trực tuyến cùng phí thuê qua cổng VietQR động. Khoản tiền cọc này được giữ bảo đảm và sẽ được phê duyệt hoàn trả 100% vào Ví điện tử cá nhân của bạn ngay sau khi trả xe hoàn tất mà không phát sinh sự cố hỏng hóc hay vi phạm giao thông."
    },
    {
      title: "3. Chính sách hủy chuyến và hoàn trả tiền",
      content: "Bạn có thể hủy chuyến đi miễn phí bất cứ lúc nào trước thời điểm nhận xe dự kiến 24 tiếng. Tiền cọc và tiền thuê xe sẽ được hoàn trả lập tức vào Ví cá nhân. Hủy chuyến trong vòng 24 tiếng so với giờ khởi hành sẽ chịu mức phí dịch vụ 15% tổng tiền thuê làm phí đền bù cho chủ xe nhàn rỗi."
    },
    {
      title: "4. Bảo hiểm chuyến đi và xử lý sự cố khẩn cấp",
      content: "Tất cả phương tiện trên chợ thuê xe của BonBonCar đều được tích hợp gói bảo hiểm chuyến đi trọn gói giúp giới hạn thiệt hại vật chất tối đa là 5.000.000 VND trong trường hợp va chạm ngoài ý muốn. Nếu gặp sự cố va quẹt hay xịt lốp dọc đường, bạn chỉ cần bấm nút 'Báo Cáo Sự Cố' khẩn cấp trong mục chuyến đi, CSKH và cứu hộ sẽ hỗ trợ lập tức."
    }
  ];

  return (
    <div className="rent-car-page">
      {/* 🚀 BONBONCAR BRANDED HERO SECTION */}
      <section className="bonbon-hero">
        <div className="hero-content">
          <span className="hero-badge">🚗 NỀN TẢNG THUÊ XE TỰ LÁI & KÝ GỬI THẾ HỆ MỚI</span>
          <h1 className="hero-title">Thuê xe tự lái ngắn hạn & ký gửi xe</h1>
          <p className="hero-subtitle">
            Trải nghiệm dịch vụ chia sẻ ô tô công nghệ hàng đầu Việt Nam. Thủ tục đơn giản, xe đời mới sạch sẽ, bảo hiểm chuyến đi trọn gói.
          </p>
        </div>

        {/* --- BONBON FORM TÌM XE --- */}
        <div className="search-widget-glass">
          <form onSubmit={handleSearchSubmit} className="search-form-grid">
            <div className="search-input-box">
              <label className="search-lbl"><MapPin size={14} /> Địa điểm nhận xe</label>
              <select 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="search-select"
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>

            <div className="search-input-box">
              <label className="search-lbl"><Calendar size={14} /> Ngày nhận xe</label>
              <input 
                type="date" 
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="search-date-input"
                required
              />
            </div>

            <div className="search-input-box">
              <label className="search-lbl"><Calendar size={14} /> Ngày trả xe</label>
              <input 
                type="date" 
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="search-date-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary search-btn-submit">
              <Search size={18} />
              <span>Tìm Xe Ngay</span>
            </button>
          </form>
        </div>
      </section>

      {/* 📢 SYSTEM NOTICE BANNER (UC29) */}
      {systemConfig && systemConfig.systemNotice && (
        <div className="system-notice-alert-wrapper">
          <div className="system-notice-alert">
            <div className="alert-glow-dot"></div>
            <Info size={16} className="text-primary flex-shrink-0" />
            <div className="alert-msg-container">
              <strong>Thông báo hệ thống:</strong> {systemConfig.systemNotice}
            </div>
          </div>
        </div>
      )}

      {/* 📊 BỘ LỌC CHI TIẾT & DANH MỤC XE */}
      <div className="catalog-container">
        {/* Toggle Filters bar */}
        <div className="catalog-header-actions">
          <h3 className="section-title">Danh sách xe có sẵn ({cars.length} xe)</h3>
          <button 
            className={`btn btn-secondary filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
            <span>Bộ lọc nâng cao</span>
          </button>
        </div>

        {/* Dynamic filter panel */}
        {showFilters && (
          <div className="filters-panel-card">
            <div className="filters-grid">
              <div className="filter-item">
                <span className="filter-lbl">Số chỗ ngồi:</span>
                <select value={seats} onChange={(e) => setSeats(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  <option value="4">4 chỗ</option>
                  <option value="5">5 chỗ</option>
                  <option value="7">7 chỗ</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-lbl">Hộp số:</span>
                <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  <option value="Tự động">Tự động</option>
                  <option value="Số sàn">Số sàn</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-lbl">Nhiên liệu:</span>
                <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  <option value="Xăng">Xăng</option>
                  <option value="Dầu">Dầu</option>
                  <option value="Điện">Điện</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-lbl">Tìm theo tên xe:</span>
                <input 
                  type="text" 
                  placeholder="VinFast, Vios..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="filter-input-search"
                />
              </div>
            </div>

            <div className="filter-actions-row">
              <button onClick={handleResetFilters} className="btn-link-reset">Đặt lại lọc</button>
              <button 
                onClick={() => fetchCars({ location, seats, transmission, fuel, search: searchKeyword })} 
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 24px', fontSize: '13px' }}
              >
                Áp Dụng Bộ Lọc
              </button>
            </div>
          </div>
        )}

        {/* CAR GRID VIEW */}
        {loading ? (
          <div className="catalog-loading">Đang tải danh sách xe hệ thống...</div>
        ) : cars.length === 0 ? (
          <div className="catalog-empty-state">
            <Info size={40} className="text-muted mb-2" />
            <p>Không tìm thấy xe nào phù hợp với bộ lọc tại {location}.</p>
            <button onClick={handleResetFilters} className="btn btn-secondary mt-4" style={{ width: 'auto' }}>Xem tất cả xe có sẵn</button>
          </div>
        ) : (
          <div className="cars-grid">
            {cars.map((car) => (
              <div key={car.id} className="car-card">
                {/* Image */}
                <div className="car-image-container" onClick={() => handleViewCarDetails(car)} style={{ cursor: 'pointer' }}>
                  <img src={car.image} alt={`${car.brand} ${car.model}`} className="car-img" />
                  <span className={`car-status-badge ${car.status === 'rented' ? 'rented' : 'available'}`}>
                    {car.status === 'rented' ? 'Đang được thuê' : 'Sẵn sàng'}
                  </span>
                  <span className="car-location-badge">
                    <MapPin size={12} style={{ marginRight: 2 }} />
                    {car.location}
                  </span>
                </div>

                {/* Info */}
                <div className="car-info-body">
                  <div className="car-header" onClick={() => handleViewCarDetails(car)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 className="car-title-brand">{car.brand}</h4>
                      <span className="stars-badge-card">
                        <Star size={12} fill="#fbbf24" color="#fbbf24" style={{ marginRight: 3 }} />
                        <span style={{ fontSize: '11px', fontWeight: 7, color: '#fbbf24' }}>4.8</span>
                      </span>
                    </div>
                    <h3 className="car-title-model">{car.model}</h3>
                  </div>

                  {/* Attributes Icons Grid */}
                  <div className="car-attributes">
                    <div className="attr-item" title="Số chỗ">
                      <Users size={14} />
                      <span>{car.seats} chỗ</span>
                    </div>
                    <div className="attr-item" title="Hộp số">
                      <SlidersHorizontal size={14} />
                      <span>{car.transmission}</span>
                    </div>
                    <div className="attr-item" title="Nhiên liệu">
                      <Fuel size={14} />
                      <span>{car.fuel}</span>
                    </div>
                  </div>

                  <hr className="car-divider" />

                  {/* Price and booking action */}
                  <div className="car-footer">
                    <div className="car-price-box">
                      <span className="price-num">{formatCurrency(car.pricePerDay)}</span>
                      <span className="price-unit">/ngày</span>
                    </div>
                    
                    <button 
                      onClick={() => handleBooking(car)}
                      className="btn btn-primary btn-book-car"
                      disabled={car.status === 'rented'}
                    >
                      {car.status === 'rented' ? 'Đã Hết Xe' : 'Thuê Xe'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 📚 CHÍNH SÁCH VÀ QUY ĐỊNH HƯỚNG DẪN (UC11) */}
        <div className="policies-collapsible-section mt-12">
          <div className="section-header-cskh" style={{ textAlign: 'left', marginBottom: '16px' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle className="text-primary" size={22} />
              <span>Chính Sách & Quy Định Thuê Xe (FAQ)</span>
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: 4 }}>
              Tìm hiểu các hướng dẫn thủ tục, quy chế đặt cọc bảo đảm, chính sách hoàn hủy của nền tảng BonBonCar.
            </p>
          </div>

          <div className="policies-accordion">
            {systemPolicies.map((policy, idx) => (
              <div key={idx} className={`accordion-item-glass ${activePolicyIndex === idx ? 'expanded' : ''}`}>
                <button className="accordion-trigger" onClick={() => togglePolicy(idx)}>
                  <span className="accordion-title">{policy.title}</span>
                  <ChevronDown className="accordion-arrow" size={16} />
                </button>
                {activePolicyIndex === idx && (
                  <div className="accordion-content">
                    <p>{policy.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- CAR DETAILS & CUSTOMER REVIEWS LIGHTBOX POPUP (UC10, UC12) --- */}
      {selectedCarDetails && (
        <div className="lightbox-overlay" onClick={() => setSelectedCarDetails(null)}>
          <div className="lightbox-card car-details-lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>Chi Tiết Phương Tiện & Đánh Giá Khách Hàng</h4>
              <button className="btn-close-lightbox" onClick={() => setSelectedCarDetails(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="details-popup-scrollable-body">
              {/* Car basic presentation */}
              <div className="popup-car-banner">
                <img src={selectedCarDetails.image} alt={selectedCarDetails.model} className="popup-banner-img" />
                <div className="banner-gradient-overlay"></div>
                <div className="banner-title-box">
                  <span className="brand-cap">{selectedCarDetails.brand}</span>
                  <h3 className="model-cap">{selectedCarDetails.model}</h3>
                </div>
              </div>

              <div className="popup-body-content">
                {/* Attrs grid */}
                <div className="popup-spec-grid">
                  <div className="spec-card">
                    <span className="spec-lbl">Vị trí</span>
                    <strong className="spec-val">{selectedCarDetails.location}</strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-lbl">Số ghế</span>
                    <strong className="spec-val">{selectedCarDetails.seats} chỗ</strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-lbl">Hộp số</span>
                    <strong className="spec-val">{selectedCarDetails.transmission}</strong>
                  </div>
                  <div className="spec-card">
                    <span className="spec-lbl">Nhiên liệu</span>
                    <strong className="spec-val">{selectedCarDetails.fuel}</strong>
                  </div>
                  {selectedCarDetails.plateNumber && (
                    <div className="spec-card">
                      <span className="spec-lbl">Biển kiểm soát</span>
                      <strong className="spec-val" style={{ color: '#818cf8' }}>{selectedCarDetails.plateNumber}</strong>
                    </div>
                  )}
                </div>

                <div className="popup-description-block mt-4">
                  <h5 className="block-title">Đặc Điểm & Điều Khoản Thuê Xe</h5>
                  <p className="block-desc">
                    Mẫu xe {selectedCarDetails.brand} {selectedCarDetails.model} đời mới sạch sẽ, động cơ êm ái, trang bị camera hành trình, cảm biến lùi, màn hình giải trí và bản đồ GPS đầy đủ. Xe được vệ sinh và khử khuẩn trước mỗi hành trình giao khách. Khách hàng vui lòng xuất trình Bằng lái xe và hoàn tất đặt cọc bảo đảm 5.000.000 VND trước khi khởi hành chuyến đi.
                  </p>
                </div>

                {/* 🌟 CUSTOMER REVIEWS TAB / GRID (UC12) */}
                <div className="popup-reviews-block mt-6">
                  <h5 className="block-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={16} className="text-info" />
                    <span>Đánh Giá Từ Khách Thuê ({selectedCarReviews.length})</span>
                  </h5>

                  {reviewsLoading ? (
                    <div className="reviews-placeholder">Đang tải các đánh giá từ hệ thống...</div>
                  ) : selectedCarReviews.length === 0 ? (
                    <div className="reviews-placeholderempty">
                      <Star size={24} className="text-muted mb-2" />
                      <p>Chưa có đánh giá nào cho phương tiện này. Hãy là người đầu tiên trải nghiệm và chia sẻ nhận xét!</p>
                    </div>
                  ) : (
                    <div className="reviews-scroller-list">
                      {selectedCarReviews.map((rev) => (
                        <div key={rev.id} className="review-bubble">
                          <div className="review-bubble-header">
                            <div className="review-user-info">
                              <div className="avatar-letter">{rev.userName[0].toUpperCase()}</div>
                              <div className="user-details">
                                <span className="name">{rev.userName}</span>
                                <span className="date">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                            </div>
                            <div className="stars-row">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={12} 
                                  fill={i < rev.rating ? "#fbbf24" : "none"} 
                                  color={i < rev.rating ? "#fbbf24" : "#475569"} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="review-bubble-text">{rev.comment || 'Khách hàng không để lại nhận xét bằng lời.'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action footer */}
              <div className="popup-action-footer">
                <div className="popup-price-info">
                  <span className="price-val">{formatCurrency(selectedCarDetails.pricePerDay)}</span>
                  <span className="price-unit">/ngày (Chưa bao gồm cọc hoàn lại)</span>
                </div>
                <div className="popup-buttons">
                  <button className="btn btn-secondary" onClick={() => setSelectedCarDetails(null)}>Hủy bỏ</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleBooking(selectedCarDetails)}
                    disabled={selectedCarDetails.status === 'rented'}
                  >
                    {selectedCarDetails.status === 'rented' ? 'Đã Hết Xe' : 'Đặt Xe Ngay'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inject CSS styles for RentCar page
const injectRentCarStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'rent-car-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .rent-car-page {
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    /* Hero section */
    .bonbon-hero {
      text-align: center;
      padding: 40px 24px 60px 24px;
      position: relative;
    }

    .hero-content {
      max-width: 700px;
      margin: 0 auto 28px;
    }

    .hero-badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #818cf8;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 99px;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }

    .hero-title {
      font-size: 40px;
      font-weight: 800;
      color: white;
      line-height: 1.2;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }

    .hero-subtitle {
      font-size: 16px;
      color: #94a3b8;
      max-width: 600px;
      margin: 0 auto;
    }

    /* System Notice */
    .system-notice-alert-wrapper {
      max-width: 900px;
      margin: -20px auto 30px;
      padding: 0 20px;
    }

    .system-notice-alert {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #e2e8f0;
      font-size: 13.5px;
      position: relative;
      overflow: hidden;
      text-align: left;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.1);
    }

    .alert-glow-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      position: absolute;
      top: 18px;
      left: 10px;
      box-shadow: 0 0 10px #10b981, 0 0 20px #10b981;
      animation: alertPulse 1.5s infinite;
    }

    @keyframes alertPulse {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    .alert-msg-container {
      flex: 1;
      line-height: 1.4;
    }

    .alert-msg-container strong {
      color: #34d399;
    }

    /* Search Widget */
    .search-widget-glass {
      background: rgba(17, 19, 28, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    .search-form-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr) auto;
      gap: 16px;
      align-items: end;
    }

    .search-input-box {
      text-align: left;
    }

    .search-lbl {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .search-select, .search-date-input {
      width: 100%;
      padding: 12px 14px;
      background: #0a0b10;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }

    .search-select:focus, .search-date-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .search-btn-submit {
      height: 45px;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .search-form-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .hero-title {
        font-size: 28px;
      }
    }

    /* Catalog list */
    .catalog-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px 60px 24px;
    }

    .catalog-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
    }

    .filter-toggle-btn {
      width: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 8px 16px;
    }

    .filter-toggle-btn.active {
      border-color: #6366f1;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.1);
    }

    /* Filter panel card */
    .filters-panel-card {
      background: #11131c;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 28px;
      animation: fadeIn 0.2s ease-out;
      text-align: left;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-lbl {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    .filter-select, .filter-input-search {
      padding: 10px 12px;
      background: #0a0b10;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      outline: none;
    }

    .filter-select:focus, .filter-input-search:focus {
      border-color: #6366f1;
    }

    .filter-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 14px;
    }

    .btn-link-reset {
      background: none;
      border: none;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: underline;
    }

    .btn-link-reset:hover {
      color: white;
    }

    @media (max-width: 768px) {
      .filters-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 480px) {
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Grid layout */
    .cars-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .cars-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .cars-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Car card */
    .car-card {
      background: #11131c;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      transition: all 0.3s;
      text-align: left;
    }

    .car-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.2);
      box-shadow: 0 12px 30px rgba(99, 102, 241, 0.08);
    }

    .car-image-container {
      position: relative;
      width: 100%;
      height: 180px;
      background: #0a0b10;
      overflow: hidden;
    }

    .car-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }

    .car-card:hover .car-img {
      transform: scale(1.05);
    }

    .car-status-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .car-status-badge.available {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .car-status-badge.rented {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fda4af;
    }

    .car-location-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(5, 5, 8, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }

    .car-info-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .car-header {
      margin-bottom: 14px;
    }

    .car-title-brand {
      font-size: 12px;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }

    .stars-badge-card {
      display: flex;
      align-items: center;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .car-title-model {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
    }

    .car-attributes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .attr-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 6px 4px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #94a3b8;
    }

    .attr-item span {
      font-size: 11px;
      font-weight: 500;
    }

    .car-divider {
      border: none;
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 0 0 16px 0;
    }

    .car-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .car-price-box {
      display: flex;
      flex-direction: column;
    }

    .price-num {
      font-size: 16px;
      font-weight: 800;
      color: #a855f7;
    }

    .price-unit {
      font-size: 11px;
      color: #64748b;
    }

    .btn-book-car {
      width: auto;
      padding: 8px 16px;
      font-size: 13px;
      border-radius: 8px;
    }

    .catalog-loading, .catalog-empty-state {
      padding: 80px 24px;
      background: #11131c;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px;
      color: #64748b;
      text-align: center;
    }

    /* Policies FAQ styles */
    .accordion-item-glass {
      background: rgba(17, 19, 28, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.2s;
    }

    .accordion-item-glass.expanded {
      background: rgba(17, 19, 28, 0.7);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .accordion-trigger {
      width: 100%;
      background: none;
      border: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      cursor: pointer;
      color: white;
      font-family: 'Outfit', sans-serif;
      text-align: left;
    }

    .accordion-title {
      font-size: 14.5px;
      font-weight: 600;
    }

    .accordion-arrow {
      color: #64748b;
      transition: transform 0.2s;
    }

    .accordion-item-glass.expanded .accordion-arrow {
      transform: rotate(180deg);
      color: #818cf8;
    }

    .accordion-content {
      padding: 0 20px 18px 20px;
      color: #94a3b8;
      font-size: 13.5px;
      line-height: 1.5;
    }

    /* Car Details Lightbox */
    .car-details-lightbox {
      max-width: 650px !important;
    }

    .details-popup-scrollable-body {
      max-height: 75vh;
      overflow-y: auto;
      text-align: left;
    }

    .popup-car-banner {
      position: relative;
      width: 100%;
      height: 220px;
      background: #050508;
    }

    .popup-banner-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .banner-gradient-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: linear-gradient(to top, rgba(17, 19, 28, 0.95), transparent);
    }

    .banner-title-box {
      position: absolute;
      bottom: 16px;
      left: 20px;
    }

    .brand-cap {
      font-size: 11px;
      font-weight: 800;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .model-cap {
      font-size: 22px;
      font-weight: 800;
      color: white;
      margin-top: 2px;
    }

    .popup-body-content {
      padding: 20px;
    }

    .popup-spec-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .spec-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .spec-lbl {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .spec-val {
      font-size: 14px;
      font-weight: 700;
      color: #e2e8f0;
    }

    .block-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      border-left: 3px solid #6366f1;
      padding-left: 8px;
    }

    .block-desc {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }

    .reviews-placeholder, .reviews-placeholderempty {
      padding: 24px;
      background: rgba(255,255,255,0.01);
      border: 1px dashed rgba(255,255,255,0.06);
      border-radius: 10px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }

    .reviews-scroller-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 250px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .review-bubble {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 14px;
    }

    .review-bubble-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .review-user-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .avatar-letter {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-details .name {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .user-details .date {
      font-size: 11px;
      color: #64748b;
    }

    .stars-row {
      display: flex;
      gap: 2px;
    }

    .review-bubble-text {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.4;
      text-align: left;
    }

    .popup-action-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0d0f17;
    }

    .popup-price-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .popup-price-info .price-val {
      font-size: 18px;
      font-weight: 800;
      color: #c084fc;
    }

    .popup-price-info .price-unit {
      font-size: 11px;
      color: #64748b;
    }

    .popup-buttons {
      display: flex;
      gap: 8px;
    }
  `;
  document.head.appendChild(style);
};

injectRentCarStyles();
