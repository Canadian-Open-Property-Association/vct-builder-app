/**
 * Catalogue Settings Modal
 *
 * Modal for managing ecosystem tags in the Credential Catalogue.
 * Matches Entity Manager's SettingsModal layout with left menu and right content.
 */

import { useState, useEffect } from 'react';
import { useCatalogueStore } from '../../../store/catalogueStore';
import IssuableCredentialsSettings from './IssuableCredentialsSettings';

interface CatalogueSettingsModalProps {
  onClose: () => void;
}

type SettingsCategory = 'ecosystem-tags' | 'issuable-credentials';

const CATEGORIES = [
  {
    id: 'ecosystem-tags' as const,
    label: 'Ecosystem Tags',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
  {
    id: 'issuable-credentials' as const,
    label: 'Test Issuer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
];

export default function CatalogueSettingsModal({ onClose }: CatalogueSettingsModalProps) {
  const { ecosystemTags, fetchTags, addCustomTag, deleteTag } = useCatalogueStore();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('ecosystem-tags');
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Generate ID from name
  const generateId = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Add new tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    const id = generateId(newTagName);

    // Check for duplicates
    if (ecosystemTags.some((t) => t.id === id)) {
      setError('An ecosystem tag with this name already exists');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await addCustomTag(newTagName.trim());
      setNewTagName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete tag
  const handleDeleteTag = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await deleteTag(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Catalogue Settings</h2>
              <p className="text-sm text-gray-500">Configure catalogue options and tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar - Categories */}
          <div className="w-56 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            <nav className="p-3 space-y-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'bg-white text-purple-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <span
                    className={activeCategory === category.id ? 'text-purple-600' : 'text-gray-400'}
                  >
                    {category.icon}
                  </span>
                  {category.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Ecosystem Tags */}
              {activeCategory === 'ecosystem-tags' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Ecosystem Tags</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage the ecosystem tags used to categorize imported credentials.
                    </p>
                  </div>

                  {/* All Tags */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Tags ({ecosystemTags.length})
                    </h4>

                    {ecosystemTags.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {ecosystemTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
                              {tag.name}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">{tag.id}</span>
                            <button
                              onClick={() => handleDeleteTag(tag.id)}
                              disabled={isSaving}
                              className="ml-auto p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                              title="Remove tag"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mb-4">
                        No tags yet. Add one below.
                      </p>
                    )}

                    {/* Add new tag */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Tag</h4>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Tag name (e.g., My Organization)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={handleAddTag}
                          disabled={!newTagName.trim() || isSaving}
                          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          )}
                          Add Tag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Issuable Credentials */}
              {activeCategory === 'issuable-credentials' && (
                <IssuableCredentialsSettings onSaving={setIsSaving} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
