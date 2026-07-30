import React from 'react';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const RevenueChartModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const currencyFormatter = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
  };

  // Dummy styles since it was missing
  const inlineStyles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '100%' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { margin: 0, fontSize: '18px' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer' }
  };

  return (
    <div style={inlineStyles.overlay}>
      <div style={{...inlineStyles.modal, maxWidth: '800px'}}>
        <div style={inlineStyles.modalHeader}>
          <h3 style={inlineStyles.modalTitle}>Biểu đồ Doanh thu theo Tháng - 2026</h3>
          <button onClick={onClose} style={inlineStyles.closeButton}><X size={20} /></button>
        </div>
        <div className="chart-container" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
