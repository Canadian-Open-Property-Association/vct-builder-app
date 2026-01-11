/**
 * Orbit Configuration Helper
 *
 * Manages Orbit credentials and API configurations with support for:
 * 1. Shared credentials (LOB ID + API Key) across all APIs
 * 2. Per-API Base URLs (LOB, RegisterSocket, Connection, Holder, Verifier, Issuer, Chat)
 * 3. File-based storage (persistent, UI-configurable)
 * 4. Environment variables (fallback)
 *
 * API keys are encrypted at rest using AES-256-GCM.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = 'orbit-settings.json';
const ALGORITHM = 'aes-256-gcm';

// Valid API types
const VALID_API_TYPES = ['lob', 'registerSocket', 'connection', 'holder', 'verifier', 'issuer', 'chat'];

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
 * Default settings for each API type
 * Only verifier has settings for MVP
 */
const DEFAULT_API_SETTINGS = {
  verifier: { autoVerify: true },
  issuer: {},
  lob: {},
  registerSocket: {},
  connection: {},
  holder: {},
  chat: {},
};

/**
 * Get empty APIs config structure
 */
function getEmptyApisConfig() {
  return {
    lob: { baseUrl: '', settings: {} },
    registerSocket: { baseUrl: '', settings: {} },
    connection: { baseUrl: '', settings: {} },
    holder: { baseUrl: '', settings: {} },
    verifier: { baseUrl: '', settings: {} },
    issuer: { baseUrl: '', settings: {} },
    chat: { baseUrl: '', settings: {} },
  };
}

/**
 * Migrate old config format to new multi-API format
 * Old: { baseUrl, tenantId, apiKeyEncrypted }
 * New: { lobId, apiKeyEncrypted, apis: { lob: { baseUrl, settings }, ... } }
 */
function migrateConfig(oldConfig) {
  let needsMigration = false;

  // Check if migration is needed (old format has tenantId or baseUrl at root level)
  if (oldConfig.tenantId !== undefined || (oldConfig.baseUrl !== undefined && !oldConfig.apis)) {
    console.log('Migrating Orbit config from old format to new multi-API format');
    needsMigration = true;

    const migrated = {
      lobId: oldConfig.tenantId || oldConfig.lobId || '',
      apiKeyEncrypted: oldConfig.apiKeyEncrypted || null,
      apis: getEmptyApisConfig(),
      configuredAt: oldConfig.configuredAt || new Date().toISOString(),
      configuredBy: oldConfig.configuredBy || 'migration',
    };

    // Move old baseUrl to lob API
    if (oldConfig.baseUrl) {
      migrated.apis.lob.baseUrl = oldConfig.baseUrl;
    }

    return migrated;
  }

  // Check if settings migration is needed (apis exist but without settings)
  if (oldConfig.apis) {
    for (const apiType of VALID_API_TYPES) {
      const api = oldConfig.apis[apiType];
      if (api && api.settings === undefined) {
        needsMigration = true;
        break;
      }
    }

    if (needsMigration) {
      console.log('Migrating Orbit config to add per-API settings');
      const migrated = { ...oldConfig };
      for (const apiType of VALID_API_TYPES) {
        if (migrated.apis[apiType]) {
          migrated.apis[apiType] = {
            baseUrl: migrated.apis[apiType].baseUrl || '',
            settings: migrated.apis[apiType].settings || {},
          };
        } else {
          migrated.apis[apiType] = { baseUrl: '', settings: {} };
        }
      }
      return migrated;
    }
  }

  // Already in new format
  return oldConfig;
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

    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Migrate if needed
    const migrated = migrateConfig(data);
    if (migrated !== data) {
      // Save migrated config
      fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2));
      data = migrated;
    }

    // Decrypt API key if present
    if (data.apiKeyEncrypted) {
      data.apiKey = decrypt(data.apiKeyEncrypted);
    }

    // Ensure apis object exists
    if (!data.apis) {
      data.apis = getEmptyApisConfig();
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
  const lobId = process.env.ORBIT_LOB_ID || process.env.ORBIT_TENANT_ID;
  const apiKey = process.env.ORBIT_API_KEY;
  const baseUrl = process.env.ORBIT_BASE_URL;

  if (!lobId && !baseUrl) {
    return null;
  }

  return {
    lobId: lobId || '',
    apiKey: apiKey || '',
    apis: {
      lob: { baseUrl: baseUrl || '' },
      registerSocket: { baseUrl: '' },
      connection: { baseUrl: '' },
      holder: { baseUrl: '' },
      verifier: { baseUrl: '' },
      issuer: { baseUrl: '' },
      chat: { baseUrl: '' },
    },
    source: 'environment',
  };
}

/**
 * Get full Orbit configuration
 * Priority: File storage > Environment variables
 *
 * @returns {Object|null} Config object with lobId, apiKey, apis, or null
 */
export function getOrbitConfig() {
  // Try file storage first
  const fileConfig = readFileConfig();

  // Check if file config has any meaningful data (lobId OR any API baseUrls)
  const hasFileConfig = fileConfig && (
    fileConfig.lobId ||
    (fileConfig.apis && Object.values(fileConfig.apis).some(api => api?.baseUrl))
  );

  if (hasFileConfig) {
    return {
      ...fileConfig,
      source: 'file',
    };
  }

  // Fall back to environment variables
  const envConfig = readEnvConfig();
  if (envConfig && (envConfig.lobId || envConfig.apis?.lob?.baseUrl)) {
    return envConfig;
  }

  return null;
}

/**
 * Get configuration for a specific API
 * Used by consumer apps (e.g., Test Issuer uses 'issuer' API)
 *
 * @param {string} apiType - One of: lob, registerSocket, connection, holder, verifier, issuer, chat
 * @returns {Object|null} Config with baseUrl, lobId, apiKey, settings or null if not configured
 */
export function getOrbitApiConfig(apiType) {
  if (!VALID_API_TYPES.includes(apiType)) {
    console.error(`Invalid API type: ${apiType}`);
    return null;
  }

  const config = getOrbitConfig();
  if (!config) return null;

  const apiConfig = config.apis?.[apiType];
  if (!apiConfig?.baseUrl) return null;

  // Merge default settings with saved settings
  const defaultSettings = DEFAULT_API_SETTINGS[apiType] || {};
  const savedSettings = apiConfig.settings || {};

  return {
    baseUrl: apiConfig.baseUrl,
    lobId: config.lobId,
    apiKey: config.apiKey || '',
    settings: { ...defaultSettings, ...savedSettings },
  };
}

/**
 * Save shared credentials (LOB ID + API Key)
 *
 * @param {string} lobId - LOB identifier
 * @param {string} apiKey - API key (optional - if empty, keeps existing)
 * @param {string} configuredBy - Username of who made the change
 * @returns {Object} Updated config status
 */
export function saveOrbitCredentials(lobId, apiKey, configuredBy = 'unknown') {
  const assetsPath = getAssetsPath();

  // Ensure assets directory exists
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  // Read existing config or create new
  const existing = readFileConfig() || {
    lobId: '',
    apiKeyEncrypted: null,
    apis: getEmptyApisConfig(),
  };

  const dataToSave = {
    lobId: lobId || '',
    apis: existing.apis || getEmptyApisConfig(),
    configuredAt: new Date().toISOString(),
    configuredBy,
  };

  // Handle API key - keep existing if new one is empty
  if (apiKey) {
    dataToSave.apiKeyEncrypted = encrypt(apiKey);
  } else if (existing.apiKeyEncrypted) {
    dataToSave.apiKeyEncrypted = existing.apiKeyEncrypted;
  }

  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

  console.log(`Orbit credentials saved by ${configuredBy}`);

  return getOrbitConfigStatus();
}

/**
 * Save a single API's Base URL and optional settings
 *
 * @param {string} apiType - One of: lob, registerSocket, connection, holder, verifier, issuer, chat
 * @param {string} baseUrl - The Base URL for this API
 * @param {Object} settings - Optional settings object for this API
 * @param {string} configuredBy - Username of who made the change
 * @returns {Object} Updated config status
 */
export function saveApiConfig(apiType, baseUrl, settings = null, configuredBy = 'unknown') {
  if (!VALID_API_TYPES.includes(apiType)) {
    throw new Error(`Invalid API type: ${apiType}`);
  }

  const assetsPath = getAssetsPath();

  // Ensure assets directory exists
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  // Read existing config or create new
  const existing = readFileConfig() || {
    lobId: '',
    apiKeyEncrypted: null,
    apis: getEmptyApisConfig(),
  };

  // Update the specific API's baseUrl and settings
  const apis = existing.apis || getEmptyApisConfig();
  const existingApiConfig = apis[apiType] || { baseUrl: '', settings: {} };

  apis[apiType] = {
    baseUrl: baseUrl || '',
    settings: settings !== null ? settings : (existingApiConfig.settings || {}),
  };

  const dataToSave = {
    lobId: existing.lobId || '',
    apis,
    configuredAt: new Date().toISOString(),
    configuredBy,
  };

  // Keep existing encrypted API key
  if (existing.apiKeyEncrypted) {
    dataToSave.apiKeyEncrypted = existing.apiKeyEncrypted;
  }

  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

  console.log(`Orbit ${apiType} API config saved by ${configuredBy}`);

  return getOrbitConfigStatus();
}

/**
 * Save only the settings for a specific API (preserves baseUrl)
 *
 * @param {string} apiType - One of: lob, registerSocket, connection, holder, verifier, issuer, chat
 * @param {Object} settings - Settings object for this API
 * @param {string} configuredBy - Username of who made the change
 * @returns {Object} Updated config status
 */
export function saveApiSettings(apiType, settings, configuredBy = 'unknown') {
  if (!VALID_API_TYPES.includes(apiType)) {
    throw new Error(`Invalid API type: ${apiType}`);
  }

  const assetsPath = getAssetsPath();

  // Ensure assets directory exists
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  // Read existing config or create new
  const existing = readFileConfig() || {
    lobId: '',
    apiKeyEncrypted: null,
    apis: getEmptyApisConfig(),
  };

  // Update only the settings, preserve baseUrl
  const apis = existing.apis || getEmptyApisConfig();
  const existingApiConfig = apis[apiType] || { baseUrl: '', settings: {} };

  apis[apiType] = {
    baseUrl: existingApiConfig.baseUrl || '',
    settings: settings || {},
  };

  const dataToSave = {
    lobId: existing.lobId || '',
    apis,
    configuredAt: new Date().toISOString(),
    configuredBy,
  };

  // Keep existing encrypted API key
  if (existing.apiKeyEncrypted) {
    dataToSave.apiKeyEncrypted = existing.apiKeyEncrypted;
  }

  const filePath = getSettingsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));

  console.log(`Orbit ${apiType} API settings saved by ${configuredBy}`);

  return getOrbitConfigStatus();
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
 * Check if a specific API is configured
 *
 * @param {string} apiType - API type to check
 * @returns {boolean} True if the API has a baseUrl configured
 */
export function isApiConfigured(apiType) {
  const config = getOrbitApiConfig(apiType);
  return !!(config?.baseUrl);
}

/**
 * Check if Orbit credentials are configured (LOB ID exists)
 *
 * @returns {boolean} True if lobId is set
 */
export function isOrbitConfigured() {
  const config = getOrbitConfig();
  return !!(config?.lobId);
}

/**
 * Get config status for API response (safe - no API key)
 */
export function getOrbitConfigStatus() {
  const config = getOrbitConfig();

  if (!config) {
    return {
      configured: false,
      lobId: '',
      hasApiKey: false,
      source: null,
      configuredAt: null,
      configuredBy: null,
      apis: getEmptyApisConfig(),
    };
  }

  return {
    configured: !!(config.lobId),
    lobId: config.lobId || '',
    hasApiKey: !!config.apiKey,
    source: config.source,
    configuredAt: config.configuredAt || null,
    configuredBy: config.configuredBy || null,
    apis: config.apis || getEmptyApisConfig(),
  };
}

/**
 * Test connection to a specific Orbit API
 *
 * @param {string} apiType - API type to test
 * @param {string} baseUrl - Base URL to test (optional, uses stored if not provided)
 * @param {string} lobId - LOB ID (optional, uses stored if not provided)
 * @param {string} apiKey - API Key (optional, uses stored if not provided)
 * @returns {Promise<Object>} Result with success boolean and message
 */
export async function testApiConnection(apiType, baseUrl, lobId, apiKey) {
  // Get stored config as fallback
  const storedConfig = getOrbitConfig();

  const testBaseUrl = baseUrl || storedConfig?.apis?.[apiType]?.baseUrl;
  const testLobId = lobId || storedConfig?.lobId;
  const testApiKey = apiKey || storedConfig?.apiKey;

  if (!testBaseUrl) {
    return {
      success: false,
      message: 'Base URL is required',
    };
  }

  if (!testLobId) {
    return {
      success: false,
      message: 'LOB ID is required - configure credentials first',
    };
  }

  try {
    // Try to reach the API health endpoint
    const url = new URL('/api/health', testBaseUrl).toString();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-lob-id': testLobId,
        ...(testApiKey && { 'x-api-key': testApiKey }),
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      return {
        success: true,
        message: `Successfully connected to ${apiType} API`,
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
      // Health endpoint might not exist, try base URL
      return {
        success: true,
        message: 'Connected (health endpoint not available)',
      };
    }

    return {
      success: false,
      message: `API returned status ${response.status}`,
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

// Legacy compatibility - keep old function name working
export async function testOrbitConnection(config) {
  return testApiConnection(
    'lob',
    config?.baseUrl,
    config?.lobId || config?.tenantId,
    config?.apiKey
  );
}

// Legacy compatibility - keep old save function working
export function saveOrbitConfig(config, configuredBy = 'unknown') {
  // If old format, convert and save
  if (config.baseUrl !== undefined || config.tenantId !== undefined) {
    saveOrbitCredentials(config.tenantId || config.lobId, config.apiKey, configuredBy);
    if (config.baseUrl) {
      saveApiConfig('lob', config.baseUrl, null, configuredBy);
    }
    return getOrbitConfigStatus();
  }

  // New format - save credentials and APIs separately
  if (config.lobId !== undefined || config.apiKey !== undefined) {
    saveOrbitCredentials(config.lobId, config.apiKey, configuredBy);
  }

  if (config.apis) {
    for (const [apiType, apiConfig] of Object.entries(config.apis)) {
      if (VALID_API_TYPES.includes(apiType) && apiConfig.baseUrl !== undefined) {
        saveApiConfig(apiType, apiConfig.baseUrl, apiConfig.settings || null, configuredBy);
      }
    }
  }

  return getOrbitConfigStatus();
}
