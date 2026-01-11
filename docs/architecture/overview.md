# Architecture Overview

## System Architecture

The credential-design-tools platform is a monorepo containing:

1. **Frontend** - React SPA with multiple apps
2. **Backend** - Express.js API server
3. **Shared Storage** - File-based config + SQLite database

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ VctBuilder  │ │FormsBuilder │ │  Settings   │ │ TestIssuer│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                            │                                     │
└────────────────────────────│─────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js Backend                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      API Routes                              ││
│  │  /api/auth  /api/admin  /api/orbit  /api/forms  /api/issuer ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Orbit Config    │  │  Access Logger   │                     │
│  │  Service         │  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ orbit-settings│    │   SQLite DB   │    │  File Assets  │
│    .json      │    │ (forms.db)    │    │  (uploads)    │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Tailwind CSS | Styling |
| Zustand | State management |
| React Router | Client-side routing |

### Backend

| Technology | Purpose |
|------------|---------|
| Express.js | HTTP server |
| better-sqlite3 | SQLite database |
| express-session | Session management |
| multer | File uploads |
| crypto | API key encryption |

### External Services

| Service | Purpose |
|---------|---------|
| GitHub OAuth | Authentication |
| Northern Block Orbit | Verifiable credentials infrastructure |

## App Launcher Pattern

The platform uses an app launcher pattern where the main entry point loads different apps:

```typescript
// src/App.tsx
const apps = [
  { id: 'vct-builder', component: VctBuilderApp },
  { id: 'forms-builder', component: FormsBuilderApp },
  { id: 'settings', component: SettingsApp },
  // ...
];

// Users select an app from the launcher, which renders the appropriate component
```

## Authentication Flow

1. User clicks "Login with GitHub"
2. Redirected to GitHub OAuth
3. GitHub redirects back with auth code
4. Server exchanges code for access token
5. Server fetches user profile from GitHub
6. Session created with user info
7. User can access protected routes

```
User → GitHub → Server → Session → Authenticated
```

## Data Storage

### File-based Storage

Located in `ASSETS_PATH` (configurable via environment variable):

- `orbit-settings.json` - Orbit API configuration (LOB ID, API key, endpoints)
- `metadata.json` - Asset metadata
- `user-{id}.json` - Per-user project storage
- Various uploaded files

### SQLite Database

Used by FormsBuilder for:
- Form definitions
- Form submissions
- Proof request results

## Environment Configuration

Key environment variables:

| Variable | Description |
|----------|-------------|
| `ASSETS_PATH` | Persistent storage location |
| `SESSION_SECRET` | Express session secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret |
| `ORBIT_ENCRYPTION_KEY` | AES-256 key for API key encryption |
| `DATABASE_URL` | SQLite database path |

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Frontend | Vite dev server (5173) | Static files from `/dist` |
| Backend | Express (5174) | Same Express server |
| CORS | localhost origins | Production domain |
| Cookies | `sameSite: lax` | `sameSite: none`, `secure: true` |
