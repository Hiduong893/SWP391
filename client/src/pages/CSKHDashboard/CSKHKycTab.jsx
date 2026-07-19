import React, { useState } from 'react';
import { ShieldCheck, Eye, CheckCircle2, XCircle, UserCheck } from 'lucide-react';

export const CSKHKycTab = ({
  pendingKycUsers = [],
  filteredUsers = [],
  setSelectedLicenseImage,
  handleApproveKyc,
  actionLoading,
  searchQuery,
}) => {
  // Track per-user action result locally so UI updates instantly after clicking
  const [localActionStatus, setLocalActionStatus] = useState({}); // { [userId]: 'approved' | 'rejected' | 'loading' }

  const handleAction = async (userId, approve) => {
    setLocalActionStatus(prev => ({ ...prev, [userId]: 'loading' }));
    try {
      await handleApproveKyc(userId, approve);
      setLocalActionStatus(prev => ({ ...prev, [userId]: approve ? 'approved' : 'rejected' }));
    } catch {
      // On error, revert to allow retry
      setLocalActionStatus(prev => { const s = { ...prev }; delete s[userId]; return s; });
    }
  };

  const allPendingUsers = filteredUsers.length > 0 && searchQuery
    ? filteredUsers.filter(u => u.licenseStatus === 'pending' || u.cccdStatus === 'pending' || u.cccdBackStatus === 'pending' || u.faceStatus === 'pending')
    : pendingKycUsers;

  return (
    <div className="cskh-fade">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: `var(--cskh-text)` }}>
            Xác minh danh tính KYC ({allPendingUsers.length} hồ sơ đang chờ)
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: `var(--cskh-text-muted)` }}>
          Xem và duyệt CCCD, Giấy phép lái xe của người dùng đã tải lên. Chỉ duyệt khi thông tin rõ ràng, hợp lệ.
        </p>
      </div>

      {/* KYC Table */}
      <div className="cskh-card">
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <ShieldCheck size={15} color="#f59e0b" />
            Hồ sơ KYC chờ xác minh
          </h4>
          {allPendingUsers.length > 0 && (
            <span className="cskh-badge cskh-badge-amber">{allPendingUsers.length} chờ duyệt</span>
          )}
        </div>

        {allPendingUsers.length === 0 ? (
          <div className="cskh-empty">
            <CheckCircle2 size={40} color="#10b981" />
            <h5 style={{ color: '#10b981' }}>Hồ sơ danh tính sạch!</h5>
            <p>Không có yêu cầu KYC nào đang chờ xử lý.</p>
          </div>
        ) : (
          <div className="cskh-table-wrap">
            <table className="cskh-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>CCCD mặt trước</th>
                  <th>CCCD mặt sau</th>
                  <th>Giấy phép lái xe</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {allPendingUsers.map((u) => {
                  const actionStatus = localActionStatus[u.id];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="cskh-user-cell">
                          <img
                            src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=6366f1&color=fff&size=64`}
                            alt={u.name}
                            className="cskh-user-cell-avatar"
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=6366f1&color=fff&size=64`; }}
                          />
                          <div>
                            <div className="cskh-user-cell-name">{u.name}</div>
                            <span className="cskh-badge cskh-badge-amber" style={{ marginTop: 2 }}>Chờ KYC</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: `var(--cskh-text-muted)`, fontSize: 12.5 }}>{u.email}</td>

                      {/* CCCD Front */}
                      <td>
                        {u.kycDocuments?.cccd ? (
                          <button className="cskh-btn cskh-btn-indigo cskh-btn-sm"
                            onClick={() => setSelectedLicenseImage(u.kycDocuments.cccd)}>
                            <Eye size={12} /> Xem ảnh
                          </button>
                        ) : <span style={{ fontSize: 12, color: `var(--cskh-text-dim)` }}>Chưa tải lên</span>}
                      </td>

                      {/* CCCD Back */}
                      <td>
                        {u.kycDocuments?.cccdBack ? (
                          <button className="cskh-btn cskh-btn-indigo cskh-btn-sm"
                            onClick={() => setSelectedLicenseImage(u.kycDocuments.cccdBack)}>
                            <Eye size={12} /> Xem ảnh
                          </button>
                        ) : <span style={{ fontSize: 12, color: `var(--cskh-text-dim)` }}>Chưa tải lên</span>}
                      </td>

                      {/* License */}
                      <td>
                        {u.licenseImage ? (
                          <button className="cskh-btn cskh-btn-indigo cskh-btn-sm"
                            onClick={() => setSelectedLicenseImage(u.licenseImage)}>
                            <Eye size={12} /> Xem ảnh
                          </button>
                        ) : <span style={{ fontSize: 12, color: `var(--cskh-text-dim)` }}>Chưa tải lên</span>}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="cskh-actions" style={{ justifyContent: 'center' }}>
                          {actionStatus === 'loading' ? (
                            <span style={{ fontSize: 12, color: 'var(--cskh-text-muted)', padding: '4px 8px' }}>
                              Đang xử lý...
                            </span>
                          ) : actionStatus === 'approved' ? (
                            <span className="cskh-badge cskh-badge-green" style={{ padding: '6px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <CheckCircle2 size={13} /> Đã duyệt
                            </span>
                          ) : actionStatus === 'rejected' ? (
                            <span className="cskh-badge" style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 14px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <XCircle size={13} /> Đã từ chối
                            </span>
                          ) : (
                            <>
                              <button
                                className="cskh-btn cskh-btn-approve"
                                onClick={() => handleAction(u.id, true)}
                                disabled={actionLoading}
                              >
                                <UserCheck size={13} /> Duyệt KYC
                              </button>
                              <button
                                className="cskh-btn cskh-btn-reject"
                                onClick={() => handleAction(u.id, false)}
                                disabled={actionLoading}
                              >
                                <XCircle size={13} /> Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Already verified section */}
      <div className="cskh-card" style={{ marginTop: 20 }}>
        <div className="cskh-card-header">
          <h4 className="cskh-card-title">
            <CheckCircle2 size={15} color="#10b981" />
            Người dùng đã được xác minh KYC
          </h4>
          <span className="cskh-badge cskh-badge-green">
            {filteredUsers.filter(u => u.licenseStatus === 'verified').length} đã xác minh
          </span>
        </div>
        <div className="cskh-table-wrap">
          <table className="cskh-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái KYC</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.filter(u => u.licenseStatus === 'verified').slice(0, 10).map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="cskh-user-cell">
                      <img
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=10b981&color=fff&size=64`}
                        alt={u.name}
                        className="cskh-user-cell-avatar"
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=10b981&color=fff&size=64`; }}
                      />
                      <div className="cskh-user-cell-name">{u.name}</div>
                    </div>
                  </td>
                  <td style={{ color: `var(--cskh-text-muted)`, fontSize: 12.5 }}>{u.email}</td>
                  <td>
                    <span className={`cskh-badge ${u.role === 'owner' ? 'cskh-badge-blue' : u.role === 'cskh' ? 'cskh-badge-indigo' : 'cskh-badge-gray'}`}>
                      {u.role === 'owner' ? 'Chủ xe' : u.role === 'cskh' ? 'CSKH' : u.role === 'admin' ? 'Admin' : 'Khách'}
                    </span>
                  </td>
                  <td>
                    <span className="cskh-badge cskh-badge-green">
                      <CheckCircle2 size={10} /> Đã xác minh
                    </span>
                  </td>
                </tr>
              ))}
              {filteredUsers.filter(u => u.licenseStatus === 'verified').length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: `var(--cskh-text-dim)`, padding: '24px' }}>
                    Chưa có người dùng nào được xác minh
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
