/**
 * API Documentation Component
 *
 * Fetches OpenAPI spec from /api/docs.json and renders it dynamically.
 * This ensures documentation is always in sync with the actual API.
 */

import { useState, useEffect } from 'react';

interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  description?: string;
  schema?: { type: string };
}

interface OpenAPIRequestBody {
  content?: {
    'application/json'?: {
      schema?: {
        $ref?: string;
        properties?: Record<string, { type: string; description?: string }>;
      };
    };
  };
}

interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json'?: {
      schema?: {
        $ref?: string;
        type?: string;
        items?: { $ref?: string };
      };
    };
  };
}

interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

interface OpenAPITag {
  name: string;
  description?: string;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; url?: string };
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: OpenAPITag[];
  paths: Record<string, OpenAPIPath>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
}

const methodColors: Record<string, string> = {
  get: 'bg-green-100 text-green-700',
  post: 'bg-blue-100 text-blue-700',
  put: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
};

export default function ApiDocumentation() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/docs.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch API spec: ${response.statusText}`);
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API documentation');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const toggleEndpoint = (key: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEndpoints(newExpanded);
  };

  // Group endpoints by tag
  const getEndpointsByTag = () => {
    if (!spec) return {};

    const grouped: Record<string, Array<{ path: string; method: string; operation: OpenAPIOperation }>> = {};

    // Initialize with tags from spec
    spec.tags?.forEach((tag) => {
      grouped[tag.name] = [];
    });

    // Group paths by their tags
    Object.entries(spec.paths).forEach(([path, methods]) => {
      const httpMethods = ['get', 'post', 'put', 'delete'] as const;
      httpMethods.forEach((method) => {
        const operation = methods[method];
        if (operation) {
          const tag = operation.tags?.[0] || 'Other';
          if (!grouped[tag]) {
            grouped[tag] = [];
          }
          grouped[tag].push({ path, method, operation });
        }
      });
    });

    return grouped;
  };

  const getTagDescription = (tagName: string) => {
    return spec?.tags?.find((t) => t.name === tagName)?.description || '';
  };

  const formatSchemaRef = (ref?: string) => {
    if (!ref) return null;
    // Extract schema name from #/components/schemas/SchemaName
    const parts = ref.split('/');
    return parts[parts.length - 1];
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading API documentation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h2 className="font-semibold mb-2">Error Loading Documentation</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return null;
  }

  const endpointsByTag = getEndpointsByTag();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{spec.info.title}</h1>
        <p className="text-gray-600">{spec.info.description}</p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Base URL:</strong>{' '}
            <code className="bg-blue-100 px-2 py-0.5 rounded">
              {spec.servers?.[0]?.url || window.location.origin}
            </code>
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Authentication uses session cookies from GitHub OAuth.
            Endpoints marked with a lock icon require authentication.
          </p>
          <p className="text-sm text-blue-600 mt-2">
            <strong>Version:</strong> {spec.info.version} |{' '}
            <a href="/api/docs" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
              Open Swagger UI →
            </a>
          </p>
        </div>
      </div>

      {Object.entries(endpointsByTag).map(([tagName, endpoints]) => (
        <div key={tagName} className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{tagName}</h2>
            {getTagDescription(tagName) && (
              <p className="text-sm text-gray-600 mt-1">{getTagDescription(tagName)}</p>
            )}
          </div>

          <div className="space-y-2">
            {endpoints.map(({ path, method, operation }, index) => {
              const key = `${tagName}-${index}`;
              const isExpanded = expandedEndpoints.has(key);
              const hasAuth = operation.security && operation.security.length > 0;

              return (
                <div
                  key={key}
                  className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                >
                  <button
                    onClick={() => toggleEndpoint(key)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${methodColors[method]}`}
                    >
                      {method}
                    </span>
                    <code className="text-sm font-mono text-gray-700 flex-1 text-left">
                      {path}
                    </code>
                    {hasAuth && (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600 py-3">
                        {operation.summary || operation.description || 'No description available'}
                      </p>

                      {/* Parameters */}
                      {operation.parameters && operation.parameters.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Parameters
                          </h4>
                          <div className="bg-gray-50 rounded p-3 space-y-2">
                            {operation.parameters.map((param, i) => (
                              <div key={i} className="text-sm">
                                <code className="text-purple-600">{param.name}</code>
                                <span className="text-gray-400 mx-1">:</span>
                                <span className="text-gray-600">{param.schema?.type || 'string'}</span>
                                <span className="text-gray-400 ml-1">({param.in})</span>
                                {param.required && (
                                  <span className="text-red-500 text-xs ml-1">*required</span>
                                )}
                                {param.description && (
                                  <p className="text-gray-500 text-xs mt-0.5">{param.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Request Body */}
                      {operation.requestBody?.content?.['application/json']?.schema && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Request Body
                          </h4>
                          <div className="bg-gray-50 rounded p-3">
                            {operation.requestBody.content['application/json'].schema.$ref ? (
                              <code className="text-sm text-purple-600">
                                {formatSchemaRef(operation.requestBody.content['application/json'].schema.$ref)}
                              </code>
                            ) : (
                              <span className="text-sm text-gray-600">JSON object</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Responses */}
                      {operation.responses && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Responses
                          </h4>
                          <div className="bg-gray-50 rounded p-3 space-y-2">
                            {Object.entries(operation.responses).map(([code, response]) => (
                              <div key={code} className="text-sm flex items-start gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  code.startsWith('2') ? 'bg-green-100 text-green-700' :
                                  code.startsWith('4') ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {code}
                                </span>
                                <span className="text-gray-600">{response.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
