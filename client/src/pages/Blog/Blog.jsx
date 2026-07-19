import React, { useState, useMemo, useEffect } from 'react';
import { Search, Sparkles, BookOpen, Clock, ArrowRight } from 'lucide-react';
import './Blog.css';
export { mockBlogPosts } from './mockBlogPosts.js';
import { mockBlogPosts } from './mockBlogPosts.js';

export const Blog = ({ setCurrentTab, onSelectPost }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Tất cả');
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    setVisibleCount(6);
  }, [searchQuery, selectedTag]);

  // Available unique categories
  const categories = useMemo(() => {
    const list = ['Tất cả'];
    mockBlogPosts.forEach(post => {
      if (!list.includes(post.category)) {
        list.push(post.category);
      }
    });
    return list;
  }, []);

  // Compute counts for categories sidebar
  const categoryCounts = useMemo(() => {
    const counts = { 'Tất cả': mockBlogPosts.length };
    mockBlogPosts.forEach(post => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtered post computation
  const filteredPosts = useMemo(() => {
    return mockBlogPosts.filter(post => {
      const matchesTag = selectedTag === 'Tất cả' || post.category === selectedTag;
      const matchesSearch = searchQuery.trim() === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    });
  }, [selectedTag, searchQuery]);

  // Extract featured posts (only displayed on default search state)
  const isDefaultState = searchQuery.trim() === '' && selectedTag === 'Tất cả';

  const featuredBigPost = useMemo(() => {
    return mockBlogPosts.find(post => post.id === 1);
  }, []);

  const featuredSecondaryPosts = useMemo(() => {
    return mockBlogPosts.filter(post => post.id === 2 || post.id === 3 || post.id === 4);
  }, []);

  const normalFeedPosts = useMemo(() => {
    if (isDefaultState) {
      // Exclude the featured posts from the main grid to avoid duplicate listing
      return mockBlogPosts.filter(post => post.id !== 1 && post.id !== 2 && post.id !== 3 && post.id !== 4);
    }
    return filteredPosts;
  }, [isDefaultState, filteredPosts]);

  const displayedFeedPosts = useMemo(() => {
    return normalFeedPosts.slice(0, visibleCount);
  }, [normalFeedPosts, visibleCount]);

  return (
    <div className="blog-container">
      {/* Blog Hero & Header Search Controls */}
      <header className="blog-header">
        <h1 className="blog-title">ViVuCar Blog</h1>
        <p className="blog-subtitle">Cập nhật cẩm nang thuê xe tự lái, bí quyết du lịch và tin tức công nghệ xe hơi mới nhất</p>
        
        <div className="blog-controls">
          <div className="blog-search-bar">
            <Search className="blog-search-icon" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, cẩm nang..."
              className="blog-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="blog-tags-filter">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`blog-tag-btn ${selectedTag === cat ? 'active' : ''}`}
                onClick={() => setSelectedTag(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Featured Articles Section (Only shown when not searching or filtering) */}
      {isDefaultState && (
        <section className="blog-featured-section">
          <h2 className="blog-feed-title" style={{ marginBottom: '20px' }}>Bài viết nổi bật</h2>
          
          <div className="featured-tiles-grid">
            {/* Big Featured Left Column */}
            {featuredBigPost && (
              <div 
                className="featured-big-card" 
                onClick={() => onSelectPost(featuredBigPost)}
                style={{ cursor: 'pointer' }}
              >
                <div className="featured-big-img-wrapper">
                  <img src={featuredBigPost.image} alt={featuredBigPost.title} className="featured-big-img" />
                </div>
                <div className="featured-big-content">
                  <div>
                    <div className="post-meta-row">
                      <span className="post-author">{featuredBigPost.author}</span>
                      <span className="post-dot"></span>
                      <span>{featuredBigPost.date}</span>
                    </div>
                    <h3 className="featured-big-title">{featuredBigPost.title}</h3>
                    <p className="featured-big-excerpt">{featuredBigPost.excerpt}</p>
                  </div>
                  
                  <div className="featured-tags-row">
                    <span className="tag-badge featured">Nổi bật</span>
                    <span className="tag-badge">{featuredBigPost.category}</span>
                  </div>
                </div>
              </div>
            )}

            {/* List of Small Featured Right Column */}
            <div className="featured-secondary-list">
              {featuredSecondaryPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="featured-small-card" 
                  onClick={() => onSelectPost(post)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="featured-small-img-wrapper">
                    <img src={post.image} alt={post.title} className="featured-small-img" />
                  </div>
                  <div className="featured-small-content">
                    <div>
                      <h4 className="featured-small-title">{post.title}</h4>
                      <div className="post-meta-row" style={{ margin: 0 }}>
                        <span className="post-author" style={{ fontSize: '12px' }}>{post.author}</span>
                        <span className="post-dot"></span>
                        <span style={{ fontSize: '11.5px' }}>{post.date}</span>
                      </div>
                    </div>
                    <div className="featured-tags-row" style={{ marginTop: '6px' }}>
                      <span className="tag-badge" style={{ fontSize: '10.5px', padding: '2px 8px' }}>{post.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Layout: Feed + Sidebar */}
      <section className="blog-main-layout">
        {/* Left column: Grid of articles */}
        <div className="blog-feed-column">
          <h2 className="blog-feed-title">
            {isDefaultState ? 'Tất cả bài viết' : `Kết quả tìm kiếm (${filteredPosts.length})`}
          </h2>

          {displayedFeedPosts.length > 0 ? (
            <div className="blog-grid">
              {displayedFeedPosts.map((post) => (
                <article 
                  key={post.id} 
                  className="post-card" 
                  onClick={() => onSelectPost(post)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="post-img-wrapper">
                    <img src={post.image} alt={post.title} className="post-img" />
                  </div>
                  <div className="post-content">
                    <div className="post-meta-row">
                      <span className="post-author">{post.author}</span>
                      <span className="post-dot"></span>
                      <span>{post.date}</span>
                    </div>
                    <h3 className="post-title">{post.title}</h3>
                    <p className="post-excerpt">{post.excerpt}</p>
                    
                    <div className="post-footer">
                      <span className="tag-badge">{post.category}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {post.readTime}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="blog-empty-state">
              <h3>Không tìm thấy bài viết</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục lọc.</p>
              <button 
                className="blog-empty-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('Tất cả');
                }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}

          {normalFeedPosts.length > visibleCount && (
            <button className="load-more-btn" onClick={() => setVisibleCount(prev => prev + 6)}>
              Xem thêm bài viết
            </button>
          )}
        </div>

        {/* Right column: Sticky Sidebar */}
        <aside className="blog-sidebar">
          {/* Widget 1: About blog */}
          <div className="sidebar-widget">
            <h3 className="widget-title">Về ViVuCar Blog</h3>
            <div className="about-logo">
              <svg viewBox="0 0 100 100" width="28" height="28" style={{ flexShrink: 0 }}>
                <rect width="100" height="100" rx="24" fill="#009698" />
                <path d="M50 18 C62 18, 76 28, 76 50 C76 72, 62 82, 50 82 C38 82, 24 72, 24 50 C24 28, 38 18, 50 18 Z" fill="none" stroke="white" strokeWidth="6" />
                <circle cx="50" cy="50" r="12" fill="white" />
              </svg>
              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>ViVuCar</span>
            </div>
            <p className="about-text">
              ✨ Ứng dụng đặt xe tự lái thông minh. Chia sẻ thông tin hữu ích giúp chuyến đi của bạn an toàn, thảnh thơi và ngập tràn niềm vui!
            </p>
          </div>

          {/* Widget 2: Interactive Categories */}
          <div className="sidebar-widget">
            <h3 className="widget-title">Khám phá danh mục</h3>
            <div className="sidebar-categories-list">
              {categories.map((cat) => (
                <div 
                  key={cat} 
                  className={`sidebar-category-item ${selectedTag === cat ? 'active' : ''}`}
                  onClick={() => setSelectedTag(cat)}
                >
                  <span>{cat}</span>
                  <span className="category-count">{categoryCounts[cat] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};
