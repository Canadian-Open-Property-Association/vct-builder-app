import type { FurnisherField, FurnisherDataSource, DirectFeedConfig } from '../../../types/entity';

// ============================================
// Types for parsed OpenAPI spec
// ============================================

export interface ParsedOpenApiSpec {
  success: boolean;
  specUrl: string;
  originalUrl: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  endpoints: ParsedEndpoint[];
  schemas: ParsedSchema[];
}

export interface ParsedEndpoint {
  id: string;
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ParsedParameter[];
  requestBody: ParsedSchemaRef | null;
  responses: Record<string, ParsedSchemaRef>;
}

export interface ParsedParameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description: string;
}

export interface ParsedSchema {
  id: string;
  name: string;
  type: string;
  description: string;
  properties: ParsedProperty[];
  required: string[];
}

export interface ParsedProperty {
  name: string;
  type: string;
  format: string | null;
  description: string;
  example: unknown;
  required: boolean;
  enum: string[] | null;
  items: {
    type: string;
    format: string | null;
  } | null;
}

export interface ParsedSchemaRef {
  name: string;
  type: string;
  isRef: boolean;
}

// ============================================
// Type Mappings
// ============================================

// OpenAPI type -> FurnisherField dataType
const TYPE_MAPPING: Record<string, FurnisherField['dataType']> = {
  'string': 'string',
  'integer': 'integer',
  'number': 'number',
  'boolean': 'boolean',
  'array': 'array',
  'object': 'object',
};

// OpenAPI format -> FurnisherField dataType (overrides base type)
const FORMAT_MAPPING: Record<string, FurnisherField['dataType']> = {
  'date': 'date',
  'date-time': 'datetime',
  'int32': 'integer',
  'int64': 'integer',
  'float': 'number',
  'double': 'number',
};

// ============================================
// Utility Functions
// ============================================

/**
 * Convert a property name to display name
 * Examples:
 *   snake_case -> Snake Case
 *   camelCase -> Camel Case
 *   PascalCase -> Pascal Case
 *   kebab-case -> Kebab Case
 */
export function toDisplayName(name: string): string {
  return name
    // Insert space before uppercase letters (for camelCase/PascalCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase())
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map OpenAPI type/format to FurnisherField dataType
 */
export function mapDataType(type: string, format: string | null): FurnisherField['dataType'] {
  if (format && FORMAT_MAPPING[format]) {
    return FORMAT_MAPPING[format];
  }
  return TYPE_MAPPING[type] || 'string';
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string = 'field'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert a ParsedProperty to a FurnisherField
 */
export function propertyToField(prop: ParsedProperty): FurnisherField {
  return {
    id: generateId('field'),
    name: prop.name,
    displayName: toDisplayName(prop.name),
    description: prop.description || undefined,
    dataType: mapDataType(prop.type, prop.format),
    sampleValue: prop.example !== undefined ? String(prop.example) : undefined,
    required: prop.required,
    apiPath: prop.name,
  };
}

/**
 * Convert a ParsedSchema to an array of FurnisherFields
 */
export function schemaToFields(schema: ParsedSchema): FurnisherField[] {
  return schema.properties.map(propertyToField);
}

/**
 * Create a FurnisherDataSource from parsed OpenAPI data
 */
export function createDataSource(
  name: string,
  schemas: ParsedSchema[],
  spec: ParsedOpenApiSpec
): FurnisherDataSource {
  // Collect all unique fields from selected schemas
  const fieldsMap = new Map<string, FurnisherField>();

  for (const schema of schemas) {
    const fields = schemaToFields(schema);
    for (const field of fields) {
      // Use field name as key to avoid duplicates
      if (!fieldsMap.has(field.name)) {
        fieldsMap.set(field.name, field);
      }
    }
  }

  // Build DirectFeedConfig
  const directFeedConfig: DirectFeedConfig = {
    apiDocumentationUrl: spec.originalUrl,
    apiEndpoint: spec.servers[0]?.url || undefined,
  };

  return {
    id: generateId('source'),
    name,
    description: spec.info.description || `Imported from ${spec.info.title}`,
    type: 'direct-feed',
    directFeedConfig,
    fields: Array.from(fieldsMap.values()),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Group endpoints by their first tag
 */
export function groupEndpointsByTag(endpoints: ParsedEndpoint[]): Record<string, ParsedEndpoint[]> {
  const groups: Record<string, ParsedEndpoint[]> = {};

  for (const endpoint of endpoints) {
    const tag = endpoint.tags[0] || 'default';
    if (!groups[tag]) {
      groups[tag] = [];
    }
    groups[tag].push(endpoint);
  }

  return groups;
}

/**
 * Get method colour for display
 */
export function getMethodColour(method: string): string {
  const colours: Record<string, string> = {
    'GET': '#61affe',
    'POST': '#49cc90',
    'PUT': '#fca130',
    'PATCH': '#50e3c2',
    'DELETE': '#f93e3e',
    'OPTIONS': '#0d5aa7',
    'HEAD': '#9012fe',
  };
  return colours[method.toUpperCase()] || '#6b7280';
}

/**
 * Fetch and parse an OpenAPI spec from the server
 */
export async function fetchOpenApiSpec(url: string): Promise<ParsedOpenApiSpec> {
  const response = await fetch('/api/openapi/parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch OpenAPI spec');
  }

  return response.json();
}
