import React, { useState, useMemo } from 'react';
import { Search, MapPin, Briefcase, Award, ShieldCheck, TrendingUp, Users, DollarSign, Calendar, ClipboardList, CheckCircle } from 'lucide-react';
import { useToast } from '../../components/Toast';
import './Recruitment.css';

const mockJobs = [
  {
    id: 1,
    title: 'Kỹ thuật viên Điện Ô tô',
    department: 'Kỹ thuật',
    location: 'Hà Nội',
    salary: 'Lương cạnh tranh + Thưởng hiệu quả + Signing bonus 1 tháng lương',
    type: 'Full-time (8:00 – 18:00, Thứ 2 – Thứ 6)',
    experience: 'Tối thiểu 1 năm (chấp nhận sinh viên mới ra trường ngành Điện ô tô), có bằng lái B2 là lợi thế',
    tasks: [
      'Lắp đặt, kiểm tra, sửa chữa và bảo dưỡng hệ thống điện, cảm biến và thiết bị định vị GPS/camera trên xe ô tô.',
      'Hỗ trợ chủ xe và khách hàng xử lý sự cố kỹ thuật về điện của xe trên nền tảng ViVuCar.',
      'Giao nhận xe cho khách hàng, đảm bảo xe ở trạng thái kỹ thuật tốt trước và sau khi bàn giao.',
      'Lập báo cáo kiểm tra tình trạng kỹ thuật định kỳ cho đội xe đối tác.'
    ]
  },
  {
    id: 2,
    title: 'Kỹ thuật viên Điện Ô tô',
    department: 'Kỹ thuật',
    location: 'TP. Hồ Chí Minh',
    salary: 'Lương cạnh tranh + Thưởng hiệu quả + Signing bonus 1 tháng lương',
    type: 'Full-time (8:00 – 18:00, Thứ 2 – Thứ 6)',
    experience: 'Tối thiểu 1 năm (chấp nhận sinh viên mới ra trường ngành Điện ô tô), có bằng lái B2 là lợi thế',
    tasks: [
      'Lắp đặt, kiểm tra, sửa chữa và bảo dưỡng hệ thống điện, cảm biến và thiết bị định vị GPS/camera trên xe ô tô.',
      'Hỗ trợ chủ xe và khách hàng xử lý sự cố kỹ thuật về điện của xe trên nền tảng ViVuCar.',
      'Giao nhận xe cho khách hàng, đảm bảo xe ở trạng thái kỹ thuật tốt trước và sau khi bàn giao.',
      'Lập báo cáo kiểm tra tình trạng kỹ thuật định kỳ cho đội xe đối tác.'
    ]
  },
  {
    id: 3,
    title: 'Nhân viên Vận hành & Giao nhận xe',
    department: 'Vận hành & Kinh doanh',
    location: 'TP. Hồ Chí Minh',
    salary: '8 - 12 triệu/tháng + Phụ cấp đi lại',
    type: 'Xoay ca linh hoạt (6 ngày/tuần)',
    experience: 'Có bằng lái xe B2 trở lên (lái cứng), nhanh nhẹn, giao tiếp lịch sự chu đáo',
    tasks: [
      'Thực hiện giao nhận xe tự lái cho khách hàng, kiểm tra ngoại quan, chụp ảnh và ký biên bản bàn giao.',
      'Vận chuyển điều phối xe giữa các bãi đỗ và trung tâm kỹ thuật của ViVuCar.',
      'Hỗ trợ và hướng dẫn khách hàng kích hoạt xe, giải quyết các sự cố nhỏ phát sinh dọc đường.'
    ]
  },
  {
    id: 4,
    title: 'Nhân viên Vận hành & Giao nhận xe',
    department: 'Vận hành & Kinh doanh',
    location: 'Đà Nẵng',
    salary: '7 - 10 triệu/tháng + Phụ cấp đi lại',
    type: 'Xoay ca linh hoạt (6 ngày/tuần)',
    experience: 'Có bằng lái xe B2 trở lên (lái cứng), nhanh nhẹn, giao tiếp lịch sự chu đáo',
    tasks: [
      'Thực hiện giao nhận xe tự lái cho khách hàng, kiểm tra ngoại quan, chụp ảnh và ký biên bản bàn giao.',
      'Vận chuyển điều phối xe giữa các bãi đỗ và trung tâm kỹ thuật của ViVuCar.',
      'Hỗ trợ và hướng dẫn khách hàng kích hoạt xe, giải quyết các sự cố nhỏ phát sinh dọc đường.'
    ]
  },
  {
    id: 5,
    title: 'Chuyên viên Chăm sóc Khách hàng (CSKH)',
    department: 'CSKH',
    location: 'TP. Hồ Chí Minh',
    salary: '9 - 14 triệu/tháng + Thưởng KPI chất lượng cuộc gọi',
    type: 'Full-time xoay ca (5.5 ngày/tuần)',
    experience: 'Tối thiểu 6 tháng làm tổng đài, CSKH hoặc Telesales. Giọng nói rõ ràng, dễ nghe',
    tasks: [
      'Tiếp nhận cuộc gọi và tin nhắn yêu cầu từ khách hàng, hỗ trợ đặt xe và giải đáp thủ tục thuê xe.',
      'Phối hợp với đội Vận hành để hỗ trợ các trường hợp cứu hộ khẩn cấp hoặc sự cố dọc đường.',
      'Thu thập phản hồi, khảo sát mức độ hài lòng của khách hàng và báo cáo cải thiện dịch vụ.'
    ]
  },
  {
    id: 6,
    title: 'Chuyên viên Phát triển Đối tác Chủ xe',
    department: 'Vận hành & Kinh doanh',
    location: 'Toàn quốc',
    salary: 'Lương cơ bản + Hoa hồng ký gửi xe (Không giới hạn thu nhập)',
    type: 'Full-time / Linh hoạt địa điểm (Remote)',
    experience: 'Tối thiểu 1 năm làm kinh doanh, bán hàng. Ưu tiên người có kinh nghiệm mảng ô tô/vận tải',
    tasks: [
      'Tìm kiếm, tiếp cận và tư vấn các chủ xe cá nhân hoặc doanh nghiệp hợp tác ký gửi xe nhàn rỗi lên ViVuCar.',
      'Hướng dẫn đối tác chủ xe đăng ký tài khoản, đăng xe, tối ưu hóa giá thuê và hình ảnh sản phẩm.',
      'Chăm sóc và đồng hành hỗ trợ tối đa hóa doanh thu cho mạng lưới đối tác chủ xe hiện tại.'
    ]
  }
];

const benefitsList = [
  {
    icon: <Users size={24} />,
    title: 'Môi trường năng động',
    desc: 'Đội ngũ trẻ trung, sáng tạo và đoàn kết. Văn hóa cởi mở, tôn trọng cá tính và đề cao tinh thần tự chủ.'
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Lương thưởng xứng đáng',
    desc: 'Thu nhập cạnh tranh, đánh giá tăng lương định kỳ hằng năm. Thưởng hiệu suất và lương tháng 13 hấp dẫn.'
  },
  {
    icon: <Award size={24} />,
    title: 'Đào tạo chuyên sâu',
    desc: 'Được tham gia các khóa học nâng cao nghiệp vụ kỹ thuật ô tô, quản lý vận hành và kỹ năng mềm miễn phí.'
  },
  {
    icon: <TrendingUp size={24} />,
    title: 'Lộ trình thăng tiến',
    desc: 'Cơ hội phát triển rõ ràng. ViVuCar luôn ưu tiên đề bạt các nhân sự nội bộ xuất sắc lên vị trí quản lý.'
  }
];

export const Recruitment = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Tất cả');
  const [selectedDepartment, setSelectedDepartment] = useState('Tất cả');
  const [appliedJob, setAppliedJob] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cvLink, setCvLink] = useState('');
  const [coverLetter, setCoverLetter] = useState('');

  // Extract unique locations & departments for filters
  const locations = useMemo(() => {
    const list = ['Tất cả'];
    mockJobs.forEach(job => {
      if (!list.includes(job.location)) {
        list.push(job.location);
      }
    });
    return list;
  }, []);

  const departments = useMemo(() => {
    const list = ['Tất cả'];
    mockJobs.forEach(job => {
      if (!list.includes(job.department)) {
        list.push(job.department);
      }
    });
    return list;
  }, []);

  // Filtered jobs logic
  const filteredJobs = useMemo(() => {
    return mockJobs.filter(job => {
      const matchesSearch = searchQuery.trim() === '' || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLocation = selectedLocation === 'Tất cả' || job.location === selectedLocation;
      const matchesDepartment = selectedDepartment === 'Tất cả' || job.department === selectedDepartment;

      return matchesSearch && matchesLocation && matchesDepartment;
    });
  }, [searchQuery, selectedLocation, selectedDepartment]);

  const handleApplyClick = (job) => {
    setAppliedJob(job);
    setFullName('');
    setEmail('');
    setPhone('');
    setCvLink('');
    setCoverLetter('');
  };

  const handleCloseModal = () => {
    setAppliedJob(null);
  };

  const handleSubmitApplication = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !cvLink.trim()) {
      showToast('Vui lòng điền đầy đủ các trường thông tin bắt buộc!', 'error');
      return;
    }

    // Mock successful submission
    showToast(`Ứng tuyển thành công vị trí ${appliedJob.title} (${appliedJob.location})! ViVuCar sẽ liên hệ bạn sớm nhất.`, 'success');
    setAppliedJob(null);
  };

  return (
    <div className="recruitment-container">
      {/* Hero Section */}
      <header className="recruitment-header">
        <h1 className="recruitment-title">Gia nhập đội ngũ ViVuCar</h1>
        <p className="recruitment-subtitle">
          Chúng tôi đang tìm kiếm những người bạn đồng hành tài năng, nhiệt huyết để cùng nhau kiến tạo và mang đến trải nghiệm thuê xe tự lái thông minh, tin cậy hàng đầu Việt Nam.
        </p>

        <div className="recruitment-controls">
          <div className="recruitment-search-wrapper">
            <Search className="recruitment-search-icon" size={20} />
            <input
              type="text"
              placeholder="Tìm vị trí tuyển dụng (ví dụ: Kỹ thuật viên, Vận hành...)"
              className="recruitment-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="recruitment-filters-row">
            <span style={{ fontSize: '0.9rem', fontWeight: 700, alignSelf: 'center', color: '#4a5568' }}>Địa điểm:</span>
            {locations.map(loc => (
              <button
                key={loc}
                className={`recruitment-filter-btn ${selectedLocation === loc ? 'active' : ''}`}
                onClick={() => setSelectedLocation(loc)}
              >
                {loc}
              </button>
            ))}
          </div>

          <div className="recruitment-filters-row">
            <span style={{ fontSize: '0.9rem', fontWeight: 700, alignSelf: 'center', color: '#4a5568' }}>Phòng ban:</span>
            {departments.map(dept => (
              <button
                key={dept}
                className={`recruitment-filter-btn ${selectedDepartment === dept ? 'active' : ''}`}
                onClick={() => setSelectedDepartment(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Benefits Section */}
      <section className="recruitment-benefits">
        <h2 className="section-title-center">Vì sao nên chọn ViVuCar?</h2>
        <div className="benefits-grid">
          {benefitsList.map((b, index) => (
            <div className="benefit-card" key={index}>
              <div className="benefit-icon-wrapper">{b.icon}</div>
              <h3 className="benefit-title">{b.title}</h3>
              <p className="benefit-desc">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jobs Section */}
      <section className="recruitment-jobs-section">
        <h2 className="section-title-center">Các vị trí đang tuyển dụng</h2>
        
        {filteredJobs.length > 0 ? (
          <div className="jobs-grid">
            {filteredJobs.map(job => (
              <article className="job-card" key={job.id}>
                <div className="job-card-header">
                  <div className="job-title-row">
                    <h3 className="job-title">{job.title}</h3>
                    <span className="badge-location">{job.location}</span>
                  </div>
                  <div className="job-salary">
                    <DollarSign size={16} />
                    <span>{job.salary}</span>
                  </div>

                  <div className="job-meta-details">
                    <div className="meta-item">
                      <Calendar size={14} style={{ color: '#009698' }} />
                      <span><span className="meta-label">Hình thức:</span> {job.type}</span>
                    </div>
                    <div className="meta-item">
                      <CheckCircle size={14} style={{ color: '#009698' }} />
                      <span><span className="meta-label">Kinh nghiệm:</span> {job.experience}</span>
                    </div>
                  </div>

                  <div className="job-tasks-box">
                    <div className="tasks-box-title">
                      <ClipboardList size={14} style={{ color: '#009698' }} />
                      <span>Nhiệm vụ chính</span>
                    </div>
                    <ul className="tasks-list">
                      {job.tasks.map((task, idx) => (
                        <li key={idx}>{task}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button 
                  className="job-apply-btn" 
                  onClick={() => handleApplyClick(job)}
                >
                  Ứng tuyển ngay
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="jobs-empty-state">
            <h3>Không tìm thấy vị trí phù hợp</h3>
            <p>Thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc địa điểm/phòng ban.</p>
            <button 
              className="jobs-empty-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedLocation('Tất cả');
                setSelectedDepartment('Tất cả');
              }}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </section>

      {/* Application Form Modal */}
      {appliedJob && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-header-title">Ứng tuyển vị trí</h3>
              <p className="modal-header-subtitle">{appliedJob.title} - {appliedJob.location}</p>
              <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmitApplication} className="apply-form">
                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên *</label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    placeholder="Nguyễn Văn A"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      required
                      placeholder="email@example.com"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại *</label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      placeholder="0912345678"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cvLink">Link CV cá nhân (Google Drive / Dropbox / PDF) *</label>
                  <input
                    type="url"
                    id="cvLink"
                    required
                    placeholder="https://drive.google.com/.../my-cv.pdf"
                    className="form-input"
                    value={cvLink}
                    onChange={(e) => setCvLink(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="coverLetter">Lời giới thiệu bản thân</label>
                  <textarea
                    id="coverLetter"
                    placeholder="Mô tả ngắn gọn kinh nghiệm nổi bật hoặc lý do bạn mong muốn gia nhập ViVuCar..."
                    className="form-textarea"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>

                <div className="form-footer">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-primary">
                    Nộp hồ sơ ứng tuyển
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
