/**
 * AppSwitcher Component
 *
 * Google-style app grid icon that opens a popup showing all available apps
 * for quick navigation between apps.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailableApps } from '../../data/apps';
import { useAdminStore } from '../../store/adminStore';

export default function AppSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, tenantConfig } = useAdminStore();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Get enabled apps from tenant config
  const enabledAppIds = useMemo(
    () => new Set(tenantConfig?.apps?.enabledApps || []),
    [tenantConfig?.apps?.enabledApps]
  );

  // Filter apps by admin status and tenant config
  const availableApps = useMemo(() => {
    const apps = getAvailableApps(isAdmin);
    return apps.filter((app) => {
      // Non-configurable apps (like Settings) are always shown
      if (app.configurable === false) return true;
      // Configurable apps must be in enabled list
      return enabledAppIds.has(app.id);
    });
  }, [isAdmin, enabledAppIds]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAppClick = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Check if we're currently on an app's page
  const getCurrentAppId = () => {
    const match = location.pathname.match(/^\/apps\/([^/]+)/);
    return match ? match[1] : null;
  };

  const currentAppId = getCurrentAppId();

  return (
    <div className="relative" ref={popupRef}>
      {/* Grid Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:bg-gray-200 transition-colors"
        title="Switch apps"
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="12" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
        </svg>
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-3 z-50">
          <div className="px-4 pb-2 mb-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Apps</h3>
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 max-h-80 overflow-y-auto">
            {availableApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app.path)}
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  currentAppId === app.id
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    currentAppId === app.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {app.icon}
                </div>
                <span
                  className={`text-xs text-center leading-tight ${
                    currentAppId === app.id ? 'text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {app.name}
                </span>
              </button>
            ))}
          </div>
          <div className="px-4 pt-2 mt-2 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/apps');
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1"
            >
              View all apps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
