/**
 * Import Wizard Component
 *
 * Step-by-step wizard for importing credentials from IndyScan URLs.
 * Displayed as a modal overlay.
 */

import { useState, useEffect } from 'react';
import { useCatalogueStore } from '../../../store/catalogueStore';
import { PREDEFINED_ECOSYSTEM_TAGS } from '../../../types/catalogue';

type WizardStep = 'schema' | 'creddef' | 'details' | 'confirm';

interface ImportWizardProps {
  onClose: () => void;
  onComplete: (credentialId: string) => void;
}

export default function ImportWizard({ onClose, onComplete }: ImportWizardProps) {
  const {
    isLoading,
    error,
    errorDetails,
    parsedSchema,
    parsedCredDef,
    orbitStatus,
    parseSchemaUrl,
    parseCredDefUrl,
    importCredential,
    fetchOrbitStatus,
    clearParsedData,
    clearError,
  } = useCatalogueStore();

  const [step, setStep] = useState<WizardStep>('schema');
  const [schemaUrl, setSchemaUrl] = useState('');
  const [credDefUrl, setCredDefUrl] = useState('');
  const [ecosystemTagId, setEcosystemTagId] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [registerWithOrbit, setRegisterWithOrbit] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Fetch Orbit status on mount
  useEffect(() => {
    fetchOrbitStatus();
  }, [fetchOrbitStatus]);

  const handleParseSchema = async () => {
    try {
      clearError();
      await parseSchemaUrl(schemaUrl);
      setStep('creddef');
    } catch {
      // Error is handled in store
    }
  };

  const handleParseCredDef = async () => {
    try {
      clearError();
      await parseCredDefUrl(credDefUrl);
      setStep('details');
    } catch {
      // Error is handled in store
    }
  };

  const handleImport = async () => {
    if (!parsedSchema || !parsedCredDef || !ecosystemTagId) return;

    try {
      clearError();
      const credential = await importCredential({
        schemaData: parsedSchema,
        credDefData: parsedCredDef,
        ecosystemTagId,
        issuerName: issuerName || undefined,
        schemaSourceUrl: schemaUrl,
        credDefSourceUrl: credDefUrl,
        registerWithOrbit,
      });
      onComplete(credential.id);
    } catch {
      // Error is handled in store
    }
  };

  const handleCancel = () => {
    clearParsedData();
    clearError();
    onClose();
  };

  const handleBack = () => {
    clearError();
    if (step === 'creddef') {
      setStep('schema');
    } else if (step === 'details') {
      setStep('creddef');
    } else if (step === 'confirm') {
      setStep('details');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Import Credential</h1>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600">
              Import a credential from an Indy ledger using IndyScan URLs
            </p>
          </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['schema', 'creddef', 'details', 'confirm'] as const).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : i < ['schema', 'creddef', 'details', 'confirm'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < ['schema', 'creddef', 'details', 'confirm'].indexOf(step) ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className="w-12 h-0.5 bg-gray-200 ml-2" />}
          </div>
        ))}
      </div>

      {/* Error Display with Expandable Details */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
          <div className="p-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 font-medium">{error}</span>
              </div>
              {errorDetails && (
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showErrorDetails ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showErrorDetails ? 'Hide' : 'Show'} technical details
                </button>
              )}
            </div>
            <button
              onClick={() => {
                clearError();
                setShowErrorDetails(false);
              }}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Expandable Error Details */}
          {showErrorDetails && errorDetails && (
            <div className="border-t border-red-200 bg-red-100/50 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {errorDetails.statusCode && (
                  <div>
                    <span className="text-red-600 font-medium">Status Code:</span>
                    <span className="ml-2 text-red-800">{errorDetails.statusCode}</span>
                  </div>
                )}
                {errorDetails.timestamp && (
                  <div>
                    <span className="text-red-600 font-medium">Time:</span>
                    <span className="ml-2 text-red-800">
                      {new Date(errorDetails.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {errorDetails.requestUrl && (
                <div className="text-sm">
                  <span className="text-red-600 font-medium">Request URL:</span>
                  <code className="block mt-1 p-2 bg-white rounded border border-red-200 text-red-800 text-xs font-mono break-all">
                    {errorDetails.requestMethod} {errorDetails.requestUrl}
                  </code>
                </div>
              )}

              {errorDetails.requestPayload && (
                <div className="text-sm">
                  <span className="text-red-600 font-medium">Request Payload:</span>
                  <pre className="mt-1 p-2 bg-white rounded border border-red-200 text-red-800 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(errorDetails.requestPayload, null, 2)}
                  </pre>
                </div>
              )}

              {errorDetails.responseBody && (
                <div className="text-sm">
                  <span className="text-red-600 font-medium">Response Body:</span>
                  <pre className="mt-1 p-2 bg-white rounded border border-red-200 text-red-800 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(errorDetails.responseBody), null, 2);
                      } catch {
                        return errorDetails.responseBody;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Schema URL */}
      {step === 'schema' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Enter Schema URL</h2>
          <p className="text-gray-600 mb-4">
            Paste the IndyScan URL for the schema you want to import.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IndyScan Schema URL
            </label>
            <input
              type="url"
              value={schemaUrl}
              onChange={(e) => setSchemaUrl(e.target.value)}
              placeholder="https://candyscan.idlab.org/tx/CANDY_DEV/domain/123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: https://candyscan.idlab.org/tx/CANDY_DEV/domain/123
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleParseSchema}
              disabled={!schemaUrl || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Parse Schema
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Credential Definition URL */}
      {step === 'creddef' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Enter Credential Definition URL</h2>

          {/* Parsed Schema Summary */}
          {parsedSchema && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schema Parsed Successfully
              </div>
              <p className="text-sm text-green-600">
                {parsedSchema.name} v{parsedSchema.version} ({parsedSchema.attributes.length} attributes)
              </p>
            </div>
          )}

          <p className="text-gray-600 mb-4">
            Now paste the IndyScan URL for the credential definition.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IndyScan Credential Definition URL
            </label>
            <input
              type="url"
              value={credDefUrl}
              onChange={(e) => setCredDefUrl(e.target.value)}
              placeholder="https://candyscan.idlab.org/tx/CANDY_DEV/domain/456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handleParseCredDef}
              disabled={!credDefUrl || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Parse Credential Definition
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 'details' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Add Details</h2>

          {/* Parsed Summary */}
          {parsedSchema && parsedCredDef && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schema & Credential Definition Parsed
              </div>
              <p className="text-sm text-green-600">
                {parsedSchema.name} v{parsedSchema.version}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ecosystem Tag *
              </label>
              <select
                value={ecosystemTagId}
                onChange={(e) => setEcosystemTagId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select ecosystem...</option>
                {PREDEFINED_ECOSYSTEM_TAGS.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issuer Name (optional)
              </label>
              <input
                type="text"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="e.g., BC Gov, Sovrin Foundation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                A human-readable name for the credential issuer
              </p>
            </div>

            {/* Orbit Registration Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    id="registerWithOrbit"
                    checked={registerWithOrbit}
                    onChange={(e) => setRegisterWithOrbit(e.target.checked)}
                    disabled={!orbitStatus?.configured}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="registerWithOrbit"
                    className={`font-medium ${orbitStatus?.configured ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    Register with Orbit
                  </label>
                  <p className={`text-sm ${orbitStatus?.configured ? 'text-gray-600' : 'text-gray-400'}`}>
                    Store schema and credential definition in Orbit for use with verification workflows
                  </p>
                  {!orbitStatus?.configured && (
                    <p className="text-sm text-amber-600 mt-1">
                      Orbit Credential Management API not configured. Configure in Settings → Orbit.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!ecosystemTagId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review Import
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && parsedSchema && parsedCredDef && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Confirm Import</h2>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Credential Details</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-900">{parsedSchema.name}</dd>
                <dt className="text-gray-500">Version</dt>
                <dd className="text-gray-900">{parsedSchema.version}</dd>
                <dt className="text-gray-500">Ledger</dt>
                <dd className="text-gray-900">{parsedSchema.ledger}</dd>
                <dt className="text-gray-500">Ecosystem</dt>
                <dd className="text-gray-900">
                  {PREDEFINED_ECOSYSTEM_TAGS.find((t) => t.id === ecosystemTagId)?.name}
                </dd>
                {issuerName && (
                  <>
                    <dt className="text-gray-500">Issuer</dt>
                    <dd className="text-gray-900">{issuerName}</dd>
                  </>
                )}
                <dt className="text-gray-500">Orbit Registration</dt>
                <dd className="text-gray-900">
                  {registerWithOrbit ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </dd>
              </dl>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Attributes ({parsedSchema.attributes.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {parsedSchema.attributes.map((attr) => (
                  <span
                    key={attr}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-700"
                  >
                    {attr}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Verification Only</p>
                  <p className="text-sm text-amber-700">
                    This credential can only be used for verification, not for issuance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Import Credential
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
