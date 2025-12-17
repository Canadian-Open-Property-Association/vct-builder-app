import { useState, useEffect, useRef } from 'react';
import { useVctStore } from '../../store/vctStore';
import { useZoneTemplateStore } from '../../store/zoneTemplateStore';
import { useZoneSelectionStore } from '../../store/zoneSelectionStore';
import { useFurnisherSettingsStore } from '../../store/furnisherSettingsStore';
import {
  ZoneTemplate,
  Zone,
  ZoneContentType,
  getZoneColor,
  AssetCriteria,
  AssetEntityRole,
  AssetTypeOption,
} from '../../types/vct';
import AssetLibrary from '../AssetLibrary/AssetLibrary';
import ZoneTemplateSelector from '../ZoneEditor/ZoneTemplateSelector';
import ZoneTemplateLibrary from '../Library/ZoneTemplateLibrary';
import { getAssetCriteriaLabel } from '../../services/assetResolver';

interface CardElementsFormProps {
  displayIndex: number;
}

// Dynamic Zone Elements Form - for custom zone templates
interface DynamicZoneElementsFormProps {
  template: ZoneTemplate;
  displayIndex: number;
  claimPaths: { path: string; label: string }[];
}

function DynamicZoneElementsForm({ template, displayIndex, claimPaths }: DynamicZoneElementsFormProps) {
  const updateDynamicElement = useVctStore((state) => state.updateDynamicElement);
  const currentVct = useVctStore((state) => state.currentVct);
  const display = currentVct.display[displayIndex];
  const dynamicElements = display?.dynamic_card_elements;
  const { settings, fetchSettings } = useFurnisherSettingsStore();

  // Zone selection state
  const selectedZoneId = useZoneSelectionStore((state) => state.selectedZoneId);
  const selectedFace = useZoneSelectionStore((state) => state.selectedFace);
  const clearSelection = useZoneSelectionStore((state) => state.clearSelection);

  const [frontExpanded, setFrontExpanded] = useState(true);
  const [backExpanded, setBackExpanded] = useState(!template.frontOnly);

  // Track which individual zones are expanded (all start collapsed)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  // Reset confirmation state
  const [resetConfirmZone, setResetConfirmZone] = useState<{ face: 'front' | 'back'; zoneId: string } | null>(null);

  // Fetch settings on mount if not loaded
  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [settings, fetchSettings]);

  // Toggle individual zone expansion
  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  };

  // Reset a zone to default state (called after confirmation)
  const executeResetZone = (face: 'front' | 'back', zoneId: string) => {
    if (updateDynamicElement) {
      updateDynamicElement(displayIndex, face, zoneId, {
        content_type: 'text',
        claim_path: undefined,
        static_value: undefined,
        label: undefined,
        logo_uri: undefined,
        asset_criteria: undefined,
        alignment: 'center',
        verticalAlignment: 'middle',
        scale: 1.0,
        textWrap: false,
      });
    }
  };

  // Show reset confirmation dialog
  const handleResetZone = (face: 'front' | 'back', zoneId: string) => {
    setResetConfirmZone({ face, zoneId });
  };

  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerZoneId, setAssetPickerZoneId] = useState<string | null>(null);
  const [assetPickerFace, setAssetPickerFace] = useState<'front' | 'back'>('front');

  // Refs for zone elements to enable scroll-to
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const frontZones = template.front.zones;
  const backZones = template.back.zones;

  // Scroll to selected zone when it changes
  useEffect(() => {
    if (selectedZoneId && selectedFace) {
      // Expand the correct section if collapsed
      if (selectedFace === 'front' && !frontExpanded) {
        setFrontExpanded(true);
      } else if (selectedFace === 'back' && !backExpanded) {
        setBackExpanded(true);
      }

      // Also expand the individual zone
      setExpandedZones((prev) => {
        const next = new Set(prev);
        next.add(selectedZoneId);
        return next;
      });

      // Small delay to allow expansion animation
      setTimeout(() => {
        const ref = zoneRefs.current[selectedZoneId];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a brief highlight effect
          ref.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
          setTimeout(() => {
            ref.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
            clearSelection();
          }, 1500);
        }
      }, 100);
    }
  }, [selectedZoneId, selectedFace, frontExpanded, backExpanded, clearSelection]);

  // Get element for a zone
  const getElementForZone = (face: 'front' | 'back', zoneId: string) => {
    const elements = face === 'front' ? dynamicElements?.front : dynamicElements?.back;
    return elements?.find((el) => el.zone_id === zoneId);
  };

  const handleElementChange = (
    face: 'front' | 'back',
    zoneId: string,
    field: 'claim_path' | 'static_value' | 'logo_uri' | 'label' | 'content_type' | 'alignment' | 'verticalAlignment' | 'scale' | 'textWrap' | 'asset_criteria',
    value: string | number | boolean | AssetCriteria | undefined
  ) => {
    if (updateDynamicElement) {
      updateDynamicElement(displayIndex, face, zoneId, { [field]: value });
    }
  };

  const handleContentTypeChange = (face: 'front' | 'back', zoneId: string, contentType: ZoneContentType) => {
    if (updateDynamicElement) {
      // When changing content type, clear the values from the previous type
      if (contentType === 'text') {
        updateDynamicElement(displayIndex, face, zoneId, {
          content_type: contentType,
          logo_uri: undefined,
          asset_criteria: undefined,
        });
      } else {
        updateDynamicElement(displayIndex, face, zoneId, {
          content_type: contentType,
          claim_path: undefined,
          static_value: undefined,
          label: undefined,
        });
      }
    }
  };

  const openAssetPicker = (face: 'front' | 'back', zoneId: string) => {
    setAssetPickerFace(face);
    setAssetPickerZoneId(zoneId);
    setAssetPickerOpen(true);
  };

  const handleAssetSelect = (uri: string) => {
    if (assetPickerZoneId) {
      handleElementChange(assetPickerFace, assetPickerZoneId, 'logo_uri', uri);
    }
    setAssetPickerOpen(false);
    setAssetPickerZoneId(null);
  };

  const renderZoneElement = (face: 'front' | 'back', zone: Zone, index: number) => {
    const element = getElementForZone(face, zone.id);
    const zoneColor = getZoneColor(index);
    const contentType = element?.content_type || 'text';
    const alignment = element?.alignment || 'center';
    const verticalAlignment = element?.verticalAlignment || 'middle';
    const scale = element?.scale || 1.0;
    const textWrap = element?.textWrap || false;
    const isSelected = selectedZoneId === zone.id;
    const isExpanded = expandedZones.has(zone.id);

    // Get a summary of the zone content for collapsed display
    const getZoneSummary = () => {
      if (contentType === 'image') {
        if (element?.asset_criteria) {
          return `Image: Dynamic (${element.asset_criteria.entityRole})`;
        }
        if (element?.logo_uri) {
          return 'Image: Specific asset';
        }
        return 'Image: Not configured';
      }
      if (element?.claim_path) {
        const claim = claimPaths.find(c => c.path === element.claim_path);
        return `Text: ${claim?.label || element.claim_path}`;
      }
      if (element?.static_value) {
        return `Text: "${element.static_value.substring(0, 20)}${element.static_value.length > 20 ? '...' : ''}"`;
      }
      return 'Not configured';
    };

    return (
      <div
        key={zone.id}
        ref={(el) => { zoneRefs.current[zone.id] = el; }}
        className={`border rounded transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
        style={{ borderLeftColor: zoneColor, borderLeftWidth: '4px' }}
      >
        {/* Collapsible Header */}
        <div
          className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleZoneExpanded(zone.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: zoneColor }}
              title={zone.name}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-700">Zone {index + 1}</span>
              {zone.subtitle && (
                <span className="ml-2 text-xs text-gray-500">{zone.subtitle}</span>
              )}
              {!isExpanded && (
                <span className="ml-2 text-xs text-gray-400 truncate">— {getZoneSummary()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResetZone(face, zone.id);
              }}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100"
              title="Reset zone"
            >
              Reset
            </button>
            <span className={`transform transition-transform text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3 pt-0 space-y-2 border-t border-gray-100">

        {/* Content Type Selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Content Type</label>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => handleContentTypeChange(face, zone.id, 'text')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                contentType === 'text'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => handleContentTypeChange(face, zone.id, 'image')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-r border-b -ml-px ${
                contentType === 'image'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Image
            </button>
          </div>
        </div>

        {contentType === 'text' && (
          <>
            {/* Source selection */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select
                value={element?.claim_path || (element?.static_value !== undefined ? '__static__' : '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__static__') {
                    handleElementChange(face, zone.id, 'claim_path', undefined);
                    handleElementChange(face, zone.id, 'static_value', '');
                  } else if (value.startsWith('__dynamic:')) {
                    // Dynamic metadata options
                    handleElementChange(face, zone.id, 'claim_path', value);
                    handleElementChange(face, zone.id, 'static_value', undefined);
                  } else {
                    handleElementChange(face, zone.id, 'claim_path', value || undefined);
                    handleElementChange(face, zone.id, 'static_value', undefined);
                  }
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              >
                <option value="">Select source...</option>
                <optgroup label="Credential Metadata">
                  <option value="__dynamic:credential_name">Credential Name</option>
                  <option value="__dynamic:issuer_name">Issuer Name</option>
                  <option value="__dynamic:issuer_logo">Issuer Logo URL</option>
                  <option value="__dynamic:issuance_date">Issuance Date</option>
                  <option value="__dynamic:expiration_date">Expiration Date</option>
                </optgroup>
                <optgroup label="Credential Claims">
                  {claimPaths.map((cp) => (
                    <option key={cp.path} value={cp.path}>
                      {cp.label} ({cp.path})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  <option value="__static__">Static value</option>
                </optgroup>
              </select>
            </div>

            {/* Dynamic metadata info */}
            {element?.claim_path?.startsWith('__dynamic:') && (
              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Dynamic:</strong> This value will be populated automatically at issuance time based on the credential metadata.
                </p>
              </div>
            )}

            {/* Static value input */}
            {element?.static_value !== undefined && !element?.claim_path && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Static Value</label>
                <input
                  type="text"
                  value={element?.static_value || ''}
                  onChange={(e) => handleElementChange(face, zone.id, 'static_value', e.target.value)}
                  placeholder="Enter static value..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>
            )}

            {/* Label for claim-based (non-dynamic) */}
            {element?.claim_path && !element?.claim_path.startsWith('__dynamic:') && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Label (optional)</label>
                <input
                  type="text"
                  value={element?.label || ''}
                  onChange={(e) => handleElementChange(face, zone.id, 'label', e.target.value)}
                  placeholder="e.g., Property Address"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>
            )}
          </>
        )}

        {contentType === 'image' && (
          <div className="space-y-3">
            {/* Image Source Type Toggle */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Image Source</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    // Switch to specific asset mode - clear criteria
                    handleElementChange(face, zone.id, 'asset_criteria', undefined);
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                    !element?.asset_criteria
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Specific Asset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Switch to criteria mode - clear logo_uri and set default criteria
                    handleElementChange(face, zone.id, 'logo_uri', undefined);
                    const defaultEntityType = settings?.entityTypes?.[0]?.id || 'data-furnisher';
                    handleElementChange(face, zone.id, 'asset_criteria', {
                      entityRole: defaultEntityType,
                      assetType: 'entity-logo',
                    });
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-r border-b -ml-px ${
                    element?.asset_criteria
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Dynamic Criteria
                </button>
              </div>
            </div>

            {/* Specific Asset Selection */}
            {!element?.asset_criteria && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Asset</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={element?.logo_uri || ''}
                    onChange={(e) => handleElementChange(face, zone.id, 'logo_uri', e.target.value || undefined)}
                    placeholder="https://example.com/image.png"
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => openAssetPicker(face, zone.id)}
                    className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    title="Browse Asset Library"
                  >
                    Browse
                  </button>
                </div>
                {element?.logo_uri && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={element.logo_uri}
                      alt="Preview"
                      className="w-10 h-10 object-contain border rounded bg-gray-50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-gray-500 truncate flex-1">{element.logo_uri}</span>
                    <button
                      type="button"
                      onClick={() => handleElementChange(face, zone.id, 'logo_uri', undefined)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Criteria Selection */}
            {element?.asset_criteria && (
              <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium">
                  Asset will be dynamically selected based on criteria:
                </p>

                {/* Entity Type */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Entity Type</label>
                  <select
                    value={element.asset_criteria.entityRole}
                    onChange={(e) => {
                      const newRole = e.target.value as AssetEntityRole;
                      handleElementChange(face, zone.id, 'asset_criteria', {
                        ...element.asset_criteria!,
                        entityRole: newRole,
                        // Clear data provider type if not data-furnisher
                        dataProviderType: newRole === 'data-furnisher' ? element.asset_criteria?.dataProviderType : undefined,
                      });
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                  >
                    {(settings?.entityTypes || []).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Provider Type - only for data-furnisher entity type */}
                {element.asset_criteria.entityRole === 'data-furnisher' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Data Provider Type</label>
                    <select
                      value={element.asset_criteria.dataProviderType || ''}
                      onChange={(e) => {
                        handleElementChange(face, zone.id, 'asset_criteria', {
                          ...element.asset_criteria!,
                          dataProviderType: e.target.value || undefined,
                        });
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">Any data provider</option>
                      {(settings?.dataProviderTypes || []).map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., "Identity" will show logos from identity data providers
                    </p>
                  </div>
                )}

                {/* Service Provider Type - only for service-provider entity type */}
                {element.asset_criteria.entityRole === 'service-provider' && settings?.serviceProviderTypes && settings.serviceProviderTypes.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Service Provider Type</label>
                    <select
                      value={element.asset_criteria.dataProviderType || ''}
                      onChange={(e) => {
                        handleElementChange(face, zone.id, 'asset_criteria', {
                          ...element.asset_criteria!,
                          dataProviderType: e.target.value || undefined,
                        });
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">Any service provider</option>
                      {(settings?.serviceProviderTypes || []).map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Asset Type */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Asset Type</label>
                  <select
                    value={element.asset_criteria.assetType}
                    onChange={(e) => {
                      handleElementChange(face, zone.id, 'asset_criteria', {
                        ...element.asset_criteria!,
                        assetType: e.target.value as AssetTypeOption,
                      });
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                  >
                    <option value="entity-logo">Logo</option>
                    <option value="credential-background">Credential Background</option>
                    <option value="credential-icon">Credential Icon</option>
                  </select>
                </div>

                {/* Criteria Summary */}
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <span className="text-xs text-purple-600 font-medium">
                    Rule: {getAssetCriteriaLabel(element.asset_criteria)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alignment and Size Controls */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Horizontal & Vertical Alignment Row */}
          <div className="flex gap-3">
            {/* Horizontal Alignment */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Horizontal</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'alignment', 'left')}
                  className={`flex-1 px-2 py-1.5 rounded-l-md border ${
                    alignment === 'left'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align left"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="2" y="3" width="10" height="2" />
                    <rect x="2" y="7" width="6" height="2" />
                    <rect x="2" y="11" width="8" height="2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'alignment', 'center')}
                  className={`flex-1 px-2 py-1.5 border-t border-b -ml-px ${
                    alignment === 'center'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align center"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="3" width="10" height="2" />
                    <rect x="5" y="7" width="6" height="2" />
                    <rect x="4" y="11" width="8" height="2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'alignment', 'right')}
                  className={`flex-1 px-2 py-1.5 rounded-r-md border -ml-px ${
                    alignment === 'right'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align right"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="4" y="3" width="10" height="2" />
                    <rect x="8" y="7" width="6" height="2" />
                    <rect x="6" y="11" width="8" height="2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Vertical Alignment */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Vertical</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'verticalAlignment', 'top')}
                  className={`flex-1 px-2 py-1.5 rounded-l-md border ${
                    verticalAlignment === 'top'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align top"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="2" width="10" height="2" />
                    <rect x="6" y="6" width="4" height="8" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'verticalAlignment', 'middle')}
                  className={`flex-1 px-2 py-1.5 border-t border-b -ml-px ${
                    verticalAlignment === 'middle'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align middle"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="3" y="7" width="10" height="2" />
                    <rect x="6" y="3" width="4" height="10" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'verticalAlignment', 'bottom')}
                  className={`flex-1 px-2 py-1.5 rounded-r-md border -ml-px ${
                    verticalAlignment === 'bottom'
                      ? 'bg-gray-700 text-white border-gray-700'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Align bottom"
                >
                  <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="6" y="2" width="4" height="8" />
                    <rect x="3" y="12" width="10" height="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Size and Text Wrap Row */}
          <div className="flex gap-3">
            {/* Size */}
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Size</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'scale', Math.max(0.5, scale - 0.1))}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  disabled={scale <= 0.5}
                >
                  -
                </button>
                <span className="text-xs text-gray-600 w-12 text-center">{scale.toFixed(1)}x</span>
                <button
                  type="button"
                  onClick={() => handleElementChange(face, zone.id, 'scale', Math.min(2.0, scale + 0.1))}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  disabled={scale >= 2.0}
                >
                  +
                </button>
              </div>
            </div>

            {/* Text Wrap - only for text content */}
            {contentType === 'text' && (
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Text Wrap</label>
                <div className="flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleElementChange(face, zone.id, 'textWrap', false)}
                    className={`flex-1 px-2 py-1.5 rounded-l-md border text-xs ${
                      !textWrap
                        ? 'bg-gray-700 text-white border-gray-700'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Auto-shrink: text shrinks to fit on one line"
                  >
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="2" y="7" width="12" height="2" />
                      <path d="M12 5l2 2-2 2V5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleElementChange(face, zone.id, 'textWrap', true)}
                    className={`flex-1 px-2 py-1.5 rounded-r-md border -ml-px text-xs ${
                      textWrap
                        ? 'bg-gray-700 text-white border-gray-700'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Wrap: text wraps to multiple lines"
                  >
                    <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="2" y="3" width="12" height="2" />
                      <rect x="2" y="7" width="8" height="2" />
                      <rect x="2" y="11" width="10" height="2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Front of Card - Collapsible */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setFrontExpanded(!frontExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            Front of Card ({frontZones.length} zone{frontZones.length !== 1 ? 's' : ''})
          </span>
          <span className={`transform transition-transform ${frontExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {frontExpanded && (
          <div className="p-4 space-y-3 bg-white">
            {frontZones.length > 0 ? (
              frontZones.map((zone, index) => renderZoneElement('front', zone, index))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">No zones defined for the front of this template.</p>
                <p className="text-xs mt-1">Use the Zone Template Library to add zones.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back of Card - Collapsible (hidden for front-only templates) */}
      {!template.frontOnly && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBackExpanded(!backExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Back of Card ({backZones.length} zone{backZones.length !== 1 ? 's' : ''})
            </span>
            <span className={`transform transition-transform ${backExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {backExpanded && (
            <div className="p-4 space-y-3 bg-white">
              {backZones.length > 0 ? (
                backZones.map((zone, index) => renderZoneElement('back', zone, index))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">No zones defined for the back of this template.</p>
                  <p className="text-xs mt-1">Use the Zone Template Library to add zones.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Asset Library Modal for Zone Images */}
      <AssetLibrary
        isOpen={assetPickerOpen}
        onClose={() => {
          setAssetPickerOpen(false);
          setAssetPickerZoneId(null);
        }}
        onSelect={handleAssetSelect}
        title="Select Zone Image"
      />

      {/* Reset Zone Confirmation Dialog */}
      {resetConfirmZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Reset Zone?</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to reset this zone? This will clear all configured content, images, and settings for this zone.
              </p>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setResetConfirmZone(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeResetZone(resetConfirmZone.face, resetConfirmZone.zoneId);
                  setResetConfirmZone(null);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
              >
                Reset Zone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CardElementsForm({ displayIndex }: CardElementsFormProps) {
  const currentVct = useVctStore((state) => state.currentVct);

  // Get claim paths for dropdown
  const claimPaths = currentVct.claims.map((claim) => {
    const path = '$.' + claim.path.filter((p) => p !== null && p !== undefined).join('.');
    const label = claim.display[0]?.label || path;
    return { path, label };
  });

  // Zone template state
  const selectedTemplateId = useZoneTemplateStore((state) => state.selectedTemplateId);
  const selectTemplate = useZoneTemplateStore((state) => state.selectTemplate);
  const getTemplate = useZoneTemplateStore((state) => state.getTemplate);
  const setDynamicCardElementsTemplate = useVctStore((state) => state.setDynamicCardElementsTemplate);
  const [showZoneLibrary, setShowZoneLibrary] = useState(false);

  // Handle template selection - update both zone template store and VCT
  const handleTemplateSelect = (templateId: string) => {
    selectTemplate(templateId);
    setDynamicCardElementsTemplate(displayIndex, templateId);
  };

  // Get the selected template for dynamic zone rendering
  const selectedTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-6">
      {/* Zone Template Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Zone Template
        </label>
        <ZoneTemplateSelector
          selectedTemplateId={selectedTemplateId}
          onSelect={handleTemplateSelect}
          onManageClick={() => setShowZoneLibrary(true)}
        />
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      <div>
        <h4 className="font-medium text-gray-800">Card Elements</h4>
        <p className="text-xs text-gray-500 mt-1">
          Configure the elements that appear on the front and back of the credential card.
        </p>
      </div>

      {/* Dynamic Zone Elements Form - when a template is selected */}
      {selectedTemplate ? (
        <DynamicZoneElementsForm
          template={selectedTemplate}
          displayIndex={displayIndex}
          claimPaths={claimPaths}
        />
      ) : (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-base font-medium text-gray-500">No template selected</p>
          <p className="text-sm mt-1">Select or create a zone template to configure card elements.</p>
          <button
            type="button"
            onClick={() => setShowZoneLibrary(true)}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Open Template Library
          </button>
        </div>
      )}

      {/* Zone Template Library Modal */}
      <ZoneTemplateLibrary
        isOpen={showZoneLibrary}
        onClose={() => setShowZoneLibrary(false)}
        onSelectTemplate={selectTemplate}
      />
    </div>
  );
}
