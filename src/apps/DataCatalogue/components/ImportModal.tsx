import { useState, useRef } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';
import { DATA_TYPE_OPTIONS } from '../constants';

interface ImportModalProps {
  onClose: () => void;
}

interface ParsedAttribute {
  name: string;
  displayName?: string;
  description?: string;
  dataType: string;
  sampleValue?: string;
  path?: string;
}

export default function ImportModal({ onClose }: ImportModalProps) {
  const selectedFurnisher = useDataCatalogueStore((state) => state.selectedFurnisher);
  const bulkCreateAttributes = useDataCatalogueStore((state) => state.bulkCreateAttributes);

  const [jsonInput, setJsonInput] = useState('');
  const [selectedDataTypeId, setSelectedDataTypeId] = useState<string>('');
  const [parsedAttributes, setParsedAttributes] = useState<ParsedAttribute[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParseJson = () => {
    setParseError(null);
    setParsedAttributes([]);
    setImportResult(null);

    if (!jsonInput.trim()) {
      setParseError('Please enter JSON data');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      let attributes: ParsedAttribute[] = [];

      // Support different JSON formats
      if (Array.isArray(parsed)) {
        // Array of attributes
        attributes = parsed.map(normalizeAttribute);
      } else if (parsed.attributes && Array.isArray(parsed.attributes)) {
        // { attributes: [...] }
        attributes = parsed.attributes.map(normalizeAttribute);
      } else if (typeof parsed === 'object') {
        // Single attribute object
        attributes = [normalizeAttribute(parsed)];
      }

      if (attributes.length === 0) {
        setParseError('No attributes found in JSON');
        return;
      }

      // Validate each attribute has at least a name
      const invalidAttrs = attributes.filter((a) => !a.name);
      if (invalidAttrs.length > 0) {
        setParseError(`${invalidAttrs.length} attribute(s) are missing required "name" field`);
        return;
      }

      setParsedAttributes(attributes);
    } catch (err) {
      setParseError(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  };

  const normalizeAttribute = (obj: Record<string, unknown>): ParsedAttribute => {
    // Try to extract common field names
    const name =
      (obj.name as string) ||
      (obj.attribute_name as string) ||
      (obj.field as string) ||
      (obj.fieldName as string) ||
      '';

    const displayName =
      (obj.displayName as string) ||
      (obj.display_name as string) ||
      (obj.label as string) ||
      (obj.title as string) ||
      undefined;

    const description =
      (obj.description as string) ||
      (obj.desc as string) ||
      undefined;

    // Normalize data type
    let dataType = (obj.dataType as string) || (obj.type as string) || (obj.data_type as string) || 'string';
    dataType = dataType.toLowerCase();

    // Map common variations
    const typeMap: Record<string, string> = {
      str: 'string',
      text: 'string',
      int: 'integer',
      float: 'number',
      double: 'number',
      decimal: 'number',
      bool: 'boolean',
      date: 'date',
      time: 'datetime',
      timestamp: 'datetime',
      url: 'uri',
      link: 'uri',
      list: 'array',
      arr: 'array',
      obj: 'object',
      json: 'object',
    };
    dataType = typeMap[dataType] || dataType;

    // Validate against allowed types
    const isValidType = DATA_TYPE_OPTIONS.some((t) => t.value === dataType);
    if (!isValidType) {
      dataType = 'string';
    }

    const sampleValue =
      (obj.sampleValue as string) ||
      (obj.sample as string) ||
      (obj.example as string) ||
      (obj.default as string) ||
      undefined;

    const path =
      (obj.path as string) ||
      (obj.jsonPath as string) ||
      (obj.json_path as string) ||
      undefined;

    return {
      name,
      displayName,
      description,
      dataType,
      sampleValue: sampleValue?.toString(),
      path,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedDataTypeId) {
      setParseError('Please select a data type');
      return;
    }

    if (parsedAttributes.length === 0) {
      setParseError('No attributes to import');
      return;
    }

    setImporting(true);
    setImportResult(null);
    setParseError(null);

    try {
      const result = await bulkCreateAttributes(selectedDataTypeId, parsedAttributes);
      setImportResult({ success: true, count: result.created });
      setParsedAttributes([]);
      setJsonInput('');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Import failed');
      setImportResult({ success: false, count: 0 });
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveAttribute = (index: number) => {
    setParsedAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Import Attributes</h3>
            <p className="text-sm text-gray-500">
              Paste JSON or upload a file to bulk import attributes
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Target Selection */}
          {selectedFurnisher ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Import to Data Type <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedFurnisher.name} →
                </span>
                <select
                  value={selectedDataTypeId}
                  onChange={(e) => setSelectedDataTypeId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a data type...</option>
                  {selectedFurnisher.dataTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <p className="text-sm font-medium">No furnisher selected</p>
              <p className="text-xs mt-1">
                Please select a furnisher from the list before importing attributes.
              </p>
            </div>
          )}

          {/* JSON Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">JSON Data</label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Upload JSON File
                </button>
              </div>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`Paste JSON here. Supported formats:
[
  { "name": "bedrooms", "dataType": "integer", "description": "Number of bedrooms" },
  { "name": "lot_size", "dataType": "number", "sampleValue": "1500" }
]

Or: { "attributes": [...] }
Or: Single attribute object`}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleParseJson}
                disabled={!jsonInput.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Parse JSON
              </button>
              {jsonInput && (
                <button
                  onClick={() => {
                    setJsonInput('');
                    setParsedAttributes([]);
                    setParseError(null);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {parseError}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`mb-4 p-3 rounded text-sm ${
                importResult.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {importResult.success
                ? `Successfully imported ${importResult.count} attribute(s)`
                : 'Import failed'}
            </div>
          )}

          {/* Preview Table */}
          {parsedAttributes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Preview ({parsedAttributes.length} attributes)
                </h4>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Sample</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedAttributes.map((attr, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="font-mono text-gray-800">{attr.name}</div>
                            {attr.displayName && (
                              <div className="text-xs text-gray-500">{attr.displayName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {attr.dataType}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-500 max-w-[150px] truncate">
                            {attr.sampleValue || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleRemoveAttribute(index)}
                              className="text-gray-400 hover:text-red-600"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Supported fields: name, displayName, description, dataType, sampleValue, path
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || parsedAttributes.length === 0 || !selectedDataTypeId}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${parsedAttributes.length} Attributes`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
