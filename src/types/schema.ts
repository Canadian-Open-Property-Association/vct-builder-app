// JSON Schema Builder TypeScript Interfaces
// Based on JSON Schema Draft 2020-12 and W3C VC JSON Schema spec
// Extended to support JSON-LD Context generation mode

import {
  SchemaMode,
  JsonLdPropertyExtension,
  Vocabulary,
} from './vocabulary';

// Supported JSON Schema types
export type SchemaPropertyType = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';

// String format options
export type StringFormat = 'email' | 'uri' | 'date' | 'date-time' | 'uuid' | 'hostname' | 'ipv4' | 'ipv6';

// Schema property definition (used for building the schema)
export interface SchemaProperty {
  id: string;                    // Unique ID for UI tracking
  name: string;                  // JSON property name (key)
  title: string;                 // Human-readable title
  description?: string;          // Property description
  type: SchemaPropertyType;      // JSON Schema type
  required: boolean;             // Is this property required?

  // String constraints
  minLength?: number;
  maxLength?: number;
  format?: StringFormat;
  pattern?: string;              // Regex pattern
  enum?: string[];               // Allowed values

  // Number/Integer constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;

  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: SchemaProperty;        // Array item schema

  // Object nested properties
  properties?: SchemaProperty[];

  // JSON-LD specific fields (used in jsonld-context mode)
  jsonLd?: JsonLdPropertyExtension;
}

// Standard claim configuration for SD-JWT VC
export interface StandardClaimConfig {
  enabled: boolean;    // Whether to include this claim in the schema
  required: boolean;   // Whether this claim is required
}

// Core claims are always enabled, but required status is configurable
export interface CoreClaimConfig {
  required: boolean;
}

// Standard claims configuration for SD-JWT VC schemas
export interface StandardClaimsConfig {
  // Core claims (always included in schema)
  iss: CoreClaimConfig;      // Issuer - default required
  iat: CoreClaimConfig;      // Issued At - default required
  vct: CoreClaimConfig;      // Verifiable Credential Type - default required
  exp: CoreClaimConfig;      // Expiration - default optional

  // Optional claims (can be toggled on/off)
  nbf: StandardClaimConfig;  // Not Before
  sub: StandardClaimConfig;  // Subject
  jti: StandardClaimConfig;  // JWT ID
  cnf: StandardClaimConfig;  // Confirmation (holder binding)
  status: StandardClaimConfig; // Credential status/revocation
}

// Default standard claims configuration
export const DEFAULT_STANDARD_CLAIMS: StandardClaimsConfig = {
  // Core claims
  iss: { required: true },
  iat: { required: true },
  vct: { required: true },
  exp: { required: false },
  // Optional claims
  nbf: { enabled: false, required: false },
  sub: { enabled: false, required: false },
  jti: { enabled: false, required: false },
  cnf: { enabled: true, required: false },
  status: { enabled: false, required: false },
};

// ============================================
// Evidence Requirements - for declaring data provenance
// ============================================

export interface EvidenceRequirement {
  id: string;
  claimPath?: string;              // Which claim (or group if not specified, applies to all)
  furnisherCategory: string;       // e.g., "property-valuation", "identity-verification"
  authorizedEntities: string[];    // Entity IDs that can provide this evidence
  required: boolean;               // Must have evidence vs optional
  description?: string;            // Human-readable description of this evidence requirement
}

export interface EvidenceConfig {
  defaultCategory?: string;        // Group-level default furnisher category
  requirements: EvidenceRequirement[];  // Per-claim or global evidence requirements
}

// Schema metadata
export interface SchemaMetadata {
  schemaId: string;              // $id URL
  title: string;                 // Schema title
  description: string;           // Schema description
  governanceDocUrl?: string;     // x-governance-doc URL
  governanceDocName?: string;    // Display name of linked governance doc

  // Namespace fields (for VDR naming convention)
  category?: string;             // Category slug (e.g., "property", "identity", "badge")
  credentialName?: string;       // Credential name slug (e.g., "home-credential")

  // VCT Reference (for SD-JWT mode) - links schema to VCT definition
  vctUri?: string;               // Selected VCT URI from library
  vctName?: string;              // Display name of selected VCT

  // Default Issuer (for credential templates)
  defaultIssuerEntityId?: string;  // Entity ID (e.g., "copa-cornerstone")
  defaultIssuerUri?: string;       // Resolved issuer URI (from entity DID or canonical URL)
  defaultIssuerName?: string;      // Display name of issuer entity

  // Standard claims configuration (for SD-JWT VC)
  standardClaims: StandardClaimsConfig;

  // JSON-LD Context mode fields
  mode: SchemaMode;              // 'json-schema' or 'jsonld-context'
  vocabUrl?: string;             // URL to vocabulary file
  contextUrl?: string;           // Base URL for @context references
  contextVersion?: number;       // @version (default 1.1)
  protected?: boolean;           // @protected flag

  // Evidence configuration (data provenance requirements)
  evidence?: EvidenceConfig;
}

// Standard VC properties (auto-included in every schema)
export const STANDARD_VC_PROPERTIES = {
  iss: {
    title: 'Issuer',
    description: 'URI identifying the issuer of the credential.',
    type: 'string',
    format: 'uri',
  },
  iat: {
    title: 'Issued At',
    description: 'Unix timestamp when the credential was issued.',
    type: 'integer',
  },
  exp: {
    title: 'Expiration',
    description: 'Unix timestamp when the credential expires.',
    type: 'integer',
  },
  vct: {
    title: 'Verifiable Credential Type',
    description: 'URI identifying the credential type.',
    type: 'string',
    format: 'uri',
  },
  cnf: {
    title: 'Confirmation',
    description: 'Holder binding confirmation claim.',
    type: 'object',
  },
} as const;

// Saved schema project
export interface SavedSchemaProject {
  id: string;
  name: string;
  metadata: SchemaMetadata;
  properties: SchemaProperty[];  // credentialSubject properties
  createdAt: string;
  updatedAt: string;
}

// Governance doc from GitHub
export interface GovernanceDoc {
  name: string;                  // Filename (e.g., "home-credential.md")
  path: string;                  // Full path in repo
  displayName: string;           // Human-readable name
  url: string;                   // URL to the published doc
}

// Schema store state
export interface SchemaStore {
  // Current schema being edited
  metadata: SchemaMetadata;
  properties: SchemaProperty[];

  // Project management
  currentProjectId: string | null;
  currentProjectName: string;
  isDirty: boolean;
  isEditing: boolean; // True when user has created/loaded a schema (shows editor vs welcome screen)
  savedProjects: SavedSchemaProject[];

  // UI state
  selectedPropertyId: string | null;
  expandedNodes: Set<string>;

  // Governance docs
  governanceDocs: GovernanceDoc[];
  isLoadingDocs: boolean;

  // Metadata actions
  updateMetadata: (updates: Partial<SchemaMetadata>) => void;
  setGovernanceDoc: (doc: GovernanceDoc | null) => void;

  // Property actions
  addProperty: (parentId?: string) => void;
  addPropertyWithData: (data: Partial<SchemaProperty>, parentId?: string) => string;
  updateProperty: (id: string, updates: Partial<SchemaProperty>) => void;
  deleteProperty: (id: string) => void;
  moveProperty: (id: string, direction: 'up' | 'down') => void;

  // Tree UI actions
  selectProperty: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Project actions
  newSchema: () => void;
  saveSchema: (name: string) => Promise<void>;
  loadSchema: (id: string) => void;
  deleteSchema: (id: string) => Promise<void>;
  closeSchema: () => void; // Return to welcome screen

  // Mode management
  setMode: (mode: SchemaMode) => void;

  // Import/Export
  exportSchema: () => string;
  importSchema: (json: string) => void;

  // Governance docs
  fetchGovernanceDocs: () => Promise<void>;
}

// Base URLs for VDR hosting
export const VDR_BASE_URL = 'https://openpropertyassociation.ca/credentials';
export const SCHEMA_BASE_URL = `${VDR_BASE_URL}/schemas`;
export const CONTEXT_BASE_URL = `${VDR_BASE_URL}/contexts`;

// Convert string to kebab-case
export const toKebabCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
};

// Generate full artifact name from category and credential name
// Pattern: {category}-{credential-name}
export const generateArtifactName = (category?: string, credentialName?: string): string => {
  if (!category && !credentialName) return '';
  const parts = [category, credentialName].filter((p): p is string => Boolean(p)).map(toKebabCase);
  return parts.join('-');
};

// Generate $id from category and credential name (for schemas)
export const generateSchemaId = (title: string, category?: string, credentialName?: string): string => {
  // If category and credentialName are provided, use them
  if (category || credentialName) {
    const artifactName = generateArtifactName(category, credentialName);
    if (artifactName) {
      return `${SCHEMA_BASE_URL}/${artifactName}.schema.json`;
    }
  }
  // Fallback to title-based generation
  if (!title) return '';
  const kebabCase = toKebabCase(title);
  return `${SCHEMA_BASE_URL}/${kebabCase}.schema.json`;
};

// Generate context URL from category and credential name
export const generateContextUrl = (title: string, category?: string, credentialName?: string): string => {
  // If category and credentialName are provided, use them
  if (category || credentialName) {
    const artifactName = generateArtifactName(category, credentialName);
    if (artifactName) {
      return `${CONTEXT_BASE_URL}/${artifactName}.context.jsonld`;
    }
  }
  // Fallback to title-based generation
  if (!title) return '';
  const kebabCase = toKebabCase(title);
  return `${CONTEXT_BASE_URL}/${kebabCase}.context.jsonld`;
};

// Create default empty schema metadata
export const createDefaultMetadata = (): SchemaMetadata => ({
  schemaId: '',
  title: '',
  description: '',
  governanceDocUrl: undefined,
  governanceDocName: undefined,
  // Standard claims defaults
  standardClaims: { ...DEFAULT_STANDARD_CLAIMS },
  // JSON-LD mode defaults
  mode: 'json-schema',
  vocabUrl: undefined,
  contextUrl: undefined,
  contextVersion: 1.1,
  protected: true,
});

// Create default empty property
export const createDefaultProperty = (id: string): SchemaProperty => ({
  id,
  name: '',
  title: '',
  description: '',
  type: 'string',
  required: false,
});

// Convert internal schema representation to JSON Schema Draft 2020-12
// Outputs only credentialSubject validation - JWT wrapper claims are spec-defined
export const toJsonSchema = (metadata: SchemaMetadata, properties: SchemaProperty[]): object => {
  const buildPropertySchema = (prop: SchemaProperty): object => {
    const schema: Record<string, unknown> = {
      title: prop.title || prop.name,
      type: prop.type,
    };

    if (prop.description) {
      schema.description = prop.description;
    }

    // String constraints
    if (prop.type === 'string') {
      if (prop.minLength !== undefined) schema.minLength = prop.minLength;
      if (prop.maxLength !== undefined) schema.maxLength = prop.maxLength;
      if (prop.format) schema.format = prop.format;
      if (prop.pattern) schema.pattern = prop.pattern;
      if (prop.enum && prop.enum.length > 0) schema.enum = prop.enum;
    }

    // Number/Integer constraints
    if (prop.type === 'integer' || prop.type === 'number') {
      if (prop.minimum !== undefined) schema.minimum = prop.minimum;
      if (prop.maximum !== undefined) schema.maximum = prop.maximum;
      if (prop.exclusiveMinimum !== undefined) schema.exclusiveMinimum = prop.exclusiveMinimum;
      if (prop.exclusiveMaximum !== undefined) schema.exclusiveMaximum = prop.exclusiveMaximum;
    }

    // Array constraints
    if (prop.type === 'array') {
      if (prop.minItems !== undefined) schema.minItems = prop.minItems;
      if (prop.maxItems !== undefined) schema.maxItems = prop.maxItems;
      if (prop.uniqueItems) schema.uniqueItems = prop.uniqueItems;
      if (prop.items) {
        schema.items = buildPropertySchema(prop.items);
      }
    }

    // Object nested properties
    if (prop.type === 'object' && prop.properties && prop.properties.length > 0) {
      const nestedProps: Record<string, object> = {};
      const nestedRequired: string[] = [];

      for (const nested of prop.properties) {
        nestedProps[nested.name] = buildPropertySchema(nested);
        if (nested.required) {
          nestedRequired.push(nested.name);
        }
      }

      schema.properties = nestedProps;
      if (nestedRequired.length > 0) {
        schema.required = nestedRequired;
      }
    }

    return schema;
  };

  // Build credentialSubject properties
  const credentialSubjectProps: Record<string, object> = {};
  const credentialSubjectRequired: string[] = [];

  for (const prop of properties) {
    if (prop.name) {
      credentialSubjectProps[prop.name] = buildPropertySchema(prop);
      if (prop.required) {
        credentialSubjectRequired.push(prop.name);
      }
    }
  }

  // Auto-generate $id from title if not provided
  const schemaId = metadata.schemaId || generateSchemaId(metadata.title);

  // Build schema - only validates credentialSubject
  // JWT wrapper claims (iss, iat, exp, vct, etc.) are spec-defined and don't need per-schema validation
  const schema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: schemaId,
    title: metadata.title,
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: credentialSubjectProps,
        ...(credentialSubjectRequired.length > 0 ? { required: credentialSubjectRequired } : {}),
      },
    },
  };

  // Only add description if present
  if (metadata.description) {
    schema.description = metadata.description;
  }

  return schema;
};

// Property type labels for UI
export const PROPERTY_TYPE_LABELS: Record<SchemaPropertyType, string> = {
  string: 'String',
  integer: 'Integer',
  number: 'Number',
  boolean: 'Boolean',
  object: 'Object',
  array: 'Array',
};

// String format labels for UI
export const STRING_FORMAT_LABELS: Record<StringFormat, string> = {
  email: 'Email',
  uri: 'URI',
  date: 'Date (YYYY-MM-DD)',
  'date-time': 'Date-Time (ISO 8601)',
  uuid: 'UUID',
  hostname: 'Hostname',
  ipv4: 'IPv4 Address',
  ipv6: 'IPv6 Address',
};

/**
 * Generate schema prefix from title (PascalCase)
 * e.g., "Home Credential" -> "HomeCredential"
 */
const getSchemaPrefix = (title: string): string => {
  return title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

/**
 * Convert internal schema representation to JSON-LD Credential Schema format
 * This is used when mode is 'jsonld-context'
 *
 * Produces a JSON Schema (Draft 2020-12) for validating W3C Verifiable Credentials
 * following the W3C VC JSON Schema Specification pattern.
 *
 * The schema focuses on validating credentialSubject properties only,
 * as recommended by the W3C spec examples.
 *
 * @see https://www.w3.org/TR/vc-json-schema/
 */
export const toJsonLdContext = (
  metadata: SchemaMetadata,
  properties: SchemaProperty[],
  _vocabulary: Vocabulary | null
): object => {
  // Generate schema $id URL
  const schemaId = metadata.schemaId ||
    generateSchemaId(metadata.title, metadata.category, metadata.credentialName);

  /**
   * Build JSON Schema property definition from SchemaProperty
   */
  const buildPropertySchema = (prop: SchemaProperty): object => {
    const schema: Record<string, unknown> = {
      type: prop.type,
    };

    // Only add format for strings that have it
    if (prop.type === 'string' && prop.format) {
      schema.format = prop.format;
    }

    // String constraints
    if (prop.type === 'string') {
      if (prop.minLength !== undefined) schema.minLength = prop.minLength;
      if (prop.maxLength !== undefined) schema.maxLength = prop.maxLength;
      if (prop.pattern) schema.pattern = prop.pattern;
      if (prop.enum && prop.enum.length > 0) schema.enum = prop.enum;
    }

    // Number/Integer constraints
    if (prop.type === 'integer' || prop.type === 'number') {
      if (prop.minimum !== undefined) schema.minimum = prop.minimum;
      if (prop.maximum !== undefined) schema.maximum = prop.maximum;
      if (prop.exclusiveMinimum !== undefined) schema.exclusiveMinimum = prop.exclusiveMinimum;
      if (prop.exclusiveMaximum !== undefined) schema.exclusiveMaximum = prop.exclusiveMaximum;
    }

    // Array constraints
    if (prop.type === 'array') {
      if (prop.minItems !== undefined) schema.minItems = prop.minItems;
      if (prop.maxItems !== undefined) schema.maxItems = prop.maxItems;
      if (prop.uniqueItems) schema.uniqueItems = prop.uniqueItems;
      if (prop.items) {
        schema.items = buildPropertySchema(prop.items);
      }
    }

    // Object nested properties
    if (prop.type === 'object' && prop.properties && prop.properties.length > 0) {
      const nestedProps: Record<string, object> = {};
      const nestedRequired: string[] = [];

      for (const nested of prop.properties) {
        nestedProps[nested.name] = buildPropertySchema(nested);
        if (nested.required) {
          nestedRequired.push(nested.name);
        }
      }

      schema.properties = nestedProps;
      if (nestedRequired.length > 0) {
        schema.required = nestedRequired;
      }
    }

    return schema;
  };

  // Build credentialSubject properties
  const credentialSubjectProps: Record<string, object> = {};
  const credentialSubjectRequired: string[] = [];

  for (const prop of properties) {
    if (prop.name) {
      credentialSubjectProps[prop.name] = buildPropertySchema(prop);
      if (prop.required) {
        credentialSubjectRequired.push(prop.name);
      }
    }
  }

  // Credential type name (PascalCase from title) for description
  const credentialTypeName = metadata.title ? getSchemaPrefix(metadata.title) : 'Credential';

  // Build the JSON Schema following W3C VC JSON Schema Specification pattern
  // This simplified structure focuses on credentialSubject validation only
  const schema: Record<string, unknown> = {
    $id: schemaId,
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: metadata.title || credentialTypeName,
    description: metadata.description || `${credentialTypeName} using JsonSchema`,
    type: 'object',
    properties: {
      credentialSubject: {
        type: 'object',
        properties: credentialSubjectProps,
        ...(credentialSubjectRequired.length > 0 ? { required: credentialSubjectRequired } : {}),
      },
    },
  };

  return schema;
};
