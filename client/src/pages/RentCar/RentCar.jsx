import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Clock, SlidersHorizontal, Users, Fuel, Shield, CheckCircle, Info, Star, HelpCircle, X, ChevronDown, MessageSquare, Facebook, Instagram, Twitter, Youtube, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './RentCar.css';

export const RentCar = ({ user, onRentCarClick, setCurrentTab, onSearch }) => {
  const [cars, setCars] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [location, setLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [searchTab, setSearchTab] = useState('self-drive'); // self-drive, monthly

  const TIME_OPTIONS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

  // Filters state
  const [seats, setSeats] = useState('');
  const [transmission, setTransmission] = useState('');
  const [fuel, setFuel] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // System config & policies notice
  const [systemConfig, setSystemConfig] = useState(null);
  const [showSystemNotice, setShowSystemNotice] = useState(true);

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
      if (Object.keys(filters).length === 0) {
        setAllCars(data);
      }
    } catch (error) {
      console.error('Lỗi chi tiết khi lấy danh sách xe:', error);
      showToast('Không thể lấy danh sách xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCarCount = (locName) => {
    if (!allCars || allCars.length === 0) return 0;
    const nameLower = locName.toLowerCase();
    
    return allCars.filter(car => {
      const carLoc = (car.location || '').toLowerCase();
      
      if (nameLower === 'hồ chí minh') {
        const notHCMC = ['hà nội', 'ha noi', 'bình dương', 'binh duong', 'đà lạt', 'da lat', 'đồng nai', 'dong nai', 'đà nẵng', 'da nang'];
        return (carLoc.includes('hồ chí minh') || carLoc.includes('hcm') || carLoc.includes('quận') || carLoc.includes('thủ đức') || carLoc.includes('sala')) && !notHCMC.some(city => carLoc.includes(city));
      }
      
      if (nameLower === 'hà nội') {
        return carLoc.includes('hà nội') || carLoc.includes('ha noi');
      }
      
      if (nameLower === 'đà nẵng') {
        return carLoc.includes('đà nẵng') || carLoc.includes('da nang');
      }
      
      if (nameLower === 'đà lạt') {
        return carLoc.includes('đà lạt') || carLoc.includes('da lat');
      }
      
      if (nameLower === 'đồng nai') {
        return carLoc.includes('đồng nai') || carLoc.includes('dong nai');
      }
      
      return carLoc.includes(nameLower);
    }).length;
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

    const timer = setTimeout(() => {
      setShowSystemNotice(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pickupDate && pickupTime && returnDate && returnTime) {
      const start = new Date(`${pickupDate}T${pickupTime}:00`);
      const end = new Date(`${returnDate}T${returnTime}:00`);
      const minEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours min
      if (end < minEnd) {
        const localMinEnd = new Date(minEnd.getTime() - minEnd.getTimezoneOffset() * 60000);
        setReturnDate(localMinEnd.toISOString().split('T')[0]);
        const newTime = `${minEnd.getHours().toString().padStart(2, '0')}:00`;
        setReturnTime(TIME_OPTIONS.includes(newTime) ? newTime : "22:00");
      }
    }
  }, [pickupDate, pickupTime, returnDate, returnTime]);

  const isReturnTimeDisabled = (time) => {
    if (!pickupDate || !pickupTime || !returnDate) return false;
    const start = new Date(`${pickupDate}T${pickupTime}:00`);
    const endOption = new Date(`${returnDate}T${time}:00`);
    const minEnd = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    return endOption < minEnd;
  };

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
      pickupTime,
      returnTime,
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
    { name: 'Hồ Chí Minh', count: '500+ xe', image: 'https://media.vietnamarchi.vn/upload/userfiles/images/255/to-van-truong/tphcm-du-co-vi-tri-gan-bien-thanh-pho-van-chua-khai-thac-triet-de-loi-the-nay.jpg' },
    { name: 'Đà Nẵng', count: '150+ xe', image: 'https://danangfantasticity.com/wp-content/uploads/2018/10/cau-rong-top-20-cay-cau-ky-quai-nhat-the-gioi-theo-boredom-therapy-02.jpg' },
    { name: 'Hà Nội', count: '150+ xe', image: 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=600&q=80' }
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
      comment: 'Dịch vụ tốt. Hỗ trợ khách hàng tốt. Tôi rất yên tâm khi đăng ký cho thuê xe và thuê xe tại đây.',
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
    },
    {
      id: 'rev-p-5',
      name: 'Chị Lan',
      role: 'Quận 7, Tp. HCM',
      comment: 'Xe chạy rất êm, dịch vụ chuyên nghiệp. Giao xe đúng giờ hẹn và hỗ trợ nhiệt tình.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-6',
      name: 'Anh Dũng',
      role: 'Hoàn Kiếm, Hà Nội',
      comment: 'Thủ tục nhanh gọn lẹ, xe sạch sẽ thơm tho. Rất thích phong cách phục vụ của các bạn.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-7',
      name: 'Chị Mai',
      role: 'Hải Châu, Đà Nẵng',
      comment: 'Trải nghiệm tuyệt vời! Giá thuê xe hợp lý, không phát sinh chi phí ẩn. Sẽ tiếp tục ủng hộ.',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-8',
      name: 'Anh Tuấn',
      role: 'Thanh Xuân, Hà Nội',
      comment: 'Lần đầu tiên thuê xe ở đây nhưng cực kỳ hài lòng. Ứng dụng mượt mà, dễ thao tác.',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-9',
      name: 'Chị Thảo',
      role: 'Bình Thạnh, Tp. HCM',
      comment: 'Hệ thống hỗ trợ 24/7 nhiệt tình, giải đáp nhanh mọi thắc mắc. Xe đời mới lái cực đã.',
      avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-10',
      name: 'Anh Minh',
      role: 'Ninh Kiều, Cần Thơ',
      comment: 'Dịch vụ giao xe tận nhà rất tiện lợi. Nhân viên thân thiện, hướng dẫn kỹ càng cách sử dụng.',
      avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-11',
      name: 'Chị Vy',
      role: 'Liên Chiểu, Đà Nẵng',
      comment: 'Quy trình nhận xe rất nhanh chóng, xe được bảo dưỡng định kỳ nên đi rất an tâm.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-12',
      name: 'Anh Nam',
      role: 'Đồng Nai',
      comment: 'Hỗ trợ đổi xe nhanh chóng khi tôi có thay đổi kế hoạch. Chăm sóc khách hàng điểm 10.',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-13',
      name: 'Chị Hạnh',
      role: 'Thủ Dầu Một, Bình Dương',
      comment: 'Giá cả cạnh tranh so với các dịch vụ truyền thống khác. Đặt xe qua app siêu tiện lợi.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      rating: 5
    },
    {
      id: 'rev-p-14',
      name: 'Anh Phong',
      role: 'Đống Đa, Hà Nội',
      comment: 'Rất ưng ý với chất lượng xe và dịch vụ chăm sóc khách hàng ở đây. Sẽ giới thiệu cho bạn bè.',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
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
      {showSystemNotice && systemConfig && systemConfig.systemNotice && (!user || (user.role !== 'renter' && user.role !== 'owner')) && (
        <div className="homepage-notice-container">
          <div className="system-notice-alert-wrapper">
            <div className="system-notice-alert">
              <div className="alert-glow-dot"></div>
              <Info size={16} className="text-primary-teal flex-shrink-0" />
              <div className="alert-msg-container">
                <strong>Thông báo hệ thống:</strong> {systemConfig.systemNotice}
              </div>
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
          {/* <span className="hero-badge">🚗 NỀN TẢNG THUÊ XE TỰ LÁI & ĐĂNG KÝ CHO THUÊ THẾ HỆ MỚI</span> */}
          <h1 className="hero-title">Thuê xe tự lái ngắn hạn & Đăng ký cho thuê</h1>
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
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                  value={pickupDate}
                  onChange={(e) => {
                    const newPickup = e.target.value;
                    setPickupDate(newPickup);
                    if (new Date(`${newPickup}T${pickupTime}:00`) >= new Date(`${returnDate}T${returnTime}:00`)) {
                      const tomorrow = new Date(`${newPickup}T${pickupTime}:00`);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setReturnDate(tomorrow.toISOString().split('T')[0]);
                    }
                  }}
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
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
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
                  min={pickupDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
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
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time} disabled={isReturnTimeDisabled(time)}>{time}</option>
                    ))}
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


            <div className="locations-scroll-row" ref={locationsScrollRef}>
              {featuredLocations.map((loc, idx) => (
                <div key={idx} className="location-grid-card">
                  <div className="location-img-wrapper">
                    <img src={loc.image} alt={loc.name} className="location-img-element" />
                    <div className="location-img-overlay"></div>
                  </div>
                  <div className="location-card-content-overlay">
                    <h3 className="location-card-name">{loc.name}</h3>
                    <p className="location-card-car-count">{getCarCount(loc.name)} xe</p>
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
                <h3 className="section-title">Chi tiết xe</h3>
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

                  {/* Terms & Additional Costs Block - UPDATED */}
                  <div className="popup-terms-block mt-4">
                    <h5 className="block-title">Quy định thuê xe</h5>
                    <ul className="terms-list" style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                      <li>
                        Sử dụng xe đúng mục đích.
                      </li>
                      <li>
                        Không sử dụng xe vào mục đích phi pháp, trái pháp luật.
                      </li>
                      <li>
                        Không sử dụng xe để cầm cố, thế chấp.
                      </li>
                      <li>
                        Không hút thuốc, nhả kẹo cao su, xả rác trong xe.
                      </li>
                      <li>
                        Không chở hàng cấm, hàng dễ cháy nổ, hoặc trái cây, thực phẩm nặng mùi trong xe.
                      </li>
                      <li>Khi trả xe, nếu có vết bẩn hoặc mùi khó chịu, khách hàng sẽ chịu chi phí vệ sinh xe.</li>
                      <li>Giới hạn quãng đường: 400km/24h (tương ứng 250km/4h, 300km/8h, 350km/12h).</li>
                    </ul>
                    <p style={{ marginTop: '16px', fontStyle: 'italic', fontSize: '13px', color: '#475569', textAlign: 'center' }}>
                      Trân trọng cảm ơn và chúc quý khách có những trải nghiệm tuyệt vời!
                    </p>
                  </div>

                  {/* Cancellation Policy Table - MOVED HERE */}
                  <div className="cancellation-policy-table-container mt-6">
                    <h5 className="block-title">Chính Sách Hủy Chuyến & Hoàn Cọc</h5>
                    <table className="policy-table-popup">
                      <thead>
                        <tr>
                          <th>Thời điểm hủy chuyến</th>
                          <th>Ngày thường</th>
                          <th>Ngày Lễ, Tết</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Trước &gt; 10 ngày</td>
                          <td>Hoàn <strong>100%</strong> tiền cọc</td>
                          <td>Không áp dụng</td>
                        </tr>
                        <tr>
                          <td>Trước 5 - 10 ngày</td>
                          <td>Hoàn <strong>30%</strong> tiền cọc</td>
                          <td>Không hoàn cọc</td>
                        </tr>
                        <tr>
                          <td>Trong vòng 5 ngày</td>
                          <td>Không hoàn cọc</td>
                          <td>Không hoàn cọc</td>
                        </tr>
                      </tbody>
                    </table>
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
            {/* Column 1: ViVuCar Info */}
            <div className="footer-col footer-col-info">
              <div className="footer-brand-logo-row">
                <svg viewBox="0 0 100 100" width="32" height="32" className="footer-brand-svg">
                  <rect width="100" height="100" rx="24" fill="#009698" />
                  <path d="M50 18 C62 18, 76 28, 76 50 C76 72, 62 82, 50 82 C38 82, 24 72, 24 50 C24 28, 38 18, 50 18 Z" fill="none" stroke="white" strokeWidth="6" />
                  <circle cx="50" cy="50" r="12" fill="white" />
                  <path d="M50 18 L50 82" stroke="white" strokeWidth="4" />
                </svg>
                <span className="footer-brand-text">
                  <span className="brand-dark">ViVu</span>
                  <span className="brand-teal">Car</span>
                </span>
              </div>
              <p className="footer-company-name">CÔNG TY TNHH VIVUCAR VIỆT NAM</p>
              <p className="footer-tax-info">Mã số thuế: 0318208708. Cấp ngày: 11/12/2023</p>
              
              <div className="footer-addresses-container">
                <div className="footer-address-item">
                  <span className="address-label">Văn phòng Hồ Chí Minh</span>
                  <span className="address-detail">- 69 Đường B4, Phường An Khánh, Thành phố Hồ Chí Minh, Việt Nam</span>
                </div>
                <div className="footer-address-item">
                  <span className="address-label">Văn phòng Đà Nẵng</span>
                  <span className="address-detail">- Tầng 6, Toà nhà dầu khí, Số 2 đường 30-4, Phường Hòa Cường, Thành phố Đà Nẵng, Việt Nam</span>
                </div>
                <div className="footer-address-item">
                  <span className="address-label">Văn phòng Hà Nội</span>
                  <span className="address-detail">- Tầng 10, Tòa nhà CEO, Lô HH2-1, Khu đô thị Mễ Trì Hạ, Đường Phạm Hùng, Phường Từ Liêm, Thành phố Hà Nội, Việt Nam</span>
                </div>
              </div>
              
              <p className="footer-email-info">Email: <a href="mailto:cskh@vivucar.vn">cskh@vivucar.vn</a></p>

              {/* Styled Ministry of Industry & Trade Badge */}
              <div className="verified-badge-container">
                <a href="#bct" onClick={(e) => e.preventDefault()} className="bocongthuong-badge">
                  <svg viewBox="0 0 150 56" width="130" height="48" className="bct-logo-svg">
                    <rect width="150" height="56" rx="8" fill="#0066b3" />
                    <circle cx="30" cy="28" r="18" fill="white" />
                    <path d="M22 28 L27 33 L38 21" fill="none" stroke="#0066b3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="56" y="24" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">ĐÃ THÔNG BÁO</text>
                    <text x="56" y="38" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">BỘ CÔNG THƯƠNG</text>
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Chính sách */}
            <div className="footer-col">
              <h4 className="footer-col-title">Chính sách</h4>
              <ul className="footer-links-list">
                <li><a href="#privacy" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang điều kiện giao dịch...', 'info'); }}>Điều kiện giao dịch chung</a></li>
                <li><a href="#terms" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang chính sách bảo mật...', 'info'); }}>Chính sách bảo vệ dữ liệu cá nhân</a></li>
                <li><a href="#general" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang điều khoản sử dụng...', 'info'); }}>Điều khoản sử dụng nền tảng</a></li>
                <li><a href="#delivery" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang chính sách giao nhận...', 'info'); }}>Chính sách giao nhận xe</a></li>
                <li><a href="#payment-method" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang phương thức thanh toán...', 'info'); }}>Phương thức thanh toán</a></li>
                <li><a href="#careers" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang tuyển dụng...', 'info'); }}>Tuyển dụng</a></li>
              </ul>
            </div>

            {/* Column 3: Địa điểm dịch vụ & Mạng xã hội */}
            <div className="footer-col">
              <h4 className="footer-col-title">Địa điểm dịch vụ</h4>
              <ul className="footer-links-list">
                <li><a href="#hcm" onClick={(e) => e.preventDefault()}>Hồ Chí Minh</a></li>
                <li><a href="#dang" onClick={(e) => e.preventDefault()}>Đà Nẵng</a></li>
                <li><a href="#hn" onClick={(e) => e.preventDefault()}>Hà Nội</a></li>
              </ul>

              <h4 className="footer-col-title" style={{ marginTop: '24px', marginBottom: '12px' }}>Mạng xã hội</h4>
              <div className="footer-social-row">
                <a href="#fb" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#1877f2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="#ln" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#0a66c2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                  </svg>
                </a>
                <a href="#yt" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#ff0000">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a href="#tk" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#000000">
                    <path d="M12.525.02c1.31-.032 2.61-.005 3.91-.005.08 1.527.7 2.958 1.8 3.972 1.1 1.005 2.6 1.486 4.09 1.547v3.896c-1.39-.082-2.74-.633-3.8-1.554-.3-.258-.57-.54-.81-.84v6.868c.09 2.64-1.2 5.207-3.41 6.643-2.26 1.484-5.26 1.636-7.67.391-2.48-1.258-4.09-3.918-3.99-6.702.1-2.9 1.99-5.613 4.75-6.53 1.62-.55 3.41-.476 4.97.228V7.525c-1.63-.585-3.42-.644-5.08-.168-2.61.761-4.71 3.033-5.23 5.717-.67 3.32.74 6.837 3.54 8.583 2.76 1.745 6.42 1.688 9.1-.144" />
                  </svg>
                </a>
                <a href="#ig" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#e1306c">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
                <a href="#map" className="social-icon-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#34a853">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </a>
              </div>
            </div>



            {/* Column 5: Hỗ trợ */}
            <div className="footer-col">
              <h4 className="footer-col-title">Hỗ trợ</h4>
              <ul className="footer-links-list">
                <li><a href="#support" onClick={(e) => { e.preventDefault(); showToast('Đang tải trang quy định dịch vụ...', 'info'); }}>Quy định dịch vụ</a></li>
              </ul>
              <div className="footer-support-phone-row">
                <span className="support-phone-icon">📞</span>
                <span className="support-phone-number">1900 5335</span>
              </div>
            </div>
          </div>


        </div>
      </footer>


    </div >
  );
};
