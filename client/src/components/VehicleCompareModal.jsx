import React from 'react';
import { XCircle, Scale, Check, ShieldCheck, Zap, Star, Users, Fuel, Settings, Sparkles } from 'lucide-react';

export const VehicleCompareModal = ({ cars = [], onClose, onRentCarClick }) => {
  if (!cars || cars.length === 0) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="lightbox-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1000px',
          width: '95%',
          maxHeight: '92vh',
          borderRadius: '24px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          background: '#ffffff'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Scale size={24} style={{ color: '#38bdf8' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                So Sánh Chi Tiết Phương Tiện ({cars.length}/3 XE)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                Đối chiếu trực quan thông số, tính năng và giá thuê để đưa ra lựa chọn tối ưu nhất
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Comparison Grid Table Container */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `180px repeat(${cars.length}, 1fr)`,
            gap: '16px',
            alignItems: 'stretch'
          }}>
            {/* ROW 1: CAR HEADER & CARDS */}
            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
              Xe & Hình ảnh
            </div>
            {cars.map(car => (
              <div key={car.id} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}>
                <div>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', height: '140px', marginBottom: '12px' }}>
                    <img src={car.image} alt={car.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {car.brand} {car.model}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Quận {car.location?.replace('Quận ', '')}</p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onRentCarClick) onRentCarClick(car);
                  }}
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Zap size={14} /> Thuê Ngay
                </button>
              </div>
            ))}

            {/* ROW 2: PRICE PER DAY */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Giá thuê theo ngày
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>
                  {(car.pricePerDay || 0).toLocaleString('vi-VN')} đ
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>/ 24 giờ</span>
              </div>
            ))}

            {/* ROW 3: PRICE 4 HOURS */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Giá gói 4 giờ
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#059669' }}>
                  {car.price4h ? `${car.price4h.toLocaleString('vi-VN')} đ` : `${Math.round((car.pricePerDay || 1000000) * 0.6).toLocaleString('vi-VN')} đ`}
                </span>
              </div>
            ))}

            {/* ROW 4: SEATS */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Số chỗ ngồi
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                {car.seats || 5} chỗ
              </div>
            ))}

            {/* ROW 5: TRANSMISSION */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Hộp số
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                {car.transmission || 'Tự động'}
              </div>
            ))}

            {/* ROW 6: FUEL TYPE */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Nhiên liệu
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                {car.fuel || 'Xăng'}
              </div>
            ))}

            {/* ROW 7: RATING & TRIPS */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Đánh giá & Chuyến
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} style={{ fill: '#f59e0b', color: '#f59e0b' }} /> {car.rating || 5.0}
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  ({car.totalTrips || car.completedTrips || 12} chuyến)
                </span>
              </div>
            ))}

            {/* ROW 8: FEATURES */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Tính năng nổi bật
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'left' }}>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                  <li>Bản đồ GPS chỉ đường</li>
                  <li>Camera lùi / Cam 360</li>
                  <li>Kết nối Bluetooth / Apple CarPlay</li>
                  {car.seats > 5 && <li>Hàng ghế thứ 3 rộng rãi</li>}
                </ul>
              </div>
            ))}

            {/* ROW 9: DEPOSIT REQUIREMENT */}
            <div style={{ padding: '12px 0', fontWeight: 700, color: '#475569', fontSize: '13px', borderTop: '1px solid #e2e8f0' }}>
              Chính sách thế chân
            </div>
            {cars.map(car => (
              <div key={car.id} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                ✓ 15.000.000 đ (Xe máy / Tiền mặt)
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          background: '#f8fafc',
          display: 'flex',
          justify: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '10px 24px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Đóng bảng so sánh
          </button>
        </div>
      </div>
    </div>
  );
};
