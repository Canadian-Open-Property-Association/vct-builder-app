/**
 * JSON-LD Vocabulary System Type Definitions
 *
 * This module defines types for the vocabulary-based JSON-LD context generation
 * mode in the Schema Builder.
 */

// Schema output mode - determines the format of generated schema
export type SchemaMode = 'json-schema' | 'jsonld-context';

// Types a vocabulary term can represent
export type VocabTermType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'uri'
  | 'date'
  | 'dateTime'
  | 'object' // Complex nested type
  | 'array'; // Array of items

/**
 * A vocabulary term definition
 * Represents a single term in a vocabulary that can be used to map properties
 */
export interface VocabTerm {
  /** Unique term identifier (e.g., "name", "issuedToParty") */
  id: string;
  /** Human-readable label */
  label: string;
  /** Term description */
  description: string;
  /** Full @id URI (e.g., "vocab:name" or full URL) */
  '@id': string;
  /** What types this term can map to */
  allowedTypes: VocabTermType[];
  /** If true, this term represents a complex type with nested @context */
  isComplexType?: boolean;
}

/**
 * A complex type definition in the vocabulary
 * Examples: Party, ConformityAttestation, BinaryFile
 */
export interface VocabComplexType {
  /** Type identifier (e.g., "Party") */
  id: string;
  /** Human-readable name */
  label: string;
  /** Type description */
  description: string;
  /** Full @id URI for the type */
  '@id': string;
  /** IDs of vocab terms allowed as properties of this type */
  allowedProperties: string[];
}

/**
 * Complete vocabulary definition
 * A vocabulary defines all available terms and complex types
 */
export interface Vocabulary {
  /** Vocabulary identifier */
  id: string;
  /** Display name */
  name: string;
  /** Vocabulary description */
  description: string;
  /** URL where vocab is hosted */
  url: string;
  /** Base URL for @context references */
  contextUrl: string;
  /** Version string */
  version: string;
  /** Available terms */
  terms: VocabTerm[];
  /** Complex type definitions */
  complexTypes: VocabComplexType[];
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * JSON-LD specific property extensions
 * Added to SchemaProperty when in JSON-LD mode
 */
export interface JsonLdPropertyExtension {
  /** Reference to vocab term ID */
  vocabTermId?: string;
  /** If this property is a complex type, the type ID */
  complexTypeId?: string;
  /** Custom @id override (optional) */
  customId?: string;
}

// Default COPA vocabulary URLs
export const DEFAULT_VOCAB_URL =
  'https://openpropertyassociation.ca/vocab.jsonld';
export const DEFAULT_CONTEXT_URL =
  'https://openpropertyassociation.ca/context.jsonld';

// Map vocab term types to JSON Schema types (for dual-mode support)
export const VOCAB_TYPE_TO_JSON_SCHEMA: Record<VocabTermType, string> = {
  string: 'string',
  integer: 'integer',
  number: 'number',
  boolean: 'boolean',
  uri: 'string',
  date: 'string',
  dateTime: 'string',
  object: 'object',
  array: 'array',
};

// Labels for vocab term types (for UI display)
export const VOCAB_TERM_TYPE_LABELS: Record<VocabTermType, string> = {
  string: 'String',
  integer: 'Integer',
  number: 'Number',
  boolean: 'Boolean',
  uri: 'URI',
  date: 'Date',
  dateTime: 'Date-Time',
  object: 'Complex Type',
  array: 'Array',
};

// JSON Schema format mappings for vocab types
export const VOCAB_TYPE_TO_JSON_SCHEMA_FORMAT: Partial<
  Record<VocabTermType, string>
> = {
  uri: 'uri',
  date: 'date',
  dateTime: 'date-time',
};
