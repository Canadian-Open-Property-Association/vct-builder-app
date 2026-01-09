import { useEffect, useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export default function OrbitConfigTab() {
  const {
    orbitConfig,
    isOrbitConfigLoading,
    orbitConfigError,
    orbitTestResult,
    isOrbitTesting,
    fetchOrbitConfig,
    updateOrbitConfig,
    testOrbitConnection,
    resetOrbitConfig,
    clearOrbitTestResult,
  } = useAdminStore();

  const [baseUrl, setBaseUrl] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch config on mount
  useEffect(() => {
    fetchOrbitConfig();
  }, [fetchOrbitConfig]);

  // Update form when config is loaded
  useEffect(() => {
    if (orbitConfig) {
      setBaseUrl(orbitConfig.baseUrl || '');
      setTenantId(orbitConfig.tenantId || '');
      // Don't set API key from server - it's not returned for security
      setApiKey('');
      setHasChanges(false);
    }
  }, [orbitConfig]);

  const handleInputChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setHasChanges(true);
    setSaveSuccess(false);
    clearOrbitTestResult();
  };

  const handleTestConnection = async () => {
    await testOrbitConnection({ baseUrl, tenantId, apiKey });
  };

  const handleSave = async () => {
    const success = await updateOrbitConfig({ baseUrl, tenantId, apiKey });
    if (success) {
      setHasChanges(false);
      setApiKey(''); // Clear API key after save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset to environment variable configuration? This will delete the saved configuration.')) {
      await resetOrbitConfig();
      setApiKey('');
      setHasChanges(false);
    }
  };

  const isConfigured = orbitConfig?.configured;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Orbit LOB Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure the Orbit credential issuance service used by Test Issuer and Forms Builder.
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConfigured ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <div>
              <div className="font-medium text-gray-900">
                {isConfigured ? 'Connected' : 'Not Configured'}
              </div>
              {orbitConfig?.source && (
                <div className="text-sm text-gray-500">
                  Source: {orbitConfig.source === 'file' ? 'Saved configuration' : 'Environment variables'}
                </div>
              )}
            </div>
          </div>
          {orbitConfig?.configuredAt && (
            <div className="text-sm text-gray-500">
              Last updated: {new Date(orbitConfig.configuredAt).toLocaleDateString()}
              {orbitConfig.configuredBy && ` by ${orbitConfig.configuredBy}`}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {orbitConfigError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-red-700">{orbitConfigError}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-green-700">Configuration saved successfully</p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-5">
          {/* Base URL */}
          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="url"
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => handleInputChange(setBaseUrl, e.target.value)}
              placeholder="https://orbit.example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">The base URL of your Orbit LOB instance</p>
          </div>

          {/* Tenant ID */}
          <div>
            <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
              Tenant ID
            </label>
            <input
              type="text"
              id="tenantId"
              value={tenantId}
              onChange={(e) => handleInputChange(setTenantId, e.target.value)}
              placeholder="your-tenant-id"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Your Orbit tenant identifier</p>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
              {orbitConfig?.hasApiKey && !apiKey && (
                <span className="ml-2 text-green-600 text-xs">(saved)</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                value={apiKey}
                onChange={(e) => handleInputChange(setApiKey, e.target.value)}
                placeholder={orbitConfig?.hasApiKey ? '••••••••••••••••' : 'Enter API key'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              API key for authenticating with Orbit. Leave blank to keep existing key.
            </p>
          </div>

          {/* Test Result */}
          {orbitTestResult && (
            <div
              className={`p-4 rounded-lg ${
                orbitTestResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {orbitTestResult.success ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${
                    orbitTestResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {orbitTestResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={isOrbitTesting || !baseUrl || !tenantId}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isOrbitTesting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Testing...
                  </span>
                ) : (
                  'Test Connection'
                )}
              </button>

              {orbitConfig?.source === 'file' && (
                <button
                  onClick={handleReset}
                  disabled={isOrbitConfigLoading}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset to Env Vars
                </button>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={isOrbitConfigLoading || !hasChanges || !baseUrl || !tenantId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOrbitConfigLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500">
        <h3 className="font-medium text-gray-700 mb-2">About Orbit Configuration</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Orbit LOB is used by the Test Issuer app to issue verifiable credentials</li>
          <li>Forms Builder uses Orbit for credential verification in forms</li>
          <li>Configuration is encrypted and stored securely</li>
          <li>You can also set ORBIT_BASE_URL, ORBIT_TENANT_ID, and ORBIT_API_KEY environment variables as a fallback</li>
        </ul>
      </div>
    </div>
  );
}
