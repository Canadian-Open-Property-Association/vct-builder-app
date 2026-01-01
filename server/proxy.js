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
import catalogueRouter from './routes/catalogue.js';
import entitiesRouter from './routes/entities.js';
import harmonizationRouter from './routes/harmonization.js';
import openapiRouter from './routes/openapi.js';
import { initAccessLogger, logAccess, queryLogs, queryAnalytics } from './accessLogger.js';
import { requireAdmin, isAdmin } from './adminMiddleware.js';
import { specs, swaggerUi } from './swagger.js';
import formsRouter from './routes/forms.js';
import submissionsRouter from './routes/submissions.js';
import { initializeDatabase } from './db/index.js';

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
    ? ['https://apps.openpropertyassociation.ca']
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

// Allow iframe embedding from any domain
// Remove X-Frame-Options and set permissive Content-Security-Policy frame-ancestors
app.use((req, res, next) => {
  // Remove X-Frame-Options header if set by other middleware
  res.removeHeader('X-Frame-Options');
  // Allow embedding from any origin
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

// Mount auth, github, catalogue/dictionary, and entities routes
app.use('/api/auth', authRouter);
app.use('/api/github', githubRouter);
app.use('/api/catalogue', catalogueRouter);
// Mount catalogue routes on /api/dictionary as well (new Data Dictionary app uses this path)
// The route mappings: vocab-types -> data-types, categories -> categories
app.use('/api/dictionary', catalogueRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/harmonization', harmonizationRouter);
app.use('/api/openapi', openapiRouter);
app.use('/api/forms', formsRouter);
app.use('/api', submissionsRouter);

// Swagger API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui { background: #fafafa }
    .swagger-ui .info .title { color: #333 }
    .swagger-ui .download-url-wrapper { display: none }
    .swagger-ui .scheme-container { background: #fafafa; box-shadow: none }
    .swagger-ui .opblock-tag { border-bottom: 1px solid #e0e0e0 }
  `,
  customSiteTitle: 'COPA API Documentation',
}));
app.get('/api/docs.json', (req, res) => res.json(specs));

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

// Middleware: Require authentication for protected routes
const requireProjectAuth = (req, res, next) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// List all assets (optionally filter by entityId and/or type)
app.get('/api/assets', (req, res) => {
  const meta = loadAssetsMeta();
  const { entityId, type } = req.query;

  let filteredAssets = meta.assets;

  // Filter by entityId if provided
  if (entityId) {
    filteredAssets = filteredAssets.filter(a => a.entityId === entityId);
  }

  // Filter by type if provided (e.g., "entity-logo", "credential-background", "credential-icon")
  if (type) {
    filteredAssets = filteredAssets.filter(a => a.type === type);
  }

  res.json(filteredAssets);
});

// Upload new asset (requires auth to track uploader)
app.post('/api/assets', requireProjectAuth, upload.single('file'), async (req, res) => {
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

    // Create asset record with uploader info
    const asset = {
      id: filename.replace(/\.[^/.]+$/, ''), // filename without extension as ID
      filename,
      originalName: originalname,
      name: req.body.name || originalname.replace(/\.[^/.]+$/, ''),
      mimetype,
      size,
      hash: integrityHash,
      uri: `/assets/${filename}`, // Use relative path so it works on any deployment
      localUri: `/assets/${filename}`, // Alias for consistency with EntityAsset interface
      createdAt: new Date().toISOString(),
      uploader: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
      // Optional fields from request body
      entityId: req.body.entityId || undefined,
      type: req.body.type || undefined,
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

// Delete asset (requires auth, only uploader can delete unless legacy asset)
app.delete('/api/assets/:id', requireProjectAuth, (req, res) => {
  try {
    const { id } = req.params;
    const meta = loadAssetsMeta();

    const assetIndex = meta.assets.findIndex(a => a.id === id);
    if (assetIndex === -1) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = meta.assets[assetIndex];

    // Check ownership: only uploader can delete, but allow any authenticated user for legacy assets without uploader
    if (asset.uploader && asset.uploader.id !== String(req.session.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own assets' });
    }

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

// Update asset metadata (requires auth, only uploader can update unless legacy asset)
app.patch('/api/assets/:id', requireProjectAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, entityId } = req.body;

    const meta = loadAssetsMeta();
    const asset = meta.assets.find(a => a.id === id);

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check ownership: only uploader can update, but allow any authenticated user for legacy assets without uploader
    if (asset.uploader && asset.uploader.id !== String(req.session.user.id)) {
      return res.status(403).json({ error: 'You can only update your own assets' });
    }

    // Update fields if provided
    if (name !== undefined) asset.name = name;
    if (type !== undefined) asset.type = type;
    if (entityId !== undefined) asset.entityId = entityId;
    asset.updatedAt = new Date().toISOString();

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
// Managed Assets API (per-user server storage)
// ============================================

// Managed assets directory
const MANAGED_ASSETS_DIR = path.join(ASSETS_DIR, 'managed-assets');
if (!fs.existsSync(MANAGED_ASSETS_DIR)) {
  fs.mkdirSync(MANAGED_ASSETS_DIR, { recursive: true });
}

// Helper: Get user's managed assets file path
const getUserManagedAssetsFile = (userId) => {
  return path.join(MANAGED_ASSETS_DIR, `user-${userId}.json`);
};

// Helper: Load user's managed assets
const loadUserManagedAssets = (userId) => {
  const filePath = getUserManagedAssetsFile(userId);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error loading managed assets for user ${userId}:`, e);
  }
  return { projects: [] };
};

// Helper: Save user's managed assets
const saveUserManagedAssets = (userId, data) => {
  const filePath = getUserManagedAssetsFile(userId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// List all managed assets for current user
app.get('/api/managed-assets', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const data = loadUserManagedAssets(userId);
    res.json(data.projects);
  } catch (error) {
    console.error('Error listing managed assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific managed asset
app.get('/api/managed-assets/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const data = loadUserManagedAssets(userId);
    const project = data.projects.find(p => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Managed asset not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting managed asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new managed asset
app.post('/api/managed-assets', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id, name, asset } = req.body;

    if (!id || !name || !asset) {
      return res.status(400).json({ error: 'id, name, and asset are required' });
    }

    const data = loadUserManagedAssets(userId);
    const now = new Date().toISOString();

    const newProject = {
      id,
      name,
      asset,
      createdAt: now,
      updatedAt: now,
    };

    data.projects.push(newProject);
    saveUserManagedAssets(userId, data);

    res.json(newProject);
  } catch (error) {
    console.error('Error creating managed asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a managed asset
app.put('/api/managed-assets/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { name, asset } = req.body;

    const data = loadUserManagedAssets(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Managed asset not found' });
    }

    const now = new Date().toISOString();
    data.projects[projectIndex] = {
      ...data.projects[projectIndex],
      name: name || data.projects[projectIndex].name,
      asset: asset || data.projects[projectIndex].asset,
      updatedAt: now,
    };

    saveUserManagedAssets(userId, data);
    res.json(data.projects[projectIndex]);
  } catch (error) {
    console.error('Error updating managed asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a managed asset
app.delete('/api/managed-assets/:id', requireProjectAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const data = loadUserManagedAssets(userId);
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Managed asset not found' });
    }

    data.projects.splice(projectIndex, 1);
    saveUserManagedAssets(userId, data);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting managed asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Zone Templates API (shared across all users)
// ============================================

// Zone templates file (shared globally)
const ZONE_TEMPLATES_FILE = path.join(ASSETS_DIR, 'zone-templates.json');

// Helper: Load zone templates
const loadZoneTemplates = () => {
  try {
    if (fs.existsSync(ZONE_TEMPLATES_FILE)) {
      return JSON.parse(fs.readFileSync(ZONE_TEMPLATES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading zone templates:', e);
  }
  return { templates: [] };
};

// Helper: Save zone templates
const saveZoneTemplates = (data) => {
  fs.writeFileSync(ZONE_TEMPLATES_FILE, JSON.stringify(data, null, 2));
};

// List all zone templates (publicly readable, no auth required)
app.get('/api/zone-templates', (req, res) => {
  try {
    const data = loadZoneTemplates();
    res.json(data.templates);
  } catch (error) {
    console.error('Error listing zone templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific zone template
app.get('/api/zone-templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadZoneTemplates();
    const template = data.templates.find(t => t.id === id);

    if (!template) {
      return res.status(404).json({ error: 'Zone template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error getting zone template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new zone template (requires auth)
app.post('/api/zone-templates', requireProjectAuth, (req, res) => {
  try {
    const template = req.body;

    if (!template.id || !template.name) {
      return res.status(400).json({ error: 'id and name are required' });
    }

    const data = loadZoneTemplates();
    const now = new Date().toISOString();

    // Add author information from session
    const newTemplate = {
      ...template,
      author: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
      createdAt: template.createdAt || now,
      updatedAt: now,
    };

    // Check if template with this ID already exists
    const existingIndex = data.templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      return res.status(409).json({ error: 'Template with this ID already exists' });
    }

    data.templates.push(newTemplate);
    saveZoneTemplates(data);

    res.json(newTemplate);
  } catch (error) {
    console.error('Error creating zone template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an existing zone template (requires auth, only author can update)
app.put('/api/zone-templates/:id', requireProjectAuth, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const data = loadZoneTemplates();
    const templateIndex = data.templates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Zone template not found' });
    }

    const existingTemplate = data.templates[templateIndex];

    // Only the author can update their template
    if (existingTemplate.author?.id !== String(req.session.user.id)) {
      return res.status(403).json({ error: 'You can only update your own templates' });
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...updates,
      id, // Ensure ID doesn't change
      author: existingTemplate.author, // Preserve original author
      createdAt: existingTemplate.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };

    data.templates[templateIndex] = updatedTemplate;
    saveZoneTemplates(data);

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating zone template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a zone template (requires auth, only author can delete)
app.delete('/api/zone-templates/:id', requireProjectAuth, (req, res) => {
  try {
    const { id } = req.params;

    const data = loadZoneTemplates();
    const templateIndex = data.templates.findIndex(t => t.id === id);

    if (templateIndex === -1) {
      return res.status(404).json({ error: 'Zone template not found' });
    }

    const template = data.templates[templateIndex];

    // Only the author can delete their template
    if (template.author?.id !== String(req.session.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own templates' });
    }

    data.templates.splice(templateIndex, 1);
    saveZoneTemplates(data);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting zone template:', error);
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

// Get analytics data (admin only)
app.get('/api/admin/analytics', requireProjectAuth, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date, granularity } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const result = queryAnalytics({
      start_date,
      end_date,
      granularity: granularity || 'day'
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching analytics:', error);
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
        'User-Agent': 'copa-apps',
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

// ============================================
// Vocabulary API (fetch external vocabularies for JSON-LD Context mode)
// ============================================

// Helper: Transform raw vocabulary data to internal format
function transformVocabulary(data, sourceUrl) {
  // Generate an ID from the URL
  const urlObj = new URL(sourceUrl);
  const vocabId = urlObj.pathname.split('/').pop()?.replace('.jsonld', '') || 'unknown-vocab';

  const vocabulary = {
    id: data.id || vocabId,
    name: data.name || data['@context']?.['@vocab'] || 'Unknown Vocabulary',
    description: data.description || `Vocabulary from ${urlObj.hostname}`,
    url: sourceUrl,
    contextUrl: data['@context']?.['@base'] || sourceUrl.replace('vocab.jsonld', 'context.jsonld'),
    version: data.version || '1.0',
    terms: [],
    complexTypes: [],
    updatedAt: new Date().toISOString(),
  };

  // If the vocabulary has a specific terms array, use it
  if (data.terms && Array.isArray(data.terms)) {
    vocabulary.terms = data.terms.map(term => ({
      id: term.id,
      label: term.label || term.id,
      description: term.description || '',
      '@id': term['@id'] || `vocab:${term.id}`,
      allowedTypes: term.allowedTypes || ['string'],
      isComplexType: term.isComplexType || false,
    }));
  } else {
    // Otherwise, try to parse from JSON-LD @context format
    // This handles vocabularies like the one from adarshnb-19.github.io
    const context = data['@context'] || data;

    for (const [key, value] of Object.entries(context)) {
      // Skip JSON-LD keywords
      if (key.startsWith('@')) continue;

      if (typeof value === 'string') {
        // Simple term mapping (e.g., "name": "ext:name")
        vocabulary.terms.push({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          description: '',
          '@id': value,
          allowedTypes: ['string'],
          isComplexType: false,
        });
      } else if (typeof value === 'object' && value !== null) {
        // Complex type with nested @context
        if (value['@context']) {
          vocabulary.complexTypes.push({
            id: key,
            label: key,
            description: '',
            '@id': value['@id'] || `#${key}`,
            allowedProperties: Object.keys(value['@context']).filter(k => !k.startsWith('@')),
          });
        } else if (value['@id']) {
          // Term with explicit @id (might be a type reference)
          const isComplexType = value['@type'] !== undefined;
          vocabulary.terms.push({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            description: '',
            '@id': value['@id'],
            allowedTypes: isComplexType ? ['object'] : ['string'],
            isComplexType,
          });
        }
      }
    }
  }

  // Parse complex types if provided
  if (data.complexTypes && Array.isArray(data.complexTypes)) {
    vocabulary.complexTypes = data.complexTypes.map(type => ({
      id: type.id,
      label: type.label || type.id,
      description: type.description || '',
      '@id': type['@id'],
      allowedProperties: type.allowedProperties || [],
    }));
  }

  return vocabulary;
}

// Fetch and parse vocabulary from external URL
app.get('/api/vocabulary/fetch', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch vocabulary
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/ld+json, application/json',
        'User-Agent': 'copa-apps-vocab-loader',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch vocabulary: ${response.statusText}`,
      });
    }

    const vocabData = await response.json();

    // Transform to our internal Vocabulary format
    const vocabulary = transformVocabulary(vocabData, url);

    res.json(vocabulary);
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
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

app.listen(PORT, async () => {
  console.log(`VCT Builder server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`Assets directory: ${ASSETS_DIR}`);

  // Initialize Forms Builder database (if DATABASE_URL is configured)
  await initializeDatabase();
});
