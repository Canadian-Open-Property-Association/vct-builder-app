/**
 * Orbit API Detail Panel
 *
 * Shows detailed configuration for a single Orbit API with tabs:
 * - Overview: Base URL, version info, connection test
 * - Endpoints: List of endpoints from Swagger with configuration options
 * - Settings: Global settings for this API
 */

import { useState, useEffect, useRef } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import {
  ORBIT_APIS,
  OrbitApiType,
  API_SETTINGS_SCHEMA,
  ApiSettings,
  groupEndpointsByTag,
  getEndpointKey,
} from '../../../types/orbitApis';
import EndpointConfigPanel from './EndpointConfigPanel';
import RegisterSocketDebugPanel from './RegisterSocketDebugPanel';

type TabType = 'overview' | 'endpoints' | 'settings' | 'debug';

interface OrbitApiDetailProps {
  apiType: OrbitApiType;
}

export default function OrbitApiDetail({ apiType }: OrbitApiDetailProps) {
  const {
    orbitConfig,
    isOrbitConfigLoading,
    updateApiConfig,
    testApiConnection,
    apiTestResults,
    apiTestLoading,
    swaggerSpecs,
    swaggerLoading,
    swaggerError,
    fetchSwaggerSpec,
  } = useAdminStore();

  const api = ORBIT_APIS[apiType];
  const apiConfig = orbitConfig?.apis?.[apiType];
  const swaggerSpec = swaggerSpecs[apiType];
  const isSwaggerLoading = swaggerLoading[apiType];
  const swaggerErr = swaggerError[apiType];
  const testResult = apiTestResults[apiType];
  const isTesting = apiTestLoading[apiType];

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [baseUrl, setBaseUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<ApiSettings>({});
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false);

  // Track if we're in the middle of saving to prevent race conditions
  const isSavingRef = useRef(false);
  // Track the current apiType to prevent stale closures
  const apiTypeRef = useRef(apiType);
  apiTypeRef.current = apiType;

  // Reset state when switching APIs
  useEffect(() => {
    // Reset local state when apiType changes
    const config = orbitConfig?.apis?.[apiType];
    setBaseUrl(config?.baseUrl || '');
    setSettings(config?.settings || {});
    setHasChanges(false);
    setHasSettingsChanges(false);
    setSuccessMessage(null);
    setExpandedEndpoint(null);
  }, [apiType, orbitConfig?.apis]);

  // Auto-fetch Swagger when URL is configured and we don't have it cached
  useEffect(() => {
    // Only fetch if we're not saving and have a valid URL
    if (!isSavingRef.current && apiConfig?.baseUrl && !swaggerSpec && !isSwaggerLoading && !swaggerErr) {
      // Use the ref to ensure we're fetching for the correct apiType
      const currentApiType = apiTypeRef.current;
      fetchSwaggerSpec(currentApiType, apiConfig.baseUrl);
    }
  }, [apiConfig?.baseUrl, swaggerSpec, isSwaggerLoading, swaggerErr, fetchSwaggerSpec]);

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleSettingChange = (key: string, value: boolean | string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasSettingsChanges(true);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setSuccessMessage(null);

    // Capture current values to prevent stale closures
    const currentApiType = apiTypeRef.current;
    const urlToSave = baseUrl.trim();
    const settingsToSave = { ...settings };

    // Validate URL format
    if (urlToSave && !urlToSave.match(/^https?:\/\/.+/)) {
      setSuccessMessage(null);
      return;
    }

    // Set saving flag to prevent race conditions
    isSavingRef.current = true;

    try {
      const success = await updateApiConfig(currentApiType, urlToSave, settingsToSave);
      if (success) {
        setSuccessMessage('Configuration saved');
        setHasChanges(false);
        setHasSettingsChanges(false);

        // Fetch Swagger spec if URL changed and we have a URL
        // Use the captured values, not the state
        if (urlToSave) {
          // Small delay to ensure store has updated
          setTimeout(() => {
            fetchSwaggerSpec(currentApiType, urlToSave);
          }, 100);
        }
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleTestConnection = () => {
    const currentApiType = apiTypeRef.current;
    testApiConnection(currentApiType, baseUrl);
  };

  const handleRefreshSwagger = () => {
    const currentApiType = apiTypeRef.current;
    if (baseUrl) {
      fetchSwaggerSpec(currentApiType, baseUrl);
    }
  };

  const settingsSchema = API_SETTINGS_SCHEMA[apiType];
  const hasSettingsFields = settingsSchema?.fields?.length > 0;

  const getSettingValue = (key: string, defaultValue: boolean | string | number | undefined) => {
    const s = settings as Record<string, unknown>;
    if (s && key in s) {
      return s[key];
    }
    return defaultValue;
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'endpoints', label: 'Endpoints', count: swaggerSpec?.endpoints?.length },
    { id: 'settings', label: 'Settings' },
    // Add Debug tab only for registerSocket API
    ...(apiType === 'registerSocket' ? [{ id: 'debug' as TabType, label: 'Debug' }] : []),
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{api.label}</h2>
            <p className="text-sm text-gray-500">{api.description}</p>
          </div>
          {swaggerSpec?.info?.version && (
            <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              v{swaggerSpec.info.version}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="max-w-2xl space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Base URL */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-medium text-gray-900 mb-4">Base URL</h3>
              <div>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  placeholder={`https://${apiType}.eapi.nborbit.ca/`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The base URL for this API. OpenAPI spec will be fetched from /api/docs-json
                </p>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={isOrbitConfigLoading || (!hasChanges && !hasSettingsChanges)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isOrbitConfigLoading ? 'Saving...' : 'Save'}
                </button>

                {(hasChanges || hasSettingsChanges) && (
                  <span className="text-sm text-amber-600">Unsaved changes</span>
                )}
              </div>
            </div>

            {/* Connection Test */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-medium text-gray-900 mb-4">Connection Status</h3>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !baseUrl}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Test Connection
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      testResult.success
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {testResult.success ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Swagger Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-gray-900">OpenAPI Specification</h3>
                <button
                  onClick={handleRefreshSwagger}
                  disabled={isSwaggerLoading || !baseUrl}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <svg
                    className={`w-4 h-4 ${isSwaggerLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>

              {isSwaggerLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">Fetching OpenAPI spec...</span>
                </div>
              )}

              {swaggerErr && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{swaggerErr}</p>
                </div>
              )}

              {swaggerSpec && !isSwaggerLoading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Title:</span>
                    <span className="text-sm font-medium text-gray-900">{swaggerSpec.info.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Version:</span>
                    <span className="text-sm font-medium text-gray-900">{swaggerSpec.info.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Endpoints:</span>
                    <span className="text-sm font-medium text-gray-900">{swaggerSpec.endpoints.length}</span>
                  </div>
                  {swaggerSpec.info.description && (
                    <p className="text-sm text-gray-600 mt-2">{swaggerSpec.info.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Fetched: {new Date(swaggerSpec.fetchedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {!swaggerSpec && !isSwaggerLoading && !swaggerErr && !baseUrl && (
                <p className="text-sm text-gray-500">
                  Configure a base URL to fetch the OpenAPI specification.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="max-w-4xl">
            {!swaggerSpec && !isSwaggerLoading && (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 mb-2">No OpenAPI specification loaded</p>
                <p className="text-sm text-gray-400">
                  Configure a base URL and save to fetch the API specification.
                </p>
              </div>
            )}

            {isSwaggerLoading && (
              <div className="text-center py-12">
                <svg className="w-8 h-8 text-gray-400 mx-auto animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="text-gray-500">Loading endpoints...</p>
              </div>
            )}

            {swaggerSpec && !isSwaggerLoading && (
              <div className="space-y-6">
                {Object.entries(groupEndpointsByTag(swaggerSpec.endpoints)).map(([tag, endpoints]) => (
                  <div key={tag} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">{tag}</h3>
                      <p className="text-xs text-gray-500">{endpoints.length} endpoints</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {endpoints.map((endpoint) => {
                        const key = getEndpointKey(endpoint);
                        const isExpanded = expandedEndpoint === key;

                        return (
                          <div key={key}>
                            <button
                              onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                            >
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded ${getMethodColor(
                                  endpoint.method
                                )}`}
                              >
                                {endpoint.method}
                              </span>
                              <span className="font-mono text-sm text-gray-700 flex-1">
                                {endpoint.path}
                              </span>
                              {endpoint.summary && (
                                <span className="text-xs text-gray-400 truncate max-w-xs">
                                  {endpoint.summary}
                                </span>
                              )}
                              <svg
                                className={`w-4 h-4 text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>

                            {isExpanded && (
                              <EndpointConfigPanel
                                apiType={apiType}
                                endpoint={endpoint}
                                version={swaggerSpec.info.version}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            {!hasSettingsFields ? (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-gray-500 mb-2">No settings available</p>
                <p className="text-sm text-gray-400">
                  This API does not have any configurable settings.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-base font-medium text-gray-900 mb-4">API Settings</h3>
                <div className="space-y-4">
                  {settingsSchema.fields.map((field) => {
                    const currentValue = getSettingValue(field.key, field.default);

                    if (field.type === 'boolean') {
                      return (
                        <label key={field.key} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentValue as boolean}
                            onChange={(e) => handleSettingChange(field.key, e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                            {field.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    }

                    if (field.type === 'string' || field.type === 'number') {
                      return (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={(currentValue as string | number) || ''}
                            onChange={(e) =>
                              handleSettingChange(
                                field.key,
                                field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {field.description && (
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                          )}
                        </div>
                      );
                    }

                    if (field.type === 'select' && field.options) {
                      return (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          <select
                            value={currentValue as string}
                            onChange={(e) => handleSettingChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {field.description && (
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Settings Actions */}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={isOrbitConfigLoading || !hasSettingsChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isOrbitConfigLoading ? 'Saving...' : 'Save Settings'}
                  </button>

                  {hasSettingsChanges && (
                    <span className="text-sm text-amber-600">Unsaved changes</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Debug Tab - Only for RegisterSocket */}
        {activeTab === 'debug' && apiType === 'registerSocket' && (
          <div className="max-w-2xl">
            <RegisterSocketDebugPanel
              socketUrl={apiConfig?.baseUrl || null}
              lobId={orbitConfig?.lobId || null}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get Tailwind classes for HTTP method badge
 */
function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-green-100 text-green-700';
    case 'POST':
      return 'bg-blue-100 text-blue-700';
    case 'PUT':
      return 'bg-amber-100 text-amber-700';
    case 'DELETE':
      return 'bg-red-100 text-red-700';
    case 'PATCH':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
