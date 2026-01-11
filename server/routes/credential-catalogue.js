/**
 * Credential Catalogue Routes
 *
 * API endpoints for managing imported external AnonCreds credentials
 * for verification testing.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOrbitApiConfig } from '../lib/orbitConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Storage paths
const getDataDir = () => {
  const assetsPath = process.env.ASSETS_PATH || path.join(__dirname, '..', 'assets');
  const credCatalogueDir = path.join(assetsPath, 'credential-catalogue');
  if (!fs.existsSync(credCatalogueDir)) {
    fs.mkdirSync(credCatalogueDir, { recursive: true });
  }
  return credCatalogueDir;
};

const getCredentialsFile = () => path.join(getDataDir(), 'credentials.json');
const getTagsFile = () => path.join(getDataDir(), 'tags.json');

/**
 * Ensure storage files exist
 */
const ensureStorage = () => {
  const credFile = getCredentialsFile();
  const tagsFile = getTagsFile();

  if (!fs.existsSync(credFile)) {
    fs.writeFileSync(credFile, '[]', 'utf-8');
  }
  if (!fs.existsSync(tagsFile)) {
    fs.writeFileSync(tagsFile, '[]', 'utf-8');
  }
};

/**
 * Read credentials from storage
 */
const readCredentials = () => {
  ensureStorage();
  return JSON.parse(fs.readFileSync(getCredentialsFile(), 'utf-8'));
};

/**
 * Write credentials to storage
 */
const writeCredentials = (credentials) => {
  ensureStorage();
  fs.writeFileSync(getCredentialsFile(), JSON.stringify(credentials, null, 2), 'utf-8');
};

/**
 * Read custom tags from storage
 */
const readTags = () => {
  ensureStorage();
  return JSON.parse(fs.readFileSync(getTagsFile(), 'utf-8'));
};

/**
 * Write custom tags to storage
 */
const writeTags = (tags) => {
  ensureStorage();
  fs.writeFileSync(getTagsFile(), JSON.stringify(tags, null, 2), 'utf-8');
};

// ============ Orbit Integration ============

/**
 * Register a schema with Orbit Credential Management API
 */
const registerSchemaWithOrbit = async (schemaData) => {
  const orbitConfig = getOrbitApiConfig('credentialMgmt');
  if (!orbitConfig) {
    throw new Error('Orbit Credential Management API not configured');
  }

  const { baseUrl, lobId, apiKey } = orbitConfig;

  // Prepare schema registration payload
  const payload = {
    schemaId: schemaData.schemaId,
    name: schemaData.name,
    version: schemaData.version,
    attributes: schemaData.attributes,
    issuerDid: schemaData.issuerDid,
  };

  console.log('[CredentialCatalogue] Registering schema with Orbit:', schemaData.schemaId);

  const response = await fetch(`${baseUrl}/api/schema/store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-lob-id': lobId,
      ...(apiKey && { 'x-api-key': apiKey }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CredentialCatalogue] Orbit schema registration failed:', response.status, errorText);
    throw new Error(`Failed to register schema with Orbit: ${response.status}`);
  }

  const result = await response.json();
  console.log('[CredentialCatalogue] Schema registered with Orbit:', result.id || result.schemaId);
  return result;
};

/**
 * Register a credential definition with Orbit Credential Management API
 */
const registerCredDefWithOrbit = async (credDefData, schemaId) => {
  const orbitConfig = getOrbitApiConfig('credentialMgmt');
  if (!orbitConfig) {
    throw new Error('Orbit Credential Management API not configured');
  }

  const { baseUrl, lobId, apiKey } = orbitConfig;

  // Prepare credential definition registration payload
  const payload = {
    credDefId: credDefData.credDefId,
    schemaId: schemaId,
    issuerDid: credDefData.issuerDid,
    tag: credDefData.tag || 'default',
    signatureType: credDefData.signatureType || 'CL',
  };

  console.log('[CredentialCatalogue] Registering credential definition with Orbit:', credDefData.credDefId);

  const response = await fetch(`${baseUrl}/api/credential-definition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-lob-id': lobId,
      ...(apiKey && { 'x-api-key': apiKey }),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CredentialCatalogue] Orbit cred def registration failed:', response.status, errorText);
    throw new Error(`Failed to register credential definition with Orbit: ${response.status}`);
  }

  const result = await response.json();
  console.log('[CredentialCatalogue] Credential definition registered with Orbit:', result.id || result.credDefId);
  return result;
};

/**
 * GET /api/credential-catalogue/orbit-status
 * Check if Orbit Credential Management API is configured
 */
router.get('/orbit-status', (req, res) => {
  try {
    const orbitConfig = getOrbitApiConfig('credentialMgmt');
    res.json({
      configured: !!orbitConfig?.baseUrl,
      hasCredentials: !!(orbitConfig?.lobId && orbitConfig?.apiKey),
    });
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to check Orbit status:', err);
    res.status(500).json({ error: 'Failed to check Orbit status' });
  }
});

// ============ Credential Endpoints ============

/**
 * GET /api/credential-catalogue
 * List all imported credentials
 */
router.get('/', (req, res) => {
  try {
    const credentials = readCredentials();
    res.json(credentials);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to list credentials:', err);
    res.status(500).json({ error: 'Failed to list credentials' });
  }
});

/**
 * GET /api/credential-catalogue/:id
 * Get a single credential by ID
 */
router.get('/:id', (req, res) => {
  try {
    const credentials = readCredentials();
    const credential = credentials.find((c) => c.id === req.params.id);

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    res.json(credential);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to get credential:', err);
    res.status(500).json({ error: 'Failed to get credential' });
  }
});

/**
 * POST /api/credential-catalogue
 * Import a new credential
 */
router.post('/', async (req, res) => {
  try {
    const {
      schemaData,
      credDefData,
      ecosystemTagId,
      issuerName,
      schemaSourceUrl,
      credDefSourceUrl,
      registerWithOrbit,
    } = req.body;

    // Validate required fields
    if (!schemaData || !credDefData || !ecosystemTagId) {
      return res.status(400).json({
        error: 'Missing required fields: schemaData, credDefData, ecosystemTagId',
      });
    }

    // Create credential record
    const credential = {
      id: uuidv4(),
      name: schemaData.name,
      version: schemaData.version,
      schemaId: schemaData.schemaId,
      credDefId: credDefData.credDefId,
      issuerDid: schemaData.issuerDid || credDefData.issuerDid,
      issuerName: issuerName || null,
      attributes: schemaData.attributes || [],
      ecosystemTag: ecosystemTagId,
      schemaSourceUrl: schemaSourceUrl,
      credDefSourceUrl: credDefSourceUrl,
      ledger: schemaData.ledger || credDefData.ledger,
      usageType: 'verification-only',
      importedAt: new Date().toISOString(),
      importedBy: req.session?.user?.email || req.session?.user?.login || 'unknown',
      orbitSchemaId: null,
      orbitCredDefId: null,
      orbitRegistrationError: null,
    };

    // Register with Orbit if requested
    if (registerWithOrbit) {
      try {
        // Register schema first
        const schemaResult = await registerSchemaWithOrbit(schemaData);
        credential.orbitSchemaId = schemaResult.id || schemaResult.schemaId || schemaData.schemaId;

        // Register credential definition
        const credDefResult = await registerCredDefWithOrbit(credDefData, schemaData.schemaId);
        credential.orbitCredDefId = credDefResult.id || credDefResult.credDefId || credDefData.credDefId;

        console.log('[CredentialCatalogue] Successfully registered with Orbit');
      } catch (orbitErr) {
        console.error('[CredentialCatalogue] Orbit registration failed:', orbitErr.message);
        // Store the error but still save the credential
        credential.orbitRegistrationError = orbitErr.message;
      }
    }

    // Save to storage
    const credentials = readCredentials();
    credentials.unshift(credential);
    writeCredentials(credentials);

    console.log('[CredentialCatalogue] Imported credential:', credential.name, credential.version);
    res.status(201).json(credential);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to import credential:', err);
    res.status(500).json({ error: 'Failed to import credential' });
  }
});

/**
 * DELETE /api/credential-catalogue/:id
 * Remove a credential from the catalogue
 */
router.delete('/:id', (req, res) => {
  try {
    const credentials = readCredentials();
    const index = credentials.findIndex((c) => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    credentials.splice(index, 1);
    writeCredentials(credentials);

    console.log('[CredentialCatalogue] Deleted credential:', req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to delete credential:', err);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

// ============ Import Parsing Endpoints ============

/**
 * Parse ledger name from IndyScan URL
 */
const parseLedgerFromUrl = (url) => {
  if (url.includes('candyscan.idlab.org')) {
    const match = url.match(/\/tx\/([^/]+)\//);
    if (match) {
      const network = match[1].toLowerCase();
      return `candy:${network.replace('candy_', '')}`;
    }
    return 'candy:dev';
  }

  if (url.includes('indyscan.io')) {
    const match = url.match(/\/txs\/([^/]+)\//);
    if (match) {
      const network = match[1].toLowerCase();
      return `sovrin:${network}`;
    }
    return 'sovrin:staging';
  }

  if (url.includes('bcovrin.vonx.io')) {
    if (url.includes('test.')) return 'bcovrin:test';
    if (url.includes('dev.')) return 'bcovrin:dev';
    return 'bcovrin:test';
  }

  return 'unknown';
};

/**
 * Parse schema data from fetched HTML
 */
const parseSchemaFromHtml = (html, sourceUrl) => {
  const result = {
    name: null,
    version: null,
    schemaId: null,
    issuerDid: null,
    attributes: [],
    ledger: parseLedgerFromUrl(sourceUrl),
    seqNo: null,
  };

  // Look for schema ID pattern (DID:2:name:version format)
  const schemaIdMatch = html.match(/([A-Za-z0-9]{21,}):2:([^:]+):([0-9.]+)/);
  if (schemaIdMatch) {
    result.schemaId = schemaIdMatch[0];
    result.issuerDid = schemaIdMatch[1];
    result.name = schemaIdMatch[2];
    result.version = schemaIdMatch[3];
  }

  // Extract attributes from attr_names pattern
  const attrMatch = html.match(/attr_names[:\s]*\[([^\]]+)\]/i);
  if (attrMatch) {
    const attrs = attrMatch[1].match(/["']([^"']+)["']/g);
    if (attrs) {
      result.attributes = attrs.map((a) => a.replace(/["']/g, ''));
    }
  }

  // Extract sequence number from URL if not found
  const seqMatch = sourceUrl.match(/\/domain\/(\d+)/);
  if (seqMatch) {
    result.seqNo = parseInt(seqMatch[1], 10);
  }

  return result;
};

/**
 * Parse credential definition data from fetched HTML
 */
const parseCredDefFromHtml = (html, sourceUrl) => {
  const result = {
    credDefId: null,
    schemaId: null,
    issuerDid: null,
    tag: 'default',
    signatureType: 'CL',
    ledger: parseLedgerFromUrl(sourceUrl),
    seqNo: null,
  };

  // Look for credential definition ID pattern (DID:3:CL:schemaSeqNo:tag format)
  const credDefIdMatch = html.match(/([A-Za-z0-9]{21,}):3:CL:(\d+):([A-Za-z0-9_-]+)/);
  if (credDefIdMatch) {
    result.credDefId = credDefIdMatch[0];
    result.issuerDid = credDefIdMatch[1];
    result.tag = credDefIdMatch[3];
  }

  // Look for schema ID in page
  const schemaIdMatch = html.match(/([A-Za-z0-9]{21,}):2:([^:]+):([0-9.]+)/);
  if (schemaIdMatch) {
    result.schemaId = schemaIdMatch[0];
  }

  // Extract sequence number from URL
  const seqMatch = sourceUrl.match(/\/domain\/(\d+)/);
  if (seqMatch) {
    result.seqNo = parseInt(seqMatch[1], 10);
  }

  return result;
};

/**
 * POST /api/credential-catalogue/import/schema
 * Parse an IndyScan schema URL
 */
router.post('/import/schema', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('[CredentialCatalogue] Parsing schema URL:', url);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CredentialCatalogue/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const schemaData = parseSchemaFromHtml(html, url);

    if (!schemaData.name || !schemaData.version) {
      return res.status(400).json({
        error: 'Could not parse schema name and version from page. Please check the URL.',
      });
    }

    res.json(schemaData);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to parse schema URL:', err);
    res.status(400).json({ error: err.message || 'Failed to parse schema URL' });
  }
});

/**
 * POST /api/credential-catalogue/import/creddef
 * Parse an IndyScan credential definition URL
 */
router.post('/import/creddef', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('[CredentialCatalogue] Parsing credential definition URL:', url);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CredentialCatalogue/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const credDefData = parseCredDefFromHtml(html, url);

    if (!credDefData.credDefId) {
      return res.status(400).json({
        error: 'Could not parse credential definition ID from page. Please check the URL.',
      });
    }

    res.json(credDefData);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to parse credential definition URL:', err);
    res.status(400).json({ error: err.message || 'Failed to parse credential definition URL' });
  }
});

// ============ Tag Endpoints ============

/**
 * GET /api/credential-catalogue/tags
 * List custom ecosystem tags
 */
router.get('/tags', (req, res) => {
  try {
    const tags = readTags();
    res.json(tags);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to list tags:', err);
    res.status(500).json({ error: 'Failed to list tags' });
  }
});

/**
 * POST /api/credential-catalogue/tags
 * Add a custom ecosystem tag
 */
router.post('/tags', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tag = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      isPredefined: false,
    };

    const tags = readTags();

    // Check for duplicates
    if (tags.some((t) => t.id === tag.id)) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    tags.push(tag);
    writeTags(tags);

    console.log('[CredentialCatalogue] Added custom tag:', tag.name);
    res.status(201).json(tag);
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to add tag:', err);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

/**
 * DELETE /api/credential-catalogue/tags/:id
 * Remove a custom ecosystem tag
 */
router.delete('/tags/:id', (req, res) => {
  try {
    const tags = readTags();
    const index = tags.findIndex((t) => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    tags.splice(index, 1);
    writeTags(tags);

    console.log('[CredentialCatalogue] Deleted tag:', req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[CredentialCatalogue] Failed to delete tag:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
