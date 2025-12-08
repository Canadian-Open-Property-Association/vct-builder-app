import { useState } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';
import { DataTypeWithAttributes } from '../../../types/catalogue';
import DataTypeForm from './DataTypeForm';
import AttributeForm from './AttributeForm';

export default function DataTypeTree() {
  const selectedFurnisher = useDataCatalogueStore((state) => state.selectedFurnisher);
  const selection = useDataCatalogueStore((state) => state.selection);
  const setSelection = useDataCatalogueStore((state) => state.setSelection);
  const deleteDataType = useDataCatalogueStore((state) => state.deleteDataType);
  const deleteAttribute = useDataCatalogueStore((state) => state.deleteAttribute);

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showDataTypeForm, setShowDataTypeForm] = useState(false);
  const [editingDataType, setEditingDataType] = useState<DataTypeWithAttributes | null>(null);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<{ dataTypeId: string; attributeId?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'dataType' | 'attribute'; id: string } | null>(null);

  const toggleExpanded = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const handleSelectDataType = (dataType: DataTypeWithAttributes) => {
    setSelection({
      type: 'dataType',
      furnisherId: selectedFurnisher!.id,
      dataTypeId: dataType.id,
    });
    // Auto-expand when selected
    setExpandedTypes(prev => new Set([...prev, dataType.id]));
  };

  const handleSelectAttribute = (dataTypeId: string, attributeId: string) => {
    setSelection({
      type: 'attribute',
      furnisherId: selectedFurnisher!.id,
      dataTypeId,
      attributeId,
    });
  };

  const handleAddDataType = () => {
    setEditingDataType(null);
    setShowDataTypeForm(true);
  };

  const handleEditDataType = (dataType: DataTypeWithAttributes) => {
    setEditingDataType(dataType);
    setShowDataTypeForm(true);
  };

  const handleAddAttribute = (dataTypeId: string) => {
    setEditingAttribute({ dataTypeId });
    setShowAttributeForm(true);
  };

  const handleEditAttribute = (dataTypeId: string, attributeId: string) => {
    setEditingAttribute({ dataTypeId, attributeId });
    setShowAttributeForm(true);
  };

  const handleDeleteDataType = async (id: string) => {
    try {
      await deleteDataType(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete data type:', err);
    }
  };

  const handleDeleteAttribute = async (id: string) => {
    try {
      await deleteAttribute(id);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete attribute:', err);
    }
  };

  if (!selectedFurnisher) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-gray-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <p className="text-sm">Select a furnisher to view data types</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-700 text-sm">Data Types</h3>
        <button
          onClick={handleAddDataType}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Type
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {selectedFurnisher.dataTypes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No data types yet. Add one to get started.
          </div>
        ) : (
          <div className="py-1">
            {selectedFurnisher.dataTypes.map((dataType) => {
              const isExpanded = expandedTypes.has(dataType.id);
              const isTypeSelected = selection?.type === 'dataType' && selection.dataTypeId === dataType.id;

              return (
                <div key={dataType.id}>
                  {/* Data Type Row */}
                  <div
                    className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer ${
                      isTypeSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpanded(dataType.id)}
                      className="p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleSelectDataType(dataType)}
                      className={`flex-1 text-left text-sm truncate ${
                        isTypeSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {dataType.name}
                    </button>

                    <span className="text-xs text-gray-400 mr-1">
                      {dataType.attributes?.length || 0}
                    </span>

                    {/* Actions */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={() => handleAddAttribute(dataType.id)}
                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Add attribute"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditDataType(dataType)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {confirmDelete?.type === 'dataType' && confirmDelete.id === dataType.id ? (
                        <>
                          <button
                            onClick={() => handleDeleteDataType(dataType.id)}
                            className="p-1 text-white bg-red-600 hover:bg-red-700 rounded text-[10px]"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="p-1 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded text-[10px]"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete({ type: 'dataType', id: dataType.id })}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attributes */}
                  {isExpanded && dataType.attributes && dataType.attributes.length > 0 && (
                    <div className="ml-6 border-l border-gray-200">
                      {dataType.attributes.map((attr) => {
                        const isAttrSelected =
                          selection?.type === 'attribute' &&
                          selection.dataTypeId === dataType.id &&
                          selection.attributeId === attr.id;

                        return (
                          <div
                            key={attr.id}
                            className={`group flex items-center gap-2 pl-3 pr-2 py-1 cursor-pointer ${
                              isAttrSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <button
                              onClick={() => handleSelectAttribute(dataType.id, attr.id)}
                              className={`flex-1 text-left text-sm truncate ${
                                isAttrSelected ? 'text-blue-700 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {attr.name}
                            </button>

                            <span className="text-[10px] text-gray-400 px-1 py-0.5 bg-gray-100 rounded">
                              {attr.dataType}
                            </span>

                            {/* Actions */}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                onClick={() => handleEditAttribute(dataType.id, attr.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {confirmDelete?.type === 'attribute' && confirmDelete.id === attr.id ? (
                                <>
                                  <button
                                    onClick={() => handleDeleteAttribute(attr.id)}
                                    className="p-0.5 text-white bg-red-600 hover:bg-red-700 rounded text-[10px]"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="p-0.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded text-[10px]"
                                  >
                                    No
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete({ type: 'attribute', id: attr.id })}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                  {/* Empty state for expanded type with no attributes */}
                  {isExpanded && (!dataType.attributes || dataType.attributes.length === 0) && (
                    <div className="ml-6 pl-3 py-2 text-xs text-gray-400 border-l border-gray-200">
                      No attributes.{' '}
                      <button
                        onClick={() => handleAddAttribute(dataType.id)}
                        className="text-blue-600 hover:underline"
                      >
                        Add one
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Type Form Modal */}
      {showDataTypeForm && (
        <DataTypeForm
          furnisherId={selectedFurnisher.id}
          dataType={editingDataType}
          onClose={() => {
            setShowDataTypeForm(false);
            setEditingDataType(null);
          }}
        />
      )}

      {/* Attribute Form Modal */}
      {showAttributeForm && editingAttribute && (
        <AttributeForm
          dataTypeId={editingAttribute.dataTypeId}
          attributeId={editingAttribute.attributeId}
          onClose={() => {
            setShowAttributeForm(false);
            setEditingAttribute(null);
          }}
        />
      )}
    </div>
  );
}
