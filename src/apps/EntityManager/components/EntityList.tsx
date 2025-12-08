import { useEntityStore } from '../../../store/entityStore';
import type { Entity, EntityType } from '../../../types/entity';
import { ENTITY_TYPE_CONFIG, ENTITY_STATUS_CONFIG } from '../../../types/entity';

interface EntityListProps {
  onEditEntity: (id: string) => void;
}

function getTypeColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    'issuer': 'bg-blue-100 text-blue-800',
    'data-furnisher': 'bg-green-100 text-green-800',
    'network-partner': 'bg-purple-100 text-purple-800',
    'service-provider': 'bg-orange-100 text-orange-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

function getStatusColor(status: Entity['status']): string {
  const colors: Record<Entity['status'], string> = {
    'active': 'bg-green-500',
    'pending': 'bg-yellow-500',
    'inactive': 'bg-gray-400',
  };
  return colors[status] || 'bg-gray-400';
}

export default function EntityList({ onEditEntity }: EntityListProps) {
  const { entities, selectedEntity, selectEntity, searchQuery, deleteEntity } = useEntityStore();

  // Filter entities by search query
  const filteredEntities = entities.filter((entity) => {
    if (!searchQuery || searchQuery.length < 2) return true;
    const query = searchQuery.toLowerCase();
    return (
      entity.name.toLowerCase().includes(query) ||
      entity.description?.toLowerCase().includes(query) ||
      entity.id.toLowerCase().includes(query)
    );
  });

  // Group entities by type
  const groupedEntities = filteredEntities.reduce<Record<EntityType, Entity[]>>(
    (acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity);
      return acc;
    },
    {} as Record<EntityType, Entity[]>
  );

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

  if (filteredEntities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm font-medium">No entities found</p>
          {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(groupedEntities).map(([type, typeEntities]) => (
        <div key={type} className="mb-2">
          {/* Type Header */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {ENTITY_TYPE_CONFIG[type as EntityType]?.pluralLabel || type} ({typeEntities.length})
            </span>
          </div>

          {/* Entity Items */}
          {typeEntities.map((entity) => (
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
                {/* Logo placeholder or initials */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {entity.logoUri ? (
                    <img
                      src={entity.logoUri.startsWith('http') ? entity.logoUri : `https://openpropertyassociation.ca/${entity.logoUri}`}
                      alt={entity.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`text-sm font-semibold text-gray-400 ${entity.logoUri ? 'hidden' : ''}`}>
                    {entity.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{entity.name}</h4>
                    {/* Status indicator */}
                    <span
                      className={`w-2 h-2 rounded-full ${getStatusColor(entity.status)}`}
                      title={ENTITY_STATUS_CONFIG[entity.status]?.label}
                    />
                  </div>

                  {entity.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{entity.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(entity.type)}`}>
                      {ENTITY_TYPE_CONFIG[entity.type]?.label}
                    </span>
                  </div>
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
          ))}
        </div>
      ))}
    </div>
  );
}
