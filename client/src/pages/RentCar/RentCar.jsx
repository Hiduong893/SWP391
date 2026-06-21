import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Clock, SlidersHorizontal, Users, Fuel, Shield, CheckCircle, Info, Star, HelpCircle, X, ChevronDown, MessageSquare, Facebook, Instagram, Twitter, Youtube, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './RentCar.css';

export const RentCar = ({ user, onRentCarClick, setCurrentTab, onSearch }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [location, setLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:30');
  const [returnTime, setReturnTime] = useState('10:00');
  const [searchTab, setSearchTab] = useState('self-drive'); // self-drive, monthly

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

  // Kiểm soát các thanh cuộn (Huy)
  const brandScrollRef = useRef(null);
  const likesScrollRef = useRef(null);
  const luxuryScrollRef = useRef(null);
  const locationsScrollRef = useRef(null);
  const reviewsScrollRef = useRef(null);
  const catalogScrollRef = useRef(null);

  const { showToast } = useToast();

  const fetchCars = async (filters = {}) => {
    setLoading(true);
    try {
      const data = await api.cars.getCars(filters);
      setCars(data);
    } catch (error) {
      console.error('Lỗi chi tiết khi lấy danh sách xe:', error);
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

    if (onSearch) {
      onSearch({
        location,
        pickupDate,
        returnDate,
        pickupTime,
        returnTime
      });
      showToast(`Đang mở trang tìm xe tại ${location || 'mọi địa điểm'}...`, 'success');
    } else {
      const filters = {
        location,
        seats,
        transmission,
        fuel,
        search: searchKeyword
      };
      fetchCars(filters);
      showToast(`Đã tìm thấy xe phù hợp tại ${location || 'mọi địa điểm'}!`, 'success');
    }
  };

  const handleResetFilters = () => {
    setLocation('');
    setSeats('');
    setTransmission('');
    setFuel('');
    setSearchKeyword('');
    fetchCars({});
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
      pickupLocation: location || car.location || 'Không xác định'
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

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleBrandClick = (brandName) => {
    setSearchKeyword(brandName);
    fetchCars({ search: brandName });
    showToast(`Đang tìm kiếm tất cả xe thuộc hãng ${brandName}...`, 'info');

    // Smooth scroll down to the main catalog
    const catalogElem = document.getElementById('catalog-live-section');
    if (catalogElem) {
      catalogElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLocationClick = (locName) => {
    setLocation(locName);
    fetchCars({ location: locName });
    showToast(`Đang tìm kiếm xe tại khu vực ${locName}...`, 'info');

    const catalogElem = document.getElementById('catalog-live-section');
    if (catalogElem) {
      catalogElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const togglePolicy = (index) => {
    setActivePolicyIndex(activePolicyIndex === index ? null : index);
  };

  // --- RICH SECTIONS MOCK DATA ---

  const likesCars = [
    {
      id: 'likes-car-1',
      brand: 'Hyundai',
      model: 'Stargazer 2024',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 900000,
      fourHourPriceOrig: '500K',
      fourHourPrice: '450K',
      dayPriceOrig: '1000K',
      dayPrice: '900K',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
      location: 'Quận 4',
      status: 'available',
      plateNumber: '51K-123.45',
      rating: 4.8,
      badges: ['Flash Sale', 'Tự nhận xe']
    },
    {
      id: 'likes-car-2',
      brand: 'Suzuki',
      model: 'XL7 2022',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 810000,
      fourHourPriceOrig: '450K',
      fourHourPrice: '410K',
      dayPriceOrig: '900K',
      dayPrice: '810K',
      image: 'https://images.unsplash.com/photo-1631835339316-dfeb9818b459?auto=format&fit=crop&w=600&q=80',
      location: 'Quận 4',
      status: 'available',
      plateNumber: '51L-999.88',
      rating: 4.8,
      badges: ['Flash Sale', 'Tự nhận xe']
    },
    {
      id: 'likes-car-3',
      brand: 'Kia',
      model: 'Carens 2023',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 990000,
      fourHourPriceOrig: '550K',
      fourHourPrice: '500K',
      dayPriceOrig: '1100K',
      dayPrice: '990K',
      image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Bình Thạnh',
      status: 'available',
      plateNumber: '51G-567.89',
      rating: 4.9,
      badges: ['Flash Sale', 'Tự nhận xe']
    },
    {
      id: 'likes-car-4',
      brand: 'Hyundai',
      model: 'Stargazer 2024',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 900000,
      fourHourPriceOrig: '500K',
      fourHourPrice: '450K',
      dayPriceOrig: '1000K',
      dayPrice: '900K',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
      location: 'Quận 4',
      status: 'available',
      plateNumber: '51H-111.22',
      rating: 4.8,
      badges: ['Flash Sale', 'Tự nhận xe']
    },
    {
      id: 'likes-car-5',
      brand: 'Mitsubishi',
      model: 'Xpander 2022',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 810000,
      fourHourPriceOrig: '450K',
      fourHourPrice: '410K',
      dayPriceOrig: '900K',
      dayPrice: '810K',
      image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Bình Thạnh',
      status: 'available',
      plateNumber: '43A-555.55',
      rating: 4.8,
      badges: ['Flash Sale', 'Tự nhận xe']
    },
    {
      id: 'likes-car-6',
      brand: 'Kia',
      model: 'Sorento 2023',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Dầu',
      pricePerDay: 1310000,
      fourHourPriceOrig: '730K',
      fourHourPrice: '660K',
      dayPriceOrig: '1450K',
      dayPrice: '1310K',
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80',
      location: 'Quận 7',
      status: 'available',
      plateNumber: '51K-666.99',
      rating: 4.9,
      badges: ['Flash Sale', 'Tự nhận xe']
    }
  ];

  const luxuryCars = [
    {
      id: 'lux-car-1',
      brand: 'MERCEDES',
      model: 'GLC 200 4MATIC',
      seats: 5,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 2400000,
      fourHourPriceOrig: '1330K',
      fourHourPrice: '1200K',
      dayPriceOrig: '2660K',
      dayPrice: '2400K',
      image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=600&q=80',
      location: 'Quận 10',
      status: 'available',
      plateNumber: '30K-999.99',
      rating: 5.0,
      badges: ['Giảm 10%', 'Xế xịn', 'Tự nhận xe']
    },
    {
      id: 'lux-car-2',
      brand: 'Mercedes',
      model: 'C200 2019',
      seats: 5,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 1650000,
      fourHourPriceOrig: '1450K',
      fourHourPrice: '1450K',
      dayPriceOrig: '1650K',
      dayPrice: '1650K',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Gò Vấp',
      status: 'available',
      plateNumber: '51F-123.45',
      rating: 4.9,
      badges: ['Xế xịn', 'Gặp chủ xe']
    },
    {
      id: 'lux-car-3',
      brand: 'Mercedes',
      model: 'C200 2021',
      seats: 5,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 1770000,
      fourHourPriceOrig: '1570K',
      fourHourPrice: '1570K',
      dayPriceOrig: '1770K',
      dayPrice: '1770K',
      image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Gò Vấp',
      status: 'available',
      plateNumber: '51H-999.99',
      rating: 5.0,
      badges: ['Xế xịn', 'Gặp chủ xe']
    },
    {
      id: 'lux-car-4',
      brand: 'Mercedes',
      model: 'GLC200 2022',
      seats: 5,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 2360000,
      fourHourPriceOrig: '2160K',
      fourHourPrice: '2160K',
      dayPriceOrig: '2360K',
      dayPrice: '2360K',
      image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Gò Vấp',
      status: 'available',
      plateNumber: '30L-111.11',
      rating: 4.9,
      badges: ['Xế xịn', 'Gặp chủ xe']
    },
    {
      id: 'lux-car-5',
      brand: 'KIA',
      model: 'CARNIVAL HEV 2025',
      seats: 7,
      transmission: 'Tự động',
      fuel: 'Xăng',
      pricePerDay: 3180000,
      fourHourPriceOrig: '2980K',
      fourHourPrice: '2980K',
      dayPriceOrig: '3180K',
      dayPrice: '3180K',
      image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=600&q=80',
      location: 'Quận Bình Tân',
      status: 'available',
      plateNumber: '51K-999.00',
      rating: 5.0,
      badges: ['Xế xịn', 'Gặp chủ xe']
    }
  ];

  const brandLogos = [
    { name: 'VinFast', path: 'M50 15 L85 15 L50 85 L15 15 Z' }, // interlocked silver V
    { name: 'Toyota', path: 'M50 15 C75 15 85 30 85 50 C85 70 75 85 50 85 C25 85 15 70 15 50 C15 30 25 15 50 15 Z' },
    { name: 'Mitsubishi', path: 'M50 10 L68 40 L50 70 L32 40 Z' }, // silver diamonds
    { name: 'Hyundai', path: 'M25 25 L35 25 L45 75 L35 75 Z' },
    { name: 'Kia', path: 'M20 20 L40 80 L60 20 L80 80' },
    { name: 'Honda', path: 'M15 15 L85 15 L85 85 L15 85 Z' },
    { name: 'Mazda', path: 'M50 10 C72 10 90 28 90 50 C90 72 72 90 50 90 C28 90 10 72 10 50 C10 28 28 10 50 10 Z' },
    { name: 'MG', path: 'M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z' },
    { name: 'Suzuki', path: 'M15 15 L85 15 L50 50 L85 85 L15 85 Z' }
  ];

  const featuredLocations = [
    { name: 'Hồ Chí Minh', count: '500+ xe', image: 'https://images.unsplash.com/photo-1508189860359-777d945909ef?auto=format&fit=crop&w=600&q=80' },
    { name: 'Bình Dương', count: '150+ xe', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80' },
    { name: 'Hà Nội', count: '150+ xe', image: 'https://images.unsplash.com/photo-1509060464153-4466739be82c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Đà Lạt', count: '100+ xe', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80' },
    { name: 'Đồng Nai', count: '100+ xe', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' }
  ];

  const customerReviews = [
    {
      id: 'rev-p-1',
      name: 'Anh Hòa',
      role: 'Cư dân Sala, Q2, Tp.HCM',
      comment: 'Anh thấy cách làm của các em ở ViVuCar rất tốt, chặt chẽ, khoa học, rõ ràng, công bằng, sòng phẳng nữa....',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-2',
      name: 'Anh Hải',
      role: 'Cư dân Park 7, Vinhomes Central Park',
      comment: 'Dịch vụ tốt. Hỗ trợ khách hàng tốt. Tôi rất yên tâm khi ký gửi phương tiện và thuê xe tại đây.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-3',
      name: 'Anh Nguyên',
      role: 'Thủ Đức, Tp. HCM',
      comment: 'Đặt xe nhanh. Hỗ trợ nhận xe tại nhà riêng tốt. Xe đẹp và sạch sẽ giống hệt như ảnh mô tả.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-4',
      name: 'Anh Khôi',
      role: 'Cư dân Sala, Q2, Tp.HCM',
      comment: 'Giá cả vô cùng hợp lý, thủ tục trực tuyến cực nhanh và thời gian nhận trả xe linh hoạt.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      rating: 5
    }
  ];

  const systemPolicies = [
    {
      title: "1. Hồ sơ thuê xe tự lái cần những gì?",
      content: "Để thuê xe tự lái tại ViVuCar, bạn cần hoàn thành xác thực KYC danh tính bao gồm: (1) Căn cước công dân (CCCD) và (2) Bằng lái xe hạng B1 trở lên còn thời hạn. CSKH sẽ phê duyệt hồ sơ của bạn trong vòng tối đa 30 phút."
    },
    {
      title: "2. Quy định đặt cọc bảo đảm là như thế nào?",
      content: "Tất cả các chuyến đi tại ViVuCar đều áp dụng tiền đặt cọc cố định là 5.000.000 VND. Tiền cọc được thanh toán trực tuyến cùng phí thuê qua cổng VietQR động. Khoản tiền cọc này được giữ bảo đảm và sẽ được phê duyệt hoàn trả 100% vào Ví điện tử cá nhân của bạn ngay sau khi trả xe hoàn tất mà không phát sinh sự cố hỏng hóc hay vi phạm giao thông."
    },
    {
      title: "3. Chính sách hủy chuyến và hoàn trả tiền",
      content: "Bạn có thể hủy chuyến đi miễn phí bất cứ lúc nào trước thời điểm nhận xe dự kiến 24 tiếng. Tiền cọc và tiền thuê xe sẽ được hoàn trả lập tức vào Ví cá nhân. Hủy chuyến trong vòng 24 tiếng so với giờ khởi hành sẽ chịu mức phí dịch vụ 15% tổng tiền thuê làm phí đền bù cho chủ xe nhàn rỗi."
    },
    {
      title: "4. Bảo hiểm chuyến đi và xử lý sự cố khẩn cấp",
      content: "Tất cả phương tiện trên chợ thuê xe của ViVuCar đều được tích hợp gói bảo hiểm chuyến đi trọn gói giúp giới hạn thiệt hại vật chất tối đa là 5.000.000 VND trong trường hợp va chạm ngoài ý muốn. Nếu gặp sự cố va quẹt hay xịt lốp dọc đường, bạn chỉ cần bấm nút 'Báo Cáo Sự Cố' khẩn cấp trong mục chuyến đi, CSKH và cứu hộ sẽ hỗ trợ lập tức."
    }
  ];

  return (
    <div className="rent-car-page">
      {/* 📢 SYSTEM NOTICE BANNER */}
      {systemConfig && systemConfig.systemNotice && (
        <div className="system-notice-alert-wrapper">
          <div className="system-notice-alert">
            <div className="alert-glow-dot"></div>
            <Info size={16} className="text-primary-teal flex-shrink-0" />
            <div className="alert-msg-container">
              <strong>Thông báo hệ thống:</strong> {systemConfig.systemNotice}
            </div>
          </div>
        </div>
      )}

      {/*  ViVuCar BRANDED HERO SECTION */}
      <section className="vivu-hero">
        {/* Thẻ video nền */}
        <video className="hero-video-bg" autoPlay loop muted playsInline>
          <source src="/home_banner.mp4" type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ video HTML5.
        </video>

        {/* Lớp phủ tối giúp chữ dễ đọc hơn */}
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-badge">🚗 NỀN TẢNG THUÊ XE TỰ LÁI & KÝ GỬI THẾ HỆ MỚI</span>
          <h1 className="hero-title">Thuê xe tự lái ngắn hạn & ký gửi xe</h1>
          <p className="hero-subtitle">
            Trải nghiệm dịch vụ chia sẻ ô tô công nghệ hàng đầu Việt Nam. Thủ tục đơn giản, xe đời mới sạch sẽ, bảo hiểm chuyến đi trọn gói.
          </p>
        </div>

        {/* --- ViVuCar FORM TÌM XE --- */}
        <div className="search-widget-wrapper">
          <div className="search-tabs">
            <button
              type="button"
              className={`search-tab-btn ${searchTab === 'self-drive' ? 'active' : ''}`}
              onClick={() => setSearchTab('self-drive')}
            >
              Thuê xe tự lái
            </button>
            <button
              type="button"
              className={`search-tab-btn ${searchTab === 'monthly' ? 'active' : ''}`}
              onClick={() => {
                setSearchTab('monthly');
                showToast('Tính năng Thuê xe theo tháng đang được tích hợp!', 'info');
              }}
            >
              Thuê xe theo tháng
            </button>
          </div>

          <div className="search-widget-light">
            <form onSubmit={handleSearchSubmit} className="search-form-grid">

              {/* FIELD 1: Địa điểm */}
              <div className="search-input-box">
                <label className="search-lbl">
                  <MapPin size={14} className="lbl-icon" />
                  <span>Địa điểm nhận xe</span>
                </label>
                <div className="input-relative-container">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="search-select-borderless"
                  >
                    <option value="">Tất cả địa điểm</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                  </select>
                  <ChevronDown size={13} className="borderless-select-arrow" />
                </div>
              </div>

              {/* FIELD 2: Ngày nhận */}
              <div className="search-input-box">
                <label className="search-lbl">
                  <Calendar size={14} className="lbl-icon" />
                  <span>Ngày nhận xe</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="search-date-input-borderless"
                  required
                />
              </div>

              {/* FIELD 3: Giờ nhận */}
              <div className="search-input-box">
                <label className="search-lbl">
                  <Clock size={14} className="lbl-icon" />
                  <span>Giờ nhận xe</span>
                </label>
                <div className="input-relative-container">
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="search-select-borderless"
                  >
                    <option value="08:00">08:00</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="10:30">10:30</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                  </select>
                  <ChevronDown size={13} className="borderless-select-arrow" />
                </div>
              </div>

              {/* FIELD 4: Ngày trả */}
              <div className="search-input-box">
                <label className="search-lbl">
                  <Calendar size={14} className="lbl-icon" />
                  <span>Ngày trả xe</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="search-date-input-borderless"
                  required
                />
              </div>

              {/* FIELD 5: Giờ trả */}
              <div className="search-input-box">
                <label className="search-lbl">
                  <Clock size={14} className="lbl-icon" />
                  <span>Giờ trả xe</span>
                </label>
                <div className="input-relative-container">
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="search-select-borderless"
                  >
                    <option value="08:00">08:00</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="12:00">12:00</option>
                    <option value="14:00">14:00</option>
                    <option value="17:00">17:00</option>
                  </select>
                  <ChevronDown size={13} className="borderless-select-arrow" />
                </div>
              </div>

              {/* BUTTON SUBMIT */}
              <div className="search-submit-box">
                <button type="submit" className="search-btn-submit-premium">
                  <span>TÌM XE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 📊 PRIMARY CATALOG LIVE SEARCH SECTION */}
      <div className="catalog-container" id="catalog-live-section">
        {/* Toggle Filters bar */}
        <div className="catalog-header-actions">
          <h2 className="section-title-black">Xe có ngay</h2>
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
          <>
            <div className="carousel-outer-wrapper">
              <button className="carousel-nav-arrow left" onClick={() => scrollContainer(catalogScrollRef, 'left')}>
                <ChevronLeft size={20} />
              </button>

              <div className="premium-car-row-scrollable" ref={catalogScrollRef}>
                {cars.map((car) => {
                  //Các gtri hiển thị động dựa trên daily_price
                  const fourHourOrig = Math.round((car.pricePerDay * 0.45) / 1000) + 'K';
                  const fourHourActual = Math.round((car.pricePerDay * 0.38) / 1000) + 'K';
                  const dayPriceOrig = Math.round((car.pricePerDay * 1.1) / 1000) + 'K';
                  const dayPriceActual = Math.round(car.pricePerDay / 1000) + 'K';

                  return (
                    <div key={car.id} className="premium-row-car-card" onClick={() => handleViewCarDetails(car)}>
                      {/* Container Ảnh xe */}
                      <div className="card-image-box">
                        <img src={car.image} alt={car.model} className="card-image-element" />
                        {/* Nhãn khuyến mãi góc trên bên trái */}
                        <div className="card-badge-top-container" style={{ display: 'flex', gap: '4px' }}>
                          {car.pricePerDay > 1000000 && (
                            <span className="promo-badge-glow-red">⚡ Flash Sale</span>
                          )}
                          <span className="promo-badge-glow-yellow">🏷️ Giảm 10%</span>
                        </div>

                        {/* Nhãn nhận xe ở góc dưới */}
                        <div className="card-badge-bottom-container">
                          {!car.ownerId ? (
                            <span className="info-badge-deliver">📱 Tự nhận xe</span>
                          ) : (
                            <span className="info-badge-owner">🔑 Gặp chủ xe</span>
                          )}
                        </div>
                      </div>

                      {/* Nội dung chi tiết xe */}
                      <div className="card-body-content-premium">
                        <h3 className="card-title-main-premium">{car.brand.toUpperCase()} {car.model}</h3>
                        <p className="card-location-subtext">Quận {car.location.replace('Quận ', '')}</p>
                        {/* Hộp hiển thị giá kép (4h & 24h) giống Ảnh 2 */}
                        <div className="double-pricing-spec-grid">
                          <div className="pricing-line-item">
                            <span className="price-label-small" style={{ textDecoration: 'line-through' }}>{fourHourOrig}</span>
                            <span className="price-actual-green">{fourHourActual}</span>
                            <span className="price-unit-gray">/4h</span>
                          </div>
                          <div className="pricing-line-item">
                            <span className="price-label-small" style={{ textDecoration: 'line-through' }}>{dayPriceOrig}</span>
                            <span className="price-actual-green">{dayPriceActual}</span>
                            <span className="price-unit-gray">/24h</span>
                          </div>
                        </div>

                        {/* Thanh biểu tượng thông số xe */}
                        <div className="card-flat-specs-row">
                          <div className="flat-spec-unit" title="Số chỗ">
                            <Users size={13} className="flat-spec-icon" />
                            <span>{car.seats}</span>
                          </div>
                          <div className="flat-spec-unit" title="Hộp số">
                            <SlidersHorizontal size={13} className="flat-spec-icon" />
                            <span>{car.transmission}</span>
                          </div>
                          <div className="flat-spec-unit" title="Nhiên liệu">
                            <Fuel size={13} className="flat-spec-icon" />
                            <span>{car.fuel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="carousel-nav-arrow right" onClick={() => scrollContainer(catalogScrollRef, 'right')}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', width: '100%' }}>
              <button className="btn-xem-them" onClick={() => setCurrentTab('find-car')}>
                Xem thêm
              </button>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🚀 NEW SECTION 3: XẾ XỊN - XE SANG - XE CAO CẤP */}
      <section className="rich-section-carousel-cars">
        <div className="rich-section-inner">
          <h2 className="rich-section-title-center">Xế xịn - Xe sang - Xe Cao cấp</h2>

          <div className="carousel-outer-wrapper">
            <button className="carousel-nav-arrow left" onClick={() => scrollContainer(luxuryScrollRef, 'left')}>
              <ChevronLeft size={20} />
            </button>

            <div className="premium-car-row-scrollable" ref={luxuryScrollRef}>
              {(() => {
                const dbLuxuryCars = cars.filter(c => c.pricePerDay >= 1500000);
                const listToRender = dbLuxuryCars.length > 0 ? dbLuxuryCars : luxuryCars;

                return listToRender.map((car) => {
                  const isDbCar = !String(car.id).startsWith('lux-car-');

                  // Compute dynamic pricing or use mock values
                  const fourHourOrig = isDbCar ? Math.round((car.pricePerDay * 0.55) / 1000) + 'K' : car.fourHourPriceOrig;
                  const fourHourActual = isDbCar ? Math.round((car.pricePerDay * 0.50) / 1000) + 'K' : car.fourHourPrice;
                  const dayPriceOrig = isDbCar ? Math.round((car.pricePerDay * 1.1) / 1000) + 'K' : car.dayPriceOrig;
                  const dayPriceActual = isDbCar ? Math.round(car.pricePerDay / 1000) + 'K' : car.dayPrice;

                  return (
                    <div key={car.id} className="premium-row-car-card" onClick={() => handleViewCarDetails(car)}>
                      {/* Image Container */}
                      <div className="card-image-box">
                        <img src={car.image} alt={car.model} className="card-image-element" />

                        {/* Top badges */}
                        <div className="card-badge-top-container">
                          <span className="promo-badge-glow-yellow">👑 Xế xịn</span>
                        </div>

                        {/* Bottom badge */}
                        <div className="card-badge-bottom-container">
                          {isDbCar ? (
                            !car.ownerId ? (
                              <span className="info-badge-deliver">📱 Tự nhận xe</span>
                            ) : (
                              <span className="info-badge-owner">🔑 Gặp chủ xe</span>
                            )
                          ) : (
                            car.id === 'lux-car-1' ? (
                              <span className="info-badge-deliver">📱 Tự nhận xe</span>
                            ) : (
                              <span className="info-badge-owner">🔑 Gặp chủ xe</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="card-body-content-premium">
                        <h3 className="card-title-main-premium">{car.brand.toUpperCase()} {car.model}</h3>
                        <p className="card-location-subtext">
                          {isDbCar ? `Quận ${car.location.replace('Quận ', '')}` : car.location}
                        </p>

                        {/* Double pricing row */}
                        <div className="double-pricing-spec-grid">
                          <div className="pricing-line-item">
                            <span className="price-label-small" style={{ textDecoration: 'line-through' }}>{fourHourOrig}</span>
                            <span className="price-actual-green">{fourHourActual}</span>
                            <span className="price-unit-gray">/4h</span>
                          </div>
                          <div className="pricing-line-item">
                            <span className="price-label-small" style={{ textDecoration: 'line-through' }}>{dayPriceOrig}</span>
                            <span className="price-actual-green">{dayPriceActual}</span>
                            <span className="price-unit-gray">/24h</span>
                          </div>
                        </div>

                        {/* Specs Icons */}
                        <div className="card-flat-specs-row">
                          <div className="flat-spec-unit">
                            <Users size={13} className="flat-spec-icon" />
                            <span>{car.seats}</span>
                          </div>
                          <div className="flat-spec-unit">
                            <SlidersHorizontal size={13} className="flat-spec-icon" />
                            <span>{car.transmission || 'Số tự động'}</span>
                          </div>
                          <div className="flat-spec-unit">
                            <Fuel size={13} className="flat-spec-icon" />
                            <span>{car.fuel || 'Xăng'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button className="carousel-nav-arrow right" onClick={() => scrollContainer(luxuryScrollRef, 'right')}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 🚀 NEW SECTION 1: CHỌN XE THEO HÃNG (BRAND SELECTOR) */}
      <section className="rich-section-brand-selector">
        <div className="rich-section-inner">
          <h2 className="rich-section-title-center">Chọn xe theo hãng</h2>

          <div className="carousel-outer-wrapper">
            <button className="carousel-nav-arrow left" onClick={() => scrollContainer(brandScrollRef, 'left')}>
              <ChevronLeft size={20} />
            </button>

            <div className="brand-logo-scroll-row" ref={brandScrollRef}>
              {brandLogos.map((brand, index) => (
                <div
                  key={index}
                  className={`brand-logo-card ${searchKeyword.toLowerCase() === brand.name.toLowerCase() ? 'active' : ''}`}
                  onClick={() => handleBrandClick(brand.name)}
                >
                  <div className="brand-logo-svg-wrapper">
                    <svg viewBox="0 0 100 100" className="brand-inline-svg" width="44" height="44">
                      {brand.name === 'VinFast' && (
                        <path d="M10,20 L35,20 L50,56 L65,20 L90,20 L50,84 Z" fill="currentColor" />
                      )}
                      {brand.name === 'Toyota' && (
                        <>
                          <ellipse cx="50" cy="50" rx="45" ry="30" fill="none" stroke="currentColor" strokeWidth="6" />
                          <ellipse cx="50" cy="50" rx="14" ry="24" fill="none" stroke="currentColor" strokeWidth="6" />
                          <ellipse cx="50" cy="40" rx="30" ry="16" fill="none" stroke="currentColor" strokeWidth="6" />
                        </>
                      )}
                      {brand.name === 'Mitsubishi' && (
                        <>
                          <polygon points="50,50 64,26 50,2 36,26" fill="#e60012" />
                          <polygon points="50,50 78,50 92,74 64,74" fill="#e60012" />
                          <polygon points="50,50 36,74 8,74 22,50" fill="#e60012" />
                        </>
                      )}
                      {brand.name === 'Hyundai' && (
                        <>
                          <ellipse cx="50" cy="50" rx="44" ry="28" fill="none" stroke="currentColor" strokeWidth="6" transform="rotate(-15 50 50)" />
                          <path d="M35,32 L45,68 M55,32 L65,68 M38,50 C46,48 54,48 62,50" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                        </>
                      )}
                      {brand.name === 'Kia' && (
                        <path d="M18,70 L30,30 L42,70 L54,30 L54,70 L66,30 L78,70" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="miter" />
                      )}
                      {brand.name === 'Honda' && (
                        <>
                          <rect x="12" y="12" width="76" height="76" rx="18" fill="none" stroke="currentColor" strokeWidth="5" />
                          <path d="M28,24 L34,76 M72,24 L66,76 M31,50 L69,50" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                        </>
                      )}
                      {brand.name === 'Mazda' && (
                        <>
                          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="5" />
                          <path d="M18,44 C32,64 68,64 82,44 C65,50 50,30 50,30 C50,30 35,50 18,44 Z" fill="currentColor" />
                        </>
                      )}
                      {brand.name === 'MG' && (
                        <>
                          <polygon points="50,12 77,23 88,50 77,77 50,88 23,77 12,50 23,23" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
                          <text x="50" y="59" textAnchor="middle" fill="currentColor" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="28" letterSpacing="-1">MG</text>
                        </>
                      )}
                      {brand.name === 'Suzuki' && (
                        <path d="M28,15 H72 L42,48 L72,81 H28 L58,48 Z" fill="#e60012" />
                      )}
                    </svg>
                  </div>
                  <span className="brand-name-lbl">{brand.name}</span>
                </div>
              ))}
            </div>

            <button className="carousel-nav-arrow right" onClick={() => scrollContainer(brandScrollRef, 'right')}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 🚀 NEW SECTION 4: ĐỊA ĐIỂM NỔI BẬT (FEATURED LOCATIONS GRID & MAP PROMO) */}
      <section className="rich-section-featured-locations bg-light-white">
        <div className="rich-section-inner">
          <h2 className="rich-section-title-center">Địa điểm nổi bật</h2>

          <div className="carousel-outer-wrapper">
            <button className="carousel-nav-arrow left" onClick={() => scrollContainer(locationsScrollRef, 'left')}>
              <ChevronLeft size={20} />
            </button>

            <div className="locations-scroll-row" ref={locationsScrollRef}>
              {featuredLocations.map((loc, idx) => (
                <div key={idx} className="location-grid-card">
                  <div className="location-img-wrapper">
                    <img src={loc.image} alt={loc.name} className="location-img-element" />
                    <div className="location-img-overlay"></div>
                  </div>
                  <div className="location-card-content-overlay">
                    <h3 className="location-card-name">{loc.name}</h3>
                    <p className="location-card-car-count">{loc.count}</p>
                    <button
                      type="button"
                      className="btn-location-search-active"
                      onClick={() => handleLocationClick(loc.name)}
                    >
                      TÌM XE
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="carousel-nav-arrow right" onClick={() => scrollContainer(locationsScrollRef, 'right')}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Miniature Cars decorative CTA row matching the screenshot */}
          <div className="mini-cars-banner-cta-container">
            <div className="decorative-cars-pattern-box">
              {/* Rows of tiny modern flat styled cars */}
              <div className="mini-cars-track row-1">
                {[...Array(24)].map((_, i) => (
                  <span key={i} className={`mini-car-dot color-${(i % 5) + 1}`}>🚗</span>
                ))}
              </div>
              <div className="mini-cars-track row-2">
                {[...Array(24)].map((_, i) => (
                  <span key={i} className={`mini-car-dot color-${((i + 2) % 5) + 1}`}>🚗</span>
                ))}
              </div>
            </div>

            <div className="mini-cars-cta-content">
              <h3 className="mini-cars-cta-title">1000+ xe và hơn thế nữa</h3>
              <p className="mini-cars-cta-subtitle">Hãy trải nghiệm hôm nay!</p>
              <button
                className="btn-mini-cars-search"
                onClick={() => {
                  const catalogElem = document.getElementById('catalog-live-section');
                  if (catalogElem) catalogElem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                TÌM XE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 🚀 NEW SECTION 5: 3 BƯỚC ĐẶT XE DỄ DÀNG */}
      <section className="rich-section-steps-banner">
        <div className="rich-section-inner">
          <div className="steps-banner-card-glass">
            <div className="steps-banner-image-background-overlay"></div>

            <h2 className="steps-banner-main-title">3 Bước đặt xe dễ dàng</h2>

            <div className="steps-grid-items">
              {/* Step 1 */}
              <div className="step-card-unit">
                <div className="step-icon-round-teal-container">
                  <div className="step-icon-inner-box">
                    <svg viewBox="0 0 100 100" width="40" height="40" fill="none" stroke="#009698" strokeWidth="5">
                      <rect x="20" y="20" width="60" height="45" rx="4" />
                      <path d="M15 75 L85 75 M35 75 L35 65 M65 75 L65 65" />
                      <circle cx="50" cy="42" r="10" />
                    </svg>
                  </div>
                </div>
                <h4 className="step-unit-text">
                  <span className="step-number-bold">1. </span>
                  Chọn và giữ chỗ với hàng trăm xe tại vivucar.vn
                </h4>
              </div>

              {/* Step 2 */}
              <div className="step-card-unit">
                <div className="step-icon-round-teal-container">
                  <div className="step-icon-inner-box">
                    <svg viewBox="0 0 100 100" width="40" height="40" fill="none" stroke="#009698" strokeWidth="5">
                      <rect x="30" y="15" width="40" height="70" rx="10" />
                      <circle cx="50" cy="75" r="5" fill="#009698" />
                      <path d="M30 65 L70 65 M40 25 L60 25" />
                    </svg>
                  </div>
                </div>
                <h4 className="step-unit-text">
                  <span className="step-number-bold">2. </span>
                  Thủ tục qua app nhanh gọn
                </h4>
              </div>

              {/* Step 3 */}
              <div className="step-card-unit">
                <div className="step-icon-round-teal-container">
                  <div className="step-icon-inner-box">
                    <svg viewBox="0 0 100 100" width="40" height="40" fill="none" stroke="#009698" strokeWidth="5">
                      <circle cx="50" cy="50" r="30" />
                      <path d="M50 20 L50 50 L70 50" strokeLinecap="round" />
                      <path d="M20 50 L10 50 M90 50 L80 50 M50 20 L50 10 M50 90 L50 80" />
                    </svg>
                  </div>
                </div>
                <h4 className="step-unit-text">
                  <span className="step-number-bold">3. </span>
                  Chủ động nhận xe mọi lúc mọi nơi
                </h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 🚀 NEW SECTION 6: ĐÁNH GIÁ KHÁCH HÀNG (CUSTOMER REVIEWS SLIDER) */}
      <section className="rich-section-customer-reviews">
        <div className="rich-section-inner">
          <h2 className="rich-section-title-center">Đánh giá khách hàng</h2>

          <div className="carousel-outer-wrapper">
            <button className="carousel-nav-arrow left" onClick={() => scrollContainer(reviewsScrollRef, 'left')}>
              <ChevronLeft size={20} />
            </button>

            <div className="reviews-scroll-row" ref={reviewsScrollRef}>
              {customerReviews.map((rev) => (
                <div key={rev.id} className="review-card-unit">
                  <div className="review-stars-row">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={15} fill="#fbbf24" color="#fbbf24" />
                    ))}
                  </div>
                  <p className="review-card-comment">"{rev.comment}"</p>

                  <div className="review-user-footer">
                    <img src={rev.avatar} alt={rev.name} className="review-avatar-img" />
                    <div className="review-user-meta">
                      <span className="review-user-name">{rev.name}</span>
                      <span className="review-user-role">{rev.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="carousel-nav-arrow right" onClick={() => scrollContainer(reviewsScrollRef, 'right')}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* 📚 CHÍNH SÁCH VÀ QUY ĐỊNH HƯỚNG DẪN */}
      <div className="policies-collapsible-section mt-12">
        <div className="section-header-cskh" style={{ textAlign: 'left', marginBottom: '24px' }}>
          <h3 className="section-title-faq" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HelpCircle className="text-primary-teal" size={24} />
            <span>Chính Sách & Quy Định Thuê Xe (FAQ)</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: 4 }}>
            Tìm hiểu các hướng dẫn thủ tục, quy chế đặt cọc bảo đảm, chính sách hoàn hủy của nền tảng ViVuCar.
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

      {/* --- CAR DETAILS & CUSTOMER REVIEWS LIGHTBOX POPUP --- */}
      {
        selectedCarDetails && (
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
                        <strong className="spec-val" style={{ color: '#009698' }}>{selectedCarDetails.plateNumber}</strong>
                      </div>
                    )}
                  </div>

                  <div className="popup-description-block mt-4">
                    <h5 className="block-title">Đặc Điểm & Điều Khoản Thuê Xe</h5>
                    <p className="block-desc">
                      Mẫu xe {selectedCarDetails.brand} {selectedCarDetails.model} đời mới sạch sẽ, động cơ êm ái, trang bị camera hành trình, cảm biến lùi, màn hình giải trí và bản đồ GPS đầy đủ. Xe được vệ sinh và khử khuẩn trước mỗi hành trình giao khách. Khách hàng vui lòng xuất trình Bằng lái xe và hoàn tất đặt cọc bảo đảm 5.000.000 VND trước khi khởi hành chuyến đi.
                    </p>
                  </div>

                  {/* 🌟 CUSTOMER REVIEWS TAB */}
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
                                    color={i < rev.rating ? "#fbbf24" : "#cbd5e1"}
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
        )
      }

      {/* --- ViVuCar DETAILED FOOTER SECTION --- */}
      <footer className="vivu-footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Column 1: Contact */}
            <div className="footer-col">
              <h4 className="footer-col-title">Contact</h4>
              <ul className="footer-contact-list">
                <li>
                  <span className="contact-icon-wrapper">📍</span>
                  <span className="contact-text">Tổng S5 quận nón vọt Benton</span>
                </li>
                <li>
                  <span className="contact-icon-wrapper">📞</span>
                  <span className="contact-text">08127 121 796</span>
                </li>
                <li>
                  <span className="contact-icon-wrapper">✉️</span>
                  <span className="contact-text">vivucar@com.vn</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Policies */}
            <div className="footer-col">
              <h4 className="footer-col-title">Policy or link</h4>
              <ul className="footer-links-list">
                <li><a href="#privacy" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang chính sách...', 'info'); }}>Privacy policy</a></li>
                <li><a href="#terms" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang điều khoản...', 'info'); }}>Termos use policy</a></li>
                <li><a href="#general" onClick={(e) => { e.preventDefault(); showToast('Đang tải điều khoản chung...', 'info'); }}>Cenerate closhing</a></li>
                <li><a href="#release" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang phát hành...', 'info'); }}>Terms on awt relensen policy</a></li>
              </ul>
            </div>

            {/* Column 3: Social & Verified Badge */}
            <div className="footer-col footer-col-right">
              <div className="social-icons-wrapper">
                <a href="#fb" className="social-btn" onClick={(e) => e.preventDefault()}><Facebook size={18} /></a>
                <a href="#ig" className="social-btn" onClick={(e) => e.preventDefault()}><Instagram size={18} /></a>
                <a href="#tw" className="social-btn" onClick={(e) => e.preventDefault()}><Twitter size={18} /></a>
                <a href="#yt" className="social-btn" onClick={(e) => e.preventDefault()}><Youtube size={18} /></a>
              </div>

              {/* Styled Ministry of Industry & Trade Badge */}
              <div className="verified-badge-container">
                <div className="bocongthuong-badge">
                  <svg viewBox="0 0 120 45" className="bct-logo-svg" width="120" height="45">
                    <rect width="120" height="45" rx="6" fill="#005bac" />
                    <circle cx="24" cy="22" r="16" fill="white" />
                    <path d="M24 10 L28 19 L38 19 L30 25 L33 34 L24 28 L15 34 L18 25 L10 19 L20 19 Z" fill="#ef4444" />
                    <text x="46" y="20" fill="white" fontSize="10" fontWeight="800" fontFamily="sans-serif">ĐÃ ĐĂNG KÝ</text>
                    <text x="46" y="32" fill="#ef4444" fontSize="8" fontWeight="800" fontFamily="sans-serif">BỘ CÔNG THƯƠNG</text>
                    <circle cx="24" cy="22" r="14" fill="none" stroke="#ef4444" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="copyright-text">Copyright © 2022 Bon Bo Cong Thuong</p>
          </div>
        </div>
      </footer>
    </div >
  );
};
