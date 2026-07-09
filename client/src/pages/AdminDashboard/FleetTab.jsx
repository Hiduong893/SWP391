import React from 'react';
import { CheckCircle2, Car, Trash2 } from 'lucide-react';

export const FleetTab = ({
  activeSubTab,
  pendingCars = [],
  filteredCars = [],
  handleModerateCar,
  handleDeleteCar,
  actionLoading,
  formatCurrency
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      {/* VIEW: CARS MODERATION */}
      {activeSubTab === 'cars_moderation' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Danh sách xe đang chờ kiểm duyệt</h4>
          </div>

          {pendingCars.length === 0 ? (
            <div className="empty-state-panel">
              <CheckCircle2 size={36} className="text-green animate-pulse" />
              <h5>Không có xe nào chờ duyệt!</h5>
              <p>Tất cả xe của đối tác đã được kiểm duyệt xong.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-dashboard-table">
                <thead>
                  <tr>
                    <th>Ảnh xe</th>
                    <th>Thương hiệu / Dòng xe</th>
                    <th>Biển số</th>
                    <th>Đơn giá thuê</th>
                    <th>Địa điểm</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCars.map((car) => (
                    <tr key={car.id}>
                      <td>
                        <img src={car.image || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=150&q=80"} alt={car.model} className="car-table-thumbnail" />
                      </td>
                      <td>
                        <strong className="car-brand-title">{car.brand}</strong>
                        <span className="car-model-text">{car.model}</span>
                        <span className="car-specs-text">{car.seats} chỗ • {car.transmission}</span>
                      </td>
                      <td className="text-bold-cell">{car.plateNumber}</td>
                      <td className="text-purple-cell">{formatCurrency(car.pricePerDay)}</td>
                      <td className="text-secondary-cell">{car.location}</td>
                      <td>
                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                          <button className="btn-approve btn-success" onClick={() => handleModerateCar(car.id, true)} disabled={actionLoading}>✓ Duyệt đăng</button>
                          <button className="btn-approve btn-danger" onClick={() => {
                            const reason = window.prompt("Nhập lý do từ chối đăng tải xe:");
                            if (reason) handleModerateCar(car.id, false, reason);
                          }} disabled={actionLoading}>✕ Từ chối</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: ALL APPROVED CARS */}
      {activeSubTab === 'all_cars' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Tất cả phương tiện trên sàn giao dịch trực tuyến</h4>
          </div>

          {filteredCars.length === 0 ? (
            <div className="empty-state-panel">
              <Car size={36} className="text-muted" />
              <h5>Không tìm thấy xe nào!</h5>
              <p>Vui lòng thử từ khóa tìm kiếm khác.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-dashboard-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Hiệu xe / Dòng xe</th>
                    <th>Biển kiểm soát</th>
                    <th>Giá/Ngày</th>
                    <th>Khu vực</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCars.map((car) => (
                    <tr key={car.id}>
                      <td>
                        <img src={car.image} alt={car.model} className="car-table-thumbnail" />
                      </td>
                      <td>
                        <strong className="car-brand-title">{car.brand}</strong>
                        <span className="car-model-text">{car.model}</span>
                        <span className="car-specs-text">{car.seats} chỗ • {car.transmission}</span>
                      </td>
                      <td className="text-bold-cell">{car.plateNumber}</td>
                      <td className="text-purple-cell">{formatCurrency(car.pricePerDay)}</td>
                      <td className="text-secondary-cell">{car.location}</td>
                      <td>
                        <span className={`kyc-status-label verified`}>Sẵn sàng</span>
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn-approve btn-danger"
                            style={{ padding: '5px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleDeleteCar(car.id)}
                            disabled={actionLoading}
                          >
                            <Trash2 size={12} /> Xóa xe
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
