import { useState, useMemo, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import type { Entity, DataProviderType } from '../../../types/entity';
import { DATA_PROVIDER_TYPE_CONFIG, ALL_DATA_PROVIDER_TYPES } from '../../../types/entity';
import { CANADIAN_REGIONS, getRegionName, normalizeRegions } from '../../../constants/regions';
import { useFurnisherSettingsStore } from '../../../store/furnisherSettingsStore';
import { useLogoStore } from '../../../store/logoStore';
import EntityList from './EntityList';

// Excel-style filter dropdown component
interface FilterDropdownProps {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  colorScheme?: 'purple' | 'blue';
}

function FilterDropdown({ label, options, selected, onSelectionChange, colorScheme = 'blue' }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;
  const someSelected = !allSelected && !noneSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(options.map(o => o.id));
    }
  };

  const handleToggleItem = (id: string) => {
    if (selected.includes(id)) {
      onSelectionChange(selected.filter(s => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  const colors = colorScheme === 'purple' ? {
    bg: 'bg-purple-500',
    bgHover: 'hover:bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-500',
    check: 'text-purple-600',
  } : {
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-500',
    check: 'text-blue-600',
  };

  const displayText = noneSelected
    ? `All ${label}`
    : allSelected
    ? `All ${label}`
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.label || selected[0]
    : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors ${
          someSelected
            ? `${colors.bg} text-white ${colors.border}`
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className="truncate max-w-[150px]">{displayText}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-64 overflow-y-auto">
          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              allSelected ? `${colors.bg} border-transparent` : someSelected ? `${colors.bg} border-transparent` : 'border-gray-300'
            }`}>
              {allSelected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {someSelected && (
                <div className="w-2 h-0.5 bg-white rounded" />
              )}
            </div>
            <span className="font-medium">(Select All)</span>
          </button>

          {/* Individual items */}
          {options.map(option => {
            const isChecked = selected.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleToggleItem(option.id)}
                className={`w-full px-3 py-2 text-left text-sm ${colors.bgHover} flex items-center gap-2`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isChecked ? `${colors.bg} border-transparent` : 'border-gray-300'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Canada TopoJSON - using a more reliable source
const CANADA_TOPO_URL = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson';

// Map province names from GeoJSON to codes
const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  'Alberta': 'AB',
  'British Columbia': 'BC',
  'Manitoba': 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  'Northwest Territories': 'NT',
  'Nunavut': 'NU',
  'Ontario': 'ON',
  'Prince Edward Island': 'PE',
  'Quebec': 'QC',
  'Saskatchewan': 'SK',
  'Yukon Territory': 'YT',
  'Yukon': 'YT',
};

interface MapViewProps {
  entities: Entity[];
  onSelectEntity: (entityId: string) => void;
  onAddEntity: () => void;
}

export default function MapView({ entities, onSelectEntity, onAddEntity }: MapViewProps) {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<DataProviderType[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { settings } = useFurnisherSettingsStore();
  const { fetchLogos, getLogoUrl: getLogoFromStore } = useLogoStore();

  // Get selected entity
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    return entities.find(e => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

  // Get provinces covered by selected entity
  const selectedEntityProvinces = useMemo(() => {
    if (!selectedEntity) return new Set<string>();
    return new Set(normalizeRegions(selectedEntity.regionsCovered));
  }, [selectedEntity]);

  // Fetch logos from shared store
  useEffect(() => {
    fetchLogos();
  }, [entities, fetchLogos]);

  // Get logo URL for an entity
  const getLogoUrl = (entity: Entity): string | null => {
    return getLogoFromStore(entity.id, entity.logoUri);
  };

  // Get data provider types from settings or fallback
  const dataProviderTypes = useMemo(() => {
    if (settings?.dataProviderTypes) {
      return settings.dataProviderTypes;
    }
    return ALL_DATA_PROVIDER_TYPES.map(id => ({
      id,
      label: DATA_PROVIDER_TYPE_CONFIG[id]?.label || id,
    }));
  }, [settings]);

  // Filter entities by search, entity types, and data provider types
  const filteredEntities = useMemo(() => {
    let result = entities;

    // Filter by search query
    if (searchQuery && searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.id.toLowerCase().includes(query)
      );
    }

    // Filter by entity types (entity matches if ANY of its types are in the selected list)
    if (selectedEntityTypes.length > 0) {
      result = result.filter(e =>
        e.entityTypes?.some(t => selectedEntityTypes.includes(t))
      );
    }

    // Filter by data provider types
    if (selectedDataTypes.length > 0) {
      result = result.filter(e =>
        e.dataProviderTypes?.some(t => selectedDataTypes.includes(t))
      );
    }

    return result;
  }, [entities, searchQuery, selectedEntityTypes, selectedDataTypes]);

  // Count furnishers per province
  const provinceCount = useMemo(() => {
    const counts: Record<string, number> = {};
    CANADIAN_REGIONS.forEach(r => counts[r.code] = 0);

    filteredEntities.forEach(entity => {
      const regions = normalizeRegions(entity.regionsCovered);
      regions.forEach(region => {
        counts[region] = (counts[region] || 0) + 1;
      });
    });

    return counts;
  }, [filteredEntities]);

  // Get furnishers for selected province and sort alphabetically
  const provinceFurnishers = useMemo(() => {
    const filtered = !selectedProvince
      ? filteredEntities
      : filteredEntities.filter(e => normalizeRegions(e.regionsCovered).includes(selectedProvince));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEntities, selectedProvince]);

  // Get max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(provinceCount));
  }, [provinceCount]);

  // 8-color scale from gray to green
  const COLOR_SCALE = [
    '#e5e7eb', // gray-200 (0 furnishers)
    '#d1fae5', // emerald-100
    '#a7f3d0', // emerald-200
    '#6ee7b7', // emerald-300
    '#34d399', // emerald-400
    '#10b981', // emerald-500
    '#059669', // emerald-600
    '#047857', // emerald-700
  ];

  // Get color based on count using 8-step scale
  const getProvinceColor = (code: string) => {
    const count = provinceCount[code] || 0;
    if (count === 0) return COLOR_SCALE[0];

    // Calculate which color bucket this count falls into (1-7)
    const bucketSize = maxCount / 7;
    const bucket = Math.min(Math.ceil(count / bucketSize), 7);
    return COLOR_SCALE[bucket];
  };

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Left Panel - Entity List (using shared component) */}
      <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <EntityList
          onAddEntity={onAddEntity}
          externalEntities={provinceFurnishers}
          externalSearchQuery={searchQuery}
          onExternalSearchChange={setSearchQuery}
          externalSelectedId={selectedEntityId}
          onExternalSelectEntity={setSelectedEntityId}
          filterLabel={selectedProvince ? getRegionName(selectedProvince) : undefined}
          onClearFilter={selectedProvince ? () => setSelectedProvince(null) : undefined}
        />
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Map Header with Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">Coverage Map</h3>
              <p className="text-sm text-gray-500">Click a province to filter entities</p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Coverage:</span>
              <div className="flex items-center gap-0.5">
                {COLOR_SCALE.map((color, i) => (
                  <div key={i} className="w-3 h-4 first:rounded-l last:rounded-r" style={{ background: color }} />
                ))}
              </div>
              <span className="text-xs text-gray-500">None → High</span>
            </div>
          </div>
          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Entity Type Filter */}
            {settings?.entityTypes && settings.entityTypes.length > 0 && (
              <FilterDropdown
                label="Entity Types"
                options={settings.entityTypes.map(t => ({ id: t.id, label: t.label }))}
                selected={selectedEntityTypes}
                onSelectionChange={setSelectedEntityTypes}
                colorScheme="purple"
              />
            )}

            {/* Data Provider Type Filter */}
            <FilterDropdown
              label="Data Types"
              options={dataProviderTypes.map(t => ({ id: t.id, label: t.label }))}
              selected={selectedDataTypes}
              onSelectionChange={(ids) => setSelectedDataTypes(ids as DataProviderType[])}
              colorScheme="blue"
            />

            {/* Clear filters button */}
            {(selectedDataTypes.length > 0 || selectedEntityTypes.length > 0 || selectedProvince || selectedEntityId) && (
              <button
                onClick={() => {
                  setSelectedDataTypes([]);
                  setSelectedEntityTypes([]);
                  setSelectedProvince(null);
                  setSelectedEntityId(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div
          className="flex-1 bg-gradient-to-b from-blue-50 to-blue-100 relative min-h-0"
          onClick={(e) => {
            // Only deselect if clicking directly on the map container (not on a province)
            if (e.target === e.currentTarget) {
              setSelectedProvince(null);
              setSelectedEntityId(null);
            }
          }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: [-95, 60],
              scale: 400,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup center={[-95, 60]} zoom={1} minZoom={0.8} maxZoom={4}>
              {/* Background rect to capture clicks outside provinces */}
              <rect
                x="-1000"
                y="-1000"
                width="3000"
                height="3000"
                fill="transparent"
                onClick={() => {
                  setSelectedProvince(null);
                  setSelectedEntityId(null);
                }}
              />
              <Geographies geography={CANADA_TOPO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const provinceName = (geo.properties.name || geo.properties.NAME || '') as string;
                    const code = PROVINCE_NAME_TO_CODE[provinceName];
                    const isProvinceSelected = selectedProvince === code;
                    const isEntityCovered = selectedEntityProvinces.has(code);
                    const entityColor = selectedEntity?.primaryColor || '#f59e0b';

                    // Determine fill color based on selection state
                    const getFillColor = () => {
                      if (isEntityCovered) return entityColor;
                      if (isProvinceSelected) return '#3b82f6';
                      return getProvinceColor(code);
                    };

                    const getHoverColor = () => {
                      if (isEntityCovered) return entityColor;
                      if (isProvinceSelected) return '#2563eb';
                      return '#93c5fd';
                    };

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => {
                          if (selectedEntityId) {
                            // If entity is selected, clicking a province deselects the entity
                            setSelectedEntityId(null);
                          } else {
                            setSelectedProvince(isProvinceSelected ? null : code);
                          }
                        }}
                        style={{
                          default: {
                            fill: getFillColor(),
                            stroke: isEntityCovered ? '#ffffff' : '#ffffff',
                            strokeWidth: isEntityCovered ? 1.5 : 0.75,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          hover: {
                            fill: getHoverColor(),
                            stroke: '#ffffff',
                            strokeWidth: isEntityCovered ? 1.5 : 0.75,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: isEntityCovered ? entityColor : '#3b82f6',
                            stroke: '#ffffff',
                            strokeWidth: isEntityCovered ? 1.5 : 0.75,
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Province Info Tooltip - only show when no entity is selected */}
          {selectedProvince && !selectedEntityId && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 z-10">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium text-gray-900">{getRegionName(selectedProvince)}</div>
                  <div className="text-sm text-gray-500">
                    {provinceCount[selectedProvince] || 0} entit{(provinceCount[selectedProvince] || 0) !== 1 ? 'ies' : 'y'}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProvince(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Selected Entity Bubble - compact floating card */}
          {selectedEntity && (
            <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 z-10 max-w-[280px]">
              <div className="p-3">
                <div className="flex items-center gap-2.5">
                  {/* Logo */}
                  {getLogoUrl(selectedEntity) ? (
                    <img
                      src={getLogoUrl(selectedEntity)!}
                      alt=""
                      className="w-9 h-9 object-contain rounded-lg bg-gray-50 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: selectedEntity.primaryColor || '#6b7280' }}
                    >
                      {selectedEntity.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{selectedEntity.name}</h4>
                    <p className="text-xs text-gray-500">
                      {selectedEntityProvinces.size} province{selectedEntityProvinces.size !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onSelectEntity(selectedEntity.id)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedEntityId(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Close"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
