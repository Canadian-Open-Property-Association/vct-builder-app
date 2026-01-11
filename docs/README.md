# Developer Documentation

This documentation is intended for developers (human or AI) working on the credential-design-tools platform.

## Quick Links

- [Architecture Overview](architecture/overview.md) - System architecture and tech stack
- [Apps Structure](architecture/apps.md) - How apps are structured and added
- [Orbit Config Service](orbit-integration/config-service.md) - Centralized Orbit API configuration
- [Orbit API Types](orbit-integration/api-types.md) - Available Orbit APIs and their purposes

## For AI Agents

When working on this codebase, reference these docs for context:

| Before doing this... | Read this... |
|---------------------|--------------|
| Modifying Orbit integrations | `orbit-integration/config-service.md` |
| Adding new apps | `architecture/apps.md` |
| Understanding the architecture | `architecture/overview.md` |
| Working with Orbit APIs | `orbit-integration/api-types.md` |

## Project Structure

```
credential-design-tools/
├── src/
│   ├── apps/              # Individual applications
│   │   ├── FormsBuilder/  # Form builder app
│   │   ├── Settings/      # Admin settings app
│   │   ├── TestIssuer/    # Credential issuer testing
│   │   └── VctBuilder/    # VCT credential designer
│   ├── components/        # Shared React components
│   ├── store/             # Zustand state stores
│   ├── types/             # TypeScript type definitions
│   └── hooks/             # Custom React hooks
├── server/
│   ├── lib/               # Server utility modules
│   │   └── orbitConfig.js # Orbit configuration service
│   ├── routes/            # Express route handlers
│   └── proxy.js           # Main Express server
├── docs/                  # This documentation
└── assets/                # Uploaded files and config storage
```

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Backend**: Express.js (Node.js)
- **Database**: SQLite (for forms/submissions)
- **Authentication**: GitHub OAuth
- **Deployment**: Render.com (with persistent disk)
