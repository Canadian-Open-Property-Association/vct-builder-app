/**
 * Test Issuer API Routes
 *
 * API routes for the Test Issuer app.
 * Handles credential catalog management and credential offer issuance.
 * Integrates with Orbit LOB for actual credential issuance.
 */

import express from 'express';
import crypto from 'crypto';
import { getDb, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// Orbit LOB configuration from environment
const ORBIT_BASE_URL = process.env.ORBIT_BASE_URL;
const ORBIT_TENANT_ID = process.env.ORBIT_TENANT_ID;
const ORBIT_API_KEY = process.env.ORBIT_API_KEY;

/**
 * Check if Orbit is configured
 */
const isOrbitConfigured = () => {
  return !!(ORBIT_BASE_URL && ORBIT_TENANT_ID);
};

/**
 * Get current user from session (COPA GitHub OAuth)
 */
const getCurrentUser = (req) => {
  if (req.session && req.session.user) {
    return {
      githubUserId: String(req.session.user.id),
      githubUsername: req.session.user.login,
    };
  }
  return null;
};

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = user;
  next();
};

/**
 * Middleware to check Orbit configuration
 */
const requireOrbit = (req, res, next) => {
  if (!isOrbitConfigured()) {
    return res.status(503).json({
      error: 'Orbit LOB not configured',
      message: 'Please configure ORBIT_BASE_URL and ORBIT_TENANT_ID environment variables.',
    });
  }
  next();
};

// In-memory storage for demo purposes
// In production, use database tables
const credentialCatalog = new Map();
const credentialOffers = new Map();

/**
 * GET /api/issuer/orbit/status
 * Check Orbit LOB connection status
 */
router.get('/orbit/status', requireAuth, (req, res) => {
  res.json({
    baseUrl: ORBIT_BASE_URL || '',
    tenantId: ORBIT_TENANT_ID || '',
    connected: isOrbitConfigured(),
  });
});

/**
 * GET /api/issuer/catalog
 * List all credential schemas in the catalog
 */
router.get('/catalog', requireAuth, (req, res) => {
  if (!isOrbitConfigured()) {
    return res.status(503).json({
      error: 'Orbit LOB not configured',
      message: 'Test Issuer requires Orbit LOB to be configured.',
    });
  }

  const userId = req.user.githubUserId;
  const userCatalog = [];

  for (const [id, entry] of credentialCatalog.entries()) {
    if (entry.userId === userId) {
      userCatalog.push({
        id,
        name: entry.name,
        description: entry.description,
        schemaUri: entry.schemaUri,
        vctUri: entry.vctUri,
        category: entry.category,
        importedAt: entry.importedAt,
      });
    }
  }

  // Sort by import date, newest first
  userCatalog.sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt));

  res.json(userCatalog);
});

/**
 * POST /api/issuer/catalog/import
 * Import a schema from the VDR
 */
router.post('/catalog/import', requireAuth, requireOrbit, async (req, res) => {
  try {
    const { schemaUri, vctUri } = req.body;

    if (!schemaUri) {
      return res.status(400).json({ error: 'Schema URI is required' });
    }

    // Fetch the schema
    let schemaData;
    try {
      const response = await fetch(schemaUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.status}`);
      }
      schemaData = await response.json();
    } catch (fetchError) {
      return res.status(400).json({
        error: 'Failed to fetch schema',
        message: fetchError.message,
      });
    }

    // Extract schema properties
    const properties = [];
    const requiredProps = schemaData.required || [];

    if (schemaData.properties) {
      for (const [name, prop] of Object.entries(schemaData.properties)) {
        // Skip internal properties
        if (name.startsWith('$') || name === '@context' || name === 'type' || name === 'id') {
          continue;
        }

        properties.push({
          name,
          type: prop.type || 'string',
          format: prop.format,
          description: prop.description,
          enum: prop.enum,
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          minimum: prop.minimum,
          maximum: prop.maximum,
          pattern: prop.pattern,
          required: requiredProps.includes(name),
        });
      }
    }

    // Create catalog entry
    const id = crypto.randomUUID();
    const entry = {
      id,
      userId: req.user.githubUserId,
      name: schemaData.title || schemaData.$id || 'Unnamed Schema',
      description: schemaData.description || '',
      schemaUri,
      vctUri: vctUri || null,
      category: guessCategory(schemaData),
      properties,
      requiredProperties: requiredProps,
      rawSchema: schemaData,
      importedAt: new Date().toISOString(),
    };

    credentialCatalog.set(id, entry);

    res.status(201).json({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      schemaUri: entry.schemaUri,
      vctUri: entry.vctUri,
      category: entry.category,
      importedAt: entry.importedAt,
    });
  } catch (error) {
    console.error('Error importing schema:', error);
    res.status(500).json({ error: 'Failed to import schema' });
  }
});

/**
 * GET /api/issuer/catalog/:id/schema
 * Get full schema details for a catalog entry
 */
router.get('/catalog/:id/schema', requireAuth, (req, res) => {
  const { id } = req.params;
  const entry = credentialCatalog.get(id);

  if (!entry) {
    return res.status(404).json({ error: 'Catalog entry not found' });
  }

  if (entry.userId !== req.user.githubUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    schemaUri: entry.schemaUri,
    vctUri: entry.vctUri,
    properties: entry.properties,
    requiredProperties: entry.requiredProperties,
    category: entry.category,
  });
});

/**
 * DELETE /api/issuer/catalog/:id
 * Remove a schema from the catalog
 */
router.delete('/catalog/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const entry = credentialCatalog.get(id);

  if (!entry) {
    return res.status(404).json({ error: 'Catalog entry not found' });
  }

  if (entry.userId !== req.user.githubUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  credentialCatalog.delete(id);
  res.json({ success: true });
});

/**
 * GET /api/issuer/offers
 * List credential offers for the current user
 */
router.get('/offers', requireAuth, (req, res) => {
  const userId = req.user.githubUserId;
  const userOffers = [];

  for (const [id, offer] of credentialOffers.entries()) {
    if (offer.userId === userId) {
      userOffers.push({
        id,
        schemaId: offer.schemaId,
        schemaName: offer.schemaName,
        credentialData: offer.credentialData,
        status: offer.status,
        qrCodeUrl: offer.qrCodeUrl,
        offerUrl: offer.offerUrl,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        claimedAt: offer.claimedAt,
        errorMessage: offer.errorMessage,
      });
    }
  }

  // Sort by creation date, newest first
  userOffers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(userOffers);
});

/**
 * POST /api/issuer/offers
 * Create a new credential offer
 */
router.post('/offers', requireAuth, requireOrbit, async (req, res) => {
  try {
    const { schemaId, credentialData, expiresInMinutes = 15 } = req.body;

    if (!schemaId) {
      return res.status(400).json({ error: 'Schema ID is required' });
    }

    if (!credentialData || typeof credentialData !== 'object') {
      return res.status(400).json({ error: 'Credential data is required' });
    }

    // Get schema from catalog
    const catalogEntry = credentialCatalog.get(schemaId);
    if (!catalogEntry) {
      return res.status(404).json({ error: 'Schema not found in catalog' });
    }

    if (catalogEntry.userId !== req.user.githubUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create offer
    const offerId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

    // In a real implementation, this would call the Orbit LOB API
    // For demo, we create a mock offer with a QR code placeholder
    const offerUrl = `${ORBIT_BASE_URL}/offers/${offerId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(offerUrl)}`;

    const offer = {
      id: offerId,
      userId: req.user.githubUserId,
      schemaId,
      schemaName: catalogEntry.name,
      credentialData,
      status: 'pending',
      qrCodeUrl,
      offerUrl,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      claimedAt: null,
      errorMessage: null,
    };

    credentialOffers.set(offerId, offer);

    // Set up expiration timer
    setTimeout(() => {
      const existingOffer = credentialOffers.get(offerId);
      if (existingOffer && existingOffer.status === 'pending') {
        existingOffer.status = 'expired';
        existingOffer.updatedAt = new Date().toISOString();
      }
    }, expiresInMinutes * 60 * 1000);

    res.status(201).json({
      id: offer.id,
      schemaId: offer.schemaId,
      schemaName: offer.schemaName,
      credentialData: offer.credentialData,
      status: offer.status,
      qrCodeUrl: offer.qrCodeUrl,
      offerUrl: offer.offerUrl,
      expiresAt: offer.expiresAt,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create credential offer' });
  }
});

/**
 * GET /api/issuer/offers/:id
 * Get a single offer with its current status
 */
router.get('/offers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const offer = credentialOffers.get(id);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.userId !== req.user.githubUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if expired
  if (offer.status === 'pending' && new Date() > new Date(offer.expiresAt)) {
    offer.status = 'expired';
    offer.updatedAt = new Date().toISOString();
  }

  res.json({
    id: offer.id,
    schemaId: offer.schemaId,
    schemaName: offer.schemaName,
    credentialData: offer.credentialData,
    status: offer.status,
    qrCodeUrl: offer.qrCodeUrl,
    offerUrl: offer.offerUrl,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    claimedAt: offer.claimedAt,
    errorMessage: offer.errorMessage,
  });
});

/**
 * DELETE /api/issuer/offers/:id
 * Cancel a pending offer
 */
router.delete('/offers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const offer = credentialOffers.get(id);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.userId !== req.user.githubUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Can only cancel pending offers
  if (offer.status !== 'pending') {
    return res.status(400).json({ error: 'Can only cancel pending offers' });
  }

  credentialOffers.delete(id);
  res.json({ success: true });
});

/**
 * POST /api/issuer/offers/:id/simulate-claim
 * Simulate a wallet claiming the credential (for testing)
 */
router.post('/offers/:id/simulate-claim', requireAuth, (req, res) => {
  const { id } = req.params;
  const offer = credentialOffers.get(id);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.userId !== req.user.githubUserId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (offer.status !== 'pending' && offer.status !== 'scanned') {
    return res.status(400).json({ error: 'Offer is not in a claimable state' });
  }

  // Simulate successful claim
  offer.status = 'claimed';
  offer.claimedAt = new Date().toISOString();
  offer.updatedAt = new Date().toISOString();

  res.json({
    id: offer.id,
    status: offer.status,
    claimedAt: offer.claimedAt,
  });
});

/**
 * Guess credential category from schema
 */
function guessCategory(schema) {
  const text = JSON.stringify(schema).toLowerCase();

  if (text.includes('identity') || text.includes('passport') || text.includes('license')) {
    return 'identity';
  }
  if (text.includes('income') || text.includes('bank') || text.includes('financial')) {
    return 'financial';
  }
  if (text.includes('employ') || text.includes('job') || text.includes('work')) {
    return 'employment';
  }
  if (text.includes('degree') || text.includes('diploma') || text.includes('education')) {
    return 'education';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('vaccine')) {
    return 'healthcare';
  }
  if (text.includes('government') || text.includes('citizen')) {
    return 'government';
  }
  if (text.includes('member') || text.includes('subscription')) {
    return 'membership';
  }
  if (text.includes('property') || text.includes('real estate') || text.includes('address')) {
    return 'property';
  }

  return 'other';
}

export default router;
