/**
 * CredentialForm Component
 *
 * Form for entering credential data based on a schema.
 * Generates a QR code for wallet scanning after submission.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTestIssuerStore } from '../../../store/testIssuerStore';
import type { SchemaProperty, CredentialFormField } from '../../../types/issuer';
import QRCodeDisplay from './QRCodeDisplay';

export default function CredentialForm() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const {
    selectedSchema,
    currentOffer,
    isLoading,
    error,
    selectSchema,
    createOffer,
    clearError,
    clearCurrentOffer,
  } = useTestIssuerStore();

  const [formFields, setFormFields] = useState<CredentialFormField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch schema on mount
  useEffect(() => {
    if (schemaId) {
      selectSchema(schemaId);
    }
    return () => {
      clearCurrentOffer();
    };
  }, [schemaId, selectSchema, clearCurrentOffer]);

  // Initialize form fields when schema is loaded
  useEffect(() => {
    if (selectedSchema?.properties) {
      const fields: CredentialFormField[] = selectedSchema.properties.map((prop) => ({
        property: prop,
        value: getDefaultValue(prop),
      }));
      setFormFields(fields);
    }
  }, [selectedSchema]);

  const getDefaultValue = (prop: SchemaProperty): unknown => {
    switch (prop.type) {
      case 'boolean':
        return false;
      case 'number':
      case 'integer':
        return '';
      case 'array':
        return [];
      default:
        return '';
    }
  };

  const updateField = useCallback((index: number, value: unknown) => {
    setFormFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
    // Clear validation error when field is updated
    setValidationErrors((prev) => {
      const { [formFields[index].property.name]: _, ...rest } = prev;
      return rest;
    });
  }, [formFields]);

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    formFields.forEach((field) => {
      const { property, value } = field;

      // Required check
      if (property.required) {
        if (value === '' || value === null || value === undefined) {
          errors[property.name] = 'This field is required';
          return;
        }
        if (Array.isArray(value) && value.length === 0) {
          errors[property.name] = 'This field is required';
          return;
        }
      }

      // Skip further validation if empty and not required
      if (value === '' || value === null || value === undefined) {
        return;
      }

      // Type-specific validation
      if (property.type === 'number' || property.type === 'integer') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors[property.name] = 'Must be a valid number';
          return;
        }
        if (property.type === 'integer' && !Number.isInteger(numValue)) {
          errors[property.name] = 'Must be a whole number';
          return;
        }
        if (property.minimum !== undefined && numValue < property.minimum) {
          errors[property.name] = `Must be at least ${property.minimum}`;
          return;
        }
        if (property.maximum !== undefined && numValue > property.maximum) {
          errors[property.name] = `Must be at most ${property.maximum}`;
          return;
        }
      }

      if (property.type === 'string' && typeof value === 'string') {
        if (property.minLength !== undefined && value.length < property.minLength) {
          errors[property.name] = `Must be at least ${property.minLength} characters`;
          return;
        }
        if (property.maxLength !== undefined && value.length > property.maxLength) {
          errors[property.name] = `Must be at most ${property.maxLength} characters`;
          return;
        }
        if (property.pattern) {
          const regex = new RegExp(property.pattern);
          if (!regex.test(value)) {
            errors[property.name] = 'Invalid format';
            return;
          }
        }
        if (property.format === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[property.name] = 'Must be a valid email address';
            return;
          }
        }
        if (property.format === 'date') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            errors[property.name] = 'Must be a valid date (YYYY-MM-DD)';
            return;
          }
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields() || !schemaId) return;

    setIsSubmitting(true);
    try {
      // Build credential data from form fields
      const credentialData: Record<string, unknown> = {};
      formFields.forEach((field) => {
        const { property, value } = field;
        // Convert to appropriate type
        if (value !== '' && value !== null && value !== undefined) {
          if (property.type === 'number' || property.type === 'integer') {
            credentialData[property.name] = Number(value);
          } else if (property.type === 'boolean') {
            credentialData[property.name] = Boolean(value);
          } else {
            credentialData[property.name] = value;
          }
        }
      });

      await createOffer({
        schemaId,
        credentialData,
        expiresInMinutes: 15,
      });
    } catch (err) {
      // Error handled in store
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show QR code if offer was created
  if (currentOffer) {
    return (
      <QRCodeDisplay
        offer={currentOffer}
        onBack={() => navigate('/apps/test-issuer')}
        onNewCredential={() => {
          clearCurrentOffer();
          setFormFields((prev) =>
            prev.map((field) => ({ ...field, value: getDefaultValue(field.property) }))
          );
        }}
      />
    );
  }

  // Loading state
  if (isLoading && !selectedSchema) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Schema not found
  if (!selectedSchema) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Schema not found. Please select a schema from the catalog.</p>
          <button
            onClick={() => navigate('/apps/test-issuer')}
            className="mt-3 text-yellow-700 hover:text-yellow-900 underline"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const renderField = (field: CredentialFormField, index: number) => {
    const { property, value } = field;
    const hasError = validationErrors[property.name];

    const baseInputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
    }`;

    return (
      <div key={property.name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {property.name}
          {property.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {property.description && (
          <p className="text-xs text-gray-500">{property.description}</p>
        )}

        {/* Enum (select) */}
        {property.enum && property.enum.length > 0 ? (
          <select
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {property.enum.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : property.type === 'boolean' ? (
          /* Boolean (checkbox) */
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => updateField(index, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {value ? 'Yes' : 'No'}
            </span>
          </div>
        ) : property.type === 'number' || property.type === 'integer' ? (
          /* Number */
          <input
            type="number"
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            min={property.minimum}
            max={property.maximum}
            step={property.type === 'integer' ? 1 : 'any'}
            className={baseInputClass}
            placeholder={`Enter ${property.type}`}
          />
        ) : property.format === 'date' ? (
          /* Date */
          <input
            type="date"
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            className={baseInputClass}
          />
        ) : property.format === 'email' ? (
          /* Email */
          <input
            type="email"
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            className={baseInputClass}
            placeholder="email@example.com"
          />
        ) : (property.maxLength && property.maxLength > 200) ? (
          /* Long text (textarea) */
          <textarea
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            rows={4}
            maxLength={property.maxLength}
            className={`${baseInputClass} resize-y`}
            placeholder={`Enter ${property.name}`}
          />
        ) : (
          /* Default text input */
          <input
            type="text"
            value={value as string}
            onChange={(e) => updateField(index, e.target.value)}
            maxLength={property.maxLength}
            className={baseInputClass}
            placeholder={`Enter ${property.name}`}
          />
        )}

        {/* Validation error */}
        {hasError && (
          <p className="text-sm text-red-600">{validationErrors[property.name]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/apps/test-issuer')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue Credential</h1>
          <p className="text-gray-600">{selectedSchema.name}</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {selectedSchema.description && (
          <p className="text-gray-600 mb-6">{selectedSchema.description}</p>
        )}

        <div className="space-y-6">
          {formFields.map((field, index) => renderField(field, index))}
        </div>

        {/* Submit button */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => navigate('/apps/test-issuer')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Generate QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
