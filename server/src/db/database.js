const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

// Database file path in server directory
const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'blog.db');

const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Administrator',
    user_id INTEGER,
    category TEXT NOT NULL,
    tags TEXT,
    cover_image TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_removed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    client_ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
`);

// Run incremental schema migrations
function runMigrations() {
  try {
    const userColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userColumns.includes('email')) {
      db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
    }
    if (!userColumns.includes('role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
    }

    const postColumns = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
    if (!postColumns.includes('user_id')) {
      db.exec('ALTER TABLE posts ADD COLUMN user_id INTEGER;');
    }

    const commentColumns = db.prepare('PRAGMA table_info(comments)').all().map(c => c.name);
    if (!commentColumns.includes('user_id')) {
      db.exec('ALTER TABLE comments ADD COLUMN user_id INTEGER;');
    }

    const replyColumns = db.prepare('PRAGMA table_info(replies)').all().map(c => c.name);
    if (!replyColumns.includes('user_id')) {
      db.exec('ALTER TABLE replies ADD COLUMN user_id INTEGER;');
    }

    // Ensure post_likes table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER,
        client_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(post_id, user_id) WHERE user_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_ip ON post_likes(post_id, client_ip) WHERE user_id IS NULL;
    `);

    // Ensure default admin has role = 'admin' and email
    const adminUser = db.prepare('SELECT id, role, email FROM users WHERE username = ?').get('admin');
    if (adminUser) {
      if (adminUser.role !== 'admin' || !adminUser.email) {
        db.prepare("UPDATE users SET role = 'admin', email = COALESCE(email, 'admin@chronicle.local') WHERE username = 'admin'").run();
      }
    }
  } catch (mErr) {
    console.error('[DB Migration Warning]', mErr.message);
  }
}
runMigrations();

// Seed default Admin if not exists
function seedDatabase() {
  const userCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!userCheck) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('admin', 'admin@chronicle.local', passwordHash, 'admin');
    console.log('[DB] Default admin created: username "admin", password "admin123", role "admin"');
  }

  // Check if posts exist
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  if (postCount.count === 0) {
    console.log('[DB] Seeding initial blog articles and community discussions...');
    
    const samplePosts = [
      {
        title: 'Mastering Modern Web Architecture in 2026',
        slug: 'mastering-modern-web-architecture-2026',
        excerpt: 'An in-depth exploration of clean code, responsive design systems, and efficient API patterns for modern applications.',
        content: `Building software for the web today is about balance. Developers need both velocity and robust reliability. In this article, we break down three core pillars of contemporary web architecture:

### 1. Clear Separation of Concerns
Modern applications thrive when boundaries are respected. Clean routing, isolated state management, and purposeful API design allow codebases to scale without unnecessary friction.

### 2. High-Performance Design Systems
Relying on hand-crafted design tokens, purposeful CSS variables, and fluid typography creates interfaces that look exceptional on any viewport. The days of bloated utility classes are giving way to refined, maintainable styling.

### 3. Deliberate Data Integrity
Relational constraints and clear data schemas ensure that reader interactions—such as comments and threaded discussions—remain tightly coupled to their parent content without data leakage.`,
        author: 'Administrator',
        category: 'Engineering',
        tags: 'Architecture, Clean Code, Performance, WebDev',
        cover_image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        likes_count: 24,
        published_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        title: 'The Art of Minimalist UI & Dynamic Micro-Interactions',
        slug: 'the-art-of-minimalist-ui',
        excerpt: 'How subtle animations, glassmorphism, and balanced white space elevate reader engagement and perceived performance.',
        content: `Great user experience is invisible. When readers open an article, they shouldn't be overwhelmed by aggressive popups or noisy banner animations. Instead, the interface should feel welcoming and responsive.

### Subtle Feedback Loops
When a reader clicks "Like" or submits a thoughtful comment, a micro-interaction confirms their action instantly. Smooth transition curves and soft color washes guide attention without disruption.

### Typography Hierarchy
Editorial typography needs room to breathe. Generous line heights, crisp headings, and contrasting sans-serif labels draw readers naturally through long-form articles.`,
        author: 'Administrator',
        category: 'Design',
        tags: 'UI/UX, Micro-interactions, Minimalism, Typography',
        cover_image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        likes_count: 42,
        published_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        title: 'Building Scalable Discussion Forums: Lessons Learned',
        slug: 'building-scalable-discussion-forums',
        excerpt: 'Why single-level threaded replies provide the ideal sweet spot for community moderation, readability, and mobile responsiveness.',
        content: `When designing comment systems, teams often debate between flat comment lists, single-level replies, and infinitely nested trees. Here is why single-level replies emerged as the gold standard for content publishing platforms.

### 1. Mobile Usability
Infinite nesting causes horizontal layout crushing on mobile devices. By constraining replies to one level beneath the parent comment, the screen remains readable regardless of device size.

### 2. Conversation Clarity
Readers can easily follow who is speaking to whom without wading through branching side-arguments.

### 3. Graceful Moderation
When an inappropriate top-level comment is flagged and removed, preserving the child replies with a discreet tombstone notice keeps the context alive without penalizing constructive contributors.`,
        author: 'Administrator',
        category: 'Product',
        tags: 'Product Design, Moderation, Community, Discussion',
        cover_image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
        status: 'published',
        likes_count: 17,
        published_at: new Date(Date.now() - 86400000 * 8).toISOString()
      },
      {
        title: 'Upcoming Features: Markdown Support and Rich Previews',
        slug: 'upcoming-features-markdown-support',
        excerpt: 'A preview of upcoming editorial tools planned for the administrative dashboard in future releases.',
        content: `We are currently polishing our rich markdown parsing pipeline. In the upcoming version, administrators will enjoy split-screen live previews, enhanced code syntax highlighting, and inline asset management.`,
        author: 'Administrator',
        category: 'Announcements',
        tags: 'Roadmap, Updates, Admin',
        cover_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
        status: 'draft',
        likes_count: 0,
        published_at: null
      },
      {
        title: 'Legacy Platform Migration Notes',
        slug: 'legacy-platform-migration-notes',
        excerpt: 'Archived technical retrospective documenting historical data migrations.',
        content: `This archived post documents the transition steps taken when sunsetting the legacy content repository. Kept for administrative historical auditing.`,
        author: 'Administrator',
        category: 'Archive',
        tags: 'Legacy, History, Migration',
        cover_image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
        status: 'archived',
        likes_count: 5,
        published_at: new Date(Date.now() - 86400000 * 30).toISOString()
      }
    ];

    const insertPost = db.prepare(`
      INSERT INTO posts (title, slug, excerpt, content, author, category, tags, cover_image, status, likes_count, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const post of samplePosts) {
      insertPost.run(
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        post.author,
        post.category,
        post.tags,
        post.cover_image,
        post.status,
        post.likes_count,
        post.published_at
      );
    }

    // Seed sample comments and single-level replies for the first published post
    const post1 = db.prepare('SELECT id FROM posts WHERE slug = ?').get('mastering-modern-web-architecture-2026');
    if (post1) {
      const insertComment = db.prepare(`
        INSERT INTO comments (post_id, author_name, content, is_removed, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const res1 = insertComment.run(
        post1.id,
        'Sarah Jenkins',
        'Terrific breakdown! The point about separating business logic from presentation layer resonates strongly with what we do on our team.',
        0,
        new Date(Date.now() - 86400000 * 1.5).toISOString()
      );

      const res2 = insertComment.run(
        post1.id,
        'David Miller',
        'Could you share more thoughts on handling image optimization when using external CDN links?',
        0,
        new Date(Date.now() - 86400000 * 1.2).toISOString()
      );

      // Insert replies
      const insertReply = db.prepare(`
        INSERT INTO replies (comment_id, post_id, author_name, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertReply.run(
        Number(res1.lastInsertRowid),
        post1.id,
        'Elena Rostova',
        'Completely agree with Sarah. Keeping styling separate and modular makes redesigns painless.',
        new Date(Date.now() - 86400000 * 1.4).toISOString()
      );

      insertReply.run(
        Number(res2.lastInsertRowid),
        post1.id,
        'Alex Chen (Editor)',
        'Great question David! In modern layouts, combining aspect-ratio CSS with responsive srcset attributes solves 90% of image shift issues.',
        new Date(Date.now() - 86400000 * 1.0).toISOString()
      );
    }

    // Seed sample comments on the second post
    const post2 = db.prepare('SELECT id FROM posts WHERE slug = ?').get('the-art-of-minimalist-ui');
    if (post2) {
      const insertComment = db.prepare(`
        INSERT INTO comments (post_id, author_name, content, is_removed, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insertComment.run(
        post2.id,
        'Marcus Vance',
        'The aesthetic balance here is spot on. Micro-animations make the app feel alive without being distracting.',
        0,
        new Date(Date.now() - 86400000 * 4).toISOString()
      );
    }
  }
}

seedDatabase();

module.exports = db;
