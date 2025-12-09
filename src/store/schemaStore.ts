import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import {
  SchemaProperty,
  SchemaMetadata,
  SchemaStore,
  SavedSchemaProject,
  GovernanceDoc,
  createDefaultMetadata,
  createDefaultProperty,
  toJsonSchema,
  toJsonLdContext,
} from '../types/schema';
import { SchemaMode } from '../types/vocabulary';
import { useVocabularyStore } from './vocabularyStore';
import { getCurrentUserId, useAuthStore } from './authStore';

const generateId = () => crypto.randomUUID();

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// Get storage key based on current user (for localStorage fallback)
const getStorageKey = () => {
  const userId = getCurrentUserId();
  return `schema-builder-storage-${userId || 'anonymous'}`;
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
const schemaProjectsApi = {
  async list(): Promise<SavedSchemaProject[]> {
    const response = await fetch(`${API_BASE}/api/schema-projects`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) return [];
      throw new Error('Failed to fetch schema projects');
    }
    return response.json();
  },

  async create(project: SavedSchemaProject): Promise<SavedSchemaProject> {
    const response = await fetch(`${API_BASE}/api/schema-projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create schema project');
    return response.json();
  },

  async update(id: string, project: Partial<SavedSchemaProject>): Promise<SavedSchemaProject> {
    const response = await fetch(`${API_BASE}/api/schema-projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to update schema project');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/schema-projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete schema project');
  },
};

// GitHub API for fetching governance docs
const governanceDocsApi = {
  async list(): Promise<GovernanceDoc[]> {
    const response = await fetch(`${API_BASE}/api/governance-docs`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch governance docs');
    }
    return response.json();
  },
};

// Check if user is authenticated
const isAuthenticated = () => useAuthStore.getState().isAuthenticated;

// Helper to find a property by ID in a nested structure
const findPropertyById = (
  properties: SchemaProperty[],
  id: string
): SchemaProperty | null => {
  for (const prop of properties) {
    if (prop.id === id) return prop;
    if (prop.properties) {
      const found = findPropertyById(prop.properties, id);
      if (found) return found;
    }
    if (prop.items?.properties) {
      const found = findPropertyById(prop.items.properties, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to find parent array containing a property
const findParentArray = (
  properties: SchemaProperty[],
  id: string
): { array: SchemaProperty[]; index: number } | null => {
  for (let i = 0; i < properties.length; i++) {
    if (properties[i].id === id) {
      return { array: properties, index: i };
    }
    if (properties[i].properties) {
      const found = findParentArray(properties[i].properties!, id);
      if (found) return found;
    }
    if (properties[i].items?.properties) {
      const found = findParentArray(properties[i].items!.properties!, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper to collect all property IDs for expand/collapse all
const collectAllIds = (properties: SchemaProperty[]): string[] => {
  const ids: string[] = [];
  for (const prop of properties) {
    ids.push(prop.id);
    if (prop.properties) {
      ids.push(...collectAllIds(prop.properties));
    }
    if (prop.items?.properties) {
      ids.push(...collectAllIds(prop.items.properties));
    }
  }
  return ids;
};

// Deep clone helper for immutable updates
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const useSchemaStore = create<SchemaStore>()(
  persist(
    (set, get) => ({
      // Initial state
      metadata: createDefaultMetadata(),
      properties: [],
      currentProjectId: null,
      currentProjectName: 'Untitled',
      isDirty: false,
      savedProjects: [],
      selectedPropertyId: null,
      expandedNodes: new Set<string>(),
      governanceDocs: [],
      isLoadingDocs: false,

      // Metadata actions
      updateMetadata: (updates: Partial<SchemaMetadata>) =>
        set((state) => ({
          metadata: { ...state.metadata, ...updates },
          isDirty: true,
        })),

      setGovernanceDoc: (doc: GovernanceDoc | null) =>
        set((state) => ({
          metadata: {
            ...state.metadata,
            governanceDocUrl: doc?.url,
            governanceDocName: doc?.displayName,
          },
          isDirty: true,
        })),

      // Property actions
      addProperty: (parentId?: string) => {
        const newId = generateId();
        const newProperty = createDefaultProperty(newId);

        set((state) => {
          const properties = deepClone(state.properties);

          if (!parentId) {
            // Add to root level
            properties.push(newProperty);
          } else {
            // Add as nested property
            const parent = findPropertyById(properties, parentId);
            if (parent) {
              if (parent.type === 'object') {
                parent.properties = parent.properties || [];
                parent.properties.push(newProperty);
              } else if (parent.type === 'array' && parent.items) {
                parent.items.properties = parent.items.properties || [];
                parent.items.properties.push(newProperty);
              }
            }
          }

          // Auto-expand parent and select new property
          const expandedNodes = new Set(state.expandedNodes);
          if (parentId) expandedNodes.add(parentId);

          return {
            properties,
            selectedPropertyId: newId,
            expandedNodes,
            isDirty: true,
          };
        });
      },

      // Add property with initial data (for vocabulary import)
      addPropertyWithData: (data: Partial<SchemaProperty>, parentId?: string) => {
        const newId = generateId();
        const newProperty = { ...createDefaultProperty(newId), ...data, id: newId };

        set((state) => {
          const properties = deepClone(state.properties);

          if (!parentId) {
            properties.push(newProperty);
          } else {
            const parent = findPropertyById(properties, parentId);
            if (parent) {
              if (parent.type === 'object') {
                parent.properties = parent.properties || [];
                parent.properties.push(newProperty);
              } else if (parent.type === 'array' && parent.items) {
                parent.items.properties = parent.items.properties || [];
                parent.items.properties.push(newProperty);
              }
            }
          }

          const expandedNodes = new Set(state.expandedNodes);
          if (parentId) expandedNodes.add(parentId);

          return {
            properties,
            selectedPropertyId: newId,
            expandedNodes,
            isDirty: true,
          };
        });

        return newId;
      },

      updateProperty: (id: string, updates: Partial<SchemaProperty>) =>
        set((state) => {
          const properties = deepClone(state.properties);
          const prop = findPropertyById(properties, id);

          if (prop) {
            Object.assign(prop, updates);

            // If type changed to object, initialize properties array
            if (updates.type === 'object' && !prop.properties) {
              prop.properties = [];
            }
            // If type changed to array, initialize items
            if (updates.type === 'array' && !prop.items) {
              prop.items = createDefaultProperty(generateId());
              prop.items.name = 'item';
            }
          }

          return { properties, isDirty: true };
        }),

      deleteProperty: (id: string) =>
        set((state) => {
          const properties = deepClone(state.properties);
          const parent = findParentArray(properties, id);

          if (parent) {
            parent.array.splice(parent.index, 1);
          }

          return {
            properties,
            selectedPropertyId:
              state.selectedPropertyId === id ? null : state.selectedPropertyId,
            isDirty: true,
          };
        }),

      moveProperty: (id: string, direction: 'up' | 'down') =>
        set((state) => {
          const properties = deepClone(state.properties);
          const parent = findParentArray(properties, id);

          if (parent) {
            const newIndex =
              direction === 'up' ? parent.index - 1 : parent.index + 1;
            if (newIndex >= 0 && newIndex < parent.array.length) {
              const [item] = parent.array.splice(parent.index, 1);
              parent.array.splice(newIndex, 0, item);
            }
          }

          return { properties, isDirty: true };
        }),

      // Tree UI actions
      selectProperty: (id: string | null) => set({ selectedPropertyId: id }),

      toggleExpanded: (id: string) =>
        set((state) => {
          const expandedNodes = new Set(state.expandedNodes);
          if (expandedNodes.has(id)) {
            expandedNodes.delete(id);
          } else {
            expandedNodes.add(id);
          }
          return { expandedNodes };
        }),

      expandAll: () =>
        set((state) => ({
          expandedNodes: new Set(collectAllIds(state.properties)),
        })),

      collapseAll: () => set({ expandedNodes: new Set() }),

      // Project actions
      newSchema: () =>
        set({
          metadata: createDefaultMetadata(),
          properties: [],
          currentProjectId: null,
          currentProjectName: 'Untitled',
          isDirty: false,
          selectedPropertyId: null,
          expandedNodes: new Set(),
        }),

      saveSchema: async (name: string) => {
        const state = get();
        const now = new Date().toISOString();

        if (state.currentProjectId) {
          // Update existing project
          const updatedProject = {
            name,
            metadata: state.metadata,
            properties: state.properties,
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
              await schemaProjectsApi.update(state.currentProjectId, updatedProject);
            } catch (e) {
              console.error('Failed to sync schema project update to server:', e);
            }
          }
        } else {
          // Create new project
          const id = generateId();
          const newProject: SavedSchemaProject = {
            id,
            name,
            metadata: state.metadata,
            properties: state.properties,
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
              await schemaProjectsApi.create(newProject);
            } catch (e) {
              console.error('Failed to sync new schema project to server:', e);
            }
          }
        }
      },

      loadSchema: (id: string) => {
        const project = get().savedProjects.find((p) => p.id === id);
        if (project) {
          // Ensure mode has a default value for older projects
          const metadata: SchemaMetadata = {
            ...project.metadata,
            mode: project.metadata.mode || 'json-schema',
            contextVersion: project.metadata.contextVersion ?? 1.1,
            protected: project.metadata.protected ?? true,
          };
          set({
            metadata,
            properties: project.properties,
            currentProjectId: project.id,
            currentProjectName: project.name,
            isDirty: false,
            selectedPropertyId: null,
            expandedNodes: new Set(collectAllIds(project.properties)),
          });
        }
      },

      deleteSchema: async (id: string) => {
        // Update local state immediately
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
          ...(state.currentProjectId === id
            ? {
                metadata: createDefaultMetadata(),
                properties: [],
                currentProjectId: null,
                currentProjectName: 'Untitled',
                isDirty: false,
                selectedPropertyId: null,
                expandedNodes: new Set(),
              }
            : {}),
        }));

        // Sync to server if authenticated
        if (isAuthenticated()) {
          try {
            await schemaProjectsApi.delete(id);
          } catch (e) {
            console.error('Failed to sync schema project deletion to server:', e);
          }
        }
      },

      // Mode management
      setMode: (mode: SchemaMode) =>
        set((state) => ({
          metadata: { ...state.metadata, mode },
          isDirty: true,
        })),

      // Import/Export
      exportSchema: () => {
        const { metadata, properties } = get();

        // Mode-aware export
        if (metadata.mode === 'jsonld-context') {
          const vocabulary = useVocabularyStore.getState().getSelectedVocab();
          const context = toJsonLdContext(metadata, properties, vocabulary);
          return JSON.stringify(context, null, 2);
        }

        // Default: JSON Schema
        const schema = toJsonSchema(metadata, properties);
        return JSON.stringify(schema, null, 2);
      },

      importSchema: (json: string) => {
        try {
          const schema = JSON.parse(json);

          // Parse required array to determine standard claims configuration
          const requiredClaims = new Set(schema.required || []);
          const hasProperty = (name: string) => schema.properties && name in schema.properties;

          // Build standard claims config from schema
          const standardClaims = {
            iss: { required: requiredClaims.has('iss') },
            iat: { required: requiredClaims.has('iat') },
            vct: { required: requiredClaims.has('vct') },
            exp: { required: requiredClaims.has('exp') },
            nbf: { enabled: hasProperty('nbf'), required: requiredClaims.has('nbf') },
            sub: { enabled: hasProperty('sub'), required: requiredClaims.has('sub') },
            jti: { enabled: hasProperty('jti'), required: requiredClaims.has('jti') },
            cnf: { enabled: hasProperty('cnf'), required: requiredClaims.has('cnf') },
            status: { enabled: hasProperty('status'), required: requiredClaims.has('status') },
          };

          // Parse JSON Schema back to internal format
          const metadata: SchemaMetadata = {
            schemaId: schema.$id || '',
            title: schema.title || '',
            description: schema.description || '',
            governanceDocUrl: schema['x-governance-doc'],
            governanceDocName: undefined,
            standardClaims,
            // Default to json-schema mode for imports
            mode: 'json-schema',
            vocabUrl: undefined,
            contextUrl: undefined,
            contextVersion: 1.1,
            protected: true,
            ocaUrl: undefined,
          };

          // Parse credentialSubject properties
          const credentialSubject = schema.properties?.credentialSubject;
          const properties: SchemaProperty[] = [];

          if (credentialSubject?.properties) {
            const requiredProps = new Set(credentialSubject.required || []);

            const parseProperty = (
              name: string,
              prop: Record<string, unknown>,
              isRequired: boolean
            ): SchemaProperty => {
              const id = generateId();
              const schemaProperty: SchemaProperty = {
                id,
                name,
                title: (prop.title as string) || name,
                description: prop.description as string | undefined,
                type: (prop.type as SchemaProperty['type']) || 'string',
                required: isRequired,
              };

              // String constraints
              if (prop.type === 'string') {
                if (prop.minLength !== undefined) schemaProperty.minLength = prop.minLength as number;
                if (prop.maxLength !== undefined) schemaProperty.maxLength = prop.maxLength as number;
                if (prop.format) schemaProperty.format = prop.format as SchemaProperty['format'];
                if (prop.pattern) schemaProperty.pattern = prop.pattern as string;
                if (prop.enum) schemaProperty.enum = prop.enum as string[];
              }

              // Number constraints
              if (prop.type === 'integer' || prop.type === 'number') {
                if (prop.minimum !== undefined) schemaProperty.minimum = prop.minimum as number;
                if (prop.maximum !== undefined) schemaProperty.maximum = prop.maximum as number;
                if (prop.exclusiveMinimum !== undefined) schemaProperty.exclusiveMinimum = prop.exclusiveMinimum as number;
                if (prop.exclusiveMaximum !== undefined) schemaProperty.exclusiveMaximum = prop.exclusiveMaximum as number;
              }

              // Array constraints
              if (prop.type === 'array') {
                if (prop.minItems !== undefined) schemaProperty.minItems = prop.minItems as number;
                if (prop.maxItems !== undefined) schemaProperty.maxItems = prop.maxItems as number;
                if (prop.uniqueItems !== undefined) schemaProperty.uniqueItems = prop.uniqueItems as boolean;
                if (prop.items) {
                  schemaProperty.items = parseProperty('item', prop.items as Record<string, unknown>, false);
                }
              }

              // Object nested properties
              if (prop.type === 'object' && prop.properties) {
                const nestedRequired = new Set((prop.required as string[]) || []);
                schemaProperty.properties = Object.entries(
                  prop.properties as Record<string, Record<string, unknown>>
                ).map(([nestedName, nestedProp]) =>
                  parseProperty(nestedName, nestedProp, nestedRequired.has(nestedName))
                );
              }

              return schemaProperty;
            };

            for (const [name, prop] of Object.entries(
              credentialSubject.properties as Record<string, Record<string, unknown>>
            )) {
              properties.push(parseProperty(name, prop, requiredProps.has(name)));
            }
          }

          set({
            metadata,
            properties,
            currentProjectId: null,
            currentProjectName: 'Imported',
            isDirty: true,
            selectedPropertyId: null,
            expandedNodes: new Set(collectAllIds(properties)),
          });
        } catch (e) {
          console.error('Failed to import schema:', e);
          throw new Error('Invalid JSON Schema');
        }
      },

      // Governance docs
      fetchGovernanceDocs: async () => {
        set({ isLoadingDocs: true });
        try {
          const docs = await governanceDocsApi.list();
          set({ governanceDocs: docs, isLoadingDocs: false });
        } catch (e) {
          console.error('Failed to fetch governance docs:', e);
          set({ isLoadingDocs: false });
        }
      },
    }),
    {
      name: 'schema-builder-storage',
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
export const reloadSchemaProjects = async () => {
  if (isAuthenticated()) {
    // Fetch from server for authenticated users
    try {
      const projects = await schemaProjectsApi.list();
      useSchemaStore.setState({ savedProjects: projects });
    } catch (e) {
      console.error('Failed to load schema projects from server:', e);
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
        useSchemaStore.setState({ savedProjects: data.state.savedProjects });
      }
    } catch (e) {
      console.error('Failed to load schema projects from localStorage:', e);
    }
  } else {
    // No saved projects for this user
    useSchemaStore.setState({ savedProjects: [] });
  }
};
