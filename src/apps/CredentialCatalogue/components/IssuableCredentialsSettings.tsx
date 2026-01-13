/**
 * Issuable Credentials Settings
 *
 * Settings tab for managing which cloned credentials are available in Test Issuer.
 * Only shows credentials that have been cloned (have clonedAt field).
 */

import { useState } from 'react';
import { useCatalogueStore } from '../../../store/catalogueStore';

interface IssuableCredentialsSettingsProps {
  onSaving?: (saving: boolean) => void;
}

export default function IssuableCredentialsSettings({
  onSaving,
}: IssuableCredentialsSettingsProps) {
  const { credentials, toggleIssuanceEnabled, isLoading } = useCatalogueStore();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get only cloned credentials
  const clonedCredentials = credentials.filter((c) => c.clonedAt);

  const handleToggle = async (credentialId: string, currentEnabled: boolean) => {
    setSavingId(credentialId);
    setError(null);
    onSaving?.(true);

    try {
      await toggleIssuanceEnabled(credentialId, !currentEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSavingId(null);
      onSaving?.(false);
    }
  };

  if (clonedCredentials.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900">Issuable Credentials</h3>
          <p className="text-sm text-gray-500 mt-1">
            Control which cloned credentials are available in the Test Issuer app.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
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
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">No Cloned Credentials</h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Clone a credential for issuance from the credential detail view to make it available
            here. Only cloned credentials can be issued through the Test Issuer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-gray-900">Issuable Credentials</h3>
        <p className="text-sm text-gray-500 mt-1">
          Toggle which cloned credentials are available in the Test Issuer app.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {clonedCredentials.map((credential) => (
          <div
            key={credential.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 truncate">{credential.name}</h4>
                <span className="text-xs text-gray-500">v{credential.version}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                  {credential.ecosystemTag}
                </span>
                {credential.clonedOrbitCredDefId && (
                  <span className="text-xs text-gray-400">
                    Orbit Cred Def: {credential.clonedOrbitCredDefId}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <span
                className={`text-xs font-medium ${
                  credential.enabledForIssuance ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {credential.enabledForIssuance ? 'Enabled' : 'Disabled'}
              </span>

              <button
                onClick={() => handleToggle(credential.id, credential.enabledForIssuance || false)}
                disabled={isLoading || savingId === credential.id}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  credential.enabledForIssuance ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    credential.enabledForIssuance ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {savingId === credential.id && (
                    <svg
                      className="animate-spin h-3 w-3 text-purple-600 absolute top-1 left-1"
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
                  )}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-500">
          <strong>Note:</strong> Only credentials that have been cloned for issuance appear here.
          Enabled credentials will be available for selection in the Test Issuer app.
        </p>
      </div>
    </div>
  );
}
