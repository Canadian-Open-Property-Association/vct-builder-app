import { useEffect, useState } from 'react';
import { useEntityStore } from '../../store/entityStore';
import { useHarmonizationStore } from '../../store/harmonizationStore';
import { useFurnisherSettingsStore } from '../../store/furnisherSettingsStore';
import EntityList from './components/EntityList';
import EntityDetail from './components/EntityDetail';
import EntityForm from './components/EntityForm';
import EntityToolbar from './components/EntityToolbar';
import SaveToRepoModal from './components/SaveToRepoModal';
import SettingsModal from './components/SettingsModal';
import MapView from './components/MapView';

type ViewMode = 'list' | 'map';

export default function EntityManagerApp() {
  const {
    entities,
    fetchEntities,
    selectedEntity,
    selectEntity,
    isLoading,
    error,
    exportAll,
  } = useEntityStore();

  const { fetchFieldFavourites } = useHarmonizationStore();
  const { fetchSettings } = useFurnisherSettingsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [showSaveToRepoModal, setShowSaveToRepoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    fetchEntities();
    fetchFieldFavourites();
    fetchSettings();
  }, [fetchEntities, fetchFieldFavourites, fetchSettings]);

  const handleAddEntity = () => {
    setEditingEntityId(null);
    setShowEntityForm(true);
  };

  const handleEditEntity = (id: string) => {
    setEditingEntityId(id);
    setShowEntityForm(true);
  };

  const handleEntityCreated = (entityId: string) => {
    selectEntity(entityId);
  };

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entities-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const renderDetailPanel = () => {
    if (!selectedEntity) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg font-medium">Select a furnisher</p>
            <p className="text-sm mt-1">Choose a data furnisher to view details</p>
          </div>
        </div>
      );
    }

    return (
      <EntityDetail
        entity={selectedEntity}
        onEdit={() => handleEditEntity(selectedEntity.id)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-medium">Error loading entities</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchEntities()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Handle map view entity selection - switch to list view and select entity
  const handleMapSelectEntity = (entityId: string) => {
    selectEntity(entityId);
    setViewMode('list');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar with View Toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'map'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </span>
          </button>
        </div>

        {/* Actions */}
        <EntityToolbar
          onExport={handleExport}
          onSaveToRepo={() => setShowSaveToRepoModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      </div>

      {/* Main Content - List or Map View */}
      {viewMode === 'list' ? (
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          {/* Left Panel - Entity List */}
          <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <EntityList onEditEntity={handleEditEntity} onAddEntity={handleAddEntity} />
          </div>

          {/* Right Panel - Detail View */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-y-auto">
            {renderDetailPanel()}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MapView entities={entities} onSelectEntity={handleMapSelectEntity} />
        </div>
      )}

      {/* Entity Form Modal */}
      {showEntityForm && (
        <EntityForm
          entityId={editingEntityId}
          onClose={() => {
            setShowEntityForm(false);
            setEditingEntityId(null);
          }}
          onCreated={handleEntityCreated}
        />
      )}

      {/* Save to Repo Modal */}
      {showSaveToRepoModal && (
        <SaveToRepoModal
          selectedEntityId={selectedEntity?.id}
          onClose={() => setShowSaveToRepoModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}
