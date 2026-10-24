const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// ==========================================
// PUBLIC COMMENT & REPLY ROUTES
// ==========================================

// GET /api/posts/:postId/comments - fetch discussion thread for a post
router.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;

  try {
    // Fetch all comments for post
    const comments = db.prepare(`
      SELECT id, post_id, author_name, content, is_removed, created_at, updated_at
      FROM comments
      WHERE post_id = ?
      ORDER BY created_at ASC
    `).all(postId);

    // Fetch all replies for these comments
    const replies = db.prepare(`
      SELECT id, comment_id, post_id, author_name, content, created_at, updated_at
      FROM replies
      WHERE post_id = ?
      ORDER BY created_at ASC
    `).all(postId);

    // Group replies under their parent comment
    const repliesByCommentId = {};
    for (const reply of replies) {
      if (!repliesByCommentId[reply.comment_id]) {
        repliesByCommentId[reply.comment_id] = [];
      }
      repliesByCommentId[reply.comment_id].push(reply);
    }

    const threadedComments = comments.map(comment => {
      const commentReplies = repliesByCommentId[comment.id] || [];
      return {
        id: comment.id,
        post_id: comment.post_id,
        author_name: comment.is_removed ? 'Notice' : comment.author_name,
        content: comment.is_removed 
          ? 'This comment has been removed by the Administrator' 
          : comment.content,
        is_removed: Boolean(comment.is_removed),
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        replies: commentReplies
      };
    });

    res.json(threadedComments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to retrieve comments.' });
  }
});

// POST /api/posts/:postId/comments - submit a top-level comment
router.post('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { author_name, content } = req.body;

  // Validation: both fields are strictly mandatory
  if (!author_name || !author_name.trim()) {
    return res.status(400).json({ error: 'Your name is required to post a comment.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment message cannot be empty.' });
  }

  try {
    const post = db.prepare('SELECT id, status FROM posts WHERE id = ?').get(postId);
    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Article not available for comments.' });
    }

    const result = db.prepare(`
      INSERT INTO comments (post_id, author_name, content, is_removed, created_at, updated_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(postId, author_name.trim(), content.trim());

    const created = db.prepare('SELECT * FROM comments WHERE id = ?').get(Number(result.lastInsertRowid));

    res.status(201).json({
      message: 'Comment posted successfully.',
      comment: {
        ...created,
        is_removed: false,
        replies: []
      }
    });
  } catch (err) {
    console.error('Error submitting comment:', err);
    res.status(500).json({ error: 'Failed to submit comment.' });
  }
});

// POST /api/comments/:commentId/replies - submit a single-level reply
router.post('/comments/:commentId/replies', (req, res) => {
  const { commentId } = req.params;
  const { author_name, content } = req.body;

  // Validation: both fields are strictly mandatory
  if (!author_name || !author_name.trim()) {
    return res.status(400).json({ error: 'Your name is required to post a reply.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Reply message cannot be empty.' });
  }

  try {
    const parentComment = db.prepare('SELECT id, post_id FROM comments WHERE id = ?').get(commentId);
    if (!parentComment) {
      return res.status(404).json({ error: 'Original comment not found.' });
    }

    const post = db.prepare('SELECT id, status FROM posts WHERE id = ?').get(parentComment.post_id);
    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Article not available for replies.' });
    }

    const result = db.prepare(`
      INSERT INTO replies (comment_id, post_id, author_name, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(commentId, parentComment.post_id, author_name.trim(), content.trim());

    const created = db.prepare('SELECT * FROM replies WHERE id = ?').get(Number(result.lastInsertRowid));

    res.status(201).json({
      message: 'Reply posted successfully.',
      reply: created
    });
  } catch (err) {
    console.error('Error submitting reply:', err);
    res.status(500).json({ error: 'Failed to submit reply.' });
  }
});

// ==========================================
// ADMINISTRATOR MODERATION ROUTES
// ==========================================

// GET /api/admin/comments - retrieve all comments and replies across the system
router.get('/admin/comments', requireAdmin, (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, p.title as post_title, p.slug as post_slug,
        (SELECT COUNT(*) FROM replies r WHERE r.comment_id = c.id) as reply_count
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
    `).all();

    const replies = db.prepare(`
      SELECT r.*, p.title as post_title, p.slug as post_slug, c.author_name as parent_author
      FROM replies r
      JOIN posts p ON r.post_id = p.id
      JOIN comments c ON r.comment_id = c.id
      ORDER BY r.created_at DESC
    `).all();

    res.json({ comments, replies });
  } catch (err) {
    console.error('Error fetching admin moderation list:', err);
    res.status(500).json({ error: 'Failed to retrieve moderation data.' });
  }
});

// PUT /api/admin/comments/:id - admin edits a comment's content
router.put('/admin/comments/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    db.prepare(`
      UPDATE comments 
      SET content = ?, is_removed = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(content.trim(), id);

    const updated = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    res.json({ message: 'Comment updated successfully.', comment: updated });
  } catch (err) {
    console.error('Error editing comment:', err);
    res.status(500).json({ error: 'Failed to edit comment.' });
  }
});

// DELETE /api/admin/comments/:id - admin deletes comment
// (If comment has replies, set is_removed = 1 with placeholder notice; otherwise delete completely)
router.delete('/admin/comments/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const replyCount = db.prepare('SELECT COUNT(*) as count FROM replies WHERE comment_id = ?').get(id).count;

    if (replyCount > 0) {
      // Keep replies with placeholder notice
      db.prepare(`
        UPDATE comments 
        SET is_removed = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(id);

      res.json({ 
        message: 'Comment marked as removed. Context and replies preserved.',
        action: 'tombstoned'
      });
    } else {
      // Hard delete if no child replies
      db.prepare('DELETE FROM comments WHERE id = ?').run(id);
      res.json({ 
        message: 'Comment deleted completely.',
        action: 'deleted'
      });
    }
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

// PUT /api/admin/replies/:id - admin edits a reply's content
router.put('/admin/replies/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Reply content cannot be empty.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM replies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Reply not found.' });
    }

    db.prepare(`
      UPDATE replies 
      SET content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(content.trim(), id);

    const updated = db.prepare('SELECT * FROM replies WHERE id = ?').get(id);
    res.json({ message: 'Reply updated successfully.', reply: updated });
  } catch (err) {
    console.error('Error editing reply:', err);
    res.status(500).json({ error: 'Failed to edit reply.' });
  }
});

// DELETE /api/admin/replies/:id - admin deletes a reply
router.delete('/admin/replies/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM replies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Reply not found.' });
    }

    db.prepare('DELETE FROM replies WHERE id = ?').run(id);
    res.json({ message: 'Reply deleted successfully.' });
  } catch (err) {
    console.error('Error deleting reply:', err);
    res.status(500).json({ error: 'Failed to delete reply.' });
  }
});

module.exports = router;
