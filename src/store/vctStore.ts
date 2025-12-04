import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
  VCT,
  VCTDisplay,
  VCTClaim,
  VCTSimpleRendering,
  VCTSvgTemplate,
  VCTSvgTemplateProperties,
  VCTSvgTemplates,
  VCTCardElements,
  VCTFrontCardElements,
  VCTFrontCardElement,
  VCTEvidenceSource,
  SampleData,
  SavedProject,
  VCTStore,
  createDefaultVct,
  isFrontBackFormat,
} from '../types/vct';
import { getCurrentUserId, useAuthStore } from './authStore';

const generateId = () => crypto.randomUUID();

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// Get storage key based on current user (for localStorage fallback)
const getStorageKey = () => {
  const userId = getCurrentUserId();
  return `vct-builder-storage-${userId || 'anonymous'}`;
};

// Custom storage that uses user-specific keys (fallback for anonymous users)
const userStorage: StateStorage = {
  getItem: (_name: string): string | null => {
    const key = getStorageKey();
    return localStorage.getItem(key);
  },
  setItem: (_name: string, value: string): void => {
    const key = getStorageKey();
    localStorage.setItem(key, value);
  },
  removeItem: (_name: string): void => {
    const key = getStorageKey();
    localStorage.removeItem(key);
  },
};

// Server API helpers for authenticated users
const projectsApi = {
  async list(): Promise<SavedProject[]> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) return [];
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  async create(project: SavedProject): Promise<SavedProject> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  async update(id: string, project: Partial<SavedProject>): Promise<SavedProject> {
    const response = await fetch(`${API_BASE}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete project');
  },
};

// Check if user is authenticated
const isAuthenticated = () => useAuthStore.getState().isAuthenticated;

// Legacy type for imported VCTs with old field names
interface LegacyRendering {
  simple?: VCTSimpleRendering;
  svg_template?: { uri: string; 'uri#integrity'?: string; properties?: Record<string, unknown> };
  svg_templates?: VCTSvgTemplate[];
}

// Helper to normalize imported VCT (handle legacy fields)
const normalizeVct = (vct: VCT): VCT => {
  return {
    ...vct,
    display: vct.display.map((d) => {
      const legacyRendering = d.rendering as LegacyRendering | undefined;

      // Convert legacy svg_template (singular) to svg_templates (array)
      let svgTemplates = legacyRendering?.svg_templates;
      if (!svgTemplates && legacyRendering?.svg_template?.uri) {
        svgTemplates = [{
          uri: legacyRendering.svg_template.uri,
          'uri#integrity': legacyRendering.svg_template['uri#integrity'],
          properties: legacyRendering.svg_template.properties as VCTSvgTemplateProperties,
        }];
      }

      return {
        ...d,
        // Handle legacy 'lang' field by mapping to 'locale'
        locale: (d as VCTDisplay & { lang?: string }).lang || d.locale,
        rendering: d.rendering ? {
          simple: legacyRendering?.simple,
          svg_templates: svgTemplates,
        } : undefined,
      };
    }),
    claims: (vct.claims || []).map((c) => ({
      ...c,
      display: c.display.map((cd) => ({
        ...cd,
        // Handle legacy 'lang' field by mapping to 'locale'
        locale: (cd as { lang?: string; locale?: string }).lang || cd.locale,
      })),
    })),
  };
};

export const useVctStore = create<VCTStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentVct: createDefaultVct(),
      sampleData: {},
      currentProjectId: null,
      currentProjectName: 'Untitled',
      isDirty: false,
      savedProjects: [],

      // VCT actions
      setVct: (vct: VCT) => set({ currentVct: normalizeVct(vct), isDirty: true }),

      updateVctField: <K extends keyof VCT>(field: K, value: VCT[K]) =>
        set((state) => ({
          currentVct: { ...state.currentVct, [field]: value },
          isDirty: true,
        })),

      // Sample data actions
      setSampleData: (data: SampleData) => set({ sampleData: data, isDirty: true }),

      updateSampleDataField: (path: string, value: string) =>
        set((state) => ({
          sampleData: { ...state.sampleData, [path]: value },
          isDirty: true,
        })),

      updateProjectName: (name: string) => set({ currentProjectName: name, isDirty: true }),

      // Display actions
      addDisplay: (locale: string) =>
        set((state) => {
          const newVct = {
            ...state.currentVct,
            display: [
              ...state.currentVct.display,
              {
                locale,
                name: '',
                description: '',
                rendering: {
                  simple: {
                    background_color: '#1E3A5F',
                    text_color: '#FFFFFF',
                  },
                },
              },
            ],
          };
          // Auto-sync claims to include new locale
          const updatedClaims = newVct.claims.map((claim) => {
            const hasLocale = claim.display.some((d) => d.locale === locale);
            if (!hasLocale) {
              return {
                ...claim,
                display: [
                  ...claim.display,
                  { locale, label: '', description: '' },
                ],
              };
            }
            return claim;
          });
          return {
            currentVct: { ...newVct, claims: updatedClaims },
            isDirty: true,
          };
        }),

      updateDisplay: (index: number, displayUpdate: Partial<VCTDisplay>) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          newDisplay[index] = { ...newDisplay[index], ...displayUpdate };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      removeDisplay: (index: number) =>
        set((state) => {
          const removedLocale = state.currentVct.display[index]?.locale;
          const newDisplay = state.currentVct.display.filter((_, i) => i !== index);
          // Also remove the locale from claims
          const updatedClaims = state.currentVct.claims.map((claim) => ({
            ...claim,
            display: claim.display.filter((d) => d.locale !== removedLocale),
          }));
          return {
            currentVct: {
              ...state.currentVct,
              display: newDisplay,
              claims: updatedClaims,
            },
            isDirty: true,
          };
        }),

      // Claim actions
      addClaim: () =>
        set((state) => {
          // Get current locales from display
          const locales = state.currentVct.display.map((d) => d.locale);
          return {
            currentVct: {
              ...state.currentVct,
              claims: [
                ...state.currentVct.claims,
                {
                  path: [''],
                  display: locales.map((locale) => ({
                    locale,
                    label: '',
                    description: '',
                  })),
                },
              ],
            },
            isDirty: true,
          };
        }),

      updateClaim: (index: number, claimUpdate: Partial<VCTClaim>) =>
        set((state) => {
          const newClaims = [...state.currentVct.claims];
          newClaims[index] = { ...newClaims[index], ...claimUpdate };
          return {
            currentVct: { ...state.currentVct, claims: newClaims },
            isDirty: true,
          };
        }),

      removeClaim: (index: number) =>
        set((state) => ({
          currentVct: {
            ...state.currentVct,
            claims: state.currentVct.claims.filter((_, i) => i !== index),
          },
          isDirty: true,
        })),

      // Sync claim locales with display locales
      syncClaimLocales: () =>
        set((state) => {
          const displayLocales = state.currentVct.display.map((d) => d.locale);
          const updatedClaims = state.currentVct.claims.map((claim) => {
            // Add missing locales
            const existingLocales = claim.display.map((d) => d.locale);
            const missingLocales = displayLocales.filter(
              (l) => !existingLocales.includes(l)
            );
            // Remove extra locales
            const filteredDisplay = claim.display.filter((d) =>
              displayLocales.includes(d.locale)
            );
            // Add missing ones
            const newDisplay = [
              ...filteredDisplay,
              ...missingLocales.map((locale) => ({
                locale,
                label: '',
                description: '',
              })),
            ];
            // Sort to match display order
            newDisplay.sort(
              (a, b) =>
                displayLocales.indexOf(a.locale) - displayLocales.indexOf(b.locale)
            );
            return { ...claim, display: newDisplay };
          });
          return {
            currentVct: { ...state.currentVct, claims: updatedClaims },
          };
        }),

      // Project actions
      newProject: () =>
        set({
          currentVct: createDefaultVct(),
          sampleData: {},
          currentProjectId: null,
          currentProjectName: 'Untitled',
          isDirty: false,
        }),

      saveProject: async (name: string) => {
        const state = get();
        const now = new Date().toISOString();

        if (state.currentProjectId) {
          // Update existing project
          const updatedProject = {
            name,
            vct: state.currentVct,
            sampleData: state.sampleData,
            updatedAt: now,
          };

          // Update local state immediately
          set((s) => ({
            currentProjectName: name,
            isDirty: false,
            savedProjects: s.savedProjects.map((p) =>
              p.id === state.currentProjectId
                ? { ...p, ...updatedProject }
                : p
            ),
          }));

          // Sync to server if authenticated
          if (isAuthenticated()) {
            try {
              await projectsApi.update(state.currentProjectId, updatedProject);
            } catch (e) {
              console.error('Failed to sync project update to server:', e);
            }
          }
        } else {
          // Create new project
          const id = generateId();
          const newProject: SavedProject = {
            id,
            name,
            vct: state.currentVct,
            sampleData: state.sampleData,
            createdAt: now,
            updatedAt: now,
          };

          // Update local state immediately
          set((s) => ({
            currentProjectId: id,
            currentProjectName: name,
            isDirty: false,
            savedProjects: [...s.savedProjects, newProject],
          }));

          // Sync to server if authenticated
          if (isAuthenticated()) {
            try {
              await projectsApi.create(newProject);
            } catch (e) {
              console.error('Failed to sync new project to server:', e);
            }
          }
        }
      },

      loadProject: (id: string) => {
        const project = get().savedProjects.find((p) => p.id === id);
        if (project) {
          set({
            currentVct: normalizeVct(project.vct),
            sampleData: project.sampleData,
            currentProjectId: project.id,
            currentProjectName: project.name,
            isDirty: false,
          });
        }
      },

      deleteProject: async (id: string) => {
        // Update local state immediately
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
          ...(state.currentProjectId === id
            ? {
                currentProjectId: null,
                currentProjectName: 'Untitled',
              }
            : {}),
        }));

        // Sync to server if authenticated
        if (isAuthenticated()) {
          try {
            await projectsApi.delete(id);
          } catch (e) {
            console.error('Failed to sync project deletion to server:', e);
          }
        }
      },

      // Import/Export
      exportVct: () => {
        const { currentVct } = get();
        return JSON.stringify(currentVct, null, 2);
      },

      importVct: (json: string) => {
        try {
          const vct = JSON.parse(json) as VCT;
          set({
            currentVct: normalizeVct(vct),
            currentProjectId: null,
            currentProjectName: 'Imported',
            isDirty: true,
          });
        } catch (e) {
          console.error('Failed to import VCT:', e);
          throw new Error('Invalid VCT JSON');
        }
      },

      // COPA Card Display Standard actions
      updateCardElements: (displayIndex: number, cardElements: Partial<VCTCardElements>) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            card_elements: {
              ...newDisplay[displayIndex].card_elements,
              ...cardElements,
            },
          };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      updateFrontElement: (
        displayIndex: number,
        elementKey: keyof VCTFrontCardElements,
        element: Partial<VCTFrontCardElement>
      ) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          const currentCardElements = newDisplay[displayIndex].card_elements || {};
          const currentFront = currentCardElements.front || {};

          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            card_elements: {
              ...currentCardElements,
              front: {
                ...currentFront,
                [elementKey]: {
                  ...currentFront[elementKey],
                  ...element,
                },
              },
            },
          };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      addEvidenceSource: (displayIndex: number, source: VCTEvidenceSource) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          const currentCardElements = newDisplay[displayIndex].card_elements || {};
          const currentBack = currentCardElements.back || {};
          const currentEvidence = currentBack.evidence || { position: 'center_bottom', sources: [] };

          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            card_elements: {
              ...currentCardElements,
              back: {
                ...currentBack,
                evidence: {
                  ...currentEvidence,
                  sources: [...currentEvidence.sources, source],
                },
              },
            },
          };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      updateEvidenceSource: (
        displayIndex: number,
        sourceId: string,
        sourceUpdate: Partial<VCTEvidenceSource>
      ) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          const currentCardElements = newDisplay[displayIndex].card_elements || {};
          const currentBack = currentCardElements.back || {};
          const currentEvidence = currentBack.evidence || { position: 'center_bottom', sources: [] };

          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            card_elements: {
              ...currentCardElements,
              back: {
                ...currentBack,
                evidence: {
                  ...currentEvidence,
                  sources: currentEvidence.sources.map((s) =>
                    s.id === sourceId ? { ...s, ...sourceUpdate } : s
                  ),
                },
              },
            },
          };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      removeEvidenceSource: (displayIndex: number, sourceId: string) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          const currentCardElements = newDisplay[displayIndex].card_elements || {};
          const currentBack = currentCardElements.back || {};
          const currentEvidence = currentBack.evidence || { position: 'center_bottom', sources: [] };

          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            card_elements: {
              ...currentCardElements,
              back: {
                ...currentBack,
                evidence: {
                  ...currentEvidence,
                  sources: currentEvidence.sources.filter((s) => s.id !== sourceId),
                },
              },
            },
          };
          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

      updateSvgTemplateByFace: (
        displayIndex: number,
        face: 'front' | 'back',
        template: VCTSvgTemplate | null
      ) =>
        set((state) => {
          const newDisplay = [...state.currentVct.display];
          const currentRendering = newDisplay[displayIndex].rendering || {};

          // Always use the COPA front/back format when updating by face
          let currentTemplates: VCTSvgTemplates = {};

          // Convert from array if needed
          if (currentRendering.svg_templates) {
            if (isFrontBackFormat(currentRendering.svg_templates)) {
              currentTemplates = currentRendering.svg_templates;
            } else if (Array.isArray(currentRendering.svg_templates)) {
              // Migrate from legacy array format
              currentTemplates = {
                front: currentRendering.svg_templates[0],
                back: currentRendering.svg_templates[1],
              };
            }
          }

          // Update the specific face
          const newTemplates: VCTSvgTemplates = {
            ...currentTemplates,
            [face]: template || undefined,
          };

          newDisplay[displayIndex] = {
            ...newDisplay[displayIndex],
            rendering: {
              ...currentRendering,
              svg_templates: newTemplates,
            },
          };

          return {
            currentVct: { ...state.currentVct, display: newDisplay },
            isDirty: true,
          };
        }),

    }),
    {
      name: 'vct-builder-storage',
      storage: createJSONStorage(() => userStorage),
      partialize: (state) => ({
        // Only persist savedProjects to localStorage (for anonymous users)
        savedProjects: state.savedProjects,
      }),
    }
  )
);

// Function to reload store data when user changes (call after login/logout)
// For authenticated users, fetches from server; for anonymous, uses localStorage
export const reloadUserProjects = async () => {
  if (isAuthenticated()) {
    // Fetch from server for authenticated users
    try {
      const projects = await projectsApi.list();
      useVctStore.setState({ savedProjects: projects });
    } catch (e) {
      console.error('Failed to load projects from server:', e);
      // Fall back to localStorage
      loadFromLocalStorage();
    }
  } else {
    // Use localStorage for anonymous users
    loadFromLocalStorage();
  }
};

// Helper to load from localStorage
const loadFromLocalStorage = () => {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.state?.savedProjects) {
        useVctStore.setState({ savedProjects: data.state.savedProjects });
      }
    } catch (e) {
      console.error('Failed to load user projects from localStorage:', e);
    }
  } else {
    // No saved projects for this user
    useVctStore.setState({ savedProjects: [] });
  }
};
