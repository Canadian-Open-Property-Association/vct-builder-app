/**
 * Dictionary API Service
 *
 * Provides access to the Data Dictionary API for vocabulary data.
 * The Data Dictionary serves as the authoritative vocabulary source.
 *
 * NOTE: Function names preserved for backwards compatibility with Schema Builder
 * and DevTools components that depend on this API.
 */

import type { VocabType, VocabCategory, VocabDomain, VocabProperty } from '../types/dictionary';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

// Re-export types with old names for backwards compatibility
export type DataType = VocabType;
export type DataTypeCategory = VocabCategory;
export type DataTypeDomain = VocabDomain;
export type Property = VocabProperty;

/**
 * Fetch all domains from the dictionary
 */
export async function fetchDomains(): Promise<VocabDomain[]> {
  const response = await fetch(`${API_BASE}/api/dictionary/categories`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch domains: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.categories || [];
}

/**
 * Fetch all categories from the dictionary
 * @deprecated Use fetchDomains() instead
 */
export async function fetchCategories(): Promise<VocabCategory[]> {
  return fetchDomains();
}

/**
 * Fetch all VocabTypes (vocabulary terms)
 * Optionally filter by domain (or legacy category)
 */
export async function fetchDataTypes(domainOrCategory?: string): Promise<VocabType[]> {
  const url = new URL(`${API_BASE}/api/dictionary/vocab-types`, window.location.origin);
  if (domainOrCategory) {
    url.searchParams.set('domain', domainOrCategory);
  }

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vocab types: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single VocabType by ID with all properties
 */
export async function fetchDataType(id: string): Promise<VocabType> {
  const response = await fetch(`${API_BASE}/api/dictionary/vocab-types/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vocab type: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search VocabTypes and properties
 */
export async function searchCatalogue(query: string): Promise<{ dataTypes: VocabType[] }> {
  if (query.length < 2) {
    return { dataTypes: [] };
  }

  const url = new URL(`${API_BASE}/api/dictionary/search`, window.location.origin);
  url.searchParams.set('q', query);

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to search dictionary: ${response.statusText}`);
  }

  const data = await response.json();
  // Map vocabTypes to dataTypes for backwards compatibility
  return { dataTypes: data.vocabTypes || [] };
}

/**
 * Get dictionary statistics
 */
export async function fetchCatalogueStats(): Promise<{
  totalDataTypes: number;
  totalProperties: number;
  totalSources: number;
  totalCategories: number;
  totalDomains: number;
  categoryCounts: Record<string, number>;
  domainCounts: Record<string, number>;
}> {
  const response = await fetch(`${API_BASE}/api/dictionary/stats`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const data = await response.json();
  // Map new field names to old for backwards compatibility
  const domainCounts = data.domainCounts || data.categoryCounts || {};
  return {
    totalDataTypes: data.totalVocabTypes || 0,
    totalProperties: data.totalProperties || 0,
    totalSources: 0, // No longer tracked in dictionary
    totalCategories: Object.keys(domainCounts).length,
    totalDomains: Object.keys(domainCounts).length,
    categoryCounts: domainCounts, // Legacy alias
    domainCounts: domainCounts,
  };
}

/**
 * Convert a Dictionary Property to a Schema Builder property format
 */
export function cataloguePropertyToSchemaProperty(
  prop: VocabProperty,
  index: number
): {
  id: string;
  name: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
} {
  // Map dictionary value types to JSON Schema types
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    integer: 'integer',
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
