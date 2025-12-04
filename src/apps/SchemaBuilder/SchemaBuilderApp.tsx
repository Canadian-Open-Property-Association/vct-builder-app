import { useEffect } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import SchemaToolbar from './components/SchemaToolbar';
import GovernanceDocsList from './components/GovernanceDocsList';
import PropertyTree from './components/PropertyTree';
import PropertyEditor from './components/PropertyEditor';
import SchemaJsonPreview from './components/SchemaJsonPreview';

export default function SchemaBuilderApp() {
  const currentProjectName = useSchemaStore((state) => state.currentProjectName);
  const isDirty = useSchemaStore((state) => state.isDirty);
  const fetchGovernanceDocs = useSchemaStore((state) => state.fetchGovernanceDocs);

  // Fetch governance docs on mount
  useEffect(() => {
    fetchGovernanceDocs();
  }, [fetchGovernanceDocs]);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Schema Builder</h1>
            <p className="text-slate-300 text-sm">
              Create JSON Schemas for credential data validation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-white">
              {currentProjectName}
            </span>
            {isDirty && (
              <span className="text-yellow-400 text-lg" title="Unsaved changes">
                *
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <SchemaToolbar />

      {/* Main Content - Three Panel Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Governance Docs + Property Tree */}
        <div className="w-1/3 border-r border-gray-300 bg-white flex flex-col overflow-hidden">
          {/* Governance Docs Section */}
          <div className="border-b border-gray-200">
            <GovernanceDocsList />
          </div>

          {/* Property Tree Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <PropertyTree />
          </div>
        </div>

        {/* Middle Panel - Property Editor */}
        <div className="w-1/3 border-r border-gray-300 bg-white overflow-y-auto">
          <PropertyEditor />
        </div>

        {/* Right Panel - JSON Preview */}
        <div className="w-1/3 bg-gray-900 overflow-y-auto">
          <div className="sticky top-0 bg-gray-800 px-4 py-2 border-b border-gray-700">
            <h2 className="text-white font-medium">JSON Schema Preview</h2>
          </div>
          <SchemaJsonPreview />
        </div>
      </main>
    </div>
  );
}
