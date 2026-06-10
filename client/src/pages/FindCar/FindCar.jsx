import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, SlidersHorizontal, Users, Fuel, Info, Sparkles, Zap, Key, Compass, Car } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const FindCar = ({ user, setCurrentTab }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchCars = async () => {
    setLoading(true);
    try {
      // Gọi API lấy toàn bộ danh sách xe từ database
      const data = await api.cars.getCars();
      setCars(data);
    } catch (error) {
      showToast('Không thể tải danh sách xe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  return (
    <div className="find-car-page">
      {/* HEADER BANNER MÀU TỐI */}
      <div className="find-car-banner">
        <h1 className="find-car-title-white">Tìm xe tự lái</h1>

        {/* BỘ LỌC TÌM KIẾM CỠ LỚN */}
        <div className="search-bar-premium">
          <div className="search-field-premium">
            <MapPin size={18} className="field-icon-premium" />
            <input 
              type="text" 
              placeholder="Chọn địa điểm tìm xe" 
              defaultValue="Chọn địa điểm tìm xe"
              className="search-input-premium"
              readOnly
            />
          </div>
          <div className="divider-vertical-premium" />
          <div className="search-field-premium">
            <Calendar size={18} className="field-icon-premium" />
            <input 
              type="text" 
              placeholder="Chọn thời gian" 
              defaultValue="22:00, 31/05/2026 đến 02:00, 03/06/2026"
              className="search-input-premium-wide"
              readOnly
            />
          </div>
          <button className="btn-find-submit-premium" onClick={() => showToast('Tính năng tìm kiếm nâng cao đang được tích hợp!', 'info')}>
            TÌM XE
          </button>
        </div>
      </div>

      {/* FILTER PILLS MOCKUPS */}
      <div className="filter-pills-container">
        <button className="pill-item active">Tất cả</button>
        <button className="pill-item">
          <Zap size={14} className="pill-icon" style={{ color: '#10b981' }} />
          <span>Sale</span>
        </button>
        <button className="pill-item">
          <Key size={14} className="pill-icon" />
          <span>Hình thức thuê</span>
        </button>
        <button className="pill-item">
          <Users size={14} className="pill-icon" />
          <span>Số chỗ</span>
        </button>
        <button className="pill-item">
          <Compass size={14} className="pill-icon" />
          <span>Hãng xe</span>
        </button>
        <button className="pill-item">
          <Car size={14} className="pill-icon" />
          <span>Mẫu xe</span>
        </button>
        <button className="pill-item">
          <SlidersHorizontal size={14} className="pill-icon" />
          <span>Loại xe</span>
        </button>
        <button className="pill-item">
          <Fuel size={14} className="pill-icon" />
          <span>Nhiên liệu</span>
        </button>
        <button className="pill-item">
          <MapPin size={14} className="pill-icon" />
          <span>Khu vực xe</span>
        </button>
        <button className="pill-item">
          <Sparkles size={14} className="pill-icon" style={{ color: '#eab308' }} />
          <span>Xế xịn</span>
        </button>
      </div>

      {/* RENDER CAR GRID */}
      {loading ? (
        <div className="find-car-loading">Đang tải danh sách toàn bộ xe...</div>
      ) : cars.length === 0 ? (
        <div className="find-car-empty">
          <Info size={48} className="text-muted" />
          <p>Hiện tại không có xe nào trong hệ thống.</p>
        </div>
      ) : (
        <div className="find-car-grid-container">
          <div className="find-cars-grid">
            {cars.map((car) => {
              // Tính toán các giá hiển thị giống như RentCar.jsx
              const dayPriceOrig = Math.round((car.pricePerDay * 1.1) / 1000) + 'K';
              const dayPriceActual = Math.round(car.pricePerDay / 1000) + 'K';
              
              // Khoảng cách giả lập cho đẹp mắt
              const mockDistance = (2 + Math.random() * 3).toFixed(1);

              return (
                <div key={car.id} className="find-car-card">
                  {/* Image container */}
                  <div className="find-card-image-box">
                    <img src={car.image} alt={car.model} className="find-card-img" />
                    
                    {/* Badge Sale góc trên trái */}
                    <div className="find-card-badge-top">
                      <span className="find-badge-sale">🏷️ Giảm 10%</span>
                    </div>

                    {/* Badge Nhận xe góc dưới phải */}
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
                    <h3 className="find-car-card-title">
                      {car.brand.toUpperCase()} {car.model}
                    </h3>
                    
                    <p className="find-car-location">
                      Quận {car.location.replace('Quận ', '')}
                    </p>

                    <div className="find-car-distance-row">
                      <span>~ {mockDistance} km</span>
                      <Info size={12} className="info-icon" title="Khoảng cách ước tính" />
                    </div>

                    {/* Pricing */}
                    <div className="find-car-pricing-row">
                      <span className="orig-price">{dayPriceOrig}</span>
                      <span className="actual-price">{dayPriceActual}/ngày</span>
                    </div>
                    
                    <div className="price-estimation-text">
                      Giá tạm tính chưa bao gồm VAT
                    </div>

                    {/* Specs Row */}
                    <div className="find-car-specs-row">
                      <div className="spec-item" title="Số chỗ">
                        <Users size={12} />
                        <span>{car.seats} chỗ</span>
                      </div>
                      <div className="spec-item" title="Hộp số">
                        <SlidersHorizontal size={12} />
                        <span>{car.transmission || 'Tự động'}</span>
                      </div>
                      <div className="spec-item" title="Nhiên liệu">
                        <Fuel size={12} />
                        <span>{car.fuel || 'Xăng'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS injected dynamically for FindCar page
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
      padding: 0 24px 60px 24px;
      font-family: 'Outfit', sans-serif;
      background: #f8fafc;
      animation: fadeIn 0.4s ease-out;
    }

    /* Header dark banner */
    .find-car-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      border-radius: 8px;
      padding: 20px 32px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
      min-height: 84px;
    }

    .find-car-title-white {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }

    /* Premium horizontal search bar */
    .search-bar-premium {
      display: flex;
      align-items: center;
      background: #ffffff;
      border-radius: 8px;
      padding: 4px 6px 4px 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border: 1px solid #cbd5e1;
      flex-wrap: wrap;
    }

    .search-field-premium {
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
    }

    .field-icon-premium {
      color: #009698;
      flex-shrink: 0;
    }

    .search-input-premium {
      border: none;
      background: transparent;
      outline: none;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      color: #334155;
      width: 180px;
      font-weight: 600;
    }

    .search-input-premium-wide {
      border: none;
      background: transparent;
      outline: none;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      color: #334155;
      width: 320px;
      font-weight: 600;
    }

    .divider-vertical-premium {
      width: 1px;
      height: 24px;
      background: #e2e8f0;
      margin: 0 20px;
    }

    .btn-find-submit-premium {
      background: #009698;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 12px 32px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      transition: background 0.2s;
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.5px;
      margin-left: 10px;
    }

    .btn-find-submit-premium:hover {
      background: #00797b;
    }

    /* Filter pills */
    .filter-pills-container {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 4px 0 16px 0;
      margin-bottom: 30px;
      scrollbar-width: none;
    }

    .filter-pills-container::-webkit-scrollbar {
      display: none;
    }

    .pill-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 99px;
      padding: 8px 18px;
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pill-item:hover {
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .pill-item.active {
      background: #009698;
      border-color: #009698;
      color: #ffffff;
    }

    .pill-icon {
      flex-shrink: 0;
    }

    /* Grid Layout */
    .find-car-grid-container {
      width: 100%;
    }

    .find-cars-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }

    /* Car card */
    .find-car-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 15px rgba(0,0,0,0.01);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .find-car-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 150, 152, 0.06);
      border-color: rgba(0, 150, 152, 0.2);
    }

    .find-card-image-box {
      position: relative;
      width: 100%;
      height: 180px;
      background: #f8fafc;
    }

    .find-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .find-card-badge-top {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 2;
    }

    .find-badge-sale {
      background: #ffe4e6;
      border: 1px solid #fecdd3;
      color: #9f1239;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .find-card-badge-bottom {
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 2;
    }

    .find-badge-self {
      background: rgba(0, 150, 152, 0.9);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .find-badge-owner {
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .find-car-card-body {
      padding: 16px;
      text-align: left;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .find-car-card-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
      line-height: 1.4;
    }

    .find-car-location {
      font-size: 12.5px;
      color: #64748b;
      margin: 0 0 6px 0;
    }

    .find-car-distance-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 12px;
    }

    .find-car-distance-row .info-icon {
      cursor: help;
    }

    .find-car-pricing-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: auto;
    }

    .find-car-pricing-row .orig-price {
      font-size: 12px;
      color: #94a3b8;
      text-decoration: line-through;
      font-weight: 600;
    }

    .find-car-pricing-row .actual-price {
      font-size: 16px;
      font-weight: 800;
      color: #009698;
    }

    .price-estimation-text {
      font-size: 10px;
      color: #94a3b8;
      margin: 2px 0 12px 0;
    }

    .find-car-specs-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }

    .spec-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 6px 2px;
      border-radius: 6px;
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
    }

    .find-car-loading, .find-car-empty {
      padding: 60px 24px;
      text-align: center;
      font-size: 15px;
      color: #64748b;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1200px) {
      .find-cars-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 900px) {
      .find-car-banner {
        flex-direction: column;
        align-items: flex-start;
      }
      .search-bar-premium {
        width: 100%;
        justify-content: space-between;
      }
    }

    @media (max-width: 768px) {
      .find-cars-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .find-cars-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
};

injectFindCarStyles();
