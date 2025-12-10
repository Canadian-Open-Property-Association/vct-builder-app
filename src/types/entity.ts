// Entity Management Types

export type EntityType = 'issuer' | 'data-furnisher' | 'network-partner' | 'service-provider';

export type EntityStatus = 'active' | 'pending' | 'inactive';

export interface UserRef {
  id: string;
  login: string;
  name?: string;
}

// ============================================
// Furnisher Data Schema Types
// For data-furnisher entities to define their field structure
// ============================================

export interface FurnisherField {
  id: string;
  name: string;                    // Field name from furnisher (e.g., "assessed_val")
  displayName?: string;            // Human readable (e.g., "Assessed Value")
  description?: string;
  dataType?: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'array' | 'object';
  sampleValue?: string;
  apiPath?: string;                // JSON path in API response (e.g., "data.property.value")
  required?: boolean;
  notes?: string;
}

export interface FurnisherDataSchema {
  fields: FurnisherField[];
  apiDocumentationUrl?: string;    // Link to their API docs
  apiEndpoint?: string;            // Base endpoint URL
  updateFrequency?: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastUpdated?: string;
  notes?: string;
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
