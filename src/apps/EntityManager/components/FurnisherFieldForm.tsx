import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FurnisherField, DataSourceType } from '../../../types/entity';

interface FurnisherFieldFormProps {
  field: FurnisherField | null;
  onSave: (field: FurnisherField) => void;
  onClose: () => void;
  sourceType?: DataSourceType; // Optional - when provided, adapts labels for credential vs direct feed
}

const DATA_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
];

export default function FurnisherFieldForm({ field, onSave, onClose, sourceType = 'direct-feed' }: FurnisherFieldFormProps) {
  const isCredential = sourceType === 'credential';
  const fieldLabel = isCredential ? 'Claim' : 'Field';

  const [formData, setFormData] = useState<Partial<FurnisherField>>({
    name: '',
    displayName: '',
    description: '',
    dataType: 'string',
    sampleValue: '',
    apiPath: '',
    required: false,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (field) {
      setFormData(field);
    }
  }, [field]);

  const handleChange = (key: keyof FurnisherField, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when field is modified
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Field name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Field name must start with a letter and contain only letters, numbers, and underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSave({
      id: field?.id || `field-${Date.now()}`,
      name: formData.name!,
      displayName: formData.displayName || undefined,
      description: formData.description || undefined,
      dataType: formData.dataType as FurnisherField['dataType'],
      sampleValue: formData.sampleValue || undefined,
      apiPath: formData.apiPath || undefined,
      required: formData.required,
      notes: formData.notes || undefined,
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {field ? `Edit ${fieldLabel}` : `Add ${fieldLabel}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Field Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {fieldLabel} Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={isCredential ? 'e.g., given_name' : 'e.g., assessed_value'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {isCredential
                ? 'The claim name from the credential schema (snake_case recommended)'
                : "The technical field name from the furnisher's API (snake_case recommended)"}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName || ''}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="e.g., Assessed Value"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Data Type and Required */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                value={formData.dataType || 'string'}
                onChange={(e) => handleChange('dataType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {DATA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.required || false}
                  onChange={(e) => handleChange('required', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Required {fieldLabel.toLowerCase()}</span>
              </label>
            </div>
          </div>

          {/* API Path - Only for direct feeds */}
          {!isCredential && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Path
              </label>
              <input
                type="text"
                value={formData.apiPath || ''}
                onChange={(e) => handleChange('apiPath', e.target.value)}
                placeholder="e.g., data.property.assessed_value"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                JSON path to this field in the API response
              </p>
            </div>
          )}

          {/* Sample Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sample Value
            </label>
            <input
              type="text"
              value={formData.sampleValue || ''}
              onChange={(e) => handleChange('sampleValue', e.target.value)}
              placeholder="e.g., 450000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              placeholder="Brief description of this field..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Integration notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {field ? `Update ${fieldLabel}` : `Add ${fieldLabel}`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
