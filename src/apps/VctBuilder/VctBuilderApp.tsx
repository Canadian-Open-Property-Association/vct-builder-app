import { useState, useCallback, useRef, useEffect } from 'react';
import { useVctStore } from '../../store/vctStore';
import { getLocaleName } from '../../types/vct';
import { useAppTracking } from '../../hooks/useAppTracking';
import MetadataForm from '../../components/FormPanel/MetadataForm';
import DisplayForm from '../../components/FormPanel/DisplayForm';
import ClaimsForm from '../../components/FormPanel/ClaimsForm';
import JsonPreview from '../../components/JsonPanel/JsonPreview';
import CredentialPreview from '../../components/PreviewPanel/CredentialPreview';
import Toolbar from '../../components/Toolbar/Toolbar';

type FormSection = 'metadata' | 'display' | 'claims';
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

  const [activeSection, setActiveSection] = useState<FormSection>('metadata');
  const [previewLocale, setPreviewLocale] = useState<string>('en-CA');
  const [cardSide, setCardSide] = useState<'front' | 'back' | undefined>(undefined);

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

  const currentProjectName = useVctStore((state) => state.currentProjectName);
  const isDirty = useVctStore((state) => state.isDirty);
  const currentVct = useVctStore((state) => state.currentVct);

  // Get available locales from the current VCT display configuration
  const availableLocales = currentVct.display.map((d) => d.locale);

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">VCT Builder</h1>
            <p className="text-slate-300 text-sm">
              Build Verifiable Credential Type files for COPA
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>{currentProjectName || 'Untitled'}</span>
            {isDirty && <span className="text-yellow-400" title="Unsaved changes">*</span>}
          </div>
        </div>
      </header>

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
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeSection === 'metadata'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Metadata
              </button>
              <button
                onClick={() => setActiveSection('display')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeSection === 'display'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Display
              </button>
              <button
                onClick={() => setActiveSection('claims')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeSection === 'claims'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Claims
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeSection === 'metadata' && <MetadataForm />}
              {activeSection === 'display' && <DisplayForm />}
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
          <div className="sticky top-0 bg-white px-4 py-2 border-b border-gray-200 flex flex-wrap items-center gap-4">
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
          <CredentialPreview locale={previewLocale} cardSide={cardSide} />
        </div>
        )}
      </main>
    </div>
  );
}
