// Data Catalogue Types

export interface UserRef {
  id: string;
  login: string;
  name?: string;
}

export interface Furnisher {
  id: string;
  name: string;
  description?: string;

  // Info Card Details
  logoUri?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Technical Details
  did?: string; // Future: DID for trust registry
  regionsCovered: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: UserRef;
}

export interface DataType {
  id: string;
  furnisherId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataAttribute {
  id: string;
  dataTypeId: string;
  name: string;
  displayName?: string;
  description?: string;
  dataType: string; // string, number, boolean, array, object, etc.
  sampleValue?: string;
  regionsCovered?: string[]; // Override furnisher default if needed
  path?: string; // JSON path like "property_details[].bedrooms"
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface FurnisherWithDataTypes extends Furnisher {
  dataTypes: DataTypeWithAttributes[];
}

export interface DataTypeWithAttributes extends DataType {
  attributes: DataAttribute[];
}

// Stats for display
export interface FurnisherStats {
  dataTypeCount: number;
  attributeCount: number;
}

// Selection state
export type SelectionType = 'furnisher' | 'dataType' | 'attribute';

export interface Selection {
  type: SelectionType;
  furnisherId: string;
  dataTypeId?: string;
  attributeId?: string;
}
