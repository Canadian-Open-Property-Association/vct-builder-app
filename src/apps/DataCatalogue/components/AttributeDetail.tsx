import { DataAttribute, DataTypeWithAttributes } from '../../../types/catalogue';
import { DATA_TYPE_OPTIONS, CANADIAN_REGIONS } from '../constants';

interface AttributeDetailProps {
  attribute: DataAttribute;
  dataType: DataTypeWithAttributes;
}

export default function AttributeDetail({ attribute, dataType }: AttributeDetailProps) {
  const getDataTypeLabel = (value: string) => {
    const dt = DATA_TYPE_OPTIONS.find(t => t.value === value);
    return dt?.label || value;
  };

  const getRegionLabel = (value: string) => {
    const region = CANADIAN_REGIONS.find(r => r.value === value);
    return region?.label || value;
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-1">
          {dataType.name}
        </div>
        <h2 className="text-xl font-semibold text-gray-800">{attribute.name}</h2>
        {attribute.displayName && attribute.displayName !== attribute.name && (
          <p className="text-gray-600 mt-1">{attribute.displayName}</p>
        )}
      </div>

      {/* Description */}
      {attribute.description && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
          <p className="text-gray-600">{attribute.description}</p>
        </div>
      )}

      {/* Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Data Type */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Data Type</div>
          <div className="font-medium text-gray-800">
            {getDataTypeLabel(attribute.dataType)}
          </div>
        </div>

        {/* Sample Value */}
        {attribute.sampleValue && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Sample Value</div>
            <code className="font-mono text-sm text-gray-800 break-all">
              {attribute.sampleValue}
            </code>
          </div>
        )}
      </div>

      {/* JSON Path */}
      {attribute.path && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">JSON Path</h4>
          <code className="block bg-gray-100 p-3 rounded text-sm text-gray-700 font-mono break-all">
            {attribute.path}
          </code>
        </div>
      )}

      {/* Regions */}
      {attribute.regionsCovered && attribute.regionsCovered.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Regions Covered (Override)</h4>
          <div className="flex flex-wrap gap-2">
            {attribute.regionsCovered.map((region) => (
              <span
                key={region}
                className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded"
              >
                {getRegionLabel(region)}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This attribute overrides the furnisher's default regions.
          </p>
        </div>
      )}

      {/* Metadata */}
      {attribute.metadata && Object.keys(attribute.metadata).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Metadata</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 overflow-x-auto">
              {JSON.stringify(attribute.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* JSON Preview */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">JSON Definition</h4>
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-green-400">
            {JSON.stringify(
              {
                name: attribute.name,
                displayName: attribute.displayName,
                dataType: attribute.dataType,
                description: attribute.description,
                sampleValue: attribute.sampleValue,
                path: attribute.path,
                regionsCovered: attribute.regionsCovered,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-6 text-xs text-gray-400">
        <p>Created: {new Date(attribute.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(attribute.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
