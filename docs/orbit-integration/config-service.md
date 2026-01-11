# Orbit Config Service

## Overview

The Orbit Config Service provides centralized management of Orbit API credentials and settings. Apps declare which APIs they need, and the service provides the configuration.

**Design Principle**: Apps declare their needs (which APIs they use), and the config service provides the credentials + endpoints + settings for those APIs.

## Storage

Configuration is stored in `orbit-settings.json`:

```json
{
  "lobId": "your-lob-id",
  "apiKeyEncrypted": {
    "iv": "...",
    "authTag": "...",
    "data": "..."
  },
  "apis": {
    "verifier": {
      "baseUrl": "https://verifier.eapi.nborbit.ca/",
      "settings": {
        "autoVerify": true
      }
    },
    "issuer": {
      "baseUrl": "https://issuer.eapi.nborbit.ca/",
      "settings": {}
    }
  },
  "configuredAt": "2024-01-15T10:30:00.000Z",
  "configuredBy": "admin-user"
}
```

### Security

- API keys are encrypted at rest using AES-256-GCM
- The encryption key is derived from `ORBIT_ENCRYPTION_KEY` environment variable
- API keys are never returned to the frontend admin UI

## Backend Usage

### Direct Import (Recommended for Server Routes)

```javascript
import { getOrbitApiConfig } from '../lib/orbitConfig.js';

// Get config for a single API
const verifierConfig = getOrbitApiConfig('verifier');
// Returns: { baseUrl, lobId, apiKey, settings }

// Check if API is configured
if (!verifierConfig?.baseUrl) {
  throw new Error('Verifier API not configured');
}
```

### Middleware Pattern

Create reusable middleware for routes that need specific APIs:

```javascript
const requireVerifierApi = (req, res, next) => {
  const config = getOrbitApiConfig('verifier');
  if (!config?.baseUrl) {
    return res.status(503).json({
      error: 'Verifier API not configured',
      message: 'Configure the Verifier API in Settings.'
    });
  }
  req.verifierConfig = config;
  next();
};

// Usage
router.post('/verify', requireVerifierApi, async (req, res) => {
  const { baseUrl, lobId, apiKey, settings } = req.verifierConfig;
  // Use config...
});
```

### Multi-API Middleware

For apps needing multiple APIs:

```javascript
const requireFormsApis = (req, res, next) => {
  const requiredApis = ['verifier', 'credential', 'registerSocket'];
  const configs = {};
  const missing = [];

  for (const apiType of requiredApis) {
    const config = getOrbitApiConfig(apiType);
    if (!config?.baseUrl) {
      missing.push(apiType);
    } else {
      configs[apiType] = config;
    }
  }

  if (missing.length > 0) {
    return res.status(503).json({
      error: 'APIs not configured',
      missing,
      message: `Configure these APIs in Settings: ${missing.join(', ')}`
    });
  }

  req.orbitConfigs = configs;
  next();
};
```

## Frontend Usage

### HTTP Endpoint (Single API)

```typescript
// GET /api/orbit/config/:apiType
async function getVerifierConfig() {
  const response = await fetch('/api/orbit/config/verifier', {
    credentials: 'include'
  });

  if (response.status === 503) {
    const error = await response.json();
    // Handle "not configured" error
    throw new Error(error.message);
  }

  if (!response.ok) {
    throw new Error('Failed to get config');
  }

  return response.json();
  // Returns: { baseUrl, lobId, apiKey, settings }
}
```

### HTTP Endpoint (Multiple APIs)

```typescript
// GET /api/orbit/config?apis=verifier,credential,registerSocket
async function getFormsConfig() {
  const response = await fetch(
    '/api/orbit/config?apis=verifier,credential,registerSocket',
    { credentials: 'include' }
  );

  if (response.status === 503) {
    const error = await response.json();
    // error.missing = ['verifier'] - which APIs are not configured
    throw new Error(error.message);
  }

  return response.json();
  // Returns: { verifier: {...}, credential: {...}, registerSocket: {...} }
}
```

## API Response Formats

### Success Response

```json
{
  "baseUrl": "https://verifier.eapi.nborbit.ca/",
  "lobId": "your-lob-id",
  "apiKey": "decrypted-api-key",
  "settings": {
    "autoVerify": true
  }
}
```

### Not Configured Response (503)

```json
{
  "error": "Verifier API not configured",
  "message": "Configure the Verifier API Base URL in Settings.",
  "apiType": "verifier"
}
```

### Multi-API Not Configured (503)

```json
{
  "error": "APIs not configured",
  "missing": ["verifier", "credential"],
  "message": "Configure these APIs in Settings: verifier, credential"
}
```

## Per-API Settings

Some APIs support additional settings:

| API | Setting | Type | Default | Description |
|-----|---------|------|---------|-------------|
| verifier | `autoVerify` | boolean | `true` | Auto-verify proofs without manual review |

### Using Settings

```javascript
const { settings } = req.verifierConfig;

// Use in API call
const response = await fetch(`${baseUrl}/api/lob/${lobId}/verify/request-url`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    proofAutoVerify: settings.autoVerify ?? true,
    // ...
  })
});
```

## Admin Endpoints

These endpoints require admin privileges:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/orbit-config` | GET | Get full config status |
| `/api/admin/orbit-credentials` | PUT | Update LOB ID + API Key |
| `/api/admin/orbit-api/:apiType` | PUT | Update API baseUrl + settings |
| `/api/admin/orbit-api/:apiType/settings` | PUT | Update settings only |
| `/api/admin/orbit-api/:apiType/test` | POST | Test API connection |
| `/api/admin/orbit-config` | DELETE | Reset to env vars |

## Key Files

| File | Purpose |
|------|---------|
| `server/lib/orbitConfig.js` | Core config service |
| `server/proxy.js` | API endpoints |
| `src/types/orbitApis.ts` | Frontend types |
| `src/store/adminStore.ts` | Admin UI state |
| `src/apps/Settings/components/OrbitConfigPanel.tsx` | Config UI |

## Adding New API Settings

1. **Define the setting type** in `src/types/orbitApis.ts`:

```typescript
export interface IssuerSettings {
  defaultExpiry?: number;
}
```

2. **Add to schema** in `src/types/orbitApis.ts`:

```typescript
export const API_SETTINGS_SCHEMA = {
  issuer: {
    fields: [
      {
        key: 'defaultExpiry',
        type: 'number',
        label: 'Default credential expiry (days)',
        default: 365,
      }
    ]
  },
  // ...
};
```

3. **Add default** in `server/lib/orbitConfig.js`:

```javascript
const DEFAULT_API_SETTINGS = {
  issuer: { defaultExpiry: 365 },
  // ...
};
```

The UI will automatically render the setting field.
