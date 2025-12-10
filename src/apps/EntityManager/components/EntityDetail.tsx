import { useState, useRef, useEffect } from 'react';
import type { Entity, EntityType, FurnisherDataSchema } from '../../../types/entity';
import { ENTITY_TYPE_CONFIG, ENTITY_STATUS_CONFIG } from '../../../types/entity';
import { useEntityStore } from '../../../store/entityStore';
import FurnisherDataSchemaSection from './FurnisherDataSchemaSection';

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
  const brandColour = entity.primaryColor || '#1a365d';
  const { updateEntity } = useEntityStore();
  const isDataFurnisher = entity.types?.includes('data-furnisher');
  const [activeTab, setActiveTab] = useState<'about' | 'data-schema'>('about');

  // Track the current entity ID to reset tab only when switching entities
  const currentEntityIdRef = useRef(entity.id);

  // Only reset to 'about' tab when switching to a different entity
  useEffect(() => {
    if (currentEntityIdRef.current !== entity.id) {
      currentEntityIdRef.current = entity.id;
      setActiveTab('about');
    }
  }, [entity.id]);

  const handleUpdateSchema = async (schema: FurnisherDataSchema) => {
    try {
      await updateEntity(entity.id, { dataSchema: schema });
    } catch (error) {
      console.error('Failed to update schema:', error);
    }
  };

  return (
    <div>
      {/* Banner Header with Brand Colour */}
      <div
        className="h-32 relative"
        style={{ backgroundColor: brandColour }}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20" />

        {/* Entity name on banner with white text */}
        <div className="absolute bottom-14 left-6 right-24">
          <h2 className="text-xl font-semibold text-white drop-shadow-sm truncate">
            {entity.name}
          </h2>
        </div>

        {/* Edit button positioned on banner */}
        <button
          onClick={onEdit}
          className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Content with logo overlapping banner */}
      <div className="px-6 pb-6">
        {/* Logo and badges - positioned to overlap banner */}
        <div className="flex items-end gap-4 -mt-10 relative z-10 mb-4">
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-xl bg-white shadow-lg border-4 border-white flex items-center justify-center overflow-hidden flex-shrink-0"
          >
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
              <span
                className="text-xl font-bold"
                style={{ color: brandColour }}
              >
                {entity.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="pb-1">
            <div className="flex items-center gap-2 flex-wrap">
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
          </div>
        </div>

        {/* Description */}
        {entity.description && (
          <p className="text-sm text-gray-600 mb-4 max-w-2xl">{entity.description}</p>
        )}

        {/* Tabs - only show if data furnisher */}
        {isDataFurnisher && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('about')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'about'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab('data-schema')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'data-schema'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Data Schema
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'data-schema' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {entity.dataSchema?.fields?.length || 0}
                </span>
              </button>
            </nav>
          </div>
        )}

      {/* Tab Content: About */}
      {(!isDataFurnisher || activeTab === 'about') && (
        <>
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
                {entity.contactName && (
                  <div>
                    <label className="text-xs text-gray-500">Contact Person</label>
                    <p className="text-sm text-gray-800">{entity.contactName}</p>
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
                {entity.contactPhone && (
                  <div>
                    <label className="text-xs text-gray-500">Phone</label>
                    <a
                      href={`tel:${entity.contactPhone}`}
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      {entity.contactPhone}
                    </a>
                  </div>
                )}
                {!entity.website && !entity.contactEmail && !entity.contactName && !entity.contactPhone && (
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
                    <label className="text-xs text-gray-500">Brand Colour</label>
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

          {/* Regions Covered - Only shown for Data Furnishers with regions */}
          {entity.regionsCovered && entity.regionsCovered.length > 0 && (
            <div className="mt-6 bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Regions Covered
                <span className="ml-auto text-xs font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Data Furnisher
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {entity.regionsCovered.map((region) => (
                  <span
                    key={region}
                    className="px-2 py-1 text-sm bg-white border border-green-200 text-green-800 rounded-lg"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}

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
        </>
      )}

      {/* Tab Content: Data Schema - Only shown for Data Furnisher entities */}
      {isDataFurnisher && activeTab === 'data-schema' && (
        <FurnisherDataSchemaSection entity={entity} onUpdateSchema={handleUpdateSchema} />
      )}
      </div>
    </div>
  );
}
