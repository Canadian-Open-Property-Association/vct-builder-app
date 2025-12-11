import { useDictionaryStore } from '../../../store/dictionaryStore';
import type { VocabType } from '../../../types/dictionary';

// Domain colors for badges
const DOMAIN_COLORS: Record<string, string> = {
  property: '#10B981',
  financial: '#3B82F6',
  identity: '#8B5CF6',
  employment: '#F59E0B',
  other: '#6B7280',
  untagged: '#9CA3AF',
};

export default function VocabTypeList() {
  const {
    selectedVocabType,
    selectVocabType,
    deleteVocabType,
    searchResults,
    domains,
    getFilteredVocabTypes,
    selectedDomainFilter,
    setDomainFilter,
  } = useDictionaryStore();

  // Get filtered vocab types (respects search and domain filter)
  const filteredTypes = getFilteredVocabTypes();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this vocabulary type?')) {
      await deleteVocabType(id);
    }
  };

  // Get domain color
  const getDomainColor = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.color || DOMAIN_COLORS[domainId] || '#6B7280';
  };

  // Get domain label
  const getDomainLabel = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || domainId.charAt(0).toUpperCase() + domainId.slice(1);
  };

  // Get domains for a vocab type (supporting both new and legacy format)
  const getVocabTypeDomains = (vt: VocabType): string[] => {
    if (vt.domains && vt.domains.length > 0) {
      return vt.domains;
    }
    if (vt.category) {
      return [vt.category];
    }
    return [];
  };

  const renderVocabTypeItem = (vt: VocabType) => {
    const isSelected = selectedVocabType?.id === vt.id;
    const vtDomains = getVocabTypeDomains(vt);

    return (
      <div
        key={vt.id}
        onClick={() => selectVocabType(vt.id)}
        className={`group px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
              {vt.name}
            </h3>
            {vt.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{vt.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Domain badges */}
              {vtDomains.map(domainId => (
                <span
                  key={domainId}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getDomainColor(domainId) }}
                >
                  {getDomainLabel(domainId)}
                </span>
              ))}
              {vtDomains.length === 0 && (
                <span className="text-xs text-gray-400 italic">No domain</span>
              )}
              <span className="text-xs text-gray-400 ml-1">
                {(vt.properties || []).length} properties
              </span>
            </div>
          </div>
          <button
            onClick={(e) => handleDelete(e, vt.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Available domains for filter chips
  const availableDomains = domains.length > 0
    ? domains
    : [
        { id: 'property', name: 'Property', order: 1 },
        { id: 'financial', name: 'Financial', order: 2 },
        { id: 'identity', name: 'Identity', order: 3 },
        { id: 'employment', name: 'Employment', order: 4 },
        { id: 'other', name: 'Other', order: 5 },
      ];

  return (
    <div>
      {/* Domain filter chips */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-1">Domains:</span>
          <button
            onClick={() => setDomainFilter(null)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              selectedDomainFilter === null
                ? 'bg-gray-700 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {availableDomains.sort((a, b) => a.order - b.order).map(domain => {
            const isActive = selectedDomainFilter === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setDomainFilter(isActive ? null : domain.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: getDomainColor(domain.id) } : {}}
              >
                {domain.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      {(searchResults || selectedDomainFilter) && (
        <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-200">
          <span className="text-xs text-gray-500">
            {filteredTypes.length} result{filteredTypes.length !== 1 ? 's' : ''}
            {selectedDomainFilter && ` in ${getDomainLabel(selectedDomainFilter)}`}
          </span>
        </div>
      )}

      {/* Vocab types list */}
      {filteredTypes.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm">
            {searchResults !== null || selectedDomainFilter
              ? 'No vocabulary types found'
              : 'No vocabulary types yet'
            }
          </p>
          {!searchResults && !selectedDomainFilter && (
            <p className="text-xs mt-1">Click "Add Vocab Type" to create one</p>
          )}
        </div>
      ) : (
        filteredTypes.map(renderVocabTypeItem)
      )}
    </div>
  );
}
