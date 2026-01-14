/**
 * Proof Template Types
 *
 * Type definitions for the Proof Templates Builder app.
 * Proof templates define what claims are required for verification,
 * output as DIF Presentation Exchange format.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * A Proof Template defines what verified claims are required
 * for a specific use case (e.g., age verification, income proof)
 */
export interface ProofTemplate {
  id: string;
  name: string;
  description: string;
  purpose: string; // What this template verifies (shown to holder)
  claims: Claim[];
  format: ProofFormat;
  metadata: ProofTemplateMetadata;
  status: ProofTemplateStatus;
  vdrUri?: string; // URI after publishing to VDR
  createdAt: string;
  updatedAt: string;
}

/**
 * A Claim represents a single piece of verifiable information
 * that must be presented (e.g., "Date of Birth", "Annual Income")
 */
export interface Claim {
  id: string;
  name: string; // Internal identifier (e.g., "dateOfBirth")
  label: string; // Human-readable label (e.g., "Date of Birth")
  purpose: string; // Why this claim is needed
  credentialType: string; // Which credential type contains this claim
  fieldPath: string; // JSON path to the field in the credential
  constraints: ClaimConstraint[];
  required: boolean;
}

/**
 * Constraints that can be applied to a claim
 */
export interface ClaimConstraint {
  id: string;
  type: ClaimConstraintType;
  config: PredicateConfig | LimitDisclosureConfig | FieldMatchConfig;
}

export type ClaimConstraintType = 'predicate' | 'limit_disclosure' | 'field_match';

/**
 * Predicate constraint: Compare a value (e.g., age >= 18)
 */
export interface PredicateConfig {
  operator: PredicateOperator;
  value: string | number;
  // For predicates, only the result (true/false) is revealed, not the actual value
  predicateType: 'integer' | 'date' | 'string';
}

export type PredicateOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal';

/**
 * Limit disclosure: Only reveal specific fields
 */
export interface LimitDisclosureConfig {
  // If true, only explicitly requested fields are revealed
  selective: boolean;
  // List of field paths that should be disclosed
  disclosedFields: string[];
}

/**
 * Field match: Exact value requirement
 */
export interface FieldMatchConfig {
  // Expected value(s) - can be exact match or one of set
  expectedValues: string[];
  caseSensitive: boolean;
}

// ============================================================================
// Metadata & Status
// ============================================================================

export interface ProofTemplateMetadata {
  category: string; // e.g., "identity", "financial", "employment"
  version: string; // Semantic version
  author: string; // GitHub username or org
  tags: string[]; // Searchable tags
}

export type ProofTemplateStatus = 'draft' | 'published';

export type ProofFormat = 'presentation-exchange'; // Future: add more formats

// ============================================================================
// List Item (for dashboard view)
// ============================================================================

export interface ProofTemplateListItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ProofTemplateStatus;
  claimCount: number;
  vdrUri?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateProofTemplateRequest {
  name: string;
  description?: string;
  purpose?: string;
  category?: string;
}

export interface UpdateProofTemplateRequest {
  name?: string;
  description?: string;
  purpose?: string;
  claims?: Claim[];
  metadata?: Partial<ProofTemplateMetadata>;
}

export interface PublishProofTemplateRequest {
  templateId: string;
  commitMessage?: string;
}

export interface PublishProofTemplateResponse {
  success: boolean;
  prUrl?: string;
  vdrUri?: string;
  error?: string;
}

// ============================================================================
// Presentation Exchange Output Types (DIF PE v2.0)
// ============================================================================

/**
 * DIF Presentation Exchange Presentation Definition
 * https://identity.foundation/presentation-exchange/spec/v2.0.0/
 */
export interface PresentationDefinition {
  id: string;
  name?: string;
  purpose?: string;
  format?: PresentationFormat;
  input_descriptors: InputDescriptor[];
}

export interface PresentationFormat {
  jwt_vc?: { alg: string[] };
  jwt_vp?: { alg: string[] };
  ldp_vc?: { proof_type: string[] };
  ldp_vp?: { proof_type: string[] };
}

export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  constraints: InputDescriptorConstraints;
}

export interface InputDescriptorConstraints {
  limit_disclosure?: 'required' | 'preferred';
  fields?: InputDescriptorField[];
}

export interface InputDescriptorField {
  id?: string;
  path: string[];
  purpose?: string;
  filter?: InputDescriptorFilter;
  predicate?: 'required' | 'preferred';
}

export interface InputDescriptorFilter {
  type?: string;
  const?: string | number | boolean;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  not?: { const: string | number | boolean };
  contains?: { const: string };
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert a ProofTemplate to DIF Presentation Exchange format
 */
export function toPresentationDefinition(template: ProofTemplate): PresentationDefinition {
  return {
    id: template.id,
    name: template.name,
    purpose: template.purpose,
    format: {
      jwt_vc: { alg: ['ES256', 'ES384'] },
      jwt_vp: { alg: ['ES256', 'ES384'] },
    },
    input_descriptors: template.claims.map((claim) => claimToInputDescriptor(claim)),
  };
}

function claimToInputDescriptor(claim: Claim): InputDescriptor {
  const fields: InputDescriptorField[] = [
    {
      id: claim.id,
      path: [`$.credentialSubject.${claim.fieldPath}`, `$.vc.credentialSubject.${claim.fieldPath}`],
      purpose: claim.purpose,
      ...buildFieldConstraints(claim),
    },
  ];

  // Add credential type filter
  fields.push({
    path: ['$.type', '$.vc.type'],
    filter: {
      type: 'array',
      contains: { const: claim.credentialType },
    } as InputDescriptorFilter,
  });

  const constraints: InputDescriptorConstraints = {
    fields,
  };

  // Check for limit_disclosure constraints
  const limitDisclosure = claim.constraints.find((c) => c.type === 'limit_disclosure');
  if (limitDisclosure) {
    constraints.limit_disclosure = 'required';
  }

  return {
    id: claim.id,
    name: claim.label,
    purpose: claim.purpose,
    constraints,
  };
}

function buildFieldConstraints(claim: Claim): Partial<InputDescriptorField> {
  const result: Partial<InputDescriptorField> = {};

  for (const constraint of claim.constraints) {
    if (constraint.type === 'predicate') {
      result.predicate = 'required';
      const config = constraint.config as PredicateConfig;
      result.filter = buildPredicateFilter(config);
    } else if (constraint.type === 'field_match') {
      const config = constraint.config as FieldMatchConfig;
      if (config.expectedValues.length === 1) {
        result.filter = { const: config.expectedValues[0] };
      } else {
        result.filter = { enum: config.expectedValues };
      }
    }
  }

  return result;
}

function buildPredicateFilter(config: PredicateConfig): InputDescriptorFilter {
  const filter: InputDescriptorFilter = {};

  switch (config.operator) {
    case 'equals':
      filter.const = config.value;
      break;
    case 'not_equals':
      filter.not = { const: config.value };
      break;
    case 'greater_than':
      filter.exclusiveMinimum = Number(config.value);
      break;
    case 'less_than':
      filter.exclusiveMaximum = Number(config.value);
      break;
    case 'greater_or_equal':
      filter.minimum = Number(config.value);
      break;
    case 'less_or_equal':
      filter.maximum = Number(config.value);
      break;
  }

  if (config.predicateType === 'date') {
    filter.format = 'date';
  } else if (config.predicateType === 'integer') {
    filter.type = 'integer';
  }

  return filter;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PROOF_TEMPLATE: Omit<ProofTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  purpose: '',
  claims: [],
  format: 'presentation-exchange',
  metadata: {
    category: 'general',
    version: '1.0.0',
    author: '',
    tags: [],
  },
  status: 'draft',
};

export const DEFAULT_CLAIM: Omit<Claim, 'id'> = {
  name: '',
  label: '',
  purpose: '',
  credentialType: '',
  fieldPath: '',
  constraints: [],
  required: true,
};

export const DEFAULT_PROOF_TEMPLATE_CATEGORIES = [
  { value: 'identity', label: 'Identity Verification' },
  { value: 'financial', label: 'Financial' },
  { value: 'employment', label: 'Employment' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'government', label: 'Government' },
  { value: 'membership', label: 'Membership' },
  { value: 'general', label: 'General' },
] as const;

// Template type for settings management
export interface ProofTemplateType {
  id: string;
  name: string;
}

// For backwards compatibility
export const PROOF_TEMPLATE_CATEGORIES = DEFAULT_PROOF_TEMPLATE_CATEGORIES;
