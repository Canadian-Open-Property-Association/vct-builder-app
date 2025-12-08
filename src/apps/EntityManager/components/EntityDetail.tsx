import type { Entity, EntityType } from '../../../types/entity';
import { ENTITY_TYPE_CONFIG, ENTITY_STATUS_CONFIG } from '../../../types/entity';

interface EntityDetailProps {
  entity: Entity;
  onEdit: () => void;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveLogoUri(logoUri: string | undefined): string | undefined {
  if (!logoUri) return undefined;
  if (logoUri.startsWith('http')) return logoUri;
  if (logoUri.startsWith('/')) return logoUri;
  return `/assets/${logoUri}`;
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

export default function EntityDetail({ entity, onEdit }: EntityDetailProps) {
  const statusConfig = ENTITY_STATUS_CONFIG[entity.status];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {entity.logoUri ? (
              <img
                src={resolveLogoUri(entity.logoUri)}
                alt={entity.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {entity.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">{entity.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {entity.types?.map((type) => (
                <span
                  key={type}
                  className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(type)}`}
                >
                  {ENTITY_TYPE_CONFIG[type]?.label}
                </span>
              ))}
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${statusConfig.color}-500`}></span>
                {statusConfig.label}
              </span>
            </div>
            {entity.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl">{entity.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Contact & Web Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact & Web</h3>
          <div className="space-y-3">
            {entity.website && (
              <div>
                <label className="text-xs text-gray-500">Website</label>
                <a
                  href={entity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:underline truncate"
                >
                  {entity.website}
                </a>
              </div>
            )}
            {entity.contactEmail && (
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <a
                  href={`mailto:${entity.contactEmail}`}
                  className="block text-sm text-blue-600 hover:underline"
                >
                  {entity.contactEmail}
                </a>
              </div>
            )}
            {!entity.website && !entity.contactEmail && (
              <p className="text-sm text-gray-400 italic">No contact information</p>
            )}
          </div>
        </div>

        {/* Technical Identity Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Technical Identity</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Entity ID</label>
              <p className="text-sm font-mono text-gray-800">{entity.id}</p>
            </div>
            {entity.did && (
              <div>
                <label className="text-xs text-gray-500">Decentralized Identifier (DID)</label>
                <p className="text-sm font-mono text-gray-800 break-all">{entity.did}</p>
              </div>
            )}
            {entity.logoUri && (
              <div>
                <label className="text-xs text-gray-500">Logo URI</label>
                <p className="text-sm font-mono text-gray-600 break-all">{entity.logoUri}</p>
              </div>
            )}
            {entity.primaryColor && (
              <div>
                <label className="text-xs text-gray-500">Brand Color</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-200"
                    style={{ backgroundColor: entity.primaryColor }}
                  />
                  <span className="text-sm font-mono text-gray-800">{entity.primaryColor}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          {/* Created Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Created</h4>
            <div className="space-y-1">
              {entity.createdAt && (
                <p className="text-sm text-gray-800">{formatDateTime(entity.createdAt)}</p>
              )}
              {entity.createdBy && (
                <p className="text-xs text-gray-500">
                  by <span className="font-medium text-gray-700">{entity.createdBy.name || entity.createdBy.login}</span>
                </p>
              )}
            </div>
          </div>

          {/* Updated Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Last Updated</h4>
            <div className="space-y-1">
              {entity.updatedAt && (
                <p className="text-sm text-gray-800">{formatDateTime(entity.updatedAt)}</p>
              )}
              {entity.updatedBy && (
                <p className="text-xs text-gray-500">
                  by <span className="font-medium text-gray-700">{entity.updatedBy.name || entity.updatedBy.login}</span>
                </p>
              )}
              {!entity.updatedBy && entity.updatedAt && (
                <p className="text-xs text-gray-400 italic">No user information</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
