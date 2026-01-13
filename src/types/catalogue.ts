/**
 * Credential Catalogue Types
 *
 * Type definitions for imported external AnonCreds credentials
 * used in verification testing.
 */

/**
 * Log entry for a single Orbit API operation
 */
export interface OrbitOperationLog {
  /** Whether the operation succeeded */
  success: boolean;

  /** Timestamp of the operation */
  timestamp: string;

  /** The API endpoint URL that was called */
  requestUrl: string;

  /** The payload sent to Orbit */
  requestPayload: Record<string, unknown>;

  /** HTTP status code from the response */
  statusCode?: number;

  /** The raw response body from Orbit */
  responseBody?: string;

  /** Parsed response data (if successful) */
  responseData?: Record<string, unknown>;

  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * An imported credential from an external ecosystem
 */
export interface CatalogueCredential {
  /** Unique identifier (UUID) */
  id: string;

  /** Schema name */
  name: string;

  /** Schema version */
  version: string;

  // === AnonCreds Identifiers ===

  /** Ledger schema ID (e.g., "Th7MpTaRZVRYnPiabds81Y:2:Person:0.1") */
  schemaId: string;

  /** Ledger credential definition ID */
  credDefId: string;

  // === Issuer Information ===

  /** Issuer's DID */
  issuerDid: string;

  /** Optional display name for the issuer */
  issuerName?: string;

  /** Optional reference to an entity ID in Entity Manager */
  issuerEntityId?: string;

  // === Schema Details ===

  /** List of attribute names from the schema */
  attributes: string[];

  // === Orbit Integration ===

  /** ID returned from Orbit schema store (POST /schema/store) */
  orbitSchemaId?: string;

  /** ID returned from Orbit credential definition store */
  orbitCredDefId?: string;

  /** Log entry for a single Orbit API call */
  /** Schema import operation log */
  orbitSchemaLog?: OrbitOperationLog;

  /** Credential definition import operation log */
  orbitCredDefLog?: OrbitOperationLog;

  /** @deprecated Legacy error message - use orbitSchemaLog/orbitCredDefLog instead */
  orbitRegistrationError?: string;

  /** @deprecated Legacy error details - use orbitSchemaLog/orbitCredDefLog instead */
  orbitRegistrationErrorDetails?: {
    /** Error summary message */
    message: string;
    /** HTTP status code */
    statusCode?: number;
    /** The API endpoint URL that was called */
    requestUrl?: string;
    /** The payload sent to Orbit */
    requestPayload?: Record<string, unknown>;
    /** The raw response body from Orbit */
    responseBody?: string;
    /** Which step failed: 'schema' or 'creddef' */
    failedStep?: 'schema' | 'creddef';
  };

  // === Metadata ===

  /** Ecosystem tag (e.g., "BC Digital Trust", "Sovrin") */
  ecosystemTag: string;

  /** Original IndyScan URL for the schema */
  schemaSourceUrl: string;

  /** Original IndyScan URL for the credential definition */
  credDefSourceUrl: string;

  /** Ledger identifier (e.g., "candy:dev", "sovrin:staging") */
  ledger: string;

  /** Usage restriction - imported credentials can only be used for verification */
  usageType: 'verification-only';

  // === Timestamps ===

  /** When the credential was imported */
  importedAt: string;

  /** Who imported the credential (user email or name) */
  importedBy: string;

  // === Clone for Issuance ===

  /** Whether this credential has been cloned for issuance */
  clonedAt?: string;

  /** Who initiated the clone */
  clonedBy?: string;

  /** Target ledger where the clone was created (e.g., "bcovrin:test") */
  clonedLedger?: string;

  /** New schema ID on the target ledger */
  clonedSchemaId?: string;

  /** New credential definition ID on the target ledger */
  clonedCredDefId?: string;

  /** Orbit schema ID for the cloned version */
  clonedOrbitSchemaId?: number;

  /** Orbit credential definition ID for the cloned version */
  clonedOrbitCredDefId?: number;

  /** Log entry for cloned schema creation in Orbit */
  clonedOrbitSchemaLog?: OrbitOperationLog;

  /** Log entry for cloned cred def creation in Orbit */
  clonedOrbitCredDefLog?: OrbitOperationLog;

  // === Test Issuer Integration ===

  /** Whether this cloned credential is enabled for issuance in Test Issuer */
  enabledForIssuance?: boolean;
}

/**
 * Credential available for issuance in Test Issuer
 * Derived from cloned CatalogueCredentials
 */
export interface IssuableCredential {
  /** Catalogue credential ID */
  id: string;

  /** Schema name */
  name: string;

  /** Schema version */
  version: string;

  /** List of attribute names */
  attributes: string[];

  /** Ecosystem tag for display */
  ecosystemTag: string;

  /** Orbit credential definition ID (required for Orbit API) */
  clonedOrbitCredDefId: number;

  /** Orbit schema ID */
  clonedOrbitSchemaId: number;

  /** Ledger credential definition ID */
  clonedCredDefId: string;

  /** Whether currently enabled for Test Issuer */
  enabled: boolean;
}

/**
 * Ecosystem tag for categorizing imported credentials
 */
export interface EcosystemTag {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;
}

/**
 * Default ecosystem tags (can be deleted by user)
 */
export const DEFAULT_ECOSYSTEM_TAGS: EcosystemTag[] = [
  { id: 'bc-digital-trust', name: 'BC Digital Trust' },
  { id: 'sovrin', name: 'Sovrin' },
  { id: 'candy', name: 'CANdy' },
  { id: 'indicio', name: 'Indicio' },
  { id: 'other', name: 'Other' },
];

/**
 * Data parsed from an IndyScan schema page
 */
export interface ParsedSchemaData {
  /** Schema name */
  name: string;

  /** Schema version */
  version: string;

  /** Full schema ID */
  schemaId: string;

  /** Issuer DID */
  issuerDid: string;

  /** List of attribute names */
  attributes: string[];

  /** Ledger identifier (e.g., "candy:dev") */
  ledger: string;

  /** Sequence number on ledger */
  seqNo?: number;
}

/**
 * Data parsed from an IndyScan credential definition page
 */
export interface ParsedCredDefData {
  /** Full credential definition ID */
  credDefId: string;

  /** Schema ID this cred def references */
  schemaId: string;

  /** Issuer DID */
  issuerDid: string;

  /** Tag for the credential definition */
  tag: string;

  /** Signature type (usually "CL") */
  signatureType: string;

  /** Ledger identifier */
  ledger: string;

  /** Sequence number on ledger */
  seqNo?: number;
}

/**
 * Request to import a new credential
 */
export interface ImportCredentialRequest {
  /** Parsed schema data */
  schemaData: ParsedSchemaData;

  /** Parsed credential definition data */
  credDefData: ParsedCredDefData;

  /** Selected ecosystem tag ID */
  ecosystemTagId: string;

  /** Optional custom issuer name */
  issuerName?: string;

  /** Optional reference to an entity ID in Entity Manager */
  issuerEntityId?: string;

  /** Schema source URL */
  schemaSourceUrl: string;

  /** Credential definition source URL */
  credDefSourceUrl: string;

  /** Whether to register with Orbit */
  registerWithOrbit?: boolean;
}

/**
 * Detailed error information for debugging failed imports
 */
export interface ImportErrorDetails {
  /** Error message */
  message: string;

  /** HTTP status code if applicable */
  statusCode?: number;

  /** The URL that was called */
  requestUrl?: string;

  /** HTTP method used */
  requestMethod?: string;

  /** Request payload (sanitized - no secrets) */
  requestPayload?: Record<string, unknown>;

  /** Response body from the server */
  responseBody?: string;

  /** Timestamp of the error */
  timestamp: string;

  /** Actual Orbit API operation log (for clone errors - the failed operation) */
  orbitLog?: OrbitOperationLog;

  /** Schema operation log (for clone errors - may be successful even if clone failed at cred def step) */
  schemaLog?: OrbitOperationLog;

  /** Cred def operation log (for clone errors) */
  credDefLog?: OrbitOperationLog;
}

/**
 * Response from parsing an IndyScan URL
 */
export interface ParseIndyScanResponse {
  success: boolean;
  type: 'schema' | 'creddef';
  data?: ParsedSchemaData | ParsedCredDefData;
  error?: string;
}

/**
 * Ledger configuration for IndyScan
 */
export interface LedgerConfig {
  /** Ledger identifier (e.g., "candy:dev") */
  id: string;

  /** Display name */
  name: string;

  /** IndyScan base URL */
  indyscanUrl: string;
}

/**
 * Response from cloning a credential for issuance
 */
export interface CloneForIssuanceResponse {
  /** Whether the clone was successful */
  success: boolean;

  /** New schema ID on the target ledger */
  clonedSchemaId?: string;

  /** New credential definition ID on the target ledger */
  clonedCredDefId?: string;

  /** Orbit schema ID for the cloned version */
  clonedOrbitSchemaId?: number;

  /** Orbit credential definition ID for the cloned version */
  clonedOrbitCredDefId?: number;

  /** Target ledger where the clone was created */
  clonedLedger?: string;

  /** Log entry for schema creation */
  schemaLog?: OrbitOperationLog;

  /** Log entry for cred def creation */
  credDefLog?: OrbitOperationLog;

  /** Error message if failed */
  error?: string;
}

/**
 * Known ledgers with IndyScan explorers
 */
export const KNOWN_LEDGERS: LedgerConfig[] = [
  {
    id: 'candy:dev',
    name: 'CANdy Dev',
    indyscanUrl: 'https://candyscan.idlab.org',
  },
  {
    id: 'candy:test',
    name: 'CANdy Test',
    indyscanUrl: 'https://candyscan.idlab.org',
  },
  {
    id: 'sovrin:staging',
    name: 'Sovrin Staging',
    indyscanUrl: 'https://indyscan.io',
  },
  {
    id: 'sovrin:builder',
    name: 'Sovrin Builder',
    indyscanUrl: 'https://indyscan.io',
  },
  {
    id: 'sovrin:main',
    name: 'Sovrin Main',
    indyscanUrl: 'https://indyscan.io',
  },
  {
    id: 'bcovrin:test',
    name: 'BCovrin Test',
    indyscanUrl: 'http://test.bcovrin.vonx.io',
  },
];
