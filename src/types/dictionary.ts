// Data Dictionary Types - COPA Canonical Vocabulary Library
// Separated from catalogue.ts to focus on vocabulary management only
// Provider mappings moved to harmonization.ts

export interface UserRef {
  id: string;
  login: string;
  name?: string;
}

// ============================================
// Categories - for organizing vocabulary types
// ============================================

export interface VocabCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}

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

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// VocabType - the primary vocabulary concept
// Represents a category of data (e.g., "Property Valuation")
// ============================================

export interface VocabType {
  id: string;                      // Slug-style ID (e.g., "property-valuation")
  name: string;                    // Display name (e.g., "Property Valuation")
  description?: string;
  category: string;                // Category ID

  // Hierarchy support (type inheritance)
  parentTypeId?: string;           // Reference to parent VocabType
  childTypeIds?: string[];         // Populated dynamically, not stored

  // Properties (attributes of this type)
  properties: VocabProperty[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: UserRef;
  updatedBy?: UserRef;
}

// ============================================
// API Response Types
// ============================================

export interface VocabTypeWithCategory extends VocabType {
  categoryName?: string;           // Denormalized category name
}

export interface VocabTypeHierarchy {
  vocabType: VocabType;
  children: VocabTypeHierarchy[];
}

export interface CategoryWithTypes {
  category: VocabCategory;
  vocabTypes: VocabType[];
}

// ============================================
// Stats for display
// ============================================

export interface VocabTypeStats {
  propertyCount: number;
}

export interface DictionaryStats {
  totalVocabTypes: number;
  totalProperties: number;
  categoryCounts: Record<string, number>;
}

// ============================================
// Export format (for publishing to VDR)
// ============================================

export interface DictionaryExport {
  version: string;
  exportedAt: string;
  categories: VocabCategory[];
  vocabTypes: VocabType[];
}
