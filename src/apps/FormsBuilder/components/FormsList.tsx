/**
 * FormsList Component
 *
 * Dashboard view showing all forms for the current user.
 * Allows creating, editing, publishing, and deleting forms.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormsStore } from '../../../store/formsStore';
import { FormListItem } from '../../../types/forms';

export default function FormsList() {
  const navigate = useNavigate();
  const {
    forms,
    isLoading,
    error,
    databaseAvailable,
    fetchForms,
    createForm,
    deleteForm,
    publishForm,
    unpublishForm,
    cloneForm,
    clearError,
  } = useFormsStore();

  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch forms on mount
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) return;

    setIsCreating(true);
    try {
      const form = await createForm(newFormTitle.trim(), newFormDescription.trim());
      setShowNewFormModal(false);
      setNewFormTitle('');
      setNewFormDescription('');
      // Navigate to editor
      navigate(`/apps/forms-builder/edit/${form.id}`);
    } catch (err) {
      // Error is handled in store
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (form: FormListItem) => {
    if (!confirm(`Are you sure you want to delete "${form.title}"?`)) return;
    try {
      await deleteForm(form.id);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handlePublish = async (form: FormListItem) => {
    try {
      const result = await publishForm(form.id);
      alert(`Form published! Public URL: ${window.location.origin}${result.publicUrl}`);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleUnpublish = async (form: FormListItem) => {
    if (!confirm('This will make the form unavailable via its public URL. Continue?')) return;
    try {
      await unpublishForm(form.id);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleClone = async (form: FormListItem) => {
    try {
      const cloned = await cloneForm(form.id);
      navigate(`/apps/forms-builder/edit/${cloned.id}`);
    } catch (err) {
      // Error is handled in store
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Database not available warning
  if (!databaseAvailable) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-800">Database Unavailable</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Forms Builder requires PostgreSQL to be configured. Please check the DATABASE_URL environment variable.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Forms</h1>
          <p className="text-gray-600 mt-1">Create and manage forms with credential verification</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/apps/forms-builder/submissions')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Submissions
          </button>
          <button
            onClick={() => setShowNewFormModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Form
          </button>
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

      {/* Loading state */}
      {isLoading && forms.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && forms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No forms yet</h3>
          <p className="text-gray-500 mb-4">Create your first form to get started</p>
          <button
            onClick={() => setShowNewFormModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Form
          </button>
        </div>
      )}

      {/* Forms grid */}
      {forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* Form header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{form.title}</h3>
                  {form.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{form.description}</p>
                  )}
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                    form.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {form.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-400 mb-4">
                <span>Updated {formatDate(form.updatedAt)}</span>
                {form.publishedAt && (
                  <span className="ml-2">Published {formatDate(form.publishedAt)}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t pt-3">
                <button
                  onClick={() => navigate(`/apps/forms-builder/edit/${form.id}`)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                {form.status === 'draft' ? (
                  <button
                    onClick={() => handlePublish(form)}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Publish
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnpublish(form)}
                    className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                  >
                    Unpublish
                  </button>
                )}
                <button
                  onClick={() => handleClone(form)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clone"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(form)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Form Modal */}
      {showNewFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New Form</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  placeholder="e.g., Contact Form, Survey, Application"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newFormDescription}
                  onChange={(e) => setNewFormDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewFormModal(false);
                  setNewFormTitle('');
                  setNewFormDescription('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateForm}
                disabled={!newFormTitle.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                Create Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
