const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// Email validation regex helper
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register - Register a new author/user
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !username.trim() || !password || !password.trim()) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email ? email.trim() : null;

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if username already exists
    const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    // Check if email already exists
    if (cleanEmail) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already registered. Please sign in or use another email.' });
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `).run(cleanUsername, cleanEmail, passwordHash);

    const userId = Number(result.lastInsertRowid);
    const user = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      role: 'user'
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account registered successfully. Welcome to CHRONICLE!',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login - Authenticate user or admin (supports username or email)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const identifier = username.trim();

  try {
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(username) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))
    `).get(identifier, identifier);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    const userRole = user.role || (user.username === 'admin' ? 'admin' : 'user');

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: userRole
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me - Verify current session
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    authenticated: true,
    user: req.user
  });
});

module.exports = router;
