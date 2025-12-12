import { useState, useMemo } from 'react';
import { useDictionaryStore } from '../../../store/dictionaryStore';
import type { FlattenedProperty } from '../../../types/dictionary';
import JsonPreviewModal from './JsonPreviewModal';
import ColumnFilter from './ColumnFilter';

// Sort configuration
type SortField = 'name' | 'vocabTypeName' | 'valueType' | 'required';
type SortDirection = 'asc' | 'desc';

const VALUE_TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Yes/No',
  date: 'Date',
  datetime: 'Date & Time',
  array: 'List',
  object: 'Object',
  currency: 'Currency',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
};

interface AllPropertiesViewProps {
  onNavigateToProperty?: (vocabTypeId: string, propertyId: string) => void;
}

export default function AllPropertiesView({ onNavigateToProperty }: AllPropertiesViewProps) {
  const {
    getAllProperties,
    togglePropertyFavourite,
    isPropertyFavourite,
    selectVocabType,
  } = useDictionaryStore();

  const [search, setSearch] = useState('');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [previewProperty, setPreviewProperty] = useState<FlattenedProperty | null>(null);

  // Column filter state
  const [vocabTypeFilter, setVocabTypeFilter] = useState<Set<string>>(new Set());
  const [valueTypeFilter, setValueTypeFilter] = useState<Set<string>>(new Set());
  const [requiredFilter, setRequiredFilter] = useState<Set<string>>(new Set());

  // Get all properties from store
  const allProperties = getAllProperties();

  // Get unique values for filters
  const uniqueVocabTypes = useMemo(() => allProperties.map(p => p.vocabTypeName), [allProperties]);
  const uniqueValueTypes = useMemo(() => allProperties.map(p => p.valueType), [allProperties]);
  const uniqueRequiredValues = useMemo(() => allProperties.map(p => p.required ? 'Yes' : 'No'), [allProperties]);

  // Count values for filters
  const vocabTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allProperties.forEach(p => counts.set(p.vocabTypeName, (counts.get(p.vocabTypeName) || 0) + 1));
    return counts;
  }, [allProperties]);

  const valueTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allProperties.forEach(p => counts.set(p.valueType, (counts.get(p.valueType) || 0) + 1));
    return counts;
  }, [allProperties]);

  const requiredCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allProperties.forEach(p => {
      const key = p.required ? 'Yes' : 'No';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [allProperties]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...allProperties];

    // Filter by search
    if (search.length >= 2) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.displayName?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.vocabTypeName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by favourites
    if (showFavouritesOnly) {
      result = result.filter(p => isPropertyFavourite(p.vocabTypeId, p.id));
    }

    // Apply column filters
    if (vocabTypeFilter.size > 0) {
      result = result.filter(p => vocabTypeFilter.has(p.vocabTypeName));
    }
    if (valueTypeFilter.size > 0) {
      result = result.filter(p => valueTypeFilter.has(p.valueType));
    }
    if (requiredFilter.size > 0) {
      result = result.filter(p => requiredFilter.has(p.required ? 'Yes' : 'No'));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.displayName || a.name).localeCompare(b.displayName || b.name);
          break;
        case 'vocabTypeName':
          comparison = a.vocabTypeName.localeCompare(b.vocabTypeName);
          break;
        case 'valueType':
          comparison = a.valueType.localeCompare(b.valueType);
          break;
        case 'required':
          comparison = (a.required ? 1 : 0) - (b.required ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allProperties, search, showFavouritesOnly, vocabTypeFilter, valueTypeFilter, requiredFilter, sortField, sortDirection, isPropertyFavourite]);

  // Check if any filters are active
  const hasActiveFilters = vocabTypeFilter.size > 0 || valueTypeFilter.size > 0 || requiredFilter.size > 0;

  // Clear all column filters
  const clearAllFilters = () => {
    setVocabTypeFilter(new Set());
    setValueTypeFilter(new Set());
    setRequiredFilter(new Set());
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle favourite toggle
  const handleToggleFavourite = (e: React.MouseEvent, prop: FlattenedProperty) => {
    e.stopPropagation();
    togglePropertyFavourite(prop.vocabTypeId, prop.id);
  };

  // Handle row click - show property preview
  const handleRowClick = (prop: FlattenedProperty) => {
    setPreviewProperty(prop);
  };

  // Handle navigation to vocab type (double-click or explicit button)
  const handleNavigateToVocabType = (prop: FlattenedProperty) => {
    if (onNavigateToProperty) {
      onNavigateToProperty(prop.vocabTypeId, prop.id);
    } else {
      selectVocabType(prop.vocabTypeId);
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 ml-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Count constraints on a property
  const countConstraints = (prop: FlattenedProperty): number => {
    if (!prop.constraints) return 0;
    let count = 0;
    if (prop.constraints.enum) count++;
    if (prop.constraints.format) count++;
    if (prop.constraints.minLength !== undefined) count++;
    if (prop.constraints.maxLength !== undefined) count++;
    if (prop.constraints.minimum !== undefined) count++;
    if (prop.constraints.maximum !== undefined) count++;
    if (prop.constraints.pattern) count++;
    if (prop.constraints.precision !== undefined) count++;
    return count;
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Properties</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredProperties.length} of {allProperties.length} properties
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="ml-2 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Show Favourites Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFavouritesOnly}
              onChange={(e) => setShowFavouritesOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Show Favourites Only
            </span>
          </label>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      {filteredProperties.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">
              {showFavouritesOnly ? 'No favourite properties' : 'No properties found'}
            </p>
            <p className="text-sm mt-1">
              {showFavouritesOnly
                ? 'Star properties to add them to your favourites'
                : search ? 'Try a different search term' : 'Create vocab types with properties to see them here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-3 w-10"></th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    <SortIndicator field="name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('vocabTypeName')}
                    >
                      Vocab Type
                    </span>
                    <SortIndicator field="vocabTypeName" />
                    <ColumnFilter
                      label=""
                      values={uniqueVocabTypes}
                      selectedValues={vocabTypeFilter}
                      onSelectionChange={setVocabTypeFilter}
                      valueCounts={vocabTypeCounts}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('valueType')}
                    >
                      Type
                    </span>
                    <SortIndicator field="valueType" />
                    <ColumnFilter
                      label=""
                      values={uniqueValueTypes}
                      selectedValues={valueTypeFilter}
                      onSelectionChange={setValueTypeFilter}
                      valueFormatter={(v) => VALUE_TYPE_LABELS[v] || v}
                      valueCounts={valueTypeCounts}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('required')}
                    >
                      Required
                    </span>
                    <SortIndicator field="required" />
                    <ColumnFilter
                      label=""
                      values={uniqueRequiredValues}
                      selectedValues={requiredFilter}
                      onSelectionChange={setRequiredFilter}
                      valueCounts={requiredCounts}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Constraints
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProperties.map((prop) => {
                const isFavourite = isPropertyFavourite(prop.vocabTypeId, prop.id);
                const constraintCount = countConstraints(prop);

                return (
                  <tr
                    key={prop.fullId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(prop)}
                  >
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleFavourite(e, prop)}
                        className={`p-0.5 transition-colors ${
                          isFavourite
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-300 hover:text-yellow-500'
                        }`}
                        title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={isFavourite ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-800">{prop.displayName}</span>
                        <span className="text-xs text-gray-400 ml-2 font-mono">{prop.name}</span>
                      </div>
                      {prop.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{prop.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleNavigateToVocabType(prop)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                        title="Go to vocab type"
                      >
                        {prop.vocabTypeName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {VALUE_TYPE_LABELS[prop.valueType] || prop.valueType}
                    </td>
                    <td className="px-4 py-3">
                      {prop.required ? (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          Required
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {constraintCount > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {constraintCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleNavigateToVocabType(prop)}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Go to vocab type"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Property Detail Modal */}
      {previewProperty && (
        <JsonPreviewModal
          property={previewProperty}
          vocabTypeName={previewProperty.vocabTypeName}
          onClose={() => setPreviewProperty(null)}
        />
      )}
    </div>
  );
}
