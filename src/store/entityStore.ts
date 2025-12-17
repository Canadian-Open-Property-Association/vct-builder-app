import { create } from 'zustand';
import type { Entity, EntitySelection } from '../types/entity';
import { clearAssetCache } from '../services/assetResolver';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// API helpers
const entityApi = {
  // List entities
  async listEntities(): Promise<Entity[]> {
    const response = await fetch(`${API_BASE}/api/entities`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch entities');
    return response.json();
  },

  // Get single entity
  async getEntity(id: string): Promise<Entity> {
    const response = await fetch(`${API_BASE}/api/entities/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch entity');
    return response.json();
  },

  // Create entity
  async createEntity(entity: Partial<Entity>): Promise<Entity> {
    const response = await fetch(`${API_BASE}/api/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(entity),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create entity');
    }
    return response.json();
  },

  // Update entity
  async updateEntity(id: string, updates: Partial<Entity>): Promise<Entity> {
    const response = await fetch(`${API_BASE}/api/entities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update entity');
    return response.json();
  },

  // Delete entity
  async deleteEntity(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/entities/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete entity');
  },

  // Export all entities
  async exportAll(): Promise<{ entities: Entity[] }> {
    const response = await fetch(`${API_BASE}/api/entities/export`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to export entities');
    return response.json();
  },

  // GitHub: Save entities to repo (creates PR)
  async saveToGitHub(content: { entities: Entity[] }, title: string, description?: string): Promise<{
    success: boolean;
    pr: { number: number; url: string; title: string };
    branch: string;
    file: string;
  }> {
    const response = await fetch(`${API_BASE}/api/github/entity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: 'entities.json',
        content,
        title,
        description,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save to GitHub');
    }
    return response.json();
  },
};

interface EntityState {
  // Data
  entities: Entity[];
  selectedEntity: Entity | null;

  // Filter state
  searchQuery: string;

  // Selection
  selection: EntitySelection | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchEntities: () => Promise<void>;
  selectEntity: (id: string) => Promise<void>;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;

  // CRUD
  createEntity: (entity: Partial<Entity>) => Promise<Entity>;
  updateEntity: (id: string, updates: Partial<Entity>) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;

  // Export
  exportAll: () => Promise<{ entities: Entity[] }>;

  // GitHub
  saveToGitHub: (title: string, description?: string) => Promise<{ pr: { url: string } }>;
}

export const useEntityStore = create<EntityState>((set, get) => ({
  // Initial state
  entities: [],
  selectedEntity: null,
  searchQuery: '',
  selection: null,
  isLoading: false,
  error: null,

  // Fetch all entities
  fetchEntities: async () => {
    set({ isLoading: true, error: null });
    try {
      const entities = await entityApi.listEntities();
      set({ entities, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch entities',
        isLoading: false,
      });
    }
  },

  // Select an entity
  selectEntity: async (id: string) => {
    try {
      const entity = await entityApi.getEntity(id);
      set({
        selectedEntity: entity,
        selection: { entityId: id },
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch entity',
      });
    }
  },

  clearSelection: () => {
    set({ selectedEntity: null, selection: null });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Create entity
  createEntity: async (entity: Partial<Entity>) => {
    const result = await entityApi.createEntity(entity);
    clearAssetCache(); // Clear VCT asset cache when entities change
    await get().fetchEntities();
    return result;
  },

  // Update entity
  updateEntity: async (id: string, updates: Partial<Entity> & { newId?: string }) => {
    const result = await entityApi.updateEntity(id, updates);
    clearAssetCache(); // Clear VCT asset cache when entities change
    await get().fetchEntities();
    // Refresh selected entity - use new ID if it changed
    if (get().selectedEntity?.id === id) {
      const newId = result.id || id;
      await get().selectEntity(newId);
    }
  },

  // Delete entity
  deleteEntity: async (id: string) => {
    await entityApi.deleteEntity(id);
    clearAssetCache(); // Clear VCT asset cache when entities change
    // Clear selection if deleted entity was selected
    if (get().selectedEntity?.id === id) {
      set({ selectedEntity: null, selection: null });
    }
    await get().fetchEntities();
  },

  // Export
  exportAll: async () => {
    return entityApi.exportAll();
  },

  // GitHub: Save entities to repo
  saveToGitHub: async (title: string, description?: string) => {
    const { entities } = get();
    const result = await entityApi.saveToGitHub({ entities }, title, description);
    return { pr: { url: result.pr.url } };
  },
}));
