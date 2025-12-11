import { create } from 'zustand';
import type {
  VocabType,
  VocabCategory,
  VocabDomain,
  VocabProperty,
  CategoryWithTypes,
  DomainWithTypes,
  DictionaryStats,
  DictionaryExport,
} from '../types/dictionary';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// ============================================
// Data Dictionary API
// Focused on vocabulary management only
// Provider mappings moved to harmonization app
// ============================================

const dictionaryApi = {
  // Vocab Types (vocabulary)
  async listVocabTypes(): Promise<VocabType[]> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch vocab types');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async getVocabType(id: string): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch vocab type');
    return response.json();
  },

  async createVocabType(vocabType: Partial<VocabType>): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(vocabType),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create vocab type');
    }
    return response.json();
  },

  async updateVocabType(id: string, updates: Partial<VocabType>): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update vocab type');
    return response.json();
  },

  async deleteVocabType(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete vocab type');
  },

  // Properties (attributes of a vocab type)
  async addProperty(vocabTypeId: string, property: Partial<VocabProperty>): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${vocabTypeId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(property),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add property');
    }
    return response.json();
  },

  async updateProperty(vocabTypeId: string, propertyId: string, updates: Partial<VocabProperty>): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${vocabTypeId}/properties/${propertyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update property');
    return response.json();
  },

  async deleteProperty(vocabTypeId: string, propertyId: string): Promise<VocabType> {
    const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${vocabTypeId}/properties/${propertyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete property');
    return response.json();
  },

  // Categories
  async listCategories(): Promise<VocabCategory[]> {
    const response = await fetch(`${API_BASE}/api/dictionary/categories`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.categories)) return data.categories;
    return [];
  },

  async createCategory(category: Partial<VocabCategory>): Promise<VocabCategory> {
    const response = await fetch(`${API_BASE}/api/dictionary/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(category),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }
    return response.json();
  },

  // Search
  async search(query: string): Promise<{ vocabTypes: VocabType[] }> {
    const response = await fetch(`${API_BASE}/api/dictionary/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to search');
    return response.json();
  },

  // Export
  async exportAll(): Promise<DictionaryExport> {
    const response = await fetch(`${API_BASE}/api/dictionary/export`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export');
    return response.json();
  },

  // Stats
  async getStats(): Promise<DictionaryStats> {
    const response = await fetch(`${API_BASE}/api/dictionary/stats`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};

// ============================================
// Store Interface
// ============================================

interface DictionaryState {
  // Data
  vocabTypes: VocabType[];
  domains: VocabDomain[];
  /** @deprecated Use domains */
  categories: VocabCategory[];
  selectedVocabType: VocabType | null;

  // Loading states
  isLoading: boolean;
  isVocabTypeLoading: boolean;
  error: string | null;

  // Search
  searchQuery: string;
  searchResults: VocabType[] | null;

  // Domain filter for flat list view
  selectedDomainFilter: string | null;  // null = show all

  // Actions
  fetchVocabTypes: () => Promise<void>;
  fetchDomains: () => Promise<void>;
  /** @deprecated Use fetchDomains */
  fetchCategories: () => Promise<void>;
  selectVocabType: (id: string) => Promise<void>;
  clearSelection: () => void;

  // VocabType CRUD
  createVocabType: (vocabType: Partial<VocabType>) => Promise<VocabType>;
  updateVocabType: (id: string, updates: Partial<VocabType>) => Promise<void>;
  deleteVocabType: (id: string) => Promise<void>;

  // Property CRUD
  addProperty: (vocabTypeId: string, property: Partial<VocabProperty>) => Promise<void>;
  updateProperty: (vocabTypeId: string, propertyId: string, updates: Partial<VocabProperty>) => Promise<void>;
  deleteProperty: (vocabTypeId: string, propertyId: string) => Promise<void>;
  moveProperties: (sourceVocabTypeId: string, propertyIds: string[], targetVocabTypeId: string) => Promise<void>;

  // Domain CRUD
  createDomain: (domain: Partial<VocabDomain>) => Promise<VocabDomain>;
  /** @deprecated Use createDomain */
  createCategory: (category: Partial<VocabCategory>) => Promise<VocabCategory>;

  // Search & Export
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  exportAll: () => Promise<DictionaryExport>;

  // Domain filter actions
  setDomainFilter: (domainId: string | null) => void;

  // Helper: Get vocab types grouped by domain (flat list with filter)
  getVocabTypesByDomain: () => DomainWithTypes[];
  /** @deprecated Use getVocabTypesByDomain */
  getVocabTypesByCategory: () => CategoryWithTypes[];

  // Helper: Get filtered vocab types based on selected domain
  getFilteredVocabTypes: () => VocabType[];
}

// ============================================
// Store Implementation
// ============================================

export const useDictionaryStore = create<DictionaryState>((set, get) => ({
  // Initial state
  vocabTypes: [],
  domains: [],
  categories: [],  // Deprecated alias for domains
  selectedVocabType: null,
  isLoading: false,
  isVocabTypeLoading: false,
  error: null,
  searchQuery: '',
  searchResults: null,
  selectedDomainFilter: null,

  // Fetch all vocab types
  fetchVocabTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const vocabTypes = await dictionaryApi.listVocabTypes();
      set({ vocabTypes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch vocab types',
        isLoading: false,
      });
    }
  },

  // Fetch domains (new name for categories)
  fetchDomains: async () => {
    try {
      const domains = await dictionaryApi.listCategories();
      set({ domains, categories: domains });  // Keep categories in sync for backwards compat
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  },

  // Deprecated: Fetch categories (alias for fetchDomains)
  fetchCategories: async () => {
    return get().fetchDomains();
  },

  // Select a vocab type
  selectVocabType: async (id: string) => {
    set({ isVocabTypeLoading: true, error: null });
    try {
      const vocabType = await dictionaryApi.getVocabType(id);
      set({
        selectedVocabType: vocabType,
        isVocabTypeLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch vocab type',
        isVocabTypeLoading: false,
      });
    }
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedVocabType: null });
  },

  // Create vocab type
  createVocabType: async (vocabType) => {
    const result = await dictionaryApi.createVocabType(vocabType);
    await get().fetchVocabTypes();
    return result;
  },

  // Update vocab type
  updateVocabType: async (id, updates) => {
    await dictionaryApi.updateVocabType(id, updates);
    await get().fetchVocabTypes();
    if (get().selectedVocabType?.id === id) {
      await get().selectVocabType(id);
    }
  },

  // Delete vocab type
  deleteVocabType: async (id) => {
    await dictionaryApi.deleteVocabType(id);
    if (get().selectedVocabType?.id === id) {
      set({ selectedVocabType: null });
    }
    await get().fetchVocabTypes();
  },

  // Add property
  addProperty: async (vocabTypeId, property) => {
    const updated = await dictionaryApi.addProperty(vocabTypeId, property);
    set({ selectedVocabType: updated });
    await get().fetchVocabTypes();
  },

  // Update property
  updateProperty: async (vocabTypeId, propertyId, updates) => {
    const updated = await dictionaryApi.updateProperty(vocabTypeId, propertyId, updates);
    set({ selectedVocabType: updated });
    await get().fetchVocabTypes();
  },

  // Delete property
  deleteProperty: async (vocabTypeId, propertyId) => {
    const updated = await dictionaryApi.deleteProperty(vocabTypeId, propertyId);
    set({ selectedVocabType: updated });
    await get().fetchVocabTypes();
  },

  // Move properties from one vocab type to another
  moveProperties: async (sourceVocabTypeId, propertyIds, targetVocabTypeId) => {
    // Get the source vocab type to find the properties
    const sourceVocabType = get().vocabTypes.find(vt => vt.id === sourceVocabTypeId);
    if (!sourceVocabType) throw new Error('Source vocab type not found');

    // Get properties to move
    const propertiesToMove = sourceVocabType.properties.filter(p => propertyIds.includes(p.id));
    if (propertiesToMove.length === 0) throw new Error('No properties to move');

    // Add properties to target (without id so new IDs are generated)
    for (const prop of propertiesToMove) {
      const { id, createdAt, updatedAt, ...propData } = prop;
      await dictionaryApi.addProperty(targetVocabTypeId, propData);
    }

    // Remove properties from source
    for (const propId of propertyIds) {
      await dictionaryApi.deleteProperty(sourceVocabTypeId, propId);
    }

    // Refresh data
    await get().fetchVocabTypes();
    // Update selected vocab type if it was the source
    if (get().selectedVocabType?.id === sourceVocabTypeId) {
      await get().selectVocabType(sourceVocabTypeId);
    }
  },

  // Create domain
  createDomain: async (domain) => {
    const result = await dictionaryApi.createCategory(domain);
    await get().fetchDomains();
    return result;
  },

  // Deprecated: Create category (alias for createDomain)
  createCategory: async (category) => {
    return get().createDomain(category);
  },

  // Set domain filter for flat list view
  setDomainFilter: (domainId: string | null) => {
    set({ selectedDomainFilter: domainId });
  },

  // Search
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  search: async (query) => {
    if (query.length < 2) {
      set({ searchResults: null });
      return;
    }
    try {
      const results = await dictionaryApi.search(query);
      set({ searchResults: results.vocabTypes });
    } catch (error) {
      console.error('Search error:', error);
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: null });
  },

  // Export
  exportAll: async () => {
    return dictionaryApi.exportAll();
  },

  // Helper: Get vocab types grouped by domain
  getVocabTypesByDomain: () => {
    const { vocabTypes, domains } = get();
    const result: DomainWithTypes[] = [];

    if (!Array.isArray(vocabTypes)) {
      return result;
    }

    // Sort domains by order
    const sortedDomains = Array.isArray(domains)
      ? [...domains].sort((a, b) => a.order - b.order)
      : [];

    // For each domain, find all vocab types that have that domain
    for (const domain of sortedDomains) {
      const typesInDomain = vocabTypes.filter(vt => {
        // Support both new domains array and legacy category field
        if (vt.domains && vt.domains.length > 0) {
          return vt.domains.includes(domain.id);
        }
        // Legacy: fall back to category field
        return vt.category === domain.id;
      });
      if (typesInDomain.length > 0) {
        result.push({ domain, vocabTypes: typesInDomain });
      }
    }

    // Add "Untagged" for vocab types with no domains
    const untaggedTypes = vocabTypes.filter(vt => {
      const hasDomains = vt.domains && vt.domains.length > 0;
      const hasCategory = vt.category && vt.category !== 'other';
      return !hasDomains && !hasCategory;
    });
    if (untaggedTypes.length > 0) {
      result.push({
        domain: { id: 'untagged', name: 'Untagged', order: 999 },
        vocabTypes: untaggedTypes,
      });
    }

    return result;
  },

  // Deprecated: Get vocab types grouped by category (alias for getVocabTypesByDomain)
  getVocabTypesByCategory: () => {
    return get().getVocabTypesByDomain();
  },

  // Helper: Get filtered vocab types based on selected domain
  getFilteredVocabTypes: () => {
    const { vocabTypes, selectedDomainFilter, searchQuery, searchResults } = get();

    // If search is active, use search results
    if (searchQuery && searchResults) {
      return searchResults;
    }

    if (!Array.isArray(vocabTypes)) {
      return [];
    }

    // If no filter, return all
    if (!selectedDomainFilter) {
      return vocabTypes;
    }

    // Filter by domain
    return vocabTypes.filter(vt => {
      // Support both new domains array and legacy category field
      if (vt.domains && vt.domains.length > 0) {
        return vt.domains.includes(selectedDomainFilter);
      }
      // Legacy: fall back to category field
      return vt.category === selectedDomainFilter;
    });
  },
}));
