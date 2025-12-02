// VCT (Verifiable Credential Type) TypeScript Interfaces
// Based on SD-JWT-VC specification (draft-ietf-oauth-sd-jwt-vc)

export interface VCTLogo {
  uri: string;
  'uri#integrity'?: string;
  alt_text?: string;
}

export interface VCTBackgroundImage {
  uri: string;
  'uri#integrity'?: string;
}

export interface VCTSimpleRendering {
  background_color?: string;
  text_color?: string;
  logo?: VCTLogo;
  background_image?: VCTBackgroundImage;
}

export interface VCTSvgTemplateProperties {
  orientation?: 'portrait' | 'landscape';
  color_scheme?: 'light' | 'dark';
  contrast?: 'normal' | 'high';
}

export interface VCTSvgTemplate {
  uri: string;
  'uri#integrity'?: string;
  properties?: VCTSvgTemplateProperties;
}

export interface VCTRendering {
  simple?: VCTSimpleRendering;
  svg_templates?: VCTSvgTemplate[];
}

export interface VCTClaimDisplay {
  locale: string;
  label: string;
  description?: string;
}

export interface VCTClaim {
  path: (string | null | number)[];
  display: VCTClaimDisplay[];
  mandatory?: boolean;
  sd?: 'always' | 'allowed' | 'never';
  svg_id?: string;
}

export interface VCTDisplay {
  locale: string;
  name: string;
  description?: string;
  rendering?: VCTRendering;
}

export interface VCT {
  vct: string;
  name: string;
  description?: string;
  extends?: string;
  'extends#integrity'?: string;
  schema_uri?: string;
  'schema_uri#integrity'?: string;
  display: VCTDisplay[];
  claims: VCTClaim[];
}

// Sample data for preview
export interface SampleData {
  [claimPath: string]: string;
}

// Saved project structure
export interface SavedProject {
  id: string;
  name: string;
  vct: VCT;
  sampleData: SampleData;
  createdAt: string;
  updatedAt: string;
}

// Available locales for the app
export const AVAILABLE_LOCALES = [
  { code: 'en-CA', name: 'English (Canada)' },
  { code: 'fr-CA', name: 'Français (Canada)' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
] as const;

// Store state
export interface VCTStore {
  // Current VCT being edited
  currentVct: VCT;
  sampleData: SampleData;
  currentProjectId: string | null;
  currentProjectName: string;
  isDirty: boolean;

  // Saved projects
  savedProjects: SavedProject[];

  // Actions
  setVct: (vct: VCT) => void;
  updateVctField: <K extends keyof VCT>(field: K, value: VCT[K]) => void;
  setSampleData: (data: SampleData) => void;
  updateSampleDataField: (path: string, value: string) => void;
  updateProjectName: (name: string) => void;

  // Display actions
  addDisplay: (locale: string) => void;
  updateDisplay: (index: number, display: Partial<VCTDisplay>) => void;
  removeDisplay: (index: number) => void;

  // Claim actions
  addClaim: () => void;
  updateClaim: (index: number, claim: Partial<VCTClaim>) => void;
  removeClaim: (index: number) => void;
  syncClaimLocales: () => void;

  // Project actions
  newProject: () => void;
  saveProject: (name: string) => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;

  // Import/Export
  exportVct: () => string;
  importVct: (json: string) => void;
}

// Default empty VCT - starts with only en-CA
export const createDefaultVct = (): VCT => ({
  vct: '',
  name: '',
  description: '',
  schema_uri: '',
  display: [
    {
      locale: 'en-CA',
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
  claims: [],
});

// Helper to get locale display name
export const getLocaleName = (code: string): string => {
  const locale = AVAILABLE_LOCALES.find((l) => l.code === code);
  return locale?.name || code;
};
