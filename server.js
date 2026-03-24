const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = 3000;
const PERSISTENT = process.env.RENDER ? '/opt/render/project/src/persistent' : path.join(__dirname, '.');
const DATA_FILE = path.join(PERSISTENT, 'local-data.json');
const PROCESSED_DIR = path.join(PERSISTENT, 'processed');
const LOGOS_DIR = path.join(__dirname, '..', 'Imagenes');

if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], posts: [] }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], posts: [] }));
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const TITLES = [
  'Builders in action', 'The future starts here', 'Innovation at its finest',
  'Cloud power, human touch', 'Next-gen builders', 'Connecting brilliant minds',
  'From idea to production', 'Where ideas become reality', 'Tech meets creativity',
  'Building what comes next', 'The community comes together', 'Hands-on with technology',
  'Knowledge sharing', 'Capturing the moment', 'Ready for the mission'
];

const HASHTAGS_POOL = [
  '#AIImmersion', '#AWSRoadshow', '#CloudLens', '#BuildersDay2026',
  '#ProServe', '#Innovation', '#CloudComputing', '#AI', '#MachineLearning',
  '#Builders', '#TechCommunity', '#AWSMexico'
];

function randomTitle() { return TITLES[Math.floor(Math.random() * TITLES.length)]; }
function randomHashtags() {
  const n = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...HASHTAGS_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROCESSED_DIR),
  filename: (req, file, cb) => cb(null, `raw-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/processed', express.static(PROCESSED_DIR));

// Apply event overlay
async function processImage(inputPath, outputPath, username, role) {
  const rawBytes = fs.readFileSync(inputPath);
  const img = await loadImage(rawBytes);
  const w = img.width, h = img.height;
  console.log(`Photo loaded: ${w}x${h}`);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Draw photo at original size/aspect ratio
  ctx.drawImage(img, 0, 0, w, h);

  // Bottom gradient for text
  const grad = ctx.createLinearGradient(0, h * 0.78, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);

  const fs1 = Math.max(16, Math.round(Math.min(w, h) * 0.035));

  // Username + role
  ctx.font = `bold ${fs1}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(`@${username} / ${role}`, fs1, h - fs1 * 2.8);

  // Event name
  ctx.font = `${Math.round(fs1 * 0.65)}px sans-serif`;
  ctx.fillStyle = '#cccccc';
  ctx.fillText('Aiztech 2026 - AI Immersion Roadshow', fs1, h - fs1 * 1.5);
  ctx.shadowBlur = 0;

  // Small logo bottom-right
  try {
    const logoPath = path.join(__dirname, 'public', 'logo-small.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logo = await loadImage(logoBytes);
      const logoH = Math.round(Math.min(w, h) * 0.15);
      const logoW = logoH;
      // White circle background for contrast
      const cx = w - logoW / 2 - fs1;
      const cy = h - logoH / 2 - fs1 * 5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, logoH / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.drawImage(logo, w - logoW - fs1, h - logoH - fs1 * 5, logoW, logoH);
      ctx.globalAlpha = 1.0;
      ctx.globalAlpha = 1.0;
      console.log(`Logo applied: ${logoW}x${logoH}`);
    } else {
      console.log('Logo not found:', logoPath);
    }
  } catch (e) {
    console.log('Logo error:', e.message);
  }

  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Processed: ${w}x${h} -> ${outputPath}`);
}

// === ROUTES ===

// Register
app.post('/api/register', (req, res) => {
  const { name, role, expectations } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
  const data = readData();
  let user = data.users.find(u => u.name === name);
  if (!user) {
    user = { name, role, expectations: expectations || '', joinedAt: new Date().toISOString() };
    data.users.push(user);
    writeData(data);
  }
  res.json({ ok: true, user });
});

// Upload photo
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Photo required' });
  const { username, role } = req.body;
  const rawPath = req.file.path;
  const outName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const outPath = path.join(PROCESSED_DIR, outName);

  try {
    await processImage(rawPath, outPath, username || 'Agent', role || '');
    fs.unlinkSync(rawPath);

    const post = {
      id: Date.now().toString(),
      photo: `/processed/${outName}`,
      username: username || 'Agent',
      role: role || '',
      title: randomTitle(),
      hashtags: randomHashtags(),
      createdAt: new Date().toISOString()
    };

    const data = readData();
    data.posts.unshift(post);
    writeData(data);
    res.json({ ok: true, post });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get posts
app.get('/api/posts', (req, res) => {
  const data = readData();
  res.json(data.posts);
});

// Get stats
app.get('/api/stats', (req, res) => {
  const data = readData();
  res.json({ totalPhotos: data.posts.length, totalAttendees: data.users.length });
});

// Export registrations as CSV
app.get('/api/export-csv', (req, res) => {
  const data = readData();
  const header = 'alias,role,expectations,joinedAt\n';
  const rows = data.users.map(u =>
    `"${u.name}","${u.role}","${(u.expectations || '').replace(/"/g, '""')}","${u.joinedAt}"`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=cloudlens-registrations.csv');
  res.send(header + rows);
});

// Restore endpoint - upload backed up photos
app.post('/api/restore', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Photo required' });
  const { username, role, title, hashtags, createdAt } = req.body;
  const outName = req.file.filename;
  const post = {
    id: Date.now().toString(),
    photo: `/processed/${outName}`,
    username: username || 'Restored',
    role: role || '',
    title: title || 'Restored photo',
    hashtags: hashtags ? JSON.parse(hashtags) : ['#Aiztech2026'],
    createdAt: createdAt || new Date().toISOString()
  };
  const data = readData();
  data.posts.push(post);
  writeData(data);
  res.json({ ok: true, post });
});

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CloudLens Local: http://localhost:${PORT}`);
  console.log(`Wall view: http://localhost:${PORT}/wall`);
  console.log(`Mobile view: http://localhost:${PORT} (scan QR)`);
});
