// JSON Schema Builder TypeScript Interfaces
// Based on JSON Schema Draft 2020-12 and W3C VC JSON Schema spec
// Extended to support JSON-LD Context generation mode

import {
  SchemaMode,
  JsonLdPropertyExtension,
  Vocabulary,
  DEFAULT_CONTEXT_URL,
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

  // Get standard claims config (use defaults if not provided)
  const claims = metadata.standardClaims || DEFAULT_STANDARD_CLAIMS;

  // Build required array dynamically based on standard claims config
  const required: string[] = ['credentialSubject'];
  if (claims.iss.required) required.push('iss');
  if (claims.iat.required) required.push('iat');
  if (claims.vct.required) required.push('vct');
  if (claims.exp.required) required.push('exp');
  if (claims.nbf.enabled && claims.nbf.required) required.push('nbf');
  if (claims.sub.enabled && claims.sub.required) required.push('sub');
  if (claims.jti.enabled && claims.jti.required) required.push('jti');
  if (claims.cnf.enabled && claims.cnf.required) required.push('cnf');
  if (claims.status.enabled && claims.status.required) required.push('status');

  // Build schema properties object
  const schemaProperties: Record<string, object> = {};

  // Always include core claims (iss, iat, exp, vct)
  schemaProperties.iss = {
    title: 'Issuer',
    description: 'URI identifying the issuer of the credential.',
    type: 'string',
    format: 'uri',
  };

  schemaProperties.iat = {
    title: 'Issued At',
    description: 'Unix timestamp when the credential was issued.',
    type: 'integer',
  };

  schemaProperties.exp = {
    title: 'Expiration',
    description: 'Unix timestamp when the credential expires.',
    type: 'integer',
  };

  schemaProperties.vct = {
    title: 'Verifiable Credential Type',
    description: 'URI identifying the credential type.',
    type: 'string',
    format: 'uri',
  };

  // Add optional claims if enabled
  if (claims.nbf.enabled) {
    schemaProperties.nbf = {
      title: 'Not Before',
      description: 'Unix timestamp before which the credential is not valid.',
      type: 'integer',
    };
  }

  if (claims.sub.enabled) {
    schemaProperties.sub = {
      title: 'Subject',
      description: 'Identifier for the subject of the credential.',
      type: 'string',
    };
  }

  if (claims.jti.enabled) {
    schemaProperties.jti = {
      title: 'JWT ID',
      description: 'Unique identifier for the credential.',
      type: 'string',
      format: 'uuid',
    };
  }

  if (claims.cnf.enabled) {
    schemaProperties.cnf = {
      title: 'Confirmation',
      description: 'Holder binding confirmation claim.',
      type: 'object',
      properties: {
        jwk: {
          type: 'object',
          description: 'JSON Web Key for holder binding',
        },
      },
    };
  }

  if (claims.status.enabled) {
    schemaProperties.status = {
      title: 'Credential Status',
      description: 'Information about the revocation status of the credential.',
      type: 'object',
      properties: {
        status_list: {
          type: 'object',
          description: 'Status list reference for credential revocation',
          properties: {
            idx: {
              type: 'integer',
              description: 'Index in the status list',
            },
            uri: {
              type: 'string',
              format: 'uri',
              description: 'URI of the status list',
            },
          },
        },
      },
    };
  }

  // Add credentialSubject
  schemaProperties.credentialSubject = {
    title: 'Credential Subject',
    description: 'Claims about the subject of the credential.',
    type: 'object',
    properties: credentialSubjectProps,
    ...(credentialSubjectRequired.length > 0 ? { required: credentialSubjectRequired } : {}),
  };

  // Build full schema
  const schema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: schemaId,
    title: metadata.title,
    description: metadata.description,
    type: 'object',
    required,
    properties: schemaProperties,
  };

  // Add governance doc reference if present
  if (metadata.governanceDocUrl) {
    schema['x-governance-doc'] = metadata.governanceDocUrl;
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
 * Convert a property name to PascalCase
 * Handles both snake_case and kebab-case
 */
const toPascalCase = (str: string): string => {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
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
 * that use JSON-LD format with @context references.
 */
export const toJsonLdContext = (
  metadata: SchemaMetadata,
  properties: SchemaProperty[],
  _vocabulary: Vocabulary | null
): object => {
  // Generate context URL dynamically from category + credentialName, or fallback
  const contextUrl = metadata.contextUrl ||
    generateContextUrl(metadata.title, metadata.category, metadata.credentialName) ||
    DEFAULT_CONTEXT_URL;

  // Generate schema $id URL
  const schemaId = metadata.schemaId ||
    generateSchemaId(metadata.title, metadata.category, metadata.credentialName);

  /**
   * Build JSON Schema property definition from SchemaProperty
   */
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

  // Credential type name (PascalCase from title)
  const credentialTypeName = metadata.title ? getSchemaPrefix(metadata.title) : 'Credential';

  // Build the full JSON-LD Credential Schema
  const schema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: schemaId,
    title: metadata.title || 'Verifiable Credential',
    description: metadata.description || `JSON Schema for ${metadata.title || 'Verifiable Credential'}`,
    type: 'object',
    required: ['@context', 'type', 'credentialSubject'],
    properties: {
      '@context': {
        title: 'JSON-LD Context',
        description: 'The JSON-LD context for semantic interoperability.',
        oneOf: [
          {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string', format: 'uri' },
                { type: 'object' },
              ],
            },
            contains: {
              const: 'https://www.w3.org/2018/credentials/v1',
            },
          },
          {
            type: 'string',
            const: 'https://www.w3.org/2018/credentials/v1',
          },
        ],
      },
      type: {
        title: 'Credential Type',
        description: 'The type(s) of this credential.',
        oneOf: [
          {
            type: 'array',
            items: { type: 'string' },
            contains: { const: 'VerifiableCredential' },
          },
          {
            type: 'string',
            const: 'VerifiableCredential',
          },
        ],
      },
      id: {
        title: 'Credential ID',
        description: 'Unique identifier for this credential instance.',
        type: 'string',
        format: 'uri',
      },
      issuer: {
        title: 'Issuer',
        description: 'The entity that issued this credential.',
        oneOf: [
          { type: 'string', format: 'uri' },
          {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string', format: 'uri' },
              name: { type: 'string' },
            },
          },
        ],
      },
      issuanceDate: {
        title: 'Issuance Date',
        description: 'The date and time when the credential was issued.',
        type: 'string',
        format: 'date-time',
      },
      expirationDate: {
        title: 'Expiration Date',
        description: 'The date and time when the credential expires.',
        type: 'string',
        format: 'date-time',
      },
      credentialSubject: {
        title: 'Credential Subject',
        description: 'Claims about the subject of the credential.',
        type: 'object',
        properties: {
          id: {
            title: 'Subject ID',
            description: 'Identifier for the subject of the credential.',
            type: 'string',
            format: 'uri',
          },
          ...credentialSubjectProps,
        },
        ...(credentialSubjectRequired.length > 0 ? { required: credentialSubjectRequired } : {}),
      },
      proof: {
        title: 'Proof',
        description: 'Digital proof that makes this credential verifiable.',
        type: 'object',
      },
    },
  };

  // Add governance doc reference if present
  if (metadata.governanceDocUrl) {
    schema['x-governance-doc'] = metadata.governanceDocUrl;
  }

  // Add context URL reference for documentation
  if (contextUrl) {
    schema['x-context-url'] = contextUrl;
  }

  // Add credential type hint
  schema['x-credential-type'] = credentialTypeName;

  return schema;
};
