/**
 * Credential Detail Component
 *
 * Displays detailed information about an imported credential,
 * including schema info, attributes, Orbit registration status, and source URLs.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCatalogueStore } from '../../../store/catalogueStore';
import type { CatalogueCredential } from '../../../types/catalogue';
import { PREDEFINED_ECOSYSTEM_TAGS } from '../../../types/catalogue';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export default function CredentialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { credentials, fetchCredentials, deleteCredential } = useCatalogueStore();

  const [credential, setCredential] = useState<CatalogueCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCredential = async () => {
      setIsLoading(true);
      setError(null);

      // First check if we have it in the store
      const existing = credentials.find((c) => c.id === id);
      if (existing) {
        setCredential(existing);
        setIsLoading(false);
        return;
      }

      // Otherwise fetch from API
      try {
        const response = await fetch(`${API_BASE}/api/credential-catalogue/${id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Credential not found');
          } else {
            throw new Error('Failed to fetch credential');
          }
          return;
        }

        const data = await response.json();
        setCredential(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load credential');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadCredential();
    }
  }, [id, credentials]);

  const handleDelete = async () => {
    if (!credential) return;
    if (confirm(`Delete "${credential.name}" from the catalogue?`)) {
      await deleteCredential(credential.id);
      navigate('/apps/credential-catalogue');
    }
  };

  const ecosystemTag = credential
    ? PREDEFINED_ECOSYSTEM_TAGS.find((t) => t.id === credential.ecosystemTag)
    : null;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            {error || 'Credential not found'}
          </h2>
          <p className="text-red-600 mb-4">
            The credential you're looking for may have been deleted or doesn't exist.
          </p>
          <button
            onClick={() => navigate('/apps/credential-catalogue')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/apps/credential-catalogue')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Catalogue
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{credential.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                v{credential.version}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {ecosystemTag?.name || credential.ecosystemTag}
              </span>
              <span className="text-sm text-gray-500">
                {credential.ledger}
              </span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete credential"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Issuer Info */}
        {credential.issuerName && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="text-gray-400">Issuer:</span>{' '}
              <span className="font-medium">{credential.issuerName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Orbit Registration Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Orbit Registration
        </h2>

        {credential.orbitRegistrationError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Registration Failed</p>
                <p className="text-sm text-yellow-700 mt-1">{credential.orbitRegistrationError}</p>
              </div>
            </div>
          </div>
        ) : credential.orbitSchemaId || credential.orbitCredDefId ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-green-800">Registered with Orbit</p>
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  {credential.orbitSchemaId && (
                    <p>Schema ID: <code className="bg-green-100 px-1 rounded">{credential.orbitSchemaId}</code></p>
                  )}
                  {credential.orbitCredDefId && (
                    <p>Cred Def ID: <code className="bg-green-100 px-1 rounded">{credential.orbitCredDefId}</code></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-gray-700">Not Registered with Orbit</p>
                <p className="text-sm text-gray-500 mt-1">
                  This credential was imported without Orbit registration. It can still be used for reference
                  but won't be available for verification through Orbit.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Identifiers */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          Identifiers
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Schema ID</label>
            <code className="block bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-800 font-mono break-all">
              {credential.schemaId}
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Credential Definition ID</label>
            <code className="block bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-800 font-mono break-all">
              {credential.credDefId}
            </code>
          </div>

          {credential.issuerDid && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Issuer DID</label>
              <code className="block bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-800 font-mono break-all">
                {credential.issuerDid}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Attributes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Attributes ({credential.attributes.length})
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {credential.attributes.map((attr, idx) => (
            <div
              key={idx}
              className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-700"
            >
              {attr}
            </div>
          ))}
        </div>
      </div>

      {/* Source URLs */}
      {(credential.schemaSourceUrl || credential.credDefSourceUrl) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Source URLs
          </h2>

          <div className="space-y-3">
            {credential.schemaSourceUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Schema URL</label>
                <a
                  href={credential.schemaSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {credential.schemaSourceUrl}
                </a>
              </div>
            )}

            {credential.credDefSourceUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Credential Definition URL</label>
                <a
                  href={credential.credDefSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {credential.credDefSourceUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Import Information</h2>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div>
            <span className="text-gray-400">Imported:</span>{' '}
            {new Date(credential.importedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          {credential.importedBy && (
            <div>
              <span className="text-gray-400">By:</span> {credential.importedBy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
