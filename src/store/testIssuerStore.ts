/**
 * Test Issuer Store
 *
 * Zustand store for managing test credential issuance.
 */

import { create } from 'zustand';
import type {
  CredentialSchema,
  CredentialOffer,
  CatalogEntry,
  OrbitConfig,
  CreateCredentialOfferRequest,
} from '../types/issuer';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface TestIssuerState {
  // Catalog
  catalog: CatalogEntry[];
  selectedSchema: CredentialSchema | null;

  // Offers
  offers: CredentialOffer[];
  currentOffer: CredentialOffer | null;

  // Orbit config
  orbitConfig: OrbitConfig | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions - Catalog
  fetchCatalog: () => Promise<void>;
  importFromVdr: (schemaUri: string, vctUri?: string) => Promise<CatalogEntry>;
  removeFromCatalog: (id: string) => Promise<void>;
  selectSchema: (id: string) => Promise<void>;

  // Actions - Offers
  fetchOffers: () => Promise<void>;
  createOffer: (request: CreateCredentialOfferRequest) => Promise<CredentialOffer>;
  cancelOffer: (id: string) => Promise<void>;
  refreshOfferStatus: (id: string) => Promise<CredentialOffer>;

  // Actions - Orbit
  checkOrbitConnection: () => Promise<void>;
  configureOrbit: (config: Partial<OrbitConfig>) => Promise<void>;

  // Utility
  clearError: () => void;
  clearCurrentOffer: () => void;
}

export const useTestIssuerStore = create<TestIssuerState>((set) => ({
  // Initial state
  catalog: [],
  selectedSchema: null,
  offers: [],
  currentOffer: null,
  orbitConfig: null,
  isLoading: false,
  error: null,

  // Catalog actions
  fetchCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/catalog`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Service unavailable - Orbit not configured
          set({ catalog: [], isLoading: false });
          return;
        }
        throw new Error('Failed to fetch credential catalog');
      }

      const data = await response.json();
      set({ catalog: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch catalog',
        isLoading: false,
      });
    }
  },

  importFromVdr: async (schemaUri: string, vctUri?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/catalog/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ schemaUri, vctUri }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import schema');
      }

      const entry = await response.json();
      set((state) => ({
        catalog: [...state.catalog, entry],
        isLoading: false,
      }));
      return entry;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to import schema',
        isLoading: false,
      });
      throw err;
    }
  },

  removeFromCatalog: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/catalog/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove from catalog');
      }

      set((state) => ({
        catalog: state.catalog.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to remove from catalog',
        isLoading: false,
      });
      throw err;
    }
  },

  selectSchema: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/catalog/${id}/schema`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schema details');
      }

      const schema = await response.json();
      set({ selectedSchema: schema, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch schema',
        isLoading: false,
      });
      throw err;
    }
  },

  // Offer actions
  fetchOffers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/offers`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const data = await response.json();
      set({ offers: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch offers',
        isLoading: false,
      });
    }
  },

  createOffer: async (request: CreateCredentialOfferRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create credential offer');
      }

      const offer = await response.json();
      set((state) => ({
        offers: [offer, ...state.offers],
        currentOffer: offer,
        isLoading: false,
      }));
      return offer;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create offer',
        isLoading: false,
      });
      throw err;
    }
  },

  cancelOffer: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/offers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel offer');
      }

      set((state) => ({
        offers: state.offers.filter((o) => o.id !== id),
        currentOffer: state.currentOffer?.id === id ? null : state.currentOffer,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to cancel offer',
        isLoading: false,
      });
      throw err;
    }
  },

  refreshOfferStatus: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/issuer/offers/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh offer status');
      }

      const offer = await response.json();
      set((state) => ({
        offers: state.offers.map((o) => (o.id === id ? offer : o)),
        currentOffer: state.currentOffer?.id === id ? offer : state.currentOffer,
      }));
      return offer;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to refresh status',
      });
      throw err;
    }
  },

  // Orbit actions
  checkOrbitConnection: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/orbit/status`, {
        credentials: 'include',
      });

      if (!response.ok) {
        set({
          orbitConfig: { baseUrl: '', tenantId: '', connected: false },
          isLoading: false,
        });
        return;
      }

      const config = await response.json();
      set({ orbitConfig: config, isLoading: false });
    } catch (err) {
      set({
        orbitConfig: { baseUrl: '', tenantId: '', connected: false },
        isLoading: false,
      });
    }
  },

  configureOrbit: async (config: Partial<OrbitConfig>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/issuer/orbit/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to configure Orbit');
      }

      const updatedConfig = await response.json();
      set({ orbitConfig: updatedConfig, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to configure Orbit',
        isLoading: false,
      });
      throw err;
    }
  },

  // Utility
  clearError: () => set({ error: null }),
  clearCurrentOffer: () => set({ currentOffer: null }),
}));
