import { create } from 'zustand';
import type {
  DataType,
  DataTypeCategory,
  Property,
  DataSource,
  ProviderMapping,
  CategoryWithTypes,
  CatalogueStats,
} from '../types/catalogue';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// ============================================
// Vocabulary-First API
// ============================================

const catalogueApi = {
  // Data Types (vocabulary)
  async listDataTypes(): Promise<DataType[]> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch data types');
    const data = await response.json();
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  },

  async getDataType(id: string): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch data type');
    return response.json();
  },

  async createDataType(dataType: Partial<DataType>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dataType),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create data type');
    }
    return response.json();
  },

  async updateDataType(id: string, updates: Partial<DataType>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update data type');
    return response.json();
  },

  async deleteDataType(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete data type');
  },

  // Properties (attributes of a data type)
  async addProperty(dataTypeId: string, property: Partial<Property>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties`, {
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

  async updateProperty(dataTypeId: string, propertyId: string, updates: Partial<Property>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/${propertyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update property');
    return response.json();
  },

  async deleteProperty(dataTypeId: string, propertyId: string): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/${propertyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete property');
    return response.json();
  },

  // Data Sources (link data type to entity)
  async addSource(dataTypeId: string, source: Partial<DataSource>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(source),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add source');
    }
    return response.json();
  },

  async updateSource(dataTypeId: string, entityId: string, updates: Partial<DataSource>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/sources/${entityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update source');
    return response.json();
  },

  async removeSource(dataTypeId: string, entityId: string): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/sources/${entityId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to remove source');
    return response.json();
  },

  // Provider Mappings (at property level)
  async addProviderMapping(dataTypeId: string, propertyId: string, mapping: Partial<ProviderMapping>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/${propertyId}/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(mapping),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add provider mapping');
    }
    return response.json();
  },

  async updateProviderMapping(dataTypeId: string, propertyId: string, entityId: string, updates: Partial<ProviderMapping>): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/${propertyId}/mappings/${entityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update provider mapping');
    return response.json();
  },

  async removeProviderMapping(dataTypeId: string, propertyId: string, entityId: string): Promise<DataType> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/${propertyId}/mappings/${entityId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to remove provider mapping');
    return response.json();
  },

  async bulkAddProviderMapping(dataTypeId: string, propertyIds: string[], mapping: Partial<ProviderMapping>): Promise<{ success: boolean; added: number; skipped: number; dataType: DataType }> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/bulk-add-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ propertyIds, mapping }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk add provider mappings');
    }
    return response.json();
  },

  async bulkRemoveProviderMapping(dataTypeId: string, propertyIds: string[], entityId: string): Promise<{ success: boolean; removed: number; skipped: number; dataType: DataType }> {
    const response = await fetch(`${API_BASE}/api/catalogue/data-types/${dataTypeId}/properties/bulk-remove-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ propertyIds, entityId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk remove provider mappings');
    }
    return response.json();
  },

  // Categories
  async listCategories(): Promise<DataTypeCategory[]> {
    const response = await fetch(`${API_BASE}/api/catalogue/categories`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    // Handle both array and {categories: [...]} response formats
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.categories)) {
      return data.categories;
    }
    return [];
  },

  async createCategory(category: Partial<DataTypeCategory>): Promise<DataTypeCategory> {
    const response = await fetch(`${API_BASE}/api/catalogue/categories`, {
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
  async search(query: string): Promise<{ dataTypes: DataType[] }> {
    const response = await fetch(`${API_BASE}/api/catalogue/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to search');
    return response.json();
  },

  // Export
  async exportAll(): Promise<{ categories: DataTypeCategory[]; dataTypes: DataType[] }> {
    const response = await fetch(`${API_BASE}/api/catalogue/export`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export');
    return response.json();
  },

  // Stats
  async getStats(): Promise<CatalogueStats> {
    const response = await fetch(`${API_BASE}/api/catalogue/stats`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};

// ============================================
// Store Interface
// ============================================

interface DataCatalogueState {
  // Data
  dataTypes: DataType[];
  categories: DataTypeCategory[];
  selectedDataType: DataType | null;

  // Loading states
  isLoading: boolean;
  isDataTypeLoading: boolean;
  error: string | null;

  // Search
  searchQuery: string;
  searchResults: DataType[] | null;

  // Actions
  fetchDataTypes: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  selectDataType: (id: string) => Promise<void>;
  clearSelection: () => void;

  // Data Type CRUD
  createDataType: (dataType: Partial<DataType>) => Promise<DataType>;
  updateDataType: (id: string, updates: Partial<DataType>) => Promise<void>;
  deleteDataType: (id: string) => Promise<void>;

  // Property CRUD
  addProperty: (dataTypeId: string, property: Partial<Property>) => Promise<void>;
  updateProperty: (dataTypeId: string, propertyId: string, updates: Partial<Property>) => Promise<void>;
  deleteProperty: (dataTypeId: string, propertyId: string) => Promise<void>;

  // Source CRUD
  addSource: (dataTypeId: string, source: Partial<DataSource>) => Promise<void>;
  updateSource: (dataTypeId: string, entityId: string, updates: Partial<DataSource>) => Promise<void>;
  removeSource: (dataTypeId: string, entityId: string) => Promise<void>;

  // Provider Mapping CRUD (at property level)
  addProviderMapping: (dataTypeId: string, propertyId: string, mapping: Partial<ProviderMapping>) => Promise<void>;
  updateProviderMapping: (dataTypeId: string, propertyId: string, entityId: string, updates: Partial<ProviderMapping>) => Promise<void>;
  removeProviderMapping: (dataTypeId: string, propertyId: string, entityId: string) => Promise<void>;
  bulkAddProviderMapping: (dataTypeId: string, propertyIds: string[], mapping: Partial<ProviderMapping>) => Promise<{ added: number; skipped: number }>;
  bulkRemoveProviderMapping: (dataTypeId: string, propertyIds: string[], entityId: string) => Promise<{ removed: number; skipped: number }>;

  // Category CRUD
  createCategory: (category: Partial<DataTypeCategory>) => Promise<DataTypeCategory>;

  // Search & Export
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  exportAll: () => Promise<{ categories: DataTypeCategory[]; dataTypes: DataType[] }>;

  // Helper: Get data types grouped by category
  getDataTypesByCategory: () => CategoryWithTypes[];
}

// ============================================
// Store Implementation
// ============================================

export const useDataCatalogueStore = create<DataCatalogueState>((set, get) => ({
  // Initial state
  dataTypes: [],
  categories: [],
  selectedDataType: null,
  isLoading: false,
  isDataTypeLoading: false,
  error: null,
  searchQuery: '',
  searchResults: null,

  // Fetch all data types
  fetchDataTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const dataTypes = await catalogueApi.listDataTypes();
      set({ dataTypes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch data types',
        isLoading: false,
      });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const categories = await catalogueApi.listCategories();
      set({ categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  // Select a data type
  selectDataType: async (id: string) => {
    set({ isDataTypeLoading: true, error: null });
    try {
      const dataType = await catalogueApi.getDataType(id);
      set({
        selectedDataType: dataType,
        isDataTypeLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch data type',
        isDataTypeLoading: false,
      });
    }
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedDataType: null });
  },

  // Create data type
  createDataType: async (dataType) => {
    const result = await catalogueApi.createDataType(dataType);
    await get().fetchDataTypes();
    return result;
  },

  // Update data type
  updateDataType: async (id, updates) => {
    await catalogueApi.updateDataType(id, updates);
    await get().fetchDataTypes();
    if (get().selectedDataType?.id === id) {
      await get().selectDataType(id);
    }
  },

  // Delete data type
  deleteDataType: async (id) => {
    await catalogueApi.deleteDataType(id);
    if (get().selectedDataType?.id === id) {
      set({ selectedDataType: null });
    }
    await get().fetchDataTypes();
  },

  // Add property
  addProperty: async (dataTypeId, property) => {
    const updated = await catalogueApi.addProperty(dataTypeId, property);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Update property
  updateProperty: async (dataTypeId, propertyId, updates) => {
    const updated = await catalogueApi.updateProperty(dataTypeId, propertyId, updates);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Delete property
  deleteProperty: async (dataTypeId, propertyId) => {
    const updated = await catalogueApi.deleteProperty(dataTypeId, propertyId);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Add source
  addSource: async (dataTypeId, source) => {
    const updated = await catalogueApi.addSource(dataTypeId, source);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Update source
  updateSource: async (dataTypeId, entityId, updates) => {
    const updated = await catalogueApi.updateSource(dataTypeId, entityId, updates);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Remove source
  removeSource: async (dataTypeId, entityId) => {
    const updated = await catalogueApi.removeSource(dataTypeId, entityId);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Add provider mapping to a property
  addProviderMapping: async (dataTypeId, propertyId, mapping) => {
    const updated = await catalogueApi.addProviderMapping(dataTypeId, propertyId, mapping);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Update provider mapping on a property
  updateProviderMapping: async (dataTypeId, propertyId, entityId, updates) => {
    const updated = await catalogueApi.updateProviderMapping(dataTypeId, propertyId, entityId, updates);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Remove provider mapping from a property
  removeProviderMapping: async (dataTypeId, propertyId, entityId) => {
    const updated = await catalogueApi.removeProviderMapping(dataTypeId, propertyId, entityId);
    set({ selectedDataType: updated });
    await get().fetchDataTypes();
  },

  // Bulk add provider mapping to multiple properties
  bulkAddProviderMapping: async (dataTypeId, propertyIds, mapping) => {
    const result = await catalogueApi.bulkAddProviderMapping(dataTypeId, propertyIds, mapping);
    set({ selectedDataType: result.dataType });
    await get().fetchDataTypes();
    return { added: result.added, skipped: result.skipped };
  },

  // Bulk remove provider mapping from multiple properties
  bulkRemoveProviderMapping: async (dataTypeId, propertyIds, entityId) => {
    const result = await catalogueApi.bulkRemoveProviderMapping(dataTypeId, propertyIds, entityId);
    set({ selectedDataType: result.dataType });
    await get().fetchDataTypes();
    return { removed: result.removed, skipped: result.skipped };
  },

  // Create category
  createCategory: async (category) => {
    const result = await catalogueApi.createCategory(category);
    await get().fetchCategories();
    return result;
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
      const results = await catalogueApi.search(query);
      set({ searchResults: results.dataTypes });
    } catch (error) {
      console.error('Search error:', error);
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: null });
  },

  // Export
  exportAll: async () => {
    return catalogueApi.exportAll();
  },

  // Helper: Get data types grouped by category
  getDataTypesByCategory: () => {
    const { dataTypes, categories } = get();
    const result: CategoryWithTypes[] = [];

    // Guard against non-array dataTypes (e.g., API error or loading state)
    if (!Array.isArray(dataTypes)) {
      return result;
    }

    // Group data types by category
    const grouped = new Map<string, DataType[]>();
    for (const dt of dataTypes) {
      const catId = dt.category || 'other';
      if (!grouped.has(catId)) {
        grouped.set(catId, []);
      }
      grouped.get(catId)!.push(dt);
    }

    // Sort categories and create result (guard against non-array)
    const sortedCategories = Array.isArray(categories)
      ? [...categories].sort((a, b) => a.order - b.order)
      : [];
    for (const cat of sortedCategories) {
      const types = grouped.get(cat.id) || [];
      if (types.length > 0) {
        result.push({ category: cat, dataTypes: types });
      }
    }

    // Add "Other" category for uncategorized types
    const otherTypes = grouped.get('other') || [];
    if (otherTypes.length > 0) {
      result.push({
        category: { id: 'other', name: 'Other', order: 999 },
        dataTypes: otherTypes,
      });
    }

    return result;
  },
}));
