import { useState, useCallback, useRef, useEffect } from 'react';
import { useVctStore, reloadUserProjects } from '../../store/vctStore';
import { useZoneTemplateStore } from '../../store/zoneTemplateStore';
import { getLocaleName } from '../../types/vct';
import { useAppTracking } from '../../hooks/useAppTracking';
import MetadataForm from '../../components/FormPanel/MetadataForm';
import DisplayForm from '../../components/FormPanel/DisplayForm';
import ClaimsForm from '../../components/FormPanel/ClaimsForm';
import CardZonesForm from '../../components/FormPanel/CardZonesForm';
import JsonPreview from '../../components/JsonPanel/JsonPreview';
import CredentialPreview from '../../components/PreviewPanel/CredentialPreview';
import Toolbar from '../../components/Toolbar/Toolbar';

type FormSection = 'metadata' | 'display' | 'front' | 'back' | 'claims';
type MobilePanel = 'form' | 'json' | 'preview';

// Resizable divider component
function ResizableDivider({ onDrag }: { onDrag: (delta: number) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag]);

  return (
    <div
      className={`hidden md:flex w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize flex-shrink-0 items-center justify-center transition-colors ${
        isDragging ? 'bg-blue-500' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      <div className="w-0.5 h-8 bg-gray-400 rounded" />
    </div>
  );
}

export default function VctBuilderApp() {
  // Track app access
  useAppTracking('vct-builder', 'VCT Builder');

  // Load zone templates from server on mount
  const loadTemplates = useZoneTemplateStore((state) => state.loadTemplates);
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Load VCT projects from server on mount
  useEffect(() => {
    reloadUserProjects();
  }, []);

  // Reset to welcome screen when entering the app
  const closeProject = useVctStore((state) => state.closeProject);
  useEffect(() => {
    closeProject();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeSection, setActiveSection] = useState<FormSection>('metadata');
  const [previewLocale, setPreviewLocale] = useState<string>('en-CA');
  const [cardSide, setCardSide] = useState<'front' | 'back' | undefined>(undefined);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Panel visibility state for responsive layout
  const [showFormPanel, setShowFormPanel] = useState(true);
  const [showJsonPanel, setShowJsonPanel] = useState(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [mobileActivePanel, setMobileActivePanel] = useState<MobilePanel>('preview');

  // Panel widths for resizable panels (in pixels)
  const [formPanelWidth, setFormPanelWidth] = useState(384); // 24rem = 384px
  const [jsonPanelWidth, setJsonPanelWidth] = useState(384);

  // Minimum and maximum panel widths
  const MIN_PANEL_WIDTH = 200;
  const MAX_PANEL_WIDTH = 600;

  const handleFormDividerDrag = useCallback((delta: number) => {
    setFormPanelWidth((prev) => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, prev + delta)));
  }, []);

  const handleJsonDividerDrag = useCallback((delta: number) => {
    setJsonPanelWidth((prev) => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, prev + delta)));
  }, []);

  const currentVct = useVctStore((state) => state.currentVct);
  const isEditing = useVctStore((state) => state.isEditing);
  const savedProjects = useVctStore((state) => state.savedProjects);
  const newProject = useVctStore((state) => state.newProject);
  const loadProject = useVctStore((state) => state.loadProject);
  const deleteProject = useVctStore((state) => state.deleteProject);
  const isDirty = useVctStore((state) => state.isDirty);

  // Get available locales from the current VCT display configuration
  const availableLocales = currentVct.display.map((d) => d.locale);

  // Check if schema is selected (required for Claims tab)
  const hasSchemaSelected = Boolean(currentVct.schema_uri && currentVct.schema_uri.trim());

  // Check if zone template is selected (required for Front/Back tabs)
  const selectedTemplateId = useZoneTemplateStore((state) => state.selectedTemplateId);
  const getTemplate = useZoneTemplateStore((state) => state.getTemplate);
  const hasZoneTemplateSelected = Boolean(selectedTemplateId);
  const selectedTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;
  const isFrontOnly = selectedTemplate?.frontOnly ?? false;

  const handleLoad = (id: string) => {
    if (isDirty && !confirm('You have unsaved changes. Load anyway?')) {
      return;
    }
    loadProject(id);
    setShowLoadModal(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this VCT project?')) {
      await deleteProject(id);
    }
  };

  // Show welcome screen if not editing
  if (!isEditing) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        {/* Welcome Screen */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="mb-8">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to VCT Builder</h2>
              <p className="text-gray-500">Create Verifiable Credential Types with display configurations for JSON-LD credentials</p>
            </div>

            <div className="flex gap-4 justify-center">
              {/* Create New */}
              <button
                onClick={() => newProject()}
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

        {/* Load Modal */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Open VCT Project</h3>
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
      <Toolbar
        showFormPanel={showFormPanel}
        setShowFormPanel={setShowFormPanel}
        showJsonPanel={showJsonPanel}
        setShowJsonPanel={setShowJsonPanel}
        showPreviewPanel={showPreviewPanel}
        setShowPreviewPanel={setShowPreviewPanel}
      />

      {/* Mobile Panel Tabs - visible on small screens only */}
      <div className="md:hidden flex bg-gray-100 border-b border-gray-300">
        <button
          onClick={() => setMobileActivePanel('form')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            mobileActivePanel === 'form'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Form
        </button>
        <button
          onClick={() => setMobileActivePanel('json')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            mobileActivePanel === 'json'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          JSON
        </button>
        <button
          onClick={() => setMobileActivePanel('preview')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            mobileActivePanel === 'preview'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Main Content - Responsive Panel Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form Input */}
        {((mobileActivePanel === 'form') || showFormPanel) && (
          <div
            className={`
              flex-col bg-white overflow-y-auto
              ${mobileActivePanel === 'form' ? 'flex w-full' : 'hidden'}
              ${showFormPanel ? 'md:flex' : 'md:hidden'}
              ${!showJsonPanel && !showPreviewPanel ? 'flex-1' : 'flex-shrink-0'}
            `}
            style={{ width: mobileActivePanel === 'form' ? '100%' : (!showJsonPanel && !showPreviewPanel ? undefined : `${formPanelWidth}px`) }}
          >
            {/* Section Tabs */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 flex-shrink-0">
              <button
                onClick={() => setActiveSection('metadata')}
                className={`flex-1 px-3 py-3 text-sm font-medium ${
                  activeSection === 'metadata'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Metadata
              </button>
              <button
                onClick={() => setActiveSection('display')}
                className={`flex-1 px-3 py-3 text-sm font-medium ${
                  activeSection === 'display'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Display
              </button>
              <button
                onClick={() => hasZoneTemplateSelected && setActiveSection('front')}
                disabled={!hasZoneTemplateSelected}
                title={!hasZoneTemplateSelected ? 'Select a zone template in Display tab first' : 'Configure front of card'}
                className={`flex-1 px-3 py-3 text-sm font-medium ${
                  activeSection === 'front'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : !hasZoneTemplateSelected
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Front
                {!hasZoneTemplateSelected && <span className="ml-1 text-xs">🔒</span>}
              </button>
              {!isFrontOnly && (
                <button
                  onClick={() => hasZoneTemplateSelected && setActiveSection('back')}
                  disabled={!hasZoneTemplateSelected}
                  title={!hasZoneTemplateSelected ? 'Select a zone template in Display tab first' : 'Configure back of card'}
                  className={`flex-1 px-3 py-3 text-sm font-medium ${
                    activeSection === 'back'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : !hasZoneTemplateSelected
                      ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  Back
                  {!hasZoneTemplateSelected && <span className="ml-1 text-xs">🔒</span>}
                </button>
              )}
              <button
                onClick={() => hasSchemaSelected && setActiveSection('claims')}
                disabled={!hasSchemaSelected}
                title={!hasSchemaSelected ? 'Select a schema first to configure claims' : 'Configure credential claims'}
                className={`flex-1 px-3 py-3 text-sm font-medium ${
                  activeSection === 'claims'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : !hasSchemaSelected
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Claims
                {!hasSchemaSelected && <span className="ml-1 text-xs">🔒</span>}
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeSection === 'metadata' && <MetadataForm />}
              {activeSection === 'display' && <DisplayForm />}
              {activeSection === 'front' && <CardZonesForm face="front" displayIndex={0} />}
              {activeSection === 'back' && <CardZonesForm face="back" displayIndex={0} />}
              {activeSection === 'claims' && <ClaimsForm />}
            </div>
          </div>
        )}

        {/* Resizable divider after Form panel - shows when Form is visible */}
        {showFormPanel && (
          <ResizableDivider onDrag={handleFormDividerDrag} />
        )}

        {/* Middle Panel - JSON Preview */}
        {((mobileActivePanel === 'json') || showJsonPanel) && (
          <div
            className={`
              flex-col bg-gray-900 overflow-y-auto
              ${mobileActivePanel === 'json' ? 'flex w-full' : 'hidden'}
              ${showJsonPanel ? 'md:flex' : 'md:hidden'}
              ${!showPreviewPanel ? 'flex-1' : 'flex-shrink-0'}
            `}
            style={{ width: mobileActivePanel === 'json' ? '100%' : (!showPreviewPanel ? undefined : `${jsonPanelWidth}px`) }}
          >
            <div className="sticky top-0 bg-gray-800 px-4 py-2 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-white font-medium">VCT JSON</h2>
            </div>
            <JsonPreview />
          </div>
        )}

        {/* Resizable divider after JSON panel - shows when JSON is visible */}
        {showJsonPanel && (
          <ResizableDivider onDrag={handleJsonDividerDrag} />
        )}

        {/* Right Panel - Credential Preview */}
        {((mobileActivePanel === 'preview') || showPreviewPanel) && (
        <div
          className={`
            flex-col flex-1 bg-gray-50 overflow-y-auto transition-all duration-300
            ${mobileActivePanel === 'preview' ? 'flex w-full' : 'hidden'}
            ${showPreviewPanel ? 'md:flex' : 'md:hidden'}
          `}
        >
          {/* Preview Controls */}
          <div className="sticky top-0 z-10 bg-white px-4 py-2 border-b border-gray-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Language:</label>
              <select
                value={previewLocale}
                onChange={(e) => setPreviewLocale(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {availableLocales.map((locale) => (
                  <option key={locale} value={locale}>
                    {getLocaleName(locale)}
                  </option>
                ))}
              </select>
            </div>
            {/* Card Side Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Side:</label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setCardSide(cardSide === 'front' ? undefined : 'front')}
                  className={`px-2 py-1 text-xs font-medium rounded-l-md border ${
                    cardSide === 'front'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setCardSide(cardSide === 'back' ? undefined : 'back')}
                  className={`px-2 py-1 text-xs font-medium rounded-r-md border-t border-r border-b -ml-px ${
                    cardSide === 'back'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Back
                </button>
              </div>
              {cardSide && (
                <button
                  type="button"
                  onClick={() => setCardSide(undefined)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  title="Reset to interactive flip"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <CredentialPreview
            locale={previewLocale}
            cardSide={cardSide}
            onZoneSelect={(face) => {
              if (hasZoneTemplateSelected) {
                setActiveSection(face);
              }
            }}
          />
        </div>
        )}
      </main>
    </div>
  );
}
