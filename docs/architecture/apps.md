# Apps Structure

## Overview

The platform hosts multiple apps that share common infrastructure. Each app is a React component with its own routes and state management.

## App Registry

Apps are registered in the launcher configuration:

```typescript
// src/config/apps.ts
export const apps = [
  {
    id: 'vct-builder',
    name: 'VCT Builder',
    description: 'Design verifiable credential types',
    component: VctBuilderApp,
    icon: CredentialIcon,
  },
  // ... more apps
];
```

## Directory Structure

Each app follows this structure:

```
src/apps/{AppName}/
├── {AppName}App.tsx       # Main app component
├── components/            # App-specific components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── ...
├── hooks/                 # App-specific hooks (optional)
└── types.ts               # App-specific types (optional)
```

## Creating a New App

### 1. Create the App Directory

```bash
mkdir -p src/apps/MyNewApp/components
```

### 2. Create the Main Component

```typescript
// src/apps/MyNewApp/MyNewAppApp.tsx
import { useAppTracking } from '../../hooks/useAppTracking';

export default function MyNewAppApp() {
  // Track app access for analytics
  useAppTracking('my-new-app', 'My New App');

  return (
    <div className="min-h-full bg-gray-50">
      <h1>My New App</h1>
      {/* App content */}
    </div>
  );
}
```

### 3. Register in App Config

```typescript
// src/config/apps.ts
import MyNewAppApp from '../apps/MyNewApp/MyNewAppApp';

export const apps = [
  // ... existing apps
  {
    id: 'my-new-app',
    name: 'My New App',
    description: 'Description of my app',
    component: MyNewAppApp,
  },
];
```

### 4. Add Backend Routes (if needed)

```javascript
// server/routes/myNewApp.js
import express from 'express';
const router = express.Router();

router.get('/data', (req, res) => {
  res.json({ message: 'Hello from My New App' });
});

export default router;
```

Mount in proxy.js:
```javascript
import myNewAppRouter from './routes/myNewApp.js';
app.use('/api/my-new-app', myNewAppRouter);
```

## Using Orbit APIs in Apps

Apps that need to interact with Orbit APIs should use the Orbit Config Service:

### Backend (Direct Import)

```javascript
// server/routes/myNewApp.js
import { getOrbitApiConfig } from '../lib/orbitConfig.js';

// Middleware to require a specific API
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

router.post('/verify', requireVerifierApi, async (req, res) => {
  const { baseUrl, lobId, apiKey, settings } = req.verifierConfig;

  // Make API call to Orbit
  const response = await fetch(`${baseUrl}/api/lob/${lobId}/verify`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    // ...
  });
});
```

### Frontend (via API)

```typescript
// src/apps/MyNewApp/api.ts
export async function getVerifierConfig() {
  const response = await fetch('/api/orbit/config/verifier', {
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

## Existing Apps

### VCT Builder

- **Purpose**: Design verifiable credential types
- **Store**: `vctStore.ts`
- **Key features**: JSON-LD context building, credential preview

### Forms Builder

- **Purpose**: Create forms that request proof presentations
- **Store**: `formsStore.ts`
- **Backend routes**: `/api/forms`, `/api/submissions`
- **Database**: SQLite for forms and submissions
- **Orbit APIs**: verifier, credential, registerSocket

### Settings

- **Purpose**: Admin configuration panel
- **Store**: `adminStore.ts`
- **Features**: Orbit config, access logs, analytics
- **Admin only**: Requires admin privileges

### Test Issuer

- **Purpose**: Issue test credentials
- **Store**: `issuerStore.ts`
- **Orbit APIs**: issuer, connection

## State Management Pattern

Apps use Zustand for state management:

```typescript
// src/store/myNewAppStore.ts
import { create } from 'zustand';

interface MyNewAppState {
  data: string[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export const useMyNewAppStore = create<MyNewAppState>((set) => ({
  data: [],
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/my-new-app/data');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
```

## App Tracking

All apps should track access for analytics:

```typescript
import { useAppTracking } from '../../hooks/useAppTracking';

function MyApp() {
  useAppTracking('app-id', 'App Display Name');
  // ...
}
```

This logs app access events visible in the Settings analytics dashboard.
