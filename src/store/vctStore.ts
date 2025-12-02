import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
  VCT,
  VCTDisplay,
  VCTClaim,
  VCTSimpleRendering,
  VCTSvgTemplate,
  VCTSvgTemplateProperties,
  SampleData,
  SavedProject,
  VCTStore,
  createDefaultVct,
} from '../types/vct';
import { getCurrentUserId } from './authStore';

const generateId = () => crypto.randomUUID();

// Get storage key based on current user
const getStorageKey = () => {
  const userId = getCurrentUserId();
  return `vct-builder-storage-${userId || 'anonymous'}`;
};

// Custom storage that uses user-specific keys
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

      saveProject: (name: string) => {
        const state = get();
        const now = new Date().toISOString();

        if (state.currentProjectId) {
          // Update existing project
          set((s) => ({
            currentProjectName: name,
            isDirty: false,
            savedProjects: s.savedProjects.map((p) =>
              p.id === state.currentProjectId
                ? {
                    ...p,
                    name,
                    vct: state.currentVct,
                    sampleData: state.sampleData,
                    updatedAt: now,
                  }
                : p
            ),
          }));
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
          set((s) => ({
            currentProjectId: id,
            currentProjectName: name,
            isDirty: false,
            savedProjects: [...s.savedProjects, newProject],
          }));
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

      deleteProject: (id: string) =>
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
          ...(state.currentProjectId === id
            ? {
                currentProjectId: null,
                currentProjectName: 'Untitled',
              }
            : {}),
        })),

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
    }),
    {
      name: 'vct-builder-storage',
      storage: createJSONStorage(() => userStorage),
      partialize: (state) => ({
        savedProjects: state.savedProjects,
      }),
    }
  )
);

// Function to reload store data when user changes (call after login/logout)
export const reloadUserProjects = () => {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.state?.savedProjects) {
        useVctStore.setState({ savedProjects: data.state.savedProjects });
      }
    } catch (e) {
      console.error('Failed to load user projects:', e);
    }
  } else {
    // No saved projects for this user
    useVctStore.setState({ savedProjects: [] });
  }
};
