/**
 * Orbit API Type Definitions
 *
 * Defines the available Orbit APIs and their configurations.
 * All APIs share the same LOB ID and API Key, but each has its own Base URL.
 */

export const ORBIT_APIS = {
  lob: {
    key: 'lob',
    label: 'LOB API',
    description: 'Line of Business API',
  },
  registerSocket: {
    key: 'registerSocket',
    label: 'RegisterSocket API',
    description: 'WebSocket registration service',
  },
  connection: {
    key: 'connection',
    label: 'Connection API',
    description: 'Connection management service',
  },
  holder: {
    key: 'holder',
    label: 'Holder API',
    description: 'Wallet holder service',
  },
  verifier: {
    key: 'verifier',
    label: 'Verifier API',
    description: 'Credential verification service',
  },
  issuer: {
    key: 'issuer',
    label: 'Issuer API',
    description: 'Credential issuance service',
  },
  chat: {
    key: 'chat',
    label: 'Chat API',
    description: 'Chat messaging service',
  },
} as const;

export type OrbitApiType = keyof typeof ORBIT_APIS;

export const ORBIT_API_KEYS: OrbitApiType[] = Object.keys(ORBIT_APIS) as OrbitApiType[];

/**
 * Per-API settings definitions
 */
export interface VerifierSettings {
  autoVerify?: boolean;
}

export interface IssuerSettings {
  // Reserved for future settings
}

export type ApiSettings = VerifierSettings | IssuerSettings | Record<string, unknown>;

/**
 * Settings field definition for UI rendering
 */
export interface SettingField {
  key: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  label: string;
  description?: string;
  default?: boolean | string | number;
  options?: { value: string; label: string }[]; // For 'select' type
}

/**
 * Schema for settings per API type
 * Defines which settings are available for each API
 */
export const API_SETTINGS_SCHEMA: Record<OrbitApiType, { fields: SettingField[] }> = {
  verifier: {
    fields: [
      {
        key: 'autoVerify',
        type: 'boolean',
        label: 'Auto-verify proofs',
        description: 'Automatically verify proofs without manual review',
        default: true,
      },
    ],
  },
  issuer: { fields: [] },
  lob: { fields: [] },
  registerSocket: { fields: [] },
  connection: { fields: [] },
  holder: { fields: [] },
  chat: { fields: [] },
};

/**
 * Configuration for a single API endpoint
 */
export interface ApiConfig {
  baseUrl: string;
  settings?: ApiSettings;
}

/**
 * Map of all API configurations
 */
export type ApisConfig = Record<OrbitApiType, ApiConfig>;

/**
 * Full Orbit configuration status (returned from API, without API key)
 */
export interface OrbitConfigStatus {
  configured: boolean;
  lobId: string;
  hasApiKey: boolean;
  source: 'file' | 'environment' | null;
  configuredAt: string | null;
  configuredBy: string | null;
  apis: ApisConfig;
}

/**
 * Input for updating shared credentials
 */
export interface OrbitCredentialsInput {
  lobId: string;
  apiKey?: string; // Optional - if empty, keeps existing key
}

/**
 * Input for updating a single API's Base URL
 */
export interface ApiConfigInput {
  apiType: OrbitApiType;
  baseUrl: string;
}

/**
 * Result of testing an API connection
 */
export interface OrbitTestResult {
  success: boolean;
  message: string;
}

/**
 * Settings section types for sidebar navigation
 */
export type SettingsSection = 'orbit' | 'logs' | 'analytics';

/**
 * Get default empty APIs config
 */
export function getEmptyApisConfig(): ApisConfig {
  return {
    lob: { baseUrl: '', settings: {} },
    registerSocket: { baseUrl: '', settings: {} },
    connection: { baseUrl: '', settings: {} },
    holder: { baseUrl: '', settings: {} },
    verifier: { baseUrl: '', settings: {} },
    issuer: { baseUrl: '', settings: {} },
    chat: { baseUrl: '', settings: {} },
  };
}
