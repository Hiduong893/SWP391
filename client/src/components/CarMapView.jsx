import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Star, Car as CarIcon, ShieldCheck, Zap, Layers, MapPin, Search, Maximize2, Fuel, Compass } from 'lucide-react';

const LOCATION_COORDINATES = {
  'Quận 1': [10.7756, 106.7004],
  'Quận 2': [10.7872, 106.7496],
  'Quận 3': [10.7825, 106.6853],
  'Quận 4': [10.7578, 106.7012],
  'Quận 5': [10.7542, 106.6631],
  'Quận 7': [10.7332, 106.7196],
  'Quận 10': [10.7725, 106.6675],
  'Bình Thạnh': [10.8105, 106.7091],
  'Tân Bình': [10.8015, 106.6578],
  'Gò Vấp': [10.8383, 106.6660],
  'Thủ Đức': [10.8494, 106.7727],
  'Phú Nhuận': [10.7992, 106.6803],
  'TP. Hồ Chí Minh': [10.7769, 106.7009],
  'Hồ Chí Minh': [10.7769, 106.7009],
  'Hà Nội': [21.0285, 105.8542],
  'Hoàn Kiếm': [21.0285, 105.8542],
  'Ba Đình': [21.0341, 105.8194],
  'Cầu Giấy': [21.0362, 105.7906],
  'Thanh Xuân': [20.9934, 105.8078],
  'Đống Đa': [21.0125, 105.8281],
  'Đà Nẵng': [16.0544, 108.2022],
  'Hải Châu': [16.0602, 108.2208],
  'Sơn Trà': [16.0841, 108.2435],
  'Ngũ Hành Sơn': [16.0270, 108.2505]
};

const TILE_LAYERS = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  }
};

const getCarCoords = (car, index) => {
  const loc = (car.location || '').trim();
  let baseCoords = [10.7769, 106.7009];

  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (loc.toLowerCase().includes(key.toLowerCase())) {
      baseCoords = coords;
      break;
    }
  }

  const latOffset = (((index * 13) % 11) - 5) * 0.0035;
  const lngOffset = (((index * 17) % 13) - 6) * 0.0035;
  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
};

export const CarMapView = ({ cars = [], onRentCarClick, user }) => {
  const [selectedCar, setSelectedCar] = useState(cars[0] || null);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [mapStyle, setMapStyle] = useState('voyager'); // 'voyager' | 'satellite' | 'dark'
  const [searchQuery, setSearchQuery] = useState('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  // 1. Load Leaflet Assets dynamically
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Filter cars
  const filteredCars = cars.filter(c => {
    const loc = (c.location || '').toLowerCase();
    const brand = (c.brand || '').toLowerCase();
    const model = (c.model || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesQuery = !query || loc.includes(query) || brand.includes(query) || model.includes(query);

    if (!matchesQuery) return false;

    if (selectedRegion === 'hanoi') return loc.includes('hà nội') || loc.includes('ha noi');
    if (selectedRegion === 'danang') return loc.includes('đà nẵng') || loc.includes('da nang');
    if (selectedRegion === 'hcm') return loc.includes('hồ chí minh') || loc.includes('hcm') || loc.includes('quận') || loc.includes('thủ đức');
    return true;
  });

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const initialCoords = [10.7769, 106.7009];
    const map = L.map(mapRef.current, {
      center: initialCoords,
      zoom: 12,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerConfig = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      maxZoom: 19,
      attribution: layerConfig.attribution
    }).addTo(map);

    mapInstanceRef.current = map;
  }, [leafletLoaded]);

  // 3. Switch Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !tileLayerRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    map.removeLayer(tileLayerRef.current);
    const layerConfig = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      maxZoom: 19,
      attribution: layerConfig.attribution
    }).addTo(map);
  }, [mapStyle]);

  // 4. Render Markers
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    filteredCars.forEach((car, idx) => {
      const coords = getCarCoords(car, idx);
      const isSelected = selectedCar?.id === car.id;
      const priceK = Math.round((car.pricePerDay || 0) / 1000) + 'K';

      const customHtml = `
        <div class="leaflet-custom-marker ${isSelected ? 'marker-selected' : ''}">
          <div class="marker-pill">
            <span class="marker-icon">🚗</span>
            <span class="marker-price">${priceK}/ngày</span>
          </div>
          <div class="marker-arrow"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'leaflet-car-div-icon',
        html: customHtml,
        iconSize: [95, 36],
        iconAnchor: [47, 36]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedCar(car);
        map.flyTo(coords, 14, { duration: 0.8 });
      });

      markersRef.current[car.id] = marker;
    });

    if (filteredCars.length > 0 && selectedCar) {
      const idx = filteredCars.findIndex(c => c.id === selectedCar.id);
      if (idx >= 0) {
        const targetCoords = getCarCoords(selectedCar, idx);
        map.flyTo(targetCoords, 13, { duration: 0.8 });
      }
    }
  }, [leafletLoaded, filteredCars, selectedCar]);

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    if (region === 'hanoi') map.flyTo([21.0285, 105.8542], 12, { duration: 1 });
    else if (region === 'danang') map.flyTo([16.0544, 108.2022], 12, { duration: 1 });
    else if (region === 'hcm' || region === 'all') map.flyTo([10.7769, 106.7009], 12, { duration: 1 });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '0',
      height: '680px',
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(15, 23, 42, 0.1)',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* MAP CANVAS (LEFT) */}
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        
        <style>{`
          .leaflet-car-div-icon {
            background: transparent !important;
            border: none !important;
          }
          .leaflet-custom-marker {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .leaflet-custom-marker:hover {
            transform: scale(1.12) translateY(-6px);
            z-index: 9999 !important;
          }
          .leaflet-custom-marker .marker-pill {
            background: #ffffff;
            color: #0f172a;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12.5px;
            font-weight: 800;
            border: 2px solid #2563eb;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .leaflet-custom-marker.marker-selected .marker-pill {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #38bdf8;
            border: 2px solid #38bdf8;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.5);
            transform: scale(1.08);
          }
          .leaflet-custom-marker .marker-arrow {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid #2563eb;
            margin-top: -1px;
          }
          .leaflet-custom-marker.marker-selected .marker-arrow {
            border-top-color: #38bdf8;
          }
        `}</style>

        {/* Leaflet Map Target */}
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Floating Top Header Bar */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}>
          {/* Live Status Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            borderRadius: '18px',
            padding: '10px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.18)',
            pointerEvents: 'auto'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse 1.8s infinite' }} />
            <style>{`@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }`}</style>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.2px' }}>
              Bản Đồ Xe Trực Tuyến ({filteredCars.length} vị trí)
            </span>
          </div>

          {/* Region Tabs & Style Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto'
          }}>
            {/* City Region Selectors */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(16px)',
              padding: '5px',
              borderRadius: '18px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.9)'
            }}>
              <button
                onClick={() => handleRegionChange('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRegion === 'all' ? '#2563eb' : 'transparent',
                  color: selectedRegion === 'all' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                Tất cả
              </button>
              <button
                onClick={() => handleRegionChange('hcm')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRegion === 'hcm' ? '#2563eb' : 'transparent',
                  color: selectedRegion === 'hcm' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                TP. HCM
              </button>
              <button
                onClick={() => handleRegionChange('hanoi')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRegion === 'hanoi' ? '#2563eb' : 'transparent',
                  color: selectedRegion === 'hanoi' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                Hà Nội
              </button>
              <button
                onClick={() => handleRegionChange('danang')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedRegion === 'danang' ? '#2563eb' : 'transparent',
                  color: selectedRegion === 'danang' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s'
                }}
              >
                Đà Nẵng
              </button>
            </div>

            {/* Map Theme Selector Switcher */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(16px)',
              padding: '5px',
              borderRadius: '18px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <button
                onClick={() => setMapStyle('voyager')}
                title="Bản đồ đường phố mượt"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'voyager' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'voyager' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🗺️ Phố
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                title="Bản đồ Vệ tinh thực tế"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'satellite' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'satellite' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🛰️ Vệ tinh
              </button>
              <button
                onClick={() => setMapStyle('dark')}
                title="Bản đồ Chế độ tối sang trọng"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'dark' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'dark' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🌙 Tối
              </button>
            </div>
          </div>
        </div>

        {/* Floating Quick Search Bar (Bottom Left) */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          width: '280px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          borderRadius: '18px',
          padding: '8px 14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          border: '1px solid rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Search size={16} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Tìm quận, dòng xe trên bản đồ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#0f172a'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* CAR DETAILS SIDEBAR (RIGHT) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0'
      }}>
        {/* Selected Car Details Card */}
        {selectedCar ? (
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '180px', marginBottom: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
              <img src={selectedCar.image} alt={selectedCar.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                backdropFilter: 'blur(8px)',
                padding: '5px 12px',
                borderRadius: '12px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <MapPin size={13} style={{ color: '#38bdf8' }} /> {selectedCar.location}
              </div>
              <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#059669',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <ShieldCheck size={13} /> Sẵn sàng giao xe
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  {selectedCar.brand} {selectedCar.model}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    🚗 {selectedCar.seats || 5} chỗ • {selectedCar.transmission || 'Tự động'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={13} fill="#f59e0b" color="#f59e0b" /> 4.9 (18 chuyến)
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>
                  {(selectedCar.pricePerDay || 0).toLocaleString('vi-VN')} đ
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>/ 24 giờ</span>
              </div>
            </div>

            <button
              onClick={() => onRentCarClick && onRentCarClick(selectedCar)}
              style={{
                width: '100%',
                marginTop: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '13px',
                fontSize: '14.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={17} /> Thuê Ngay Xe Này
            </button>
          </div>
        ) : (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Compass size={32} style={{ color: '#cbd5e1' }} />
            Chọn một địa điểm xe trên bản đồ để xem chi tiết
          </div>
        )}

        {/* Scrollable List of Location Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Vị trí khả dụng ({filteredCars.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCars.map((car, idx) => {
              const isSel = selectedCar?.id === car.id;
              return (
                <div
                  key={car.id}
                  onClick={() => {
                    setSelectedCar(car);
                    if (mapInstanceRef.current) {
                      const coords = getCarCoords(car, idx);
                      mapInstanceRef.current.flyTo(coords, 14, { duration: 0.8 });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '16px',
                    border: isSel ? '2px solid #2563eb' : '1px solid #f1f5f9',
                    background: isSel ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={car.image} alt={car.model} style={{ width: '64px', height: '50px', objectFit: 'cover', borderRadius: '10px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {car.brand} {car.model}
                    </h5>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} style={{ color: '#2563eb', flexShrink: 0 }} /> {car.location}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#2563eb' }}>
                      {Math.round(car.pricePerDay / 1000)}K
                    </span>
                    <span style={{ display: 'block', fontSize: '10.5px', color: '#94a3b8' }}>/ngày</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
