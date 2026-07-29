import React, { useState } from 'react';
import { MapPin, Navigation, Star, Car as CarIcon, ShieldCheck, Zap, Layers, Filter } from 'lucide-react';

export const CarMapView = ({ cars = [], onRentCarClick, user }) => {
  const [selectedCar, setSelectedCar] = useState(cars[0] || null);
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // Simulated coordinate offsets for HCM Districts for visual presentation
  const districtCoords = {
    'Quận 1': { top: '45%', left: '48%' },
    'Quận 2': { top: '38%', left: '62%' },
    'Quận 3': { top: '48%', left: '42%' },
    'Quận 7': { top: '65%', left: '55%' },
    'Quận 10': { top: '52%', left: '38%' },
    'Bình Thạnh': { top: '32%', left: '50%' },
    'Tân Bình': { top: '40%', left: '30%' },
    'Gò Vấp': { top: '25%', left: '38%' },
    'Thủ Đức': { top: '22%', left: '68%' }
  };

  const getPosForCar = (car, index) => {
    const loc = car.location || 'Quận 1';
    let base = districtCoords[loc];
    if (!base) {
      // Find matching district key
      const foundKey = Object.keys(districtCoords).find(k => loc.includes(k));
      base = foundKey ? districtCoords[foundKey] : { top: `${35 + (index * 7) % 40}%`, left: `${30 + (index * 11) % 45}%` };
    }
    // Add deterministic offset based on car id
    const offsetTop = ((index * 17) % 12) - 6;
    const offsetLeft = ((index * 23) % 14) - 7;

    const topVal = parseFloat(base.top) + offsetTop;
    const leftVal = parseFloat(base.left) + offsetLeft;
    return { top: `${topVal}%`, left: `${leftVal}%` };
  };

  const districts = ['all', ...Array.from(new Set(cars.map(c => c.location).filter(Boolean)))];

  const filteredCars = selectedDistrict === 'all'
    ? cars
    : cars.filter(c => c.location === selectedDistrict);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '20px',
      height: '650px',
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* MAP CANVAS (LEFT) */}
      <div style={{
        position: 'relative',
        background: '#e5e3df',
        backgroundImage: `radial-gradient(#cbd5e1 1.5px, transparent 1.5px), radial-gradient(#cbd5e1 1.5px, #f1f5f9 1.5px)`,
        backgroundSize: '30px 30px',
        backgroundPosition: '0 0, 15px 15px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Map Header Overlay */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '10px 18px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.8)'
          }}>
            <Navigation size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
              Bản Đồ Xe Thuê Sài Gòn ({filteredCars.length} vị trí)
            </span>
          </div>

          {/* District Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            padding: '6px 10px',
            borderRadius: '16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.8)',
            maxWidth: '50%'
          }}>
            {districts.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDistrict(d)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: selectedDistrict === d ? '#2563eb' : '#f1f5f9',
                  color: selectedDistrict === d ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                {d === 'all' ? 'Tất cả khu vực' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Decorative Map Grid Roads / River effect */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.2, pointerEvents: 'none' }}>
          <path d="M 0 200 Q 250 150 400 350 T 800 400" fill="none" stroke="#2563eb" strokeWidth="30" />
          <path d="M 150 0 L 150 650 M 450 0 L 450 650 M 0 320 L 800 320" fill="none" stroke="#94a3b8" strokeWidth="8" strokeDasharray="10,10" />
        </svg>

        {/* Map Pins */}
        {filteredCars.map((car, index) => {
          const pos = getPosForCar(car, index);
          const isSelected = selectedCar?.id === car.id;
          const priceText = Math.round(car.pricePerDay / 1000) + 'K';

          return (
            <div
              key={car.id}
              onClick={() => setSelectedCar(car)}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                transform: 'translate(-50%, -100%)',
                cursor: 'pointer',
                zIndex: isSelected ? 30 : 15,
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <div style={{
                background: isSelected ? 'linear-gradient(135deg, #0f172a, #1e293b)' : '#ffffff',
                color: isSelected ? '#ffffff' : '#0f172a',
                padding: '6px 12px',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '12.5px',
                boxShadow: isSelected ? '0 8px 25px rgba(15, 23, 42, 0.4)' : '0 4px 14px rgba(0,0,0,0.15)',
                border: isSelected ? '2px solid #38bdf8' : '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}>
                <MapPin size={14} style={{ color: isSelected ? '#38bdf8' : '#2563eb' }} />
                <span>{priceText}/ngày</span>
              </div>
              {/* Pin pointer tip */}
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `8px solid ${isSelected ? '#1e293b' : '#ffffff'}`,
                margin: '0 auto'
              }} />
            </div>
          );
        })}
      </div>

      {/* CAR LIST & DETAILS SIDEBAR (RIGHT) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0'
      }}>
        {/* Selected Car Highlight */}
        {selectedCar ? (
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '180px', marginBottom: '14px' }}>
              <img src={selectedCar.image} alt={selectedCar.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {selectedCar.location}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedCar.brand} {selectedCar.model}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {selectedCar.seats || 5} chỗ • {selectedCar.transmission || 'Tự động'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>
                  {(selectedCar.pricePerDay || 0).toLocaleString('vi-VN')} đ
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>/ ngày</span>
              </div>
            </div>

            <button
              onClick={() => onRentCarClick && onRentCarClick(selectedCar)}
              style={{
                width: '100%',
                marginTop: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Zap size={16} /> Thuê Ngay Trên Bản Đồ
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
            Chọn một địa điểm xe trên bản đồ để xem chi tiết
          </div>
        )}

        {/* Scrollable list of cars */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Danh sách xe ({filteredCars.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCars.map(car => (
              <div
                key={car.id}
                onClick={() => setSelectedCar(car)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '14px',
                  border: selectedCar?.id === car.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: selectedCar?.id === car.id ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <img src={car.image} alt={car.model} style={{ width: '60px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h5 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {car.brand} {car.model}
                  </h5>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                    Quận {car.location?.replace('Quận ', '')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb' }}>
                    {Math.round(car.pricePerDay / 1000)}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
