const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/categories - get all categories from published posts
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM posts 
      WHERE status = 'published' 
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// GET /api/posts - list published posts with search & category filtering
router.get('/posts', (req, res) => {
  const { search, category, page, limit } = req.query;

  try {
    let baseWhere = `WHERE p.status = 'published'`;
    const params = [];

    if (category && category !== 'All') {
      baseWhere += ` AND p.category = ?`;
      params.push(category);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      baseWhere += ` AND (p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ?)`;
      params.push(term, term, term);
    }

    // Fast count query using index
    const countQuery = `SELECT COUNT(*) as count FROM posts p ${baseWhere}`;
    const totalCount = db.prepare(countQuery).get(...params).count;

    let query = `
      SELECT 
        p.id, p.title, p.slug, p.excerpt, p.author, p.category, p.tags, 
        p.cover_image, p.status, p.likes_count, p.published_at, p.created_at,
        (
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) +
          (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id)
        ) AS comments_count
      FROM posts p
      ${baseWhere}
      ORDER BY p.published_at DESC, p.created_at DESC
    `;

    // Check if client requested paginated/batched format
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 24);
      const offset = (pageNum - 1) * limitNum;

      query += ` LIMIT ? OFFSET ?`;
      const posts = db.prepare(query).all(...params, limitNum, offset);

      return res.json({
        posts,
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: offset + posts.length < totalCount
      });
    }

    // Default backward-compatible array response (capped to 50 for safety and performance)
    query += ` LIMIT ?`;
    const defaultLimit = limit === 'all' ? 2000 : 50;
    const posts = db.prepare(query).all(...params, defaultLimit);
    res.setHeader('X-Total-Count', totalCount);
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to retrieve articles.' });
  }
});

// GET /api/posts/:slug - get article detail
router.get('/posts/:slug', optionalAuth, (req, res) => {
  const { slug } = req.params;

  try {
    const post = db.prepare(`
      SELECT 
        p.*,
        (
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) +
          (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id)
        ) AS comments_count
      FROM posts p
      WHERE p.slug = ?
    `).get(slug);

    if (!post) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Only Admin can view non-published (draft / archived) articles
    if (post.status !== 'published') {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(404).json({ error: 'This article is currently not publicly available.' });
      }
    }

    const userId = req.user ? req.user.id : null;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    let isLiked = false;
    if (userId) {
      isLiked = !!db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, userId);
    } else {
      isLiked = !!db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id IS NULL AND client_ip = ?').get(post.id, clientIp);
    }

    res.json({
      ...post,
      is_liked: isLiked
    });
  } catch (err) {
    console.error('Error fetching article detail:', err);
    res.status(500).json({ error: 'Failed to retrieve article details.' });
  }
});

// POST /api/posts/:id/like - Toggle like / unlike with duplicate active like prevention
router.post('/posts/:id/like', optionalAuth, (req, res) => {
  const { id } = req.params;

  try {
    const post = db.prepare('SELECT id, status, likes_count FROM posts WHERE id = ?').get(id);
    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Article not available for liking.' });
    }

    const userId = req.user ? req.user.id : null;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Check if like record already exists
    let existingLike = null;
    if (userId) {
      existingLike = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(id, userId);
    } else {
      existingLike = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id IS NULL AND client_ip = ?').get(id, clientIp);
    }

    let isLiked = false;
    let newCount = post.likes_count || 0;

    if (existingLike) {
      // User has already liked this post -> UNLIKE operation (decrements count)
      db.prepare('DELETE FROM post_likes WHERE id = ?').run(existingLike.id);
      newCount = Math.max(0, newCount - 1);
      db.prepare('UPDATE posts SET likes_count = ? WHERE id = ?').run(newCount, id);
      isLiked = false;

      return res.json({
        message: 'Article unliked.',
        liked: false,
        likes_count: newCount
      });
    } else {
      // User has not liked yet -> LIKE operation (increments count)
      db.prepare('INSERT INTO post_likes (post_id, user_id, client_ip) VALUES (?, ?, ?)').run(id, userId, clientIp);
      newCount = newCount + 1;
      db.prepare('UPDATE posts SET likes_count = ? WHERE id = ?').run(newCount, id);
      isLiked = true;

      return res.json({
        message: 'Appreciation recorded.',
        liked: true,
        likes_count: newCount
      });
    }
  } catch (err) {
    console.error('Error toggling post like:', err);
    res.status(500).json({ error: 'Failed to record like status.' });
  }
});

// ==========================================
// AUTHENTICATED USER AUTHORING ROUTES
// ==========================================

// GET /api/user/my-posts - Retrieve all articles authored by current logged-in user
router.get('/user/my-posts', requireAuth, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT 
        p.id, p.title, p.slug, p.excerpt, p.author, p.category, p.tags, 
        p.cover_image, p.status, p.likes_count, p.published_at, p.created_at, p.updated_at,
        p.user_id,
        (
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) +
          (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id)
        ) AS comments_count
      FROM posts p
      WHERE p.user_id = ? OR LOWER(p.author) = LOWER(?)
      ORDER BY p.updated_at DESC, p.created_at DESC
    `).all(req.user.id, req.user.username);

    res.json({ posts });
  } catch (err) {
    console.error('Error fetching user articles:', err);
    res.status(500).json({ error: 'Failed to retrieve your articles.' });
  }
});

// POST /api/posts - Authenticated user creates a new article
router.post('/posts', requireAuth, (req, res) => {
  const { title, excerpt, content, author, category, tags, cover_image, status } = req.body;

  if (!title || !title.trim() || !content || !content.trim() || !category || !category.trim()) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  try {
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = 'article-' + Date.now();

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const postStatus = status === 'draft' ? 'draft' : 'published';
    const publishedAt = postStatus === 'published' ? new Date().toISOString() : null;
    const authorName = author && author.trim() ? author.trim() : req.user.username;

    const result = db.prepare(`
      INSERT INTO posts (title, slug, excerpt, content, author, user_id, category, tags, cover_image, status, likes_count, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    `).run(
      title.trim(),
      finalSlug,
      excerpt ? excerpt.trim() : title.trim().substring(0, 140) + '...',
      content.trim(),
      authorName,
      req.user.id,
      category.trim(),
      tags ? tags.trim() : '',
      cover_image ? cover_image.trim() : '',
      postStatus,
      publishedAt
    );

    const createdPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json({
      message: 'Article created successfully.',
      post: createdPost
    });
  } catch (err) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Failed to create article.' });
  }
});

// PUT /api/posts/:id - Authenticated user updates their article (or admin updates any article)
router.put('/posts/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, excerpt, content, author, category, tags, cover_image, status } = req.body;

  if (!title || !title.trim() || !content || !content.trim() || !category || !category.trim()) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Ownership verification: user must own post or be an admin
    const isOwner = existing.user_id && existing.user_id === req.user.id;
    const isAuthorMatch = existing.author && existing.author.toLowerCase() === req.user.username.toLowerCase();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAuthorMatch && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to edit this article.' });
    }

    let publishedAt = existing.published_at;
    if (status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    const updatedAuthor = author && author.trim() ? author.trim() : existing.author;

    db.prepare(`
      UPDATE posts 
      SET title = ?, excerpt = ?, content = ?, author = ?, category = ?, tags = ?, 
          cover_image = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      excerpt ? excerpt.trim() : existing.excerpt,
      content.trim(),
      updatedAuthor,
      category.trim(),
      tags ? tags.trim() : '',
      cover_image !== undefined ? cover_image.trim() : existing.cover_image,
      status || existing.status,
      publishedAt,
      id
    );

    const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    res.json({ message: 'Article updated successfully.', post: updated });
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article.' });
  }
});

// ==========================================
// ADMINISTRATOR ROUTES
// ==========================================

// GET /api/admin/posts - retrieve all posts (draft, published, archived) with fast aggregation
router.get('/admin/posts', requireAdmin, (req, res) => {
  try {
    // Fast single aggregation query in SQLite for 2,000+ posts
    const statsQuery = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
        SUM(likes_count) as totalLikes
      FROM posts
    `).get();

    const stats = {
      total: statsQuery.total || 0,
      published: statsQuery.published || 0,
      drafts: statsQuery.drafts || 0,
      archived: statsQuery.archived || 0,
      totalLikes: statsQuery.totalLikes || 0
    };

    // Exclude heavy content body from summary table listing to keep payload compact (< 250KB)
    const posts = db.prepare(`
      SELECT 
        p.id, p.title, p.slug, p.excerpt, p.author, p.category, p.tags, 
        p.cover_image, p.status, p.likes_count, p.published_at, p.created_at, p.updated_at,
        (
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) +
          (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id)
        ) AS comments_count
      FROM posts p
      ORDER BY p.updated_at DESC, p.created_at DESC
    `).all();

    res.json({ stats, posts });
  } catch (err) {
    console.error('Error fetching admin posts:', err);
    res.status(500).json({ error: 'Failed to retrieve admin posts.' });
  }
});

// POST /api/admin/posts - create new article
router.post('/admin/posts', requireAdmin, (req, res) => {
  const { title, excerpt, content, author, category, tags, cover_image, status } = req.body;

  if (!title || !title.trim() || !content || !content.trim() || !category || !category.trim()) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  try {
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = 'article-' + Date.now();

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const postStatus = status === 'published' ? 'published' : 'draft';
    const publishedAt = postStatus === 'published' ? new Date().toISOString() : null;

    const result = db.prepare(`
      INSERT INTO posts (title, slug, excerpt, content, author, user_id, category, tags, cover_image, status, likes_count, published_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    `).run(
      title.trim(),
      finalSlug,
      excerpt ? excerpt.trim() : title.trim().substring(0, 140) + '...',
      content.trim(),
      author && author.trim() ? author.trim() : 'Administrator',
      req.user.id,
      category.trim(),
      tags ? tags.trim() : '',
      cover_image ? cover_image.trim() : '',
      postStatus,
      publishedAt
    );

    const createdPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json({
      message: 'Article created successfully.',
      post: createdPost
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create article.' });
  }
});

// PUT /api/admin/posts/:id - update existing article
router.put('/admin/posts/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, excerpt, content, author, category, tags, cover_image, status } = req.body;

  if (!title || !title.trim() || !content || !content.trim() || !category || !category.trim()) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    let publishedAt = existing.published_at;
    if (status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE posts 
      SET title = ?, excerpt = ?, content = ?, author = ?, category = ?, tags = ?, 
          cover_image = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      excerpt ? excerpt.trim() : existing.excerpt,
      content.trim(),
      author && author.trim() ? author.trim() : existing.author,
      category.trim(),
      tags ? tags.trim() : '',
      cover_image !== undefined ? cover_image.trim() : existing.cover_image,
      status || existing.status,
      publishedAt,
      id
    );

    const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    res.json({ message: 'Article updated successfully.', post: updated });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update article.' });
  }
});

// PATCH /api/admin/posts/:id/status - quick toggle publish/unpublish/archive
router.patch('/admin/posts/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['published', 'draft', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be draft, published, or archived.' });
  }

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    let publishedAt = existing.published_at;
    if (status === 'published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE posts 
      SET status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, publishedAt, id);

    const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    res.json({ message: `Article status updated to ${status}.`, post: updated });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update post status.' });
  }
});

// DELETE /api/admin/posts/:id - soft-delete (Archive) post per requirement
router.delete('/admin/posts/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Soft-delete to archive state
    db.prepare(`
      UPDATE posts 
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    res.json({ message: 'Article archived successfully.' });
  } catch (err) {
    console.error('Error archiving post:', err);
    res.status(500).json({ error: 'Failed to archive article.' });
  }
});

// DELETE /api/admin/posts/:id/permanent - permanent purge
router.delete('/admin/posts/:id/permanent', requireAdmin, (req, res) => {
  const { id } = req.params;

  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    res.json({ message: 'Article permanently deleted.' });
  } catch (err) {
    console.error('Error permanently deleting post:', err);
    res.status(500).json({ error: 'Failed to permanently delete article.' });
  }
});

module.exports = router;
