/**
 * TemplatesList Component
 *
 * Dashboard view showing all proof templates for the current user.
 * Allows creating, editing, publishing, and deleting templates.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProofTemplateStore } from '../../../store/proofTemplateStore';
import { PROOF_TEMPLATE_CATEGORIES } from '../../../types/proofTemplate';

export default function TemplatesList() {
  const navigate = useNavigate();
  const {
    templates,
    isLoading,
    error,
    databaseAvailable,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    cloneTemplate,
    clearError,
  } = useProofTemplateStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      const template = await createTemplate(newName.trim(), newDescription.trim(), newCategory);
      setShowNewModal(false);
      setNewName('');
      setNewDescription('');
      setNewCategory('general');
      navigate(`/apps/proofs-template-builder/edit/${template.id}`);
    } catch (err) {
      // Error handled in store
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (template: { id: string; name: string }) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    try {
      await deleteTemplate(template.id);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleClone = async (template: { id: string }) => {
    try {
      const cloned = await cloneTemplate(template.id);
      navigate(`/apps/proofs-template-builder/edit/${cloned.id}`);
    } catch (err) {
      // Error handled in store
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryLabel = (value: string) => {
    return PROOF_TEMPLATE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

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
                Proof Templates Builder requires PostgreSQL to be configured. Please check the DATABASE_URL environment variable.
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
          <h1 className="text-2xl font-bold text-gray-900">Ecosystem Proof Templates</h1>
          <p className="text-gray-600 mt-1">Create and publish proof templates for the ecosystem</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
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
      {isLoading && templates.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No proof templates yet</h3>
          <p className="text-gray-500 mb-4">Create your first proof template to get started</p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </div>
      )}

      {/* Templates grid */}
      {templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* Template header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{template.description}</p>
                  )}
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                    template.status === 'published'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {template.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {getCategoryLabel(template.category)}
                </span>
                <span>{template.claimCount} claim{template.claimCount !== 1 ? 's' : ''}</span>
                <span>Updated {formatDate(template.updatedAt)}</span>
              </div>

              {/* VDR URI (if published) */}
              {template.vdrUri && (
                <div className="mb-3 p-2 bg-green-50 rounded text-xs">
                  <div className="text-green-700 font-medium mb-1">Published to VDR</div>
                  <a
                    href={template.vdrUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 break-all"
                  >
                    {template.vdrUri}
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 border-t pt-3">
                <button
                  onClick={() => navigate(`/apps/proofs-template-builder/edit/${template.id}`)}
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleClone(template)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clone"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(template)}
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

      {/* New Template Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New Proof Template</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Age Verification, Income Proof"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PROOF_TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of what this template verifies..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewName('');
                  setNewDescription('');
                  setNewCategory('general');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
