import { useState, useEffect } from 'react';
import { useFurnisherSettingsStore, DataProviderTypeSetting, EntityStatusSetting } from '../../../store/furnisherSettingsStore';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'data-types' | 'statuses';

const STATUS_COLORS = [
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { value: 'red', label: 'Red', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'gray', label: 'Gray', bg: 'bg-gray-100', text: 'text-gray-800' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-800' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-800' },
];

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, fetchSettings, updateSettings, isLoading } = useFurnisherSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('data-types');
  const [dataProviderTypes, setDataProviderTypes] = useState<DataProviderTypeSetting[]>([]);
  const [entityStatuses, setEntityStatuses] = useState<EntityStatusSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // New item forms
  const [newDataType, setNewDataType] = useState({ id: '', label: '', description: '' });
  const [newStatus, setNewStatus] = useState({ id: '', label: '', color: 'gray' });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setDataProviderTypes(settings.dataProviderTypes);
      setEntityStatuses(settings.entityStatuses);
    }
  }, [settings]);

  // Generate ID from label
  const generateId = (label: string) => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Data Provider Types handlers
  const handleAddDataType = () => {
    if (!newDataType.label.trim()) return;

    const id = newDataType.id.trim() || generateId(newDataType.label);
    if (dataProviderTypes.some(t => t.id === id)) {
      setError('A data provider type with this ID already exists');
      return;
    }

    setDataProviderTypes([...dataProviderTypes, {
      id,
      label: newDataType.label.trim(),
      description: newDataType.description.trim() || undefined,
    }]);
    setNewDataType({ id: '', label: '', description: '' });
    setHasChanges(true);
    setError(null);
  };

  const handleRemoveDataType = (id: string) => {
    setDataProviderTypes(dataProviderTypes.filter(t => t.id !== id));
    setHasChanges(true);
  };

  const handleUpdateDataType = (id: string, updates: Partial<DataProviderTypeSetting>) => {
    setDataProviderTypes(dataProviderTypes.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
    setHasChanges(true);
  };

  // Entity Status handlers
  const handleAddStatus = () => {
    if (!newStatus.label.trim()) return;

    const id = newStatus.id.trim() || generateId(newStatus.label);
    if (entityStatuses.some(s => s.id === id)) {
      setError('A status with this ID already exists');
      return;
    }

    setEntityStatuses([...entityStatuses, {
      id,
      label: newStatus.label.trim(),
      color: newStatus.color,
    }]);
    setNewStatus({ id: '', label: '', color: 'gray' });
    setHasChanges(true);
    setError(null);
  };

  const handleRemoveStatus = (id: string) => {
    if (entityStatuses.length <= 1) {
      setError('You must have at least one status');
      return;
    }
    setEntityStatuses(entityStatuses.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleUpdateStatus = (id: string, updates: Partial<EntityStatusSetting>) => {
    setEntityStatuses(entityStatuses.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
    setHasChanges(true);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateSettings({
        dataProviderTypes,
        entityStatuses,
      });
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColorClasses = (color: string) => {
    const colorConfig = STATUS_COLORS.find(c => c.value === color);
    return colorConfig || STATUS_COLORS.find(c => c.value === 'gray')!;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Data Furnisher Settings</h2>
              <p className="text-sm text-gray-500">Configure data provider types and entity statuses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('data-types')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'data-types'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Data Provider Types
            </button>
            <button
              onClick={() => setActiveTab('statuses')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statuses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Entity Statuses
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && !settings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Data Provider Types Tab */}
              {activeTab === 'data-types' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the types of data that furnishers can provide. These options appear when editing entity profiles.
                  </p>

                  {/* Existing types */}
                  <div className="space-y-2">
                    {dataProviderTypes.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{type.label}</span>
                            <span className="text-xs text-gray-400 font-mono">{type.id}</span>
                          </div>
                          <input
                            type="text"
                            value={type.description || ''}
                            onChange={(e) => handleUpdateDataType(type.id, { description: e.target.value })}
                            placeholder="Description (optional)"
                            className="mt-1 w-full text-sm text-gray-600 bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-400"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveDataType(type.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new type */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Data Provider Type</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newDataType.label}
                        onChange={(e) => setNewDataType({ ...newDataType, label: e.target.value })}
                        placeholder="Label (e.g., Insurance)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={newDataType.id}
                        onChange={(e) => setNewDataType({ ...newDataType, id: e.target.value })}
                        placeholder="ID (auto-generated)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      value={newDataType.description}
                      onChange={(e) => setNewDataType({ ...newDataType, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddDataType}
                      disabled={!newDataType.label.trim()}
                      className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Data Provider Type
                    </button>
                  </div>
                </div>
              )}

              {/* Entity Statuses Tab */}
              {activeTab === 'statuses' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Configure the status options available for entities. These affect how entities are displayed and filtered.
                  </p>

                  {/* Existing statuses */}
                  <div className="space-y-2">
                    {entityStatuses.map((status) => {
                      const colorConfig = getStatusColorClasses(status.color);
                      return (
                        <div
                          key={status.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${colorConfig.bg} ${colorConfig.text}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{status.id}</span>
                          <select
                            value={status.color}
                            onChange={(e) => handleUpdateStatus(status.id, { color: e.target.value })}
                            className="ml-auto text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {STATUS_COLORS.map((color) => (
                              <option key={color.value} value={color.value}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveStatus(status.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add new status */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Status</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={newStatus.label}
                        onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                        placeholder="Label (e.g., Archived)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={newStatus.id}
                        onChange={(e) => setNewStatus({ ...newStatus, id: e.target.value })}
                        placeholder="ID (auto-generated)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      <select
                        value={newStatus.color}
                        onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {STATUS_COLORS.map((color) => (
                          <option key={color.value} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAddStatus}
                      disabled={!newStatus.label.trim()}
                      className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Status
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasChanges && <span className="text-amber-600">Unsaved changes</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {hasChanges ? 'Cancel' : 'Close'}
            </button>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
