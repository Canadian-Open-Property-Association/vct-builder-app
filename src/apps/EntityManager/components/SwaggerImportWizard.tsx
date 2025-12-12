import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { FurnisherDataSource } from '../../../types/entity';
import {
  fetchOpenApiSpec,
  createDataSource,
  groupEndpointsByTag,
  getMethodColour,
  toDisplayName,
  type ParsedOpenApiSpec,
  type ParsedSchema,
} from '../utils/openApiParser';

interface SwaggerImportWizardProps {
  onImport: (source: FurnisherDataSource) => void;
  onClose: () => void;
}

type WizardStep = 'url' | 'endpoints' | 'schemas' | 'review';

const STEPS: WizardStep[] = ['url', 'endpoints', 'schemas', 'review'];
const STEP_LABELS: Record<WizardStep, string> = {
  url: 'Enter URL',
  endpoints: 'Endpoints',
  schemas: 'Schemas',
  review: 'Review',
};

export default function SwaggerImportWizard({ onImport, onClose }: SwaggerImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState<ParsedOpenApiSpec | null>(null);
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set());
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set());
  const [sourceName, setSourceName] = useState('');
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const currentStepIndex = STEPS.indexOf(step);

  const handleFetchSpec = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchOpenApiSpec(url.trim());
      setSpec(result);
      setSourceName(result.info.title || 'Imported API');
      // Auto-select all schemas by default
      setSelectedSchemas(new Set(result.schemas.map(s => s.id)));
      setStep('endpoints');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API specification');
    } finally {
      setLoading(false);
    }
  };

  const toggleEndpoint = (id: string) => {
    setSelectedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSchema = (id: string) => {
    setSelectedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSchemaExpand = (id: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllSchemas = () => {
    if (spec) {
      setSelectedSchemas(new Set(spec.schemas.map(s => s.id)));
    }
  };

  const deselectAllSchemas = () => {
    setSelectedSchemas(new Set());
  };

  const handleImport = () => {
    if (!spec) return;

    const selectedSchemaObjects = spec.schemas.filter(s => selectedSchemas.has(s.id));
    const dataSource = createDataSource(sourceName, selectedSchemaObjects, spec);
    onImport(dataSource);
    onClose();
  };

  const getSelectedSchemaObjects = (): ParsedSchema[] => {
    if (!spec) return [];
    return spec.schemas.filter(s => selectedSchemas.has(s.id));
  };

  const getTotalFieldCount = (): number => {
    return getSelectedSchemaObjects().reduce((sum, schema) => sum + schema.properties.length, 0);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'url':
        return !!url.trim();
      case 'endpoints':
        return true; // Endpoints are optional
      case 'schemas':
        return selectedSchemas.size > 0;
      case 'review':
        return !!sourceName.trim() && selectedSchemas.size > 0;
      default:
        return false;
    }
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              i <= currentStepIndex
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                i < currentStepIndex
                  ? 'bg-blue-600 text-white'
                  : i === currentStepIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500'
              }`}
            >
              {i < currentStepIndex ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-blue-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: URL Input
  const renderUrlStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the URL of a Swagger UI page or OpenAPI specification. The wizard will auto-detect the API spec location.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Swagger/OpenAPI URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/docs or https://api.example.com/openapi.json"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleFetchSpec()}
        />
        <p className="text-xs text-gray-500 mt-1">
          Examples: Swagger UI page, /openapi.json, /swagger.json, /api-docs
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleFetchSpec}
        disabled={loading || !url.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Detecting & Fetching...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Fetch API Specification
          </>
        )}
      </button>
    </div>
  );

  // Step 2: Endpoints Selection (optional)
  const renderEndpointsStep = () => {
    if (!spec) return null;

    const groupedEndpoints = groupEndpointsByTag(spec.endpoints);
    const tags = Object.keys(groupedEndpoints).sort();

    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{spec.info.title}</span>
            <span className="text-sm">v{spec.info.version}</span>
          </div>
          {spec.servers[0] && (
            <p className="text-sm text-green-600 mt-1">{spec.servers[0].url}</p>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">
            Found {spec.endpoints.length} endpoints. You can optionally select which endpoints to reference (this is informational only - fields are extracted from schemas).
          </p>

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {tags.map(tag => (
              <div key={tag} className="border-b border-gray-100 last:border-b-0">
                <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                  {tag} ({groupedEndpoints[tag].length})
                </div>
                {groupedEndpoints[tag].map(endpoint => (
                  <label
                    key={endpoint.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEndpoints.has(endpoint.id)}
                      onChange={() => toggleEndpoint(endpoint.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded text-white"
                      style={{ backgroundColor: getMethodColour(endpoint.method) }}
                    >
                      {endpoint.method}
                    </span>
                    <span className="text-sm font-mono text-gray-700">{endpoint.path}</span>
                    {endpoint.summary && (
                      <span className="text-xs text-gray-500 truncate">{endpoint.summary}</span>
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Endpoints are for reference. Fields will be imported from schemas in the next step.
        </p>
      </div>
    );
  };

  // Step 3: Schemas Selection
  const renderSchemasStep = () => {
    if (!spec) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Select which schemas to import as data fields ({spec.schemas.length} available)
          </p>
          <div className="flex gap-2">
            <button
              onClick={selectAllSchemas}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={deselectAllSchemas}
              className="text-xs text-gray-500 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {spec.schemas.map(schema => (
            <div key={schema.id} className="bg-white">
              <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedSchemas.has(schema.id)}
                  onChange={() => toggleSchema(schema.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <button
                  onClick={() => toggleSchemaExpand(schema.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedSchemas.has(schema.id) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{schema.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {schema.properties.length} properties
                  </span>
                </div>
              </div>

              {expandedSchemas.has(schema.id) && schema.properties.length > 0 && (
                <div className="px-10 pb-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-1">Name</th>
                        <th className="pb-1">Type</th>
                        <th className="pb-1">Required</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      {schema.properties.slice(0, 10).map(prop => (
                        <tr key={prop.name}>
                          <td className="py-0.5 font-mono">{prop.name}</td>
                          <td className="py-0.5">{prop.format || prop.type}</td>
                          <td className="py-0.5">{prop.required ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                      {schema.properties.length > 10 && (
                        <tr>
                          <td colSpan={3} className="py-1 text-gray-400 italic">
                            +{schema.properties.length - 10} more properties...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-600">
          Selected: <span className="font-medium">{selectedSchemas.size}</span> schemas with{' '}
          <span className="font-medium">{getTotalFieldCount()}</span> total fields
        </div>
      </div>
    );
  };

  // Step 4: Review & Import
  const renderReviewStep = () => {
    if (!spec) return null;

    const selectedSchemaObjects = getSelectedSchemaObjects();

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Source Name
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-800">Import Summary</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">API Documentation:</span>
              <p className="text-gray-800 truncate">{spec.originalUrl}</p>
            </div>
            <div>
              <span className="text-gray-500">API Endpoint:</span>
              <p className="text-gray-800">{spec.servers[0]?.url || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-500">Schemas Selected:</span>
              <p className="text-gray-800">{selectedSchemas.size}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Fields:</span>
              <p className="text-gray-800">{getTotalFieldCount()}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fields to Import</h4>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500 text-xs">
                  <th className="px-3 py-2">Field Name</th>
                  <th className="px-3 py-2">Display Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">From Schema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedSchemaObjects.flatMap(schema =>
                  schema.properties.map(prop => (
                    <tr key={`${schema.id}-${prop.name}`} className="text-gray-700">
                      <td className="px-3 py-1.5 font-mono text-xs">{prop.name}</td>
                      <td className="px-3 py-1.5">{toDisplayName(prop.name)}</td>
                      <td className="px-3 py-1.5 text-xs">{prop.format || prop.type}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-500">{schema.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Import from Swagger/OpenAPI
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepIndicator()}

          {step === 'url' && renderUrlStep()}
          {step === 'endpoints' && renderEndpointsStep()}
          {step === 'schemas' && renderSchemasStep()}
          {step === 'review' && renderReviewStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {step !== 'url' && (
              <button
                onClick={goBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            {step !== 'url' && step !== 'review' && (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleImport}
                disabled={!canProceed()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Import Data Source
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
