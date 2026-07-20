import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Calendar, Users, Percent, Gift } from 'lucide-react';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast';

export const VoucherTab = ({ actionLoading, setActionLoading }) => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [targetUser, setTargetUser] = useState('all');
  const [expirationDate, setExpirationDate] = useState('');

  const { showToast } = useToast();

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await api.support.getVouchers();
      setVouchers(data.vouchers || []);
    } catch (error) {
      showToast('Lỗi tải danh sách mã giảm giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    if (!code || !discountPercent || !maxDiscountAmount) {
      return showToast('Vui lòng điền các trường bắt buộc (*)', 'warning');
    }
    
    setActionLoading(true);
    try {
      const payload = {
        code,
        discountPercent: parseInt(discountPercent),
        maxDiscountAmount: parseFloat(maxDiscountAmount),
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        targetUser,
        expirationDate: expirationDate || null
      };
      
      const data = await api.support.createVoucher(payload);
      showToast(data.message, 'success');
      
      // Reset form
      setCode('');
      setDiscountPercent('');
      setMaxDiscountAmount('');
      setMaxUsage('');
      setTargetUser('all');
      setExpirationDate('');
      
      fetchVouchers();
    } catch (error) {
      showToast(error.message || 'Lỗi tạo mã giảm giá', 'error');
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

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách voucher...</div>;
  }

  return (
    <div className="tab-pane-content fade-in-animation">
      <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        
        {/* Create Form */}
        <div className="config-form-card glassmorphism">
          <div className="config-card-header">
            <Gift size={18} className="text-yellow" />
            <h3 className="config-card-title">+ Tạo Mã Giảm Giá Mới</h3>
          </div>
          
          <form onSubmit={handleCreateVoucher} className="config-inputs-form" style={{ marginTop: '20px' }}>
            <div className="config-input-group mb-4">
              <label className="config-input-label">MÃ COUPON *</label>
              <input 
                type="text" 
                className="config-text-input" 
                placeholder="VD: MOCKAI30" 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            
            <div className="config-form-row">
              <div className="config-input-group mb-4">
                <label className="config-input-label">GIẢM (%) *</label>
                <input 
                  type="number" 
                  className="config-text-input" 
                  placeholder="VD: 50" 
                  min="1" max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(e.target.value)}
                  required
                />
              </div>
              <div className="config-input-group mb-4">
                <label className="config-input-label">GIẢM TỐI ĐA (VNĐ) *</label>
                <input 
                  type="number" 
                  className="config-text-input" 
                  placeholder="VD: 100000" 
                  value={maxDiscountAmount}
                  onChange={e => setMaxDiscountAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="config-form-row">
              <div className="config-input-group mb-4">
                <label className="config-input-label">LƯỢT DÙNG TỐI ĐA</label>
                <input 
                  type="number" 
                  className="config-text-input" 
                  placeholder="Không giới hạn" 
                  min="1"
                  value={maxUsage}
                  onChange={e => setMaxUsage(e.target.value)}
                />
              </div>
              <div className="config-input-group mb-4">
                <label className="config-input-label">ĐỐI TƯỢNG</label>
                <select 
                  className="period-select" 
                  style={{ width: '100%', padding: '12px', background: 'transparent' }}
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="new">Khách hàng mới</option>
                </select>
              </div>
            </div>

            <div className="config-input-group mb-4">
              <label className="config-input-label">NGÀY HẾT HẠN (TÙY CHỌN)</label>
              <input 
                type="date" 
                className="config-text-input" 
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
              />
            </div>

            <button type="submit" className="config-submit-btn" disabled={actionLoading} style={{ marginTop: '10px' }}>
              + Thêm Mã Giảm Giá
            </button>
          </form>
        </div>

        {/* Voucher List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', alignContent: 'start' }}>
          {vouchers.length === 0 ? (
            <div className="empty-state-panel glassmorphism" style={{ gridColumn: '1 / -1' }}>
              <Gift size={48} color="#94a3b8" style={{ margin: '0 auto', opacity: 0.5 }} />
              <h5>Chưa có mã giảm giá</h5>
              <p>Bạn chưa tạo bất kỳ mã giảm giá nào.</p>
            </div>
          ) : (
            vouchers.map(v => (
              <div key={v.id} className="kpi-card glassmorphism" style={{ minHeight: 'auto', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(0,191,165,0.1)', color: '#00bfa5', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Percent size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>{v.code}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94a3b8' }}>Giảm {v.discount_percent}% (Tối đa {v.max_discount_amount.toLocaleString()}đ)</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> Dùng: {v.current_usage}{v.max_usage ? `/${v.max_usage}` : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: v.expiration_date && new Date(v.expiration_date) < new Date() ? '#f43f5e' : '#f59e0b' }}>
                        <Calendar size={12} /> HSD: {v.expiration_date ? new Date(v.expiration_date).toLocaleDateString('vi-VN') : 'Không GH'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDelete(v.id)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                  title="Xóa mã giảm giá"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
