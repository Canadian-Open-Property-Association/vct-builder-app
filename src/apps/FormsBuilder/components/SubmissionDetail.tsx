/**
 * SubmissionDetail Component
 *
 * Displays the full details of a single form submission.
 * Shows field values organized by the original form structure.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { FormSchema } from '../../../types/forms';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface SubmissionWithForm {
  id: string;
  formId: string;
  formTitle: string;
  formSchema: FormSchema;
  sessionId: string;
  isTest: boolean;
  fieldValues: Record<string, unknown>;
  proofPresentations: Record<string, unknown> | null;
  submittedAt: string;
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<SubmissionWithForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchSubmission() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/submissions/${id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Submission not found');
            return;
          }
          throw new Error('Failed to fetch submission');
        }

        const data = await response.json();
        setSubmission(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch submission');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubmission();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error || !submission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">{error || 'Submission not found'}</h3>
          <Link
            to="/apps/forms-builder/submissions"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/apps/forms-builder/submissions"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Submission Details</h1>
          <p className="text-gray-600 mt-1">
            From: <span className="font-medium">{submission.formTitle}</span>
          </p>
        </div>
        {submission.isTest && (
          <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Test Submission
          </span>
        )}
      </div>

      {/* Metadata card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Submitted</span>
            <p className="font-medium text-gray-900">{formatDate(submission.submittedAt)}</p>
          </div>
          <div>
            <span className="text-gray-500">Session ID</span>
            <p className="font-mono text-xs text-gray-700 truncate" title={submission.sessionId}>
              {submission.sessionId}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Submission ID</span>
            <p className="font-mono text-xs text-gray-700 truncate" title={submission.id}>
              {submission.id}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Type</span>
            <p className="font-medium text-gray-900">{submission.isTest ? 'Test' : 'Live'}</p>
          </div>
        </div>
      </div>

      {/* Field values organized by section */}
      <div className="space-y-6">
        {submission.formSchema?.sections?.map((section) => {
          // Get field values for this section
          const sectionFields = section.fields.filter((field) =>
            submission.fieldValues.hasOwnProperty(field.name)
          );

          if (sectionFields.length === 0) return null;

          return (
            <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {sectionFields.map((field) => {
                  const value = submission.fieldValues[field.name];
                  const formattedValue = formatValue(value);
                  const isLongValue = formattedValue.length > 100;

                  return (
                    <div key={field.id} className="px-4 py-3 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <dt className="text-sm font-medium text-gray-700">{field.label || field.name}</dt>
                        <dd className={`mt-1 text-gray-900 ${isLongValue ? 'whitespace-pre-wrap font-mono text-xs bg-gray-50 p-2 rounded' : ''}`}>
                          {formattedValue}
                        </dd>
                      </div>
                      <button
                        onClick={() => copyToClipboard(formattedValue)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        title="Copy value"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Proof presentations (if any) */}
        {submission.proofPresentations && Object.keys(submission.proofPresentations).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verified Credentials
              </h3>
            </div>
            <div className="p-4">
              <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(submission.proofPresentations, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Raw data (collapsible) */}
        <details className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Raw JSON Data
          </summary>
          <div className="p-4 border-t">
            <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(submission.fieldValues, null, 2)}
            </pre>
          </div>
        </details>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => copyToClipboard(JSON.stringify(submission.fieldValues, null, 2))}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy JSON
        </button>
        <Link
          to="/apps/forms-builder/submissions"
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to List
        </Link>
      </div>
    </div>
  );
}
