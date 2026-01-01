import { useEffect, useRef } from 'react';
import { useEntityStore } from '../../../store/entityStore';
import { useFurnisherSettingsStore } from '../../../store/furnisherSettingsStore';
import { useLogoStore } from '../../../store/logoStore';
import type { Entity } from '../../../types/entity';

interface EntityListProps {
  onAddEntity: () => void;
  // Optional props for external control (used by MapView)
  externalEntities?: Entity[];
  externalSearchQuery?: string;
  onExternalSearchChange?: (query: string) => void;
  externalSelectedId?: string | null;
  onExternalSelectEntity?: (id: string | null) => void;
  filterLabel?: string;
  onClearFilter?: () => void;
  headerContent?: React.ReactNode;
}

export default function EntityList({
  onAddEntity,
  externalEntities,
  externalSearchQuery,
  onExternalSearchChange,
  externalSelectedId,
  onExternalSelectEntity,
  filterLabel,
  onClearFilter,
  headerContent,
}: EntityListProps) {
  const { entities: storeEntities, selectedEntity: storeSelectedEntity, selectEntity: storeSelectEntity, searchQuery: storeSearchQuery, setSearchQuery: storeSetSearchQuery } = useEntityStore();
  const { settings } = useFurnisherSettingsStore();

  // Use external props if provided, otherwise use store
  const isExternallyControlled = externalEntities !== undefined;
  const entities = externalEntities ?? storeEntities;
  const searchQuery = externalSearchQuery ?? storeSearchQuery;
  const setSearchQuery = onExternalSearchChange ?? storeSetSearchQuery;
  const selectedEntityId = isExternallyControlled ? externalSelectedId : storeSelectedEntity?.id;
  const handleSelectEntity = isExternallyControlled
    ? (id: string) => onExternalSelectEntity?.(selectedEntityId === id ? null : id)
    : (id: string) => storeSelectEntity(id);
  const { fetchLogos, getLogoUrl } = useLogoStore();
  const entityRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Get label for data provider type
  const getDataTypeLabel = (typeId: string) => {
    if (settings?.dataProviderTypes) {
      const found = settings.dataProviderTypes.find(t => t.id === typeId);
      if (found) return found.label;
    }
    return typeId;
  };

  // Get label for entity type
  const getEntityTypeLabel = (typeId: string) => {
    if (settings?.entityTypes) {
      const found = settings.entityTypes.find(t => t.id === typeId);
      if (found) return found.label;
    }
    return typeId;
  };

  // Fetch logos from shared store
  useEffect(() => {
    fetchLogos();
  }, [entities, fetchLogos]);

  // Auto-scroll to selected entity when it changes
  useEffect(() => {
    if (selectedEntityId && entityRefs.current[selectedEntityId]) {
      const element = entityRefs.current[selectedEntityId];
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntityId]);

  // Get logo URL for an entity - prefer local asset, fall back to entity.logoUri
  const getEntityLogo = (entity: Entity): string | null => {
    return getLogoUrl(entity.id, entity.logoUri);
  };

  // Filter entities by search query and sort with network-operator first, then alphabetically
  const filteredEntities = entities
    .filter((entity) => {
      if (!searchQuery || searchQuery.length < 2) return true;
      const query = searchQuery.toLowerCase();
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.description?.toLowerCase().includes(query) ||
        entity.id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Network operator always comes first
      const aIsOperator = a.entityTypes?.includes('network-operator');
      const bIsOperator = b.entityTypes?.includes('network-operator');
      if (aIsOperator && !bIsOperator) return -1;
      if (!aIsOperator && bIsOperator) return 1;
      // Otherwise sort alphabetically
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Button */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            {filteredEntities.length} {filteredEntities.length === 1 ? 'entity' : 'entities'}
            {searchQuery && entities.length !== filteredEntities.length && (
              <span className="text-gray-400"> of {entities.length}</span>
            )}
          </span>
          <button
            onClick={onAddEntity}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Add new entity"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {/* Filter indicator (e.g., province filter from MapView) */}
        {filterLabel && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtered to:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
              {filterLabel}
              {onClearFilter && (
                <button
                  onClick={onClearFilter}
                  className="hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          </div>
        )}
        {/* Optional header content */}
        {headerContent}
      </div>

      {/* Empty state */}
      {filteredEntities.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm font-medium">No entities found</p>
            {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" ref={listContainerRef}>
          {/* Entity list - matches MapView styling */}
          <div>
            {filteredEntities.map((entity, index) => {
              const logoUrl = getEntityLogo(entity);
              const isSelected = selectedEntityId === entity.id;
              const isNetworkOperator = entity.entityTypes?.includes('network-operator');
              const previousEntity = index > 0 ? filteredEntities[index - 1] : null;
              const showSeparator = previousEntity?.entityTypes?.includes('network-operator') && !isNetworkOperator;

              return (
                <div key={entity.id}>
                  {/* Separator after network operator */}
                  {showSeparator && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-y border-gray-200">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Furnishers</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                  )}
                  <div
                    ref={(el) => { entityRefs.current[entity.id] = el; }}
                    onClick={() => handleSelectEntity(entity.id)}
                    className={`group p-3 cursor-pointer transition-colors border-l-4 ${
                      isNetworkOperator
                        ? isSelected
                          ? 'bg-amber-50 border-l-amber-500'
                          : 'bg-amber-50/50 hover:bg-amber-50 border-l-amber-400'
                        : isSelected
                          ? 'bg-blue-50 border-l-blue-500'
                          : 'hover:bg-gray-50 border-l-transparent'
                    }`}
                    style={isSelected && entity.primaryColor && !isNetworkOperator ? { borderLeftColor: entity.primaryColor } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      {/* Logo or initials */}
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt=""
                          className={`w-8 h-8 object-contain rounded flex-shrink-0 ${isNetworkOperator ? 'bg-amber-100' : 'bg-gray-50'}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 ${logoUrl ? 'hidden' : ''} ${isNetworkOperator ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                        {entity.name.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Name and badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm truncate">{entity.name}</span>
                          {isNetworkOperator && (
                            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-medium">
                              Network Operator
                            </span>
                          )}
                        </div>
                        {/* Entity types and data provider type badges */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {entity.entityTypes?.filter(t => t !== 'network-operator').slice(0, 2).map(typeId => (
                            <span key={typeId} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                              {getEntityTypeLabel(typeId)}
                            </span>
                          ))}
                          {(entity.entityTypes?.filter(t => t !== 'network-operator').length || 0) > 2 && (
                            <span className="text-xs text-gray-400">
                              +{(entity.entityTypes?.filter(t => t !== 'network-operator').length || 0) - 2} types
                            </span>
                          )}
                          {entity.dataProviderTypes?.slice(0, 2).map(type => (
                            <span
                              key={type}
                              className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded"
                            >
                              {getDataTypeLabel(type)}
                            </span>
                          ))}
                          {(entity.dataProviderTypes?.length || 0) > 2 && (
                            <span className="text-xs text-gray-400">
                              +{(entity.dataProviderTypes?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
