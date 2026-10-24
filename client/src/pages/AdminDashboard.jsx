import React, { useState, useEffect } from 'react';
import { 
  fetchAdminPosts, 
  createAdminPost, 
  updateAdminPost, 
  updateAdminPostStatus, 
  archiveAdminPost,
  fetchAdminComments,
  editAdminComment,
  deleteAdminComment,
  editAdminReply,
  deleteAdminReply,
  fetchPostBySlug
} from '../services/api';

export default function AdminDashboard({ onSelectPost, onBackToFeed }) {
  const [activeTab, setActiveTab] = useState('articles'); // 'articles' or 'moderation'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'published', 'draft', 'archived'
  
  const [postsData, setPostsData] = useState({ stats: {}, posts: [] });
  const [moderationData, setModerationData] = useState({ comments: [], replies: [] });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [visibleAdminCount, setVisibleAdminCount] = useState(50);

  // Modal State for Create / Edit Post
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    category: 'Engineering',
    tags: '',
    author: 'Administrator',
    cover_image: '',
    excerpt: '',
    content: '',
    status: 'draft'
  });
  const [modalError, setModalError] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Edit Reply State
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function loadAllAdminData() {
    try {
      setLoading(true);
      setError('');
      const [postsRes, modRes] = await Promise.all([
        fetchAdminPosts(),
        fetchAdminComments()
      ]);
      setPostsData(postsRes);
      setModerationData(modRes);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      setError(err.message || 'Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  }

  // Open Modal for New Post
  function handleOpenCreateModal() {
    setEditingPost(null);
    setModalForm({
      title: '',
      category: 'Engineering',
      tags: 'WebDev, Architecture',
      author: 'Administrator',
      cover_image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      excerpt: '',
      content: '',
      status: 'published'
    });
    setModalError('');
    setIsModalOpen(true);
  }

  // Open Modal to Edit Existing Post
  async function handleOpenEditModal(post) {
    let contentBody = post.content || '';
    if (!contentBody && post.slug) {
      try {
        const fullPost = await fetchPostBySlug(post.slug);
        contentBody = fullPost.content || '';
      } catch (err) {
        console.error('Failed to load full post content:', err);
      }
    }

    setEditingPost(post);
    setModalForm({
      title: post.title,
      category: post.category,
      tags: post.tags || '',
      author: post.author || 'Administrator',
      cover_image: post.cover_image || '',
      excerpt: post.excerpt || '',
      content: contentBody,
      status: post.status
    });
    setModalError('');
    setIsModalOpen(true);
  }

  // Save Modal Form (Create or Update)
  async function handleSavePost(e) {
    e.preventDefault();
    setModalError('');

    if (!modalForm.title.trim()) {
      setModalError('Title is mandatory.');
      return;
    }
    if (!modalForm.content.trim()) {
      setModalError('Article content cannot be empty.');
      return;
    }
    if (!modalForm.category.trim()) {
      setModalError('Category is mandatory.');
      return;
    }

    try {
      setModalSaving(true);
      if (editingPost) {
        await updateAdminPost(editingPost.id, modalForm);
        showToast('Article updated successfully.');
      } else {
        await createAdminPost(modalForm);
        showToast('New article created successfully.');
      }
      setIsModalOpen(false);
      loadAllAdminData();
    } catch (err) {
      setModalError(err.message || 'Failed to save article.');
    } finally {
      setModalSaving(false);
    }
  }

  // Quick toggle status (draft <-> published)
  async function handleToggleStatus(post) {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      await updateAdminPostStatus(post.id, nextStatus);
      showToast(`Article status changed to ${nextStatus}.`);
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to change status.');
    }
  }

  // Archive Post (Soft delete)
  async function handleArchivePost(post) {
    if (!window.confirm(`Are you sure you want to archive "${post.title}"? It will be hidden from public view.`)) {
      return;
    }
    try {
      await archiveAdminPost(post.id);
      showToast('Article moved to archive.');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to archive article.');
    }
  }

  // Moderation: Edit Comment
  async function handleSaveCommentEdit(commentId) {
    if (!editingCommentText.trim()) return;
    try {
      await editAdminComment(commentId, editingCommentText.trim());
      setEditingCommentId(null);
      showToast('Comment text updated.');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to edit comment.');
    }
  }

  // Moderation: Delete Comment
  async function handleDeleteComment(commentId) {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await deleteAdminComment(commentId);
      showToast(res.action === 'tombstoned' ? 'Comment replaced with removal notice (replies kept).' : 'Comment deleted.');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete comment.');
    }
  }

  // Moderation: Edit Reply
  async function handleSaveReplyEdit(replyId) {
    if (!editingReplyText.trim()) return;
    try {
      await editAdminReply(replyId, editingReplyText.trim());
      setEditingReplyId(null);
      showToast('Reply text updated.');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to edit reply.');
    }
  }

  // Moderation: Delete Reply
  async function handleDeleteReply(replyId) {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      await deleteAdminReply(replyId);
      showToast('Reply removed.');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete reply.');
    }
  }

  // Filtered posts based on status filter and search term
  const filteredPosts = postsData.posts.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (adminSearch.trim()) {
      const term = adminSearch.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.author && p.author.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="admin-dashboard">
      {/* Toast alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1000,
          background: 'linear-gradient(135deg, var(--primary), var(--accent-violet))',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontWeight: '600',
          animation: 'slideUp 250ms ease'
        }}>
          ✨ {toast}
        </div>
      )}

      {/* Header Row */}
      <div className="admin-header-row">
        <div>
          <button className="back-link" onClick={onBackToFeed} style={{ marginBottom: '0.5rem' }}>
            ← View Public Blog Feed
          </button>
          <h1 className="admin-title serif-heading">Administrator Dashboard</h1>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <span>✍️</span>
          <span>New Article</span>
        </button>
      </div>

      {/* Overview Statistics */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-label">Total Posts</div>
          <div className="stat-value">{postsData.stats?.total || 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Published (Live)</div>
          <div className="stat-value published">{postsData.stats?.published || 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Drafts</div>
          <div className="stat-value draft">{postsData.stats?.drafts || 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Archived</div>
          <div className="stat-value archived">{postsData.stats?.archived || 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Total Likes</div>
          <div className="stat-value likes">❤️ {postsData.stats?.totalLikes || 0}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          Articles Management ({postsData.posts?.length || 0})
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
          onClick={() => setActiveTab('moderation')}
        >
          Discussion Moderation ({moderationData.comments?.length + moderationData.replies?.length || 0})
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: ARTICLES MANAGEMENT */}
      {/* ========================================================== */}
      {activeTab === 'articles' && (
        <div>
          {/* Status Sub-Filters & Admin Search */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['all', 'published', 'draft', 'archived'].map(status => (
                <button
                  key={status}
                  className={`filter-pill ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter(status);
                    setVisibleAdminCount(50);
                  }}
                  style={{ textTransform: 'capitalize' }}
                >
                  {status}
                </button>
              ))}
            </div>

            <input 
              type="text"
              className="form-input"
              style={{ maxWidth: '280px', padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
              placeholder="Search 2,000 articles..."
              value={adminSearch}
              onChange={(e) => {
                setAdminSearch(e.target.value);
                setVisibleAdminCount(50);
              }}
            />
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title & Slug</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Engagements</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No articles found in this status category.
                    </td>
                  </tr>
                ) : (
                  filteredPosts.slice(0, visibleAdminCount).map(post => (
                    <tr key={post.id}>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                          /{post.slug}
                        </div>
                      </td>

                      <td>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          {post.category}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge ${post.status}`}>
                          {post.status}
                        </span>
                      </td>

                      <td>
                        <span style={{ color: '#f43f5e', marginRight: '0.75rem', fontSize: '0.85rem' }}>
                          ❤️ {post.likes_count || 0}
                        </span>
                        <span style={{ color: '#60a5fa', fontSize: '0.85rem' }}>
                          💬 {post.comments_count || 0}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(post.updated_at || post.created_at).toLocaleDateString()}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {/* View Post */}
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => onSelectPost(post.slug)}
                            title="Preview Article"
                          >
                            👁️
                          </button>

                          {/* Edit Post */}
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(post)}
                            title="Edit Article Content"
                          >
                            ✏️ Edit
                          </button>

                          {/* Toggle Publish / Draft */}
                          {post.status !== 'archived' && (
                            <button 
                              className={`btn btn-sm ${post.status === 'published' ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleToggleStatus(post)}
                              title={post.status === 'published' ? 'Unpublish to Draft' : 'Publish Live'}
                            >
                              {post.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                          )}

                          {/* Archive (Soft delete) */}
                          {post.status !== 'archived' ? (
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleArchivePost(post)}
                              title="Archive Article"
                            >
                              Archive
                            </button>
                          ) : (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleToggleStatus(post)}
                              title="Restore to Draft"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredPosts.length > visibleAdminCount && (
              <div style={{ textAlign: 'center', padding: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setVisibleAdminCount(prev => prev + 50)}
                >
                  Load Next 50 Articles (Showing {visibleAdminCount} of {filteredPosts.length.toLocaleString()})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: DISCUSSION MODERATION */}
      {/* ========================================================== */}
      {activeTab === 'moderation' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Top-Level Comments</h3>
          <div className="admin-table-container" style={{ marginBottom: '2.5rem' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Commenter</th>
                  <th>Content</th>
                  <th>Replies</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {moderationData.comments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No comments to moderate.
                    </td>
                  </tr>
                ) : (
                  moderationData.comments.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: '600', maxWidth: '200px' }}>
                        {c.post_title}
                      </td>
                      <td>
                        <strong>{c.author_name}</strong>
                        {c.is_removed ? <span style={{ color: '#f87171', fontSize: '0.75rem', display: 'block' }}>Removed Notice</span> : null}
                      </td>
                      <td style={{ maxWidth: '350px' }}>
                        {editingCommentId === c.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveCommentEdit(c.id)}>
                              Save
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingCommentId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span style={c.is_removed ? { fontStyle: 'italic', color: '#94a3b8' } : {}}>
                            {c.content}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="count-badge comments">{c.reply_count || 0}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentText(c.content);
                            }}
                            title="Edit Comment Text"
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Delete or Tombstone Comment"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Single-Level Replies</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Replying To</th>
                  <th>Replier Name</th>
                  <th>Reply Text</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {moderationData.replies.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No replies recorded yet.
                    </td>
                  </tr>
                ) : (
                  moderationData.replies.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '600', maxWidth: '200px' }}>
                        {r.post_title}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {r.parent_author}
                      </td>
                      <td>
                        <strong>{r.author_name}</strong>
                      </td>
                      <td style={{ maxWidth: '350px' }}>
                        {editingReplyId === r.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                              value={editingReplyText}
                              onChange={(e) => setEditingReplyText(e.target.value)}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveReplyEdit(r.id)}>
                              Save
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingReplyId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span>{r.content}</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingReplyId(r.id);
                              setEditingReplyText(r.content);
                            }}
                            title="Edit Reply Text"
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteReply(r.id)}
                            title="Delete Reply"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: CREATE / EDIT ARTICLE */}
      {/* ========================================================== */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPost ? 'Edit Article' : 'Write New Article'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSavePost}>
              <div className="form-group">
                <label className="form-label">Article Title *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Next-Generation Design Systems"
                  value={modalForm.title}
                  onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Engineering, Design, Product"
                    value={modalForm.category}
                    onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. UI, CSS, Architecture"
                    value={modalForm.tags}
                    onChange={(e) => setModalForm({ ...modalForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Author Name</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="Administrator"
                    value={modalForm.author}
                    onChange={(e) => setModalForm({ ...modalForm, author: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Publication Status *</label>
                  <select 
                    className="form-input"
                    value={modalForm.status}
                    onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Public)</option>
                    {editingPost && <option value="archived">Archived</option>}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cover Image URL (Optional)</label>
                <input 
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={modalForm.cover_image}
                  onChange={(e) => setModalForm({ ...modalForm, cover_image: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brief Excerpt / Summary</label>
                <textarea 
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                  placeholder="A concise 1-2 sentence hook for the catalog card..."
                  value={modalForm.excerpt}
                  onChange={(e) => setModalForm({ ...modalForm, excerpt: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Article Body Content * (Supports headings with ## or ###)
                </label>
                <textarea 
                  className="form-textarea"
                  style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                  placeholder="Write your article here..."
                  value={modalForm.content}
                  onChange={(e) => setModalForm({ ...modalForm, content: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={modalSaving}
                >
                  {modalSaving ? 'Saving...' : editingPost ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
