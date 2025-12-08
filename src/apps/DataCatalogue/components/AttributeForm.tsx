import { useState, useEffect } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';
import { DATA_TYPE_OPTIONS, CANADIAN_REGIONS } from '../constants';

interface AttributeFormProps {
  dataTypeId: string;
  attributeId?: string;
  onClose: () => void;
}

export default function AttributeForm({ dataTypeId, attributeId, onClose }: AttributeFormProps) {
  const selectedFurnisher = useDataCatalogueStore((state) => state.selectedFurnisher);
  const createAttribute = useDataCatalogueStore((state) => state.createAttribute);
  const updateAttribute = useDataCatalogueStore((state) => state.updateAttribute);

  const existingAttribute = attributeId
    ? selectedFurnisher?.dataTypes
        .find((dt) => dt.id === dataTypeId)
        ?.attributes?.find((a) => a.id === attributeId)
    : null;

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    dataType: 'string',
    sampleValue: '',
    path: '',
    regionsCovered: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegionOverride, setShowRegionOverride] = useState(false);

  useEffect(() => {
    if (existingAttribute) {
      setFormData({
        name: existingAttribute.name || '',
        displayName: existingAttribute.displayName || '',
        description: existingAttribute.description || '',
        dataType: existingAttribute.dataType || 'string',
        sampleValue: existingAttribute.sampleValue || '',
        path: existingAttribute.path || '',
        regionsCovered: existingAttribute.regionsCovered || [],
      });
      setShowRegionOverride(
        !!(existingAttribute.regionsCovered && existingAttribute.regionsCovered.length > 0)
      );
    }
  }, [existingAttribute]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegionToggle = (regionValue: string) => {
    const newRegions = formData.regionsCovered.includes(regionValue)
      ? formData.regionsCovered.filter((r) => r !== regionValue)
      : [...formData.regionsCovered, regionValue];
    handleChange('regionsCovered', newRegions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        regionsCovered: showRegionOverride ? formData.regionsCovered : undefined,
      };

      if (attributeId) {
        await updateAttribute(attributeId, dataToSave);
      } else {
        await createAttribute({
          ...dataToSave,
          dataTypeId,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attribute');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {attributeId ? 'Edit Attribute' : 'Add Attribute'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., bedrooms, lot_size_sq_ft"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Use snake_case or camelCase for technical attribute names
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="e.g., Number of Bedrooms"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Data Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                value={formData.dataType}
                onChange={(e) => handleChange('dataType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What does this attribute represent?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sample Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Value
              </label>
              <input
                type="text"
                value={formData.sampleValue}
                onChange={(e) => handleChange('sampleValue', e.target.value)}
                placeholder="e.g., 3, 1500, true"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {/* JSON Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                JSON Path
              </label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => handleChange('path', e.target.value)}
                placeholder="e.g., property_details.bedrooms"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Path to this attribute in the source data structure
              </p>
            </div>

            {/* Region Override */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="regionOverride"
                  checked={showRegionOverride}
                  onChange={(e) => {
                    setShowRegionOverride(e.target.checked);
                    if (!e.target.checked) {
                      handleChange('regionsCovered', []);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="regionOverride" className="text-sm font-medium text-gray-700">
                  Override furnisher regions
                </label>
              </div>

              {showRegionOverride && (
                <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">
                    Select specific regions where this attribute is available (overrides furnisher default)
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {CANADIAN_REGIONS.map((region) => (
                      <label
                        key={region.value}
                        className={`flex items-center justify-center px-2 py-1 border rounded cursor-pointer text-xs transition-colors ${
                          formData.regionsCovered.includes(region.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.regionsCovered.includes(region.value)}
                          onChange={() => handleRegionToggle(region.value)}
                          className="sr-only"
                        />
                        {region.value}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : attributeId ? 'Save Changes' : 'Create Attribute'}
          </button>
        </div>
      </div>
    </div>
  );
}
