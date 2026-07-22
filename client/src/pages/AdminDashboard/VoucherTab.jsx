import React, { useState, useEffect, useRef } from 'react';
import { Tag, Plus, Trash2, Calendar, Users, Percent, Gift, Sparkles, Car, Zap, Flame, TrendingDown, Ticket } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';
import { DatePickerVi } from '../../components/DatePickerVi';

export const VoucherTab = ({ actionLoading, setActionLoading, carsList = [], bookingsList = [] }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiFilterView, setAiFilterView] = useState('summary'); // 'summary' | 'low' | 'hot' | 'all'

  // Internal Fallback State for cars and bookings
  const [internalCars, setInternalCars] = useState(Array.isArray(carsList) ? carsList : []);
  const [internalBookings, setInternalBookings] = useState(Array.isArray(bookingsList) ? bookingsList : []);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatViDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch (e) {
      return dateStr;
    }
  };

  // Form state
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [targetCarName, setTargetCarName] = useState('Tất cả dòng xe');
  const [startDate, setStartDate] = useState(getTodayStr);
  const [expirationDate, setExpirationDate] = useState('');

  const setPresetDuration = (days) => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setDate(base.getDate() + days);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    setExpirationDate(`${year}-${month}-${day}`);
  };

  const formRef = useRef(null);
  const { showToast } = useToast();

  // Helper to extract full car display name (Brand + Model)
  const getCarDisplayName = (c) => {
    if (!c) return 'Mẫu xe';
    if (c.name) return c.name;
    if (c.title) return c.title;

    const brand = (c.brand || c.brand_name || c.make || '').trim();
    const model = (c.model || c.model_name || '').trim();

    if (brand && model) {
      if (model.toLowerCase().includes(brand.toLowerCase())) {
        return model;
      }
      return `${brand} ${model}`;
    }

    return brand || model || 'Mẫu xe';
  };

  // Always fetch complete unfiltered cars & bookings on mount
  useEffect(() => {
    api.cars.getCars({ all: 'true' })
      .then(data => {
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.cars)) list = data.cars;
        else if (data && Array.isArray(data.data)) list = data.data;
        if (list.length > 0) setInternalCars(list);
      })
      .catch(e => console.warn('VoucherTab cars fetch:', e));

    api.admin.getBookings()
      .then(data => {
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.bookings)) list = data.bookings;
        else if (data && Array.isArray(data.data)) list = data.data;
        if (list.length > 0) setInternalBookings(list);
      })
      .catch(e => console.warn('VoucherTab bookings fetch:', e));
  }, []);

  const safeCars = (Array.isArray(internalCars) && internalCars.length > 0)
    ? internalCars
    : (Array.isArray(carsList) ? carsList : []);

  const safeBookings = (Array.isArray(internalBookings) && internalBookings.length > 0)
    ? internalBookings
    : (Array.isArray(bookingsList) ? bookingsList : []);

  // 📊 Dynamic Real CSDL Analytics for AI Marketing
  const carRentalCounts = {};
  safeBookings.forEach(b => {
    if (b) {
      const cId = String(b.carId || b.vehicleId || b.vehicle_id || b.car_id || '');
      if (cId) carRentalCounts[cId] = (carRentalCounts[cId] || 0) + 1;
    }
  });

  // Attach booking count to each car in safeCars
  const enrichedCars = safeCars.map(c => {
    if (!c) return { id: '0', name: 'Mẫu xe', realBookingCount: 0 };
    const cId = String(c.id || c.vehicleId || c.vehicle_id || c.car_id || '');
    const fullName = getCarDisplayName(c);
    return {
      ...c,
      name: fullName,
      realBookingCount: carRentalCounts[cId] !== undefined ? carRentalCounts[cId] : (c.totalBookings || c.monthlyBookings || 0)
    };
  }).sort((a, b) => (b.realBookingCount || 0) - (a.realBookingCount || 0));

  // Top Rented Car (Xe thuê nhiều nhất thực tế từ CSDL)
  const topRentedCar = enrichedCars.length > 0 ? enrichedCars[0] : { name: 'VinFast VF 8 Plus', realBookingCount: 3 };

  // Least Rented / Underperforming Car (Xe chưa có lượt thuê / ít người thuê thực tế từ CSDL)
  const leastRentedCar = enrichedCars.length > 0 ? enrichedCars[enrichedCars.length - 1] : { name: 'Honda City RS', realBookingCount: 0 };

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await api.support.getVouchers();
      setVouchers(Array.isArray(data?.vouchers) ? data.vouchers : []);
    } catch (error) {
      console.warn('Lỗi lấy danh sách voucher:', error);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleCreateVoucher = async (e) => {
    if (e) e.preventDefault();
    if (!code || !discountPercent) {
      return showToast('Vui lòng điền các trường bắt buộc (*)', 'warning');
    }

    const todayStr = getTodayStr();

    if (startDate && startDate < todayStr) {
      return showToast('Ngày bắt đầu không được nhỏ hơn ngày hôm nay!', 'error');
    }

    if (expirationDate) {
      if (expirationDate < todayStr) {
        return showToast('Ngày hết hạn không được ở trong quá khứ!', 'error');
      }
      if (startDate && expirationDate < startDate) {
        return showToast('Ngày hết hạn phải sau hoặc bằng Ngày bắt đầu!', 'error');
      }
    }

    setActionLoading(true);
    try {
      const payload = {
        code,
        discountPercent: parseInt(discountPercent),
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        targetUser,
        targetCarName,
        startDate: (startDate && startDate !== todayStr) ? startDate : new Date().toISOString(),
        expirationDate: expirationDate || null
      };

      const data = await api.support.createVoucher(payload);
      showToast(data?.message || 'Tạo mã giảm giá thành công!', 'success');

      // Reset form
      setCode('');
      setDiscountPercent('');
      setMaxDiscountAmount('');
      setMaxUsage('');
      setTargetUser('all');
      setTargetCarName('Tất cả dòng xe');
      setStartDate(todayStr);
      setExpirationDate('');

      fetchVouchers();
    } catch (error) {
      showToast(error?.message || 'Lỗi tạo mã giảm giá', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Instant Direct Auto Creation (1-Click)
  const handleInstantCreateVoucher = async (voucherPayload) => {
    setActionLoading(true);
    try {
      const todayStr = getTodayStr();
      const payloadWithDates = {
        ...voucherPayload,
        startDate: voucherPayload.startDate || todayStr,
        expirationDate: voucherPayload.expirationDate || null
      };
      const data = await api.support.createVoucher(payloadWithDates);
      showToast(`🚀 Đã phát hành trực tiếp Mã [${voucherPayload.code}] cho ${voucherPayload.targetCarName}!`, 'success');
      fetchVouchers();
    } catch (error) {
      showToast(error?.message || 'Lỗi phát hành nhanh voucher', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    setActionLoading(true);
    try {
      await api.support.deleteVoucher(id);
      showToast('Xóa mã giảm giá thành công', 'success');
      fetchVouchers();
    } catch (error) {
      showToast('Lỗi xóa mã giảm giá', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const systemFontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#475569', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', fontFamily: systemFontStack }}>
        <Sparkles className="animate-spin" size={32} style={{ color: '#9333ea', margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600, fontSize: '15px' }}>Đang phân tích dữ liệu CSDL xe & lượt thuê...</p>
      </div>
    );
  }

  return (
    <div className="tab-pane-content fade-in-animation" style={{ fontFamily: systemFontStack }}>

      {/* ✨ LIGHT AI MARKETING HERO BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #fdf4ff 0%, #f5e6ff 50%, #ead5ff 100%)',
        borderRadius: '24px',
        padding: '26px 30px',
        border: '1px solid #d8b4fe',
        boxShadow: '0 10px 30px rgba(147, 51, 234, 0.07)',
        marginBottom: '28px'
      }}>
        {/* TOP ROW: TITLE & LIVE DATABASE STATUS BADGES */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(147, 51, 234, 0.35)',
              flexShrink: 0
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#3b0764', letterSpacing: '-0.3px' }}>
                  AI PHÂN TÍCH XE THỰC TẾ & GỢI Ý MÃ GIẢM GIÁ
                </h3>
                <span style={{ background: '#ffffff', color: '#7e22ce', border: '1px solid #c084fc', fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.3px' }}>
                  CSDL REALTIME
                </span>
              </div>
              <span style={{ fontSize: '13.5px', color: '#581c87', fontWeight: 500, lineHeight: 1.4 }}>
                Hệ thống AI tự động truy vấn CSDL thực tế để đưa ra giải pháp kích cầu tối ưu cho từng dòng xe
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              background: '#ffffff',
              color: '#3b0764',
              fontSize: '12.5px',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #d8b4fe',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 10px #16a34a' }} />
              Đồng bộ CSDL: <strong style={{ color: '#1d4ed8' }}>{safeCars.length} Xe</strong> & <strong style={{ color: '#7e22ce' }}>{safeBookings.length} Chuyến</strong>
            </div>
          </div>
        </div>

        {/* CONTROLS: FILTER SEGMENTED TABS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setAiFilterView('summary')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: aiFilterView === 'summary' ? '#9333ea' : '#ffffff',
              color: aiFilterView === 'summary' ? '#ffffff' : '#581c87',
              boxShadow: aiFilterView === 'summary' ? '0 4px 14px rgba(147, 51, 234, 0.35)' : 'none',
              border: '1px solid #d8b4fe',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🌟 Gợi ý AI Nổi bật (Top 1 & Thấp nhất)
          </button>

          <button
            type="button"
            onClick={() => setAiFilterView('low')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: aiFilterView === 'low' ? '#2563eb' : '#ffffff',
              color: aiFilterView === 'low' ? '#ffffff' : '#1e40af',
              boxShadow: aiFilterView === 'low' ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
              border: '1px solid #bfdbfe',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📉 Xe Cần Kích Cầu ({enrichedCars.filter(c => (c.realBookingCount || 0) === 0).length} mẫu)
          </button>

          <button
            type="button"
            onClick={() => setAiFilterView('hot')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: aiFilterView === 'hot' ? '#7c3aed' : '#ffffff',
              color: aiFilterView === 'hot' ? '#ffffff' : '#5b21b6',
              boxShadow: aiFilterView === 'hot' ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none',
              border: '1px solid #ddd6fe',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔥 Xe Thuê Nhiều ({enrichedCars.filter(c => (c.realBookingCount || 0) > 0).length} mẫu)
          </button>

          <button
            type="button"
            onClick={() => setAiFilterView('all')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: aiFilterView === 'all' ? '#059669' : '#ffffff',
              color: aiFilterView === 'all' ? '#ffffff' : '#065f46',
              boxShadow: aiFilterView === 'all' ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
              border: '1px solid #a7f3d0',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🚗 Tất cả {safeCars.length} xe hệ thống
          </button>
        </div>

        {/* PERFECTLY ALIGNED 3 EQUAL COLUMNS ROW GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: aiFilterView === 'summary' ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}>

          {/* VIEW MODE 1: SUMMARY (EXACTLY 3 CARDS IN 1 ROW) */}
          {aiFilterView === 'summary' && (
            <>
              {/* Card 1: Underperforming car */}
              <div style={{
                background: '#ffffff',
                padding: '22px',
                borderRadius: '20px',
                border: '1px solid #bfdbfe',
                boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                height: '100%'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <TrendingDown size={13} /> XE CẦN KÍCH CẦU
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Tỷ lệ thuê thấp</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', minHeight: '44px' }}>
                    <img src={leastRentedCar.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'} alt={leastRentedCar.name} style={{ width: '56px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #cbd5e1', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{leastRentedCar.name}</h4>
                      <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        ⚠️ {leastRentedCar.realBookingCount || 0} lượt thuê trên CSDL
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 18px 0', lineHeight: 1.55 }}>
                    <strong>Giải pháp AI:</strong> Mẫu xe này chưa có lượt đặt mới. Khuyên tạo Voucher <strong>giảm 10%</strong> dành riêng cho mẫu xe này để thúc đẩy chốt đơn!
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const carNameStr = leastRentedCar.name || 'XE';
                      const autoCode = `KICHAU_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}10`;
                      setCode(autoCode);
                      setDiscountPercent('10');
                      setMaxDiscountAmount('150000');
                      setMaxUsage('50');
                      setTargetUser('all');
                      setTargetCarName(carNameStr);
                      showToast(`✨ AI đã điền Voucher riêng cho ${carNameStr}!`, 'success');
                      if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      flex: 1, padding: '10px 8px', background: '#eff6ff', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    📝 Điền Form
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const carNameStr = leastRentedCar.name || 'XE';
                      const autoCode = `KICHAU_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}10`;
                      handleInstantCreateVoucher({
                        code: autoCode,
                        discountPercent: 10,
                        maxDiscountAmount: 150000,
                        maxUsage: 50,
                        targetUser: 'all',
                        targetCarName: carNameStr
                      });
                    }}
                    style={{
                      flex: 1.3, padding: '10px 8px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                  >
                    <Zap size={14} /> Phát Hành Ngay
                  </button>
                </div>
              </div>

              {/* Card 2: Top Rented Car */}
              <div style={{
                background: '#ffffff',
                padding: '22px',
                borderRadius: '20px',
                border: '1px solid #ddd6fe',
                boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                height: '100%'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#6d28d9', background: '#f3e8ff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #c084fc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Flame size={13} /> HOT SELLER TOP 1
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 700 }}>Doanh số cao nhất</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', minHeight: '44px' }}>
                    <img src={topRentedCar.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'} alt={topRentedCar.name} style={{ width: '56px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #cbd5e1', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topRentedCar.name}</h4>
                      <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        🔥 Top 1 với {topRentedCar.realBookingCount || 0} chuyến thành công
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 18px 0', lineHeight: 1.55 }}>
                    <strong>Giải pháp AI:</strong> Mẫu xe đắt khách nhất! Khuyên phát hành Voucher <strong>giảm 7%</strong> riêng mẫu xe này để tăng thêm lượt chốt đơn.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const carNameStr = topRentedCar.name || 'XE';
                      const autoCode = `HOT_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}7`;
                      setCode(autoCode);
                      setDiscountPercent('7');
                      setMaxDiscountAmount('200000');
                      setMaxUsage('100');
                      setTargetUser('all');
                      setTargetCarName(carNameStr);
                      showToast(`🔥 AI đã điền Voucher riêng cho ${carNameStr}!`, 'success');
                      if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      flex: 1, padding: '10px 8px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #c084fc', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    📝 Điền Form
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const carNameStr = topRentedCar.name || 'XE';
                      const autoCode = `HOT_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}7`;
                      handleInstantCreateVoucher({
                        code: autoCode,
                        discountPercent: 7,
                        maxDiscountAmount: 200000,
                        maxUsage: 100,
                        targetUser: 'all',
                        targetCarName: carNameStr
                      });
                    }}
                    style={{
                      flex: 1.3, padding: '10px 8px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                  >
                    <Zap size={14} /> Phát Hành Ngay
                  </button>
                </div>
              </div>

              {/* Card 3: Welcome New Renter (MATCHING STRUCTURAL ALIGNMENT WITH CARD 1 & 2) */}
              <div style={{
                background: '#ffffff',
                padding: '22px',
                borderRadius: '20px',
                border: '1px solid #a7f3d0',
                boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                height: '100%'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Gift size={13} /> CHÀO KHÁCH MỚI
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>Tăng trưởng KYC</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', minHeight: '44px' }}>
                    <div style={{ width: '56px', height: '40px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                      <Gift size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.2px' }}>Ưu Đãi Tân Thủ WELCOME15</h4>
                      <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        🎁 Áp dụng toàn hệ thống
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 18px 0', lineHeight: 1.55 }}>
                    <strong>Giải pháp AI:</strong> Khích lệ tài khoản mới vừa xác minh KYC đặt chuyến xe đầu tiên với Mã <strong>giảm 15%</strong>!
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCode('WELCOME15');
                      setDiscountPercent('15');
                      setMaxDiscountAmount('300000');
                      setMaxUsage('200');
                      setTargetUser('new');
                      setTargetCarName('Tất cả dòng xe');
                      showToast('🎁 AI đã điền Voucher WELCOME15!', 'success');
                      if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      flex: 1, padding: '10px 8px', background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    📝 Điền Form
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleInstantCreateVoucher({
                        code: 'WELCOME15',
                        discountPercent: 15,
                        maxDiscountAmount: 300000,
                        maxUsage: 200,
                        targetUser: 'new',
                        targetCarName: 'Tất cả dòng xe'
                      });
                    }}
                    style={{
                      flex: 1.3, padding: '10px 8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                  >
                    <Zap size={14} /> Phát Hành Ngay
                  </button>
                </div>
              </div>
            </>
          )}

          {/* VIEW MODE 2, 3, 4: LIST CARS DYNAMICALLY (LOW, HOT, ALL) */}
          {aiFilterView !== 'summary' && (() => {
            let carsToDisplay = [...enrichedCars];
            if (aiFilterView === 'low') {
              carsToDisplay = enrichedCars.filter(c => (c.realBookingCount || 0) === 0);
            } else if (aiFilterView === 'hot') {
              carsToDisplay = enrichedCars.filter(c => (c.realBookingCount || 0) > 0);
            }

            if (carsToDisplay.length === 0) {
              return (
                <div style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', fontSize: '14px' }}>
                  📭 Không tìm thấy xe nào trong chế độ lọc này.
                </div>
              );
            }

            return carsToDisplay.map((car, index) => {
              const countVal = car.realBookingCount || 0;
              const isHot = countVal > 0;
              const carNameStr = car.name || 'XE';
              const autoCode = isHot
                ? `HOT_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}7`
                : `KICHAU_${carNameStr.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)}10`;
              const percent = isHot ? 7 : 10;
              const maxAmount = isHot ? 200000 : 150000;

              return (
                <div key={car.id || index} style={{
                  background: '#ffffff',
                  padding: '18px',
                  borderRadius: '18px',
                  border: `1px solid ${isHot ? '#ddd6fe' : '#bfdbfe'}`,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: isHot ? '#6d28d9' : '#1d4ed8', background: isHot ? '#f3e8ff' : '#eff6ff', padding: '3px 9px', borderRadius: '6px' }}>
                        {isHot ? `🔥 HOT SELLER #${index + 1}` : '📉 CẦN KÍCH CẦU'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{car.licensePlate || car.license_plate || car.plateNumber || ''}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img
                        src={car.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'}
                        alt={carNameStr}
                        style={{ width: '56px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                      />
                      <div>
                        <h5 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{carNameStr}</h5>
                        <span style={{ fontSize: '12px', color: isHot ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                          {isHot ? `🔥 ${countVal} chuyến xe` : `⚠️ ${countVal} lượt thuê`}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#475569', margin: '10px 0 12px', lineHeight: 1.45 }}>
                      {isHot ? `Mẫu xe thuê cao. Tạo Voucher giảm 7% riêng cho mẫu xe này.` : `Xe chưa có đơn mới. Tạo Voucher 10% kích thích thuê.`}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCode(autoCode);
                        setDiscountPercent(String(percent));
                        setMaxDiscountAmount(String(maxAmount));
                        setMaxUsage(isHot ? '100' : '50');
                        setTargetUser('all');
                        setTargetCarName(carNameStr);
                        showToast(`✨ AI đã điền Voucher cho xe ${carNameStr}!`, 'success');
                        if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: isHot ? '#f3e8ff' : '#eff6ff',
                        color: isHot ? '#6b21a8' : '#1e40af',
                        border: `1px solid ${isHot ? '#c084fc' : '#93c5fd'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📝 Điền Form
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleInstantCreateVoucher({
                          code: autoCode,
                          discountPercent: percent,
                          maxDiscountAmount: maxAmount,
                          maxUsage: isHot ? 100 : 50,
                          targetUser: 'all',
                          targetCarName: carNameStr
                        });
                      }}
                      style={{
                        flex: 1.2,
                        padding: '8px 4px',
                        background: isHot ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Zap size={13} /> Phát Hành
                    </button>
                  </div>
                </div>
              );
            });
          })()}

        </div>
      </div>

      {/* FORM & VOUCHER CARDS GRID */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1.25fr 1.75fr', gap: '26px', marginTop: '28px' }}>

        {/* Modern Form Card */}
        <div ref={formRef} style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          borderTop: '4px solid #00bfa5',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.05)',
          padding: '26px 28px',
          position: 'relative'
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,191,165,0.12)', color: '#00bfa5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
              Tạo Mã Giảm Giá Mới
            </h3>
          </div>

          <form onSubmit={handleCreateVoucher} className="config-inputs-form">
            {/* HÀNG 1: THÔNG TIN MÃ & MỨC GIẢM */}
            <div className="config-form-row mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Ticket size={13} color="#00bfa5" /> MÃ COUPON *
                </label>
                <input
                  type="text"
                  className="config-text-input"
                  placeholder="VD: VIVUCAR16"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                    width: '100%'
                  }}
                  required
                />
              </div>

              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Percent size={13} color="#00bfa5" /> GIẢM (%) *
                </label>
                <input
                  type="number"
                  className="config-text-input"
                  placeholder="VD: 10"
                  min="1" max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                    width: '100%'
                  }}
                  required
                />
              </div>
            </div>

            {/* HÀNG 2: PHẠM VI ÁP DỤNG & ĐỐI TƯỢNG */}
            <div className="config-form-row mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#0284c7', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={14} /> DÒNG XE ÁP DỤNG CỤ THỂ
                </label>
                <select
                  className="period-select"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#f0f9ff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0369a1',
                    border: '1.5px solid #0284c7',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
                  }}
                  value={targetCarName}
                  onChange={e => setTargetCarName(e.target.value)}
                >
                  <option value="Tất cả dòng xe">🌐 Tất cả dòng xe (Toàn hệ thống)</option>
                  {safeCars.map(c => {
                    const nameStr = getCarDisplayName(c);
                    return (
                      <option key={c.id || nameStr} value={nameStr}>
                        🚗 {nameStr} {c.plateNumber ? `(${c.plateNumber})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={13} color="#00bfa5" /> ĐỐI TƯỢNG KHÁCH HÀNG
                </label>
                <select
                  className="period-select"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px'
                  }}
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                >
                  <option value="all">Tất cả khách hàng</option>
                  <option value="new">Khách hàng mới đăng ký</option>
                </select>
              </div>
            </div>

            {/* HÀNG 3: GIỚI HẠN LƯỢT DÙNG */}
            <div className="config-input-group mb-4">
              <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={13} color="#00bfa5" /> LƯỢT DÙNG TỐI ĐA
              </label>
              <input
                type="number"
                className="config-text-input"
                placeholder="Ví dụ: 50 (Bỏ trống nếu không giới hạn số lượt)"
                min="1"
                value={maxUsage}
                onChange={e => setMaxUsage(e.target.value)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                  width: '100%'
                }}
              />
            </div>

            {/* RÀNG BUỘC NGÀY THÁNG NĂM (START DATE & EXPIRATION DATE) */}
            <div className="config-form-row mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} color="#00bfa5" /> NGÀY BẮT ĐẦU *
                </label>
                <DatePickerVi
                  className="config-text-input"
                  value={startDate}
                  min={getTodayStr()}
                  onChange={newStart => {
                    setStartDate(newStart);
                    if (expirationDate && newStart > expirationDate) {
                      setExpirationDate(newStart);
                    }
                  }}
                  required
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
                {startDate && (
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    📅 Từ ngày: {formatViDate(startDate)}
                  </span>
                )}
              </div>

              <div className="config-input-group">
                <label className="config-input-label" style={{ color: '#475569', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.3px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} color="#00bfa5" /> NGÀY HẾT HẠN (TÙY CHỌN)
                </label>
                <DatePickerVi
                  className="config-text-input"
                  value={expirationDate}
                  min={startDate || getTodayStr()}
                  onChange={setExpirationDate}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                />
                {expirationDate ? (
                  <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, marginTop: '4px', display: 'block' }}>
                    ⏳ HSD: {formatViDate(expirationDate)}
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    ♾️ Vô thời hạn
                  </span>
                )}
              </div>
            </div>

            {/* QUICK PRESET BUTTONS FOR EXPIRATION DATES */}
            <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.3px', display: 'block', marginBottom: '8px' }}>
                ⚡ CHỌN NHANH THỜI HẠN SỬ DỤNG:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: '+7 ngày', days: 7 },
                  { label: '+15 ngày', days: 15 },
                  { label: '+30 ngày', days: 30 },
                  { label: '+90 ngày', days: 90 },
                  { label: '♾️ Vô hạn', days: 0 }
                ].map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => p.days > 0 ? setPresetDuration(p.days) : setExpirationDate('')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: (p.days === 0 && !expirationDate) ? '#e0f2fe' : '#ffffff',
                      color: (p.days === 0 && !expirationDate) ? '#0284c7' : '#334155',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #00bfa5 0%, #00897b 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 191, 165, 0.35)',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} /> + Thêm & Phát Hành Mã Giảm Giá
            </button>
          </form>
        </div>

        {/* Active Voucher Cards List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {vouchers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '44px 20px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
              <Gift size={48} color="#94a3b8" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h5 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Chưa có mã giảm giá</h5>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Bạn chưa tạo bất kỳ mã giảm giá nào.</p>
            </div>
          ) : (
            vouchers.map(v => (
              <div key={v.id} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '20px',
                position: 'relative',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.25s ease'
              }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(0,191,165,0.12)', color: '#00bfa5', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Percent size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16.5px', color: '#0f172a', fontWeight: 800, letterSpacing: '0.3px' }}>{v.code}</h4>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                      Giảm <strong style={{ color: '#059669', fontWeight: 800 }}>{v.discount_percent}%</strong>
                      {v.max_discount_amount ? ` (Tối đa ${v.max_discount_amount.toLocaleString()}đ)` : ''}
                    </p>

                    {v.target_car_name && v.target_car_name !== 'Tất cả dòng xe' && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '3px 10px', borderRadius: '8px', border: '1px solid #7dd3fc', marginBottom: '8px' }}>
                        <Car size={13} /> Áp dụng: {v.target_car_name}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} /> Dùng: <strong style={{ color: '#0f172a' }}>{v.current_usage}{v.max_usage ? `/${v.max_usage}` : ''}</strong>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {v.start_date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 600 }}>
                            <Calendar size={13} /> Từ: {formatViDate(v.start_date)}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: v.expiration_date && new Date(v.expiration_date) < new Date() ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                          <Calendar size={13} /> HSD: {v.expiration_date ? formatViDate(v.expiration_date) : 'Vô thời hạn'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(v.id)}
                  style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#dc2626', borderRadius: '8px', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Xóa mã giảm giá"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
