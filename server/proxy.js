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
import { initAccessLogger, logAccess, queryLogs } from './accessLogger.js';
import { requireAdmin, isAdmin } from './adminMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;
const isProduction = process.env.NODE_ENV === 'production';

// Assets directory - use ASSETS_PATH env var for persistent storage (e.g., Render Disk)
// In production, mount a persistent disk and set ASSETS_PATH=/var/data/assets
const ASSETS_DIR = process.env.ASSETS_PATH || path.join(__dirname, '../assets');

// VCT Projects directory (stored alongside assets on persistent disk)
const PROJECTS_DIR = path.join(ASSETS_DIR, 'projects');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Initialize access logger
initAccessLogger(ASSETS_DIR);

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

// ============================================
// VCT Projects API (per-user server storage)
// ============================================

// Helper: Get user's projects file path
const getUserProjectsFile = (userId) => {
  return path.join(PROJECTS_DIR, `user-${userId}.json`);
};

// Helper: Load user's projects
const loadUserProjects = (userId) => {
  const filePath = getUserProjectsFile(userId);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading projects for user ${userId}:`, e);
  }
  return { projects: [] };
};

// Helper: Save user's projects
const saveUserProjects = (userId, data) => {
  const filePath = getUserProjectsFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Middleware: Require authentication for projects
const requireProjectAuth = (req, res, next) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// List all projects for current user
app.get('/api/projects', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const data = loadUserProjects(userId);
    res.json(data.projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific project
app.get('/api/projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const data = loadUserProjects(userId);
    const project = data.projects.find(p => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new project
app.post('/api/projects', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id, name, vct, sampleData } = req.body;

    if (!id || !name || !vct) {
      return res.status(400).json({ error: 'id, name, and vct are required' });
    }

    const data = loadUserProjects(userId);
    const now = new Date().toISOString();

    const newProject = {
      id,
      name,
      vct,
      sampleData: sampleData || {},
      createdAt: now,
      updatedAt: now,
    };

    data.projects.push(newProject);
    saveUserProjects(userId, data);

    res.json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an existing project
app.put('/api/projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { name, vct, sampleData } = req.body;

    const data = loadUserProjects(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updatedProject = {
      ...data.projects[projectIndex],
      name: name ?? data.projects[projectIndex].name,
      vct: vct ?? data.projects[projectIndex].vct,
      sampleData: sampleData ?? data.projects[projectIndex].sampleData,
      updatedAt: new Date().toISOString(),
    };

    data.projects[projectIndex] = updatedProject;
    saveUserProjects(userId, data);

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a project
app.delete('/api/projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const data = loadUserProjects(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }

    data.projects.splice(projectIndex, 1);
    saveUserProjects(userId, data);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Schema Projects API (per-user server storage)
// ============================================

// Schema projects directory
const SCHEMA_PROJECTS_DIR = path.join(ASSETS_DIR, 'schema-projects');
if (!fs.existsSync(SCHEMA_PROJECTS_DIR)) {
  fs.mkdirSync(SCHEMA_PROJECTS_DIR, { recursive: true });
}

// Helper: Get user's schema projects file path
const getUserSchemaProjectsFile = (userId) => {
  return path.join(SCHEMA_PROJECTS_DIR, `user-${userId}.json`);
};

// Helper: Load user's schema projects
const loadUserSchemaProjects = (userId) => {
  const filePath = getUserSchemaProjectsFile(userId);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading schema projects for user ${userId}:`, e);
  }
  return { projects: [] };
};

// Helper: Save user's schema projects
const saveUserSchemaProjects = (userId, data) => {
  const filePath = getUserSchemaProjectsFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// List all schema projects for current user
app.get('/api/schema-projects', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const data = loadUserSchemaProjects(userId);
    res.json(data.projects);
  } catch (error) {
    console.error('Error listing schema projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific schema project
app.get('/api/schema-projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const data = loadUserSchemaProjects(userId);
    const project = data.projects.find(p => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Schema project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting schema project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new schema project
app.post('/api/schema-projects', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id, name, metadata, properties } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const data = loadUserSchemaProjects(userId);
    const now = new Date().toISOString();

    const newProject = {
      id,
      name,
      metadata: metadata || {},
      properties: properties || [],
      createdAt: now,
      updatedAt: now,
    };

    data.projects.push(newProject);
    saveUserSchemaProjects(userId, data);

    res.json(newProject);
  } catch (error) {
    console.error('Error creating schema project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an existing schema project
app.put('/api/schema-projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { name, metadata, properties } = req.body;

    const data = loadUserSchemaProjects(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Schema project not found' });
    }

    const updatedProject = {
      ...data.projects[projectIndex],
      name: name ?? data.projects[projectIndex].name,
      metadata: metadata ?? data.projects[projectIndex].metadata,
      properties: properties ?? data.projects[projectIndex].properties,
      updatedAt: new Date().toISOString(),
    };

    data.projects[projectIndex] = updatedProject;
    saveUserSchemaProjects(userId, data);

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating schema project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a schema project
app.delete('/api/schema-projects/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const data = loadUserSchemaProjects(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Schema project not found' });
    }

    data.projects.splice(projectIndex, 1);
    saveUserSchemaProjects(userId, data);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schema project:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Admin API (access logs)
// ============================================

// Check if current user is admin
app.get('/api/admin/check', requireProjectAuth, (req, res) => {
  res.json({ isAdmin: isAdmin(req) });
});

// Get access logs (admin only)
app.get('/api/admin/logs', requireProjectAuth, requireAdmin, (req, res) => {
  try {
    const {
      event_type,
      username,
      app_id,
      start_date,
      end_date,
      page,
      limit,
      sort_by,
      sort_order
    } = req.query;

    const result = queryLogs({
      event_type,
      username,
      app_id,
      start_date,
      end_date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sort_by,
      sort_order
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track app access (authenticated users)
app.post('/api/track-app-access', requireProjectAuth, (req, res) => {
  try {
    const { appId, appName } = req.body;

    if (!appId || !appName) {
      return res.status(400).json({ error: 'appId and appName are required' });
    }

    logAccess({
      eventType: 'app_access',
      user: req.session.user,
      appId,
      appName,
      req
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking app access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Governance Docs API (fetch from GitHub)
// ============================================

// Governance docs configuration
const GOVERNANCE_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Canadian-Open-Property-Association';
const GOVERNANCE_REPO_NAME = process.env.GITHUB_REPO_NAME || 'verifiable-credentials';
const GOVERNANCE_DOCS_PATH = 'credentials/governance-docs';
const GOVERNANCE_BASE_URL = 'https://openpropertyassociation.ca/governance';

// Fetch governance docs from GitHub (public, no auth required)
app.get('/api/governance-docs', async (req, res) => {
  try {
    // Fetch directory contents from GitHub API
    const apiUrl = `https://api.github.com/repos/${GOVERNANCE_REPO_OWNER}/${GOVERNANCE_REPO_NAME}/contents/${GOVERNANCE_DOCS_PATH}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'credential-design-tools',
      },
      redirect: 'follow', // Follow redirects automatically
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const files = await response.json();

    // Handle case where response is not an array (e.g., error or redirect message)
    if (!Array.isArray(files)) {
      console.error('Unexpected GitHub API response:', files);
      throw new Error('Unexpected response from GitHub API');
    }

    // Filter for markdown files and transform to GovernanceDoc format
    const docs = files
      .filter(file => file.type === 'file' && file.name.endsWith('.md') && file.name !== 'index.md')
      .map(file => {
        // Convert filename to display name (e.g., "home-credential.md" -> "Home Credential")
        const displayName = file.name
          .replace('.md', '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Build the URL to the published doc
        const url = `${GOVERNANCE_BASE_URL}/${file.name.replace('.md', '')}/`;

        return {
          name: file.name,
          path: file.path,
          displayName,
          url,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.json(docs);
  } catch (error) {
    console.error('Error fetching governance docs:', error);
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
