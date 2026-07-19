import React, { useMemo } from 'react';
import { ArrowLeft, Clock, Calendar, User, Facebook, Twitter, Link as LinkIcon, Share2 } from 'lucide-react';
import { mockBlogPosts } from './Blog';
import { useToast } from '../../components/Toast';

export const BlogDetail = ({ post, onBack, onSelectPost }) => {
  const { showToast } = useToast();

  const handleShareClick = (platform) => {
    showToast(`Đã sao chép liên kết chia sẻ bài viết lên ${platform}!`, 'success');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Đã sao chép liên kết bài viết vào bộ nhớ tạm!', 'success');
  };

  // Find 2 related posts (excluding the current one, matching same category if possible)
  const relatedPosts = useMemo(() => {
    const filterSameCategory = mockBlogPosts.filter(p => p.id !== post.id && p.category === post.category);
    if (filterSameCategory.length >= 2) {
      return filterSameCategory.slice(0, 2);
    }
    const filterOthers = mockBlogPosts.filter(p => p.id !== post.id);
    return [...filterSameCategory, ...filterOthers].slice(0, 2);
  }, [post.id, post.category]);

  return (
    <div className="blog-detail-container">
      {/* Back button */}
      <button className="blog-detail-back-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Quay lại danh sách bài viết</span>
      </button>

      {/* Hero Image */}
      <div className="blog-detail-hero-img-wrapper">
        <img src={post.image} alt={post.title} className="blog-detail-hero-img" />
      </div>

      {/* Article Header */}
      <header className="blog-detail-header">
        <span className="blog-detail-category">{post.category}</span>
        <h1 className="blog-detail-title">{post.title}</h1>
        
        <div className="blog-detail-meta">
          <div className="blog-detail-author-info">
            <div className="author-avatar-dummy">
              {post.author ? post.author.charAt(0) : 'T'}
            </div>
            <div className="author-name-title">
              <span className="author-name">{post.author || 'ViVuCar Team'}</span>
              <span className="publish-date">{post.date}</span>
            </div>
          </div>

          <div className="blog-detail-share-box">
            <button className="share-btn" onClick={() => handleShareClick('Facebook')} title="Chia sẻ lên Facebook">
              <Facebook size={16} />
            </button>
            <button className="share-btn" onClick={() => handleShareClick('Twitter')} title="Chia sẻ lên Twitter">
              <Twitter size={16} />
            </button>
            <button className="share-btn" onClick={copyLink} title="Sao chép liên kết">
              <LinkIcon size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Rich Text Body */}
      <article 
        className="blog-detail-body" 
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Suggested related posts */}
      {relatedPosts.length > 0 && (
        <section className="blog-detail-suggested-section">
          <h3 className="suggested-title">Bài viết liên quan</h3>
          <div className="suggested-grid">
            {relatedPosts.map((rPost) => (
              <article 
                key={rPost.id} 
                className="post-card" 
                onClick={() => onSelectPost(rPost)}
                style={{ cursor: 'pointer' }}
              >
                <div className="post-img-wrapper" style={{ height: '140px' }}>
                  <img src={rPost.image} alt={rPost.title} className="post-img" />
                </div>
                <div className="post-content" style={{ padding: '16px' }}>
                  <div className="post-meta-row" style={{ marginBottom: '8px' }}>
                    <span className="post-author" style={{ fontSize: '12px' }}>{rPost.author}</span>
                    <span className="post-dot"></span>
                    <span style={{ fontSize: '11.5px' }}>{rPost.date}</span>
                  </div>
                  <h4 className="post-title" style={{ fontSize: '14.5px', marginBottom: '8px', lineHeight: '1.4' }}>
                    {rPost.title}
                  </h4>
                  <div className="post-footer" style={{ marginTop: 'auto' }}>
                    <span className="tag-badge" style={{ fontSize: '10.5px', padding: '2px 8px' }}>{rPost.category}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
