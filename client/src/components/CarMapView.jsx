import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Star, Car as CarIcon, ShieldCheck, Zap, Layers, MapPin, Search, Maximize2, Fuel, Compass } from 'lucide-react';

const LOCATION_COORDINATES = {
  // TP. Hồ Chí Minh
  'Quận 1': [10.7756, 106.7004],
  'Quận 2': [10.7872, 106.7496],
  'Quận 3': [10.7825, 106.6853],
  'Quận 4': [10.7578, 106.7012],
  'Quận 5': [10.7542, 106.6631],
  'Quận 6': [10.7481, 106.6353],
  'Quận 7': [10.7332, 106.7196],
  'Quận 8': [10.7242, 106.6286],
  'Quận 9': [10.8428, 106.8286],
  'Quận 10': [10.7725, 106.6675],
  'Quận 11': [10.7628, 106.6508],
  'Quận 12': [10.8672, 106.6414],
  'Bình Thạnh': [10.8105, 106.7091],
  'Tân Bình': [10.8015, 106.6578],
  'Gò Vấp': [10.8383, 106.6660],
  'Thủ Đức': [10.8494, 106.7727],
  'Phú Nhuận': [10.7992, 106.6803],
  'Tân Phú': [10.7901, 106.6280],
  'Bình Tân': [10.7656, 106.6022],
  'Hóc Môn': [10.8842, 106.5919],
  'Củ Chi': [11.0067, 106.5139],
  'Bình Chánh': [10.6875, 106.5947],
  'Nhà Bè': [10.6558, 106.7328],
  'TP. Hồ Chí Minh': [10.7769, 106.7009],
  'Hồ Chí Minh': [10.7769, 106.7009],
  'Sài Gòn': [10.7769, 106.7009],
  'HCM': [10.7769, 106.7009],

  // Hà Nội (Nội thành)
  'Hà Nội': [21.0285, 105.8542],
  'Ha Noi': [21.0285, 105.8542],
  'Hoàn Kiếm': [21.0285, 105.8542],
  'Ba Đình': [21.0341, 105.8194],
  'Cầu Giấy': [21.0362, 105.7906],
  'Thanh Xuân': [20.9934, 105.8078],
  'Đống Đa': [21.0125, 105.8281],
  'Hai Bà Trưng': [21.0089, 105.8550],
  'Tây Hồ': [21.0502, 105.8219],
  'Long Biên': [21.0368, 105.8706],
  'Nam Từ Liêm': [21.0162, 105.7647],
  'Bắc Từ Liêm': [21.0406, 105.7653],
  'Hà Đông': [20.9719, 105.7774],
  'Hoàng Mai': [20.9772, 105.8450],

  // Đà Nẵng
  'Đà Nẵng': [16.0544, 108.2022],
  'Da Nang': [16.0544, 108.2022],
  'Hải Châu': [16.0602, 108.2208],
  'Sơn Trà': [16.0841, 108.2435],
  'Ngũ Hành Sơn': [16.0270, 108.2505],
  'Thanh Khê': [16.0617, 108.1884],
  'Liên Chiểu': [16.0961, 108.1472],
  'Cẩm Lệ': [16.0125, 108.1969],

  // Đà Lạt
  'Đà Lạt': [11.9404, 108.4583],
  'Da Lat': [11.9404, 108.4583],

  // Bình Dương
  'Bình Dương': [11.0006, 106.6558],
  'Thủ Dầu Một': [11.0006, 106.6558],
  'Dĩ An': [10.9069, 106.7725],
  'Thuận An': [10.9306, 106.7028]
};

const TILE_LAYERS = {
  googleRoadmap: {
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  googleHybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite'
  },
  googleTerrain: {
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Terrain'
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap'
  }
};

const HANOI_DISTRICTS = [
  [21.0285, 105.8542], // Hoàn Kiếm (Trung tâm)
  [21.0362, 105.7906], // Cầu Giấy (Phía Tây)
  [20.9719, 105.7774], // Hà Đông (Tây Nam)
  [21.0368, 105.8856], // Long Biên (Phía Đông)
  [21.0652, 105.8219], // Tây Hồ (Phía Bắc)
  [20.9672, 105.8450], // Hoàng Mai (Phía Nam)
  [21.0162, 105.7547], // Nam Từ Liêm / Mỹ Đình
  [21.0506, 105.7453], // Bắc Từ Liêm / Nhổn
  [21.0123, 105.9112], // Gia Lâm
  [21.1425, 105.8450], // Đông Anh (Phía Bắc)
  [21.0089, 105.8550], // Hai Bà Trưng
  [20.9934, 105.8078]  // Thanh Xuân
];

const HCM_DISTRICTS = [
  [10.7756, 106.7004], // Quận 1 (Trung tâm)
  [10.7332, 106.7196], // Quận 7 (Phía Nam)
  [10.8072, 106.7596], // Thủ Đức / Thảo Điền (Phía Đông)
  [10.8015, 106.6578], // Tân Bình / Sân Bay (Phía Tây)
  [10.8105, 106.7091], // Bình Thạnh
  [10.8483, 106.6660], // Gò Vấp (Phía Bắc)
  [10.7725, 106.6675], // Quận 10
  [10.7901, 106.6280], // Tân Phú
  [10.7656, 106.5922], // Bình Tân (Tây Nam)
  [10.8772, 106.6414], // Quận 12 (Tây Bắc)
  [10.8494, 106.7727], // Thủ Đức (Phía Đông)
  [10.7242, 106.6086], // Quận 8
  [10.6558, 106.7328]  // Nhà Bè (Phía Nam)
];

const DANANG_DISTRICTS = [
  [16.0602, 108.2208], // Hải Châu
  [16.0841, 108.2435], // Sơn Trà
  [16.0270, 108.2505], // Ngũ Hành Sơn
  [16.0617, 108.1884], // Thanh Khê
  [16.0961, 108.1472], // Liên Chiểu
  [16.0125, 108.1969]  // Cẩm Lệ
];

const getCarCoords = (car, index) => {
  const loc = (car.location || '').trim().toLowerCase();

  const isHanoi = loc.includes('hà nội') || loc.includes('ha noi');
  const isDanang = loc.includes('đà nẵng') || loc.includes('da nang');
  const isDalat = loc.includes('đà lạt') || loc.includes('da lat');

  let baseCoords = null;

  // 1. Try to match specific district in location string
  for (const [key, coords] of Object.entries(LOCATION_COORDINATES)) {
    const keyLower = key.toLowerCase();
    if (!['hà nội', 'ha noi', 'đà nẵng', 'da nang', 'tp. hồ chí minh', 'hồ chí minh', 'hcm', 'sài gòn'].includes(keyLower)) {
      if (loc.includes(keyLower)) {
        baseCoords = coords;
        break;
      }
    }
  }

  // 2. Fallback: Distribute evenly across wide regional district centers
  if (!baseCoords) {
    if (isHanoi) baseCoords = HANOI_DISTRICTS[index % HANOI_DISTRICTS.length];
    else if (isDanang) baseCoords = DANANG_DISTRICTS[index % DANANG_DISTRICTS.length];
    else if (isDalat) baseCoords = [11.9404, 108.4583];
    else baseCoords = HCM_DISTRICTS[index % HCM_DISTRICTS.length];
  }

  // 3. Realistic urban street dispersion (1.2km - 3.5km offset) so every marker lands directly on real urban streets
  const angle = (index * 137.5) * (Math.PI / 180);
  const radius = 0.009 + (index % 5) * 0.006;

  const latOffset = Math.sin(angle) * radius;
  const lngOffset = Math.cos(angle) * radius * 1.25;

  return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
};

export const CarMapView = ({ cars = [], onRentCarClick, user }) => {
  const [selectedCar, setSelectedCar] = useState(cars[0] || null);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [mapStyle, setMapStyle] = useState('googleRoadmap'); // Default to Official Google Maps Roadmap
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
    if (selectedRegion === 'hcm') return loc.includes('hồ chí minh') || loc.includes('hcm') || loc.includes('quận') || loc.includes('thủ đức') || loc.includes('sài gòn');
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

  const carCoordsMapRef = useRef({});

  // 4. Render Markers (ONCE per filteredCars change)
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};
    carCoordsMapRef.current = {};

    const allCoords = [];

    filteredCars.forEach((car, idx) => {
      const coords = getCarCoords(car, idx);
      allCoords.push(coords);
      carCoordsMapRef.current[car.id] = coords;
      carCoordsMapRef.current[String(car.id)] = coords;

      const isSelected = selectedCar && String(selectedCar.id) === String(car.id);
      const carName = `${car.brand || ''} ${car.model || ''}`.trim() || car.name || 'Xe cho thuê';
      const priceK = Math.round((car.pricePerDay || 0) / 1000) + 'K';
      const locationName = (car.location || '').trim() || 'Hà Nội';

      const customHtml = `
        <div id="marker-car-${car.id}" class="google-map-marker ${isSelected ? 'marker-selected' : ''}">
          <div class="google-marker-badge">
            <div class="marker-top-row">
              <span class="marker-car-icon">🚗</span>
              <span class="marker-car-name">${carName}</span>
            </div>
            <div class="marker-bottom-row">
              <span class="marker-loc-badge">📍 ${locationName}</span>
              <span class="marker-dot">•</span>
              <span class="marker-price-val">${priceK}/ngày</span>
            </div>
          </div>
          <div class="google-marker-tip"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'leaflet-car-div-icon',
        html: customHtml,
        iconSize: [210, 52],
        iconAnchor: [105, 52]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; text-align: center; padding: 6px 10px;">
          <strong style="font-size: 14px; color: #0f172a; display: block; margin-bottom: 2px;">${carName}</strong>
          <div style="font-size: 12px; color: #0284c7; font-weight: 700; margin-bottom: 4px;">📍 ${locationName}</div>
          <span style="color: #2563eb; font-weight: 900; font-size: 14px;">${priceK}/ngày</span>
        </div>
      `, { offset: [0, -32] });

      marker.on('click', () => {
        handleFocusCar(car);
      });

      markersRef.current[car.id] = marker;
      markersRef.current[String(car.id)] = marker;
    });

    if (filteredCars.length > 0) {
      const activeCar = selectedCar && filteredCars.some(c => String(c.id) === String(selectedCar.id)) ? selectedCar : filteredCars[0];
      if (!selectedCar || String(selectedCar.id) !== String(activeCar.id)) {
        setSelectedCar(activeCar);
      }

      if (allCoords.length > 0) {
        if (allCoords.length === 1) {
          map.setView(allCoords[0], 14);
        } else {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
      }
    }
  }, [leafletLoaded, filteredCars]);

  const handleFocusCar = (car) => {
    if (!car) return;
    setSelectedCar(car);

    const activeIdx = filteredCars.findIndex(c => String(c.id) === String(car.id));
    const coords = carCoordsMapRef.current[car.id] || carCoordsMapRef.current[String(car.id)] || getCarCoords(car, activeIdx >= 0 ? activeIdx : 0);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.flyTo(coords, 14, { duration: 0.6 });
    }

    const activeMarker = markersRef.current[car.id] || markersRef.current[String(car.id)];
    if (activeMarker) {
      activeMarker.openPopup();
    }
  };

  // 5. Highlight Selected Marker
  useEffect(() => {
    if (!selectedCar) return;

    filteredCars.forEach(car => {
      const el = document.getElementById(`marker-car-${car.id}`);
      if (el) {
        if (String(car.id) === String(selectedCar.id)) {
          el.classList.add('marker-selected');
          if (el.parentElement) {
            el.parentElement.style.zIndex = '99999';
          }
        } else {
          el.classList.remove('marker-selected');
          if (el.parentElement) {
            el.parentElement.style.zIndex = '1';
          }
        }
      }
    });
  }, [selectedCar, filteredCars]);

  const handleRegionChange = (region) => {
    setSelectedRegion(region);

    const newFiltered = cars.filter(c => {
      const loc = (c.location || '').toLowerCase();
      if (region === 'hanoi') return loc.includes('hà nội') || loc.includes('ha noi');
      if (region === 'danang') return loc.includes('đà nẵng') || loc.includes('da nang');
      if (region === 'hcm') return loc.includes('hồ chí minh') || loc.includes('hcm') || loc.includes('quận') || loc.includes('thủ đức') || loc.includes('sài gòn');
      return true;
    });

    const firstCar = newFiltered[0] || null;
    if (firstCar) {
      handleFocusCar(firstCar);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '0',
      height: '740px',
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
          .custom-map-sidebar-scroll {
            flex: 1 1 0% !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            scrollbar-width: thin !important;
            scrollbar-color: #1a73e8 #f1f5f9 !important;
            touch-action: pan-y !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .custom-map-sidebar-scroll::-webkit-scrollbar {
            width: 8px !important;
            display: block !important;
          }
          .custom-map-sidebar-scroll::-webkit-scrollbar-track {
            background: #f1f5f9 !important;
            border-radius: 4px !important;
          }
          .custom-map-sidebar-scroll::-webkit-scrollbar-thumb {
            background: #1a73e8 !important;
            border-radius: 4px !important;
          }
          .custom-map-sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #1557b0 !important;
          }

          .leaflet-div-icon, .leaflet-car-div-icon {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .google-map-marker {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
          }
          .google-map-marker:hover {
            transform: scale(1.1) translateY(-4px);
            z-index: 99999 !important;
          }
          .google-map-marker .google-marker-badge {
            background: #ffffff;
            color: #202124;
            padding: 6px 12px;
            border-radius: 16px;
            border: 1.5px solid #dadce0;
            box-shadow: 0 4px 14px rgba(60, 64, 67, 0.25), 0 1px 3px rgba(60, 64, 67, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            white-space: nowrap;
          }
          .google-map-marker .marker-top-row {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .google-map-marker .marker-car-name {
            font-weight: 700;
            font-size: 12.5px;
            color: #202124;
            font-family: 'Roboto', 'Inter', sans-serif;
          }
          .google-map-marker .marker-bottom-row {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
          }
          .google-map-marker .marker-loc-badge {
            color: #1a73e8;
            font-weight: 700;
            background: #e8f0fe;
            padding: 1px 6px;
            border-radius: 8px;
          }
          .google-map-marker .marker-dot {
            color: #cbd5e1;
            font-size: 10px;
          }
          .google-map-marker .marker-price-val {
            color: #188038;
            font-weight: 800;
          }
          .google-map-marker.marker-selected .google-marker-badge {
            background: #1a73e8;
            color: #ffffff;
            border-color: #1557b0;
            box-shadow: 0 8px 24px rgba(26, 115, 232, 0.45);
            transform: scale(1.12) translateY(-4px);
            animation: googlePulse 1.8s infinite alternate;
          }
          .google-map-marker.marker-selected .marker-car-name {
            color: #ffffff;
          }
          .google-map-marker.marker-selected .marker-loc-badge {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
          }
          .google-map-marker.marker-selected .marker-price-val {
            color: #a8fabc;
          }
          @keyframes googlePulse {
            0% { box-shadow: 0 8px 24px rgba(26, 115, 232, 0.45), 0 0 0 0 rgba(26, 115, 232, 0.6); }
            100% { box-shadow: 0 8px 24px rgba(26, 115, 232, 0.45), 0 0 0 12px rgba(26, 115, 232, 0); }
          }
          .google-map-marker .google-marker-tip {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid #ffffff;
            margin-top: -1px;
            transition: all 0.2s;
          }
          .google-map-marker.marker-selected .google-marker-tip {
            border-top-color: #1a73e8;
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
                onClick={() => setMapStyle('googleRoadmap')}
                title="Bản đồ đường phố chính thức Google Maps"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'googleRoadmap' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'googleRoadmap' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🗺️ Google Bản đồ
              </button>
              <button
                onClick={() => setMapStyle('googleHybrid')}
                title="Bản đồ Vệ tinh thực tế Google Maps"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'googleHybrid' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'googleHybrid' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🛰️ Google Vệ tinh
              </button>
              <button
                onClick={() => setMapStyle('googleTerrain')}
                title="Bản đồ Địa hình Google Maps"
                style={{
                  padding: '6px 12px',
                  borderRadius: '14px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: mapStyle === 'googleTerrain' ? '#2563eb' : 'transparent',
                  color: mapStyle === 'googleTerrain' ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                🏔️ Địa hình
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
        maxHeight: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0'
      }}>
        {/* Selected Car Details Card */}
        {selectedCar ? (
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', height: '135px', marginBottom: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
              <img src={selectedCar.image} alt={selectedCar.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#ffffff',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <MapPin size={12} style={{ color: '#38bdf8' }} /> {selectedCar.location}
              </div>
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#059669',
                padding: '4px 8px',
                borderRadius: '10px',
                fontSize: '10.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <ShieldCheck size={12} /> Sẵn sàng giao
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  {selectedCar.brand} {selectedCar.model}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                    🚗 {selectedCar.seats || 5} chỗ • {selectedCar.transmission || 'Tự động'}
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={12} fill="#f59e0b" color="#f59e0b" /> 4.9 (18 chuyến)
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>
                  {(selectedCar.pricePerDay || 0).toLocaleString('vi-VN')} đ
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>/ 24 giờ</span>
              </div>
            </div>

            <button
              onClick={() => onRentCarClick && onRentCarClick(selectedCar)}
              style={{
                width: '100%',
                marginTop: '6px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={15} /> Thuê Ngay Xe Này
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Compass size={28} style={{ color: '#cbd5e1' }} />
            Chọn một địa điểm xe trên bản đồ để xem chi tiết
          </div>
        )}

        {/* Scrollable List of Location Items */}
        <div
          className="custom-map-sidebar-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '14px 16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Vị trí khả dụng ({filteredCars.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCars.map((car, idx) => {
              const isSel = selectedCar && String(selectedCar.id) === String(car.id);
              return (
                <div
                  key={car.id}
                  onClick={() => handleFocusCar(car)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    border: isSel ? '2px solid #2563eb' : '1px solid #f1f5f9',
                    background: isSel ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    boxShadow: isSel ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={car.image} alt={car.model} style={{ width: '60px', height: '46px', objectFit: 'cover', borderRadius: '10px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {car.brand} {car.model}
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} style={{ color: '#2563eb', flexShrink: 0 }} /> {car.location}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#2563eb' }}>
                      {Math.round(car.pricePerDay / 1000)}K
                    </span>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>/ngày</span>
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
