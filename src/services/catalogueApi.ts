/**
 * Catalogue API Service
 *
 * Provides access to the Data Catalogue API for vocabulary data.
 * The Data Catalogue serves as the authoritative vocabulary source.
 */

import { DataType, DataTypeCategory, Property } from '../types/catalogue';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

/**
 * Fetch all categories from the catalogue
 */
export async function fetchCategories(): Promise<DataTypeCategory[]> {
  const response = await fetch(`${API_BASE}/api/catalogue/categories`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all DataTypes (vocabulary terms)
 * Optionally filter by category
 */
export async function fetchDataTypes(category?: string): Promise<DataType[]> {
  const url = new URL(`${API_BASE}/api/catalogue/data-types`, window.location.origin);
  if (category) {
    url.searchParams.set('category', category);
  }

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data types: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single DataType by ID with all properties
 */
export async function fetchDataType(id: string): Promise<DataType> {
  const response = await fetch(`${API_BASE}/api/catalogue/data-types/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data type: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search DataTypes and properties
 */
export async function searchCatalogue(query: string): Promise<{ dataTypes: DataType[] }> {
  if (query.length < 2) {
    return { dataTypes: [] };
  }

  const url = new URL(`${API_BASE}/api/catalogue/search`, window.location.origin);
  url.searchParams.set('q', query);

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to search catalogue: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get catalogue statistics
 */
export async function fetchCatalogueStats(): Promise<{
  totalDataTypes: number;
  totalProperties: number;
  totalSources: number;
  totalCategories: number;
  categoryCounts: Record<string, number>;
}> {
  const response = await fetch(`${API_BASE}/api/catalogue/stats`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convert a Catalogue Property to a Schema Builder property format
 */
export function cataloguePropertyToSchemaProperty(
  prop: Property,
  index: number
): {
  id: string;
  name: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
} {
  // Map catalogue value types to JSON Schema types
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'string',
    datetime: 'string',
    array: 'array',
    object: 'object',
    currency: 'number',
    url: 'string',
    email: 'string',
    phone: 'string',
  };

  return {
    id: `prop-${Date.now()}-${index}`,
    name: prop.name, // Use canonical snake_case name
    title: prop.displayName,
    description: prop.description || '',
    type: typeMap[prop.valueType] || 'string',
    required: prop.required,
  };
}
