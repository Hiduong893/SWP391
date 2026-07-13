import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, MapPin, PlusCircle, Sparkles, Check, Car, Compass, ShieldCheck, Eye, Trash2, X, RefreshCw, BarChart3, CreditCard, Smartphone, Shield, Key, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import './ListCar.css';

// Import local images generated for BonbonCar style
import heroConsignment from '../../assets/hero_consignment.png';
import supportConsignment from '../../assets/support_consignment.png';
import doorConsignment from '../../assets/door_consignment.png';
import keysConsignment from '../../assets/keys_consignment.png';

const brandModels = {
  'VinFast': ['VF 3', 'VF 5 Plus', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'VF e34', 'Lux A2.0', 'Lux SA2.0', 'President', 'Fadil Standard', 'Fadil Advanced', 'Fadil Premium'],
  'Toyota': ['Vios E MT', 'Vios E CVT', 'Vios G CVT', 'Camry 2.0G', 'Camry 2.0Q', 'Camry 2.5Q', 'Camry 2.5HEV', 'Fortuner 2.4AT', 'Fortuner 2.7AT', 'Fortuner Legender', 'Innova Cross V', 'Innova Cross HEV', 'Corolla Cross 1.8G', 'Corolla Cross 1.8V', 'Corolla Cross 1.8HEV', 'Corolla Altis', 'Yaris', 'Raize', 'Veloz Cross Top', 'Veloz Cross CVT', 'Avanza Premio', 'Wigo', 'Land Cruiser', 'Land Cruiser Prado', 'Hilux'],
  'Honda': ['City G', 'City L', 'City RS', 'Civic E', 'Civic G', 'Civic RS', 'CR-V G', 'CR-V L', 'CR-V L AWD', 'CR-V e:HEV RS', 'HR-V G', 'HR-V L', 'HR-V RS', 'Accord', 'Brio'],
  'Hyundai': ['Grand i10 Hatchback', 'Grand i10 Sedan', 'Accent MT', 'Accent AT', 'Accent Đặc biệt', 'Elantra 1.6AT', 'Elantra 2.0AT', 'Elantra N-line', 'Tucson Xăng Tiêu chuẩn', 'Tucson Xăng Đặc biệt', 'Tucson Dầu Đặc biệt', 'Tucson Turbo', 'Santa Fe Xăng Cao cấp', 'Santa Fe Dầu Cao cấp', 'Santa Fe Hybrid', 'Creta Tiêu chuẩn', 'Creta Đặc biệt', 'Creta Cao cấp', 'Stargazer X', 'Custin', 'Palisade', 'Venue'],
  'Kia': ['Morning MT', 'Morning AT', 'Morning Premium', 'Soluto', 'K3 1.6 Premium', 'K3 2.0 Premium', 'K3 Turbo', 'K5', 'Seltos Deluxe', 'Seltos Luxury', 'Seltos Premium', 'Seltos GT-Line', 'Sonet Deluxe', 'Sonet Luxury', 'Sonet Premium', 'Sportage', 'Sorento Premium', 'Sorento Signature', 'Sorento Hybrid', 'Carnival Luxury', 'Carnival Premium', 'Carnival Signature', 'Carens'],
  'Mazda': ['Mazda 2 Sedan', 'Mazda 2 Sport', 'Mazda 3 Sedan', 'Mazda 3 Sport', 'Mazda 6', 'CX-3', 'CX-30', 'CX-5 Deluxe', 'CX-5 Luxury', 'CX-5 Premium', 'CX-5 Signature', 'CX-8 Luxury', 'CX-8 Premium', 'BT-50'],
  'Mitsubishi': ['Xpander MT', 'Xpander AT', 'Xpander Premium', 'Xpander Cross', 'Outlander Std', 'Outlander Premium', 'Pajero Sport', 'Attrage MT', 'Attrage CVT', 'Triton', 'Xforce GLX', 'Xforce Exceed', 'Xforce Premium', 'Xforce Ultimate'],
  'Ford': ['Ranger XL', 'Ranger XLS', 'Ranger Sport', 'Ranger Wildtrak', 'Ranger Raptor', 'Everest Sport', 'Everest Titanium', 'Everest Titanium+', 'Everest Platinum', 'Explorer', 'Territory Trend', 'Territory Titanium', 'Territory Titanium X', 'EcoSport', 'Transit'],
  'Mercedes-Benz': ['C200 Avantgarde', 'C200 Plus', 'C300 AMG', 'E180', 'E200 Exclusive', 'E300 AMG', 'S450', 'S450 Luxury', 'GLC200', 'GLC200 4MATIC', 'GLC300 4MATIC', 'GLE450 4MATIC', 'GLS450 4MATIC', 'Maybach'],
  'BMW': ['320i Sport Line', '320i M Sport', '330i M Sport', '520i', '520i M Sport', '530i M Sport', 'Series 7', 'X1', 'X3 sDrive20i', 'X3 xDrive20i', 'X3 xDrive30i', 'X5 xDrive40i'],
  'Audi': ['A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
  'Lexus': ['ES 250', 'ES 300h', 'RX 350', 'RX 500h', 'NX 350h', 'LX 600', 'LM 500h'],
  'Volvo': ['XC40', 'XC60 Recharge', 'XC90 Recharge', 'S60', 'S90 LWB', 'V60 Cross Country'],
  'Porsche': ['Macan Standard', 'Macan S', 'Macan GTS', 'Cayenne Standard', 'Cayenne Coupe', 'Cayenne E-Hybrid', 'Panamera', 'Taycan', '911 Carrera'],
  'Chevrolet': ['Cruze', 'Captiva', 'Colorado', 'Spark', 'Trailblazer'],
  'Suzuki': ['Swift', 'Ertiga Hybrid', 'XL7', 'Jimny', 'Ciaz'],
  'Nissan': ['Almera EL', 'Almera VL', 'Navara EL', 'Navara VL', 'Navara Pro4X', 'Terra', 'Kicks e-POWER Tiêu chuẩn', 'Kicks e-POWER Cao cấp'],
  'MG': ['MG5', 'ZS STD', 'ZS Comfort', 'ZS Luxury', 'HS', 'RX5', 'MG7'],
  'Peugeot': ['2008 Active', '2008 GT-Line', '3008 Active', '3008 Allure', '3008 GT', '5008 Allure', '5008 GT', '408'],
  'Subaru': ['Forester i-L', 'Forester i-L EyeSight', 'Forester i-S EyeSight', 'Outback', 'WRX']
};

export const ListCar = ({ setCurrentTab, user, setUser }) => {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Car Form State (UC21)
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [seats, setSeats] = useState(5);
  const [transmission, setTransmission] = useState('Tự động');
  const [fuel, setFuel] = useState('Xăng');
  const [pricePerDay, setPricePerDay] = useState('');
  const [location, setLocation] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [carImage, setCarImage] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [yearOfManufacture, setYearOfManufacture] = useState(2026);
  const [odo, setOdo] = useState('');
  const [rentDays, setRentDays] = useState('');

  // Support Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  const { showToast } = useToast();

  const calculateEstimatedEarningsHero = () => {
    if (!brand || !model || !location || !rentDays) return null;
    
    let basePrice = 800000;
    if (brand === 'VinFast') basePrice = 1100000;
    else if (['Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Porsche'].includes(brand)) basePrice = 2200000;
    else if (['Toyota', 'Honda', 'Mazda', 'Mitsubishi'].includes(brand)) basePrice = 850000;
    else if (['Hyundai', 'Kia', 'Chevrolet', 'Suzuki'].includes(brand)) basePrice = 750000;

    let daysCount = parseInt(rentDays);
    if (isNaN(daysCount)) {
      daysCount = 15;
      if (rentDays === 'Chủ yếu cho thuê') daysCount = 22;
      else if (rentDays === 'Cho thuê cuối tuần') daysCount = 8;
      else if (rentDays === 'Linh hoạt') daysCount = 12;
    }

    return basePrice * daysCount * 0.9; // 10% platform fee
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
        yearOfManufacture: parseInt(yearOfManufacture),
        odo: odo ? parseInt(odo) : null,
        image: carImage
      };

      const data = await api.cars.listCar(carData);
      showToast(data.message, 'success');
      setSuccess(true);
      if (user && user.role === 'renter') {
        try {
          const profileData = await api.user.getProfile();
          setUser(profileData.user);
        } catch (err) {
          setUser({ ...user, role: 'owner' });
        }
      }
    } catch (error) {
      showToast(error.message || 'Lỗi khi ký gửi xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setBrand('');
    setModel('');
    setSeats(5);
    setTransmission('Tự động');
    setFuel('Xăng');
    setPricePerDay('');
    setLocation('');
    setPlateNumber('');
    setCarImage('');
    setYearOfManufacture(2026);
    setOdo('');
    setRentDays('');
    setSuccess(false);
  };

  const scrollToForm = () => {
    const el = document.getElementById('ky-gui-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="owner-dashboard-page" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '20px 0' }}>
      <div className="consignment-landing-page">
                {!success ? (
                  <>
                    {/* SECTION 1: HERO & ESTIMATOR FORM */}
                    {/* SECTION 1: HERO & ESTIMATOR FORM */}
                    <div className="owner-info-grid">
                      {/* Left: Estimator Form */}
                      <div className="consignment-estimator-card">
                        <h1 className="estimator-heading">
                          Cho thuê nhẹ nhàng,<br />
                          thu nhập thảnh thơi cùng <span className="estimator-brand-highlight">ViVuCar</span>
                        </h1>
                        <p className="estimator-subheading">
                          Ước tính thu nhập từ xe của bạn
                        </p>

                        <div className="estimator-inputs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Hãng xe</label>
                            <select 
                              value={brand} 
                              onChange={(e) => {
                                setBrand(e.target.value);
                                setModel('');
                              }} 
                              className="estimator-input-field" 
                            >
                              <option value="">Chọn hãng xe</option>
                              <option value="VinFast">VinFast</option>
                              <option value="Toyota">Toyota</option>
                              <option value="Honda">Honda</option>
                              <option value="Hyundai">Hyundai</option>
                              <option value="Kia">Kia</option>
                              <option value="Mazda">Mazda</option>
                              <option value="Mitsubishi">Mitsubishi</option>
                              <option value="Ford">Ford</option>
                              <option value="Mercedes-Benz">Mercedes-Benz</option>
                              <option value="BMW">BMW</option>
                              <option value="Audi">Audi</option>
                              <option value="Lexus">Lexus</option>
                              <option value="Volvo">Volvo</option>
                              <option value="Porsche">Porsche</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Mẫu xe</label>
                            <select 
                              value={model}
                              onChange={(e) => setModel(e.target.value)}
                              className="estimator-input-field" 
                              disabled={!brand}
                            >
                              <option value="">{brand ? "Chọn mẫu xe" : "Chọn hãng trước"}</option>
                              {brand && brandModels[brand] && brandModels[brand].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              {brand && <option value="Khác">Khác</option>}
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Năm sản xuất</label>
                            <select 
                              value={yearOfManufacture} 
                              onChange={(e) => setYearOfManufacture(parseInt(e.target.value))} 
                              className="estimator-input-field" 
                            >
                              <option value={2026}>2026</option>
                              <option value={2025}>2025</option>
                              <option value={2024}>2024</option>
                              <option value={2023}>2023</option>
                              <option value={2022}>2022</option>
                              <option value={2021}>2021</option>
                              <option value={2020}>2020</option>
                              <option value={2019}>2019</option>
                              <option value={2018}>2018</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Thành phố</label>
                          <select 
                            value={location} 
                            onChange={(e) => setLocation(e.target.value)} 
                            className="estimator-input-field" 
                          >
                            <option value="">Chọn thành phố</option>
                            <option value="Hà Nội">Hà Nội</option>
                            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                            <option value="Đà Nẵng">Đà Nẵng</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Số ngày có thể cho thuê trong tháng</label>
                          <input 
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Nhập số ngày (Vd: 15)"
                            value={rentDays} 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                                setRentDays(val);
                              }
                            }} 
                            className="estimator-input-field" 
                          />
                        </div>

                        {/* Result Output */}
                        <div className="estimator-result-banner">
                          {calculateEstimatedEarningsHero() !== null ? (
                            <span className="estimator-result-text">
                              <Sparkles size={18} style={{ color: '#10b981' }} />
                              Doanh thu ước tính của bạn: {formatCurrency(calculateEstimatedEarningsHero())} / tháng
                            </span>
                          ) : (
                            <span className="estimator-empty-text">
                              Hãy điền đủ thông tin để ước tính thu nhập của bạn
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={scrollToForm}
                          className="estimator-cta-button"
                        >
                          <Sparkles size={16} /> Đăng ký ngay
                        </button>
                      </div>

                      {/* Right: Rounded Hero Image */}
                      <div className="hero-img-box">
                        <img 
                          src={heroConsignment} 
                          alt="Car keys handover" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '380px' }} 
                        />
                      </div>
                    </div>

                    {/* SECTION 2: 3 STEPS TIMELINE */}
                    <div className="consignment-steps-box" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '30px' }}>
                        Cho thuê 3 bước siêu dễ chỉ 10 phút
                      </h2>

                      {/* Step Indicator horizontal line */}
                      <div className="step-line-container">
                        <div className="step-line"></div>
                        <div className="step-circle">1</div>
                        <div className="step-circle">2</div>
                        <div className="step-circle">3</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
                        <div>
                          <h5 style={{ fontSize: '14.5px', fontWeight: 700, color: '#009698', marginBottom: '8px' }}>Chuẩn bị xe và nhận đơn nhẹ nhàng</h5>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Khi xe sẵn sàng cho thuê, ViVuCar sẽ thay chủ xe đánh giá hồ sơ và ký hợp đồng cho thuê khi khách đặt xe.
                          </p>
                        </div>
                        <div>
                          <h5 style={{ fontSize: '14.5px', fontWeight: 700, color: '#009698', marginBottom: '8px' }}>Cho thuê xe nhàn nhã</h5>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Khách thuê sẽ tự lấy xe và trả xe tại vị trí xe đậu dưới sự giám sát 24/7 của ViVuCar.
                          </p>
                        </div>
                        <div>
                          <h5 style={{ fontSize: '14.5px', fontWeight: 700, color: '#009698', marginBottom: '8px' }}>Nhận thu nhập hấp dẫn hàng tuần</h5>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Nhận tiền thuê và các thu nhập khác hàng tuần.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: AN TAM TUYET DOI - CAROUSEL */}
                    <div className="an-tam-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', alignItems: 'center', textAlign: 'left' }}>
                      <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                          An tâm tuyệt đối – ViVuCar lo trọn gói
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                          Đây là giải pháp hoàn hảo cho chủ xe bận rộn, muốn kiếm thêm mà chẳng cần bận tâm. ViVuCar kiểm tra kỹ hồ sơ từng khách thuê, thay bạn xử lý mọi vấn đề từ giấy tờ pháp lý, phạt nguội và phát sinh.
                        </p>
                      </div>

                      <div>
                        {/* Carousel component block */}
                        {(() => {
                          const carouselSlides = [
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Tư vấn và lựa chọn khách thuê phù hợp. Xác thực và đánh giá hồ sơ khách hàng."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Ký kết hợp đồng cho thuê điện tử, bàn giao tài liệu kỹ thuật pháp lý chặt chẽ."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Lắp đặt thiết bị định vị GPS thông minh và bảo mật chìa khóa an toàn."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Giám sát lộ trình di chuyển của xe 24/7, phát hiện sớm các hành vi bất thường."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Hỗ trợ cứu hộ khẩn cấp trên đường và xử lý các vấn đề phát sinh sự cố."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Xử lý và truy thu chi phí các lỗi phạt nguội phát sinh thay chủ xe."
                            },
                            {
                              title: "ViVuCar đảm nhận",
                              content: "Tự động đối soát tài chính và chuyển tiền doanh thu trực tiếp hàng tuần."
                            }
                          ];

                          const activeSlide = carouselSlides[currentSlide];

                          const handlePrev = () => {
                            setCurrentSlide((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
                          };

                          const handleNext = () => {
                            setCurrentSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
                          };

                          return (
                            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#009698', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    <ShieldCheck size={18} />
                                    <span>{activeSlide.title}</span>
                                  </div>
                                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                                    {activeSlide.content}
                                  </p>
                                </div>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                  <img src={supportConsignment} alt="Support representatives" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                                <button onClick={handlePrev} className="carousel-btn">
                                  <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {currentSlide + 1} / {carouselSlides.length}
                                </span>
                                <button onClick={handleNext} className="carousel-btn">
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* SECTION 4: SUPPORT & AUTONOMY - TWO ALTERNATING ROWS WITH IMAGES */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                      <div className="info-row">
                        <div className="info-img-wrapper">
                          <img src={doorConsignment} alt="Opening car door" />
                        </div>
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                            Hỗ trợ toàn diện từ A-Z
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                            ViVuCar mang đến một trải nghiệm vô cùng thuận tiện và đơn giản. Chúng tôi lo tất cả mọi khâu — từ kết nối khách hàng, thủ tục cho đến giám sát và xử lý sự cố, giúp bạn tiết kiệm thời gian và công sức.
                          </p>
                        </div>
                      </div>

                      <div className="info-row">
                        <div className="info-img-wrapper">
                          <img src={keysConsignment} alt="Handing car keys" />
                        </div>
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                            Toàn quyền chủ động
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                            Không yêu cầu ký gửi xe cố định. Bạn hoàn toàn chủ động trong việc quản lý lịch cho thuê và sắp xếp kế hoạch sử dụng xe cho các mục đích cá nhân.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 5: COMPARISON TABLE */}
                    <div className="comparison-table-section" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '6px' }}>
                        ViVuCar: Giải pháp vượt trội cho thuê xe tự lái
                      </h2>

                      <div className="comparison-table-wrapper" style={{ background: 'white' }}>
                        <table className="comparison-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th style={{ color: '#009698', textAlign: 'center', fontWeight: 800 }}>ViVuCar</th>
                              <th style={{ textAlign: 'center' }}>Tự cho thuê</th>
                              <th style={{ textAlign: 'center' }}>Nền tảng khác</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Tiết kiệm 90% thời gian, công sức cho thuê</td>
                              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✓</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                            </tr>
                            <tr>
                              <td>Quy trình quản lý rủi ro 10 bước chặt chẽ</td>
                              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✓</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                            </tr>
                            <tr>
                              <td>Miễn phí lắp đặt thiết bị an toàn</td>
                              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✓</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                            </tr>
                            <tr>
                              <td>Thay chủ xe giám sát đơn thuê 24/7</td>
                              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✓</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                            </tr>
                            <tr>
                              <td>Xử lý và truy thu phạt nguội thay chủ xe</td>
                              <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✓</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>✕</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 6: TWO-COLUMN REGISTRATION FORM */}
                    <div id="ky-gui-form" className="form-section-grid">
                      {/* Left: Background image with text */}
                      <div className="form-banner-side" style={{ backgroundImage: `url(${keysConsignment})` }}>
                        <h3>Kiếm thu nhập thụ động dễ dàng cùng ViVuCar!</h3>
                      </div>

                      {/* Right: Registration fields form */}
                      <div className="form-fields-side">
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Đăng ký cho thuê xe</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '24px' }}>
                          Chúng tôi sẽ liên hệ bạn trong vòng 48 giờ để hoàn tất thủ tục!
                        </p>

                        <form onSubmit={handleSubmitNewCar} className="list-car-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Họ tên *</label>
                              <input 
                                type="text" 
                                placeholder="Nhập họ tên" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Số điện thoại *</label>
                              <input 
                                type="tel" 
                                placeholder="Nhập số điện thoại" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Hãng xe *</label>
                              <select 
                                value={brand} 
                                onChange={(e) => {
                                  setBrand(e.target.value);
                                  setModel('');
                                }} 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                              >
                                <option value="">Chọn hãng xe</option>
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
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Mẫu xe *</label>
                              <select 
                                value={model} 
                                onChange={(e) => setModel(e.target.value)} 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                required
                                disabled={!brand}
                              >
                                <option value="">{brand ? "Chọn mẫu xe" : "Chọn hãng trước"}</option>
                                {brand && brandModels[brand] && brandModels[brand].map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                                {brand && <option value="Khác">Khác</option>}
                              </select>
                            </div>
                          </div>

                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Đời xe *</label>
                              <select value={yearOfManufacture} onChange={(e) => setYearOfManufacture(parseInt(e.target.value))} className="form-input" style={{ paddingLeft: '14px' }}>
                                <option value={2026}>2026</option>
                                <option value={2025}>2025</option>
                                <option value={2024}>2024</option>
                                <option value={2023}>2023</option>
                                <option value={2022}>2022</option>
                                <option value={2021}>2021</option>
                                <option value={2020}>2020</option>
                                <option value={2019}>2019</option>
                                <option value={2018}>2018</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">ODO (số km đã đi) *</label>
                              <input 
                                type="number" 
                                placeholder="Chọn ODO" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                value={odo}
                                onChange={(e) => setOdo(e.target.value)}
                                min="0"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Thành phố *</label>
                              <select value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" style={{ paddingLeft: '14px' }}>
                                <option value="">Chọn thành phố</option>
                                <option value="Hà Nội">Hà Nội</option>
                                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                <option value="Đà Nẵng">Đà Nẵng</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Quận *</label>
                              <input 
                                type="text" 
                                placeholder="Nhập quận/huyện" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Biển số xe *</label>
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
                            <div className="form-group" style={{ marginBottom: 0 }}>
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

                          <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Số ngày có thể cho thuê trong tháng *</label>
                              <input 
                                type="number" 
                                min="1"
                                max="31"
                                placeholder="Nhập số ngày (Vd: 15)" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                                value={rentDays}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 31)) {
                                    setRentDays(val);
                                  }
                                }}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Thông tin người giới thiệu (tùy chọn)</label>
                              <input 
                                type="tel" 
                                placeholder="Nhập số điện thoại người giới thiệu" 
                                className="form-input" 
                                style={{ paddingLeft: '14px' }}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
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
                                  <input type="file" onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} disabled={imageLoading} />
                                </label>
                              )}
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary mt-6" style={{ background: '#009698', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700 }} disabled={loading || imageLoading}>
                            Đăng ký ngay
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto', background: 'white', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <Sparkles className="success-lottie-icon animate-bounce text-success mb-4" size={56} style={{ display: 'inline', color: '#10b981' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>Đăng Ký Ký Gửi Xe Thành Công!</h2>
                    <p className="subtitle mt-2" style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                      Cảm ơn bạn! Xe <strong>{brand} {model}</strong> đã được nộp hồ sơ phê duyệt lên hệ thống. CSKH sẽ kiểm duyệt hồ sơ xe và đăng tải lên sàn trong chốc lát!
                    </p>

                    <div className="success-actions mt-6" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                      <button type="button" className="btn btn-secondary" onClick={handleResetForm}>
                        Đăng ký ký gửi tiếp xe khác
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        style={{ background: '#009698', border: 'none' }}
                        onClick={() => {
                          handleResetForm();
                          setCurrentTab('owner-dashboard');
                        }}
                      >
                        <Check size={18} />
                        Xem đội xe sở hữu
                      </button>
                    </div>
                  </div>
                )}
      </div>
    </div>
  );
};


