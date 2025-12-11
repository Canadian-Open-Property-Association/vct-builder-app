import { useState, useEffect } from 'react';
import { useDictionaryStore } from '../../../store/dictionaryStore';

interface VocabTypeFormProps {
  vocabTypeId: string | null;
  onClose: () => void;
}

// Domain options for multi-select
const DOMAIN_OPTIONS = [
  { value: 'property', label: 'Property', color: '#10B981' },
  { value: 'financial', label: 'Financial', color: '#3B82F6' },
  { value: 'identity', label: 'Identity', color: '#8B5CF6' },
  { value: 'employment', label: 'Employment', color: '#F59E0B' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

export default function VocabTypeForm({ vocabTypeId, onClose }: VocabTypeFormProps) {
  const { vocabTypes, domains, createVocabType, updateVocabType } = useDictionaryStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    domains: [] as string[],
  });

  const isEditing = !!vocabTypeId;

  // Use domains from store if available, otherwise fall back to defaults
  const availableDomains = domains.length > 0
    ? domains.map(d => ({ value: d.id, label: d.name, color: d.color || '#6B7280' }))
    : DOMAIN_OPTIONS;

  // Load existing vocab type if editing
  useEffect(() => {
    if (vocabTypeId) {
      const existing = vocabTypes.find(vt => vt.id === vocabTypeId);
      if (existing) {
        // Support both new domains array and legacy category
        const existingDomains = existing.domains && existing.domains.length > 0
          ? existing.domains
          : (existing.category ? [existing.category] : []);

        setFormData({
          id: existing.id,
          name: existing.name,
          description: existing.description || '',
          domains: existingDomains,
        });
      }
    }
  }, [vocabTypeId, vocabTypes]);

  // Auto-generate ID from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      id: isEditing ? prev.id : name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  // Toggle domain selection
  const toggleDomain = (domainId: string) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.includes(domainId)
        ? prev.domains.filter(d => d !== domainId)
        : [...prev.domains, domainId],
    }));
  };

  // Remove domain chip
  const removeDomain = (domainId: string) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d !== domainId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateVocabType(vocabTypeId, {
          name: formData.name,
          description: formData.description,
          domains: formData.domains,
        });
      } else {
        await createVocabType({
          id: formData.id,
          name: formData.name,
          description: formData.description,
          domains: formData.domains,
          properties: [],
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vocabulary type');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get domain label by ID
  const getDomainLabel = (domainId: string) => {
    const domain = availableDomains.find(d => d.value === domainId);
    return domain?.label || domainId;
  };

  // Get domain color by ID
  const getDomainColor = (domainId: string) => {
    const domain = availableDomains.find(d => d.value === domainId);
    return domain?.color || '#6B7280';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Vocabulary Type' : 'Add Vocabulary Type'}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Property Valuation"
                required
              />
            </div>

            {/* ID (auto-generated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-50"
                placeholder="property-valuation"
                disabled={isEditing}
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated from name</p>
            </div>

            {/* Domains (multi-select chips) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domains
              </label>

              {/* Selected domains as chips */}
              {formData.domains.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.domains.map(domainId => (
                    <span
                      key={domainId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getDomainColor(domainId) }}
                    >
                      {getDomainLabel(domainId)}
                      <button
                        type="button"
                        onClick={() => removeDomain(domainId)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Domain selector buttons */}
              <div className="flex flex-wrap gap-2">
                {availableDomains.map(domain => {
                  const isSelected = formData.domains.includes(domain.value);
                  return (
                    <button
                      key={domain.value}
                      type="button"
                      onClick={() => toggleDomain(domain.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        isSelected
                          ? 'border-transparent text-white'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'
                      }`}
                      style={isSelected ? { backgroundColor: domain.color } : {}}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {domain.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select one or more domains this vocabulary type belongs to
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what this vocabulary type represents..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
