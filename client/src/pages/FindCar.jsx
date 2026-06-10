import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, SlidersHorizontal, Users, Fuel, Info, Sparkles, Zap, Key, Compass, Car, X, Handshake, Crown, Scan, ArrowUpDown, Globe } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../components/Toast';

export const FindCar = ({ user, setCurrentTab, onRentCarClick, initialSearchParams }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Search states (Matches search-bar-premium layout)
  const [selectedLocation, setSelectedLocation] = useState('TP. Hồ Chí Minh');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Filter states
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSeats, setSelectedSeats] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');
  const [selectedTransmission, setSelectedTransmission] = useState('');
  const [rentalType, setRentalType] = useState('all'); // all, self, owner
  const [isSaleOnly, setIsSaleOnly] = useState(false);
  const [isPremiumOnly, setIsPremiumOnly] = useState(false);
  const [selectedSort, setSelectedSort] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  // Dropdown UI state
  const [activeDropdown, setActiveDropdown] = useState(null); // null, brand, seats, fuel, transmission, rentalType, sort, model, type, district

  const fetchCars = async (filters = {}) => {
    setLoading(true);
    try {
      // Gọi API lấy toàn bộ danh sách xe có sẵn
      const data = await api.cars.getCars(filters);
      setCars(data);
    } catch (error) {
      showToast('Không thể tải danh sách xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);

    const initLocation = initialSearchParams ? initialSearchParams.location : 'TP. Hồ Chí Minh';
    const initPickup = initialSearchParams ? initialSearchParams.pickupDate : tomorrow.toISOString().split('T')[0];
    const initReturn = initialSearchParams ? initialSearchParams.returnDate : dayAfter.toISOString().split('T')[0];

    setSelectedLocation(initLocation);
    setPickupDate(initPickup);
    setReturnDate(initReturn);

    fetchCars({ location: initLocation });
  }, [initialSearchParams]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (new Date(pickupDate) >= new Date(returnDate)) {
      showToast('Ngày trả xe phải sau ngày nhận xe ít nhất 1 ngày.', 'warning');
      return;
    }
    fetchCars({ location: selectedLocation });
    showToast(`Đã tìm thấy xe phù hợp tại ${selectedLocation || 'mọi địa điểm'}!`, 'success');
  };

  const handleClearAllFilters = () => {
    setSelectedBrand('');
    setSelectedSeats('');
    setSelectedFuel('');
    setSelectedTransmission('');
    setRentalType('all');
    setIsSaleOnly(false);
    setIsPremiumOnly(false);
    setSelectedSort('');
    setSelectedModel('');
    setSelectedType('');
    setSelectedDistrict('');
    showToast('Đã xóa tất cả bộ lọc', 'info');
  };

  const handleRentCar = (car) => {
    if (!user) {
      showToast('Vui lòng đăng nhập tài khoản để tiến hành đặt xe.', 'warning');
      setCurrentTab('login');
      return;
    }

    if (onRentCarClick) {
      onRentCarClick({
        car,
        pickupDate,
        returnDate,
        pickupLocation: selectedLocation || car.location
      });
      showToast(`Đang mở thanh toán cọc cho xe ${car.brand} ${car.model}...`, 'success');
    }
  };

  const getCarType = (car) => {
    const m = car.model.toLowerCase();
    if (m.includes('vios') || m.includes('city') || m.includes('accent') || m.includes('civic') || m.includes('k3') || m.includes('cerato')) return 'Sedan';
    if (m.includes('xpander') || m.includes('innova') || m.includes('veloz') || m.includes('carnival')) return 'MPV';
    if (m.includes('vf8') || m.includes('santafe') || m.includes('seltos') || m.includes('vf9') || m.includes('cr-v') || m.includes('tucson') || m.includes('cx-5')) return 'SUV / Crossover';
    return 'Khác';
  };

  const getDistrictsForLocation = () => {
    if (selectedLocation === 'Hà Nội') {
      return ['Tất cả', 'Cầu Giấy', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Ba Đình', 'Thanh Xuân', 'Tây Hồ', 'Nam Từ Liêm', 'Bắc Từ Liêm'];
    }
    if (selectedLocation === 'Đà Nẵng') {
      return ['Tất cả', 'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'];
    }
    return ['Tất cả', 'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 7', 'Quận 10', 'Tân Bình', 'Tân Phú', 'Bình Thạnh', 'Thủ Đức', 'Gò Vấp'];
  };

  // Client-side dynamic filtering & sorting logic
  const getFilteredCars = () => {
    let list = [...cars];

    // 1. Filter by Location
    if (selectedLocation) {
      const loc = selectedLocation.toLowerCase();
      list = list.filter(car => 
        car.location.toLowerCase().includes(loc) ||
        (loc === 'tp. hồ chí minh' && car.location.toLowerCase().includes('quận'))
      );
    }

    // 1.1. Filter by District
    if (selectedDistrict) {
      list = list.filter(car => car.location.toLowerCase().includes(selectedDistrict.toLowerCase()));
    }

    // 2. Filter by Brand
    if (selectedBrand) {
      list = list.filter(car => car.brand.toLowerCase() === selectedBrand.toLowerCase());
    }

    // 2.1. Filter by Model
    if (selectedModel) {
      list = list.filter(car => car.model.toLowerCase().includes(selectedModel.toLowerCase()));
    }

    // 2.2. Filter by Car Type (Segment)
    if (selectedType) {
      list = list.filter(car => getCarType(car).toLowerCase() === selectedType.toLowerCase());
    }

    // 3. Filter by Seats
    if (selectedSeats) {
      list = list.filter(car => String(car.seats) === String(selectedSeats));
    }

    // 4. Filter by Fuel
    if (selectedFuel) {
      list = list.filter(car => car.fuel.toLowerCase() === selectedFuel.toLowerCase());
    }

    // 5. Filter by Transmission
    if (selectedTransmission) {
      list = list.filter(car => car.transmission.toLowerCase() === selectedTransmission.toLowerCase());
    }

    // 6. Filter by Rental Type (Tự nhận xe = platform-managed without ownerId, Gặp chủ xe = has ownerId)
    if (rentalType === 'self') {
      list = list.filter(car => !car.ownerId);
    } else if (rentalType === 'owner') {
      list = list.filter(car => car.ownerId);
    }

    // 7. Filter by Sale (Giảm giá 10% - xe giá > 1.0M)
    if (isSaleOnly) {
      list = list.filter(car => car.pricePerDay > 1000000);
    }

    // 8. Filter by Premium (Xế xịn - giá > 1.5M)
    if (isPremiumOnly) {
      list = list.filter(car => car.pricePerDay > 1500000);
    }

    // 9. Sort price
    if (selectedSort === 'Giá tăng dần') {
      list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    } else if (selectedSort === 'Giá giảm dần') {
      list.sort((a, b) => b.pricePerDay - a.pricePerDay);
    }

    return list;
  };

  const filteredCars = getFilteredCars();

  return (
    <div className="find-car-page">
      {/* HEADER BANNER MÀU TỐI */}
      <div className="find-car-banner">
        <h1 className="find-car-title-white">Tìm xe tự lái</h1>

        {/* BỘ LỌC TÌM KIẾM CỠ LỚN */}
        <form onSubmit={handleSearchSubmit} className="search-bar-premium">
          <div className="search-field-premium">
            <MapPin size={18} className="field-icon-premium" />
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="search-select-premium"
            >
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
            </select>
          </div>
          <div className="divider-vertical-premium" />
          <div className="search-field-premium">
            <Calendar size={18} className="field-icon-premium" />
            <input 
              type="date" 
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="search-date-premium"
              title="Ngày nhận xe"
              required
            />
            <span className="search-date-separator">đến</span>
            <input 
              type="date" 
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="search-date-premium"
              title="Ngày trả xe"
              required
            />
          </div>
          <button type="submit" className="btn-find-submit-premium">
            TÌM XE
          </button>
        </form>
      </div>

      {/* FILTER PILLS BUTTON BAR */}
      <div className="filter-pills-container">
        <button 
          className={`pill-item ${(!selectedBrand && !selectedSeats && !selectedFuel && !selectedTransmission && !isSaleOnly && !isPremiumOnly && rentalType === 'all' && !selectedModel && !selectedType && !selectedDistrict) ? 'active' : ''}`}
          onClick={handleClearAllFilters}
        >
          Tất cả
        </button>

        <button 
          className={`pill-item ${isSaleOnly ? 'active' : ''}`}
          onClick={() => {
            setIsSaleOnly(!isSaleOnly);
            showToast(isSaleOnly ? 'Đã tắt bộ lọc khuyến mãi.' : 'Đã lọc xe đang được khuyến mãi (Giảm 10%).', 'info');
          }}
        >
          <Zap size={14} className="pill-icon" style={{ color: isSaleOnly ? '#ffffff' : '#10b981' }} />
          <span>Sale</span>
        </button>

        <button 
          className={`pill-item ${rentalType !== 'all' ? 'active' : ''}`}
          onClick={() => setActiveDropdown('rentalType')}
        >
          <Handshake size={14} className="pill-icon" />
          <span>{rentalType === 'all' ? 'Hình thức thuê' : rentalType === 'self' ? 'Tự nhận xe' : 'Gặp chủ xe'}</span>
        </button>

        <button 
          className={`pill-item ${selectedSeats ? 'active' : ''}`}
          onClick={() => setActiveDropdown('seats')}
        >
          <Car size={14} className="pill-icon" />
          <span>{selectedSeats ? `${selectedSeats} chỗ` : 'Số chỗ'}</span>
        </button>

        <button 
          className={`pill-item ${selectedBrand ? 'active' : ''}`}
          onClick={() => setActiveDropdown('brand')}
        >
          <Globe size={14} className="pill-icon" />
          <span>{selectedBrand || 'Hãng xe'}</span>
        </button>

        <button 
          className={`pill-item ${selectedModel ? 'active' : ''}`}
          onClick={() => setActiveDropdown('model')}
        >
          <Scan size={14} className="pill-icon" />
          <span>{selectedModel || 'Mẫu xe'}</span>
        </button>

        <button 
          className={`pill-item ${selectedType ? 'active' : ''}`}
          onClick={() => setActiveDropdown('type')}
        >
          <SlidersHorizontal size={14} className="pill-icon" />
          <span>{selectedType || 'Loại xe'}</span>
        </button>

        <button 
          className={`pill-item ${selectedFuel ? 'active' : ''}`}
          onClick={() => setActiveDropdown('fuel')}
        >
          <Fuel size={14} className="pill-icon" />
          <span>{selectedFuel || 'Nhiên liệu'}</span>
        </button>

        <button 
          className={`pill-item ${selectedDistrict ? 'active' : ''}`}
          onClick={() => setActiveDropdown('district')}
        >
          <MapPin size={14} className="pill-icon" />
          <span>{selectedDistrict || 'Khu vực xe'}</span>
        </button>

        <button 
          className={`pill-item ${isPremiumOnly ? 'active' : ''}`}
          onClick={() => {
            setIsPremiumOnly(!isPremiumOnly);
            showToast(isPremiumOnly ? 'Đã tắt bộ lọc xế xịn.' : 'Đã lọc xế xịn cao cấp (giá > 1.5M/ngày).', 'info');
          }}
        >
          <Crown size={14} className="pill-icon" style={{ color: isPremiumOnly ? '#ffffff' : '#eab308' }} />
          <span>Xế xịn</span>
        </button>

        <button 
          className={`pill-item ${selectedSort ? 'active' : ''}`}
          onClick={() => setActiveDropdown('sort')}
        >
          <ArrowUpDown size={14} className="pill-icon" />
          <span>{selectedSort ? `Sắp xếp: ${selectedSort}` : 'Sắp xếp'}</span>
        </button>
      </div>

      {/* RENDER CAR GRID */}
      {loading ? (
        <div className="find-car-loading">Đang tải danh sách toàn bộ xe...</div>
      ) : filteredCars.length === 0 ? (
        <div className="find-car-empty">
          <Info size={48} className="text-muted" style={{ margin: '0 auto 16px auto', color: '#94a3b8' }} />
          <p>Không tìm thấy xe nào phù hợp với bộ lọc hiện tại.</p>
          <button onClick={handleClearAllFilters} className="btn btn-secondary mt-4" style={{ width: 'auto' }}>
            Xem tất cả xe
          </button>
        </div>
      ) : (
        <div className="find-car-grid-container">
          <div className="find-cars-grid">
            {filteredCars.map((car) => {
              const dayPriceOrig = Math.round((car.pricePerDay * 1.1) / 1000) + 'K';
              const dayPriceActual = Math.round(car.pricePerDay / 1000) + 'K';
              const mockDistance = (1.5 + (parseInt(car.id) % 3) * 1.2).toFixed(1);

              return (
                <div key={car.id} className="find-car-card">
                  {/* Image container */}
                  <div className="find-card-image-box" onClick={() => handleRentCar(car)}>
                    <img src={car.image} alt={car.model} className="find-card-img" />
                    
                    {/* Badge Sale */}
                    <div className="find-card-badge-top">
                      <span className="find-badge-sale">🏷️ Giảm 10%</span>
                    </div>

                    {/* Badge Nhận xe */}
                    <div className="find-card-badge-bottom">
                      {!car.ownerId ? (
                        <span className="find-badge-self">📱 Tự nhận xe</span>
                      ) : (
                        <span className="find-badge-owner">🔑 Gặp chủ xe</span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="find-car-card-body">
                    <h3 className="find-car-card-title" onClick={() => handleRentCar(car)}>
                      {car.brand.toUpperCase()} {car.model}
                    </h3>
                    
                    <p className="find-car-location">
                      Quận {car.location.replace('Quận ', '')}
                    </p>

                    <div className="find-car-distance-row">
                      <span>~ {mockDistance} km</span>
                      <Info size={12} className="info-icon" title="Khoảng cách ước tính từ vị trí của bạn" />
                    </div>

                    {/* Pricing */}
                    <div className="find-car-pricing-row">
                      <span className="orig-price">{dayPriceOrig}</span>
                      <span className="actual-price">{dayPriceActual}/ngày</span>
                    </div>
                    
                    <div className="price-estimation-text">
                      Giá tạm tính chưa bao gồm VAT & Bảo hiểm
                    </div>

                    {/* Specs Row */}
                    <div className="find-car-specs-row">
                      <div className="spec-item" title="Số chỗ">
                        <Users size={12} style={{ color: '#009698' }} />
                        <span>{car.seats} chỗ</span>
                      </div>
                      <div className="spec-item" title="Hộp số">
                        <SlidersHorizontal size={12} style={{ color: '#009698' }} />
                        <span>{car.transmission}</span>
                      </div>
                      <div className="spec-item" title="Nhiên liệu">
                        <Fuel size={12} style={{ color: '#009698' }} />
                        <span>{car.fuel}</span>
                      </div>
                    </div>

                    <button 
                      className="btn-card-rent-premium"
                      onClick={() => handleRentCar(car)}
                    >
                      ĐẶT XE NGAY
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✕ MODALS BỘ LỌC CHI TIẾT */}
      {activeDropdown && (
        <div className="filter-modal-overlay" onClick={() => setActiveDropdown(null)}>
          <div className="filter-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>
                {activeDropdown === 'brand' && 'Chọn hãng xe'}
                {activeDropdown === 'seats' && 'Chọn số chỗ ngồi'}
                {activeDropdown === 'fuel' && 'Chọn loại nhiên liệu'}
                {activeDropdown === 'transmission' && 'Chọn loại hộp số'}
                {activeDropdown === 'rentalType' && 'Chọn hình thức thuê'}
                {activeDropdown === 'sort' && 'Sắp xếp theo'}
                {activeDropdown === 'model' && 'Chọn mẫu xe'}
                {activeDropdown === 'type' && 'Chọn loại xe'}
                {activeDropdown === 'district' && 'Chọn khu vực xe'}
              </h3>
              <button className="btn-close-filter-modal" onClick={() => setActiveDropdown(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="filter-modal-body">
              {activeDropdown === 'brand' && (
                ['Tất cả', 'VinFast', 'Toyota', 'Mitsubishi', 'Hyundai', 'Kia', 'Honda', 'Mazda', 'MG', 'Suzuki'].map((b) => (
                  <label key={b} className="checkbox-label-pills">
                     <input
                      type="radio"
                      name="brand"
                      checked={b === 'Tất cả' ? !selectedBrand : selectedBrand === b}
                      onChange={() => setSelectedBrand(b === 'Tất cả' ? '' : b)}
                    />
                    <span>{b}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'seats' && (
                ['Tất cả', '4', '5', '7'].map((s) => (
                  <label key={s} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="seats"
                      checked={s === 'Tất cả' ? !selectedSeats : selectedSeats === s}
                      onChange={() => setSelectedSeats(s === 'Tất cả' ? '' : s)}
                    />
                    <span>{s === 'Tất cả' ? 'Tất cả' : `${s} chỗ`}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'fuel' && (
                ['Tất cả', 'Xăng', 'Dầu', 'Điện'].map((f) => (
                  <label key={f} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="fuel"
                      checked={f === 'Tất cả' ? !selectedFuel : selectedFuel === f}
                      onChange={() => setSelectedFuel(f === 'Tất cả' ? '' : f)}
                    />
                    <span>{f}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'transmission' && (
                ['Tất cả', 'Tự động', 'Số sàn'].map((t) => (
                  <label key={t} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="transmission"
                      checked={t === 'Tất cả' ? !selectedTransmission : selectedTransmission === t}
                      onChange={() => setSelectedTransmission(t === 'Tất cả' ? '' : t)}
                    />
                    <span>{t}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'rentalType' && (
                [
                  { value: 'all', label: 'Tất cả hình thức' },
                  { value: 'self', label: '📱 Tự nhận xe (Vận hành bởi platform)' },
                  { value: 'owner', label: '🔑 Gặp chủ xe (Đối tác ký gửi)' }
                ].map((r) => (
                  <label key={r.value} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="rentalType"
                      checked={rentalType === r.value}
                      onChange={() => setRentalType(r.value)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'sort' && (
                ['Mặc định', 'Giá tăng dần', 'Giá giảm dần'].map((s) => (
                  <label key={s} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="sort"
                      checked={s === 'Mặc định' ? !selectedSort : selectedSort === s}
                      onChange={() => setSelectedSort(s === 'Mặc định' ? '' : s)}
                    />
                    <span>{s}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'model' && (
                ['Tất cả', 'Vios', 'VF8', 'SantaFe', 'City', 'Xpander', 'Seltos'].map((m) => (
                  <label key={m} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="model"
                      checked={m === 'Tất cả' ? !selectedModel : selectedModel === m}
                      onChange={() => setSelectedModel(m === 'Tất cả' ? '' : m)}
                    />
                    <span>{m}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'type' && (
                ['Tất cả', 'Sedan', 'SUV / Crossover', 'MPV'].map((t) => (
                  <label key={t} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="type"
                      checked={t === 'Tất cả' ? !selectedType : selectedType === t}
                      onChange={() => setSelectedType(t === 'Tất cả' ? '' : t)}
                    />
                    <span>{t}</span>
                  </label>
                ))
              )}

              {activeDropdown === 'district' && (
                getDistrictsForLocation().map((d) => (
                  <label key={d} className="checkbox-label-pills">
                    <input
                      type="radio"
                      name="district"
                      checked={d === 'Tất cả' ? !selectedDistrict : selectedDistrict === d}
                      onChange={() => setSelectedDistrict(d === 'Tất cả' ? '' : d)}
                    />
                    <span>{d}</span>
                  </label>
                ))
              )}
            </div>
            <div className="filter-modal-footer">
              <button className="btn-filter-apply" onClick={() => setActiveDropdown(null)}>Áp dụng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS styles injected dynamically for FindCar page
const injectFindCarStyles = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'find-car-styles';
  if (document.getElementById(styleId)) {
    const oldStyle = document.getElementById(styleId);
    oldStyle.parentNode.removeChild(oldStyle);
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .find-car-page {
      max-width: 1440px;
      margin: 0 auto;
      padding: 40px 24px 80px 24px;
      font-family: 'Outfit', sans-serif;
      background: #f8fafc;
      animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Header dark banner with dynamic neon glow and background pattern */
    .find-car-banner {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 24px;
      padding: 32px 40px;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 24px;
      min-height: 96px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    /* Subtle background pattern for the banner */
    .find-car-banner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: radial-gradient(rgba(0, 150, 152, 0.15) 1px, transparent 0);
      background-size: 24px 24px;
      pointer-events: none;
      opacity: 0.7;
    }

    .find-car-title-white {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(to right, #ffffff, #8be2e4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      letter-spacing: -0.8px;
      font-family: 'Outfit', sans-serif;
      z-index: 1;
    }

    /* Premium horizontal search bar with floating glassmorphism style */
    .search-bar-premium {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      background: #ffffff;
      border-radius: 18px;
      padding: 8px 10px 8px 24px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.8);
      flex-wrap: wrap;
      gap: 8px;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .search-bar-premium:hover, .search-bar-premium:focus-within {
      box-shadow: 0 16px 40px rgba(0, 150, 152, 0.18);
      transform: translateY(-2px);
      border-color: rgba(0, 150, 152, 0.2);
    }

    .search-field-premium {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }

    .field-icon-premium {
      color: #009698;
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }

    .search-field-premium:hover .field-icon-premium {
      transform: scale(1.1);
    }

    .search-select-premium {
      border: none;
      background: transparent;
      outline: none;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      color: #0f172a;
      width: 170px;
      font-weight: 700;
      cursor: pointer;
      padding-right: 12px;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg fill='%230f172a' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
      background-repeat: no-repeat;
      background-position: right center;
    }

    .search-date-premium {
      border: none;
      background: transparent;
      outline: none;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      color: #0f172a;
      width: 135px;
      font-weight: 700;
      cursor: pointer;
    }

    .search-date-separator {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 600;
      margin: 0 8px;
    }

    .divider-vertical-premium {
      width: 1px;
      height: 32px;
      background: #e2e8f0;
      margin: 0 16px;
    }

    .btn-find-submit-premium {
      background: linear-gradient(135deg, #009698 0%, #00b2b4 100%);
      color: #ffffff;
      border: none;
      border-radius: 14px;
      padding: 14px 40px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 15px rgba(0, 150, 152, 0.25);
    }

    .btn-find-submit-premium:hover {
      background: linear-gradient(135deg, #008284 0%, #009c9e 100%);
      box-shadow: 0 6px 20px rgba(0, 150, 152, 0.4);
      transform: translateY(-1px);
    }

    .btn-find-submit-premium:active {
      transform: translateY(1px);
    }

    /* Filter pills container */
    .filter-pills-container {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 4px 0 20px 0;
      margin-bottom: 32px;
      scrollbar-width: none;
    }

    .filter-pills-container::-webkit-scrollbar {
      display: none;
    }

    .pill-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 99px;
      padding: 10px 22px;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
    }

    .pill-item:hover {
      border-color: #cbd5e1;
      color: #0f172a;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }

    .pill-item.active {
      background: linear-gradient(135deg, #009698 0%, #00bfa5 100%);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 6px 16px rgba(0, 150, 152, 0.3);
    }

    .pill-item.active .pill-icon {
      color: #ffffff !important;
    }

    .pill-icon {
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .pill-item:hover .pill-icon {
      transform: scale(1.1);
    }

    /* Grid Layout for Cars */
    .find-car-grid-container {
      width: 100%;
      margin-top: 10px;
    }

    .find-cars-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 28px;
    }

    /* Premium Car Card Design */
    .find-car-card {
      background: #ffffff;
      border: none;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .find-car-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 150, 152, 0.12);
    }

    .find-card-image-box {
      position: relative;
      width: 100%;
      height: 200px;
      background: #f1f5f9;
      overflow: hidden;
      cursor: pointer;
    }

    .find-card-image-box::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 100%);
      pointer-events: none;
    }

    .find-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .find-car-card:hover .find-card-img {
      transform: scale(1.06);
    }

    /* Top Badges styling */
    .find-card-badge-top {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 2;
    }

    .find-badge-sale {
      background: linear-gradient(135deg, #ffe4e6 0%, #ffd1d3 100%);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: #be123c;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.05);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Bottom Badges styling (Glassmorphism) */
    .find-card-badge-bottom {
      position: absolute;
      bottom: 14px;
      right: 14px;
      z-index: 2;
    }

    .find-badge-self {
      background: rgba(16, 185, 129, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    }

    .find-badge-owner {
      background: rgba(124, 58, 237, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    }

    .find-car-card-body {
      padding: 22px;
      text-align: left;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .find-car-card-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      line-height: 1.3;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: color 0.2s;
    }

    .find-car-card-title:hover {
      color: #009698;
    }

    .find-car-location {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 6px 0;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .find-car-distance-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: #94a3b8;
      margin-bottom: 16px;
      font-weight: 500;
    }

    .find-car-distance-row .info-icon {
      color: #cbd5e1;
      cursor: pointer;
      transition: color 0.2s;
    }

    .find-car-distance-row .info-icon:hover {
      color: #94a3b8;
    }

    /* Pricing Section */
    .find-car-pricing-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: auto;
    }

    .find-car-pricing-row .orig-price {
      font-size: 13px;
      color: #94a3b8;
      text-decoration: line-through;
      font-weight: 600;
    }

    .find-car-pricing-row .actual-price {
      font-size: 20px;
      font-weight: 900;
      color: #009698;
      font-family: 'Outfit', sans-serif;
    }

    .price-estimation-text {
      font-size: 11px;
      color: #94a3b8;
      margin: 4px 0 18px 0;
      font-weight: 500;
    }

    /* Specs Row */
    .find-car-specs-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      border-top: 1px solid #f1f5f9;
      padding-top: 18px;
      margin-bottom: 18px;
    }

    .spec-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 8px 4px;
      border-radius: 12px;
      color: #475569;
      font-size: 11.5px;
      font-weight: 700;
      transition: all 0.25s ease;
    }

    .find-car-card:hover .spec-item {
      background: #ffffff;
      border-color: #e2e8f0;
      box-shadow: 0 4px 10px rgba(0,0,0,0.02);
      color: #0f172a;
    }

    .spec-item svg {
      transition: transform 0.2s ease;
    }

    .find-car-card:hover .spec-item:hover svg {
      transform: translateY(-2px);
    }

    /* Checkout button */
    .btn-card-rent-premium {
      width: 100%;
      background: linear-gradient(135deg, #009698 0%, #00b2b4 100%);
      border: none;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 800;
      padding: 12px 0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 150, 152, 0.2);
    }

    .btn-card-rent-premium:hover {
      background: linear-gradient(135deg, #008284 0%, #009c9e 100%);
      box-shadow: 0 8px 20px rgba(0, 150, 152, 0.35);
      transform: translateY(-2px);
    }

    .btn-card-rent-premium:active {
      transform: translateY(0);
    }

    .find-car-loading, .find-car-empty {
      padding: 100px 24px;
      text-align: center;
      font-size: 16px;
      color: #64748b;
      font-weight: 600;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.02);
    }

    /* Premium Overlay Filter Modals */
    .filter-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .filter-modal-card {
      background: #ffffff;
      border-radius: 28px;
      width: 440px;
      max-width: 95%;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      animation: modalZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(255,255,255,0.8);
    }

    .filter-modal-header {
      padding: 22px 28px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .filter-modal-header h3 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      font-family: 'Outfit', sans-serif;
      letter-spacing: -0.3px;
    }

    .btn-close-filter-modal {
      background: #f1f5f9;
      border: none;
      color: #64748b;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-close-filter-modal:hover {
      background: #e2e8f0;
      color: #0f172a;
      transform: rotate(90deg);
    }

    .filter-modal-body {
      padding: 24px 28px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      text-align: left;
    }

    /* Custom Radio/Checkbox label rows in Modal */
    .checkbox-label-pills {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 12px 18px;
      border-radius: 14px;
      background: #f8fafc;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }

    .checkbox-label-pills:hover {
      background: #f1f5f9;
      transform: translateX(4px);
    }

    .checkbox-label-pills:has(input[type="radio"]:checked),
    .checkbox-label-pills:has(input[type="checkbox"]:checked) {
      background: rgba(0, 150, 152, 0.06);
      border-color: rgba(0, 150, 152, 0.15);
    }

    .checkbox-label-pills input[type="radio"],
    .checkbox-label-pills input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: #009698;
      cursor: pointer;
      order: 2;
    }

    .checkbox-label-pills span {
      font-size: 15px;
      font-weight: 700;
      color: #334155;
      order: 1;
    }

    .checkbox-label-pills:has(input[type="radio"]:checked) span,
    .checkbox-label-pills:has(input[type="checkbox"]:checked) span {
      color: #009698;
    }

    .filter-modal-footer {
      padding: 20px 28px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
      display: flex;
      justify-content: flex-end;
    }

    .btn-filter-apply {
      background: linear-gradient(135deg, #009698 0%, #00b2b4 100%);
      color: #ffffff;
      border: none;
      border-radius: 14px;
      padding: 12px 24px;
      font-weight: 800;
      font-size: 14.5px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 150, 152, 0.2);
    }

    .btn-filter-apply:hover {
      background: linear-gradient(135deg, #008284 0%, #009c9e 100%);
      box-shadow: 0 6px 18px rgba(0, 150, 152, 0.35);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes modalZoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 1250px) {
      .find-cars-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 990px) {
      .find-cars-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .find-car-banner {
        flex-direction: column;
        align-items: stretch;
        padding: 28px;
      }
      .search-bar-premium {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
      }
      .divider-vertical-premium {
        width: 100%;
        height: 1px;
        margin: 8px 0;
      }
      .search-field-premium {
        width: 100%;
        justify-content: flex-start;
      }
      .search-select-premium, .search-date-premium {
        width: 100%;
        flex: 1;
      }
    }

    @media (max-width: 640px) {
      .find-cars-grid {
        grid-template-columns: 1fr;
      }
      .find-car-page {
        padding: 20px 16px 60px 16px;
      }
    }
  `;
  document.head.appendChild(style);
};

injectFindCarStyles();

