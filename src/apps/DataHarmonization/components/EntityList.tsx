import { useHarmonizationStore } from '../../../store/harmonizationStore';

function resolveLogoUri(logoUri: string | undefined): string | undefined {
  if (!logoUri) return undefined;
  if (logoUri.startsWith('http')) return logoUri;
  if (logoUri.startsWith('/')) return logoUri;
  return `/assets/${logoUri}`;
}

export default function EntityList() {
  const {
    selectedEntityId,
    selectEntity,
    getDataFurnishers,
  } = useHarmonizationStore();

  const furnishers = getDataFurnishers();

  if (furnishers.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p>No data furnishers found</p>
        <p className="text-xs mt-1">Add furnisher entities in Entity Manager</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {furnishers.map((entity) => {
        const isSelected = selectedEntityId === entity.id;
        const fieldCount = entity.dataSchema?.fields?.length || 0;

        return (
          <li
            key={entity.id}
            onClick={() => selectEntity(isSelected ? null : entity.id)}
            className={`px-4 py-3 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-purple-50 border-l-2 border-purple-500'
                : 'hover:bg-gray-50 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-gray-200"
              >
                {entity.logoUri ? (
                  <img
                    src={resolveLogoUri(entity.logoUri)}
                    alt={entity.name}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      // Hide broken images and show fallback
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span
                    className="text-xs font-bold"
                    style={{ color: entity.primaryColor || '#6b7280' }}
                  >
                    {entity.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {entity.name}
                </div>
                <div className="text-xs text-gray-500">
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''}
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
