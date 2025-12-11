import { useHarmonizationStore } from '../../../store/harmonizationStore';

// Domain colors for badges
const DOMAIN_COLORS: Record<string, string> = {
  property: '#10B981',
  financial: '#3B82F6',
  identity: '#8B5CF6',
  employment: '#F59E0B',
  other: '#6B7280',
};

export default function VocabTypeList() {
  const {
    vocabTypes,
    selectedVocabTypeId,
    selectVocabType,
  } = useHarmonizationStore();

  // Get domains for a vocab type (supporting both new and legacy format)
  const getVocabTypeDomains = (vt: typeof vocabTypes[0]): string[] => {
    if (vt.domains && vt.domains.length > 0) {
      return vt.domains;
    }
    if (vt.category) {
      return [vt.category];
    }
    return [];
  };

  // Get domain color
  const getDomainColor = (domainId: string) => {
    return DOMAIN_COLORS[domainId] || '#6B7280';
  };

  // Get domain label
  const getDomainLabel = (domainId: string) => {
    return domainId.charAt(0).toUpperCase() + domainId.slice(1);
  };

  if (vocabTypes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>No vocabulary types found</p>
        <p className="text-xs mt-1">Add vocab types in Data Dictionary</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {vocabTypes.map((vocabType) => {
        const isSelected = selectedVocabTypeId === vocabType.id;
        const propertyCount = vocabType.properties?.length || 0;
        const vtDomains = getVocabTypeDomains(vocabType);

        return (
          <li
            key={vocabType.id}
            onClick={() => selectVocabType(isSelected ? null : vocabType.id)}
            className={`px-4 py-3 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-purple-50 border-r-2 border-purple-500'
                : 'hover:bg-gray-50 border-r-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {vocabType.name}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">
                    {propertyCount} propert{propertyCount !== 1 ? 'ies' : 'y'}
                  </span>
                  {/* Domain badges */}
                  {vtDomains.map(domainId => (
                    <span
                      key={domainId}
                      className="text-xs px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: getDomainColor(domainId) }}
                    >
                      {getDomainLabel(domainId)}
                    </span>
                  ))}
                </div>
              </div>

              {isSelected && (
                <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
