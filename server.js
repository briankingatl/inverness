/**
 * Inverness HOA - Admin Server
 *
 * A lightweight Express server that serves the static site and provides
 * an authenticated admin API for managing events.json, poi.json, and images.
 *
 * ENVIRONMENT VARIABLES (required):
 *   ADMIN_USER   - Username for admin access
 *   ADMIN_PASS   - Password for admin access
 *   PORT         - Server port (default: 3000)
 *
 * Credentials are read from environment at startup and never written to disk.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Process-level unhandled error handling
process.on('uncaughtException', (err) => console.error('UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', (err) => console.error('UNHANDLED REJECTION:', err));

// ── Credential validation ───────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error('ERROR: ADMIN_USER and ADMIN_PASS environment variables are required.');
  console.error('  Example:  ADMIN_USER=admin ADMIN_PASS=securepassword node server.js');
  process.exit(1);
}

// ── Simple in-memory session store ──────────────────────────────────
// Sessions are ephemeral (lost on restart). Nothing persisted to disk.
const sessions = new Map();

function createSession() {
  const token = uuidv4();
  sessions.set(token, { created: Date.now() });
  return token;
}

function validateAuth(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return token;
}

// ── Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// ── Images upload storage ───────────────────────────────────────────
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    cb(null, `${base}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.replace('image/', ''));
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// ── Data file helpers ───────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');

function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Auth routes ─────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('[login] body:', JSON.stringify(req.body));
    const { username, password } = req.body || {};

    // Timing-neutral comparison
    const userOk = ADMIN_USER && username && ADMIN_USER.length === username.length && compareSlow(ADMIN_USER, username);
    const passOk = ADMIN_PASS && password && ADMIN_PASS.length === password.length && compareSlow(ADMIN_PASS, password);
    console.log('[login] userOk:', userOk, 'passOk:', passOk);

    if (!userOk || !passOk) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = createSession();
    const maxAge = 60 * 60; // 1 hour in seconds
    console.log('[login] setting cookie, token prefix:', token.substring(0, 8));
    res.setHeader('Set-Cookie', `admin_token=${token}; HttpOnly; Max-Age=${maxAge}; SameSite=Lax; Path=/`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[login] EXCEPTION:', err.stack || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  if (match) sessions.delete(match[1]);
  res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Path=/');
  res.json({ ok: true });
});

app.get('/api/auth/session', (req, res) => {
  const token = validateAuth(req, res);
  if (token) {
    res.json({ authenticated: true });
  } else {
    // Don't leak whether we're close
    res.json({ authenticated: false });
  }
});

// Timing-neutral string comparison
function compareSlow(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Events API ──────────────────────────────────────────────────────
app.get('/api/events', (req, res) => {
  try {
    const data = readJsonFile('events.json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read events data' });
  }
});

app.put('/api/events', (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    writeJsonFile('events.json', req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save events data' });
  }
});

// ── POI API ─────────────────────────────────────────────────────────
app.get('/api/poi', (req, res) => {
  try {
    const data = readJsonFile('poi.json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read POI data' });
  }
});

app.put('/api/poi', (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    writeJsonFile('poi.json', req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save POI data' });
  }
});

// ── Image upload API ────────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  if (!validateAuth(req, res)) return;

  upload.single('image')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const url = `images/${path.basename(req.file.filename)}`;
    res.json({ ok: true, url });
  });
});

// List uploaded images
app.get('/api/images', (req, res) => {
  if (!validateAuth(req, res)) return;
  try {
    const files = fs.readdirSync(imagesDir)
      .filter(f => /\.(jpeg|jpg|png|gif|webp|svg)$/i.test(f))
      .map(f => `images/${path.basename(f)}`);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list images' });
  }
});

// Delete an image
app.delete('/api/images/:filename', (req, res) => {
  if (!validateAuth(req, res)) return;
  const filePath = path.join(imagesDir, path.basename(req.params.filename));
  try {
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ── Error logging middleware (must be last) ──────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Inverness HOA server running at http://localhost:${PORT}`);
  console.log(`  Admin panel:   http://localhost:${PORT}/admin.html\n`);
});
