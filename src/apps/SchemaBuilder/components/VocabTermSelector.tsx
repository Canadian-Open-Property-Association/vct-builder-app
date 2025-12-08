/**
 * VocabTermSelector Component
 *
 * Dropdown for selecting vocabulary terms and complex types when editing properties
 * in JSON-LD Context mode.
 */

import { useVocabularyStore } from '../../../store/vocabularyStore';

interface VocabTermSelectorProps {
  selectedTermId?: string;
  selectedComplexTypeId?: string;
  onTermSelect: (termId: string | undefined) => void;
  onComplexTypeSelect: (typeId: string | undefined) => void;
  showComplexTypes?: boolean;
  disabled?: boolean;
}

export default function VocabTermSelector({
  selectedTermId,
  selectedComplexTypeId,
  onTermSelect,
  onComplexTypeSelect,
  showComplexTypes = true,
  disabled = false,
}: VocabTermSelectorProps) {
  const vocab = useVocabularyStore((state) => state.getSelectedVocab());
  const terms = useVocabularyStore((state) => state.getAllTerms());
  const complexTypes = useVocabularyStore((state) => state.getAllComplexTypes());

  if (!vocab) {
    return (
      <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
        No vocabulary loaded. Load a vocabulary in JSON-LD mode to select terms.
      </div>
    );
  }

  // Filter terms - don't show complex type terms in the simple term selector
  const simpleTerms = terms.filter((t) => !t.isComplexType);

  // Get selected term and type details
  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  const selectedType = complexTypes.find((t) => t.id === selectedComplexTypeId);

  return (
    <div className="space-y-4">
      {/* Vocabulary Term Selection */}
      <div>
        <label className="block text-sm font-medium text-purple-700 mb-1">
          Vocabulary Term
        </label>
        <select
          value={selectedTermId || ''}
          onChange={(e) => onTermSelect(e.target.value || undefined)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100"
        >
          <option value="">-- Select term (or use property name) --</option>
          <optgroup label="Simple Terms">
            {simpleTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label} ({term.id})
              </option>
            ))}
          </optgroup>
          {terms.filter((t) => t.isComplexType).length > 0 && (
            <optgroup label="Complex Type Terms">
              {terms
                .filter((t) => t.isComplexType)
                .map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.label} ({term.id})
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        {selectedTerm && (
          <div className="mt-1 text-xs text-purple-600">
            <span className="font-mono">{selectedTerm['@id']}</span>
            {selectedTerm.description && (
              <p className="mt-0.5 text-gray-500">{selectedTerm.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Complex Type Selection (for nested objects) */}
      {showComplexTypes && complexTypes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Complex Type
            <span className="font-normal text-gray-500 ml-1">(for nested objects)</span>
          </label>
          <select
            value={selectedComplexTypeId || ''}
            onChange={(e) => onComplexTypeSelect(e.target.value || undefined)}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:bg-gray-100"
          >
            <option value="">-- Not a complex type --</option>
            {complexTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label} ({type.id})
              </option>
            ))}
          </select>
          {selectedType && (
            <div className="mt-1 text-xs text-purple-600">
              <span className="font-mono">{selectedType['@id']}</span>
              {selectedType.description && (
                <p className="mt-0.5 text-gray-500">{selectedType.description}</p>
              )}
              {selectedType.allowedProperties.length > 0 && (
                <p className="mt-1 text-gray-500">
                  Allowed properties:{' '}
                  <span className="font-mono">
                    {selectedType.allowedProperties.join(', ')}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-purple-50 p-2 rounded">
        <strong>Tip:</strong> Select a vocabulary term to map this property to a semantic
        identifier. If left empty, the property name will be used as{' '}
        <code className="bg-purple-100 px-1">vocab:propertyName</code>.
      </div>
    </div>
  );
}
