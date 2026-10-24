import React from 'react';

export default function BlogCard({ post, onSelectPost }) {
  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

  const authorInitial = post.author ? post.author.charAt(0).toUpperCase() : 'A';

  return (
    <article 
      className="post-card" 
      onClick={() => onSelectPost(post.slug)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectPost(post.slug);
        }
      }}
    >
      <div className="post-card-image-wrap">
        {post.cover_image ? (
          <img 
            src={post.cover_image} 
            alt={post.title} 
            className="post-card-image"
            loading="lazy"
            onError={(e) => {
              // Graceful fallback if image link fails
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: '2rem'
          }}>
            ✍️
          </div>
        )}
        <span className="post-card-category-badge">{post.category}</span>
      </div>

      <div className="post-card-content">
        <div className="post-card-meta">
          <span>{formattedDate}</span>
          <span className="post-card-meta-dot"></span>
          <span>{post.category}</span>
        </div>

        <h3 className="post-card-title">{post.title}</h3>
        
        <p className="post-card-excerpt">
          {post.excerpt || post.content.substring(0, 140) + '...'}
        </p>

        <div className="post-card-footer">
          <div className="post-card-author">
            <div className="author-avatar">{authorInitial}</div>
            <span>{post.author}</span>
          </div>

          <div className="post-card-badges">
            <span className="count-badge likes" title={`${post.likes_count} Likes`}>
              ❤️ {post.likes_count || 0}
            </span>
            <span className="count-badge comments" title={`${post.comments_count} Comments & Replies`}>
              💬 {post.comments_count || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
