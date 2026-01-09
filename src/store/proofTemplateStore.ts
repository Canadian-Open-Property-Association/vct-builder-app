/**
 * Proof Template Store
 *
 * Zustand store for managing proof templates in the Proof Templates Builder app.
 * All data is stored in PostgreSQL via the API.
 */

import { create } from 'zustand';
import {
  ProofTemplate,
  ProofTemplateListItem,
  Claim,
  ProofTemplateMetadata,
  CreateProofTemplateRequest,
  UpdateProofTemplateRequest,
  PublishProofTemplateResponse,
  toPresentationDefinition,
  PresentationDefinition,
} from '../types/proofTemplate';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// API client for proof templates
const proofTemplatesApi = {
  async list(): Promise<ProofTemplateListItem[]> {
    const response = await fetch(`${API_BASE}/api/proof-templates`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 401) return [];
      if (response.status === 503) {
        console.warn('Proof Templates: Database unavailable');
        return [];
      }
      throw new Error('Failed to fetch proof templates');
    }
    return response.json();
  },

  async get(id: string): Promise<ProofTemplate> {
    const response = await fetch(`${API_BASE}/api/proof-templates/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch proof template');
    }
    return response.json();
  },

  async create(data: CreateProofTemplateRequest): Promise<ProofTemplate> {
    const response = await fetch(`${API_BASE}/api/proof-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create proof template');
    }
    return response.json();
  },

  async update(id: string, data: UpdateProofTemplateRequest): Promise<ProofTemplate> {
    const response = await fetch(`${API_BASE}/api/proof-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update proof template');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/proof-templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to delete proof template');
    }
  },

  async publishToVdr(id: string, commitMessage?: string): Promise<PublishProofTemplateResponse> {
    const response = await fetch(`${API_BASE}/api/proof-templates/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ commitMessage }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish proof template');
    }
    return response.json();
  },

  async clone(id: string): Promise<ProofTemplate> {
    const response = await fetch(`${API_BASE}/api/proof-templates/${id}/clone`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to clone proof template');
    }
    return response.json();
  },
};

// Store state interface
interface ProofTemplateState {
  // Data
  templates: ProofTemplateListItem[];
  currentTemplate: ProofTemplate | null;
  databaseAvailable: boolean;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedClaimId: string | null;

  // Actions - API
  fetchTemplates: () => Promise<void>;
  fetchTemplate: (id: string) => Promise<void>;
  createTemplate: (name: string, description?: string, category?: string) => Promise<ProofTemplate>;
  saveTemplate: () => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  publishTemplate: (commitMessage?: string) => Promise<PublishProofTemplateResponse>;
  cloneTemplate: (id: string) => Promise<ProofTemplate>;

  // Actions - Local editing
  updateTemplateName: (name: string) => void;
  updateTemplateDescription: (description: string) => void;
  updateTemplatePurpose: (purpose: string) => void;
  updateTemplateMetadata: (metadata: Partial<ProofTemplateMetadata>) => void;

  // Actions - Claims
  addClaim: () => void;
  updateClaim: (claimId: string, updates: Partial<Claim>) => void;
  removeClaim: (claimId: string) => void;
  reorderClaims: (startIndex: number, endIndex: number) => void;
  selectClaim: (claimId: string | null) => void;

  // Actions - Presentation Exchange preview
  getPresentationDefinition: () => PresentationDefinition | null;

  // Utility actions
  clearCurrentTemplate: () => void;
  clearError: () => void;
  setError: (error: string) => void;
}

export const useProofTemplateStore = create<ProofTemplateState>((set, get) => ({
  // Initial state
  templates: [],
  currentTemplate: null,
  databaseAvailable: true,
  isLoading: false,
  isSaving: false,
  error: null,
  selectedClaimId: null,

  // Fetch all templates for current user
  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const templates = await proofTemplatesApi.list();
      set({ templates, databaseAvailable: true, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch proof templates';
      set({ error: message, isLoading: false, databaseAvailable: false });
    }
  },

  // Fetch a single template by ID
  fetchTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await proofTemplatesApi.get(id);
      set({ currentTemplate: template, isLoading: false, selectedClaimId: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch proof template';
      set({ error: message, isLoading: false });
    }
  },

  // Create a new template
  createTemplate: async (name: string, description?: string, category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await proofTemplatesApi.create({
        name,
        description,
        category,
      });
      set((state) => ({
        templates: [
          {
            id: template.id,
            name: template.name,
            description: template.description || '',
            category: template.metadata.category,
            status: template.status,
            claimCount: template.claims.length,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          },
          ...state.templates,
        ],
        currentTemplate: template,
        isLoading: false,
      }));
      return template;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create proof template';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Save current template to database
  saveTemplate: async () => {
    const { currentTemplate } = get();
    if (!currentTemplate) return;

    set({ isSaving: true, error: null });
    try {
      const updated = await proofTemplatesApi.update(currentTemplate.id, {
        name: currentTemplate.name,
        description: currentTemplate.description,
        purpose: currentTemplate.purpose,
        claims: currentTemplate.claims,
        metadata: currentTemplate.metadata,
      });
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === updated.id
            ? {
                ...t,
                name: updated.name,
                description: updated.description,
                category: updated.metadata.category,
                claimCount: updated.claims.length,
                updatedAt: updated.updatedAt,
              }
            : t
        ),
        currentTemplate: updated,
        isSaving: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save proof template';
      set({ error: message, isSaving: false });
      throw error;
    }
  },

  // Delete a template
  deleteTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await proofTemplatesApi.delete(id);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete proof template';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Publish template to VDR
  publishTemplate: async (commitMessage?: string) => {
    const { currentTemplate } = get();
    if (!currentTemplate) throw new Error('No template selected');

    set({ isLoading: true, error: null });
    try {
      const result = await proofTemplatesApi.publishToVdr(currentTemplate.id, commitMessage);
      if (result.success && result.vdrUri) {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === currentTemplate.id
              ? { ...t, status: 'published' as const, vdrUri: result.vdrUri, publishedAt: new Date().toISOString() }
              : t
          ),
          currentTemplate: state.currentTemplate
            ? { ...state.currentTemplate, status: 'published', vdrUri: result.vdrUri }
            : null,
          isLoading: false,
        }));
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish proof template';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Clone a template
  cloneTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const clonedTemplate = await proofTemplatesApi.clone(id);
      set((state) => ({
        templates: [
          {
            id: clonedTemplate.id,
            name: clonedTemplate.name,
            description: clonedTemplate.description,
            category: clonedTemplate.metadata.category,
            status: clonedTemplate.status,
            claimCount: clonedTemplate.claims.length,
            createdAt: clonedTemplate.createdAt,
            updatedAt: clonedTemplate.updatedAt,
          },
          ...state.templates,
        ],
        isLoading: false,
      }));
      return clonedTemplate;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clone proof template';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // Local editing - name
  updateTemplateName: (name: string) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? { ...state.currentTemplate, name }
        : null,
    }));
  },

  // Local editing - description
  updateTemplateDescription: (description: string) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? { ...state.currentTemplate, description }
        : null,
    }));
  },

  // Local editing - purpose
  updateTemplatePurpose: (purpose: string) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? { ...state.currentTemplate, purpose }
        : null,
    }));
  },

  // Local editing - metadata
  updateTemplateMetadata: (metadata: Partial<ProofTemplateMetadata>) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? {
            ...state.currentTemplate,
            metadata: { ...state.currentTemplate.metadata, ...metadata },
          }
        : null,
    }));
  },

  // Add a new claim
  addClaim: () => {
    const newClaim: Claim = {
      id: generateId(),
      name: '',
      label: '',
      purpose: '',
      credentialType: '',
      fieldPath: '',
      constraints: [],
      required: true,
    };
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? {
            ...state.currentTemplate,
            claims: [...state.currentTemplate.claims, newClaim],
          }
        : null,
      selectedClaimId: newClaim.id,
    }));
  },

  // Update a claim
  updateClaim: (claimId: string, updates: Partial<Claim>) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? {
            ...state.currentTemplate,
            claims: state.currentTemplate.claims.map((claim) =>
              claim.id === claimId ? { ...claim, ...updates } : claim
            ),
          }
        : null,
    }));
  },

  // Remove a claim
  removeClaim: (claimId: string) => {
    set((state) => ({
      currentTemplate: state.currentTemplate
        ? {
            ...state.currentTemplate,
            claims: state.currentTemplate.claims.filter((claim) => claim.id !== claimId),
          }
        : null,
      selectedClaimId: state.selectedClaimId === claimId ? null : state.selectedClaimId,
    }));
  },

  // Reorder claims
  reorderClaims: (startIndex: number, endIndex: number) => {
    set((state) => {
      if (!state.currentTemplate) return state;
      const claims = [...state.currentTemplate.claims];
      const [removed] = claims.splice(startIndex, 1);
      claims.splice(endIndex, 0, removed);
      return {
        currentTemplate: {
          ...state.currentTemplate,
          claims,
        },
      };
    });
  },

  // Select a claim for editing
  selectClaim: (claimId: string | null) => {
    set({ selectedClaimId: claimId });
  },

  // Get Presentation Exchange definition
  getPresentationDefinition: () => {
    const { currentTemplate } = get();
    if (!currentTemplate) return null;
    return toPresentationDefinition(currentTemplate);
  },

  // Clear current template
  clearCurrentTemplate: () => {
    set({ currentTemplate: null, selectedClaimId: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set error
  setError: (error: string) => {
    set({ error });
  },
}));
