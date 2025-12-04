import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { createHash } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRouter from './auth.js';
import githubRouter from './github.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;
const isProduction = process.env.NODE_ENV === 'production';

// Assets directory - use ASSETS_PATH env var for persistent storage (e.g., Render Disk)
// In production, mount a persistent disk and set ASSETS_PATH=/var/data/assets
const ASSETS_DIR = process.env.ASSETS_PATH || path.join(__dirname, '../assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Assets metadata file
const ASSETS_META_FILE = path.join(ASSETS_DIR, 'metadata.json');

// Load or initialize assets metadata
const loadAssetsMeta = () => {
  try {
    if (fs.existsSync(ASSETS_META_FILE)) {
      const meta = JSON.parse(fs.readFileSync(ASSETS_META_FILE, 'utf-8'));
      // Migrate any old absolute URLs to relative paths
      let needsSave = false;
      meta.assets = meta.assets.map(asset => {
        if (asset.uri && asset.uri.includes('://')) {
          // Convert absolute URL to relative path
          asset.uri = `/assets/${asset.filename}`;
          needsSave = true;
        }
        return asset;
      });
      if (needsSave) {
        fs.writeFileSync(ASSETS_META_FILE, JSON.stringify(meta, null, 2));
      }
      return meta;
    }
  } catch (e) {
    console.error('Error loading assets metadata:', e);
  }
  return { assets: [] };
};

const saveAssetsMeta = (meta) => {
  fs.writeFileSync(ASSETS_META_FILE, JSON.stringify(meta, null, 2));
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and SVGs
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, GIF, SVG, and WebP are allowed.'));
    }
  },
});

// CORS configuration
app.use(cors({
  origin: isProduction
    ? ['https://credential-design-tools.openpropertyassociation.ca', 'https://vct-builder-app.onrender.com']
    : 'http://localhost:5173',
  credentials: true,
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

// Trust proxy for secure cookies behind Render's load balancer
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json());

// Mount auth and github routes
app.use('/api/auth', authRouter);
app.use('/api/github', githubRouter);

// Serve static assets (uploaded files)
app.use('/assets', express.static(ASSETS_DIR));

// Serve frontend static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug endpoint to check dist folder (temporary)
app.get('/debug', (req, res) => {
  const distPath = path.join(__dirname, '../dist');
  const serverDir = __dirname;
  const distExists = fs.existsSync(distPath);
  const indexExists = distExists && fs.existsSync(path.join(distPath, 'index.html'));
  const distContents = distExists ? fs.readdirSync(distPath) : [];

  res.json({
    serverDir,
    distPath,
    distExists,
    indexExists,
    distContents,
    isProduction,
    nodeEnv: process.env.NODE_ENV,
  });
});

// List all assets
app.get('/api/assets', (req, res) => {
  const meta = loadAssetsMeta();
  res.json(meta.assets);
});

// Upload new asset
app.post('/api/assets', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, mimetype, size } = req.file;
    const filePath = path.join(ASSETS_DIR, filename);

    // Calculate hash
    const fileBuffer = fs.readFileSync(filePath);
    const hash = createHash('sha256');
    hash.update(fileBuffer);
    const hashBase64 = hash.digest('base64');
    const integrityHash = `sha256-${hashBase64}`;

    // Create asset record
    const asset = {
      id: filename.replace(/\.[^/.]+$/, ''), // filename without extension as ID
      filename,
      originalName: originalname,
      name: req.body.name || originalname.replace(/\.[^/.]+$/, ''),
      mimetype,
      size,
      hash: integrityHash,
      uri: `/assets/${filename}`, // Use relative path so it works on any deployment
      createdAt: new Date().toISOString(),
    };

    // Save to metadata
    const meta = loadAssetsMeta();
    meta.assets.push(asset);
    saveAssetsMeta(meta);

    res.json(asset);
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete asset
app.delete('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const meta = loadAssetsMeta();

    const assetIndex = meta.assets.findIndex(a => a.id === id);
    if (assetIndex === -1) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = meta.assets[assetIndex];

    // Delete file
    const filePath = path.join(ASSETS_DIR, asset.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from metadata
    meta.assets.splice(assetIndex, 1);
    saveAssetsMeta(meta);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename asset
app.patch('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const meta = loadAssetsMeta();
    const asset = meta.assets.find(a => a.id === id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    asset.name = name;
    saveAssetsMeta(meta);

    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hash generation endpoint (existing)
app.get('/hash', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Fetch the resource
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch resource: ${response.statusText}`,
      });
    }

    // Get the content as an ArrayBuffer
    const buffer = await response.arrayBuffer();

    // Compute SHA-256 hash
    const hash = createHash('sha256');
    hash.update(Buffer.from(buffer));
    const hashBase64 = hash.digest('base64');

    // Return in SubResource Integrity format
    const integrityHash = `sha256-${hashBase64}`;

    res.json({
      url,
      hash: integrityHash,
      size: buffer.byteLength,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('Error fetching/hashing resource:', error);
    res.status(500).json({
      error: `Failed to process resource: ${error.message}`,
    });
  }
});

// Global error handler for Multer and other errors - must be before SPA fallback
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }

  // Generic error response
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// SPA fallback - serve index.html for all non-API routes in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`VCT Builder server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`Assets directory: ${ASSETS_DIR}`);
});
