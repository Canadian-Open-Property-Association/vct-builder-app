/**
 * VocabularyManager Component
 *
 * Manages vocabulary loading and selection for JSON-LD Context mode.
 * Similar to zone template selector in the VCT Builder.
 */

import { useState, useEffect } from 'react';
import {
  useVocabularyStore,
  loadDefaultVocabulary,
} from '../../../store/vocabularyStore';
import { useSchemaStore } from '../../../store/schemaStore';

export default function VocabularyManager() {
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const vocabularies = useVocabularyStore((state) => state.vocabularies);
  const selectedVocabId = useVocabularyStore((state) => state.selectedVocabId);
  const isLoading = useVocabularyStore((state) => state.isLoading);
  const error = useVocabularyStore((state) => state.error);
  const loadVocabulary = useVocabularyStore((state) => state.loadVocabulary);
  const selectVocabulary = useVocabularyStore((state) => state.selectVocabulary);
  const removeVocabulary = useVocabularyStore((state) => state.removeVocabulary);
  const clearError = useVocabularyStore((state) => state.clearError);

  const updateMetadata = useSchemaStore((state) => state.updateMetadata);

  // Load default vocabulary on mount if none loaded
  useEffect(() => {
    if (vocabularies.length === 0 && !isLoading) {
      loadDefaultVocabulary();
    }
  }, [vocabularies.length, isLoading]);

  // Update schema metadata when vocabulary changes
  useEffect(() => {
    const vocab = vocabularies.find((v) => v.id === selectedVocabId);
    if (vocab) {
      updateMetadata({
        vocabUrl: vocab.url,
        contextUrl: vocab.contextUrl,
      });
    }
  }, [selectedVocabId, vocabularies, updateMetadata]);

  const handleLoadCustom = async () => {
    if (!customUrl.trim()) return;

    clearError();
    const vocab = await loadVocabulary(customUrl.trim());
    if (vocab) {
      setCustomUrl('');
      setShowCustomInput(false);
    }
  };

  const handleRemove = (id: string) => {
    if (vocabularies.length === 1) {
      alert('Cannot remove the last vocabulary. Load another vocabulary first.');
      return;
    }
    removeVocabulary(id);
  };

  const selectedVocab = vocabularies.find((v) => v.id === selectedVocabId);

  return (
    <div className="p-3 border-b border-gray-200 bg-purple-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Vocabulary
        </h3>
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
        >
          {showCustomInput ? (
            'Cancel'
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Load URL
            </>
          )}
        </button>
      </div>

      {/* Custom URL Input */}
      {showCustomInput && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/vocab.jsonld"
              className="flex-1 px-2 py-1.5 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadCustom();
              }}
            />
            <button
              onClick={handleLoadCustom}
              disabled={isLoading || !customUrl.trim()}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          </div>
          <p className="mt-1 text-xs text-purple-600">
            Enter a URL to a JSON-LD vocabulary file
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
          {error}
          <button
            onClick={clearError}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Vocabulary Selector */}
      <div className="relative">
        <select
          value={selectedVocabId || ''}
          onChange={(e) => selectVocabulary(e.target.value || null)}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100"
        >
          {vocabularies.length === 0 ? (
            <option value="">Loading vocabulary...</option>
          ) : (
            vocabularies.map((vocab) => (
              <option key={vocab.id} value={vocab.id}>
                {vocab.name} (v{vocab.version})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Selected Vocabulary Info */}
      {selectedVocab && (
        <div className="mt-2 text-xs text-purple-700">
          <p className="truncate" title={selectedVocab.description}>
            {selectedVocab.description}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span>
              <span className="font-medium">{selectedVocab.terms.length}</span> terms
              {selectedVocab.complexTypes.length > 0 && (
                <>
                  , <span className="font-medium">{selectedVocab.complexTypes.length}</span> types
                </>
              )}
            </span>
            {vocabularies.length > 1 && (
              <button
                onClick={() => handleRemove(selectedVocab.id)}
                className="text-purple-500 hover:text-red-600"
                title="Remove this vocabulary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
