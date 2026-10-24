import React, { useState, useEffect } from 'react';
import { fetchPostBySlug, likePost, getCurrentUser } from '../services/api';
import DiscussionSection from '../components/DiscussionSection';
import PostEditorModal from '../components/PostEditorModal';

export default function ArticleDetail({ slug, onBackToFeed, currentUser }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiking, setIsLiking] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [updateNotice, setUpdateNotice] = useState('');

  // Reader Enhancements
  const [readingProgress, setReadingProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadArticle();
  }, [slug]);

  // Track live reading scroll progress
  useEffect(() => {
    function handleScroll() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const progress = (window.scrollY / scrollHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadArticle() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPostBySlug(slug);
      setPost(data);
    } catch (err) {
      console.error('Error loading article:', err);
      setError(err.message || 'Article not found or not currently available.');
    } finally {
      setLoading(false);
    }
  }

  // Handle appreciation like click
  async function handleLike() {
    if (!post || isLiking) return;

    try {
      setIsLiking(true);
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 500);

      const res = await likePost(post.id);
      if (res.likes_count !== undefined) {
        setPost(prev => ({ 
          ...prev, 
          likes_count: res.likes_count,
          is_liked: res.liked
        }));
      }
    } catch (err) {
      console.error('Failed to toggle like on post:', err);
    } finally {
      setIsLiking(false);
    }
  }

  function handleSaveSuccess(savedPost) {
    setPost(savedPost);
    setUpdateNotice('Article updated successfully!');
    setTimeout(() => setUpdateNotice(''), 4000);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(post?.title || 'Check out this article on CHRONICLE');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  }

  function handleShareLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  }

  function handleShareEmail() {
    const subject = encodeURIComponent(post?.title || 'Interesting Article');
    const body = encodeURIComponent(`I thought you might enjoy reading this article on CHRONICLE:\n\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function scrollToSection(headingId) {
    const el = document.getElementById(headingId);
    if (el) {
      const topOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  function calculateReadingTime(text) {
    if (!text) return '1 min read';
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return `${minutes} min read`;
  }

  function extractHeadings(content) {
    if (!content) return [];
    const lines = content.split('\n');
    const headings = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        headings.push({ level: 3, text: trimmed.replace('### ', ''), id: `sec-heading-${idx}` });
      } else if (trimmed.startsWith('## ')) {
        headings.push({ level: 2, text: trimmed.replace('## ', ''), id: `sec-heading-${idx}` });
      } else if (trimmed.startsWith('# ')) {
        headings.push({ level: 1, text: trimmed.replace('# ', ''), id: `sec-heading-${idx}` });
      }
    });
    return headings;
  }

  // Parse markdown-like content into structured JSX
  function renderFormattedContent(content) {
    if (!content) return null;

    const lines = content.split('\n');
    const elements = [];
    let currentParagraph = [];
    let inCodeBlock = false;
    let codeBlockLines = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={`p-${elements.length}`}>
            {currentParagraph.join(' ')}
          </p>
        );
        currentParagraph = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Fenced Code Block handling
      if (trimmed.startsWith('```')) {
        flushParagraph();
        if (inCodeBlock) {
          // Closing code block
          const codeText = codeBlockLines.join('\n');
          elements.push(
            <div key={`code-${idx}`} className="article-code-block">
              <div className="article-code-header">
                <span>Code Snippet</span>
                <button 
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => navigator.clipboard.writeText(codeText)}
                >
                  📋 Copy Code
                </button>
              </div>
              <pre className="article-code-body">
                <code>{codeText}</code>
              </pre>
            </div>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLines = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        flushParagraph();
        elements.push(
          <blockquote key={`quote-${idx}`} className="article-quote">
            {trimmed.substring(2)}
          </blockquote>
        );
        return;
      }

      // Headings with IDs for smooth TOC scrolling
      if (trimmed.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <h3 key={`h3-${idx}`} id={`sec-heading-${idx}`} style={{ scrollMarginTop: '90px' }}>
            {trimmed.replace('### ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <h2 key={`h2-${idx}`} id={`sec-heading-${idx}`} style={{ scrollMarginTop: '90px' }}>
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('# ')) {
        flushParagraph();
        elements.push(
          <h1 key={`h1-${idx}`} id={`sec-heading-${idx}`} style={{ scrollMarginTop: '90px' }}>
            {trimmed.replace('# ', '')}
          </h1>
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        flushParagraph();
        elements.push(
          <li key={`li-${idx}`} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>
            {trimmed.substring(2)}
          </li>
        );
      } else if (trimmed === '') {
        flushParagraph();
      } else {
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph();
    return elements;
  }

  if (loading) {
    return (
      <div className="article-detail-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>
          Loading article...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="article-detail-container">
        <button className="back-link" onClick={onBackToFeed}>
          ← Back to all articles
        </button>
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h3 className="empty-state-title">Article Not Available</h3>
          <p className="empty-state-desc">{error || 'This article could not be found or has been archived.'}</p>
          <button className="btn btn-primary" onClick={onBackToFeed}>
            Return to Feed
          </button>
        </div>
      </div>
    );
  }

  const activeUser = currentUser || getCurrentUser();
  const canEdit = activeUser && (
    (post.user_id && post.user_id === activeUser.id) ||
    (post.author && post.author.toLowerCase() === activeUser.username.toLowerCase()) ||
    (activeUser.role === 'admin')
  );

  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const readingTime = calculateReadingTime(post.content);
  const headings = extractHeadings(post.content);

  const tagsList = post.tags 
    ? post.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <article className="article-detail-container">
      {/* Live Reading Scroll Progress Bar */}
      <div 
        className="reading-progress-bar" 
        style={{ width: `${readingProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(readingProgress)}
        aria-valuemin="0"
        aria-valuemax="100"
      />

      {/* Back button & Author Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="back-link" onClick={onBackToFeed} style={{ margin: 0 }}>
          ← Back to all articles
        </button>

        {canEdit && (
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setIsEditorOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'var(--shadow-sm)' }}
          >
            <span>✏️</span>
            <span>Edit Article</span>
          </button>
        )}
      </div>

      {updateNotice && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#34d399',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>✅</span>
          <span>{updateNotice}</span>
        </div>
      )}

      {/* Article Header */}
      <header className="article-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="article-category-badge">{post.category}</span>
          {post.status !== 'published' && (
            <span className={`status-badge ${post.status}`} style={{ fontSize: '0.75rem' }}>
              {post.status.toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="article-title serif-heading">{post.title}</h1>

        <div className="article-meta-row">
          <div className="article-author-info">
            <div className="article-author-avatar">
              {post.author ? post.author.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="article-author-name">{post.author}</div>
              <div className="article-date" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Published on {formattedDate}</span>
                <span>•</span>
                <span title="Estimated reading time">⏱️ {readingTime}</span>
              </div>
            </div>
          </div>

          <div className="post-card-badges" style={{ gap: '0.75rem' }}>
            <span className="count-badge likes" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
              ❤️ {post.likes_count || 0} Likes
            </span>

            {canEdit && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setIsEditorOpen(true)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
              >
                ✏️ Edit
              </button>
            )}
          </div>
        </div>

        {/* Social Share Strip */}
        <div className="article-share-strip">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Share:
          </span>
          <button 
            type="button"
            className={`share-btn ${copiedLink ? 'copied' : ''}`}
            onClick={handleCopyLink}
            title="Copy article link to clipboard"
          >
            <span>{copiedLink ? '✅' : '🔗'}</span>
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
          <button 
            type="button"
            className="share-btn"
            onClick={handleShareTwitter}
            title="Share on X / Twitter"
          >
            <span>𝕏</span>
            <span>Post</span>
          </button>
          <button 
            type="button"
            className="share-btn"
            onClick={handleShareLinkedIn}
            title="Share on LinkedIn"
          >
            <span>💼</span>
            <span>LinkedIn</span>
          </button>
          <button 
            type="button"
            className="share-btn"
            onClick={handleShareEmail}
            title="Share via Email"
          >
            <span>✉️</span>
            <span>Email</span>
          </button>
        </div>
      </header>

      {/* Cover Image */}
      {post.cover_image && (
        <div className="article-cover-wrap">
          <img 
            src={post.cover_image} 
            alt={post.title} 
            className="article-cover-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Interactive Table of Contents (TOC) */}
      {headings.length > 1 && (
        <nav className="article-toc-box" aria-label="Table of Contents">
          <div className="article-toc-header" onClick={() => setIsTocOpen(!isTocOpen)}>
            <div className="article-toc-title">
              <span>📑</span>
              <span>Table of Contents ({headings.length} Sections)</span>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            >
              {isTocOpen ? 'Hide ▲' : 'Show ▼'}
            </button>
          </div>

          {isTocOpen && (
            <ul className="article-toc-list">
              {headings.map((h, i) => (
                <li 
                  key={i} 
                  className={`article-toc-item level-${h.level}`}
                  onClick={() => scrollToSection(h.id)}
                >
                  <span style={{ opacity: 0.6 }}>›</span>
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}

      {/* Main Formatted Body */}
      <div className="article-body">
        {renderFormattedContent(post.content)}
      </div>

      {/* Tags */}
      {tagsList.length > 0 && (
        <div className="article-tags-wrap">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.5rem', alignSelf: 'center' }}>
            Tags:
          </span>
          {tagsList.map((tag, i) => (
            <span key={i} className="article-tag-item">#{tag}</span>
          ))}
        </div>
      )}

      {/* Appreciation Action Bar */}
      <div className="article-action-bar">
        <div>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Enjoyed this article?</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Show your appreciation with a like or share it with colleagues.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {canEdit && (
            <button 
              className="btn btn-secondary"
              onClick={() => setIsEditorOpen(true)}
            >
              ✏️ Edit Post
            </button>
          )}

          <button 
            className={`like-button ${likeAnim ? 'animating' : ''} ${post.is_liked ? 'liked-active' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
            title={post.is_liked ? 'Click to unlike this article' : 'Click to like this article'}
            style={post.is_liked ? {
              background: 'rgba(244, 63, 94, 0.22)',
              borderColor: 'rgba(244, 63, 94, 0.5)',
              color: '#fda4af',
              boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)'
            } : {}}
          >
            <span className="like-heart-icon">{post.is_liked ? '❤️' : '🤍'}</span>
            <span>{post.is_liked ? 'Liked (Unlike)' : 'Like Article'}</span>
            <span className="like-count-display">({post.likes_count || 0})</span>
          </button>
        </div>
      </div>

      {/* Author Bio Signature Card */}
      <div className="article-author-card">
        <div className="article-author-avatar" style={{ width: '56px', height: '56px', fontSize: '1.4rem' }}>
          {post.author ? post.author.charAt(0).toUpperCase() : 'A'}
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Written by
          </div>
          <h4 style={{ margin: '0.2rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            {post.author}
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Contributing thoughts and analysis on {post.category}. Published on CHRONICLE.
          </p>
        </div>
      </div>

      {/* Threaded Discussion Section */}
      <DiscussionSection postId={post.id} />

      {/* Post Editor Modal for Author / Admin updates */}
      {canEdit && (
        <PostEditorModal 
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          postToEdit={post}
          currentUser={activeUser}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </article>
  );
}
