/**
 * FormPreview Component
 *
 * Renders a preview of a form as it would appear to respondents.
 * Supports all field types defined in the Forms Builder.
 */

import { useState, useMemo } from 'react';
import { FormSchema, FormField, FormSection } from '../../../types/forms';

interface FormPreviewProps {
  schema: FormSchema;
  title: string;
  description?: string;
  onClose?: () => void;
}

interface FieldPreviewProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldPreview({ field, value, onChange }: FieldPreviewProps) {
  const baseInputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <input
          type={field.type === 'phone' ? 'tel' : field.type}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseInputClasses}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.valueAsNumber || '')}
          placeholder={field.placeholder}
          className={baseInputClasses}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={`${baseInputClasses} resize-none`}
        />
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClasses}
        >
          <option value="">{field.placeholder || 'Select an option...'}</option>
          {field.options?.map((option) => (
            <option key={option.label} value={option.value || option.label}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.label} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={option.label}
                checked={(value as string) === option.label}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      // Checkbox returns an object with each option as key and true/false as value
      const checkedState = (value as Record<string, boolean>) || {};
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.label} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedState[option.label] || false}
                onChange={(e) => {
                  onChange({
                    ...checkedState,
                    [option.label]: e.target.checked,
                  });
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'verifiable-credential':
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <svg
            className="w-8 h-8 mx-auto text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-sm text-gray-500">Verified Credential Field</p>
          <p className="text-xs text-gray-400 mt-1">Scan QR code to verify</p>
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Unsupported field type: {field.type}
        </div>
      );
  }
}

function SectionPreview({
  section,
  values,
  onChange,
}: {
  section: FormSection;
  values: Record<string, unknown>;
  onChange: (fieldName: string, value: unknown) => void;
}) {
  return (
    <div className="mb-8">
      {section.title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{section.title}</h3>
      )}
      {section.description && (
        <p className="text-gray-600 mb-4">{section.description}</p>
      )}
      <div className="space-y-6">
        {section.fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-sm text-gray-500 mb-2">{field.description}</p>
            )}
            <FieldPreview
              field={field}
              value={values[field.name] ?? ''}
              onChange={(value) => onChange(field.name, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// QR Code panel component for credential verification
function CredentialQRPanel({ credentialFields }: { credentialFields: FormField[] }) {
  if (credentialFields.length === 0) {
    return null;
  }

  return (
    <div className="w-80 bg-gray-50 border-l flex flex-col">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Credential Verification
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Scan to verify your credentials
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {credentialFields.map((field, index) => (
          <div key={field.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-white bg-blue-600 rounded">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {field.label || 'Credential Verification'}
              </span>
            </div>

            {/* QR Code placeholder */}
            <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center">
              <div className="w-32 h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                QR code will be generated<br />when form is published
              </p>
            </div>

            {/* Credential config info */}
            {field.credentialConfig && (
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                {field.credentialConfig.attributePath && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Attribute:</span>
                    <span className="font-mono">{field.credentialConfig.attributePath}</span>
                  </div>
                )}
                {field.credentialConfig.predicate && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Predicate:</span>
                    <span className="font-mono">
                      {field.credentialConfig.predicate.operator} {String(field.credentialConfig.predicate.value)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{credentialFields.length} credential{credentialFields.length !== 1 ? 's' : ''} to verify</span>
        </div>
      </div>
    </div>
  );
}

export default function FormPreview({ schema, title, description, onClose }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Determine initial page based on whether info screen is enabled
  const initialPage = schema.infoScreen?.enabled ? 'info' : 'form';
  const [currentPage, setCurrentPage] = useState<'info' | 'form' | 'success'>(initialPage);

  // Extract all verifiable-credential fields from all sections
  const credentialFields = useMemo(() => {
    return schema.sections.flatMap(section =>
      section.fields.filter(field => field.type === 'verifiable-credential')
    );
  }, [schema.sections]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only show success screen if enabled, otherwise just stay on form
    if (schema.successScreen?.enabled ?? true) {
      setCurrentPage('success');
    }
  };

  // Show info screen if enabled and we're on info page
  if (currentPage === 'info' && schema.infoScreen?.enabled) {
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{schema.infoScreen.title}</h2>
          <div className="prose prose-sm text-gray-700 mb-6">
            {schema.infoScreen.content}
          </div>
          <button
            onClick={() => setCurrentPage('form')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Show success screen if enabled and we're on success page
  if (currentPage === 'success' && (schema.successScreen?.enabled ?? true)) {
    return (
      <div className="flex-1 overflow-y-auto bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {schema.successScreen?.title || 'Thank you!'}
          </h2>
          <p className="text-gray-600 mb-6">{schema.successScreen?.content || 'Your form has been submitted.'}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close Preview
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show form with optional QR panel
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main content area with optional QR panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form content - scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-2xl mx-auto p-6">
            <form onSubmit={handleSubmit}>
              {schema.sections.map((section) => (
                <SectionPreview
                  key={section.id}
                  section={section}
                  values={values}
                  onChange={handleFieldChange}
                />
              ))}

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>

          {/* Preview badge */}
          <div className="sticky bottom-4 left-4 inline-block ml-4 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
            Preview Mode
          </div>
        </div>

        {/* QR Code panel for credential fields */}
        {credentialFields.length > 0 && (
          <CredentialQRPanel credentialFields={credentialFields} />
        )}
      </div>
    </div>
  );
}
