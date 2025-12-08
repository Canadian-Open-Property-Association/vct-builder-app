import { create } from 'zustand';
import type {
  Furnisher,
  DataType,
  DataAttribute,
  FurnisherWithDataTypes,
  Selection,
  FurnisherStats,
} from '../types/catalogue';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// API helpers
const catalogueApi = {
  // Furnishers
  async listFurnishers(): Promise<(Furnisher & { stats: FurnisherStats })[]> {
    const response = await fetch(`${API_BASE}/api/catalogue/furnishers`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch furnishers');
    return response.json();
  },

  async getFurnisher(id: string): Promise<FurnisherWithDataTypes> {
    const response = await fetch(`${API_BASE}/api/catalogue/furnishers/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch furnisher');
    return response.json();
  },

  async createFurnisher(furnisher: Partial<Furnisher>): Promise<Furnisher> {
    const response = await fetch(`${API_BASE}/api/catalogue/furnishers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(furnisher),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create furnisher');
    }
    return response.json();
  },

  async updateFurnisher(id: string, updates: Partial<Furnisher>): Promise<Furnisher> {
    const response = await fetch(`${API_BASE}/api/catalogue/furnishers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update furnisher');
    return response.json();
  },

  async deleteFurnisher(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/catalogue/furnishers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete furnisher');
  },

  // Data Types
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

  // Attributes
  async createAttribute(attribute: Partial<DataAttribute>): Promise<DataAttribute> {
    const response = await fetch(`${API_BASE}/api/catalogue/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(attribute),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create attribute');
    }
    return response.json();
  },

  async bulkCreateAttributes(dataTypeId: string, attributes: Partial<DataAttribute>[]): Promise<{ created: number; attributes: DataAttribute[] }> {
    const response = await fetch(`${API_BASE}/api/catalogue/attributes/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dataTypeId, attributes }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk create attributes');
    }
    return response.json();
  },

  async updateAttribute(id: string, updates: Partial<DataAttribute>): Promise<DataAttribute> {
    const response = await fetch(`${API_BASE}/api/catalogue/attributes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update attribute');
    return response.json();
  },

  async deleteAttribute(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/catalogue/attributes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete attribute');
  },

  // Search
  async search(query: string): Promise<{
    furnishers: Furnisher[];
    dataTypes: DataType[];
    attributes: DataAttribute[];
  }> {
    const response = await fetch(`${API_BASE}/api/catalogue/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to search');
    return response.json();
  },

  // Export
  async exportAll(): Promise<unknown> {
    const response = await fetch(`${API_BASE}/api/catalogue/export`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export');
    return response.json();
  },
};

interface DataCatalogueState {
  // Data
  furnishers: (Furnisher & { stats: FurnisherStats })[];
  selectedFurnisher: FurnisherWithDataTypes | null;

  // Selection state
  selection: Selection | null;

  // Loading states
  isLoading: boolean;
  isFurnisherLoading: boolean;
  error: string | null;

  // Search
  searchQuery: string;
  searchResults: {
    furnishers: Furnisher[];
    dataTypes: DataType[];
    attributes: DataAttribute[];
  } | null;

  // Actions
  fetchFurnishers: () => Promise<void>;
  selectFurnisher: (id: string) => Promise<void>;
  clearSelection: () => void;
  setSelection: (selection: Selection | null) => void;

  // CRUD actions
  createFurnisher: (furnisher: Partial<Furnisher>) => Promise<Furnisher>;
  updateFurnisher: (id: string, updates: Partial<Furnisher>) => Promise<void>;
  deleteFurnisher: (id: string) => Promise<void>;

  createDataType: (dataType: Partial<DataType>) => Promise<DataType>;
  updateDataType: (id: string, updates: Partial<DataType>) => Promise<void>;
  deleteDataType: (id: string) => Promise<void>;

  createAttribute: (attribute: Partial<DataAttribute>) => Promise<DataAttribute>;
  bulkCreateAttributes: (dataTypeId: string, attributes: Partial<DataAttribute>[]) => Promise<{ created: number }>;
  updateAttribute: (id: string, updates: Partial<DataAttribute>) => Promise<void>;
  deleteAttribute: (id: string) => Promise<void>;

  // Search
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Export
  exportAll: () => Promise<unknown>;
}

export const useDataCatalogueStore = create<DataCatalogueState>((set, get) => ({
  // Initial state
  furnishers: [],
  selectedFurnisher: null,
  selection: null,
  isLoading: false,
  isFurnisherLoading: false,
  error: null,
  searchQuery: '',
  searchResults: null,

  // Fetch all furnishers
  fetchFurnishers: async () => {
    set({ isLoading: true, error: null });
    try {
      const furnishers = await catalogueApi.listFurnishers();
      set({ furnishers, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch furnishers',
        isLoading: false,
      });
    }
  },

  // Select a furnisher and load its full data
  selectFurnisher: async (id: string) => {
    set({ isFurnisherLoading: true, error: null });
    try {
      const furnisher = await catalogueApi.getFurnisher(id);
      set({
        selectedFurnisher: furnisher,
        selection: { type: 'furnisher', furnisherId: id },
        isFurnisherLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch furnisher',
        isFurnisherLoading: false,
      });
    }
  },

  clearSelection: () => {
    set({ selectedFurnisher: null, selection: null });
  },

  setSelection: (selection) => {
    set({ selection });
  },

  // CRUD - Furnishers
  createFurnisher: async (furnisher) => {
    const result = await catalogueApi.createFurnisher(furnisher);
    await get().fetchFurnishers();
    return result;
  },

  updateFurnisher: async (id, updates) => {
    await catalogueApi.updateFurnisher(id, updates);
    await get().fetchFurnishers();
    // Refresh selected furnisher if it was updated
    if (get().selectedFurnisher?.id === id) {
      await get().selectFurnisher(id);
    }
  },

  deleteFurnisher: async (id) => {
    await catalogueApi.deleteFurnisher(id);
    // Clear selection if deleted furnisher was selected
    if (get().selectedFurnisher?.id === id) {
      set({ selectedFurnisher: null, selection: null });
    }
    await get().fetchFurnishers();
  },

  // CRUD - Data Types
  createDataType: async (dataType) => {
    const result = await catalogueApi.createDataType(dataType);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId && dataType.furnisherId === selectedId) {
      await get().selectFurnisher(selectedId);
    }
    await get().fetchFurnishers();
    return result;
  },

  updateDataType: async (id, updates) => {
    await catalogueApi.updateDataType(id, updates);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
  },

  deleteDataType: async (id) => {
    await catalogueApi.deleteDataType(id);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
    await get().fetchFurnishers();
  },

  // CRUD - Attributes
  createAttribute: async (attribute) => {
    const result = await catalogueApi.createAttribute(attribute);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
    await get().fetchFurnishers();
    return result;
  },

  bulkCreateAttributes: async (dataTypeId, attributes) => {
    const result = await catalogueApi.bulkCreateAttributes(dataTypeId, attributes);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
    await get().fetchFurnishers();
    return result;
  },

  updateAttribute: async (id, updates) => {
    await catalogueApi.updateAttribute(id, updates);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
  },

  deleteAttribute: async (id) => {
    await catalogueApi.deleteAttribute(id);
    // Refresh selected furnisher
    const selectedId = get().selectedFurnisher?.id;
    if (selectedId) {
      await get().selectFurnisher(selectedId);
    }
    await get().fetchFurnishers();
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
      set({ searchResults: results });
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
}));
