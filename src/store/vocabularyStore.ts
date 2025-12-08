/**
 * Vocabulary Store
 *
 * Manages vocabulary loading and selection for JSON-LD Context mode.
 * Similar pattern to zoneTemplateStore for zone templates.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Vocabulary,
  VocabTerm,
  VocabComplexType,
  DEFAULT_VOCAB_URL,
} from '../types/vocabulary';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface VocabularyStore {
  // Loaded vocabularies
  vocabularies: Vocabulary[];
  selectedVocabId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadVocabulary: (url: string) => Promise<Vocabulary | null>;
  selectVocabulary: (id: string | null) => void;
  removeVocabulary: (id: string) => void;
  clearError: () => void;

  // Getters (as functions since Zustand doesn't have computed properties)
  getSelectedVocab: () => Vocabulary | null;
  getTermById: (termId: string) => VocabTerm | null;
  getComplexTypeById: (typeId: string) => VocabComplexType | null;
  getAllTerms: () => VocabTerm[];
  getAllComplexTypes: () => VocabComplexType[];
}

export const useVocabularyStore = create<VocabularyStore>()(
  persist(
    (set, get) => ({
      vocabularies: [],
      selectedVocabId: null,
      isLoading: false,
      error: null,

      loadVocabulary: async (url: string): Promise<Vocabulary | null> => {
        set({ isLoading: true, error: null });

        try {
          // Fetch vocabulary from URL via our proxy (to handle CORS)
          const response = await fetch(
            `${API_BASE}/api/vocabulary/fetch?url=${encodeURIComponent(url)}`,
            { credentials: 'include' }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to fetch vocabulary: ${response.statusText}`
            );
          }

          const vocab: Vocabulary = await response.json();

          set((state) => {
            // Check if vocab already exists, update if so
            const existingIndex = state.vocabularies.findIndex(
              (v) => v.id === vocab.id || v.url === url
            );

            if (existingIndex >= 0) {
              const updatedVocabs = [...state.vocabularies];
              updatedVocabs[existingIndex] = vocab;
              return {
                vocabularies: updatedVocabs,
                selectedVocabId: vocab.id,
                isLoading: false,
              };
            }

            return {
              vocabularies: [...state.vocabularies, vocab],
              selectedVocabId: vocab.id,
              isLoading: false,
            };
          });

          return vocab;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error loading vocabulary';
          set({
            error: errorMessage,
            isLoading: false,
          });
          return null;
        }
      },

      selectVocabulary: (id: string | null) => {
        set({ selectedVocabId: id });
      },

      removeVocabulary: (id: string) => {
        set((state) => {
          const newVocabs = state.vocabularies.filter((v) => v.id !== id);
          return {
            vocabularies: newVocabs,
            // Clear selection if we removed the selected vocab
            selectedVocabId:
              state.selectedVocabId === id
                ? newVocabs.length > 0
                  ? newVocabs[0].id
                  : null
                : state.selectedVocabId,
          };
        });
      },

      clearError: () => {
        set({ error: null });
      },

      getSelectedVocab: (): Vocabulary | null => {
        const { vocabularies, selectedVocabId } = get();
        return vocabularies.find((v) => v.id === selectedVocabId) || null;
      },

      getTermById: (termId: string): VocabTerm | null => {
        const vocab = get().getSelectedVocab();
        if (!vocab) return null;
        return vocab.terms.find((t) => t.id === termId) || null;
      },

      getComplexTypeById: (typeId: string): VocabComplexType | null => {
        const vocab = get().getSelectedVocab();
        if (!vocab) return null;
        return vocab.complexTypes.find((t) => t.id === typeId) || null;
      },

      getAllTerms: (): VocabTerm[] => {
        const vocab = get().getSelectedVocab();
        return vocab?.terms || [];
      },

      getAllComplexTypes: (): VocabComplexType[] => {
        const vocab = get().getSelectedVocab();
        return vocab?.complexTypes || [];
      },
    }),
    {
      name: 'vocabulary-storage',
      partialize: (state) => ({
        // Only persist vocabularies and selection, not loading state
        vocabularies: state.vocabularies,
        selectedVocabId: state.selectedVocabId,
      }),
    }
  )
);

/**
 * Load default COPA vocabulary on initialization
 */
export const loadDefaultVocabulary = async (): Promise<void> => {
  const store = useVocabularyStore.getState();

  // Only load if we don't have any vocabularies yet
  if (store.vocabularies.length === 0) {
    await store.loadVocabulary(DEFAULT_VOCAB_URL);
  }
};

/**
 * Hook to ensure default vocabulary is loaded
 * Call this in components that need vocabulary
 */
export const useEnsureVocabulary = (): void => {
  const vocabularies = useVocabularyStore((state) => state.vocabularies);
  const isLoading = useVocabularyStore((state) => state.isLoading);

  if (vocabularies.length === 0 && !isLoading) {
    loadDefaultVocabulary();
  }
};
