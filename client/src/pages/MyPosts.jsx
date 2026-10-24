import React, { useState, useEffect } from 'react';
import { fetchMyPosts } from '../services/api';

export default function MyPosts({ currentUser, onSelectPost, onOpenCreate, onEditPost, onBackToFeed }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'published', 'draft'

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      setError('');
      const data = await fetchMyPosts();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load user posts:', err);
      setError(err.message || 'Failed to retrieve your articles.');
    } finally {
      setLoading(false);
    }
  }

  const filteredPosts = posts.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  return (
    <div style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button className="back-link" onClick={onBackToFeed} style={{ marginBottom: '0.5rem' }}>
            ← Back to Feed
          </button>
          <h1 className="serif-heading" style={{ fontSize: '2rem', margin: 0 }}>
            My Author Studio
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage your articles, drafts, and review reader engagement.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={onOpenCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>✍️</span>
          <span>Write New Article</span>
        </button>
      </div>

      {/* Author Metrics Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card">
          <div className="stat-number">{posts.length}</div>
          <div className="stat-label">Total Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#34d399' }}>{publishedCount}</div>
          <div className="stat-label">Published Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#fbbf24' }}>{draftCount}</div>
          <div className="stat-label">Draft Articles</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: '#f43f5e' }}>{totalLikes}</div>
          <div className="stat-label">Total Appreciation Likes</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem'
      }}>
        <button 
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All ({posts.length})
        </button>
        <button 
          className={`btn btn-sm ${filter === 'published' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('published')}
        >
          Published ({publishedCount})
        </button>
        <button 
          className={`btn btn-sm ${filter === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('draft')}
        >
          Drafts ({draftCount})
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          marginBottom: '1.5rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          Loading your articles...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="empty-state" style={{ padding: '3.5rem 1rem' }}>
          <div className="empty-state-icon">✍️</div>
          <h3 className="empty-state-title">No Articles Found</h3>
          <p className="empty-state-desc">
            {filter === 'all' 
              ? 'You have not authored any articles yet. Start writing your first masterpiece!' 
              : `You have no ${filter} articles currently.`}
          </p>
          <button className="btn btn-primary" onClick={onOpenCreate}>
            Write Your First Article
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPosts.map(post => (
            <div 
              key={post.id}
              className="comment-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                gap: '1.5rem'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <span className={`status-badge ${post.status}`}>
                    {post.status.toUpperCase()}
                  </span>
                  <span className="article-category-badge" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    {post.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 
                  style={{ 
                    fontSize: '1.15rem', 
                    margin: '0 0 0.35rem', 
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                  onClick={() => onSelectPost(post.slug)}
                >
                  {post.title}
                </h3>

                <p style={{ 
                  margin: 0, 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {post.excerpt || 'No summary provided.'}
                </p>
              </div>

              {/* Engagement Stats & Edit Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <span className="count-badge likes" style={{ fontSize: '0.8rem' }}>
                  ❤️ {post.likes_count || 0}
                </span>
                <span className="count-badge comments" style={{ fontSize: '0.8rem' }}>
                  💬 {post.comments_count || 0}
                </span>

                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => onEditPost(post)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>✏️</span>
                  <span>Edit</span>
                </button>

                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => onSelectPost(post.slug)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
