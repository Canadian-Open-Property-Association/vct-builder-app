/**
 * SubmissionsList Component
 *
 * Dashboard view showing all form submissions for the current user.
 * Allows viewing, filtering, and exporting submissions.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface Submission {
  id: string;
  formId: string;
  formTitle: string;
  sessionId: string;
  isTest: boolean;
  fieldValues: Record<string, unknown>;
  proofPresentations: Record<string, unknown> | null;
  submittedAt: string;
}

export default function SubmissionsList() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFormId, setFilterFormId] = useState<string>('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());

  // Get unique forms from submissions
  const uniqueForms = Array.from(
    new Map(submissions.map((s) => [s.formId, { id: s.formId, title: s.formTitle }])).values()
  );

  // Filtered submissions
  const filteredSubmissions =
    filterFormId === 'all'
      ? submissions
      : submissions.filter((s) => s.formId === filterFormId);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/submissions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view submissions');
          return;
        }
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/submissions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete submission');

      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSelectedSubmissions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert('Failed to delete submission');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissions.size === 0) return;
    if (!confirm(`Delete ${selectedSubmissions.size} selected submissions?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/submissions/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: Array.from(selectedSubmissions) }),
      });

      if (!response.ok) throw new Error('Failed to delete submissions');

      setSubmissions((prev) => prev.filter((s) => !selectedSubmissions.has(s.id)));
      setSelectedSubmissions(new Set());
    } catch (err) {
      alert('Failed to delete submissions');
    }
  };

  const handleDownloadSingle = (submission: Submission, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click navigation
    const exportData = {
      id: submission.id,
      formId: submission.formId,
      formTitle: submission.formTitle,
      submittedAt: submission.submittedAt,
      isTest: submission.isTest,
      fieldValues: submission.fieldValues,
      proofPresentations: submission.proofPresentations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission-${submission.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = () => {
    if (selectedSubmissions.size === 0) return;

    const selectedData = filteredSubmissions
      .filter((s) => selectedSubmissions.has(s.id))
      .map((s) => ({
        id: s.id,
        formId: s.formId,
        formTitle: s.formTitle,
        submittedAt: s.submittedAt,
        isTest: s.isTest,
        fieldValues: s.fieldValues,
        proofPresentations: s.proofPresentations,
      }));

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSubmissions: selectedData.length,
      submissions: selectedData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-selected-${selectedData.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSubmissions: filteredSubmissions.length,
      submissions: filteredSubmissions.map((s) => ({
        id: s.id,
        formId: s.formId,
        formTitle: s.formTitle,
        submittedAt: s.submittedAt,
        isTest: s.isTest,
        fieldValues: s.fieldValues,
        proofPresentations: s.proofPresentations,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-all-${filteredSubmissions.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedSubmissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map((s) => s.id)));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/apps/forms-builder"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-600 mt-1">View and manage form submissions</p>
          </div>
        </div>

        {/* Filter and actions */}
        <div className="flex items-center gap-3">
          {uniqueForms.length > 1 && (
            <select
              value={filterFormId}
              onChange={(e) => setFilterFormId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Forms</option>
              {uniqueForms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.title}
                </option>
              ))}
            </select>
          )}

          {/* Download buttons */}
          {filteredSubmissions.length > 0 && (
            <>
              {selectedSubmissions.size > 0 ? (
                <button
                  onClick={handleDownloadSelected}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Selected ({selectedSubmissions.size})
                </button>
              ) : (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All
                </button>
              )}
            </>
          )}

          {selectedSubmissions.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ({selectedSubmissions.size})
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Empty state */}
      {submissions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No submissions yet</h3>
          <p className="text-gray-500 mb-4">Submissions will appear here when users fill out your published forms</p>
          <Link
            to="/apps/forms-builder"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Forms
          </Link>
        </div>
      )}

      {/* Submissions table */}
      {filteredSubmissions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedSubmissions.size === filteredSubmissions.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => {
                // Get first 2-3 field values for preview
                const fieldEntries = Object.entries(submission.fieldValues).slice(0, 3);
                const previewText = fieldEntries
                  .map(([key, value]) => `${key}: ${String(value).substring(0, 30)}`)
                  .join(', ');

                return (
                  <tr
                    key={submission.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/apps/forms-builder/submissions/${submission.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.has(submission.id)}
                        onChange={() => toggleSelection(submission.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{submission.formTitle}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(submission.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {submission.isTest ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Test
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Live
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {previewText || 'No data'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDownloadSingle(submission, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Download"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats */}
      {submissions.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredSubmissions.length} of {submissions.length} submissions
          {filterFormId !== 'all' && ` for selected form`}
        </div>
      )}
    </div>
  );
}
