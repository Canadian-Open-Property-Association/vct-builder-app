/**
 * TemplateBuilder Component
 *
 * Main editor for creating and editing proof templates.
 * Three-panel layout: Claims list, Claim editor, Preview.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProofTemplateStore } from '../../../store/proofTemplateStore';
import { PROOF_TEMPLATE_CATEGORIES } from '../../../types/proofTemplate';
import ClaimEditor from './ClaimEditor';
import PresentationPreview from './PresentationPreview';

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentTemplate,
    isLoading,
    isSaving,
    error,
    selectedClaimId,
    fetchTemplate,
    saveTemplate,
    publishTemplate,
    updateTemplateName,
    updateTemplatePurpose,
    updateTemplateMetadata,
    addClaim,
    updateClaim,
    removeClaim,
    selectClaim,
    clearCurrentTemplate,
    clearError,
    getPresentationDefinition,
  } = useProofTemplateStore();

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; prUrl?: string; error?: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load template on mount
  useEffect(() => {
    if (id) {
      fetchTemplate(id);
    }
    return () => {
      clearCurrentTemplate();
    };
  }, [id, fetchTemplate, clearCurrentTemplate]);

  // Track changes
  useEffect(() => {
    if (currentTemplate) {
      setHasUnsavedChanges(true);
    }
  }, [currentTemplate?.name, currentTemplate?.description, currentTemplate?.purpose, currentTemplate?.claims, currentTemplate?.metadata]);

  // Auto-save after changes (debounced)
  const handleSave = useCallback(async () => {
    if (!currentTemplate || !hasUnsavedChanges) return;
    try {
      await saveTemplate();
      setHasUnsavedChanges(false);
    } catch (err) {
      // Error handled in store
    }
  }, [currentTemplate, hasUnsavedChanges, saveTemplate]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = setTimeout(handleSave, 2000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, handleSave]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishResult(null);
    try {
      const result = await publishTemplate(publishMessage || undefined);
      setPublishResult({ success: true, prUrl: result.prUrl });
    } catch (err) {
      setPublishResult({ success: false, error: err instanceof Error ? err.message : 'Failed to publish' });
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedClaim = currentTemplate?.claims.find((c) => c.id === selectedClaimId);

  // Loading state
  if (isLoading && !currentTemplate) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error && !currentTemplate) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">{error}</h3>
          <button
            onClick={() => navigate('/apps/proofs-template-builder')}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  if (!currentTemplate) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/apps/proofs-template-builder')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Back to templates"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <input
                type="text"
                value={currentTemplate.name}
                onChange={(e) => updateTemplateName(e.target.value)}
                className="text-xl font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent"
                placeholder="Template name..."
              />
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  currentTemplate.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {currentTemplate.status === 'published' ? 'Published' : 'Draft'}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-xs text-gray-400">Unsaved changes</span>
                )}
                {isSaving && (
                  <span className="text-xs text-blue-600">Saving...</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={currentTemplate.claims.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Publish to VDR
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <span className="text-red-800 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content - three panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Template info & Claims list */}
        <div className="w-80 flex-shrink-0 bg-white border-r flex flex-col overflow-hidden">
          {/* Template metadata */}
          <div className="p-4 border-b space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Purpose</label>
              <textarea
                value={currentTemplate.purpose}
                onChange={(e) => updateTemplatePurpose(e.target.value)}
                placeholder="What does this template verify? (shown to credential holders)"
                rows={2}
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={currentTemplate.metadata.category}
                  onChange={(e) => updateTemplateMetadata({ category: e.target.value })}
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PROOF_TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-500 mb-1">Version</label>
                <input
                  type="text"
                  value={currentTemplate.metadata.version}
                  onChange={(e) => updateTemplateMetadata({ version: e.target.value })}
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Claims list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b bg-gray-50 flex items-center justify-between sticky top-0">
              <h3 className="text-sm font-medium text-gray-700">Claims ({currentTemplate.claims.length})</h3>
              <button
                onClick={addClaim}
                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="Add claim"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {currentTemplate.claims.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No claims yet</p>
                <button
                  onClick={addClaim}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Add your first claim
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {currentTemplate.claims.map((claim, index) => (
                  <div
                    key={claim.id}
                    onClick={() => selectClaim(claim.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedClaimId === claim.id
                        ? 'bg-blue-50 border-l-2 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {claim.label || claim.name || `Claim ${index + 1}`}
                        </div>
                        {claim.purpose && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{claim.purpose}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {claim.required && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Required</span>
                          )}
                          {claim.constraints.length > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {claim.constraints.length} constraint{claim.constraints.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClaim(claim.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove claim"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center panel - Claim editor */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedClaim ? (
            <ClaimEditor
              claim={selectedClaim}
              onUpdate={(updates) => updateClaim(selectedClaim.id, updates)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p>Select a claim to edit</p>
                <p className="text-sm mt-1">or add a new claim to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Presentation Exchange preview */}
        <div className="w-96 flex-shrink-0 bg-white border-l overflow-hidden">
          <PresentationPreview definition={getPresentationDefinition()} />
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Publish to VDR</h2>
              <p className="text-gray-600 text-sm mt-1">
                This will create a pull request to add this proof template to the Verifiable Data Registry.
              </p>
            </div>

            {publishResult ? (
              <div className="p-6">
                {publishResult.success ? (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pull Request Created!</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Your proof template has been submitted for review.
                    </p>
                    <a
                      href={publishResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      View Pull Request
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Publishing Failed</h3>
                    <p className="text-red-600 text-sm">{publishResult.error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commit Message (optional)
                  </label>
                  <input
                    type="text"
                    value={publishMessage}
                    onChange={(e) => setPublishMessage(e.target.value)}
                    placeholder={`Add proof template: ${currentTemplate.name}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Template Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name:</dt>
                      <dd className="font-medium">{currentTemplate.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Category:</dt>
                      <dd>{currentTemplate.metadata.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Claims:</dt>
                      <dd>{currentTemplate.claims.length}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishMessage('');
                  setPublishResult(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {publishResult ? 'Close' : 'Cancel'}
              </button>
              {!publishResult && (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPublishing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  )}
                  Create Pull Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
