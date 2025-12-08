import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get the data directory from environment or use default
const getDataDir = () => {
  const assetsPath = process.env.ASSETS_PATH || path.join(__dirname, '../../assets');
  const entitiesDir = path.join(assetsPath, 'entities');
  if (!fs.existsSync(entitiesDir)) {
    fs.mkdirSync(entitiesDir, { recursive: true });
  }
  return entitiesDir;
};

// Load seed data path
const getSeedDataPath = () => path.join(__dirname, '../data/seed-entities.json');

// Data file path
const getEntitiesFile = () => path.join(getDataDir(), 'entities.json');

// Initialize data files if they don't exist
const initializeData = () => {
  const entitiesFile = getEntitiesFile();

  if (!fs.existsSync(entitiesFile)) {
    const seedPath = getSeedDataPath();
    if (fs.existsSync(seedPath)) {
      console.log('Initializing entities from seed data...');
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      const now = new Date().toISOString();

      const entities = (seedData.entities || []).map((e) => ({
        ...e,
        createdAt: e.createdAt || now,
        updatedAt: e.updatedAt || now,
      }));

      fs.writeFileSync(entitiesFile, JSON.stringify({ entities }, null, 2));
      console.log(`Entities initialized with ${entities.length} entities`);
    } else {
      // Create empty data file
      fs.writeFileSync(entitiesFile, JSON.stringify({ entities: [] }, null, 2));
    }
  }
};

// Load helpers
const loadEntities = () => {
  initializeData();
  const data = JSON.parse(fs.readFileSync(getEntitiesFile(), 'utf-8'));
  return data.entities || [];
};

const saveEntities = (entities) => {
  fs.writeFileSync(getEntitiesFile(), JSON.stringify({ entities }, null, 2));
};

// Middleware: Require authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// ============================================
// Entities API
// ============================================

// List all entities (with optional type filter - supports multiple types)
router.get('/', (req, res) => {
  try {
    const { types, search } = req.query;
    let entities = loadEntities();

    // Filter by types if provided (comma-separated list)
    // Entity matches if it has ANY of the specified types
    if (types) {
      const typeList = types.split(',').map((t) => t.trim());
      entities = entities.filter((e) => {
        // Support both old 'type' field and new 'types' array
        const entityTypes = e.types || (e.type ? [e.type] : []);
        return entityTypes.some((t) => typeList.includes(t));
      });
    }

    // Filter by search query if provided
    if (search && search.length >= 2) {
      const query = search.toLowerCase();
      entities = entities.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.id.toLowerCase().includes(query)
      );
    }

    res.json(entities);
  } catch (error) {
    console.error('Error listing entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single entity
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entities = loadEntities();
    const entity = entities.find((e) => e.id === id);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(entity);
  } catch (error) {
    console.error('Error getting entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new entity
router.post('/', requireAuth, (req, res) => {
  try {
    const entities = loadEntities();
    const now = new Date().toISOString();

    // Generate slug-style ID from name with copa- prefix
    const generateId = (name) => {
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return slug ? `copa-${slug}` : '';
    };

    // Support both 'types' array and legacy 'type' field
    const types = req.body.types || (req.body.type ? [req.body.type] : []);

    const newEntity = {
      id: req.body.id || generateId(req.body.name),
      name: req.body.name,
      types: types,
      description: req.body.description || '',
      logoUri: req.body.logoUri || '',
      primaryColor: req.body.primaryColor || '',
      website: req.body.website || '',
      contactEmail: req.body.contactEmail || '',
      did: req.body.did || '',
      status: req.body.status || 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    if (!newEntity.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!newEntity.types || newEntity.types.length === 0) {
      return res.status(400).json({ error: 'At least one type is required' });
    }

    // Check for duplicate ID
    if (entities.some((e) => e.id === newEntity.id)) {
      return res.status(409).json({ error: 'Entity with this ID already exists' });
    }

    entities.push(newEntity);
    saveEntities(entities);

    res.json(newEntity);
  } catch (error) {
    console.error('Error creating entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an entity
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const entities = loadEntities();
    const index = entities.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Support both 'types' array and legacy 'type' field for existing data
    const existingTypes = entities[index].types || (entities[index].type ? [entities[index].type] : []);
    const newTypes = req.body.types ?? (req.body.type ? [req.body.type] : existingTypes);

    const updatedEntity = {
      ...entities[index],
      name: req.body.name ?? entities[index].name,
      types: newTypes,
      description: req.body.description ?? entities[index].description,
      logoUri: req.body.logoUri ?? entities[index].logoUri,
      primaryColor: req.body.primaryColor ?? entities[index].primaryColor,
      website: req.body.website ?? entities[index].website,
      contactEmail: req.body.contactEmail ?? entities[index].contactEmail,
      did: req.body.did ?? entities[index].did,
      status: req.body.status ?? entities[index].status,
      updatedAt: new Date().toISOString(),
      updatedBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    // Remove legacy 'type' field if it exists
    delete updatedEntity.type;

    entities[index] = updatedEntity;
    saveEntities(entities);

    res.json(updatedEntity);
  } catch (error) {
    console.error('Error updating entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an entity
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const entities = loadEntities();

    const index = entities.findIndex((e) => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    entities.splice(index, 1);
    saveEntities(entities);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export all entities
router.get('/export', (req, res) => {
  try {
    const entities = loadEntities();
    res.json({
      exportedAt: new Date().toISOString(),
      entities,
    });
  } catch (error) {
    console.error('Error exporting entities:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
