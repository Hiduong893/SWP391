import React from 'react';
import { CheckCircle2, Eye, Trash2 } from 'lucide-react';

export const AccountsTab = ({
  activeSubTab,
  pendingKycUsers = [],
  filteredUsers = [],
  setSelectedLicenseImage,
  handleApproveKyc,
  handleUpdateUserRole,
  handleDeleteUser,
  actionLoading
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      {/* VIEW: KYC VERIFICATIONS */}
      {activeSubTab === 'kyc' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">CCCD &amp; Bằng lái xe của người dùng tải lên chờ xác thực danh tính (KYC)</h4>
          </div>

          {pendingKycUsers.length === 0 ? (
            <div className="empty-state-panel">
              <CheckCircle2 size={36} className="text-green" />
              <h5>Hồ sơ danh tính sạch!</h5>
              <p>Không có yêu cầu xác thực KYC nào đang chờ xử lý.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-dashboard-table">
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    <th>Email</th>
                    <th>Ảnh CCCD (Trước)</th>
                    <th>Ảnh CCCD (Sau)</th>
                    <th>Ảnh Bằng lái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingKycUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="table-user-cell">
                          <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"} alt={u.name} className="table-avatar" />
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {u.kycDocuments?.cccd ? (
                          <button className="action-btn text-teal btn-sm" onClick={() => setSelectedLicenseImage(u.kycDocuments.cccd)}>
                            <Eye size={12} style={{ marginRight: 4 }} /> Xem mặt trước
                          </button>
                        ) : <span className="text-muted small">Chưa tải</span>}
                      </td>
                      <td>
                        {u.kycDocuments?.cccdBack ? (
                          <button className="action-btn text-teal btn-sm" onClick={() => setSelectedLicenseImage(u.kycDocuments.cccdBack)}>
                            <Eye size={12} style={{ marginRight: 4 }} /> Xem mặt sau
                          </button>
                        ) : <span className="text-muted small">Chưa tải</span>}
                      </td>
                      <td>
                        {u.licenseImage ? (
                          <button className="action-btn text-teal btn-sm" onClick={() => setSelectedLicenseImage(u.licenseImage)}>
                            <Eye size={12} style={{ marginRight: 4 }} /> Xem Bằng lái
                          </button>
                        ) : <span className="text-muted small">Chưa tải</span>}
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                          <button className="btn-approve btn-success" onClick={() => handleApproveKyc(u.id, true)} disabled={actionLoading}>✓ Duyệt KYC</button>
                          <button className="btn-approve btn-danger" onClick={() => handleApproveKyc(u.id, false)} disabled={actionLoading}>✕ Từ chối</button>
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

      {/* VIEW: ROLES & USERS */}
      {activeSubTab === 'roles' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Phân quyền vai trò người dùng hệ thống</h4>
          </div>

          <div className="table-responsive">
            <table className="custom-dashboard-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Địa chỉ Email</th>
                  <th>Vai trò hiện tại</th>
                  <th>Trạng thái KYC</th>
                  <th>Đổi vai trò</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-user-cell">
                        <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"} alt={u.name} className="table-avatar" />
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td className="text-secondary-cell">{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role === 'admin' ? 'Quản trị' : u.role === 'cskh' ? 'Hỗ trợ' : u.role === 'owner' ? 'Chủ xe' : 'Khách'}
                      </span>
                    </td>
                    <td>
                      <span className={`kyc-status-label ${u.licenseStatus === 'verified' ? 'verified' : 'rejected'}`}>
                        {u.licenseStatus === 'verified' ? 'Đã KYC' : 'Chưa xác minh'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="role-change-select"
                        disabled={actionLoading || u.id === 'user-admin-1'}
                      >
                        <option value="renter">Khách thuê (Renter)</option>
                        <option value="owner">Chủ xe (Owner)</option>
                        <option value="cskh">Chăm sóc khách (CSKH)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                      </select>
                    </td>
                    <td>
                      <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn-approve btn-danger"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={actionLoading || u.role === 'admin'}
                          style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={12} /> Xóa Account
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
