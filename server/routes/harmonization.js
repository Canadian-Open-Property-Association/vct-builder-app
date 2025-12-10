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
  const harmonizationDir = path.join(assetsPath, 'harmonization');
  if (!fs.existsSync(harmonizationDir)) {
    fs.mkdirSync(harmonizationDir, { recursive: true });
  }
  return harmonizationDir;
};

// Data file path
const getMappingsFile = () => path.join(getDataDir(), 'mappings.json');

// Initialize data files if they don't exist
const initializeData = () => {
  const mappingsFile = getMappingsFile();

  if (!fs.existsSync(mappingsFile)) {
    // Create empty data file
    fs.writeFileSync(mappingsFile, JSON.stringify({ mappings: [] }, null, 2));
    console.log('Initialized empty harmonization mappings file');
  }
};

// Load helpers
const loadMappings = () => {
  initializeData();
  const data = JSON.parse(fs.readFileSync(getMappingsFile(), 'utf-8'));
  return data.mappings || [];
};

const saveMappings = (mappings) => {
  fs.writeFileSync(getMappingsFile(), JSON.stringify({ mappings }, null, 2));
};

// Middleware: Require authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// ============================================
// Mappings API
// ============================================

// List all mappings
router.get('/mappings', (req, res) => {
  try {
    const { entityId, vocabTypeId } = req.query;
    let mappings = loadMappings();

    // Filter by entityId if provided
    if (entityId) {
      mappings = mappings.filter((m) => m.entityId === entityId);
    }

    // Filter by vocabTypeId if provided
    if (vocabTypeId) {
      mappings = mappings.filter((m) => m.vocabTypeId === vocabTypeId);
    }

    res.json(mappings);
  } catch (error) {
    console.error('Error loading mappings:', error);
    res.status(500).json({ error: 'Failed to load mappings' });
  }
});

// Get a single mapping by ID
router.get('/mappings/:id', (req, res) => {
  try {
    const mappings = loadMappings();
    const mapping = mappings.find((m) => m.id === req.params.id);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('Error loading mapping:', error);
    res.status(500).json({ error: 'Failed to load mapping' });
  }
});

// Create a new mapping
router.post('/mappings', requireAuth, (req, res) => {
  try {
    const mappings = loadMappings();
    const now = new Date().toISOString();

    const newMapping = {
      id: `mapping-${Date.now()}`,
      ...req.body,
      createdAt: now,
      updatedAt: now,
      createdBy: {
        id: req.session.user.id,
        login: req.session.user.login,
        name: req.session.user.name,
      },
    };

    mappings.push(newMapping);
    saveMappings(mappings);

    console.log(`Created mapping: ${newMapping.id}`);
    res.status(201).json(newMapping);
  } catch (error) {
    console.error('Error creating mapping:', error);
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

// Update a mapping
router.put('/mappings/:id', requireAuth, (req, res) => {
  try {
    const mappings = loadMappings();
    const index = mappings.findIndex((m) => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    const now = new Date().toISOString();
    const updatedMapping = {
      ...mappings[index],
      ...req.body,
      id: req.params.id, // Prevent ID change
      updatedAt: now,
      updatedBy: {
        id: req.session.user.id,
        login: req.session.user.login,
        name: req.session.user.name,
      },
    };

    mappings[index] = updatedMapping;
    saveMappings(mappings);

    console.log(`Updated mapping: ${req.params.id}`);
    res.json(updatedMapping);
  } catch (error) {
    console.error('Error updating mapping:', error);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

// Delete a mapping
router.delete('/mappings/:id', requireAuth, (req, res) => {
  try {
    const mappings = loadMappings();
    const index = mappings.findIndex((m) => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    mappings.splice(index, 1);
    saveMappings(mappings);

    console.log(`Deleted mapping: ${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// Get statistics
router.get('/stats', (req, res) => {
  try {
    const mappings = loadMappings();

    const stats = {
      totalMappings: mappings.length,
      mappedEntities: new Set(mappings.map((m) => m.entityId)).size,
      mappedVocabTypes: new Set(mappings.map((m) => m.vocabTypeId)).size,
      unmappedFurnisherFields: 0, // Would need to calculate from entities
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
