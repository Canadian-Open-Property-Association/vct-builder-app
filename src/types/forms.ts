/**
 * Forms Builder Types
 *
 * Type definitions for the Forms Builder app.
 * Based on the VC-Forms-app schema structure.
 */

// Form field types
export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'verified-credential';

// Predicate operators for proof fields
export type PredicateOperator = '==' | '!=' | '>=' | '<=' | '>' | '<';

// Predicate configuration for verified-credential fields
export interface PredicateConfig {
  operator: PredicateOperator;
  value: number | boolean | string;
  // For dynamic values (future enhancement)
  valueSource?: 'static' | 'field_reference' | 'form_variable';
  referencedField?: string;
}

// Form field definition
export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string; // JSON key for this field - supports dot notation (e.g., "eligibility.residency_proof")
  description?: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  // For select/radio/checkbox fields
  options?: {
    label: string;
    value: string;
  }[];
  // For verified-credential fields
  credentialConfig?: {
    credentialLibraryId?: string;
    schemaId?: string;
    credDefId?: string;
    requiredAttributes?: string[];
    // Predicate rule for the proof
    predicate?: PredicateConfig;
    // Accepted issuers (DIDs or names)
    acceptedIssuers?: string[];
    // Which attribute path to verify
    attributePath?: string;
  };
}

// Form section (groups of fields)
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

// Form screen (info/success screens)
export interface FormScreen {
  title: string;
  content: string; // Markdown content
}

// Complete form schema (stored in JSONB)
export interface FormSchema {
  sections: FormSection[];
  infoScreen: FormScreen | null; // Shown before form
  successScreen: FormScreen; // Shown after submission
}

// Form status
export type FormStatus = 'draft' | 'published';

// Form mode
export type FormMode = 'simple' | 'advanced';

// Complete form object (matches database schema)
export interface Form {
  id: string;
  title: string;
  description: string;
  slug: string | null;
  schema: FormSchema;
  status: FormStatus;
  mode: FormMode;
  authorName: string | null;
  authorEmail: string | null;
  authorOrganization: string | null;
  githubUserId: string;
  githubUsername: string;
  clonedFrom: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// Form list item (subset for listing)
export interface FormListItem {
  id: string;
  title: string;
  description: string;
  status: FormStatus;
  mode: FormMode;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  slug: string | null;
}

// API request types
export interface CreateFormRequest {
  title: string;
  description?: string;
  schema?: FormSchema;
  mode?: FormMode;
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  schema?: FormSchema;
  mode?: FormMode;
}

// API response types
export interface PublishFormResponse extends Form {
  publicUrl: string;
}

// Field type labels for UI
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  date: 'Date',
  textarea: 'Long Text',
  select: 'Dropdown',
  radio: 'Radio Buttons',
  checkbox: 'Checkboxes',
  'verified-credential': 'Verifiable Credential',
};

// Default form schema for new forms
export function createDefaultFormSchema(): FormSchema {
  return {
    sections: [
      {
        id: crypto.randomUUID(),
        title: 'Section 1',
        fields: [],
      },
    ],
    infoScreen: null,
    successScreen: {
      title: 'Thank you!',
      content: 'Your form has been submitted successfully.',
    },
  };
}

// Create a new empty field
export function createEmptyField(type: FormFieldType = 'text'): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    name: '',
    required: false,
  };
}

// Create a new empty section
export function createEmptySection(): FormSection {
  return {
    id: crypto.randomUUID(),
    title: 'New Section',
    fields: [],
  };
}

// Predicate operator labels for UI
export const PREDICATE_OPERATOR_LABELS: Record<PredicateOperator, string> = {
  '==': 'equals',
  '!=': 'not equals',
  '>=': 'greater than or equal',
  '<=': 'less than or equal',
  '>': 'greater than',
  '<': 'less than',
};

/**
 * Unflatten a flat object with dot-notation keys into a nested object.
 * Example: { "eligibility.residency_proof": true } => { eligibility: { residency_proof: true } }
 */
export function unflattenFormData(flatData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flatData)) {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object' || current[k] === null) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

/**
 * Flatten a nested object into dot-notation keys.
 * Example: { eligibility: { residency_proof: true } } => { "eligibility.residency_proof": true }
 */
export function flattenFormData(
  nestedData: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(nestedData)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenFormData(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
