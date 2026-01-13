/**
 * Credential Sidebar
 *
 * Left panel showing list of issuable credentials from the Credential Catalogue.
 * Displays credentials that have been cloned and enabled for issuance.
 */

import { useEffect } from 'react';
import { useCatalogueStore } from '../../../store/catalogueStore';
import type { CatalogueCredential } from '../../../types/catalogue';

interface CredentialSidebarProps {
  selectedCredential: CatalogueCredential | null;
  onSelectCredential: (credential: CatalogueCredential) => void;
}

export default function CredentialSidebar({
  selectedCredential,
  onSelectCredential,
}: CredentialSidebarProps) {
  const { credentials, fetchCredentials, isLoading, error } = useCatalogueStore();

  // Fetch credentials on mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Filter to only cloned credentials that are enabled for issuance
  const issuableCredentials = credentials.filter(
    (c) => c.clonedAt && c.enabledForIssuance
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
          >
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
          <p className="text-sm text-gray-500">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-4 bg-white border-r border-gray-200">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (issuableCredentials.length === 0) {
    return (
      <div className="h-full bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Credentials</h2>
          <p className="text-xs text-gray-500 mt-1">Select a credential to issue</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Credentials Available</h3>
            <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
              Clone a credential in the Credential Catalogue and enable it for issuance in Settings
              to see it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Credentials</h2>
        <p className="text-xs text-gray-500 mt-1">
          {issuableCredentials.length} credential{issuableCredentials.length !== 1 ? 's' : ''}{' '}
          available
        </p>
      </div>

      {/* Credential List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {issuableCredentials.map((credential) => (
          <button
            key={credential.id}
            onClick={() => onSelectCredential(credential)}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              selectedCredential?.id === credential.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <h3
              className={`text-sm font-medium truncate ${
                selectedCredential?.id === credential.id ? 'text-purple-700' : 'text-gray-900'
              }`}
            >
              {credential.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">v{credential.version}</span>
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                {credential.ecosystemTag}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {credential.attributes.length} attribute{credential.attributes.length !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
