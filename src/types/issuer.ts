/**
 * Test Issuer Types
 *
 * Types for the Test Issuer app that issues test credentials via Orbit LOB.
 */

/**
 * Credential schema from the ecosystem VDR
 */
export interface CredentialSchema {
  id: string;
  name: string;
  description?: string;
  schemaUri: string;
  vctUri?: string;
  properties: SchemaProperty[];
  requiredProperties: string[];
  category: string;
  version: string;
  source: 'vdr' | 'manual';
  createdAt: string;
  updatedAt: string;
}

/**
 * Property definition from a schema
 */
export interface SchemaProperty {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string;
  description?: string;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  required: boolean;
}

/**
 * Credential offer for issuance
 */
export interface CredentialOffer {
  id: string;
  schemaId: string;
  schemaName: string;
  credentialData: Record<string, unknown>;
  status: CredentialOfferStatus;
  qrCodeUrl?: string;
  offerUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  errorMessage?: string;
}

export type CredentialOfferStatus =
  | 'pending'      // Offer created, awaiting wallet scan
  | 'scanned'      // QR code scanned by wallet
  | 'claimed'      // Credential successfully issued
  | 'expired'      // Offer expired without being claimed
  | 'failed';      // Issuance failed

/**
 * Orbit LOB configuration
 */
export interface OrbitConfig {
  baseUrl: string;
  tenantId: string;
  apiKey?: string;
  connected: boolean;
}

/**
 * Request to create a credential offer
 */
export interface CreateCredentialOfferRequest {
  schemaId: string;
  credentialData: Record<string, unknown>;
  expiresInMinutes?: number;
}

/**
 * Form field for credential data entry
 */
export interface CredentialFormField {
  property: SchemaProperty;
  value: unknown;
  error?: string;
}

/**
 * Credential catalog entry (imported from VDR)
 */
export interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  schemaUri: string;
  vctUri?: string;
  category: string;
  importedAt: string;
  schema?: CredentialSchema;
}

/**
 * Categories for organizing credentials
 */
export const CREDENTIAL_CATEGORIES = [
  { value: 'identity', label: 'Identity' },
  { value: 'financial', label: 'Financial' },
  { value: 'employment', label: 'Employment' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'government', label: 'Government' },
  { value: 'membership', label: 'Membership' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
] as const;

export type CredentialCategory = typeof CREDENTIAL_CATEGORIES[number]['value'];
