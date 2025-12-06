import { useState, useRef, useEffect } from 'react';
import { AccessLog } from '../../../store/adminStore';

interface LogsTableProps {
  logs: AccessLog[];
  isLoading: boolean;
}

export interface ColumnFilters {
  username?: string[];
  event_type?: string[];
  app_name?: string[];
}

function formatTimestamp(timestamp: string): string {
  // Parse the timestamp and display in Eastern time
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function EventTypeBadge({ eventType }: { eventType: string }) {
  const isLogin = eventType === 'login';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isLogin
          ? 'bg-green-100 text-green-800'
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {isLogin ? 'Login' : 'App Access'}
    </span>
  );
}

interface ColumnFilterDropdownProps {
  column: string;
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function ColumnFilterDropdown({
  column,
  options,
  selected,
  onSelectionChange,
  isOpen,
  onToggle,
  onClose,
}: ColumnFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected = selected.length === 0 || selected.length === options.length;

  const handleSelectAll = () => {
    onSelectionChange([]);
  };

  const handleToggleOption = (option: string) => {
    if (selected.length === 0) {
      // Currently "all" is selected, switch to selecting just this one
      onSelectionChange([option]);
    } else if (selected.includes(option)) {
      const newSelected = selected.filter(s => s !== option);
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([...selected, option]);
    }
  };

  const hasFilter = selected.length > 0 && selected.length < options.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`ml-1 p-0.5 rounded hover:bg-gray-200 ${hasFilter ? 'text-purple-600' : 'text-gray-400'}`}
        title={`Filter ${column}`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] max-h-[300px] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-[200px] overflow-y-auto p-1">
            {/* Select All */}
            <label className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">(Select All)</span>
            </label>

            {/* Individual options */}
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.length === 0 || selected.includes(option)}
                  onChange={() => handleToggleOption(option)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700 truncate">{option || '(empty)'}</span>
              </label>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={() => {
                onSelectionChange([]);
                onClose();
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogsTable({ logs, isLoading }: LogsTableProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});

  // Extract unique values for each filterable column
  const uniqueUsernames = [...new Set(logs.map(log => log.username))].sort();
  const uniqueEventTypes = [...new Set(logs.map(log => log.event_type))].sort();
  const uniqueAppNames = [...new Set(logs.map(log => log.app_name || ''))].filter(Boolean).sort();

  // Apply local filters
  const filteredLogs = logs.filter(log => {
    if (columnFilters.username?.length && !columnFilters.username.includes(log.username)) {
      return false;
    }
    if (columnFilters.event_type?.length && !columnFilters.event_type.includes(log.event_type)) {
      return false;
    }
    if (columnFilters.app_name?.length && !columnFilters.app_name.includes(log.app_name || '')) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-gray-600">Loading logs...</span>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2">No access logs found</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = Object.values(columnFilters).some(f => f && f.length > 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <span className="text-sm text-purple-700">
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          <button
            onClick={() => setColumnFilters({})}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Clear all filters
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp (ET)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  User
                  <ColumnFilterDropdown
                    column="User"
                    options={uniqueUsernames}
                    selected={columnFilters.username || []}
                    onSelectionChange={(selected) => setColumnFilters(prev => ({ ...prev, username: selected }))}
                    isOpen={openFilter === 'username'}
                    onToggle={() => setOpenFilter(openFilter === 'username' ? null : 'username')}
                    onClose={() => setOpenFilter(null)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  Event
                  <ColumnFilterDropdown
                    column="Event"
                    options={uniqueEventTypes}
                    selected={columnFilters.event_type || []}
                    onSelectionChange={(selected) => setColumnFilters(prev => ({ ...prev, event_type: selected }))}
                    isOpen={openFilter === 'event_type'}
                    onToggle={() => setOpenFilter(openFilter === 'event_type' ? null : 'event_type')}
                    onClose={() => setOpenFilter(null)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  App
                  <ColumnFilterDropdown
                    column="App"
                    options={uniqueAppNames}
                    selected={columnFilters.app_name || []}
                    onSelectionChange={(selected) => setColumnFilters(prev => ({ ...prev, app_name: selected }))}
                    isOpen={openFilter === 'app_name'}
                    onToggle={() => setOpenFilter(openFilter === 'app_name' ? null : 'app_name')}
                    onClose={() => setOpenFilter(null)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {log.avatar_url && (
                      <img
                        src={log.avatar_url}
                        alt=""
                        className="w-6 h-6 rounded-full mr-2"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.username}
                      </div>
                      {log.display_name && log.display_name !== log.username && (
                        <div className="text-xs text-gray-500">
                          {log.display_name}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <EventTypeBadge eventType={log.event_type} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {log.app_name || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {log.ip_address || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
