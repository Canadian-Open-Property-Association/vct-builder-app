import { useState, useEffect } from 'react';
import { useEntityStore } from '../../../store/entityStore';
import type { Entity, EntityAsset } from '../../../types/entity';

interface EntityListProps {
  onEditEntity: (id: string) => void;
  onAddEntity: () => void;
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export default function EntityList({ onEditEntity, onAddEntity }: EntityListProps) {
  const { entities, selectedEntity, selectEntity, searchQuery, setSearchQuery, deleteEntity } = useEntityStore();
  const [logoAssets, setLogoAssets] = useState<Record<string, string>>({});

  // Fetch entity-logo assets for all entities
  useEffect(() => {
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

    fetchLogoAssets();
  }, [entities]);

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

  const handleDelete = async (e: React.MouseEvent, entity: Entity) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      try {
        await deleteEntity(entity.id);
      } catch (err) {
        console.error('Failed to delete entity:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Button */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            {filteredEntities.length} {filteredEntities.length === 1 ? 'furnisher' : 'furnishers'}
            {searchQuery && entities.length !== filteredEntities.length && (
              <span className="text-gray-400"> of {entities.length}</span>
            )}
          </span>
          <button
            onClick={onAddEntity}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Add new furnisher"
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
        <div className="flex-1 overflow-y-auto">
          {/* Entity list */}
          {filteredEntities.map((entity) => {
        const logoUrl = getEntityLogo(entity);
        return (
          <div
            key={entity.id}
            onClick={() => selectEntity(entity.id)}
            className={`group px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
              selectedEntity?.id === entity.id
                ? 'bg-blue-50 border-l-4 border-l-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Logo or initials */}
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={entity.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`text-sm font-semibold text-gray-400 ${logoUrl ? 'hidden' : ''}`}>
                  {entity.name.substring(0, 2).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">{entity.name}</h4>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditEntity(entity.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, entity)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
          })}
        </div>
      )}
    </div>
  );
}
