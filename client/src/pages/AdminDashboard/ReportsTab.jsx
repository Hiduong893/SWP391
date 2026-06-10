import React from 'react';
import { MessageSquare, Star, AlertTriangle, Eye, Shield, Brain, ShieldAlert, Info, TrendingUp } from 'lucide-react';

export const ReportsTab = ({
  activeSubTab,
  ticketsList = [],
  selectedTicket,
  setSelectedTicket,
  replyText,
  setReplyText,
  handleReplyTicket,
  reviewsList = [],
  handleToggleReviewVisibility,
  incidentsList = [],
  setSelectedLicenseImage,
  handleResolveIncident,
  disputesList = [],
  selectedDispute,
  setSelectedDispute,
  disputeVerdict,
  setDisputeVerdict,
  handleResolveDispute,
  actionLoading
}) => {
  return (
    <div className="tab-pane-content fade-in-animation">

      {/* SUB-VIEW 1: SUPPORT CHAT TICKETS (UC32) */}
      {activeSubTab === 'support' && (
        <div className="chat-ticket-grid">

          {/* Left Column - Tickets list */}
          <div className="ticket-list-panel glassmorphism">
            <h4 className="panel-title p-3">Danh sách tickets hỗ trợ cấp bách</h4>

            {ticketsList.length === 0 ? (
              <div className="p-4 text-center text-muted small">Không có ticket hỗ trợ nào.</div>
            ) : (
              <div className="tickets-scroll-container">
                {ticketsList.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`ticket-item-card ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="ticket-item-top">
                      <span className="ticket-user-role">{ticket.userRole}</span>
                      <span className={`status-badge-mini ${ticket.status}`}>{ticket.status}</span>
                    </div>
                    <strong className="ticket-subject">{ticket.subject}</strong>
                    <div className="ticket-meta-footer">
                      <span>Gửi bởi: {ticket.userName}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Chat conversation view */}
          <div className="chat-viewport-panel glassmorphism">
            {selectedTicket ? (
              <div className="conversation-wrapper">
                <div className="conversation-header">
                  <div>
                    <h4 className="conversation-title">{selectedTicket.subject}</h4>
                    <span className="conversation-desc">Thành viên: <strong>{selectedTicket.userName}</strong> ({selectedTicket.userRole})</span>
                  </div>
                </div>

                {/* Thread messages */}
                <div className="conversation-body">
                  <div className="chat-msg received">
                    <div className="chat-bubble">
                      <p>{selectedTicket.message}</p>
                      <span className="chat-time">{new Date(selectedTicket.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {selectedTicket.replies?.map((rep, idx) => (
                    <div key={idx} className={`chat-msg ${rep.sender === 'cskh' ? 'sent' : 'received'}`}>
                      <div className="chat-bubble">
                        <p>{rep.text}</p>
                        <span className="chat-time">{rep.sender === 'cskh' ? 'Hỗ trợ CSKH' : 'Hội viên'} - {new Date(rep.sentAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply inputs */}
                <div className="conversation-footer">
                  {selectedTicket.status !== 'resolved' ? (
                    <form onSubmit={handleReplyTicket} className="reply-chat-form">
                      <input
                        type="text"
                        placeholder="Nhập câu trả lời hỗ trợ..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="chat-input"
                        required
                      />
                      <button type="submit" className="chat-submit-btn" disabled={actionLoading}>Gửi</button>
                    </form>
                  ) : (
                    <div className="text-center text-muted small py-2">Ticket này đã xử lý xong.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="chat-unselected-placeholder">
                <MessageSquare size={36} className="text-muted mb-2 animate-bounce" />
                <p>Chọn một yêu cầu hỗ trợ ở danh sách bên trái để phản hồi trực tuyến.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: REVIEWS MODERATION (UC33) */}
      {activeSubTab === 'reviews' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Đánh giá &amp; Bình luận từ phía khách hàng (UC33)</h4>
          </div>

          {reviewsList.length === 0 ? (
            <div className="empty-state-panel">
              <Star size={36} className="text-muted" />
              <h5>Chưa có đánh giá nào!</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-dashboard-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Nội dung nhận xét</th>
                    <th>Đánh giá</th>
                    <th>Ngày viết</th>
                    <th>Hiển thị</th>
                    <th style={{ textAlign: 'center' }}>Hành động ẩn/hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewsList.map((rev) => (
                    <tr key={rev.id}>
                      <td className="font-bold">{rev.userName}</td>
                      <td className="italic-cell">"{rev.comment}"</td>
                      <td>
                        <div className="stars-row">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={11} fill={i < rev.rating ? "#fbbf24" : "none"} color={i < rev.rating ? "#fbbf24" : "#475569"} />
                          ))}
                        </div>
                      </td>
                      <td className="text-secondary-cell">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`status-badge-mini ${rev.status === 'visible' ? 'open' : 'resolved'}`}>
                          {rev.status === 'visible' ? 'Hiển thị' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                          {rev.status === 'visible' ? (
                            <button className="btn-approve btn-danger" onClick={() => handleToggleReviewVisibility(rev.id, true)} disabled={actionLoading}>✕ Ẩn đi</button>
                          ) : (
                            <button className="btn-approve btn-success" onClick={() => handleToggleReviewVisibility(rev.id, false)} disabled={actionLoading}>✓ Hiện lại</button>
                          )}
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

      {/* SUB-VIEW 3: INCIDENTS LOG (UC35) */}
      {activeSubTab === 'incidents' && (
        <div className="data-table-panel glassmorphism">
          <div className="panel-header">
            <h4 className="panel-title">Khai báo sự cố va chạm, hỏng hóc khẩn cấp từ khách đi đường (UC35)</h4>
          </div>

          {incidentsList.length === 0 ? (
            <div className="empty-state-panel">
              <AlertTriangle size={36} className="text-green" />
              <h5>Không ghi nhận sự cố!</h5>
              <p>Không có sự cố khẩn cấp nào được báo cáo từ hành trình.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-dashboard-table">
                <thead>
                  <tr>
                    <th>Người thuê</th>
                    <th>Phương tiện</th>
                    <th>Mô tả sự cố</th>
                    <th>Ảnh hiện trường</th>
                    <th>Trạng thái hỗ trợ</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentsList.map((inc) => (
                    <tr key={inc.bookingId}>
                      <td>
                        <strong>{inc.userName}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'block' }}>{inc.userEmail}</span>
                      </td>
                      <td className="font-bold">{inc.carName}</td>
                      <td className="text-red font-bold">{inc.incident.description}</td>
                      <td>
                        {inc.incident.image ? (
                          <button className="action-btn text-teal btn-sm" onClick={() => setSelectedLicenseImage(inc.incident.image)}>
                            <Eye size={12} style={{ marginRight: 4 }} /> Xem ảnh hiện trường
                          </button>
                        ) : <span className="text-muted small">Không có ảnh</span>}
                      </td>
                      <td>
                        <span className={`kyc-status-label ${inc.incident.status === 'resolved' ? 'verified' : 'pending'}`}>
                          {inc.incident.status === 'resolved' ? 'Đã xử lý xong' : 'Đang xử lý'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell" style={{ justifyContent: 'center' }}>
                          {inc.incident.status !== 'resolved' ? (
                            <button className="btn-approve btn-success" onClick={() => handleResolveIncident(inc.bookingId)} disabled={actionLoading}>
                              ✓ Giải quyết xong
                            </button>
                          ) : (
                            <span className="text-green font-bold small">Đã hỗ trợ xong</span>
                          )}
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

      {/* SUB-VIEW 4: DISPUTES LIST (UC34) */}
      {activeSubTab === 'disputes' && (
        <div className="chat-ticket-grid">

          {/* Left Column - Disputes list */}
          <div className="ticket-list-panel glassmorphism">
            <h4 className="panel-title p-3">Đơn khiếu nại tranh chấp cọc</h4>

            {disputesList.length === 0 ? (
              <div className="p-4 text-center text-muted small">Không có hồ sơ tranh chấp nào.</div>
            ) : (
              <div className="tickets-scroll-container">
                {disputesList.map((d) => (
                  <div
                    key={d.id}
                    className={`ticket-item-card ${selectedDispute?.id === d.id ? 'active' : ''}`}
                    onClick={() => setSelectedDispute(d)}
                  >
                    <div className="ticket-item-top">
                      <span className="ticket-user-role" style={{ color: 'var(--text-orange)' }}>Trọng tài cọc</span>
                      <span className={`status-badge-mini ${d.status === 'open' ? 'open' : 'resolved'}`}>
                        {d.status === 'open' ? 'Chờ xử lý' : 'Đã xử lý'}
                      </span>
                    </div>
                    <p className="ticket-subject" style={{ fontSize: '12.5px', marginTop: 4, height: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</p>
                    <div className="ticket-meta-footer">
                      <span>Khách: {d.renterName} ➔ Chủ xe: {d.ownerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Trọng tài verdict */}
          <div className="chat-viewport-panel glassmorphism">
            {selectedDispute ? (
              <div className="conversation-wrapper">
                <div className="conversation-header" style={{ borderBottom: '1px solid var(--admin-border-color)' }}>
                  <h4 className="conversation-title" style={{ color: 'var(--text-orange)' }}>Hồ sơ trọng tài tranh chấp tiền cọc</h4>
                  <span className="conversation-desc">Nguyên đơn: <strong>{selectedDispute.renterName}</strong> | Bị đơn: <strong>{selectedDispute.ownerName}</strong></span>
                </div>

                <div className="conversation-body" style={{ padding: 20 }}>
                  <div className="dispute-evidence-box">
                    <span className="box-tag text-red">LÝ DO KHIẾU NẠI CỦA KHÁCH THUÊ:</span>
                    <p className="box-text">{selectedDispute.description}</p>
                  </div>

                  {selectedDispute.status === 'resolved' && (
                    <div className="dispute-evidence-box mt-4 bg-green-tint border-green">
                      <span className="box-tag text-green">PHÁN QUYẾT ĐỘC LẬP TỪ CSKH:</span>
                      <p className="box-text italic">"{selectedDispute.resolutionDetails}"</p>
                    </div>
                  )}
                </div>

                <div className="conversation-footer" style={{ borderTop: '1px solid var(--admin-border-color)' }}>
                  {selectedDispute.status === 'open' ? (
                    <form onSubmit={handleResolveDispute} className="verdict-form">
                      <textarea
                        placeholder="Nhập phán quyết trọng tài phân chia cọc (vd: Hoàn cọc 100% cho renter do xe bị lỗi kỹ thuật trước đó...)"
                        value={disputeVerdict}
                        onChange={(e) => setDisputeVerdict(e.target.value)}
                        className="verdict-textarea"
                        rows="3"
                        required
                      />
                      <button type="submit" className="verdict-submit-btn" disabled={actionLoading}>Ban hành phán quyết</button>
                    </form>
                  ) : (
                    <div className="text-center text-muted small py-2">Trọng tài đã giải quyết và ban hành phán quyết thành công.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="chat-unselected-placeholder">
                <Shield size={36} className="text-muted mb-2 animate-pulse" />
                <p>Chọn một vụ việc khiếu nại tranh chấp cọc bên trái để xem hồ sơ và phán quyết.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: AI RISK ALERTS & SUGGESTIONS */}
      {activeSubTab === 'ai_alerts' && (
        <div className="ai-risk-grid fade-in-animation">

          {/* AI Alerts Card */}
          <div className="ai-card-panel glassmorphism">
            <div className="ai-panel-header">
              <div className="ai-header-title">
                <Brain size={20} className="text-teal animate-bounce" />
                <span>Hệ thống AI phát hiện rủi ro và gian lận (UC36)</span>
              </div>
              <span className="security-status-badge">Đang giám sát</span>
            </div>

            <div className="ai-alerts-list">
              <div className="ai-alert-row danger">
                <div className="ai-alert-icon"><ShieldAlert size={16} /></div>
                <div className="ai-alert-content">
                  <div className="ai-alert-title-row">
                    <strong>Trùng lặp CCCD bất thường</strong>
                    <span className="risk-tag risk-high">Rủi ro: Cao</span>
                  </div>
                  <p className="ai-alert-desc">Phát hiện hình ảnh CCCD trên tài khoản mới trùng khớp với CCCD của tài khoản đã bị đình chỉ trước đó lúc 02:45 AM. Giao dịch đã bị chặn tự động.</p>
                </div>
              </div>

              <div className="ai-alert-row warning">
                <div className="ai-alert-icon"><AlertTriangle size={16} /></div>
                <div className="ai-alert-content">
                  <div className="ai-alert-title-row">
                    <strong>Giao dịch đêm rủi ro</strong>
                    <span className="risk-tag risk-medium">Rủi ro: Trung bình</span>
                  </div>
                  <p className="ai-alert-desc">Hội viên mới đăng ký thực hiện đặt cọc xe điện hạng sang VinFast VF9 mà không xác minh lịch sử bằng lái trước đó. Hệ thống đã phát cảnh báo đỏ và yêu cầu cọc tiền mặt bổ sung.</p>
                </div>
              </div>

              <div className="ai-alert-row info">
                <div className="ai-alert-icon"><Info size={16} /></div>
                <div className="ai-alert-content">
                  <div className="ai-alert-title-row">
                    <strong>Khoảng cách giao xe bất thường</strong>
                    <span className="risk-tag risk-low">Rủi ro: Thấp</span>
                  </div>
                  <p className="ai-alert-desc">Khoảng cách từ vị trí GPS định vị của khách đến điểm nhận xe vượt quá 150km. Phát đi cảnh báo nhắc nhở chủ xe gọi điện xác nhận lộ trình.</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Pricing Suggestions Panel */}
          <div className="ai-card-panel glassmorphism">
            <div className="ai-panel-header">
              <div className="ai-header-title">
                <TrendingUp size={20} className="text-teal" />
                <span>AI đề xuất cấu hình giá cải thiện doanh thu (UC38)</span>
              </div>
            </div>

            <div className="ai-suggestions-list">
              <div className="ai-suggest-box">
                <div className="suggest-top">
                  <strong>Tối ưu hóa giá thuê cuối tuần</strong>
                  <span className="profit-gain-tag">+12% Doanh thu</span>
                </div>
                <p className="suggest-desc">Nhu cầu du lịch cuối tuần tăng mạnh tại khu vực Đà Nẵng. Đề xuất tăng giá trần thuê xe 10% đối với các dòng xe Sedan trong khoảng thời gian từ thứ Sáu đến Chủ Nhật.</p>
              </div>

              <div className="ai-suggest-box">
                <div className="suggest-top">
                  <strong>Kích cầu ngày thấp điểm (Thứ 2 - Thứ 4)</strong>
                  <span className="profit-gain-tag">+8% Lấp đầy</span>
                </div>
                <p className="suggest-desc">Tỷ lệ xe nhàn rỗi tăng cao vào giữa tuần. Đề xuất áp dụng chương trình giảm giá tự động 5% cho khách hàng thuê từ 3 ngày trở lên bắt đầu từ thứ Hai.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
