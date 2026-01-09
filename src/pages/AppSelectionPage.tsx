import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';
import { apps, AppCard, AppCategory, categoryConfig } from '../data/apps';

const RECENT_APPS_KEY = 'copa-apps-recent-apps';
const MAX_RECENT_APPS = 3;

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
    const filtered = recent.filter((id) => id !== appId);
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
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          Recent
        </div>
      )}

      <div className="p-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
            app.available
              ? app.adminOnly
                ? 'bg-purple-100 text-purple-600'
                : 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {app.icon}
        </div>

        {/* Content */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{app.name}</h2>
        <p className="text-gray-600 text-sm">{app.description}</p>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: AppCategory;
  apps: AppCard[];
  onNavigate: (app: AppCard) => void;
}

function CategorySection({ category, apps, onNavigate }: CategorySectionProps) {
  const config = categoryConfig[category];

  if (apps.length === 0) return null;

  // Sort apps: available first, then alphabetically
  const sortedApps = [...apps].sort((a, b) => {
    if (a.available === b.available) {
      return a.name.localeCompare(b.name);
    }
    return a.available ? -1 : 1;
  });

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
          {config.icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedApps.map((app) => (
          <AppCardComponent key={app.id} app={app} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export default function AppSelectionPage() {
  const navigate = useNavigate();
  const { isAdmin, checkAdminStatus } = useAdminStore();
  const [recentAppIds, setRecentAppIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminStatus();
    setRecentAppIds(getRecentApps());
  }, [checkAdminStatus]);

  // Filter apps - only show admin apps if user is admin
  const visibleApps = useMemo(() => apps.filter((app) => !app.adminOnly || isAdmin), [isAdmin]);

  // Filter by search query
  const searchFilteredApps = useMemo(
    () =>
      searchQuery.trim()
        ? visibleApps.filter(
            (app) =>
              app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              app.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : visibleApps,
    [visibleApps, searchQuery]
  );

  // Get recent apps (that are still visible/available and match search)
  const recentApps = useMemo(
    () =>
      searchQuery.trim()
        ? [] // Hide recent section when searching
        : recentAppIds
            .map((id) => visibleApps.find((app) => app.id === id && app.available))
            .filter((app): app is AppCard => app !== undefined),
    [searchQuery, recentAppIds, visibleApps]
  );

  // Group apps by category
  const appsByCategory = useMemo(() => {
    const appsToGroup = searchQuery.trim() ? searchFilteredApps : visibleApps;
    const grouped: Record<AppCategory, AppCard[]> = {
      governance: [],
      testing: [],
      admin: [],
    };

    appsToGroup.forEach((app) => {
      // Skip apps that are in recent (when not searching)
      if (!searchQuery.trim() && recentAppIds.includes(app.id)) return;
      grouped[app.category].push(app);
    });

    return grouped;
  }, [searchFilteredApps, visibleApps, searchQuery, recentAppIds]);

  // Get sorted categories
  const sortedCategories = useMemo(
    () =>
      (Object.keys(categoryConfig) as AppCategory[]).sort(
        (a, b) => categoryConfig[a].order - categoryConfig[b].order
      ),
    []
  );

  const handleNavigate = useCallback(
    (app: AppCard) => {
      saveRecentApp(app.id);
      navigate(app.path);
    },
    [navigate]
  );

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Cornerstone Network Apps</h1>
          <p className="mt-2 text-gray-600">Select an application to get started</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search Results Message */}
        {searchQuery.trim() && (
          <div className="mb-6 text-center text-gray-600">
            {searchFilteredApps.length === 0 ? (
              <p>No apps found matching "{searchQuery}"</p>
            ) : (
              <p>
                Found {searchFilteredApps.length} app
                {searchFilteredApps.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
            )}
          </div>
        )}

        {/* Recently Used Section */}
        {recentApps.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recently Used</h2>
                <p className="text-sm text-gray-500">Quick access to your recent apps</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Category Sections */}
        {sortedCategories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            apps={appsByCategory[category]}
            onNavigate={handleNavigate}
          />
        ))}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Part of the Cornerstone Network Credential Ecosystem</p>
        </div>
      </div>
    </div>
  );
}
