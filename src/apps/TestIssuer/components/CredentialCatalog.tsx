/**
 * CredentialCatalog Component
 *
 * Dashboard showing available credential schemas for issuance.
 * Users can import schemas from the VDR or add custom schemas.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestIssuerStore } from '../../../store/testIssuerStore';
import { CREDENTIAL_CATEGORIES } from '../../../types/issuer';

export default function CredentialCatalog() {
  const navigate = useNavigate();
  const {
    catalog,
    orbitConfig,
    isLoading,
    error,
    fetchCatalog,
    importFromVdr,
    removeFromCatalog,
    checkOrbitConnection,
    clearError,
  } = useTestIssuerStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importSchemaUri, setImportSchemaUri] = useState('');
  const [importVctUri, setImportVctUri] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch catalog and check Orbit connection on mount
  useEffect(() => {
    fetchCatalog();
    checkOrbitConnection();
  }, [fetchCatalog, checkOrbitConnection]);

  // Filter catalog by category
  const filteredCatalog =
    filterCategory === 'all'
      ? catalog
      : catalog.filter((entry) => entry.category === filterCategory);

  const handleImport = async () => {
    if (!importSchemaUri.trim()) return;

    setIsImporting(true);
    try {
      await importFromVdr(importSchemaUri.trim(), importVctUri.trim() || undefined);
      setShowImportModal(false);
      setImportSchemaUri('');
      setImportVctUri('');
    } catch (err) {
      // Error handled in store
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the catalog?`)) return;
    try {
      await removeFromCatalog(id);
    } catch (err) {
      // Error handled in store
    }
  };

  // Show Orbit connection status banner if not connected
  if (!isLoading && orbitConfig && !orbitConfig.connected) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-yellow-600 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold text-yellow-800">Orbit LOB Not Configured</h2>
              <p className="text-yellow-700 mt-2">
                Test Issuer requires Orbit LOB to be configured for credential issuance.
                Please configure the following environment variables:
              </p>
              <ul className="mt-3 text-yellow-700 list-disc list-inside space-y-1">
                <li><code className="bg-yellow-100 px-1 rounded">ORBIT_BASE_URL</code> - Orbit API base URL</li>
                <li><code className="bg-yellow-100 px-1 rounded">ORBIT_TENANT_ID</code> - Your Orbit tenant ID</li>
                <li><code className="bg-yellow-100 px-1 rounded">ORBIT_API_KEY</code> - Your Orbit API key (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Issuer</h1>
          <p className="text-gray-600 mt-1">Issue test credentials via Orbit LOB</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Orbit connection status */}
          {orbitConfig?.connected && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Orbit Connected
            </span>
          )}

          <button
            onClick={() => navigate('/apps/test-issuer/offers')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Offers History
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Import Schema
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Category filter */}
      {catalog.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {CREDENTIAL_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading state */}
      {isLoading && catalog.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && catalog.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No credential schemas</h3>
          <p className="text-gray-500 mb-4">Import schemas from the VDR to start issuing test credentials</p>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Import Schema
          </button>
        </div>
      )}

      {/* Catalog grid */}
      {filteredCatalog.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{entry.name}</h3>
                  {entry.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{entry.description}</p>
                  )}
                </div>
              </div>

              {/* Category badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  {CREDENTIAL_CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                </span>
                {entry.vctUri && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                    Has VCT
                  </span>
                )}
              </div>

              {/* Schema URI */}
              <div className="text-xs text-gray-400 font-mono truncate mb-4" title={entry.schemaUri}>
                {entry.schemaUri}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t pt-3">
                <button
                  onClick={() => navigate(`/apps/test-issuer/issue/${entry.id}`)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Issue Credential
                </button>
                <button
                  onClick={() => handleRemove(entry.id, entry.name)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Import Schema from VDR</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schema URI <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={importSchemaUri}
                  onChange={(e) => setImportSchemaUri(e.target.value)}
                  placeholder="https://vdr.example.com/schemas/my-credential.json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">
                  URL to the JSON Schema in the VDR
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VCT URI (optional)
                </label>
                <input
                  type="url"
                  value={importVctUri}
                  onChange={(e) => setImportVctUri(e.target.value)}
                  placeholder="https://vdr.example.com/vct/my-credential.json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional VCT file for wallet display branding
                </p>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportSchemaUri('');
                  setImportVctUri('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importSchemaUri.trim() || isImporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
