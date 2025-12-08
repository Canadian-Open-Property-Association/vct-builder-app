import { useState } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';
import { CANADIAN_REGIONS } from '../constants';

interface FurnisherListProps {
  onEditFurnisher: (id: string) => void;
}

export default function FurnisherList({ onEditFurnisher }: FurnisherListProps) {
  const furnishers = useDataCatalogueStore((state) => state.furnishers);
  const selectedFurnisher = useDataCatalogueStore((state) => state.selectedFurnisher);
  const selectFurnisher = useDataCatalogueStore((state) => state.selectFurnisher);
  const deleteFurnisher = useDataCatalogueStore((state) => state.deleteFurnisher);
  const isFurnisherLoading = useDataCatalogueStore((state) => state.isFurnisherLoading);

  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getRegionLabel = (value: string) => {
    const region = CANADIAN_REGIONS.find(r => r.value === value);
    return region?.label || value;
  };

  const filteredFurnishers = furnishers.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteFurnisher(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete furnisher:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search furnishers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Furnisher List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFurnishers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchTerm ? 'No furnishers match your search' : 'No furnishers yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFurnishers.map((furnisher) => {
              const isSelected = selectedFurnisher?.id === furnisher.id;
              return (
                <div
                  key={furnisher.id}
                  className={`group relative ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <button
                    onClick={() => selectFurnisher(furnisher.id)}
                    disabled={isFurnisherLoading}
                    className={`w-full text-left p-3 ${isFurnisherLoading ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Logo or placeholder */}
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {furnisher.logoUri ? (
                          <img
                            src={furnisher.logoUri}
                            alt={furnisher.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-gray-400 text-lg font-semibold">
                            {furnisher.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {furnisher.name}
                        </div>

                        {/* Region badges */}
                        {furnisher.regionsCovered && furnisher.regionsCovered.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {furnisher.regionsCovered.slice(0, 3).map((region) => (
                              <span
                                key={region}
                                className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                                title={getRegionLabel(region)}
                              >
                                {region}
                              </span>
                            ))}
                            {furnisher.regionsCovered.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                +{furnisher.regionsCovered.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="text-xs text-gray-500 mt-1">
                          {furnisher.stats?.dataTypeCount || 0} types · {furnisher.stats?.attributeCount || 0} attrs
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Actions on hover */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditFurnisher(furnisher.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {confirmDelete === furnisher.id ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(furnisher.id);
                          }}
                          className="p-1 text-white bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(null);
                          }}
                          className="p-1 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(furnisher.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t border-gray-200 text-xs text-gray-500 text-center">
        {filteredFurnishers.length} furnisher{filteredFurnishers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
