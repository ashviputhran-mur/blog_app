import React, { useState, useEffect } from 'react';
import { createPost, updatePost } from '../services/api';

const CATEGORIES = [
  'Engineering',
  'Design',
  'AI & Machine Learning',
  'Culture',
  'Leadership',
  'Productivity',
  'Architecture'
];

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80'
];

export default function PostEditorModal({ isOpen, onClose, postToEdit, currentUser, onSaveSuccess }) {
  const isEditing = !!postToEdit;

  const [form, setForm] = useState({
    title: '',
    category: 'Engineering',
    tags: '',
    author: currentUser?.username || 'Author',
    cover_image: SAMPLE_COVERS[0],
    excerpt: '',
    content: '',
    status: 'published'
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (postToEdit) {
      setForm({
        title: postToEdit.title || '',
        category: postToEdit.category || 'Engineering',
        tags: postToEdit.tags || '',
        author: postToEdit.author || currentUser?.username || 'Author',
        cover_image: postToEdit.cover_image || SAMPLE_COVERS[0],
        excerpt: postToEdit.excerpt || '',
        content: postToEdit.content || '',
        status: postToEdit.status || 'published'
      });
    } else {
      setForm({
        title: '',
        category: 'Engineering',
        tags: 'WebDev, Architecture',
        author: currentUser?.username || 'Author',
        cover_image: SAMPLE_COVERS[Math.floor(Math.random() * SAMPLE_COVERS.length)],
        excerpt: '',
        content: '',
        status: 'published'
      });
    }
    setError('');
  }, [postToEdit, currentUser, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.content.trim() || !form.category.trim()) {
      setError('Title, Content, and Category are required.');
      return;
    }

    try {
      setSaving(true);
      let savedPost;
      if (isEditing) {
        const res = await updatePost(postToEdit.id, form);
        savedPost = res.post;
      } else {
        const res = await createPost(form);
        savedPost = res.post;
      }

      onSaveSuccess(savedPost, isEditing);
      onClose();
    } catch (err) {
      console.error('Error saving article:', err);
      setError(err.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  }

  function pickRandomCover() {
    const randomUrl = SAMPLE_COVERS[Math.floor(Math.random() * SAMPLE_COVERS.length)];
    setForm(prev => ({ ...prev, cover_image: randomUrl }));
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: '700' }}>
              {isEditing ? '✏️ Edit Article' : '✍️ Write New Article'}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isEditing 
                ? 'Update your article contents, metadata, and publication status.' 
                : 'Compose and share your insights with the CHRONICLE reader community.'}
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem 1.75rem' }}>
          {error && (
            <div style={{
              padding: '0.85rem 1rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#f87171',
              fontSize: '0.9rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form id="post-editor-form" onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="post-title">
                Article Title <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input 
                id="post-title"
                type="text"
                className="form-input"
                placeholder="e.g. Building Resilient Micro-Frontends in 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Category & Status Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="post-category">Category</label>
                <select
                  id="post-category"
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-status">Publication Status</label>
                <select
                  id="post-status"
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="published">🚀 Published (Live)</option>
                  <option value="draft">📝 Draft (Private)</option>
                </select>
              </div>
            </div>

            {/* Author & Tags Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="post-author">Author Byline</label>
                <input 
                  id="post-author"
                  type="text"
                  className="form-input"
                  placeholder="Author name"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-tags">Tags (comma-separated)</label>
                <input 
                  id="post-tags"
                  type="text"
                  className="form-input"
                  placeholder="React, CSS, Architecture"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
            </div>

            {/* Cover Image URL */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" htmlFor="post-cover" style={{ margin: 0 }}>
                  Cover Image URL
                </label>
                <button 
                  type="button" 
                  className="btn btn-sm btn-secondary"
                  onClick={pickRandomCover}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                >
                  🎲 Random Preset
                </button>
              </div>
              <input 
                id="post-cover"
                type="url"
                className="form-input"
                placeholder="https://images.unsplash.com/..."
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
              />
              {form.cover_image && (
                <div style={{ marginTop: '0.5rem', height: '110px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  <img 
                    src={form.cover_image} 
                    alt="Cover preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div className="form-group">
              <label className="form-label" htmlFor="post-excerpt">
                Short Excerpt / Summary
              </label>
              <textarea 
                id="post-excerpt"
                className="form-input"
                rows={2}
                placeholder="A compelling one or two sentence summary shown on blog feed cards..."
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>

            {/* Content Body */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" htmlFor="post-content" style={{ margin: 0 }}>
                  Article Content (Markdown Supported) <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {form.content ? `${form.content.trim().split(/\s+/).length} words` : '0 words'}
                </span>
              </div>
              <textarea 
                id="post-content"
                className="form-input"
                rows={10}
                placeholder="Write your article here...
## Subheading
Express your ideas, share code snippets, or breakdown key concepts.

- Key point 1
- Key point 2"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="post-editor-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving Article...' : (isEditing ? 'Save Changes' : 'Publish Article')}
          </button>
        </div>
      </div>
    </div>
  );
}
