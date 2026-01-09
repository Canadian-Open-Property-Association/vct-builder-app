/**
 * Orbit Configuration Helper
 *
 * Manages Orbit LOB credentials with support for:
 * 1. File-based storage (persistent, UI-configurable)
 * 2. Environment variables (fallback)
 *
 * API keys are encrypted at rest using AES-256-GCM.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = 'orbit-settings.json';
const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment or use default for dev
// In production, ORBIT_ENCRYPTION_KEY should be set
function getEncryptionKey() {
  const key = process.env.ORBIT_ENCRYPTION_KEY || 'copa-dev-encryption-key-32bytes!';
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
}

// Get assets path for persistent storage
function getAssetsPath() {
  return process.env.ASSETS_PATH || path.join(process.cwd(), 'server', 'assets');
}

// Get full path to settings file
function getSettingsFilePath() {
  return path.join(getAssetsPath(), SETTINGS_FILE);
}

/**
 * Encrypt a string value
 */
function encrypt(text) {
  if (!text) return null;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted,
  };
}

/**
 * Decrypt an encrypted value
 */
function decrypt(encrypted) {
  if (!encrypted || !encrypted.data) return null;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt Orbit API key:', error.message);
    return null;
  }
}

/**
 * Read config from file storage
 */
function readFileConfig() {
  try {
    const filePath = getSettingsFilePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Decrypt API key if present
    if (data.apiKeyEncrypted) {
      data.apiKey = decrypt(data.apiKeyEncrypted);
      delete data.apiKeyEncrypted;
    }

    return data;
  } catch (error) {
    console.error('Failed to read Orbit config file:', error.message);
    return null;
  }
}

/**
 * Read config from environment variables
 */
function readEnvConfig() {
  const baseUrl = process.env.ORBIT_BASE_URL;
  const tenantId = process.env.ORBIT_TENANT_ID;
  const apiKey = process.env.ORBIT_API_KEY;

  if (!baseUrl && !tenantId) {
    return null;
  }

  return {
    baseUrl: baseUrl || '',
    tenantId: tenantId || '',
    apiKey: apiKey || '',
    source: 'environment',
  };
}

/**
 * Get Orbit configuration
 * Priority: File storage > Environment variables
 *
 * @returns {Object|null} Config object with baseUrl, tenantId, apiKey, or null
 */
export function getOrbitConfig() {
  // Try file storage first
  const fileConfig = readFileConfig();
  if (fileConfig && fileConfig.baseUrl && fileConfig.tenantId) {
    return {
      ...fileConfig,
      source: 'file',
    };
  }

  // Fall back to environment variables
  const envConfig = readEnvConfig();
  if (envConfig && envConfig.baseUrl && envConfig.tenantId) {
    return envConfig;
  }

  return null;
}

/**
 * Save Orbit configuration to file storage
 *
 * @param {Object} config - Config with baseUrl, tenantId, apiKey
 * @param {string} configuredBy - Username of who made the change
 * @returns {Object} Saved config (without decrypted apiKey)
 */
export function saveOrbitConfig(config, configuredBy = 'unknown') {
  const assetsPath = getAssetsPath();

  // Ensure assets directory exists
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  const dataToSave = {
    baseUrl: config.baseUrl || '',
    tenantId: config.tenantId || '',
    configuredAt: new Date().toISOString(),
    configuredBy,
  };

  // Encrypt API key before saving
  if (config.apiKey) {
    dataToSave.apiKeyEncrypted = encrypt(config.apiKey);
  }

  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

  console.log(`Orbit config saved by ${configuredBy}`);

  return {
    baseUrl: dataToSave.baseUrl,
    tenantId: dataToSave.tenantId,
    configuredAt: dataToSave.configuredAt,
    configuredBy: dataToSave.configuredBy,
    hasApiKey: !!config.apiKey,
    source: 'file',
  };
}

/**
 * Delete file-based config (revert to env vars)
 */
export function deleteOrbitConfig() {
  try {
    const filePath = getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Orbit config file deleted');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete Orbit config:', error.message);
    return false;
  }
}

/**
 * Check if Orbit is configured
 *
 * @returns {boolean} True if baseUrl and tenantId are set
 */
export function isOrbitConfigured() {
  const config = getOrbitConfig();
  return !!(config?.baseUrl && config?.tenantId);
}

/**
 * Get config status for API response (safe - no API key)
 */
export function getOrbitConfigStatus() {
  const config = getOrbitConfig();

  if (!config) {
    return {
      configured: false,
      baseUrl: '',
      tenantId: '',
      hasApiKey: false,
      source: null,
      configuredAt: null,
      configuredBy: null,
    };
  }

  return {
    configured: !!(config.baseUrl && config.tenantId),
    baseUrl: config.baseUrl || '',
    tenantId: config.tenantId || '',
    hasApiKey: !!config.apiKey,
    source: config.source,
    configuredAt: config.configuredAt || null,
    configuredBy: config.configuredBy || null,
  };
}

/**
 * Test connection to Orbit API
 *
 * @param {Object} config - Config with baseUrl, tenantId, apiKey
 * @returns {Promise<Object>} Result with success boolean and message
 */
export async function testOrbitConnection(config) {
  if (!config.baseUrl || !config.tenantId) {
    return {
      success: false,
      message: 'Base URL and Tenant ID are required',
    };
  }

  try {
    // Try to reach the Orbit API health endpoint
    const url = new URL('/api/health', config.baseUrl).toString();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Successfully connected to Orbit',
      };
    }

    // Check for common error codes
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Authentication failed - check API key',
      };
    }

    if (response.status === 404) {
      // Health endpoint might not exist, try to check base URL
      return {
        success: true,
        message: 'Connected (health endpoint not available)',
      };
    }

    return {
      success: false,
      message: `Orbit returned status ${response.status}`,
    };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        success: false,
        message: 'Connection timeout - check Base URL',
      };
    }

    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    };
  }
}
