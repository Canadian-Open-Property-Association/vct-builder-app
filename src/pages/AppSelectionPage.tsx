import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  available: boolean;
  adminOnly?: boolean;
}

const RECENT_APPS_KEY = 'credential-tools-recent-apps';
const MAX_RECENT_APPS = 2;

const apps: AppCard[] = [
  {
    id: 'vct-builder',
    name: 'VCT Builder',
    description: 'Build Verifiable Credential Type files for wallet display and branding',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
    path: '/apps/vct-builder',
    available: true,
  },
  {
    id: 'schema-builder',
    name: 'Schema Builder',
    description: 'Create JSON Schemas for credential data validation',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    path: '/apps/schema-builder',
    available: true,
  },
  {
    id: 'property-access-demo',
    name: 'Property Access Authorization',
    description: 'Demo showcasing credential-based property access authorization flows',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    path: '/apps/property-access-demo',
    available: false,
  },
  {
    id: 'badge-configurator',
    name: 'Badge Configurator',
    description: 'Design and configure visual badges derived from credentials and portfolio data',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    path: '/apps/badge-configurator',
    available: false,
  },
  {
    id: 'admin-logs',
    name: 'Access Logs',
    description: 'View user login and app access history across the platform',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    path: '/apps/admin-logs',
    available: true,
    adminOnly: true,
  },
];

// Helper to get recent apps from localStorage
function getRecentApps(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_APPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Helper to save recent app to localStorage
function saveRecentApp(appId: string): void {
  try {
    const recent = getRecentApps();
    // Remove if already exists, then add to front
    const filtered = recent.filter(id => id !== appId);
    const updated = [appId, ...filtered].slice(0, MAX_RECENT_APPS);
    localStorage.setItem(RECENT_APPS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

interface AppCardComponentProps {
  app: AppCard;
  onNavigate: (app: AppCard) => void;
  showRecentBadge?: boolean;
}

function AppCardComponent({ app, onNavigate, showRecentBadge }: AppCardComponentProps) {
  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
        app.available
          ? app.adminOnly
            ? 'hover:shadow-lg hover:border-purple-300 cursor-pointer border-purple-200'
            : 'hover:shadow-lg hover:border-blue-300 cursor-pointer border-gray-200'
          : 'opacity-60 border-gray-200'
      }`}
      onClick={() => app.available && onNavigate(app)}
    >
      {/* Coming Soon Badge */}
      {!app.available && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
          Coming Soon
        </div>
      )}

      {/* Admin Badge */}
      {app.adminOnly && app.available && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
          Admin
        </div>
      )}

      {/* Recent Badge */}
      {showRecentBadge && !app.adminOnly && app.available && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Recent
        </div>
      )}

      <div className="p-6">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 ${
          app.available
            ? app.adminOnly
              ? 'bg-purple-100 text-purple-600'
              : 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-400'
        }`}>
          {app.icon}
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {app.name}
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          {app.description}
        </p>

        {/* Action */}
        {app.available ? (
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
              app.adminOnly
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(app);
            }}
          >
            Open App
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg">
            Not Available Yet
          </span>
        )}
      </div>
    </div>
  );
}

export default function AppSelectionPage() {
  const navigate = useNavigate();
  const { isAdmin, checkAdminStatus } = useAdminStore();
  const [recentAppIds, setRecentAppIds] = useState<string[]>([]);

  useEffect(() => {
    checkAdminStatus();
    setRecentAppIds(getRecentApps());
  }, [checkAdminStatus]);

  // Filter apps - only show admin apps if user is admin
  const visibleApps = apps.filter(app => !app.adminOnly || isAdmin);

  // Get recent apps (that are still visible/available)
  const recentApps = recentAppIds
    .map(id => visibleApps.find(app => app.id === id && app.available))
    .filter((app): app is AppCard => app !== undefined);

  // Get other apps (excluding recent ones), sorted with available first
  const otherApps = visibleApps
    .filter(app => !recentAppIds.includes(app.id))
    .sort((a, b) => {
      if (a.available === b.available) return 0;
      return a.available ? -1 : 1;
    });

  const handleNavigate = useCallback((app: AppCard) => {
    saveRecentApp(app.id);
    navigate(app.path);
  }, [navigate]);

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Credential Design Tools</h1>
          <p className="mt-2 text-gray-600">
            Select an application to get started
          </p>
        </div>

        {/* Recently Used Section */}
        {recentApps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recently Used
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentApps.map((app) => (
                <AppCardComponent
                  key={`recent-${app.id}`}
                  app={app}
                  onNavigate={handleNavigate}
                  showRecentBadge
                />
              ))}
            </div>
          </div>
        )}

        {/* All Apps Section */}
        <div>
          {recentApps.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {recentApps.length > 0 ? 'Other Apps' : 'All Apps'}
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherApps.map((app) => (
              <AppCardComponent
                key={app.id}
                app={app}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Part of the COPA Credential Ecosystem</p>
        </div>
      </div>
    </div>
  );
}
