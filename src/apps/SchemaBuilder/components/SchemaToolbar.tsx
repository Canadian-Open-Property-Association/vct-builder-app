import { useState } from 'react';
import { useSchemaStore } from '../../../store/schemaStore';
import { useAuthStore } from '../../../store/authStore';
import SaveSchemaToRepoModal from './SaveSchemaToRepoModal';
import NewSchemaModal from './NewSchemaModal';
import { SchemaMode } from '../../../types/vocabulary';

export default function SchemaToolbar() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveToRepoModal, setShowSaveToRepoModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    currentProjectName,
    currentProjectId,
    isDirty,
    savedProjects,
    metadata,
    newSchema,
    saveSchema,
    loadSchema,
    deleteSchema,
    updateMetadata,
  } = useSchemaStore();

  const isJsonLdMode = metadata.mode === 'jsonld-context';

  const handleNew = () => {
    if (isDirty && !confirm('You have unsaved changes. Create new schema anyway?')) {
      return;
    }
    setShowNewModal(true);
  };

  const handleNewSchemaSelect = (mode: SchemaMode) => {
    newSchema();
    updateMetadata({ mode });
  };

  const handleSave = async () => {
    if (currentProjectId) {
      await saveSchema(currentProjectName);
    } else {
      setSaveName(currentProjectName);
      setShowSaveModal(true);
    }
  };

  const handleConfirmSave = async () => {
    if (saveName.trim()) {
      await saveSchema(saveName.trim());
      setShowSaveModal(false);
      setSaveName('');
    }
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

  return (
    <>
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        {/* New */}
        <button
          onClick={handleNew}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>

        {/* Load */}
        <button
          onClick={() => setShowLoadModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Open
        </button>

        {/* Format Badge */}
        <div className="w-px h-6 bg-gray-300 mx-2" />
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            isJsonLdMode
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}
        >
          {isJsonLdMode ? 'JSON-LD Context' : 'SD-JWT Schema'}
        </span>

        {/* Save to Repo - only for authenticated users */}
        {isAuthenticated && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <button
              onClick={() => setShowSaveToRepoModal(true)}
              className={`px-3 py-1.5 text-sm font-medium text-white rounded-md flex items-center gap-1 ${
                isJsonLdMode
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title={`Create PR to save ${isJsonLdMode ? 'JSON-LD Context' : 'JSON Schema'} to repository`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Save to Repo
            </button>
          </>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Save Schema Project</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Save to Repo Modal */}
      <SaveSchemaToRepoModal
        isOpen={showSaveToRepoModal}
        onClose={() => setShowSaveToRepoModal(false)}
      />

      {/* New Schema Modal */}
      <NewSchemaModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSelect={handleNewSchemaSelect}
      />
    </>
  );
}
