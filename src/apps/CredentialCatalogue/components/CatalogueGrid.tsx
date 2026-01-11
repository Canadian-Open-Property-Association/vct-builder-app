/**
 * Catalogue Grid Component
 *
 * Displays imported credentials in a card grid layout.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogueStore } from '../../../store/catalogueStore';
import type { CatalogueCredential } from '../../../types/catalogue';
import { PREDEFINED_ECOSYSTEM_TAGS } from '../../../types/catalogue';

function CredentialCard({ credential }: { credential: CatalogueCredential }) {
  const navigate = useNavigate();
  const { deleteCredential } = useCatalogueStore();

  const ecosystemTag = PREDEFINED_ECOSYSTEM_TAGS.find((t) => t.id === credential.ecosystemTag);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${credential.name}" from the catalogue?`)) {
      await deleteCredential(credential.id);
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
      onClick={() => navigate(`/apps/credential-catalogue/${credential.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{credential.name}</h3>
          <p className="text-sm text-gray-500">v{credential.version}</p>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Ecosystem Tag */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {ecosystemTag?.name || credential.ecosystemTag}
        </span>
      </div>

      {/* Issuer */}
      {credential.issuerName && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="text-gray-400">Issuer:</span> {credential.issuerName}
        </p>
      )}

      {/* Attributes */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        <span>{credential.attributes.length} attributes</span>
      </div>

      {/* Ledger */}
      <div className="mt-2 text-xs text-gray-400">
        {credential.ledger}
      </div>
    </div>
  );
}

export default function CatalogueGrid() {
  const navigate = useNavigate();
  const { credentials, isLoading, error, fetchCredentials, clearError } = useCatalogueStore();

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credential Catalogue</h1>
          <p className="text-gray-600 mt-1">
            Import and manage external AnonCreds credentials for verification testing
          </p>
        </div>
        <button
          onClick={() => navigate('/apps/credential-catalogue/import')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import Credential
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-700">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && credentials.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && credentials.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No credentials imported yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Import credentials from external ecosystems like BC Digital Trust, Sovrin, or CANdy
            to use them in verification testing.
          </p>
          <button
            onClick={() => navigate('/apps/credential-catalogue/import')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Import Your First Credential
          </button>
        </div>
      )}

      {/* Credential Grid */}
      {credentials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map((credential) => (
            <CredentialCard key={credential.id} credential={credential} />
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-900">About Imported Credentials</h4>
            <p className="text-sm text-blue-800 mt-1">
              Credentials imported here are for <strong>verification only</strong>.
              They cannot be used for issuance. Use the Test Issuer app for credentials
              you can issue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
