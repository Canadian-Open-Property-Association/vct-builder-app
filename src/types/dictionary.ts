// Data Dictionary Types - COPA Canonical Vocabulary Library
// Separated from catalogue.ts to focus on vocabulary management only
// Provider mappings moved to harmonization.ts

export interface UserRef {
  id: string;
  login: string;
  name?: string;
}

// ============================================
// Domains - for organizing vocabulary types
// Replaces rigid Category hierarchy with flexible multi-domain tagging
// ============================================

export interface VocabDomain {
  id: string;
  name: string;
  description?: string;
  order: number;
  color?: string;  // Optional: for UI tag colors
}

// Backwards compatibility alias
export type VocabCategory = VocabDomain;

// ============================================
// Value Types - supported property value types
// ============================================

export type ValueType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'currency'
  | 'url'
  | 'email'
  | 'phone'
  | 'array'
  | 'object';

// ============================================
// Property Constraints - validation rules
// ============================================

export interface PropertyConstraints {
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;              // Regex pattern

  // Numeric constraints
  minimum?: number;
  maximum?: number;
  precision?: number;            // Decimal places for currency/numbers

  // Enum constraints
  enum?: string[];               // Allowed values

  // Format hints
  format?: string;               // e.g., "CAD" for currency, "ISO8601" for dates
}

// ============================================
// VocabProperty - attributes of a vocabulary type
// ============================================

export interface VocabProperty {
  id: string;
  name: string;                    // Technical name (e.g., "propertyAssessedValue")
  displayName: string;             // Human label (e.g., "Assessed Value")
  description?: string;
  valueType: ValueType;
  required: boolean;

  // Constraints (like JSON Schema)
  constraints?: PropertyConstraints;

  // Nesting support (for hierarchical properties)
  parentPropertyId?: string;       // For nested attributes
  children?: VocabProperty[];      // Computed from parentPropertyId (not stored)

  // JSON-LD mapping
  jsonLdTerm?: string;             // @id in context (e.g., "schema:value")

  // Sample/documentation
  sampleValue?: string;

  // ============================================
  // RESO Data Dictionary metadata (optional)
  // ============================================

  // Internationalization
  displayNameFr?: string;          // French Canadian display name
  displayNameEs?: string;          // Spanish display name

  // RESO classification
  resoGroups?: string[];           // RESO Groups (e.g., ["Structure", "Location"])
  resoPropertyTypes?: string[];    // Applicable property types (e.g., ["RESI", "RLSE", "RINC"])
  resoLookupName?: string;         // RESO lookup/enum reference
  resoElementStatus?: string;      // RESO element status (Active, etc.)

  // Related terms
  synonyms?: string[];             // Alternative names for the field

  // External documentation
  wikiUrl?: string;                // RESO Wiki documentation URL

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// VocabType - the primary vocabulary concept
// Represents a category of data (e.g., "Property Valuation")
// ============================================

export interface VocabType {
  id: string;                      // Slug-style ID (e.g., "property-valuation")
  name: string;                    // Display name (e.g., "Property Valuation")
  description?: string;

  // Domain tagging (replaces single category)
  domains: string[];               // Multiple domain IDs (flexible tagging)
  /** @deprecated Use domains[] instead */
  category?: string;               // Legacy single category ID - kept for migration

  // Hierarchy support (type inheritance)
  parentTypeId?: string;           // Reference to parent VocabType
  childTypeIds?: string[];         // Populated dynamically, not stored

  // Properties (attributes of this type)
  properties: VocabProperty[];

  // Source tracking (for imported vocabularies like RESO)
  source?: string;                 // e.g., "RESO", "COPA"
  sourceVersion?: string;          // e.g., "2.0"

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: UserRef;
  updatedBy?: UserRef;
}

// ============================================
// API Response Types
// ============================================

export interface VocabTypeWithDomains extends VocabType {
  domainNames?: string[];          // Denormalized domain names
}

/** @deprecated Use VocabTypeWithDomains */
export type VocabTypeWithCategory = VocabTypeWithDomains;

export interface VocabTypeHierarchy {
  vocabType: VocabType;
  children: VocabTypeHierarchy[];
}

export interface DomainWithTypes {
  domain: VocabDomain;
  vocabTypes: VocabType[];         // Types that have this domain in their domains[]
}

/** @deprecated Use DomainWithTypes */
export type CategoryWithTypes = DomainWithTypes;

// ============================================
// Stats for display
// ============================================

export interface VocabTypeStats {
  propertyCount: number;
}

export interface DictionaryStats {
  totalVocabTypes: number;
  totalProperties: number;
  domainCounts: Record<string, number>;
  /** @deprecated Use domainCounts */
  categoryCounts?: Record<string, number>;
}

// ============================================
// Export format (for publishing to VDR)
// ============================================

export interface DictionaryExport {
  version: string;
  exportedAt: string;
  domains: VocabDomain[];
  /** @deprecated Use domains */
  categories?: VocabCategory[];
  vocabTypes: VocabType[];
}

// ============================================
// Migration Helper
// ============================================

/**
 * Migrate legacy VocabType with single category to domains array
 */
export function migrateVocabTypeTodomains(vocabType: Partial<VocabType>): VocabType {
  const { category, domains, ...rest } = vocabType as VocabType & { category?: string };
  return {
    ...rest,
    domains: domains && domains.length > 0 ? domains : (category ? [category] : []),
  } as VocabType;
}
