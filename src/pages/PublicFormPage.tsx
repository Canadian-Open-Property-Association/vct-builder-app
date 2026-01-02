/**
 * PublicFormPage
 *
 * Renders a published form for public access via /f/:slug
 * No authentication required - this is a public-facing page.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Form, FormField, FormSection, unflattenFormData } from '../types/forms';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const baseInputClasses =
    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
  const inputClasses = error
    ? `${baseInputClasses} border-red-300 bg-red-50`
    : `${baseInputClasses} border-gray-300`;

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
          className={inputClasses}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(e.target.valueAsNumber || '')}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
          className={inputClasses}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          minLength={field.validation?.minLength}
          maxLength={field.validation?.maxLength}
          className={`${inputClasses} resize-none`}
        />
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">{field.placeholder || 'Select an option...'}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={option.value}
                checked={(value as string) === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'checkbox': {
      const checkedValues = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={option.value}
                checked={checkedValues.includes(option.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...checkedValues, option.value]);
                  } else {
                    onChange(checkedValues.filter((v) => v !== option.value));
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case 'verified-credential':
      return (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50">
          <svg
            className="w-10 h-10 mx-auto text-blue-500 mb-3"
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
          <p className="text-sm font-medium text-blue-700">Verifiable Credential Required</p>
          <p className="text-xs text-blue-600 mt-1">
            {field.credentialConfig?.predicate
              ? `Proof: ${field.credentialConfig.attributePath || 'attribute'} ${field.credentialConfig.predicate.operator} ${field.credentialConfig.predicate.value}`
              : 'Scan QR code to verify'}
          </p>
          <button
            type="button"
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Verify Credential
          </button>
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

function SectionRenderer({
  section,
  values,
  errors,
  onChange,
}: {
  section: FormSection;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: unknown) => void;
}) {
  return (
    <div className="mb-8">
      {section.title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{section.title}</h3>
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
            <FieldInput
              field={field}
              value={values[field.name] ?? ''}
              onChange={(value) => onChange(field.name, value)}
              error={errors[field.name]}
            />
            {errors[field.name] && (
              <p className="text-sm text-red-600 mt-1">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentScreen, setCurrentScreen] = useState<'info' | 'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      if (!slug) {
        setError('No form slug provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/forms/slug/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Form not found');
          } else {
            setError('Failed to load form');
          }
          setIsLoading(false);
          return;
        }

        const formData = await response.json();
        setForm(formData);

        // If form has an info screen, show it first
        if (formData.schema?.infoScreen) {
          setCurrentScreen('info');
        }
      } catch (err) {
        setError('Failed to load form');
      } finally {
        setIsLoading(false);
      }
    }

    fetchForm();
  }, [slug]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!form?.schema) return false;

    const newErrors: Record<string, string> = {};

    for (const section of form.schema.sections) {
      for (const field of section.fields) {
        const value = values[field.name];

        if (field.required) {
          if (value === undefined || value === null || value === '') {
            newErrors[field.name] = 'This field is required';
            continue;
          }
          if (Array.isArray(value) && value.length === 0) {
            newErrors[field.name] = 'Please select at least one option';
            continue;
          }
        }

        // Type-specific validation
        if (value && field.validation) {
          if (field.validation.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
            newErrors[field.name] = `Minimum ${field.validation.minLength} characters required`;
          }
          if (field.validation.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
            newErrors[field.name] = `Maximum ${field.validation.maxLength} characters allowed`;
          }
          if (field.validation.min !== undefined && typeof value === 'number' && value < field.validation.min) {
            newErrors[field.name] = `Minimum value is ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && typeof value === 'number' && value > field.validation.max) {
            newErrors[field.name] = `Maximum value is ${field.validation.max}`;
          }
        }

        // Email validation
        if (field.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value as string)) {
            newErrors[field.name] = 'Please enter a valid email address';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !form) return;

    setIsSubmitting(true);

    try {
      // Unflatten the form data for nested JSON structure
      const nestedData = unflattenFormData(values);

      const response = await fetch(`${API_BASE}/api/forms/${form.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues: nestedData,
          sessionId: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setCurrentScreen('success');
    } catch (err) {
      setErrors({ _form: 'Failed to submit form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The form you are looking for does not exist or has been unpublished.'}
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Info screen
  if (currentScreen === 'info' && form.schema.infoScreen) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{form.schema.infoScreen.title}</h1>
            <div className="prose prose-sm text-gray-700 mb-6 whitespace-pre-wrap">
              {form.schema.infoScreen.content}
            </div>
            <button
              onClick={() => setCurrentScreen('form')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (currentScreen === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {form.schema.successScreen.title}
          </h1>
          <p className="text-gray-600 whitespace-pre-wrap">
            {form.schema.successScreen.content}
          </p>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
          {form.description && <p className="text-sm text-gray-600 mt-1">{form.description}</p>}
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {errors._form && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors._form}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {form.schema.sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                values={values}
                errors={errors}
                onChange={handleFieldChange}
              />
            ))}

            <div className="flex justify-end pt-4 border-t mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-6 pb-6">
        <p className="text-xs text-gray-400 text-center">
          Powered by Forms Builder
        </p>
      </div>
    </div>
  );
}
