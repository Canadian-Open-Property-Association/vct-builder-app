/**
 * CredentialFieldConfig Component
 *
 * Configuration panel for Verifiable Credential fields.
 * Allows selecting a credential from the VCT library and choosing attributes to verify.
 */

import { useState, useEffect } from 'react';
import {
  FormField,
  PredicateOperator,
  PREDICATE_OPERATOR_LABELS,
} from '../../../types/forms';
import {
  ParsedSchemaProperty,
  parseJsonSchema,
  flattenSchemaProperties,
} from '../../../types/vct';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface VctFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

interface VctContent {
  vct: string;
  name: string;
  description?: string;
  schema_uri: string;
  claims?: {
    path: (string | number | null)[];
    display?: { label: string; locale: string }[];
    mandatory?: boolean;
  }[];
}

interface CredentialFieldConfigProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}

export default function CredentialFieldConfig({ field, onUpdate }: CredentialFieldConfigProps) {
  const [vctLibrary, setVctLibrary] = useState<VctFile[]>([]);
  const [selectedVct, setSelectedVct] = useState<VctContent | null>(null);
  const [schemaProperties, setSchemaProperties] = useState<ParsedSchemaProperty[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoadingVct, setIsLoadingVct] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch VCT library on mount
  useEffect(() => {
    fetchVctLibrary();
  }, []);

  // If field already has a credential configured, load it
  useEffect(() => {
    if (field.credentialConfig?.credentialLibraryId && !selectedVct) {
      loadVctByFilename(field.credentialConfig.credentialLibraryId);
    }
  }, [field.credentialConfig?.credentialLibraryId]);

  const fetchVctLibrary = async () => {
    setIsLoadingLibrary(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/github/vct-library`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch VCT library');
      }

      const data = await response.json();
      setVctLibrary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credential library');
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const loadVctByFilename = async (filename: string) => {
    setIsLoadingVct(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/github/vct/${filename}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch VCT');
      }

      const data = await response.json();
      setSelectedVct(data.content);

      // Load schema properties if schema_uri exists
      if (data.content.schema_uri) {
        await loadSchemaProperties(data.content.schema_uri);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credential');
    } finally {
      setIsLoadingVct(false);
    }
  };

  const loadSchemaProperties = async (schemaUri: string) => {
    setIsLoadingSchema(true);

    try {
      // Fetch the schema from the URI
      const response = await fetch(schemaUri);
      if (!response.ok) {
        throw new Error('Failed to fetch schema');
      }

      const schema = await response.json();
      const parsed = parseJsonSchema(schema);
      const flattened = flattenSchemaProperties(parsed.properties);
      setSchemaProperties(flattened);
    } catch (err) {
      console.error('Failed to load schema:', err);
      setSchemaProperties([]);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleCredentialSelect = async (filename: string) => {
    if (!filename) {
      setSelectedVct(null);
      setSchemaProperties([]);
      onUpdate({
        credentialConfig: {
          ...field.credentialConfig,
          credentialLibraryId: undefined,
          schemaId: undefined,
          attributePath: undefined,
        },
      });
      return;
    }

    await loadVctByFilename(filename);

    onUpdate({
      credentialConfig: {
        ...field.credentialConfig,
        credentialLibraryId: filename,
      },
    });
  };

  const handleAttributeSelect = (attributePath: string) => {
    onUpdate({
      credentialConfig: {
        ...field.credentialConfig,
        attributePath,
      },
    });
  };

  const formatPropertyPath = (prop: ParsedSchemaProperty): string => {
    // Skip credentialSubject prefix for display
    const displayPath = prop.path.filter(p => p !== 'credentialSubject');
    return displayPath.join('.');
  };

  const getCredentialDisplayName = (vct: VctContent): string => {
    return vct.name || vct.vct || 'Unknown Credential';
  };

  return (
    <div className="border-t pt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Credential Proof Configuration
      </h4>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Credential Selection */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Credential Type
        </label>
        {isLoadingLibrary ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            Loading credentials...
          </div>
        ) : (
          <select
            value={field.credentialConfig?.credentialLibraryId || ''}
            onChange={(e) => handleCredentialSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a credential --</option>
            {vctLibrary.map((vct) => (
              <option key={vct.name} value={vct.name}>
                {vct.name.replace('.json', '')}
              </option>
            ))}
          </select>
        )}
        {vctLibrary.length === 0 && !isLoadingLibrary && (
          <p className="text-xs text-gray-500 mt-1">
            No credentials found in the library. Make sure you have access to the VCT repository.
          </p>
        )}
      </div>

      {/* Selected Credential Info */}
      {selectedVct && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">
                {getCredentialDisplayName(selectedVct)}
              </p>
              {selectedVct.description && (
                <p className="text-xs text-blue-700 mt-1">{selectedVct.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attribute Selection */}
      {selectedVct && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute to Verify
          </label>
          {isLoadingSchema || isLoadingVct ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              Loading attributes...
            </div>
          ) : schemaProperties.length > 0 ? (
            <select
              value={field.credentialConfig?.attributePath || ''}
              onChange={(e) => handleAttributeSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select an attribute --</option>
              {schemaProperties.map((prop) => {
                const pathStr = formatPropertyPath(prop);
                return (
                  <option key={prop.path.join('.')} value={pathStr}>
                    {pathStr} ({prop.type})
                    {prop.required ? ' *' : ''}
                  </option>
                );
              })}
            </select>
          ) : selectedVct.claims && selectedVct.claims.length > 0 ? (
            // Fallback: use claims from VCT if schema parsing failed
            <select
              value={field.credentialConfig?.attributePath || ''}
              onChange={(e) => handleAttributeSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select an attribute --</option>
              {selectedVct.claims.map((claim, idx) => {
                const pathStr = claim.path.filter(p => p !== 'credentialSubject' && p !== null).join('.');
                const label = claim.display?.find(d => d.locale === 'en-CA')?.label || pathStr;
                return (
                  <option key={idx} value={pathStr}>
                    {label}
                    {claim.mandatory ? ' *' : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="text-sm text-gray-500">
              <input
                type="text"
                value={field.credentialConfig?.attributePath || ''}
                onChange={(e) => handleAttributeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="e.g., credit_score, annual_income"
              />
              <p className="text-xs text-gray-400 mt-1">
                Manually enter the attribute path
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            The credential attribute that will be verified
          </p>
        </div>
      )}

      {/* Predicate Configuration */}
      {selectedVct && field.credentialConfig?.attributePath && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`enable-predicate-${field.id}`}
              checked={!!field.credentialConfig?.predicate}
              onChange={(e) => {
                if (e.target.checked) {
                  onUpdate({
                    credentialConfig: {
                      ...field.credentialConfig,
                      predicate: {
                        operator: '==',
                        value: '',
                      },
                    },
                  });
                } else {
                  const { predicate, ...rest } = field.credentialConfig || {};
                  onUpdate({
                    credentialConfig: rest,
                  });
                }
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={`enable-predicate-${field.id}`} className="text-sm font-medium text-gray-700">
              Predicate Rule (optional)
            </label>
          </div>
          {field.credentialConfig?.predicate && (
            <>
              <div className="flex gap-2">
                <select
                  value={field.credentialConfig?.predicate?.operator || '=='}
                  onChange={(e) =>
                    onUpdate({
                      credentialConfig: {
                        ...field.credentialConfig,
                        predicate: {
                          operator: e.target.value as PredicateOperator,
                          value: field.credentialConfig?.predicate?.value ?? '',
                        },
                      },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(Object.entries(PREDICATE_OPERATOR_LABELS) as [PredicateOperator, string][]).map(
                    ([op, label]) => (
                      <option key={op} value={op}>
                        {op} ({label})
                      </option>
                    )
                  )}
                </select>
                <input
                  type="text"
                  value={String(field.credentialConfig?.predicate?.value ?? '')}
                  onChange={(e) => {
                    let value: string | number | boolean = e.target.value;
                    if (e.target.value === 'true') value = true;
                    else if (e.target.value === 'false') value = false;
                    else if (!isNaN(Number(e.target.value)) && e.target.value !== '') {
                      value = Number(e.target.value);
                    }
                    onUpdate({
                      credentialConfig: {
                        ...field.credentialConfig,
                        predicate: {
                          operator: field.credentialConfig?.predicate?.operator || '==',
                          value,
                        },
                      },
                    });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="e.g., 680, true, 50000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The condition the credential attribute must satisfy
              </p>
            </>
          )}
        </div>
      )}

      {/* Accepted Issuers */}
      {selectedVct && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Accepted Issuers (optional)
          </label>
          <input
            type="text"
            value={field.credentialConfig?.acceptedIssuers?.join(', ') || ''}
            onChange={(e) =>
              onUpdate({
                credentialConfig: {
                  ...field.credentialConfig,
                  acceptedIssuers: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0),
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g., Equifax, TransUnion, CRA"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of trusted credential issuers
          </p>
        </div>
      )}

      {/* Schema/CredDef IDs - Advanced Options */}
      {selectedVct && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
            Advanced Options
          </summary>
          <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schema ID (optional)
              </label>
              <input
                type="text"
                value={field.credentialConfig?.schemaId || ''}
                onChange={(e) =>
                  onUpdate({
                    credentialConfig: {
                      ...field.credentialConfig,
                      schemaId: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                placeholder="did:indy:..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credential Definition ID (optional)
              </label>
              <input
                type="text"
                value={field.credentialConfig?.credDefId || ''}
                onChange={(e) =>
                  onUpdate({
                    credentialConfig: {
                      ...field.credentialConfig,
                      credDefId: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                placeholder="did:indy:..."
              />
            </div>
          </div>
        </details>
      )}

      {/* No credential selected state */}
      {!selectedVct && !isLoadingLibrary && !isLoadingVct && (
        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
          <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p>Select a credential type from the library to configure verification</p>
        </div>
      )}
    </div>
  );
}
