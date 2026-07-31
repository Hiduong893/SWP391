import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const RevenueChartModal = ({ isOpen, onClose, data = [], cars = [] }) => {
  const [selectedCarId, setSelectedCarId] = useState('all');
  if (!isOpen) return null;

  // Lấy tên của xe được chọn để hiển thị trong chú thích (legend)
  const selectedCarName = selectedCarId === 'all' ? 'Doanh thu xe' : cars.find(c => String(c.id) === selectedCarId)?.model || 'Doanh thu xe';

  const currencyFormatter = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}tr`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
  };
  
  // Tạo dữ liệu cho biểu đồ, thêm doanh thu của xe được chọn
  const chartData = data.map(monthData => ({
    ...monthData,
    vehicleRevenue: selectedCarId === 'all' ? 0 : (monthData.cars?.[selectedCarId] || 0)
  }));

  return (
    <div className="owner-modal-overlay">
      <div className="owner-modal-card" style={{maxWidth: '800px'}}>
        <div className="owner-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h4 className="owner-modal-title">Biểu đồ Doanh thu năm {new Date().getFullYear()}</h4>
            <select 
              value={selectedCarId} 
              onChange={(e) => setSelectedCarId(e.target.value)}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: '12px', width: '200px' }}
            >
              <option value="all">Xem tổng doanh thu</option>
              {cars.map(car => (
                <option key={car.id} value={car.id}>
                  {car.brand} {car.model}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onClose} className="owner-modal-close"><X size={20} /></button>
        </div>
        <div className="chart-container" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [`${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`, name]} labelStyle={{ fontWeight: 'bold' }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Tổng Doanh thu" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
              {selectedCarId !== 'all' && <Line type="monotone" dataKey="vehicleRevenue" name={selectedCarName} stroke="#82ca9d" strokeWidth={2} connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
