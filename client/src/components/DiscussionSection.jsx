import React, { useState, useEffect } from 'react';
import { fetchComments, submitComment, submitReply } from '../services/api';

export default function DiscussionSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New comment form state
  const [authorName, setAuthorName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [formError, setFormError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Active reply form state: stores commentId currently being replied to
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyAuthorName, setReplyAuthorName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  async function loadComments() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchComments(postId);
      setComments(data);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Unable to load discussion thread.');
    } finally {
      setLoading(false);
    }
  }

  // Handle top-level comment submission
  async function handleCommentSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!authorName.trim()) {
      setFormError('Your name is required to post a comment.');
      return;
    }
    if (!commentContent.trim()) {
      setFormError('Comment message cannot be empty.');
      return;
    }

    try {
      setSubmittingComment(true);
      const res = await submitComment(postId, {
        author_name: authorName.trim(),
        content: commentContent.trim()
      });
      // Append newly created comment to state
      setComments(prev => [...prev, res.comment]);
      setCommentContent('');
      setFormError('');
    } catch (err) {
      setFormError(err.message || 'Failed to submit comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  // Handle single-level reply submission
  async function handleReplySubmit(e, commentId) {
    e.preventDefault();
    setReplyError('');

    if (!replyAuthorName.trim()) {
      setReplyError('Your name is required to post a reply.');
      return;
    }
    if (!replyContent.trim()) {
      setReplyError('Reply message cannot be empty.');
      return;
    }

    try {
      setSubmittingReply(true);
      const res = await submitReply(commentId, {
        author_name: replyAuthorName.trim(),
        content: replyContent.trim()
      });

      // Insert new reply under the correct parent comment
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [...(c.replies || []), res.reply]
          };
        }
        return c;
      }));

      // Reset reply state
      setReplyContent('');
      setActiveReplyId(null);
      setReplyError('');
    } catch (err) {
      setReplyError(err.message || 'Failed to submit reply.');
    } finally {
      setSubmittingReply(false);
    }
  }

  // Count total comments and replies
  const totalInteractions = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);

  return (
    <section className="discussion-section">
      <div className="discussion-header">
        <h3 className="discussion-title">Community Discussion</h3>
        <span className="discussion-badge">{totalInteractions} {totalInteractions === 1 ? 'Message' : 'Messages'}</span>
      </div>

      {/* Top-Level Comment Submission Form */}
      <div className="comment-form-card">
        <h4 className="comment-form-title">Join the Conversation</h4>
        <form onSubmit={handleCommentSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="comment-author">
              Your Name <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input 
              id="comment-author"
              type="text"
              className="form-input"
              placeholder="e.g. John Doe"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comment-text">
              Comment <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea 
              id="comment-text"
              className="form-textarea"
              placeholder="Share your thoughts, perspectives, or questions..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
            />
          </div>

          {formError && (
            <p className="form-error" style={{ marginBottom: '1rem' }}>
              ⚠️ {formError}
            </p>
          )}

          <div className="form-footer">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No login required. Comments are public.
            </span>
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={submittingComment}
            >
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Loading discussion thread...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
          <div className="empty-state-icon">💬</div>
          <h4 className="empty-state-title">No comments yet</h4>
          <p className="empty-state-desc">Be the first to share your thoughts on this article!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => {
            const dateStr = new Date(comment.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={comment.id} 
                className={`comment-item ${comment.is_removed ? 'tombstone' : ''}`}
              >
                {/* Comment Header */}
                <div className="comment-item-header">
                  <div className="commenter-profile">
                    <div className="commenter-avatar">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="commenter-name">{comment.author_name}</div>
                      <div className="comment-timestamp">{dateStr}</div>
                    </div>
                  </div>
                </div>

                {/* Comment Body */}
                <p className={`comment-text ${comment.is_removed ? 'removed-notice' : ''}`}>
                  {comment.content}
                </p>

                {/* Reply action button (Disabled if tombstoned or active) */}
                <div className="comment-actions">
                  <button 
                    className="reply-toggle-btn"
                    onClick={() => {
                      if (activeReplyId === comment.id) {
                        setActiveReplyId(null);
                      } else {
                        setActiveReplyId(comment.id);
                        setReplyError('');
                      }
                    }}
                  >
                    💬 {activeReplyId === comment.id ? 'Cancel Reply' : 'Reply'}
                  </button>
                </div>

                {/* Inline Single-Level Reply Form */}
                {activeReplyId === comment.id && (
                  <div className="reply-form-wrap">
                    <form onSubmit={(e) => handleReplySubmit(e, comment.id)}>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`reply-author-${comment.id}`}>
                          Your Name <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input 
                          id={`reply-author-${comment.id}`}
                          type="text"
                          className="form-input"
                          placeholder="Your display name"
                          value={replyAuthorName}
                          onChange={(e) => setReplyAuthorName(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor={`reply-text-${comment.id}`}>
                          Reply to {comment.is_removed ? 'discussion' : comment.author_name} <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <textarea 
                          id={`reply-text-${comment.id}`}
                          className="form-textarea"
                          style={{ minHeight: '75px' }}
                          placeholder="Write a clear, respectful reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                        />
                      </div>

                      {replyError && (
                        <p className="form-error" style={{ marginBottom: '0.75rem' }}>
                          ⚠️ {replyError}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveReplyId(null)}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-sm"
                          disabled={submittingReply}
                        >
                          {submittingReply ? 'Sending...' : 'Submit Reply'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Nested Single-Level Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="replies-thread">
                    {comment.replies.map((reply) => {
                      const replyDateStr = new Date(reply.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={reply.id} className="reply-item">
                          <div className="comment-item-header">
                            <div className="commenter-profile">
                              <div 
                                className="commenter-avatar" 
                                style={{ width: '26px', height: '26px', fontSize: '0.75rem', background: '#3b82f6' }}
                              >
                                {reply.author_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="commenter-name" style={{ fontSize: '0.875rem' }}>
                                  {reply.author_name}
                                </div>
                                <div className="comment-timestamp" style={{ fontSize: '0.75rem' }}>
                                  {replyDateStr}
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="comment-text" style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
