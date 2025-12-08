import { useEffect } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import { useAppTracking } from '../../hooks/useAppTracking';
import SchemaToolbar from './components/SchemaToolbar';
import ModeToggle from './components/ModeToggle';
import GovernanceDocsList from './components/GovernanceDocsList';
import VocabularyManager from './components/VocabularyManager';
import OcaSelector from './components/OcaSelector';
import PropertyTree from './components/PropertyTree';
import PropertyEditor from './components/PropertyEditor';
import SchemaJsonPreview from './components/SchemaJsonPreview';

export default function SchemaBuilderApp() {
  // Track app access
  useAppTracking('schema-builder', 'Schema Builder');

  const fetchGovernanceDocs = useSchemaStore((state) => state.fetchGovernanceDocs);
  const mode = useSchemaStore((state) => state.metadata.mode);

  // Fetch governance docs on mount
  useEffect(() => {
    fetchGovernanceDocs();
  }, [fetchGovernanceDocs]);

  const isJsonLdMode = mode === 'jsonld-context';

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar with Mode Toggle */}
      <div className="flex items-center justify-between bg-gray-100 border-b border-gray-200">
        <SchemaToolbar />
        <div className="px-4">
          <ModeToggle />
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Config + Property Tree */}
        <div className="w-1/3 border-r border-gray-300 bg-white overflow-y-auto">
          {/* Mode-specific config sections */}
          {isJsonLdMode ? (
            <>
              {/* JSON-LD Mode: Vocabulary Manager + OCA Selector */}
              <VocabularyManager />
              <OcaSelector />
            </>
          ) : (
            /* JSON Schema Mode: Governance Docs */
            <div className="border-b border-gray-200">
              <GovernanceDocsList />
            </div>
          )}

          {/* Property Tree Section */}
          <div>
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
            <h2 className="text-white font-medium">
              {isJsonLdMode ? 'JSON-LD Context Preview' : 'JSON Schema Preview'}
            </h2>
          </div>
          <SchemaJsonPreview />
        </div>
      </main>
    </div>
  );
}
