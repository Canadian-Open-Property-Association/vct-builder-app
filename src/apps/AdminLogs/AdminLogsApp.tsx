import { useEffect } from 'react';
import { useAdminStore } from '../../store/adminStore';
import { useAppTracking } from '../../hooks/useAppTracking';
import FilterPanel from './components/FilterPanel';
import LogsTable from './components/LogsTable';
import Pagination from './components/Pagination';

export default function AdminLogsApp() {
  // Track app access
  useAppTracking('admin-logs', 'Admin Access Logs');

  const {
    logs,
    pagination,
    filters,
    isLogsLoading,
    error,
    fetchLogs,
    setFilters,
    clearFilters,
  } = useAdminStore();

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    fetchLogs(filters, page);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Access Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View user login and app access history across the platform
          </p>
        </div>

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
    </div>
  );
}
