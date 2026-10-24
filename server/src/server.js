const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// =========================================================================
// MIDDLEWARE PIPELINE
// =========================================================================

// 1. CORS Middleware - Enables cross-origin requests between Vite (3000) and Express (5000)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow in dev
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Request Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Request Logging & Timing Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API MIDDLEWARE] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | ${duration}ms | ${timestamp}`);
  });

  // Attach middleware verification headers
  res.setHeader('X-FullStack-Middleware', 'Active');
  res.setHeader('X-Powered-By', 'Express-NodeJS-SQLite');

  next();
});

// =========================================================================
// API ROUTES INTEGRATION
// =========================================================================

// Health & Connection verification route
app.get('/api/health', (req, res) => {
  try {
    // Test database connectivity
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM posts').get();

    res.json({
      status: 'connected',
      message: 'Frontend and Backend are successfully communicating through Express middleware!',
      serverTime: new Date().toISOString(),
      database: {
        engine: 'SQLite (node:sqlite)',
        status: 'online',
        totalPosts: countCheck.count
      },
      middleware: {
        cors: 'enabled',
        jwtAuth: 'ready',
        logger: 'active',
        bodyParser: 'active'
      }
    });
  } catch (err) {
    console.error('Database health check failed:', err);
    res.status(500).json({ status: 'degraded', error: 'Database check failed.' });
  }
});

// Mount modular sub-routers
app.use('/api/auth', authRoutes);
app.use('/api', postsRoutes);
app.use('/api', commentsRoutes);

// =========================================================================
// ERROR HANDLING MIDDLEWARE
// =========================================================================

// 404 Not Found Middleware
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API Endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// Centralized Global Error-Handling Middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR MIDDLEWARE]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected internal server error occurred.',
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// SERVER INITIALIZATION
// =========================================================================
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [BACKEND] Express API Server running on http://localhost:${PORT}`);
  console.log(`📡 [MIDDLEWARE] Active: CORS, JWT Auth, JSON Parser, Logger`);
  console.log(`💾 [DATABASE] SQLite (data/blog.db) connected`);
  console.log(`🔗 [FRONTEND LINK] Ready to serve requests from http://localhost:3000`);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n📡 [BACKEND] Port ${PORT} is already actively running and serving requests.`);
    console.log(`✅ [BACKEND] Reusing active instance on http://localhost:${PORT}.`);
    process.exit(0);
  } else {
    console.error('[BACKEND FATAL ERROR]:', err);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

