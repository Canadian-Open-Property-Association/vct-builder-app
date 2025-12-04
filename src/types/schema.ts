// JSON Schema Builder TypeScript Interfaces
// Based on JSON Schema Draft 2020-12 and W3C VC JSON Schema spec

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
}

// Schema metadata
export interface SchemaMetadata {
  schemaId: string;              // $id URL
  title: string;                 // Schema title
  description: string;           // Schema description
  governanceDocUrl?: string;     // x-governance-doc URL
  governanceDocName?: string;    // Display name of linked governance doc
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

  // Import/Export
  exportSchema: () => string;
  importSchema: (json: string) => void;

  // Governance docs
  fetchGovernanceDocs: () => Promise<void>;
}

// Base URL for schema hosting
export const SCHEMA_BASE_URL = 'https://openpropertyassociation.ca/credentials/schemas';

// Generate $id from filename
export const generateSchemaId = (filename: string): string => {
  const cleanName = filename.replace(/\.json$/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${SCHEMA_BASE_URL}/${cleanName}.json`;
};

// Create default empty schema metadata
export const createDefaultMetadata = (): SchemaMetadata => ({
  schemaId: '',
  title: '',
  description: '',
  governanceDocUrl: undefined,
  governanceDocName: undefined,
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

  // Build full schema
  const schema: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: metadata.schemaId,
    title: metadata.title,
    description: metadata.description,
    type: 'object',
    required: ['credentialSubject', 'iss', 'iat', 'vct'],
    properties: {
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
        properties: {
          jwk: {
            type: 'object',
            description: 'JSON Web Key for holder binding',
          },
        },
      },
      credentialSubject: {
        title: 'Credential Subject',
        description: 'Claims about the subject of the credential.',
        type: 'object',
        properties: credentialSubjectProps,
        ...(credentialSubjectRequired.length > 0 ? { required: credentialSubjectRequired } : {}),
      },
    },
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
