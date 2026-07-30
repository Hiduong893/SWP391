import React, { useState } from 'react';
import { ShoppingBag, Trash2, ShieldCheck, ArrowRight, Wallet, QrCode, X } from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from './Toast';

export const CartDrawer = ({ isOpen, onClose, cartItems = [], setCartItems, onCheckoutSuccess }) => {
  const { showToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [loading, setLoading] = useState(false);
  const [vietqrModalData, setVietqrModalData] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const removeFromCart = (index) => {
    const safeCart = Array.isArray(cartItems) ? cartItems : [];
    const updated = safeCart.filter((_, i) => i !== index);
    if (setCartItems) setCartItems(updated);
    localStorage.setItem('vivucar_cart', JSON.stringify(updated));
    showToast('Đã xóa xe khỏi giỏ hàng.', 'info');
  };

  const clearCart = () => {
    if (setCartItems) setCartItems([]);
    localStorage.removeItem('vivucar_cart');
  };

  const safeCart = Array.isArray(cartItems) ? cartItems : [];
  const totalAmount = safeCart.reduce((sum, item) => sum + Number(item?.totalPrice || 0), 0);
  const depositTotal = Math.round(totalAmount * 0.3);

  const handleGroupCheckout = async () => {
    if (safeCart.length === 0) {
      showToast('Giỏ hàng của bạn đang trống.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.bookings.groupCheckout(safeCart, paymentMethod);
      showToast(res.message, 'success');
      clearCart();
      if (res.vietqr) {
        setVietqrModalData(res.vietqr);
      } else {
        onClose();
        if (onCheckoutSuccess) onCheckoutSuccess(res.groupId);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi thanh toán cọc giỏ hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cm2-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="cm2-wrap" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '540px', 
          width: '100%', 
          borderRadius: '20px', 
          padding: '24px', 
          background: '#fff',
          textAlign: 'left',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px', color: '#2563eb' }}>
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Giỏ Thuê Xe Của Bạn ({cartItems.length})</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Thanh toán 1 lần 30% cọc cho tất cả xe</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {safeCart.length > 0 && (
              <button 
                type="button" 
                onClick={() => { clearCart(); showToast('Đã làm sạch giỏ hàng.', 'info'); }}
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                Xóa giỏ hàng
              </button>
            )}
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', margin: 0 }}>Giỏ hàng chưa có xe nào. Hãy chọn xe bạn thích!</p>
          </div>
        ) : (
          <>
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {cartItems.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    gap: '14px', 
                    alignItems: 'center', 
                    padding: '12px', 
                    background: '#f8fafc', 
                    borderRadius: '14px', 
                    marginBottom: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <img 
                    src={item.carImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80'} 
                    alt={item.carName} 
                    style={{ width: '70px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{item.carName}</h5>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      📅 {item.pickupDate ? new Date(item.pickupDate).toLocaleDateString('vi-VN') : ''} ➔ {item.returnDate ? new Date(item.returnDate).toLocaleDateString('vi-VN') : ''}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginTop: '2px', display: 'block' }}>
                      {formatCurrency(item.totalPrice)} (Cọc 30%: {formatCurrency(Math.round(item.totalPrice * 0.3))})
                    </span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(idx)} 
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                    title="Xóa xe này khỏi giỏ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0369a1', marginBottom: '6px' }}>
                <span>Tổng giá trị toàn giỏ thuê:</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>
                <span>Tổng tiền CỌC 30% phải trả:</span>
                <span>{formatCurrency(depositTotal)}</span>
              </div>
            </div>

            {/* Payment options */}
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>Phương thức thanh toán cọc giỏ xe:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                style={{
                  padding: '12px', borderRadius: '12px',
                  border: paymentMethod === 'wallet' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: paymentMethod === 'wallet' ? 'rgba(37,99,235,0.08)' : '#fff',
                  color: paymentMethod === 'wallet' ? '#2563eb' : '#475569',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}
                onClick={() => setPaymentMethod('wallet')}
              >
                <Wallet size={18} />
                Ví ViVuCar
              </button>

              <button
                type="button"
                style={{
                  padding: '12px', borderRadius: '12px',
                  border: paymentMethod === 'vietqr' ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: paymentMethod === 'vietqr' ? 'rgba(16,185,129,0.08)' : '#fff',
                  color: paymentMethod === 'vietqr' ? '#10b981' : '#475569',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}
                onClick={() => setPaymentMethod('vietqr')}
              >
                <QrCode size={18} />
                Mã VietQR
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleGroupCheckout}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                {loading ? 'Đang xử lý...' : `Thanh Toán Cọc ${formatCurrency(depositTotal)}`}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* VietQR Group Deposit Transfer Modal */}
      {vietqrModalData && (
        <div className="cm2-overlay" onClick={() => { setVietqrModalData(null); onClose(); if (onCheckoutSuccess) onCheckoutSuccess(); }} style={{ zIndex: 10000 }}>
          <div className="cm2-wrap text-center" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px', borderRadius: '20px', background: '#fff', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>📱 Quét Mã VietQR Chuyển Khoản Cọc</h4>
              <button style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }} onClick={() => { setVietqrModalData(null); onClose(); if (onCheckoutSuccess) onCheckoutSuccess(); }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <img 
                src={vietqrModalData.qrUrl} 
                alt="Mã VietQR Chuyển khoản cọc" 
                style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block', margin: '0 auto 12px auto', borderRadius: '12px', border: '1px solid #cbd5e1' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                <span>Ngân hàng:</span>
                <strong>{vietqrModalData.bankName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                <span>Số tài khoản:</span>
                <strong>{vietqrModalData.accountNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                <span>Chủ tài khoản:</span>
                <strong>{vietqrModalData.accountHolder}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                <span>Nội dung chuyển khoản:</span>
                <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{vietqrModalData.transferContent}</strong>
              </div>
              <hr style={{ margin: '8px 0', borderColor: '#cbd5e1' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#059669' }}>
                <span>Số tiền cọc 30%:</span>
                <span>{formatCurrency(vietqrModalData.amount)}</span>
              </div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#1e40af', marginBottom: '16px', lineHeight: 1.5, textAlign: 'left' }}>
              💡 CSKH ViVuCar sẽ tự động kiểm tra số dư và chuyển trạng thái đơn sang <strong>Đã đặt cọc (Paid)</strong> trong vòng 1-3 phút sau khi nhận tiền!
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#2563eb', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
              onClick={() => {
                setVietqrModalData(null);
                onClose();
                if (onCheckoutSuccess) onCheckoutSuccess();
              }}
            >
              Tôi Đã Chuyển Khoản Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
