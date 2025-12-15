import { create } from 'zustand';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// Settings types
export interface DataProviderTypeSetting {
  id: string;
  label: string;
  description?: string;
}

export interface EntityStatusSetting {
  id: string;
  label: string;
  color: string;
}

export interface FurnisherSettings {
  dataProviderTypes: DataProviderTypeSetting[];
  entityStatuses: EntityStatusSetting[];
}

interface FurnisherSettingsState {
  settings: FurnisherSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<FurnisherSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Helpers
  getDataProviderTypeLabel: (id: string) => string;
  getEntityStatusLabel: (id: string) => string;
  getEntityStatusColor: (id: string) => string;
}

export const useFurnisherSettingsStore = create<FurnisherSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/catalogue/furnisher-settings`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const settings = await response.json();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (updates) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/catalogue/furnisher-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dataProviderTypes: updates.dataProviderTypes ?? currentSettings.dataProviderTypes,
          entityStatuses: updates.entityStatuses ?? currentSettings.entityStatuses,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }
      const settings = await response.json();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update settings',
        isLoading: false,
      });
      throw error;
    }
  },

  resetSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/catalogue/furnisher-settings/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reset settings');
      const settings = await response.json();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset settings',
        isLoading: false,
      });
    }
  },

  getDataProviderTypeLabel: (id) => {
    const settings = get().settings;
    if (!settings) return id;
    const type = settings.dataProviderTypes.find(t => t.id === id);
    return type?.label || id;
  },

  getEntityStatusLabel: (id) => {
    const settings = get().settings;
    if (!settings) return id;
    const status = settings.entityStatuses.find(s => s.id === id);
    return status?.label || id;
  },

  getEntityStatusColor: (id) => {
    const settings = get().settings;
    if (!settings) return 'gray';
    const status = settings.entityStatuses.find(s => s.id === id);
    return status?.color || 'gray';
  },
}));
