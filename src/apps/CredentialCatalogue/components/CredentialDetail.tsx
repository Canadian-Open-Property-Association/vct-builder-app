/**
 * Credential Detail Component
 *
 * Displays detailed information about an imported credential.
 * Follows the same pattern as EntityDetail in EntityManager.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCatalogueStore } from '../../../store/catalogueStore';
import { useEntityStore } from '../../../store/entityStore';
import { useLogoStore } from '../../../store/logoStore';
import type { CatalogueCredential, OrbitOperationLog } from '../../../types/catalogue';

interface CredentialDetailProps {
  credential: CatalogueCredential;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Parsed error structure with all possible fields
interface ParsedOrbitError {
  summary: string;
  statusCode?: number;
  details?: Record<string, unknown> | null;
  rawResponse?: string;
  requestUrl?: string;
  requestPayload?: Record<string, unknown>;
  failedStep?: 'schema' | 'creddef';
}

// Parse Orbit error to extract structured details
function parseOrbitError(errorString: string): ParsedOrbitError {
  // Pattern: "Failed to import schema to Orbit: 400 - {...json...}"
  const match = errorString.match(/^(.*?):\s*(\d+)\s*-\s*(.*)$/);
  if (match) {
    const [, prefix, status, jsonPart] = match;
    try {
      const parsed = JSON.parse(jsonPart);
      return {
        summary: parsed.message || prefix,
        statusCode: parseInt(status, 10),
        details: parsed,
        rawResponse: jsonPart,
      };
    } catch {
      return {
        summary: prefix,
        statusCode: parseInt(status, 10),
        rawResponse: jsonPart,
      };
    }
  }
  return { summary: errorString };
}

// Component to display a single Orbit operation log
interface OrbitLogEntryProps {
  title: string;
  log: OrbitOperationLog;
  isExpanded: boolean;
  onToggle: () => void;
}

function OrbitLogEntry({ title, log, isExpanded, onToggle }: OrbitLogEntryProps) {
  const bgColor = log.success ? 'bg-green-50' : 'bg-red-50';
  const borderColor = log.success ? 'border-green-200' : 'border-red-200';
  const iconColor = log.success ? 'text-green-600' : 'text-red-600';
  const textColor = log.success ? 'text-green-800' : 'text-red-800';
  const lightTextColor = log.success ? 'text-green-700' : 'text-red-700';
  const expandedBg = log.success ? 'bg-green-100/50' : 'bg-red-100/50';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-opacity-80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {log.success ? (
            <svg className={`w-4 h-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className={`w-4 h-4 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={`text-sm font-medium ${textColor}`}>{title}</span>
          <span className={`text-xs ${lightTextColor}`}>
            {log.success ? 'Success' : 'Failed'}
            {log.statusCode && ` (${log.statusCode})`}
          </span>
        </div>
        <svg
          className={`w-4 h-4 ${lightTextColor} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className={`border-t ${borderColor} ${expandedBg} p-3 space-y-3`}>
          {/* Timestamp */}
          <div className="text-xs">
            <span className={`${lightTextColor} font-medium`}>Timestamp:</span>
            <span className={`ml-2 ${textColor}`}>{formatDateTime(log.timestamp)}</span>
          </div>

          {/* Status Code */}
          {log.statusCode && (
            <div className="text-xs">
              <span className={`${lightTextColor} font-medium`}>Status Code:</span>
              <span className={`ml-2 ${textColor}`}>{log.statusCode}</span>
            </div>
          )}

          {/* Error Message */}
          {log.errorMessage && (
            <div className="text-xs">
              <span className={`${lightTextColor} font-medium`}>Error:</span>
              <span className={`ml-2 ${textColor}`}>{log.errorMessage}</span>
            </div>
          )}

          {/* Request URL */}
          {log.requestUrl && (
            <div className="text-xs">
              <span className={`${lightTextColor} font-medium`}>Request URL:</span>
              <code className={`block mt-1 p-2 bg-white rounded border ${borderColor} ${textColor} text-xs font-mono break-all`}>
                POST {log.requestUrl}
              </code>
            </div>
          )}

          {/* Request Payload */}
          {log.requestPayload && Object.keys(log.requestPayload).length > 0 && (
            <div className="text-xs">
              <span className={`${lightTextColor} font-medium`}>Request Payload:</span>
              <pre className={`mt-1 p-2 bg-white rounded border ${borderColor} ${textColor} text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap`}>
                {JSON.stringify(log.requestPayload, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Body */}
          {log.responseBody && (
            <div className="text-xs">
              <span className={`${lightTextColor} font-medium`}>Response Body:</span>
              <pre className={`mt-1 p-2 bg-white rounded border ${borderColor} ${textColor} text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap`}>
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(log.responseBody), null, 2);
                  } catch {
                    return log.responseBody;
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CredentialDetail({ credential }: CredentialDetailProps) {
  const { deleteCredential, clearSelection, updateCredential, ecosystemTags, fetchTags } =
    useCatalogueStore();
  const { entities, fetchEntities } = useEntityStore();
  const { getLogoUrl, fetchLogos } = useLogoStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState(credential.ecosystemTag || 'other');
  const [isUpdatingTag, setIsUpdatingTag] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [expandedLogSection, setExpandedLogSection] = useState<'schema' | 'creddef' | null>(null);

  // Fetch tags and entities on mount
  useEffect(() => {
    fetchTags();
    fetchEntities();
    fetchLogos();
  }, [fetchTags, fetchEntities, fetchLogos]);

  // Get issuer entity if available
  const issuerEntity = credential.issuerEntityId
    ? entities.find((e) => e.id === credential.issuerEntityId)
    : null;

  // Get issuer logo URL
  const issuerLogoUrl = issuerEntity
    ? getLogoUrl(issuerEntity.id, issuerEntity.logoUri)
    : null;

  // Get issuer's brand color for banner (fallback to purple)
  const bannerColor = issuerEntity?.primaryColor || '#7c3aed'; // purple-600 as fallback

  // Reset selected tag when credential changes
  useEffect(() => {
    setSelectedTagId(credential.ecosystemTag || 'other');
    setIsEditingTag(false);
  }, [credential.id, credential.ecosystemTag]);

  const ecosystemTag = ecosystemTags.find((t) => t.id === credential.ecosystemTag);

  const handleSaveTag = async () => {
    if (selectedTagId === credential.ecosystemTag) {
      setIsEditingTag(false);
      return;
    }

    setIsUpdatingTag(true);
    try {
      await updateCredential(credential.id, { ecosystemTag: selectedTagId });
      setIsEditingTag(false);
    } catch (err) {
      console.error('Failed to update ecosystem tag:', err);
    } finally {
      setIsUpdatingTag(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedTagId(credential.ecosystemTag || 'other');
    setIsEditingTag(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCredential(credential.id);
      clearSelection();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete credential:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Banner Header - uses issuer's brand color */}
      <div
        className="h-16 relative"
        style={{ background: `linear-gradient(to right, ${bannerColor}, ${bannerColor}dd)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20" />
      </div>

      {/* Content area */}
      <div className="px-6 pb-6">
        {/* Icon overlapping banner */}
        <div className="flex items-end -mt-6 relative z-10 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white shadow-lg border-4 border-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <svg
              className="w-6 h-6"
              style={{ color: bannerColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>

        {/* Name and badges */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-gray-900">{credential.name}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              v{credential.version}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isEditingTag ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="text-xs px-2 py-1 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isUpdatingTag}
                >
                  {ecosystemTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveTag}
                  disabled={isUpdatingTag}
                  className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                  title="Save"
                >
                  {isUpdatingTag ? (
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
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdatingTag}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingTag(true)}
                className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                title="Click to edit ecosystem tag"
              >
                {ecosystemTag?.name || credential.ecosystemTag}
                <svg
                  className="w-3 h-3 text-purple-400 group-hover:text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Issuer Info */}
        {(credential.issuerName || issuerEntity) && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {/* Issuer Logo */}
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {issuerLogoUrl ? (
                  <img
                    src={issuerLogoUrl}
                    alt={issuerEntity?.name || credential.issuerName || 'Issuer'}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                )}
              </div>

              {/* Issuer Name & Link */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Issuer</p>
                {issuerEntity ? (
                  <Link
                    to={`/apps/entity-manager?entity=${issuerEntity.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {issuerEntity.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-gray-900">
                    {credential.issuerName}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orbit Registration Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            Orbit Registration
          </h3>

          {/* Check if we have the new log format or legacy format */}
          {credential.orbitSchemaLog || credential.orbitCredDefLog ? (
            /* New log-based display */
            <div className="space-y-3">
              {/* Orbit IDs Summary */}
              {(credential.orbitSchemaId || credential.orbitCredDefId) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-blue-800 mb-2">Orbit IDs</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-blue-600">Schema ID:</span>
                      <code className="ml-1 bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
                        {credential.orbitSchemaId || 'N/A'}
                      </code>
                    </div>
                    <div>
                      <span className="text-blue-600">Cred Def ID:</span>
                      <code className="ml-1 bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
                        {credential.orbitCredDefId || 'N/A'}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Schema Import Log */}
              {credential.orbitSchemaLog && (
                <OrbitLogEntry
                  title="Schema Import"
                  log={credential.orbitSchemaLog}
                  isExpanded={expandedLogSection === 'schema'}
                  onToggle={() => setExpandedLogSection(expandedLogSection === 'schema' ? null : 'schema')}
                />
              )}

              {/* Cred Def Import Log */}
              {credential.orbitCredDefLog && (
                <OrbitLogEntry
                  title="Credential Definition Import"
                  log={credential.orbitCredDefLog}
                  isExpanded={expandedLogSection === 'creddef'}
                  onToggle={() => setExpandedLogSection(expandedLogSection === 'creddef' ? null : 'creddef')}
                />
              )}
            </div>
          ) : credential.orbitRegistrationError ? (
            /* Legacy error display */
            (() => {
              const errorDetails = credential.orbitRegistrationErrorDetails;
              const parsedError: ParsedOrbitError = errorDetails
                ? {
                    summary: (() => {
                      try {
                        const parsed = JSON.parse(errorDetails.responseBody || '{}');
                        return parsed.message || errorDetails.message;
                      } catch {
                        return errorDetails.message;
                      }
                    })(),
                    statusCode: errorDetails.statusCode,
                    requestUrl: errorDetails.requestUrl,
                    requestPayload: errorDetails.requestPayload,
                    rawResponse: errorDetails.responseBody,
                    failedStep: errorDetails.failedStep,
                    details: (() => {
                      try {
                        return JSON.parse(errorDetails.responseBody || '{}');
                      } catch {
                        return null;
                      }
                    })(),
                  }
                : parseOrbitError(credential.orbitRegistrationError);

              const hasDetails =
                parsedError.statusCode ||
                parsedError.rawResponse ||
                parsedError.requestUrl ||
                parsedError.requestPayload;

              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">Registration Failed (Legacy)</p>
                        <p className="text-xs text-yellow-700 mt-1">{parsedError.summary}</p>
                        {hasDetails && (
                          <button
                            onClick={() => setShowErrorDetails(!showErrorDetails)}
                            className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 flex items-center gap-1"
                          >
                            <svg
                              className={`w-3 h-3 transition-transform ${showErrorDetails ? 'rotate-90' : ''}`}
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
                    </div>
                  </div>

                  {showErrorDetails && hasDetails && (
                    <div className="border-t border-yellow-200 bg-yellow-100/50 p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {parsedError.statusCode && (
                          <div>
                            <span className="text-yellow-700 font-medium">Status Code:</span>
                            <span className="ml-2 text-yellow-800">{parsedError.statusCode}</span>
                          </div>
                        )}
                        {parsedError.failedStep && (
                          <div>
                            <span className="text-yellow-700 font-medium">Failed Step:</span>
                            <span className="ml-2 text-yellow-800">
                              {parsedError.failedStep === 'schema' ? 'Schema Import' : 'Cred Def Import'}
                            </span>
                          </div>
                        )}
                      </div>
                      {parsedError.requestUrl && (
                        <div className="text-xs">
                          <span className="text-yellow-700 font-medium">Request URL:</span>
                          <code className="block mt-1 p-2 bg-white rounded border border-yellow-200 text-yellow-800 text-xs font-mono break-all">
                            POST {parsedError.requestUrl}
                          </code>
                        </div>
                      )}
                      {parsedError.requestPayload && (
                        <div className="text-xs">
                          <span className="text-yellow-700 font-medium">Request Payload:</span>
                          <pre className="mt-1 p-2 bg-white rounded border border-yellow-200 text-yellow-800 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {JSON.stringify(parsedError.requestPayload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {parsedError.rawResponse && (
                        <div className="text-xs">
                          <span className="text-yellow-700 font-medium">Response Body:</span>
                          <pre className="mt-1 p-2 bg-white rounded border border-yellow-200 text-yellow-800 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(parsedError.rawResponse), null, 2);
                              } catch {
                                return parsedError.rawResponse;
                              }
                            })()}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : credential.orbitSchemaId || credential.orbitCredDefId ? (
            /* Legacy success display */
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Registered with Orbit</p>
                  <div className="mt-1 space-y-1 text-xs text-green-700">
                    {credential.orbitSchemaId && (
                      <p>
                        Schema ID:{' '}
                        <code className="bg-green-100 px-1 rounded">
                          {credential.orbitSchemaId}
                        </code>
                      </p>
                    )}
                    {credential.orbitCredDefId && (
                      <p>
                        Cred Def ID:{' '}
                        <code className="bg-green-100 px-1 rounded">
                          {credential.orbitCredDefId}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Not registered */
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700">Not Registered with Orbit</p>
                  <p className="text-xs text-gray-500 mt-1">
                    This credential was imported without Orbit registration.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Identifiers */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
            Identifiers
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Schema ID</label>
              <code className="block bg-white px-3 py-2 rounded border border-gray-200 text-xs text-gray-800 font-mono break-all mt-1">
                {credential.schemaId}
              </code>
            </div>

            <div>
              <label className="text-xs text-gray-500">Credential Definition ID</label>
              <code className="block bg-white px-3 py-2 rounded border border-gray-200 text-xs text-gray-800 font-mono break-all mt-1">
                {credential.credDefId}
              </code>
            </div>

            {credential.issuerDid && (
              <div>
                <label className="text-xs text-gray-500">Issuer DID</label>
                <code className="block bg-white px-3 py-2 rounded border border-gray-200 text-xs text-gray-800 font-mono break-all mt-1">
                  {credential.issuerDid}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Attributes */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            Attributes ({credential.attributes.length})
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {credential.attributes.map((attr, idx) => (
              <div
                key={idx}
                className="px-3 py-2 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
              >
                {attr}
              </div>
            ))}
          </div>
        </div>

        {/* Verifiable Data Registry Information */}
        {(credential.ledger || credential.schemaSourceUrl || credential.credDefSourceUrl) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
              Verifiable Data Registry Information
            </h3>

            <div className="space-y-3">
              {credential.ledger && (
                <div>
                  <label className="text-xs text-gray-500">Ledger</label>
                  <p className="text-sm font-medium text-gray-800 mt-1">{credential.ledger}</p>
                </div>
              )}

              {credential.schemaSourceUrl && (
                <div>
                  <label className="text-xs text-gray-500">Schema URL</label>
                  <a
                    href={credential.schemaSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:text-blue-800 break-all mt-1"
                  >
                    {credential.schemaSourceUrl}
                  </a>
                </div>
              )}

              {credential.credDefSourceUrl && (
                <div>
                  <label className="text-xs text-gray-500">Credential Definition URL</label>
                  <a
                    href={credential.credDefSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:text-blue-800 break-all mt-1"
                  >
                    {credential.credDefSourceUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <span>Imported {formatDateTime(credential.importedAt)}</span>
            {credential.importedBy && <span> by {credential.importedBy}</span>}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-700">Danger Zone</h4>
              <p className="text-xs text-gray-500 mt-0.5">Remove this credential from catalogue</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Credential</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{credential.name}</span>? This will remove it from
                your catalogue.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
