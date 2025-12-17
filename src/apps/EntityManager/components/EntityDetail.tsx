import { useState, useRef, useEffect, useCallback } from 'react';
import type { Entity, FurnisherDataSchema, EntityAsset } from '../../../types/entity';
import { migrateDataSchema } from '../../../types/entity';
import { useEntityStore } from '../../../store/entityStore';
import { useFurnisherSettingsStore } from '../../../store/furnisherSettingsStore';
import { CANADIAN_REGIONS, normalizeRegions } from '../../../constants/regions';
import DataSourcesSection from './DataSourcesSection';
import AssetsSection from './AssetsSection';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

interface EntityDetailProps {
  entity: Entity;
  onEdit: () => void;
}

// Inline editable section component
interface EditableSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  editContent?: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}

function EditableSection({
  title,
  icon,
  children,
  editContent,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  className = '',
}: EditableSectionProps) {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
            title={`Edit ${title}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      {isEditing && editContent ? editContent : children}
    </div>
  );
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

export default function EntityDetail({ entity, onEdit: _onEdit }: EntityDetailProps) {
  const brandColour = entity.primaryColor || '#1a365d';
  const { updateEntity, selectEntity, deleteEntity } = useEntityStore();
  const { settings } = useFurnisherSettingsStore();
  const [activeTab, setActiveTab] = useState<'about' | 'data-schema' | 'assets'>('about');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline editing states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Entity> & { newId?: string }>({});

  // Entity name editing state (used in header)
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState(entity.name);

  // Entity description editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(entity.description || '');

  // Status editing state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Track the current entity ID to reset tab only when switching entities
  const currentEntityIdRef = useRef(entity.id);

  // Ref for scroll container to preserve scroll position on tab change
  const detailContainerRef = useRef<HTMLDivElement>(null);

  // Handle tab change while preserving scroll position
  const handleTabChange = useCallback((tab: 'about' | 'data-schema' | 'assets') => {
    // Get the parent scroll container (the detail panel)
    const scrollContainer = detailContainerRef.current?.closest('.overflow-y-auto');
    const scrollTop = scrollContainer?.scrollTop ?? 0;

    setActiveTab(tab);

    // Restore scroll position after React renders the new tab content
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    });
  }, []);

  // Asset count for the tab badge
  const [assetCount, setAssetCount] = useState(0);

  // Entity logo from asset library (takes priority over entity.logoUri)
  const [assetLogoUri, setAssetLogoUri] = useState<string | null>(null);

  // Fetch assets for this entity (count and logo)
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/assets?entityId=${entity.id}`, { credentials: 'include' });
        if (res.ok) {
          const assets: EntityAsset[] = await res.json();
          setAssetCount(assets.length);

          // Find entity-logo asset
          const logoAsset = assets.find(a => a.type === 'entity-logo');
          setAssetLogoUri(logoAsset?.localUri || null);
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      }
    };
    fetchAssets();
  }, [entity.id, activeTab]); // Re-fetch when switching to assets tab (in case assets were added)

  // Get the best available logo URI
  const effectiveLogoUri = assetLogoUri || entity.logoUri;

  // Only reset to 'about' tab when switching to a different entity
  useEffect(() => {
    if (currentEntityIdRef.current !== entity.id) {
      currentEntityIdRef.current = entity.id;
      setActiveTab('about');
      setEditingSection(null);
      setEditingName(false);
      setEditedName(entity.name);
      setEditingDescription(false);
      setEditedDescription(entity.description || '');
    }
  }, [entity.id]);

  // Sync edited name when entity name changes (e.g., after save)
  useEffect(() => {
    if (!editingName) {
      setEditedName(entity.name);
    }
  }, [entity.name, editingName]);

  // Sync edited description when entity description changes (e.g., after save)
  useEffect(() => {
    if (!editingDescription) {
      setEditedDescription(entity.description || '');
    }
  }, [entity.description, editingDescription]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const handleUpdateSchema = async (schema: FurnisherDataSchema) => {
    try {
      await updateEntity(entity.id, { dataSchema: schema });
    } catch (error) {
      console.error('Failed to update schema:', error);
    }
  };

  // Save entity name
  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === entity.name) {
      setEditingName(false);
      setEditedName(entity.name);
      return;
    }
    try {
      await updateEntity(entity.id, { name: editedName.trim() });
      setEditingName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      setEditedName(entity.name);
      setEditingName(false);
    }
  };

  // Save entity description
  const handleSaveDescription = async () => {
    if (editedDescription === (entity.description || '')) {
      setEditingDescription(false);
      return;
    }
    try {
      await updateEntity(entity.id, { description: editedDescription });
      setEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
      setEditedDescription(entity.description || '');
      setEditingDescription(false);
    }
  };

  // Change entity status
  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateEntity(entity.id, { status: newStatus as Entity['status'] });
      setShowStatusDropdown(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Get status display info from settings
  const getStatusConfig = (statusId: string) => {
    if (!settings) return { label: statusId, color: 'gray' };
    const status = settings.entityStatuses.find(s => s.id === statusId);
    return status || { label: statusId, color: 'gray' };
  };

  const getStatusColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    };
    return colorMap[color] || colorMap.gray;
  };

  const startEditing = (section: string) => {
    setEditingSection(section);
    // Extract slug from entity ID (remove copa- prefix if present)
    const idSlug = entity.id.startsWith('copa-') ? entity.id.slice(5) : entity.id;
    setEditFormData({ ...entity, newId: idSlug });
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditFormData({});
  };

  const saveSection = async () => {
    try {
      await updateEntity(entity.id, editFormData);
      setEditingSection(null);
      setEditFormData({});
    } catch (error) {
      console.error('Failed to update entity:', error);
    }
  };

  const updateFormField = (field: keyof Entity, value: string | undefined) => {
    setEditFormData(prev => ({ ...prev, [field]: value || undefined }));
  };

  return (
    <div ref={detailContainerRef}>
      {/* Banner Header with Brand Colour */}
      <div
        className="h-20 relative"
        style={{ backgroundColor: brandColour }}
      >
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/20" />
      </div>

      {/* Content area */}
      <div className="px-6 pb-6">
        {/* Logo overlapping banner */}
        <div className="flex items-end -mt-8 relative z-10 mb-4">
          <div
            className="w-16 h-16 rounded-xl bg-white shadow-lg border-4 border-white flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            {effectiveLogoUri ? (
              <img
                src={resolveLogoUri(effectiveLogoUri)}
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
        </div>

        {/* Name and badges - completely below banner */}
        <div className="mb-4">
          {editingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setEditingName(false);
                    setEditedName(entity.name);
                  }
                }}
                autoFocus
                className="text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-green-600 hover:text-green-700"
                title="Save"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setEditedName(entity.name);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Cancel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {entity.name}
              </h2>
              <button
                onClick={() => setEditingName(true)}
                className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit name"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}

          {/* Status Badge - editable */}
          <div className="relative" ref={statusDropdownRef}>
            {(() => {
              const statusConfig = getStatusConfig(entity.status);
              const colorClasses = getStatusColorClasses(statusConfig.color);
              return (
                <>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} hover:opacity-80`}
                    title="Click to change status"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {statusConfig.label}
                    <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Status Dropdown */}
                  {showStatusDropdown && settings && (
                    <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                      {settings.entityStatuses.map((status) => {
                        const colors = getStatusColorClasses(status.color);
                        const isSelected = entity.status === status.id;
                        return (
                          <button
                            key={status.id}
                            onClick={() => handleStatusChange(status.id)}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                              isSelected ? 'bg-gray-50' : ''
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${colors.bg} border ${colors.border}`}></span>
                            <span className={isSelected ? 'font-medium' : ''}>{status.label}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

        </div>

        {/* Description - editable inline */}
        <div className="mb-4">
          {editingDescription ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingDescription(false);
                    setEditedDescription(entity.description || '');
                  }
                }}
                autoFocus
                rows={4}
                placeholder="Add a description..."
                className="w-full text-sm text-gray-600 bg-white border border-blue-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDescription}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingDescription(false);
                    setEditedDescription(entity.description || '');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-2">
              {entity.description ? (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{entity.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No description</p>
              )}
              <button
                onClick={() => setEditingDescription(true)}
                className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Edit description"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Tabs - always show for all entities */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => handleTabChange('about')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'about'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('data-schema')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'data-schema'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Sources
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'data-schema' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {migrateDataSchema(entity.dataSchema).sources?.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('assets')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'assets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Assets
              {assetCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'assets' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {assetCount}
                </span>
              )}
            </button>
          </nav>
        </div>

      {/* Tab Content: About */}
      {activeTab === 'about' && (
        <>
          {/* Organization Details - Merged Contact & Technical */}
          <EditableSection
            title="Organization Details"
            icon={
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            isEditing={editingSection === 'organization'}
            onEdit={() => startEditing('organization')}
            onSave={saveSection}
            onCancel={cancelEditing}
            editContent={
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Entity ID</label>
                  <div className="flex items-center">
                    <span className="px-3 py-1.5 text-sm font-mono bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-500">
                      copa-
                    </span>
                    <input
                      type="text"
                      value={editFormData.newId || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, newId: e.target.value }))}
                      placeholder="entity-slug"
                      className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-300 rounded-r-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Website</label>
                  <input
                    type="url"
                    value={editFormData.website || ''}
                    onChange={(e) => updateFormField('website', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editFormData.contactName || ''}
                    onChange={(e) => updateFormField('contactName', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.contactEmail || ''}
                    onChange={(e) => updateFormField('contactEmail', e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editFormData.contactPhone || ''}
                    onChange={(e) => updateFormField('contactPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DID (Decentralized Identifier)</label>
                  <input
                    type="text"
                    value={editFormData.did || ''}
                    onChange={(e) => updateFormField('did', e.target.value)}
                    placeholder="did:web:example.com"
                    className="w-full px-3 py-1.5 text-sm font-mono border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Brand Colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editFormData.primaryColor || '#1a365d'}
                      onChange={(e) => updateFormField('primaryColor', e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editFormData.primaryColor || ''}
                      onChange={(e) => updateFormField('primaryColor', e.target.value)}
                      placeholder="#1a365d"
                      className="flex-1 px-3 py-1.5 text-sm font-mono border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Entity ID</label>
                <p className="text-sm font-mono text-gray-800">{entity.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Website</label>
                {entity.website ? (
                  <a
                    href={entity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:underline truncate"
                  >
                    {entity.website}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Contact Person</label>
                <p className="text-sm text-gray-800">{entity.contactName || <span className="text-gray-400">—</span>}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Email</label>
                {entity.contactEmail ? (
                  <a
                    href={`mailto:${entity.contactEmail}`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {entity.contactEmail}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">Phone</label>
                {entity.contactPhone ? (
                  <a
                    href={`tel:${entity.contactPhone}`}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {entity.contactPhone}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">DID</label>
                <p className="text-sm font-mono text-gray-800 break-all">{entity.did || <span className="text-gray-400 font-sans">—</span>}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Brand Colour</label>
                {entity.primaryColor ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded border border-gray-200"
                      style={{ backgroundColor: entity.primaryColor }}
                    />
                    <span className="text-sm font-mono text-gray-800">{entity.primaryColor}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
            </div>
          </EditableSection>

          {/* Coverage & Data Types Section */}
          <div className="mt-6">
            <EditableSection
              title="Coverage & Data Types"
              icon={
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              isEditing={editingSection === 'classification'}
              onEdit={() => {
                setEditingSection('classification');
                setEditFormData({
                  ...entity,
                  regionsCovered: normalizeRegions(entity.regionsCovered)
                });
              }}
              onSave={async () => {
                try {
                  await updateEntity(entity.id, {
                    entityTypes: editFormData.entityTypes,
                    regionsCovered: editFormData.regionsCovered,
                    dataProviderTypes: editFormData.dataProviderTypes,
                    serviceProviderTypes: editFormData.serviceProviderTypes
                  });
                  setEditingSection(null);
                  setEditFormData({});
                } catch (error) {
                  console.error('Failed to update entity:', error);
                }
              }}
              onCancel={() => {
                setEditingSection(null);
                setEditFormData({});
              }}
              editContent={
                <div className="space-y-4">
                  {/* Entity Types - Multi-select */}
                  <div>
                    <span className="block text-xs font-medium text-gray-600 mb-2">Entity Types</span>
                    <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(settings?.entityTypes || []).map((type) => {
                        const isSelected = editFormData.entityTypes?.includes(type.id);
                        return (
                          <div
                            key={type.id}
                            onClick={() => {
                              const current = editFormData.entityTypes || [];
                              let newTypes: string[];
                              if (isSelected) {
                                newTypes = current.filter(t => t !== type.id);
                              } else {
                                newTypes = [...current, type.id];
                              }
                              // Clear provider types that are no longer relevant
                              const hasDataFurnisher = newTypes.includes('data-furnisher');
                              const hasServiceProvider = newTypes.includes('service-provider');
                              setEditFormData(prev => ({
                                ...prev,
                                entityTypes: newTypes,
                                dataProviderTypes: hasDataFurnisher ? prev.dataProviderTypes : [],
                                serviceProviderTypes: hasServiceProvider ? prev.serviceProviderTypes : [],
                              }));
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-purple-50 border-purple-300 text-purple-800'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm">{type.label}</span>
                            {isSelected && (
                              <svg className="w-3 h-3 text-purple-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-gray-600 mb-2">Regions Covered</span>
                    <div className="grid grid-cols-4 gap-2">
                      {CANADIAN_REGIONS.map((region) => {
                        const isSelected = editFormData.regionsCovered?.includes(region.code);
                        return (
                          <div
                            key={region.code}
                            onClick={() => {
                              const current = editFormData.regionsCovered || [];
                              if (isSelected) {
                                setEditFormData(prev => ({ ...prev, regionsCovered: current.filter(r => r !== region.code) }));
                              } else {
                                setEditFormData(prev => ({ ...prev, regionsCovered: [...current, region.code] }));
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-green-50 border-green-300 text-green-800'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm">{region.code}</span>
                            {isSelected && (
                              <svg className="w-3 h-3 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Data Provider Types - show if entity has data-furnisher type */}
                  {editFormData.entityTypes?.includes('data-furnisher') && (
                    <div>
                      <span className="block text-xs font-medium text-gray-600 mb-2">Data Provider Types</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(settings?.dataProviderTypes || []).map((providerType) => {
                          const isSelected = editFormData.dataProviderTypes?.includes(providerType.id as never);
                          return (
                            <div
                              key={providerType.id}
                              onClick={() => {
                                const current = editFormData.dataProviderTypes || [];
                                if (isSelected) {
                                  setEditFormData(prev => ({ ...prev, dataProviderTypes: current.filter(t => t !== providerType.id) as never[] }));
                                } else {
                                  setEditFormData(prev => ({ ...prev, dataProviderTypes: [...current, providerType.id] as never[] }));
                                }
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors select-none ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-sm">{providerType.label}</span>
                              {isSelected && (
                                <svg className="w-3 h-3 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Service Provider Types - show if entity has service-provider type */}
                  {editFormData.entityTypes?.includes('service-provider') && (
                    <div>
                      <span className="block text-xs font-medium text-gray-600 mb-2">Service Provider Types</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(settings?.serviceProviderTypes || []).map((providerType) => {
                          const isSelected = editFormData.serviceProviderTypes?.includes(providerType.id);
                          return (
                            <div
                              key={providerType.id}
                              onClick={() => {
                                const current = editFormData.serviceProviderTypes || [];
                                if (isSelected) {
                                  setEditFormData(prev => ({ ...prev, serviceProviderTypes: current.filter(t => t !== providerType.id) }));
                                } else {
                                  setEditFormData(prev => ({ ...prev, serviceProviderTypes: [...current, providerType.id] }));
                                }
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors select-none ${
                                isSelected
                                  ? 'bg-orange-50 border-orange-300 text-orange-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-sm">{providerType.label}</span>
                              {isSelected && (
                                <svg className="w-3 h-3 text-orange-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              }
            >
              <div className="space-y-3">
                {/* Entity Types */}
                <div>
                  <label className="text-xs text-gray-500">Entity Types</label>
                  {entity.entityTypes && entity.entityTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entity.entityTypes.map((typeId) => {
                        const typeConfig = settings?.entityTypes?.find(t => t.id === typeId);
                        return (
                          <span
                            key={typeId}
                            className="px-2 py-0.5 text-xs bg-purple-50 border border-purple-200 text-purple-800 rounded"
                          >
                            {typeConfig?.label || typeId}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Not specified</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Regions Covered</label>
                  {entity.regionsCovered && entity.regionsCovered.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {normalizeRegions(entity.regionsCovered).map((region) => (
                        <span
                          key={region}
                          className="px-2 py-0.5 text-xs bg-green-50 border border-green-200 text-green-800 rounded"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No regions specified</p>
                  )}
                </div>
                {/* Data Provider Types - show if entity has data-furnisher type */}
                {entity.entityTypes?.includes('data-furnisher') && (
                  <div>
                    <label className="text-xs text-gray-500">Data Provider Types</label>
                    {entity.dataProviderTypes && entity.dataProviderTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {entity.dataProviderTypes.map((providerType) => {
                          const providerConfig = settings?.dataProviderTypes?.find(t => t.id === providerType);
                          return (
                            <span
                              key={providerType}
                              className="px-2 py-0.5 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded"
                            >
                              {providerConfig?.label || providerType}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No data provider types specified</p>
                    )}
                  </div>
                )}
                {/* Service Provider Types - show if entity has service-provider type */}
                {entity.entityTypes?.includes('service-provider') && (
                  <div>
                    <label className="text-xs text-gray-500">Service Provider Types</label>
                    {entity.serviceProviderTypes && entity.serviceProviderTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {entity.serviceProviderTypes.map((providerType) => {
                          const providerConfig = settings?.serviceProviderTypes?.find(t => t.id === providerType);
                          return (
                            <span
                              key={providerType}
                              className="px-2 py-0.5 text-xs bg-orange-50 border border-orange-200 text-orange-800 rounded"
                            >
                              {providerConfig?.label || providerType}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No service provider types specified</p>
                    )}
                  </div>
                )}
              </div>
            </EditableSection>
          </div>

          {/* Metadata Footer - outside grey box */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                {entity.createdAt && (
                  <span>
                    Created {formatDateTime(entity.createdAt)}
                    {entity.createdBy && (
                      <span> by {entity.createdBy.name || entity.createdBy.login}</span>
                    )}
                  </span>
                )}
              </div>
              <div>
                {entity.updatedAt && (
                  <span>
                    Updated {formatDateTime(entity.updatedAt)}
                    {entity.updatedBy && (
                      <span> by {entity.updatedBy.name || entity.updatedBy.login}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab Content: Data Sources */}
      {activeTab === 'data-schema' && (
        <DataSourcesSection entity={entity} onUpdateSchema={handleUpdateSchema} />
      )}

      {/* Tab Content: Assets - Available for all entities */}
      {activeTab === 'assets' && (
        <AssetsSection entity={entity} onRefreshEntity={() => selectEntity(entity.id)} />
      )}

      {/* Delete Entity Section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Danger Zone</h4>
            <p className="text-xs text-gray-500 mt-0.5">Permanently delete this entity</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            Delete Entity
          </button>
        </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Entity</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <span className="font-semibold">{entity.name}</span>?
                This will permanently remove the entity and all associated data including assets and data sources.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-700">
                  <strong>Warning:</strong> This entity may be referenced by credentials, schemas, or other configurations.
                  Deleting it may break existing references.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteEntity(entity.id);
                    setShowDeleteConfirm(false);
                  } catch (err) {
                    console.error('Failed to delete entity:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Entity
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
