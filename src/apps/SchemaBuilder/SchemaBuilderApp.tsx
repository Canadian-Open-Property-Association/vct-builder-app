import { useEffect, useState } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import { useAppTracking } from '../../hooks/useAppTracking';
import SchemaToolbar from './components/SchemaToolbar';
import SchemaInfoTab from './components/SchemaInfoTab';
import PropertiesTab from './components/PropertiesTab';
import SchemaJsonPreview from './components/SchemaJsonPreview';
import NewSchemaModal from './components/NewSchemaModal';
import { SchemaMode } from '../../types/vocabulary';

type SchemaTab = 'info' | 'properties';

export default function SchemaBuilderApp() {
  // Track app access
  useAppTracking('schema-builder', 'Schema Builder');

  const [activeTab, setActiveTab] = useState<SchemaTab>('info');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const fetchGovernanceDocs = useSchemaStore((state) => state.fetchGovernanceDocs);
  const mode = useSchemaStore((state) => state.metadata.mode);
  const title = useSchemaStore((state) => state.metadata.title);
  const properties = useSchemaStore((state) => state.properties);
  const currentProjectId = useSchemaStore((state) => state.currentProjectId);
  const savedProjects = useSchemaStore((state) => state.savedProjects);
  const newSchema = useSchemaStore((state) => state.newSchema);
  const updateMetadata = useSchemaStore((state) => state.updateMetadata);
  const loadSchema = useSchemaStore((state) => state.loadSchema);
  const deleteSchema = useSchemaStore((state) => state.deleteSchema);
  const isDirty = useSchemaStore((state) => state.isDirty);

  // Fetch governance docs on mount
  useEffect(() => {
    fetchGovernanceDocs();
  }, [fetchGovernanceDocs]);

  const isJsonLdMode = mode === 'jsonld-context'; // mode defaults to 'json-schema'

  // Determine if we have an active schema (either loaded or with content)
  const hasActiveSchema = Boolean(currentProjectId || title.trim() || properties.length > 0);

  const handleNewSchemaSelect = (selectedMode: SchemaMode) => {
    newSchema();
    updateMetadata({ mode: selectedMode });
    setShowNewModal(false);
  };

  const handleLoad = (id: string) => {
    if (isDirty && !confirm('You have unsaved changes. Load anyway?')) {
      return;
    }
    loadSchema(id);
    setShowLoadModal(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this schema project?')) {
      await deleteSchema(id);
    }
  };

  // Show welcome screen if no active schema
  if (!hasActiveSchema) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        {/* Minimal Toolbar */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
          <h1 className="text-lg font-semibold text-gray-800">Schema Builder</h1>
        </div>

        {/* Welcome Screen */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="mb-8">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to Schema Builder</h2>
              <p className="text-gray-500">Create JSON Schemas for SD-JWT credentials or JSON-LD Contexts</p>
            </div>

            <div className="flex gap-4 justify-center">
              {/* Create New */}
              <button
                onClick={() => setShowNewModal(true)}
                className="flex flex-col items-center gap-3 px-8 py-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <span className="block font-medium text-gray-800">Create New</span>
                  <span className="text-sm text-gray-500">Start fresh</span>
                </div>
              </button>

              {/* Open Existing */}
              <button
                onClick={() => setShowLoadModal(true)}
                className="flex flex-col items-center gap-3 px-8 py-6 bg-white border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="block font-medium text-gray-800">Open Existing</span>
                  <span className="text-sm text-gray-500">{savedProjects.length} saved project{savedProjects.length !== 1 ? 's' : ''}</span>
                </div>
              </button>
            </div>
          </div>
        </main>

        {/* New Schema Modal */}
        <NewSchemaModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onSelect={handleNewSchemaSelect}
        />

        {/* Load Modal */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Open Schema Project</h3>
              {savedProjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No saved projects yet.</p>
              ) : (
                <ul className="space-y-2">
                  {savedProjects.map((project) => (
                    <li
                      key={project.id}
                      onClick={() => handleLoad(project.id)}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <SchemaToolbar />

      {/* Main Content - Two Panel Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tabbed Config */}
        <div className="w-1/2 border-r border-gray-300 bg-white flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-white shrink-0">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Schema Info
              </span>
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'properties'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Credential Properties
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'info' && <SchemaInfoTab />}
            {activeTab === 'properties' && <PropertiesTab />}
          </div>
        </div>

        {/* Right Panel - JSON Preview */}
        <div className="w-1/2 bg-gray-900 flex flex-col overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <h2 className="text-white font-medium text-sm">
              {isJsonLdMode ? 'JSON-LD Context' : 'JSON Schema'}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <SchemaJsonPreview />
          </div>
        </div>
      </main>
    </div>
  );
}
