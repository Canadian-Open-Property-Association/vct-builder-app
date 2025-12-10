// Data Harmonization Types - Mapping furnisher fields to COPA vocabulary
// Separated from catalogue.ts to focus on mapping/harmonization only

import type { UserRef } from './dictionary';
import type { DataSourceType } from './entity';

// ============================================
// FieldMapping - links a furnisher field to COPA vocab
// This is the core harmonization relationship
// ============================================

export interface FieldMapping {
  id: string;

  // Source (furnisher side) - references Entity Manager
  entityId: string;                // Reference to Entity
  entityName?: string;             // Denormalized for display

  // NEW: Data source context within the entity
  sourceId: string;                // Reference to FurnisherDataSource
  sourceName?: string;             // Denormalized for display
  sourceType: DataSourceType;      // 'direct-feed' | 'credential'

  furnisherFieldId: string;        // Reference to FurnisherField in the source
  furnisherFieldName?: string;     // Denormalized for display

  // Full path for unique identification (e.g., "landcor.assessment-api.assessed_val")
  fieldPath: string;               // {entityId}.{sourceId}.{fieldName}

  // Target (COPA vocab side) - references Data Dictionary
  vocabTypeId: string;             // Reference to VocabType
  vocabTypeName?: string;          // Denormalized for display
  vocabPropertyId: string;         // Reference to VocabProperty
  vocabPropertyName?: string;      // Denormalized for display

  // Mapping metadata
  regionsCovered?: string[];       // Optional regional override (inherits from entity if not set)
  transformExpression?: string;    // Future: for complex mappings (e.g., unit conversion)
  notes?: string;                  // Integration notes

  // Audit trail
  createdAt: string;
  createdBy?: UserRef;
  updatedAt: string;
  updatedBy?: UserRef;
}

// Helper to generate field path
export function generateFieldPath(entityId: string, sourceId: string, fieldName: string): string {
  return `${entityId}.${sourceId}.${fieldName}`;
}

// Helper to parse field path
export function parseFieldPath(fieldPath: string): { entityId: string; sourceId: string; fieldName: string } | null {
  const parts = fieldPath.split('.');
  if (parts.length < 3) return null;
  return {
    entityId: parts[0],
    sourceId: parts[1],
    fieldName: parts.slice(2).join('.'), // Handle field names with dots
  };
}

// ============================================
// MappingSet - grouped collection of mappings
// Useful for organizing mappings by domain/purpose
// ============================================

export interface MappingSet {
  id: string;
  name: string;                    // e.g., "Property Data Mappings"
  description?: string;
  mappings: FieldMapping[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: UserRef;
  updatedBy?: UserRef;
}

// ============================================
// Canvas State Types (for visual mapping UI)
// Migrated from Data Catalogue canvas view
// ============================================

export interface CanvasNode {
  id: string;
  type: 'entity' | 'vocabType';
  position: { x: number; y: number };
  data: {
    entityId?: string;             // For entity nodes
    vocabTypeId?: string;          // For vocab type nodes
  };
}

export interface CanvasEdge {
  id: string;
  source: string;                  // Node ID
  target: string;                  // Node ID
  sourceHandle?: string;           // Field/property ID on source
  targetHandle?: string;           // Field/property ID on target
  mappingId: string;               // Reference to FieldMapping
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// ============================================
// API Response Types
// ============================================

export interface MappingWithDetails extends FieldMapping {
  // Enriched with full entity and vocab data
  entity?: {
    id: string;
    name: string;
    logoUri?: string;
  };
  source?: {
    id: string;
    name: string;
    type: DataSourceType;
  };
  vocabType?: {
    id: string;
    name: string;
    category: string;
  };
  vocabProperty?: {
    id: string;
    name: string;
    displayName: string;
    valueType: string;
  };
}

// ============================================
// Stats for display
// ============================================

export interface HarmonizationStats {
  totalMappings: number;
  mappedEntities: number;
  mappedVocabTypes: number;
  unmappedFurnisherFields: number;
}

// ============================================
// Export format (for publishing to VDR)
// ============================================

export interface HarmonizationExport {
  version: string;
  exportedAt: string;
  mappings: FieldMapping[];
}
