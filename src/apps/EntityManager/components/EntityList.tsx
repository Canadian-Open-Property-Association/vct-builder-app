import { useState, useEffect, useRef } from 'react';
import { useEntityStore } from '../../../store/entityStore';
import { useFurnisherSettingsStore } from '../../../store/furnisherSettingsStore';
import type { Entity, EntityAsset } from '../../../types/entity';

interface EntityListProps {
  onAddEntity: () => void;
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export default function EntityList({ onAddEntity }: EntityListProps) {
  const { entities, selectedEntity, selectEntity, searchQuery, setSearchQuery } = useEntityStore();
  const { settings } = useFurnisherSettingsStore();
  const [logoAssets, setLogoAssets] = useState<Record<string, string>>({});
  const [logoVersion, setLogoVersion] = useState(0);
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

  // Fetch entity-logo assets for all entities
  const fetchLogoAssets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/assets?type=entity-logo`, { credentials: 'include' });
      if (!res.ok) return;
      const assets: EntityAsset[] = await res.json();

      const logoMap: Record<string, string> = {};
      assets.forEach((asset) => {
        // Assets have entityId stored - use it to map to entity
        if (asset.entityId && asset.type === 'entity-logo') {
          logoMap[asset.entityId] = asset.localUri;
        }
      });
      setLogoAssets(logoMap);
    } catch (err) {
      console.error('Failed to fetch logo assets:', err);
    }
  };

  useEffect(() => {
    fetchLogoAssets();
  }, [entities, logoVersion]);

  // Listen for logo updates from AssetsSection
  useEffect(() => {
    const handleLogoUpdate = () => {
      setLogoVersion(v => v + 1);
    };
    window.addEventListener('entity-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('entity-logo-updated', handleLogoUpdate);
  }, []);

  // Auto-scroll to selected entity when it changes
  useEffect(() => {
    if (selectedEntity && entityRefs.current[selectedEntity.id]) {
      const element = entityRefs.current[selectedEntity.id];
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntity?.id]);

  // Get logo URL for an entity - prefer local asset, fall back to entity.logoUri
  const getEntityLogo = (entity: Entity): string | undefined => {
    // First try local asset library
    if (logoAssets[entity.id]) {
      return logoAssets[entity.id];
    }
    // Fall back to entity.logoUri (which may be set from local assets anyway)
    return entity.logoUri;
  };

  // Filter entities by search query and sort alphabetically
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
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <div className="divide-y divide-gray-100">
            {filteredEntities.map((entity) => {
              const logoUrl = getEntityLogo(entity);
              const isSelected = selectedEntity?.id === entity.id;
              return (
                <div
                  key={entity.id}
                  ref={(el) => { entityRefs.current[entity.id] = el; }}
                  onClick={() => selectEntity(entity.id)}
                  className={`group p-3 cursor-pointer transition-colors border-l-4 ${
                    isSelected
                      ? 'bg-blue-50 border-l-blue-500'
                      : 'hover:bg-gray-50 border-l-transparent'
                  }`}
                  style={isSelected && entity.primaryColor ? { borderLeftColor: entity.primaryColor } : undefined}
                >
                  <div className="flex items-center gap-3">
                    {/* Logo or initials */}
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="w-8 h-8 object-contain rounded bg-gray-50 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium flex-shrink-0 ${logoUrl ? 'hidden' : ''}`}>
                      {entity.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Name and badges */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{entity.name}</div>
                      {/* Entity types and data provider type badges */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {entity.entityTypes?.slice(0, 2).map(typeId => (
                          <span key={typeId} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                            {getEntityTypeLabel(typeId)}
                          </span>
                        ))}
                        {(entity.entityTypes?.length || 0) > 2 && (
                          <span className="text-xs text-gray-400">
                            +{(entity.entityTypes?.length || 0) - 2} types
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
