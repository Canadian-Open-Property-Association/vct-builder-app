// Entity Management Types

export type EntityType = 'issuer' | 'data-furnisher' | 'network-partner' | 'service-provider';

export type EntityStatus = 'active' | 'pending' | 'inactive';

export interface UserRef {
  id: string;
  login: string;
  name?: string;
}

// ============================================
// Data Source Types
// For data-furnisher entities - supports multiple named sources
// Each source can be either a Direct Feed (API) or Credential (VC from external wallet)
// ============================================

export type DataSourceType = 'direct-feed' | 'credential';

// Base interface for furnisher fields (same for both source types)
export interface FurnisherField {
  id: string;
  name: string;                    // Field/claim name (e.g., "assessed_val" or "given_name")
  displayName?: string;            // Human readable (e.g., "Assessed Value")
  description?: string;
  dataType?: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';
  sampleValue?: string;
  required?: boolean;
  notes?: string;
  // For direct feeds only:
  apiPath?: string;                // JSON path in API response (e.g., "data.property.value")
}

// Configuration specific to Direct Data Feed sources
export interface DirectFeedConfig {
  apiDocumentationUrl?: string;    // Link to their API docs
  apiEndpoint?: string;            // Base endpoint URL
  updateFrequency?: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  authMethod?: string;             // e.g., "API Key", "OAuth2", "mTLS"
}

// Configuration specific to Credential sources
export interface CredentialSourceConfig {
  credentialName: string;          // Human readable (e.g., "BC Person Credential")
  issuerDid: string;               // DID of the credential issuer
  schemaUrl?: string;              // URL to JSON Schema
  vctUrl?: string;                 // URL to VCT/Credential Type definition
  trustFramework?: string;         // e.g., "BC Digital Trust", "Pan-Canadian Trust Framework"
  governanceDocUrl?: string;       // Link to governance documentation
  supportedWallets?: string[];     // e.g., ["BC Wallet", "COPA Wallet"]
}

// A named data source within an entity
export interface FurnisherDataSource {
  id: string;
  name: string;                    // e.g., "Assessment Data", "Person Credential"
  description?: string;
  type: DataSourceType;            // 'direct-feed' | 'credential'

  // Type-specific configuration
  directFeedConfig?: DirectFeedConfig;
  credentialConfig?: CredentialSourceConfig;

  // Fields/claims this source provides
  fields: FurnisherField[];

  // Metadata
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Updated FurnisherDataSchema - now supports multiple sources
export interface FurnisherDataSchema {
  sources: FurnisherDataSource[];  // Multiple named sources

  // Legacy fields (for backward compatibility - will be migrated to sources)
  fields?: FurnisherField[];       // @deprecated - use sources[].fields
  apiDocumentationUrl?: string;    // @deprecated - use sources[].directFeedConfig
  apiEndpoint?: string;            // @deprecated
  updateFrequency?: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'; // @deprecated
  lastUpdated?: string;            // @deprecated
  notes?: string;                  // Keep for general entity-level notes
}

// Migration helper to convert legacy schema to new format
export function migrateDataSchema(schema: FurnisherDataSchema | undefined): FurnisherDataSchema {
  if (!schema) {
    return { sources: [] };
  }

  // If already has sources array with items, return as-is
  if (schema.sources && schema.sources.length > 0) {
    return schema;
  }

  // Migrate legacy fields to a single "Data Feed" direct feed source
  if (schema.fields && schema.fields.length > 0) {
    return {
      sources: [{
        id: `source-${Date.now()}`,
        name: 'Data Feed',
        type: 'direct-feed',
        directFeedConfig: {
          apiDocumentationUrl: schema.apiDocumentationUrl,
          apiEndpoint: schema.apiEndpoint,
          updateFrequency: schema.updateFrequency,
        },
        fields: schema.fields,
      }],
      notes: schema.notes,
    };
  }

  return { sources: [], notes: schema.notes };
}

export interface Entity {
  id: string;                    // Unique identifier (slug format: copa-entity-name)
  name: string;                  // Display name
  types: EntityType[];           // Entity can have multiple types
  description?: string;

  // Visual Identity
  logoUri?: string;              // Path to logo (from asset library)
  primaryColor?: string;         // Brand color (hex)

  // Contact & Web
  website?: string;
  contactEmail?: string;
  contactPhone?: string;         // Phone number
  contactName?: string;          // Primary contact person

  // Technical Identity
  did?: string;                  // Decentralized Identifier

  // Data Furnisher specific (only relevant if types includes 'data-furnisher')
  regionsCovered?: string[];     // Regions/provinces this entity covers
  dataSchema?: FurnisherDataSchema;  // Field definitions for this furnisher's data

  // Metadata
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserRef;
  updatedBy?: UserRef;
}

// Entity type display configuration
export const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; pluralLabel: string; color: string }> = {
  'issuer': {
    label: 'Issuer',
    pluralLabel: 'Issuers',
    color: 'blue',
  },
  'data-furnisher': {
    label: 'Data Furnisher',
    pluralLabel: 'Data Furnishers',
    color: 'green',
  },
  'network-partner': {
    label: 'Network Partner',
    pluralLabel: 'Network Partners',
    color: 'purple',
  },
  'service-provider': {
    label: 'Service Provider',
    pluralLabel: 'Service Providers',
    color: 'orange',
  },
};

// Status display configuration
export const ENTITY_STATUS_CONFIG: Record<EntityStatus, { label: string; color: string }> = {
  'active': {
    label: 'Active',
    color: 'green',
  },
  'pending': {
    label: 'Pending',
    color: 'yellow',
  },
  'inactive': {
    label: 'Inactive',
    color: 'gray',
  },
};

// Selection state for UI
export interface EntitySelection {
  entityId: string;
}
