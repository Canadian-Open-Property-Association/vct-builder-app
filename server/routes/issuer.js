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
import {
  getOrbitConfig,
  getOrbitApiConfig,
  isOrbitConfigured,
  isApiConfigured,
  getOrbitConfigStatus,
} from '../lib/orbitConfig.js';

const router = express.Router();

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
 * Middleware to check Orbit Issuer API configuration
 */
const requireOrbit = (req, res, next) => {
  if (!isApiConfigured('issuer')) {
    return res.status(503).json({
      error: 'Issuer API not configured',
      message: 'Please configure the Issuer API Base URL in Settings.',
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
 * Check Orbit Issuer API connection status
 */
router.get('/orbit/status', requireAuth, (req, res) => {
  const issuerConfig = getOrbitApiConfig('issuer');
  const status = getOrbitConfigStatus();
  res.json({
    baseUrl: issuerConfig?.baseUrl || null,
    lobId: status.lobId,
    connected: isApiConfigured('issuer'),
    source: status.source,
  });
});

/**
 * GET /api/issuer/catalog
 * List all credential schemas in the catalog
 */
router.get('/catalog', requireAuth, (req, res) => {
  if (!isApiConfigured('issuer')) {
    return res.status(503).json({
      error: 'Issuer API not configured',
      message: 'Test Issuer requires the Issuer API to be configured in Settings.',
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

    // In a real implementation, this would call the Orbit Issuer API
    // For demo, we create a mock offer with a QR code placeholder
    const issuerConfig = getOrbitApiConfig('issuer');
    const offerUrl = `${issuerConfig.baseUrl}/offers/${offerId}`;
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
 * POST /api/issuer/offers/catalogue
 * Create a credential offer from a Catalogue credential
 * Uses the cloned credential definition for issuance via Orbit
 */
router.post('/offers/catalogue', requireAuth, requireOrbit, async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    const { catalogueCredentialId, credentialId, credAttributes, socketSessionId } = req.body;

    if (!catalogueCredentialId || !credentialId) {
      return res.status(400).json({
        error: 'catalogueCredentialId and credentialId are required',
      });
    }

    if (!credAttributes || typeof credAttributes !== 'object') {
      return res.status(400).json({ error: 'credAttributes is required' });
    }

    const issuerConfig = getOrbitApiConfig('issuer');

    if (!issuerConfig || !issuerConfig.baseUrl || !issuerConfig.lobId) {
      return res.status(503).json({
        error: 'Issuer API not properly configured',
        message: 'Please configure the Issuer API with Base URL and LOB ID in Settings.',
      });
    }

    // Normalize baseUrl to remove trailing slashes
    const normalizedBaseUrl = issuerConfig.baseUrl.replace(/\/+$/, '');

    // Prepare credential offer payload per Orbit Issuer API spec
    const payload = {
      credentialId: credentialId,
      credAttributes: credAttributes,
      comment: 'Credential offer from Test Issuer',
      messageProtocol: 'AIP2_0',
      credAutoIssue: true,
      ...(socketSessionId && { socketSessionId }),
    };

    const url = `${normalizedBaseUrl}/api/lob/${issuerConfig.lobId}/credential/offer`;
    const headers = {
      'Content-Type': 'application/json',
      ...(issuerConfig.apiKey && { 'api-key': issuerConfig.apiKey }),
    };

    console.log('[Issuer] Creating credential offer:');
    console.log('[Issuer]   URL:', url);
    console.log('[Issuer]   Credential ID:', credentialId);
    console.log('[Issuer]   Attributes:', Object.keys(credAttributes).length);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = {};
    }

    if (!response.ok) {
      console.error('[Issuer] Credential offer failed:', response.status, responseText);
      return res.status(response.status).json({
        error: result.message || result.error || 'Failed to create credential offer',
        apiDetails: {
          message: result.message || result.error || 'Failed to create credential offer',
          timestamp,
          requestUrl: url,
          requestMethod: 'POST',
          requestPayload: payload,
          statusCode: response.status,
          responseBody: responseText,
        },
      });
    }

    console.log('[Issuer] Credential offer created successfully');
    console.log('[Issuer]   Offer ID:', result.data?.credOfferId);
    console.log('[Issuer]   Short URL:', result.data?.shortUrl);

    // Store offer locally for tracking
    const offerId = result.data?.credOfferId || crypto.randomUUID();
    const now = new Date();
    const offer = {
      id: offerId,
      userId: req.user.githubUserId,
      catalogueCredentialId,
      credentialId,
      credAttributes,
      status: 'pending',
      shortUrl: result.data?.shortUrl,
      longUrl: result.data?.longUrl,
      orbitOfferId: result.data?.credOfferId,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    credentialOffers.set(offerId, offer);

    res.status(201).json({
      offerId: offer.id,
      credOfferId: result.data?.credOfferId,
      shortUrl: result.data?.shortUrl,
      longUrl: result.data?.longUrl,
      status: 'pending',
      expiresAt: offer.expiresAt,
      // Include success API details for debugging purposes
      apiDetails: {
        message: 'Credential offer created successfully',
        timestamp,
        requestUrl: url,
        requestMethod: 'POST',
        requestPayload: payload,
        statusCode: response.status,
        responseBody: responseText,
      },
    });
  } catch (error) {
    console.error('[Issuer] Error creating catalogue offer:', error);
    res.status(500).json({
      error: 'Failed to create credential offer',
      message: error.message,
      apiDetails: {
        message: error.message,
        timestamp,
        requestUrl: 'Unknown (error occurred before request)',
        requestMethod: 'POST',
        statusCode: 500,
        responseBody: error.stack || error.message,
      },
    });
  }
});

/**
 * POST /api/issuer/offers/prepare
 * Prepare a credential offer URL for QR code display
 * Uses Orbit's prepare-url-offer endpoint for the two-step issuance flow:
 * 1. prepare-url-offer → get shortUrl for QR code
 * 2. Display QR, holder scans
 * 3. Socket events notify of status changes (offer-received, credential-accepted, done)
 */
router.post('/offers/prepare', requireAuth, requireOrbit, async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    const { credentialId, credAttributes, socketSessionId } = req.body;

    if (!credentialId) {
      return res.status(400).json({
        error: 'credentialId is required',
      });
    }

    if (!credAttributes || typeof credAttributes !== 'object') {
      return res.status(400).json({ error: 'credAttributes is required' });
    }

    const issuerConfig = getOrbitApiConfig('issuer');

    if (!issuerConfig || !issuerConfig.baseUrl || !issuerConfig.lobId) {
      return res.status(503).json({
        error: 'Issuer API not properly configured',
        message: 'Please configure the Issuer API with Base URL and LOB ID in Settings.',
      });
    }

    // Normalize baseUrl to remove trailing slashes
    const normalizedBaseUrl = issuerConfig.baseUrl.replace(/\/+$/, '');

    // Prepare credential offer payload per Orbit Issuer API spec
    const payload = {
      credentialId: credentialId,
      credAttributes: credAttributes,
      comment: 'Credential offer from Test Issuer',
      messageProtocol: 'AIP2_0',
      credAutoIssue: true,
      ...(socketSessionId && { socketSessionId }),
    };

    // Use prepare-url-offer endpoint for QR code generation
    const url = `${normalizedBaseUrl}/api/lob/${issuerConfig.lobId}/prepare-url-offer`;
    const headers = {
      'Content-Type': 'application/json',
      ...(issuerConfig.apiKey && { 'api-key': issuerConfig.apiKey }),
    };

    console.log('[Issuer] Preparing credential offer URL:');
    console.log('[Issuer]   URL:', url);
    console.log('[Issuer]   Credential ID:', credentialId);
    console.log('[Issuer]   Socket Session:', socketSessionId || 'none');
    console.log('[Issuer]   Attributes:', Object.keys(credAttributes).length);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = {};
    }

    if (!response.ok) {
      console.error('[Issuer] Prepare offer failed:', response.status, responseText);
      return res.status(response.status).json({
        error: result.message || result.error || 'Failed to prepare credential offer',
        apiDetails: {
          message: result.message || result.error || 'Failed to prepare credential offer',
          timestamp,
          requestUrl: url,
          requestMethod: 'POST',
          requestPayload: payload,
          statusCode: response.status,
          responseBody: responseText,
        },
      });
    }

    console.log('[Issuer] Credential offer prepared successfully');
    console.log('[Issuer]   Offer ID:', result.data?.credOfferId);
    console.log('[Issuer]   Short URL:', result.data?.shortUrl);

    // Store offer locally for tracking
    const offerId = result.data?.credOfferId || crypto.randomUUID();
    const now = new Date();
    const offer = {
      id: offerId,
      userId: req.user.githubUserId,
      credentialId,
      credAttributes,
      status: 'pending',
      shortUrl: result.data?.shortUrl,
      longUrl: result.data?.longUrl,
      orbitOfferId: result.data?.credOfferId,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    credentialOffers.set(offerId, offer);

    res.status(201).json({
      offerId: offer.id,
      credOfferId: result.data?.credOfferId,
      shortUrl: result.data?.shortUrl,
      longUrl: result.data?.longUrl,
      status: 'pending',
      expiresAt: offer.expiresAt,
      apiDetails: {
        message: 'Credential offer prepared successfully',
        timestamp,
        requestUrl: url,
        requestMethod: 'POST',
        requestPayload: payload,
        statusCode: response.status,
        responseBody: responseText,
      },
    });
  } catch (error) {
    console.error('[Issuer] Error preparing offer:', error);
    res.status(500).json({
      error: 'Failed to prepare credential offer',
      message: error.message,
      apiDetails: {
        message: error.message,
        timestamp,
        requestUrl: 'Unknown (error occurred before request)',
        requestMethod: 'POST',
        statusCode: 500,
        responseBody: error.stack || error.message,
      },
    });
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
