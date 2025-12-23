const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const UPLOAD_DIR = path.join(__dirname, 'STEAK', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve frontend from STEAK folder
app.use(express.static(path.join(__dirname, 'STEAK')));
app.use('/uploads', express.static(UPLOAD_DIR));

// setup sqlite database
const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS steaks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    cost REAL,
    weight REAL,
    photo TEXT,
    timestamp TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT
  )`);
});

function getUserIdFromReq(req) {
  return (req.get('x-user-id') || req.body.user || req.query.user || 'anonymous').toString();
}

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ filename: req.file.filename });
});

app.post('/add_steak', (req, res) => {
  const user = getUserIdFromReq(req);
  const { type, cost, weight, photo } = req.body;
  if (!type || !cost || !weight) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  const ts = new Date().toISOString();
  db.run(`INSERT INTO steaks (id,user_id,type,cost,weight,photo,timestamp) VALUES (?,?,?,?,?,?,?)`,
    [id, user, type, cost, weight, photo || null, ts], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, user_id: user, type, cost, weight, photo: photo || null, timestamp: ts });
    });
});

app.get('/steaks', (req, res) => {
  const user = getUserIdFromReq(req);
  db.all(`SELECT id,user_id as user,type,cost,weight,photo,timestamp FROM steaks WHERE user_id = ? ORDER BY timestamp DESC`, [user], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.delete('/steak/:id', (req, res) => {
  const user = getUserIdFromReq(req);
  const id = req.params.id;
  db.get(`SELECT * FROM steaks WHERE id = ? AND user_id = ?`, [id, user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found or not your steak' });
    db.run(`DELETE FROM steaks WHERE id = ? AND user_id = ?`, [id, user], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      // optionally delete photo file
      if (row.photo) {
        const p = path.join(UPLOAD_DIR, row.photo);
        fs.unlink(p, () => { /* ignore errors */ });
      }
      res.json({ ok: true });
    });
  });
});

app.post('/login', (req, res) => {
  const username = (req.body.username || '').toString();
  const password = (req.body.password || '').toString();
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  db.get(`SELECT password FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Unknown user' });
    const ok = bcrypt.compareSync(password, row.password);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    res.json({ user: username });
  });
});

app.post('/register', (req, res) => {
  const username = (req.body.username || '').toString();
  const password = (req.body.password || '').toString();
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  db.get(`SELECT username FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(409).json({ error: 'User exists' });
    const hash = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username,password) VALUES (?,?)`, [username, hash], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ user: username });
    });
  });
});

app.get('/users', (req, res) => {
  db.all(`SELECT username FROM users ORDER BY username COLLATE NOCASE`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const list = (rows || []).map(r => ({ username: r.username }));
    res.json(list);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
