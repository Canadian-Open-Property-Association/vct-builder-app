import { useEffect, useState } from 'react';
import { useDataCatalogueStore } from '../../store/dataCatalogueStore';
import FurnisherList from './components/FurnisherList';
import FurnisherCard from './components/FurnisherCard';
import DataTypeTree from './components/DataTypeTree';
import AttributeDetail from './components/AttributeDetail';
import FurnisherForm from './components/FurnisherForm';
import ImportModal from './components/ImportModal';
import CatalogueToolbar from './components/CatalogueToolbar';

export default function DataCatalogueApp() {
  const {
    fetchFurnishers,
    selectedFurnisher,
    selection,
    isLoading,
    error,
    exportAll,
  } = useDataCatalogueStore();

  const [showFurnisherForm, setShowFurnisherForm] = useState(false);
  const [editingFurnisherId, setEditingFurnisherId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchFurnishers();
  }, [fetchFurnishers]);

  const handleAddFurnisher = () => {
    setEditingFurnisherId(null);
    setShowFurnisherForm(true);
  };

  const handleEditFurnisher = (id: string) => {
    setEditingFurnisherId(id);
    setShowFurnisherForm(true);
  };

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-catalogue-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const renderDetailPanel = () => {
    if (!selection) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium">Select an item</p>
            <p className="text-sm mt-1">Choose a furnisher, data type, or attribute to view details</p>
          </div>
        </div>
      );
    }

    if (selection.type === 'furnisher' && selectedFurnisher) {
      return (
        <FurnisherCard
          furnisher={selectedFurnisher}
          onEdit={() => handleEditFurnisher(selectedFurnisher.id)}
        />
      );
    }

    if (selection.type === 'dataType' && selectedFurnisher && selection.dataTypeId) {
      const dataType = selectedFurnisher.dataTypes.find(dt => dt.id === selection.dataTypeId);
      if (dataType) {
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{dataType.name}</h3>
            {dataType.description && (
              <p className="text-gray-600 mb-4">{dataType.description}</p>
            )}
            <div className="text-sm text-gray-500">
              <p>{dataType.attributes?.length || 0} attributes</p>
            </div>
          </div>
        );
      }
    }

    if (selection.type === 'attribute' && selectedFurnisher && selection.dataTypeId && selection.attributeId) {
      const dataType = selectedFurnisher.dataTypes.find(dt => dt.id === selection.dataTypeId);
      const attribute = dataType?.attributes?.find(attr => attr.id === selection.attributeId);
      if (attribute) {
        return <AttributeDetail attribute={attribute} dataType={dataType!} />;
      }
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading catalogue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-medium">Error loading catalogue</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchFurnishers()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <CatalogueToolbar
        onAddFurnisher={handleAddFurnisher}
        onImport={() => setShowImportModal(true)}
        onExport={handleExport}
      />

      {/* Main 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Furnisher List */}
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
          <FurnisherList onEditFurnisher={handleEditFurnisher} />
        </div>

        {/* Middle Panel - Data Type / Attribute Tree */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <DataTypeTree />
        </div>

        {/* Right Panel - Detail View */}
        <div className="flex-1 bg-white flex flex-col overflow-y-auto">
          {renderDetailPanel()}
        </div>
      </div>

      {/* Furnisher Form Modal */}
      {showFurnisherForm && (
        <FurnisherForm
          furnisherId={editingFurnisherId}
          onClose={() => {
            setShowFurnisherForm(false);
            setEditingFurnisherId(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}
