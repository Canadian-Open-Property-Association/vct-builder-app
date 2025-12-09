import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ============================================
// Data Catalogue API - Vocabulary-First Design
// DataTypes are the primary concept, with properties and sources
// ============================================

// Get the data directory from environment or use default
const getDataDir = () => {
  const assetsPath = process.env.ASSETS_PATH || path.join(__dirname, '../../assets');
  const catalogueDir = path.join(assetsPath, 'catalogue');
  if (!fs.existsSync(catalogueDir)) {
    fs.mkdirSync(catalogueDir, { recursive: true });
  }
  return catalogueDir;
};

// Data file paths
const getDataTypesFile = () => path.join(getDataDir(), 'data-types.json');
const getCategoriesFile = () => path.join(getDataDir(), 'categories.json');
const getSeedDataPath = () => path.join(__dirname, '../data/data-types.json');

// Initialize data if it doesn't exist
const initializeData = () => {
  const dataFile = getDataTypesFile();
  if (!fs.existsSync(dataFile)) {
    const seedPath = getSeedDataPath();
    if (fs.existsSync(seedPath)) {
      console.log('Initializing data types from seed data...');
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      fs.writeFileSync(dataFile, JSON.stringify(seedData, null, 2));
      console.log(`Data types initialized with ${seedData.dataTypes?.length || 0} data types`);
    } else {
      fs.writeFileSync(dataFile, JSON.stringify({ dataTypes: [] }, null, 2));
    }
  }
};

// Load/Save data types
const loadDataTypes = () => {
  initializeData();
  const data = JSON.parse(fs.readFileSync(getDataTypesFile(), 'utf-8'));
  return data.dataTypes || [];
};

const saveDataTypes = (dataTypes) => {
  fs.writeFileSync(getDataTypesFile(), JSON.stringify({ dataTypes }, null, 2));
};

// Load/Save categories
const loadCategories = () => {
  const file = getCategoriesFile();
  if (!fs.existsSync(file)) {
    // Default categories
    const defaultCategories = [
      { id: 'property', name: 'Property', description: 'Property-related data types', order: 1 },
      { id: 'identity', name: 'Identity', description: 'Identity verification data types', order: 2 },
      { id: 'financial', name: 'Financial', description: 'Financial data types', order: 3 },
      { id: 'other', name: 'Other', description: 'Other data types', order: 99 },
    ];
    fs.writeFileSync(file, JSON.stringify(defaultCategories, null, 2));
    return defaultCategories;
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
};

const saveCategories = (categories) => {
  fs.writeFileSync(getCategoriesFile(), JSON.stringify(categories, null, 2));
};

// Generate slug-style ID
const generateId = (name) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Middleware: Require authentication for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// -------------------- Data Types --------------------

// List all data types
router.get('/data-types', (req, res) => {
  try {
    const { category, search } = req.query;
    let dataTypes = loadDataTypes();

    // Filter by category
    if (category) {
      dataTypes = dataTypes.filter(dt => dt.category === category);
    }

    // Filter by search query
    if (search && search.length >= 2) {
      const query = search.toLowerCase();
      dataTypes = dataTypes.filter(dt =>
        dt.name.toLowerCase().includes(query) ||
        dt.description?.toLowerCase().includes(query)
      );
    }

    res.json(dataTypes);
  } catch (error) {
    console.error('Error listing data types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single data type with properties and sources
router.get('/data-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dataTypes = loadDataTypes();
    const dataType = dataTypes.find(dt => dt.id === id);

    if (!dataType) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    res.json(dataType);
  } catch (error) {
    console.error('Error getting data type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new data type
router.post('/data-types', requireAuth, (req, res) => {
  try {
    const dataTypes = loadDataTypes();
    const now = new Date().toISOString();

    const newDataType = {
      id: req.body.id || generateId(req.body.name),
      name: req.body.name,
      description: req.body.description || '',
      category: req.body.category || 'other',
      parentTypeId: req.body.parentTypeId || null,
      properties: req.body.properties || [],
      sources: req.body.sources || [],
      createdAt: now,
      updatedAt: now,
      createdBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    if (!newDataType.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check for duplicate ID
    if (dataTypes.some(dt => dt.id === newDataType.id)) {
      return res.status(409).json({ error: 'Data type with this ID already exists' });
    }

    dataTypes.push(newDataType);
    saveDataTypes(dataTypes);

    res.json(newDataType);
  } catch (error) {
    console.error('Error creating data type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a data type
router.put('/data-types/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const dataTypes = loadDataTypes();
    const index = dataTypes.findIndex(dt => dt.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const updatedDataType = {
      ...dataTypes[index],
      name: req.body.name ?? dataTypes[index].name,
      description: req.body.description ?? dataTypes[index].description,
      category: req.body.category ?? dataTypes[index].category,
      parentTypeId: req.body.parentTypeId !== undefined ? req.body.parentTypeId : dataTypes[index].parentTypeId,
      properties: req.body.properties ?? dataTypes[index].properties,
      sources: req.body.sources ?? dataTypes[index].sources,
      updatedAt: new Date().toISOString(),
      updatedBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    dataTypes[index] = updatedDataType;
    saveDataTypes(dataTypes);

    res.json(updatedDataType);
  } catch (error) {
    console.error('Error updating data type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a data type
router.delete('/data-types/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const dataTypes = loadDataTypes();

    const index = dataTypes.findIndex(dt => dt.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    dataTypes.splice(index, 1);
    saveDataTypes(dataTypes);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting data type:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Properties (nested in DataType) --------------------

// Add a property to a data type
router.post('/data-types/:dataTypeId/properties', requireAuth, (req, res) => {
  try {
    const { dataTypeId } = req.params;
    const dataTypes = loadDataTypes();
    const index = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (index === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const property = {
      id: req.body.id || `prop-${Date.now()}`,
      name: req.body.name,
      displayName: req.body.displayName || req.body.name,
      description: req.body.description || '',
      valueType: req.body.valueType || 'string',
      required: req.body.required || false,
      sampleValue: req.body.sampleValue || '',
      path: req.body.path || '',
      metadata: req.body.metadata || {},
    };

    if (!property.name) {
      return res.status(400).json({ error: 'Property name is required' });
    }

    // Check for duplicate property name
    if (dataTypes[index].properties.some(p => p.name === property.name)) {
      return res.status(409).json({ error: 'Property with this name already exists' });
    }

    dataTypes[index].properties.push(property);
    dataTypes[index].updatedAt = new Date().toISOString();
    dataTypes[index].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[index]);
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a property
router.put('/data-types/:dataTypeId/properties/:propertyId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, propertyId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    dataTypes[dtIndex].properties[propIndex] = {
      ...dataTypes[dtIndex].properties[propIndex],
      name: req.body.name ?? dataTypes[dtIndex].properties[propIndex].name,
      displayName: req.body.displayName ?? dataTypes[dtIndex].properties[propIndex].displayName,
      description: req.body.description ?? dataTypes[dtIndex].properties[propIndex].description,
      valueType: req.body.valueType ?? dataTypes[dtIndex].properties[propIndex].valueType,
      required: req.body.required ?? dataTypes[dtIndex].properties[propIndex].required,
      sampleValue: req.body.sampleValue ?? dataTypes[dtIndex].properties[propIndex].sampleValue,
      path: req.body.path ?? dataTypes[dtIndex].properties[propIndex].path,
      metadata: req.body.metadata ?? dataTypes[dtIndex].properties[propIndex].metadata,
      providerMappings: req.body.providerMappings ?? dataTypes[dtIndex].properties[propIndex].providerMappings,
    };

    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a property
router.delete('/data-types/:dataTypeId/properties/:propertyId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, propertyId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    dataTypes[dtIndex].properties.splice(propIndex, 1);
    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Property Provider Mappings --------------------

// Add a provider mapping to a property
router.post('/data-types/:dataTypeId/properties/:propertyId/mappings', requireAuth, (req, res) => {
  try {
    const { dataTypeId, propertyId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const mapping = {
      entityId: req.body.entityId,
      entityName: req.body.entityName || '',
      providerFieldName: req.body.providerFieldName || dataTypes[dtIndex].properties[propIndex].name,
      regionsCovered: req.body.regionsCovered || [],
      notes: req.body.notes || '',
      addedAt: new Date().toISOString(),
      addedBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    if (!mapping.entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    // Initialize providerMappings array if it doesn't exist
    if (!dataTypes[dtIndex].properties[propIndex].providerMappings) {
      dataTypes[dtIndex].properties[propIndex].providerMappings = [];
    }

    // Check for duplicate mapping
    if (dataTypes[dtIndex].properties[propIndex].providerMappings.some(m => m.entityId === mapping.entityId)) {
      return res.status(409).json({ error: 'This entity is already mapped to this property' });
    }

    dataTypes[dtIndex].properties[propIndex].providerMappings.push(mapping);
    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error adding provider mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a provider mapping on a property
router.put('/data-types/:dataTypeId/properties/:propertyId/mappings/:entityId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, propertyId, entityId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const mappings = dataTypes[dtIndex].properties[propIndex].providerMappings || [];
    const mappingIndex = mappings.findIndex(m => m.entityId === entityId);
    if (mappingIndex === -1) {
      return res.status(404).json({ error: 'Provider mapping not found' });
    }

    dataTypes[dtIndex].properties[propIndex].providerMappings[mappingIndex] = {
      ...mappings[mappingIndex],
      entityName: req.body.entityName ?? mappings[mappingIndex].entityName,
      providerFieldName: req.body.providerFieldName ?? mappings[mappingIndex].providerFieldName,
      regionsCovered: req.body.regionsCovered ?? mappings[mappingIndex].regionsCovered,
      notes: req.body.notes ?? mappings[mappingIndex].notes,
    };

    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error updating provider mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a provider mapping from a property
router.delete('/data-types/:dataTypeId/properties/:propertyId/mappings/:entityId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, propertyId, entityId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const mappings = dataTypes[dtIndex].properties[propIndex].providerMappings || [];
    const mappingIndex = mappings.findIndex(m => m.entityId === entityId);
    if (mappingIndex === -1) {
      return res.status(404).json({ error: 'Provider mapping not found' });
    }

    dataTypes[dtIndex].properties[propIndex].providerMappings.splice(mappingIndex, 1);
    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error removing provider mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk add provider mapping to multiple properties
router.post('/data-types/:dataTypeId/properties/bulk-add-mapping', requireAuth, (req, res) => {
  try {
    const { dataTypeId } = req.params;
    const { propertyIds, mapping } = req.body;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: 'Property IDs array is required' });
    }

    if (!mapping?.entityId) {
      return res.status(400).json({ error: 'Entity ID is required in mapping' });
    }

    const now = new Date().toISOString();
    const userRef = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    let addedCount = 0;
    let skippedCount = 0;

    for (const propertyId of propertyIds) {
      const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
      if (propIndex === -1) {
        skippedCount++;
        continue;
      }

      // Initialize providerMappings array if it doesn't exist
      if (!dataTypes[dtIndex].properties[propIndex].providerMappings) {
        dataTypes[dtIndex].properties[propIndex].providerMappings = [];
      }

      // Skip if mapping already exists for this entity
      if (dataTypes[dtIndex].properties[propIndex].providerMappings.some(m => m.entityId === mapping.entityId)) {
        skippedCount++;
        continue;
      }

      const newMapping = {
        entityId: mapping.entityId,
        entityName: mapping.entityName || '',
        providerFieldName: mapping.providerFieldName || dataTypes[dtIndex].properties[propIndex].name,
        regionsCovered: mapping.regionsCovered || [],
        notes: mapping.notes || '',
        addedAt: now,
        addedBy: userRef,
      };

      dataTypes[dtIndex].properties[propIndex].providerMappings.push(newMapping);
      addedCount++;
    }

    dataTypes[dtIndex].updatedAt = now;
    dataTypes[dtIndex].updatedBy = userRef;

    saveDataTypes(dataTypes);

    res.json({
      success: true,
      added: addedCount,
      skipped: skippedCount,
      dataType: dataTypes[dtIndex],
    });
  } catch (error) {
    console.error('Error bulk adding provider mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk remove provider mapping from multiple properties
router.post('/data-types/:dataTypeId/properties/bulk-remove-mapping', requireAuth, (req, res) => {
  try {
    const { dataTypeId } = req.params;
    const { propertyIds, entityId } = req.body;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: 'Property IDs array is required' });
    }

    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    const now = new Date().toISOString();
    const userRef = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    let removedCount = 0;
    let skippedCount = 0;

    for (const propertyId of propertyIds) {
      const propIndex = dataTypes[dtIndex].properties.findIndex(p => p.id === propertyId);
      if (propIndex === -1) {
        skippedCount++;
        continue;
      }

      const mappings = dataTypes[dtIndex].properties[propIndex].providerMappings || [];
      const mappingIndex = mappings.findIndex(m => m.entityId === entityId);
      if (mappingIndex === -1) {
        skippedCount++;
        continue;
      }

      dataTypes[dtIndex].properties[propIndex].providerMappings.splice(mappingIndex, 1);
      removedCount++;
    }

    dataTypes[dtIndex].updatedAt = now;
    dataTypes[dtIndex].updatedBy = userRef;

    saveDataTypes(dataTypes);

    res.json({
      success: true,
      removed: removedCount,
      skipped: skippedCount,
      dataType: dataTypes[dtIndex],
    });
  } catch (error) {
    console.error('Error bulk removing provider mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Sources (link to entities) --------------------

// Add a source (entity) to a data type
router.post('/data-types/:dataTypeId/sources', requireAuth, (req, res) => {
  try {
    const { dataTypeId } = req.params;
    const dataTypes = loadDataTypes();
    const index = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (index === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const source = {
      entityId: req.body.entityId,
      entityName: req.body.entityName || '',
      regionsCovered: req.body.regionsCovered || [],
      updateFrequency: req.body.updateFrequency || '',
      notes: req.body.notes || '',
      apiEndpoint: req.body.apiEndpoint || '',
      addedAt: new Date().toISOString(),
      addedBy: {
        id: String(req.session.user.id),
        login: req.session.user.login,
        name: req.session.user.name || undefined,
      },
    };

    if (!source.entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }

    // Check for duplicate source
    if (dataTypes[index].sources.some(s => s.entityId === source.entityId)) {
      return res.status(409).json({ error: 'This entity is already a source for this data type' });
    }

    dataTypes[index].sources.push(source);
    dataTypes[index].updatedAt = new Date().toISOString();
    dataTypes[index].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[index]);
  } catch (error) {
    console.error('Error adding source:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a source
router.put('/data-types/:dataTypeId/sources/:entityId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, entityId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const sourceIndex = dataTypes[dtIndex].sources.findIndex(s => s.entityId === entityId);
    if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
    }

    dataTypes[dtIndex].sources[sourceIndex] = {
      ...dataTypes[dtIndex].sources[sourceIndex],
      entityName: req.body.entityName ?? dataTypes[dtIndex].sources[sourceIndex].entityName,
      regionsCovered: req.body.regionsCovered ?? dataTypes[dtIndex].sources[sourceIndex].regionsCovered,
      updateFrequency: req.body.updateFrequency ?? dataTypes[dtIndex].sources[sourceIndex].updateFrequency,
      notes: req.body.notes ?? dataTypes[dtIndex].sources[sourceIndex].notes,
      apiEndpoint: req.body.apiEndpoint ?? dataTypes[dtIndex].sources[sourceIndex].apiEndpoint,
    };

    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error updating source:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a source
router.delete('/data-types/:dataTypeId/sources/:entityId', requireAuth, (req, res) => {
  try {
    const { dataTypeId, entityId } = req.params;
    const dataTypes = loadDataTypes();
    const dtIndex = dataTypes.findIndex(dt => dt.id === dataTypeId);

    if (dtIndex === -1) {
      return res.status(404).json({ error: 'Data type not found' });
    }

    const sourceIndex = dataTypes[dtIndex].sources.findIndex(s => s.entityId === entityId);
    if (sourceIndex === -1) {
      return res.status(404).json({ error: 'Source not found' });
    }

    dataTypes[dtIndex].sources.splice(sourceIndex, 1);
    dataTypes[dtIndex].updatedAt = new Date().toISOString();
    dataTypes[dtIndex].updatedBy = {
      id: String(req.session.user.id),
      login: req.session.user.login,
      name: req.session.user.name || undefined,
    };

    saveDataTypes(dataTypes);
    res.json(dataTypes[dtIndex]);
  } catch (error) {
    console.error('Error removing source:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Categories --------------------

// List all categories
router.get('/categories', (req, res) => {
  try {
    const categories = loadCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new category
router.post('/categories', requireAuth, (req, res) => {
  try {
    const { name, description, order } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const categories = loadCategories();

    if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const maxOrder = Math.max(0, ...categories.map(c => c.order || 0));
    const newCategory = {
      id: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: name.trim(),
      description: description?.trim() || '',
      order: order ?? maxOrder + 1,
    };

    categories.push(newCategory);
    saveCategories(categories);

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Search --------------------

// Search across data types and properties
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ dataTypes: [] });
    }

    const query = q.toLowerCase();
    const dataTypes = loadDataTypes();

    const matchedDataTypes = dataTypes.filter(dt =>
      dt.name.toLowerCase().includes(query) ||
      dt.description?.toLowerCase().includes(query) ||
      (dt.properties || []).some(p =>
        p.name.toLowerCase().includes(query) ||
        p.displayName?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    );

    res.json({ dataTypes: matchedDataTypes });
  } catch (error) {
    console.error('Error searching catalogue:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Export --------------------

// Export all catalogue data
router.get('/export', (req, res) => {
  try {
    const dataTypes = loadDataTypes();
    const categories = loadCategories();

    res.json({
      exportedAt: new Date().toISOString(),
      categories,
      dataTypes,
    });
  } catch (error) {
    console.error('Error exporting catalogue:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Stats --------------------

// Get catalogue statistics
router.get('/stats', (req, res) => {
  try {
    const dataTypes = loadDataTypes();
    const categories = loadCategories();

    // Handle both new format (with properties/sources) and legacy format
    const totalProperties = dataTypes.reduce((sum, dt) => sum + (dt.properties?.length || 0), 0);
    const totalSources = dataTypes.reduce((sum, dt) => sum + (dt.sources?.length || 0), 0);

    const categoryCounts = {};
    for (const dt of dataTypes) {
      const cat = dt.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    res.json({
      totalDataTypes: dataTypes.length,
      totalProperties,
      totalSources,
      totalCategories: categories.length,
      categoryCounts,
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------- Admin --------------------

// Force reseed data types from seed file
router.post('/admin/reseed', (req, res) => {
  try {
    const { adminSecret } = req.body;

    // Verify admin secret
    const expectedSecret = process.env.ADMIN_SECRET || 'copa-admin-2024';
    if (adminSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Invalid admin secret' });
    }

    const seedPath = getSeedDataPath();
    if (!fs.existsSync(seedPath)) {
      return res.status(404).json({ error: 'Seed data file not found' });
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    const dataFile = getDataTypesFile();

    // Force overwrite with seed data
    fs.writeFileSync(dataFile, JSON.stringify(seedData, null, 2));

    console.log(`Data types reseeded with ${seedData.dataTypes?.length || 0} data types`);

    res.json({
      success: true,
      message: `Reseeded data types`,
      dataTypes: seedData.dataTypes?.length || 0,
      properties: seedData.dataTypes?.reduce((sum, dt) => sum + (dt.properties?.length || 0), 0) || 0,
    });
  } catch (error) {
    console.error('Error reseeding data:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
