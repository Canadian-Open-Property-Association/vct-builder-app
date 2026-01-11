import { useState, useEffect } from 'react';
import {
  ORBIT_APIS,
  OrbitApiType,
  ORBIT_API_KEYS,
  API_SETTINGS_SCHEMA,
  ApiSettings,
} from '../../../types/orbitApis';
import { useAdminStore } from '../../../store/adminStore';

export default function OrbitConfigPanel() {
  const {
    orbitConfig,
    isOrbitConfigLoading,
    orbitConfigError,
    fetchOrbitConfig,
    updateOrbitCredentials,
    updateApiConfig,
    resetOrbitConfig,
  } = useAdminStore();

  // Credentials state
  const [lobId, setLobId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Endpoints state - one baseUrl per API
  const [endpoints, setEndpoints] = useState<Record<OrbitApiType, string>>({
    lob: '',
    registerSocket: '',
    connection: '',
    holder: '',
    verifier: '',
    issuer: '',
    chat: '',
  });

  // Settings state - per-API settings
  const [settings, setSettings] = useState<Record<OrbitApiType, ApiSettings>>({
    lob: {},
    registerSocket: {},
    connection: {},
    holder: {},
    verifier: {},
    issuer: {},
    chat: {},
  });

  // Track which API's advanced settings are expanded
  const [expandedSettings, setExpandedSettings] = useState<Record<OrbitApiType, boolean>>({
    lob: false,
    registerSocket: false,
    connection: false,
    holder: false,
    verifier: false,
    issuer: false,
    chat: false,
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasCredentialChanges, setHasCredentialChanges] = useState(false);
  const [hasEndpointChanges, setHasEndpointChanges] = useState(false);
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetchOrbitConfig();
  }, [fetchOrbitConfig]);

  // Update form when config loads
  useEffect(() => {
    if (orbitConfig) {
      setLobId(orbitConfig.lobId || '');
      setApiKey(''); // Never populate API key from stored config

      // Populate endpoints and settings
      const newEndpoints: Record<OrbitApiType, string> = {
        lob: '',
        registerSocket: '',
        connection: '',
        holder: '',
        verifier: '',
        issuer: '',
        chat: '',
      };
      const newSettings: Record<OrbitApiType, ApiSettings> = {
        lob: {},
        registerSocket: {},
        connection: {},
        holder: {},
        verifier: {},
        issuer: {},
        chat: {},
      };

      if (orbitConfig.apis) {
        for (const key of ORBIT_API_KEYS) {
          newEndpoints[key] = orbitConfig.apis[key]?.baseUrl || '';
          newSettings[key] = orbitConfig.apis[key]?.settings || {};
        }
      }
      setEndpoints(newEndpoints);
      setSettings(newSettings);

      setHasCredentialChanges(false);
      setHasEndpointChanges(false);
      setHasSettingsChanges(false);
    }
  }, [orbitConfig]);

  const handleLobIdChange = (value: string) => {
    setLobId(value);
    setHasCredentialChanges(true);
    setSuccessMessage(null);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setHasCredentialChanges(true);
    setSuccessMessage(null);
  };

  const handleEndpointChange = (apiType: OrbitApiType, value: string) => {
    setEndpoints((prev) => ({ ...prev, [apiType]: value }));
    setHasEndpointChanges(true);
    setSuccessMessage(null);
  };

  const handleSettingChange = (apiType: OrbitApiType, key: string, value: boolean | string | number) => {
    setSettings((prev) => ({
      ...prev,
      [apiType]: { ...prev[apiType], [key]: value },
    }));
    setHasSettingsChanges(true);
    setSuccessMessage(null);
  };

  const toggleSettingsExpanded = (apiType: OrbitApiType) => {
    setExpandedSettings((prev) => ({ ...prev, [apiType]: !prev[apiType] }));
  };

  const handleSaveCredentials = async () => {
    setSuccessMessage(null);

    const success = await updateOrbitCredentials({
      lobId,
      apiKey: apiKey || undefined,
    });

    if (success) {
      setSuccessMessage('Credentials saved successfully');
      setApiKey('');
      setHasCredentialChanges(false);
    }
  };

  const handleSaveEndpointsAndSettings = async () => {
    setSuccessMessage(null);

    // Save each endpoint and settings that has changed
    let allSuccess = true;
    for (const apiType of ORBIT_API_KEYS) {
      const currentBaseUrl = orbitConfig?.apis?.[apiType]?.baseUrl || '';
      const currentSettings = orbitConfig?.apis?.[apiType]?.settings || {};

      const endpointChanged = endpoints[apiType] !== currentBaseUrl;
      const settingsChanged = JSON.stringify(settings[apiType]) !== JSON.stringify(currentSettings);

      if (endpointChanged || settingsChanged) {
        const success = await updateApiConfig(apiType, endpoints[apiType], settings[apiType]);
        if (!success) {
          allSuccess = false;
          break;
        }
      }
    }

    if (allSuccess) {
      setSuccessMessage('Endpoints and settings saved successfully');
      setHasEndpointChanges(false);
      setHasSettingsChanges(false);
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        'Reset all Orbit configuration to environment variables? This will delete all saved settings.'
      )
    ) {
      await resetOrbitConfig();
      setSuccessMessage('Configuration reset to environment variables');
    }
  };

  // Check if an API has any settings fields defined
  const hasSettingsFields = (apiType: OrbitApiType) => {
    return API_SETTINGS_SCHEMA[apiType]?.fields?.length > 0;
  };

  // Get current value for a setting field
  const getSettingValue = (apiType: OrbitApiType, key: string, defaultValue: boolean | string | number | undefined) => {
    const apiSettings = settings[apiType] as Record<string, unknown>;
    if (apiSettings && key in apiSettings) {
      return apiSettings[key];
    }
    return defaultValue;
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Orbit Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your Orbit LOB credentials and API endpoints
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              orbitConfig?.configured ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {orbitConfig?.configured ? 'Credentials Configured' : 'Not Configured'}
            </p>
            {orbitConfig?.source && (
              <p className="text-xs text-gray-500">
                Source: {orbitConfig.source === 'file' ? 'Saved configuration' : 'Environment variables'}
              </p>
            )}
          </div>
        </div>

        {orbitConfig?.configuredAt && (
          <p className="text-xs text-gray-400 mt-2">
            Last updated: {new Date(orbitConfig.configuredAt).toLocaleString()}
            {orbitConfig.configuredBy && ` by ${orbitConfig.configuredBy}`}
          </p>
        )}
      </div>

      {/* Error Message */}
      {orbitConfigError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{orbitConfigError}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Credentials Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Credentials</h3>
        <p className="text-sm text-gray-500 mb-4">
          Shared credentials used by all Orbit APIs
        </p>

        <div className="space-y-4">
          {/* LOB ID */}
          <div>
            <label htmlFor="lobId" className="block text-sm font-medium text-gray-700 mb-1">
              LOB ID
            </label>
            <input
              type="text"
              id="lobId"
              value={lobId}
              onChange={(e) => handleLobIdChange(e.target.value)}
              placeholder="Enter your LOB ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={orbitConfig?.hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {orbitConfig?.hasApiKey
                ? 'API key is saved. Enter a new value to update it.'
                : 'Your API key for authenticating with Orbit APIs'}
            </p>
          </div>
        </div>

        {/* Credentials Actions */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleSaveCredentials}
            disabled={isOrbitConfigLoading || !lobId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isOrbitConfigLoading ? 'Saving...' : 'Save Credentials'}
          </button>

          {hasCredentialChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Endpoints Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">API Endpoints</h3>
        <p className="text-sm text-gray-500 mb-4">
          Base URLs for each Orbit API service
        </p>

        <div className="space-y-4">
          {ORBIT_API_KEYS.map((apiType) => {
            const api = ORBIT_APIS[apiType];
            const hasSettings = hasSettingsFields(apiType);
            const isExpanded = expandedSettings[apiType];
            const settingsSchema = API_SETTINGS_SCHEMA[apiType];

            return (
              <div key={apiType} className="border border-gray-100 rounded-lg p-3">
                {/* Endpoint URL */}
                <div>
                  <label
                    htmlFor={`endpoint-${apiType}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {api.label}
                  </label>
                  <input
                    type="url"
                    id={`endpoint-${apiType}`}
                    value={endpoints[apiType]}
                    onChange={(e) => handleEndpointChange(apiType, e.target.value)}
                    placeholder={`https://${apiType}.eapi.nborbit.ca/`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{api.description}</p>
                </div>

                {/* Advanced Settings Toggle */}
                {hasSettings && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleSettingsExpanded(apiType)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      Advanced Settings
                    </button>

                    {/* Collapsible Settings Panel */}
                    {isExpanded && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-3">
                        {settingsSchema.fields.map((field) => {
                          const currentValue = getSettingValue(apiType, field.key, field.default);

                          if (field.type === 'boolean') {
                            return (
                              <label
                                key={field.key}
                                className="flex items-start gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={currentValue as boolean}
                                  onChange={(e) =>
                                    handleSettingChange(apiType, field.key, e.target.checked)
                                  }
                                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm text-gray-700">{field.label}</span>
                                  {field.description && (
                                    <p className="text-xs text-gray-400">{field.description}</p>
                                  )}
                                </div>
                              </label>
                            );
                          }

                          if (field.type === 'string' || field.type === 'number') {
                            return (
                              <div key={field.key}>
                                <label className="block text-sm text-gray-700 mb-1">
                                  {field.label}
                                </label>
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  value={currentValue as string | number}
                                  onChange={(e) =>
                                    handleSettingChange(
                                      apiType,
                                      field.key,
                                      field.type === 'number'
                                        ? parseFloat(e.target.value)
                                        : e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {field.description && (
                                  <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                                )}
                              </div>
                            );
                          }

                          if (field.type === 'select' && field.options) {
                            return (
                              <div key={field.key}>
                                <label className="block text-sm text-gray-700 mb-1">
                                  {field.label}
                                </label>
                                <select
                                  value={currentValue as string}
                                  onChange={(e) =>
                                    handleSettingChange(apiType, field.key, e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                {field.description && (
                                  <p className="text-xs text-gray-400 mt-0.5">{field.description}</p>
                                )}
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Endpoints Actions */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleSaveEndpointsAndSettings}
            disabled={isOrbitConfigLoading || (!hasEndpointChanges && !hasSettingsChanges)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isOrbitConfigLoading ? 'Saving...' : 'Save Endpoints'}
          </button>

          {(hasEndpointChanges || hasSettingsChanges) && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Reset Section */}
      {orbitConfig?.source === 'file' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Reset Configuration</p>
              <p className="text-xs text-gray-500">
                Delete saved settings and revert to environment variables
              </p>
            </div>
            <button
              onClick={handleReset}
              disabled={isOrbitConfigLoading}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
