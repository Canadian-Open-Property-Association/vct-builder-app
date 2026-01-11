# Orbit API Types

## Overview

Northern Block Orbit provides multiple API endpoints for different verifiable credential operations. All APIs share the same credentials (LOB ID + API Key) but have different base URLs.

## Available APIs

| API Type | Label | Description |
|----------|-------|-------------|
| `lob` | LOB API | Line of Business API - tenant management |
| `registerSocket` | RegisterSocket API | WebSocket registration for real-time events |
| `connection` | Connection API | DIDComm connection management |
| `holder` | Holder API | Wallet holder operations |
| `verifier` | Verifier API | Credential verification requests |
| `issuer` | Issuer API | Credential issuance |
| `chat` | Chat API | Secure messaging |

## API Usage by App

| App | APIs Used |
|-----|-----------|
| Forms Builder | `verifier`, `credential`, `registerSocket` |
| Test Issuer | `issuer`, `connection` |

## Verifier API

Used to request and verify credential presentations.

### Key Endpoints

```
POST /api/lob/{lobId}/verify/request-url
  - Create a proof request URL/QR code

GET /api/lob/{lobId}/verify/session/{sessionId}
  - Check proof request status

POST /api/lob/{lobId}/verify/vc
  - Verify a presented credential
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoVerify` | boolean | `true` | Automatically verify without manual review |

### Example Usage

```javascript
const { baseUrl, lobId, apiKey, settings } = getOrbitApiConfig('verifier');

const response = await fetch(`${baseUrl}/api/lob/${lobId}/verify/request-url`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    name: 'Proof Request',
    version: '1.0',
    proofAutoVerify: settings.autoVerify,
    requestedAttributes: [
      {
        name: 'email',
        restrictions: [{ cred_def_id: '...' }]
      }
    ]
  })
});
```

## Issuer API

Used to issue verifiable credentials.

### Key Endpoints

```
POST /api/lob/{lobId}/issue/credential-offer
  - Create a credential offer

GET /api/lob/{lobId}/issue/session/{sessionId}
  - Check issuance status

GET /api/lob/{lobId}/schemas
  - List available schemas

GET /api/lob/{lobId}/credential-definitions
  - List credential definitions
```

### Example Usage

```javascript
const { baseUrl, lobId, apiKey } = getOrbitApiConfig('issuer');

const response = await fetch(`${baseUrl}/api/lob/${lobId}/issue/credential-offer`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    credDefId: 'credential-definition-id',
    attributes: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  })
});
```

## RegisterSocket API

WebSocket service for receiving real-time events.

### Key Endpoints

```
WS /ws/lob/{lobId}
  - WebSocket connection for events

POST /api/lob/{lobId}/register
  - Register for specific events
```

### Events

- `proof_received` - A proof presentation was received
- `proof_verified` - A proof was verified
- `credential_issued` - A credential was issued
- `connection_established` - A new DIDComm connection

## Connection API

Manages DIDComm connections between agents.

### Key Endpoints

```
POST /api/lob/{lobId}/connection/invitation
  - Create a connection invitation

GET /api/lob/{lobId}/connections
  - List active connections

GET /api/lob/{lobId}/connection/{connectionId}
  - Get connection details
```

## Credential API

Schema and credential definition management.

### Key Endpoints

```
GET /api/lob/{lobId}/schemas
  - List schemas

POST /api/lob/{lobId}/schemas
  - Create a new schema

GET /api/lob/{lobId}/credential-definitions
  - List credential definitions

POST /api/lob/{lobId}/credential-definitions
  - Create a credential definition
```

## Authentication

All APIs use the same authentication:

```
Headers:
  Authorization: Bearer {apiKey}
  x-lob-id: {lobId}  (alternative to path parameter)
```

## Error Handling

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request - check request body |
| 401 | Unauthorized - check API key |
| 403 | Forbidden - check LOB ID permissions |
| 404 | Resource not found |
| 500 | Server error |

## Type Definitions

```typescript
// src/types/orbitApis.ts

export type OrbitApiType =
  | 'lob'
  | 'registerSocket'
  | 'connection'
  | 'holder'
  | 'verifier'
  | 'issuer'
  | 'chat';

export interface ApiConfig {
  baseUrl: string;
  settings?: ApiSettings;
}

export interface VerifierSettings {
  autoVerify?: boolean;
}

export interface IssuerSettings {
  // Reserved for future
}
```

## Configuration

APIs are configured in the Settings app under "Orbit Configuration":

1. **Credentials** - Shared LOB ID and API Key
2. **Endpoints** - Base URL for each API
3. **Advanced Settings** - Per-API settings (e.g., autoVerify)

See [Config Service](config-service.md) for implementation details.
