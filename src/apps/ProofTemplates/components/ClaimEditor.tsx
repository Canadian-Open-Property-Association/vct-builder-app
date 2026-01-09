/**
 * ClaimEditor Component
 *
 * Editor for a single claim within a proof template.
 * Allows configuring claim properties and constraints.
 */

import { useState } from 'react';
import {
  Claim,
  ClaimConstraint,
  ClaimConstraintType,
  PredicateConfig,
  PredicateOperator,
  LimitDisclosureConfig,
  FieldMatchConfig,
} from '../../../types/proofTemplate';

interface ClaimEditorProps {
  claim: Claim;
  onUpdate: (updates: Partial<Claim>) => void;
}

const PREDICATE_OPERATORS: { value: PredicateOperator; label: string }[] = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_or_equal', label: 'Greater or Equal (>=)' },
  { value: 'less_or_equal', label: 'Less or Equal (<=)' },
];

const PREDICATE_TYPES = [
  { value: 'integer', label: 'Integer' },
  { value: 'date', label: 'Date' },
  { value: 'string', label: 'String' },
];

export default function ClaimEditor({ claim, onUpdate }: ClaimEditorProps) {
  const [showAddConstraint, setShowAddConstraint] = useState(false);

  const handleAddConstraint = (type: ClaimConstraintType) => {
    const newConstraint: ClaimConstraint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      config: getDefaultConfig(type),
    };
    onUpdate({ constraints: [...claim.constraints, newConstraint] });
    setShowAddConstraint(false);
  };

  const handleUpdateConstraint = (constraintId: string, updates: Partial<ClaimConstraint>) => {
    onUpdate({
      constraints: claim.constraints.map((c) =>
        c.id === constraintId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleRemoveConstraint = (constraintId: string) => {
    onUpdate({
      constraints: claim.constraints.filter((c) => c.id !== constraintId),
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Claim Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={claim.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., dateOfBirth"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Internal identifier (camelCase)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={claim.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="e.g., Date of Birth"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Human-readable display name</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purpose
          </label>
          <textarea
            value={claim.purpose}
            onChange={(e) => onUpdate({ purpose: e.target.value })}
            placeholder="Why is this claim needed? (shown to credential holder)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credential Type
            </label>
            <input
              type="text"
              value={claim.credentialType}
              onChange={(e) => onUpdate({ credentialType: e.target.value })}
              placeholder="e.g., DriversLicenseCredential"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">The type of credential containing this claim</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Path
            </label>
            <input
              type="text"
              value={claim.fieldPath}
              onChange={(e) => onUpdate({ fieldPath: e.target.value })}
              placeholder="e.g., birthDate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Path to the field in credentialSubject</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="required"
            checked={claim.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="required" className="text-sm text-gray-700">
            This claim is required
          </label>
        </div>
      </div>

      {/* Constraints section */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Constraints</h3>
          <div className="relative">
            <button
              onClick={() => setShowAddConstraint(!showAddConstraint)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Constraint
            </button>

            {showAddConstraint && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 w-48">
                <button
                  onClick={() => handleAddConstraint('predicate')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium">Predicate</div>
                  <div className="text-xs text-gray-500">Compare values (e.g., age &gt;= 18)</div>
                </button>
                <button
                  onClick={() => handleAddConstraint('field_match')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium">Field Match</div>
                  <div className="text-xs text-gray-500">Require specific value(s)</div>
                </button>
                <button
                  onClick={() => handleAddConstraint('limit_disclosure')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium">Limit Disclosure</div>
                  <div className="text-xs text-gray-500">Control what's revealed</div>
                </button>
              </div>
            )}
          </div>
        </div>

        {claim.constraints.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm">No constraints added</p>
            <p className="text-xs mt-1">Add constraints to control how this claim is verified</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claim.constraints.map((constraint) => (
              <ConstraintEditor
                key={constraint.id}
                constraint={constraint}
                onUpdate={(updates) => handleUpdateConstraint(constraint.id, updates)}
                onRemove={() => handleRemoveConstraint(constraint.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getDefaultConfig(type: ClaimConstraintType): PredicateConfig | LimitDisclosureConfig | FieldMatchConfig {
  switch (type) {
    case 'predicate':
      return {
        operator: 'greater_or_equal',
        value: '',
        predicateType: 'integer',
      } as PredicateConfig;
    case 'limit_disclosure':
      return {
        selective: true,
        disclosedFields: [],
      } as LimitDisclosureConfig;
    case 'field_match':
      return {
        expectedValues: [],
        caseSensitive: true,
      } as FieldMatchConfig;
  }
}

interface ConstraintEditorProps {
  constraint: ClaimConstraint;
  onUpdate: (updates: Partial<ClaimConstraint>) => void;
  onRemove: () => void;
}

function ConstraintEditor({ constraint, onUpdate, onRemove }: ConstraintEditorProps) {
  const updateConfig = (updates: Partial<PredicateConfig | LimitDisclosureConfig | FieldMatchConfig>) => {
    onUpdate({ config: { ...constraint.config, ...updates } });
  };

  const getConstraintLabel = () => {
    switch (constraint.type) {
      case 'predicate': return 'Predicate';
      case 'limit_disclosure': return 'Limit Disclosure';
      case 'field_match': return 'Field Match';
    }
  };

  const getConstraintIcon = () => {
    switch (constraint.type) {
      case 'predicate':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'limit_disclosure':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        );
      case 'field_match':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {getConstraintIcon()}
          {getConstraintLabel()}
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Remove constraint"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {constraint.type === 'predicate' && (
        <PredicateConstraintEditor
          config={constraint.config as PredicateConfig}
          onUpdate={updateConfig}
        />
      )}

      {constraint.type === 'limit_disclosure' && (
        <LimitDisclosureConstraintEditor
          config={constraint.config as LimitDisclosureConfig}
          onUpdate={updateConfig}
        />
      )}

      {constraint.type === 'field_match' && (
        <FieldMatchConstraintEditor
          config={constraint.config as FieldMatchConfig}
          onUpdate={updateConfig}
        />
      )}
    </div>
  );
}

function PredicateConstraintEditor({
  config,
  onUpdate,
}: {
  config: PredicateConfig;
  onUpdate: (updates: Partial<PredicateConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={config.predicateType}
            onChange={(e) => onUpdate({ predicateType: e.target.value as 'integer' | 'date' | 'string' })}
            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            {PREDICATE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Operator</label>
          <select
            value={config.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as PredicateOperator })}
            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          >
            {PREDICATE_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Value</label>
          <input
            type={config.predicateType === 'date' ? 'date' : 'text'}
            value={config.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder={config.predicateType === 'integer' ? 'e.g., 18' : 'Value'}
            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Only the result (true/false) will be revealed, not the actual value.
      </p>
    </div>
  );
}

function LimitDisclosureConstraintEditor({
  config,
  onUpdate,
}: {
  config: LimitDisclosureConfig;
  onUpdate: (updates: Partial<LimitDisclosureConfig>) => void;
}) {
  const [newField, setNewField] = useState('');

  const addField = () => {
    if (!newField.trim()) return;
    onUpdate({ disclosedFields: [...config.disclosedFields, newField.trim()] });
    setNewField('');
  };

  const removeField = (index: number) => {
    onUpdate({ disclosedFields: config.disclosedFields.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="selective"
          checked={config.selective}
          onChange={(e) => onUpdate({ selective: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="selective" className="text-sm text-gray-700">
          Require selective disclosure
        </label>
      </div>

      {config.selective && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fields to disclose</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addField()}
              placeholder="e.g., firstName"
              className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={addField}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Add
            </button>
          </div>
          {config.disclosedFields.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.disclosedFields.map((field, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {field}
                  <button onClick={() => removeField(index)} className="hover:text-blue-900">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldMatchConstraintEditor({
  config,
  onUpdate,
}: {
  config: FieldMatchConfig;
  onUpdate: (updates: Partial<FieldMatchConfig>) => void;
}) {
  const [newValue, setNewValue] = useState('');

  const addValue = () => {
    if (!newValue.trim()) return;
    onUpdate({ expectedValues: [...config.expectedValues, newValue.trim()] });
    setNewValue('');
  };

  const removeValue = (index: number) => {
    onUpdate({ expectedValues: config.expectedValues.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Expected value(s)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addValue()}
            placeholder="Enter expected value"
            className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={addValue}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        {config.expectedValues.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {config.expectedValues.map((value, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
              >
                {value}
                <button onClick={() => removeValue(index)} className="hover:text-green-900">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {config.expectedValues.length > 1 ? 'Any of these values will match' : 'Exact value match required'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="caseSensitive"
          checked={config.caseSensitive}
          onChange={(e) => onUpdate({ caseSensitive: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="caseSensitive" className="text-sm text-gray-700">
          Case sensitive
        </label>
      </div>
    </div>
  );
}
