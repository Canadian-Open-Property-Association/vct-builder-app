import { useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { useAppTracking } from '../../hooks/useAppTracking';
import FilterPanel from './components/FilterPanel';
import LogsTable from './components/LogsTable';
import Pagination from './components/Pagination';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import OrbitConfigTab from './components/OrbitConfigTab';

type SettingsTab = 'logs' | 'analytics' | 'orbit';

export default function SettingsApp() {
  // Track app access
  useAppTracking('settings', 'Settings');

  const {
    logs,
    pagination,
    filters,
    isLogsLoading,
    isAnalyticsLoading,
    error,
    fetchLogs,
    fetchAnalytics,
    setFilters,
    clearFilters,
    activeTab,
    setActiveTab,
  } = useAdminStore();

  // Cast activeTab to allow 'orbit'
  const currentTab = activeTab as SettingsTab;

  const handleRefresh = () => {
    if (currentTab === 'analytics') {
      fetchAnalytics();
    } else if (currentTab === 'logs') {
      fetchLogs(filters, pagination.page);
    }
    // Orbit tab handles its own refresh
  };

  const isRefreshing = currentTab === 'analytics' ? isAnalyticsLoading : isLogsLoading;

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    fetchLogs(filters, page);
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Access Logs
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Analytics
                </div>
              </button>
              <button
                onClick={() => setActiveTab('orbit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'orbit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Orbit Configuration
                </div>
              </button>
            </nav>

            {/* Refresh Button - only show for logs/analytics */}
            {currentTab !== 'orbit' && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {currentTab === 'orbit' ? (
        <OrbitConfigTab />
      ) : currentTab === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Stats summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Total Events</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {pagination.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Current Page</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {pagination.page} / {pagination.total_pages || 1}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Showing</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {logs.length} events
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onApplyFilters={setFilters}
            onClearFilters={clearFilters}
          />

          {/* Logs Table */}
          <LogsTable logs={logs} isLoading={isLogsLoading} />

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="mt-4">
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
