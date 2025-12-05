import { useState } from 'react';
import { LogFilters } from '../../../store/adminStore';

interface FilterPanelProps {
  filters: LogFilters;
  onApplyFilters: (filters: LogFilters) => void;
  onClearFilters: () => void;
}

export default function FilterPanel({ filters, onApplyFilters, onClearFilters }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<LogFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const hasFilters = Object.values(localFilters).some(v => v);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        {hasFilters && (
          <button
            onClick={handleClear}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Event Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Event Type
          </label>
          <select
            value={localFilters.event_type || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, event_type: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All events</option>
            <option value="login">Logins only</option>
            <option value="app_access">App access only</option>
          </select>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Username
          </label>
          <input
            type="text"
            value={localFilters.username || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, username: e.target.value || undefined })}
            placeholder="Search username..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* App */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            App
          </label>
          <select
            value={localFilters.app_id || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, app_id: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">All apps</option>
            <option value="vct-builder">VCT Builder</option>
            <option value="schema-builder">Schema Builder</option>
            <option value="admin-logs">Admin Logs</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={localFilters.start_date || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, start_date: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={localFilters.end_date || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, end_date: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
