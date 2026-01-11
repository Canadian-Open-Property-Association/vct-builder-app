/**
 * Credential Catalogue Store
 *
 * Zustand store for managing imported external credentials.
 */

import { create } from 'zustand';
import type {
  CatalogueCredential,
  EcosystemTag,
  ImportCredentialRequest,
  ParsedSchemaData,
  ParsedCredDefData,
} from '../types/catalogue';
import { PREDEFINED_ECOSYSTEM_TAGS } from '../types/catalogue';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface OrbitStatus {
  configured: boolean;
  hasCredentials: boolean;
}

interface CatalogueState {
  // Data
  credentials: CatalogueCredential[];
  ecosystemTags: EcosystemTag[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Import wizard state
  parsedSchema: ParsedSchemaData | null;
  parsedCredDef: ParsedCredDefData | null;

  // Orbit status
  orbitStatus: OrbitStatus | null;

  // Actions - Credentials
  fetchCredentials: () => Promise<void>;
  importCredential: (request: ImportCredentialRequest) => Promise<CatalogueCredential>;
  deleteCredential: (id: string) => Promise<void>;
  getCredentialById: (id: string) => CatalogueCredential | undefined;

  // Actions - Parsing
  parseSchemaUrl: (url: string) => Promise<ParsedSchemaData>;
  parseCredDefUrl: (url: string) => Promise<ParsedCredDefData>;
  clearParsedData: () => void;

  // Actions - Tags
  fetchTags: () => Promise<void>;
  addCustomTag: (name: string) => Promise<EcosystemTag>;
  deleteTag: (id: string) => Promise<void>;

  // Actions - Orbit
  fetchOrbitStatus: () => Promise<void>;

  // Utility
  clearError: () => void;
}

export const useCatalogueStore = create<CatalogueState>((set, get) => ({
  // Initial state
  credentials: [],
  ecosystemTags: PREDEFINED_ECOSYSTEM_TAGS,
  isLoading: false,
  error: null,
  parsedSchema: null,
  parsedCredDef: null,
  orbitStatus: null,

  // Fetch all credentials
  fetchCredentials: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const data = await response.json();
      set({ credentials: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch credentials',
        isLoading: false,
      });
    }
  },

  // Import a new credential
  importCredential: async (request: ImportCredentialRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import credential');
      }

      const credential = await response.json();
      set((state) => ({
        credentials: [credential, ...state.credentials],
        isLoading: false,
        parsedSchema: null,
        parsedCredDef: null,
      }));
      return credential;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to import credential',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a credential
  deleteCredential: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete credential');
      }

      set((state) => ({
        credentials: state.credentials.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete credential',
        isLoading: false,
      });
      throw err;
    }
  },

  // Get credential by ID
  getCredentialById: (id: string) => {
    return get().credentials.find((c) => c.id === id);
  },

  // Parse an IndyScan schema URL
  parseSchemaUrl: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/import/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to parse schema URL');
      }

      const data = await response.json();
      set({ parsedSchema: data, isLoading: false });
      return data;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to parse schema URL',
        isLoading: false,
      });
      throw err;
    }
  },

  // Parse an IndyScan credential definition URL
  parseCredDefUrl: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/import/creddef`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to parse credential definition URL');
      }

      const data = await response.json();
      set({ parsedCredDef: data, isLoading: false });
      return data;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to parse credential definition URL',
        isLoading: false,
      });
      throw err;
    }
  },

  // Clear parsed data
  clearParsedData: () => {
    set({ parsedSchema: null, parsedCredDef: null });
  },

  // Fetch ecosystem tags
  fetchTags: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/tags`, {
        credentials: 'include',
      });

      if (!response.ok) {
        // If tags endpoint doesn't exist yet, use predefined only
        set({ ecosystemTags: PREDEFINED_ECOSYSTEM_TAGS });
        return;
      }

      const customTags = await response.json();
      set({ ecosystemTags: [...PREDEFINED_ECOSYSTEM_TAGS, ...customTags] });
    } catch {
      // Fall back to predefined tags
      set({ ecosystemTags: PREDEFINED_ECOSYSTEM_TAGS });
    }
  },

  // Add a custom tag
  addCustomTag: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add tag');
      }

      const tag = await response.json();
      set((state) => ({
        ecosystemTags: [...state.ecosystemTags, tag],
        isLoading: false,
      }));
      return tag;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add tag',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a custom tag
  deleteTag: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/tags/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      set((state) => ({
        ecosystemTags: state.ecosystemTags.filter((t) => t.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete tag',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch Orbit status
  fetchOrbitStatus: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/credential-catalogue/orbit-status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        set({ orbitStatus: { configured: false, hasCredentials: false } });
        return;
      }

      const status = await response.json();
      set({ orbitStatus: status });
    } catch {
      set({ orbitStatus: { configured: false, hasCredentials: false } });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
