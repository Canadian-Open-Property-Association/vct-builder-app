/**
 * VocabPropertySelector Component
 *
 * Allows users to browse and select properties from the Data Catalogue vocabulary.
 * Properties are organized by DataType (vocabulary domain).
 */

import { useState, useEffect } from 'react';
import { fetchDataTypes, fetchCategories, cataloguePropertyToSchemaProperty, DataType, DataTypeCategory } from '../../../services/catalogueApi';
import { useSchemaStore } from '../../../store/schemaStore';

interface VocabPropertySelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VocabPropertySelector({ isOpen, onClose }: VocabPropertySelectorProps) {
  const [categories, setCategories] = useState<DataTypeCategory[]>([]);
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDataType, setSelectedDataType] = useState<DataType | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPropertyWithData = useSchemaStore((state) => state.addPropertyWithData);

  // Load categories and data types on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cats, types] = await Promise.all([
          fetchCategories(),
          fetchDataTypes(),
        ]);
        setCategories(cats);
        setDataTypes(types);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen]);

  // Filter data types by selected category
  const filteredDataTypes = selectedCategory
    ? dataTypes.filter(dt => dt.category === selectedCategory)
    : dataTypes;

  // Handle property selection toggle
  const toggleProperty = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  // Handle select all properties
  const selectAllProperties = () => {
    if (!selectedDataType) return;
    const allIds = new Set(selectedDataType.properties.map(p => p.id));
    setSelectedProperties(allIds);
  };

  // Handle deselect all
  const deselectAllProperties = () => {
    setSelectedProperties(new Set());
  };

  // Add selected properties to schema
  const handleAddProperties = () => {
    if (!selectedDataType) return;

    const propsToAdd = selectedDataType.properties.filter(p => selectedProperties.has(p.id));

    // Add properties with data in one go
    propsToAdd.forEach((prop, index) => {
      const schemaProperty = cataloguePropertyToSchemaProperty(prop, index);

      addPropertyWithData({
        name: schemaProperty.name,
        title: schemaProperty.title,
        type: schemaProperty.type as 'string' | 'number' | 'boolean' | 'object' | 'array' | 'integer',
        description: schemaProperty.description,
        required: schemaProperty.required,
        // Add JSON-LD mapping using canonical name
        jsonLd: {
          vocabTermId: prop.name, // Use canonical snake_case name
        },
      });
    });

    // Reset and close
    setSelectedProperties(new Set());
    setSelectedDataType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Add from Vocabulary</h3>
            <p className="text-sm text-gray-500">
              Select properties from the Data Catalogue vocabulary
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Categories and DataTypes */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Category Filter */}
            <div className="p-3 border-b border-gray-200">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedDataType(null);
                  setSelectedProperties(new Set());
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DataTypes List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading vocabulary...
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500 text-sm">
                  {error}
                </div>
              ) : filteredDataTypes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No data types found
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredDataTypes.map((dt) => (
                    <li
                      key={dt.id}
                      onClick={() => {
                        setSelectedDataType(dt);
                        setSelectedProperties(new Set());
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedDataType?.id === dt.id ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <div className="font-medium text-sm">{dt.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {dt.properties.length} properties
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right panel - Properties */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedDataType ? (
              <>
                {/* DataType header */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <h4 className="font-medium">{selectedDataType.name}</h4>
                  {selectedDataType.description && (
                    <p className="text-xs text-gray-500 mt-1">{selectedDataType.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={selectAllProperties}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllProperties}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                    <span className="ml-auto text-xs text-gray-500">
                      {selectedProperties.size} selected
                    </span>
                  </div>
                </div>

                {/* Properties list */}
                <div className="flex-1 overflow-y-auto p-3">
                  {selectedDataType.properties.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No properties defined for this data type
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDataType.properties.map((prop) => (
                        <li
                          key={prop.id}
                          onClick={() => toggleProperty(prop.id)}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedProperties.has(prop.id)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedProperties.has(prop.id)}
                              onChange={() => toggleProperty(prop.id)}
                              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{prop.displayName}</span>
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                  {prop.name}
                                </code>
                              </div>
                              {prop.description && (
                                <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                  {prop.valueType}
                                </span>
                                {prop.required && (
                                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                                    required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-sm">Select a data type to view properties</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleAddProperties}
            disabled={selectedProperties.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedProperties.size} {selectedProperties.size === 1 ? 'Property' : 'Properties'}
          </button>
        </div>
      </div>
    </div>
  );
}
