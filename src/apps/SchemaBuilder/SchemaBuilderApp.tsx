import { useEffect } from 'react';
import { useSchemaStore } from '../../store/schemaStore';
import { useAppTracking } from '../../hooks/useAppTracking';
import SchemaToolbar from './components/SchemaToolbar';
import MetadataPanel from './components/MetadataPanel';
import StandardClaimsPanel from './components/StandardClaimsPanel';
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

  const isJsonLdMode = mode === 'jsonld-context'; // mode defaults to 'json-schema'

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <SchemaToolbar />

      {/* Main Content - Three Panel Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Config + Property Tree */}
        <div className="w-1/3 border-r border-gray-300 bg-white overflow-y-auto">
          {/* Schema/Context Metadata - always shown */}
          <MetadataPanel />

          {/* Mode-specific config sections */}
          {isJsonLdMode ? (
            <>
              {/* JSON-LD Mode: Vocabulary Manager + OCA Selector */}
              <VocabularyManager />
              <OcaSelector />
            </>
          ) : (
            <>
              {/* JSON Schema Mode: Standard Claims + Governance Docs */}
              <StandardClaimsPanel />
              <div className="border-b border-gray-200">
                <GovernanceDocsList />
              </div>
            </>
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
        <div className="w-1/3 bg-gray-900 flex flex-col overflow-hidden">
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
