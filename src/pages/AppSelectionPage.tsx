import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';
import { apps, AppCard, AppCategory, categoryConfig } from '../data/apps';

interface AppCardComponentProps {
  app: AppCard;
  onNavigate: (app: AppCard) => void;
}

function AppCardComponent({ app, onNavigate }: AppCardComponentProps) {
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
  const { isAdmin, checkAdminStatus, tenantConfig, fetchTenantConfig } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminStatus();
    fetchTenantConfig();
  }, [checkAdminStatus, fetchTenantConfig]);

  // Get ecosystem branding from config
  const ecosystemName = tenantConfig?.ecosystem?.name || 'Cornerstone Network';
  const ecosystemTagline = tenantConfig?.ecosystem?.tagline || 'A digital trust toolkit for the Cornerstone Network ecosystem';

  // Get enabled apps from tenant config
  const enabledAppIds = useMemo(
    () => new Set(tenantConfig?.apps?.enabledApps || []),
    [tenantConfig?.apps?.enabledApps]
  );

  // Filter apps based on:
  // 1. Admin-only apps: only show if user is admin
  // 2. Configurable apps: only show if enabled in tenant config (or if not available - show as "Coming Soon")
  // 3. Non-configurable apps (like Settings): always show
  const visibleApps = useMemo(
    () =>
      apps.filter((app) => {
        // Hide admin-only apps from non-admins
        if (app.adminOnly && !isAdmin) return false;

        // Non-configurable apps (like Settings) are always shown
        if (app.configurable === false) return true;

        // For configurable apps, check if enabled OR if unavailable (show as "Coming Soon")
        // This allows unavailable apps to still appear with "Coming Soon" badge
        if (!app.available) return true;

        // Check if app is enabled in tenant config
        return enabledAppIds.has(app.id);
      }),
    [isAdmin, enabledAppIds]
  );

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

  // Group apps by category
  const appsByCategory = useMemo(() => {
    const appsToGroup = searchQuery.trim() ? searchFilteredApps : visibleApps;
    const grouped: Record<AppCategory, AppCard[]> = {
      governance: [],
      testing: [],
      admin: [],
    };

    appsToGroup.forEach((app) => {
      grouped[app.category].push(app);
    });

    return grouped;
  }, [searchFilteredApps, visibleApps, searchQuery]);

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
      navigate(app.path);
    },
    [navigate]
  );

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to {ecosystemName} Apps</h1>
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
          <p>{ecosystemTagline}</p>
        </div>
      </div>
    </div>
  );
}
