import { useState } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';

interface CatalogueToolbarProps {
  onAddFurnisher: () => void;
  onImport: () => void;
  onExport: () => void;
}

export default function CatalogueToolbar({
  onAddFurnisher,
  onImport,
  onExport,
}: CatalogueToolbarProps) {
  const searchQuery = useDataCatalogueStore((state) => state.searchQuery);
  const setSearchQuery = useDataCatalogueStore((state) => state.setSearchQuery);
  const search = useDataCatalogueStore((state) => state.search);
  const searchResults = useDataCatalogueStore((state) => state.searchResults);
  const clearSearch = useDataCatalogueStore((state) => state.clearSearch);
  const selectFurnisher = useDataCatalogueStore((state) => state.selectFurnisher);
  const setSelection = useDataCatalogueStore((state) => state.setSelection);

  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      await search(value);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleClearSearch = () => {
    clearSearch();
    setShowSearchResults(false);
  };

  const handleSelectSearchResult = async (
    type: 'furnisher' | 'dataType' | 'attribute',
    furnisherId: string,
    dataTypeId?: string,
    attributeId?: string
  ) => {
    await selectFurnisher(furnisherId);

    if (type === 'dataType' && dataTypeId) {
      setSelection({
        type: 'dataType',
        furnisherId,
        dataTypeId,
      });
    } else if (type === 'attribute' && dataTypeId && attributeId) {
      setSelection({
        type: 'attribute',
        furnisherId,
        dataTypeId,
        attributeId,
      });
    }

    setShowSearchResults(false);
    clearSearch();
  };

  const totalResults = searchResults
    ? searchResults.furnishers.length +
      searchResults.dataTypes.length +
      searchResults.attributes.length
    : 0;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddFurnisher}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Furnisher
          </button>

          <button
            onClick={onImport}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import JSON
          </button>

          <button
            onClick={onExport}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>

        {/* Right side - Search */}
        <div className="relative w-80">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
              placeholder="Search furnishers, types, attributes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {totalResults === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <>
                  {/* Furnishers */}
                  {searchResults.furnishers.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                        Furnishers
                      </div>
                      {searchResults.furnishers.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleSelectSearchResult('furnisher', f.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                            {f.name.charAt(0)}
                          </span>
                          <span className="text-gray-800">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Data Types */}
                  {searchResults.dataTypes.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                        Data Types
                      </div>
                      {searchResults.dataTypes.map((dt) => (
                        <button
                          key={dt.id}
                          onClick={() => handleSelectSearchResult('dataType', dt.furnisherId, dt.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                        >
                          <span className="text-gray-800">{dt.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Attributes */}
                  {searchResults.attributes.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                        Attributes
                      </div>
                      {searchResults.attributes.map((attr) => (
                        <button
                          key={attr.id}
                          onClick={() =>
                            handleSelectSearchResult('attribute', (attr as { furnisherId?: string }).furnisherId || '', attr.dataTypeId, attr.id)
                          }
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
                        >
                          <span className="text-gray-800">{attr.name}</span>
                          <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                            {attr.dataType}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler for search results */}
      {showSearchResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSearchResults(false)}
        />
      )}
    </div>
  );
}
