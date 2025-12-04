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
  font_family?: string;
  logo?: VCTLogo;
  background_image?: VCTBackgroundImage;
}

// Available font families for card rendering
export const FONT_FAMILY_OPTIONS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro' },
] as const;

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

// COPA Card Display Standard - Front/Back SVG Templates
export interface VCTSvgTemplates {
  front?: VCTSvgTemplate;
  back?: VCTSvgTemplate;
}

export interface VCTRendering {
  simple?: VCTSimpleRendering;
  svg_templates?: VCTSvgTemplate[] | VCTSvgTemplates; // Support both legacy array and COPA front/back
}

// COPA Card Display Standard - Card Element Positions
export type CardElementPosition =
  | 'top_left'
  | 'top_right'
  | 'center'
  | 'center_below'
  | 'bottom_left'
  | 'bottom_right'
  | 'top'
  | 'center_bottom';

// COPA Card Display Standard - Front Card Element
export interface VCTFrontCardElement {
  position: CardElementPosition;
  claim_path?: string; // JSONPath like "$.property_address"
  value?: string; // Static value for fixed elements
  label?: string; // Optional display label
  logo_uri?: string; // Logo/icon image URI (for portfolio_issuer, credential_issuer, network_mark)
}

// COPA Card Display Standard - Evidence Source Types
export type EvidenceSourceType =
  | 'linked_credential'
  | 'data_furnisher'
  | 'identity_verification'
  | 'regulatory_body';

// COPA Card Display Standard - Evidence Source
export interface VCTEvidenceSource {
  type: EvidenceSourceType;
  id: string;
  display: string;
  badge?: 'initials' | 'logo';
  logo_uri?: string;
  description: string;
}

// COPA Card Display Standard - Back Card Elements
export interface VCTBackCardElements {
  metadata?: {
    position: CardElementPosition;
    fields: string[]; // ['credential_type', 'issued_at', 'expires_at', 'status']
  };
  evidence?: {
    position: CardElementPosition;
    sources: VCTEvidenceSource[];
  };
}

// COPA Card Display Standard - Front Card Elements (6 standard positions)
export interface VCTFrontCardElements {
  portfolio_issuer?: VCTFrontCardElement;
  network_mark?: VCTFrontCardElement;
  primary_attribute?: VCTFrontCardElement;
  secondary_attribute?: VCTFrontCardElement;
  credential_name?: VCTFrontCardElement;
  credential_issuer?: VCTFrontCardElement;
}

// COPA Card Display Standard - Card Elements Container
export interface VCTCardElements {
  front?: VCTFrontCardElements;
  back?: VCTBackCardElements;
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
  card_elements?: VCTCardElements; // COPA Card Display Standard
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
  saveProject: (name: string) => Promise<void>;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => Promise<void>;

  // Import/Export
  exportVct: () => string;
  importVct: (json: string) => void;

  // COPA Card Display Standard actions
  updateCardElements: (displayIndex: number, cardElements: Partial<VCTCardElements>) => void;
  updateFrontElement: (
    displayIndex: number,
    elementKey: keyof VCTFrontCardElements,
    element: Partial<VCTFrontCardElement>
  ) => void;
  addEvidenceSource: (displayIndex: number, source: VCTEvidenceSource) => void;
  updateEvidenceSource: (
    displayIndex: number,
    sourceId: string,
    source: Partial<VCTEvidenceSource>
  ) => void;
  removeEvidenceSource: (displayIndex: number, sourceId: string) => void;
  updateSvgTemplateByFace: (
    displayIndex: number,
    face: 'front' | 'back',
    template: VCTSvgTemplate | null
  ) => void;
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

// COPA Card Display Standard - Helper Functions

// Check if svg_templates is in COPA front/back format
export const isFrontBackFormat = (
  templates: VCTSvgTemplate[] | VCTSvgTemplates | undefined
): templates is VCTSvgTemplates => {
  if (!templates) return false;
  if (Array.isArray(templates)) return false;
  return 'front' in templates || 'back' in templates;
};

// Check if svg_templates is in legacy array format
export const isLegacyFormat = (
  templates: VCTSvgTemplate[] | VCTSvgTemplates | undefined
): templates is VCTSvgTemplate[] => {
  return Array.isArray(templates);
};

// Convert legacy array format to COPA front/back format (for backward compatibility when importing)
export const migrateToFrontBack = (templates: VCTSvgTemplate[]): VCTSvgTemplates => {
  return {
    front: templates[0] || undefined,
    back: templates[1] || undefined,
  };
};

// Evidence source type labels
export const EVIDENCE_SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  linked_credential: 'Linked Credential',
  data_furnisher: 'Data Furnisher',
  identity_verification: 'Identity Verification',
  regulatory_body: 'Regulatory Body',
};

// Metadata field options for back of card
export const METADATA_FIELD_OPTIONS = [
  { id: 'credential_type', label: 'Credential Type' },
  { id: 'issued_at', label: 'Issued Date' },
  { id: 'expires_at', label: 'Expiry Date' },
  { id: 'status', label: 'Status' },
] as const;
