import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSchemaStore } from '../../../store/schemaStore';
import { toJsonSchema, toJsonLdContext, generateArtifactName } from '../../../types/schema';
import { useVocabularyStore } from '../../../store/vocabularyStore';

/**
 * Simple JSON syntax highlighter - returns HTML with colored spans
 * Pattern borrowed from VCT Builder's JsonPreview
 */
function highlightJson(json: string): string {
  // Escape HTML entities first
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply syntax highlighting with regex
  return escaped
    // Strings (property names and values) - cyan for keys, green for values
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g, '<span class="text-cyan-400">"$1"</span>:')
    .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="text-green-400">"$1"</span>')
    // Standalone strings (in arrays)
    .replace(/(?<=[\[,]\s*)"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="text-green-400">"$1"</span>')
    // Numbers - orange
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="text-orange-400">$1</span>')
    .replace(/(?<=[\[,]\s*)(-?\d+\.?\d*)(?=\s*[,\]])/g, '<span class="text-orange-400">$1</span>')
    // Booleans and null - purple
    .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>')
    .replace(/(?<=[\[,]\s*)(true|false|null)(?=\s*[,\]])/g, '<span class="text-purple-400">$1</span>')
    // Brackets and braces - gray
    .replace(/([{}[\]])/g, '<span class="text-gray-500">$1</span>');
}

export default function SchemaJsonPreview() {
  const [copied, setCopied] = useState(false);
  const [localJson, setLocalJson] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Subscribe to store state
  const metadata = useSchemaStore((state) => state.metadata);
  const properties = useSchemaStore((state) => state.properties);
  const currentProjectName = useSchemaStore((state) => state.currentProjectName);
  const importSchema = useSchemaStore((state) => state.importSchema);
  const getSelectedVocab = useVocabularyStore((state) => state.getSelectedVocab);

  const isJsonLdMode = metadata.mode === 'jsonld-context';

  // Generate JSON Schema or JSON-LD Context based on mode
  const storeJsonString = useMemo(() => {
    if (isJsonLdMode) {
      const vocabulary = getSelectedVocab();
      const context = toJsonLdContext(metadata, properties, vocabulary);
      return JSON.stringify(context, null, 2);
    }
    const schema = toJsonSchema(metadata, properties);
    return JSON.stringify(schema, null, 2);
  }, [metadata, properties, isJsonLdMode, getSelectedVocab]);

  // Sync local JSON with store when not focused (external changes)
  useEffect(() => {
    if (!isFocused) {
      setLocalJson(storeJsonString);
      setParseError(null);
    }
  }, [storeJsonString, isFocused]);

  // Real-time syntax validation as user types
  const handleJsonChange = useCallback((value: string) => {
    setLocalJson(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, []);

  // Handle focus - start editing
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle blur - validate and apply changes
  const handleBlur = useCallback(() => {
    setIsFocused(false);

    // Don't apply if there's a parse error
    if (parseError) {
      return;
    }

    try {
      const parsed = JSON.parse(localJson);

      // Mode-specific validation
      if (isJsonLdMode) {
        // JSON-LD Context validation
        if (!parsed['@context']) {
          setParseError('Invalid JSON-LD: missing @context');
          return;
        }
        // Only update if JSON actually changed
        if (localJson !== storeJsonString) {
          importSchema(localJson);
        }
        setParseError(null);
      } else {
        // JSON Schema validation - must have required structure
        if (!parsed.properties?.credentialSubject) {
          setParseError('Invalid schema: missing credentialSubject');
          return;
        }

        // Only update if JSON actually changed
        if (localJson !== storeJsonString) {
          importSchema(localJson);
        }
        setParseError(null);
      }
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, [localJson, storeJsonString, parseError, isJsonLdMode, importSchema]);

  // Reset to store version
  const handleReset = useCallback(() => {
    setLocalJson(storeJsonString);
    setParseError(null);
  }, [storeJsonString]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = localJson !== storeJsonString && !parseError;

  // Memoize the highlighted HTML for display mode
  const highlightedHtml = useMemo(() => highlightJson(localJson || storeJsonString), [localJson, storeJsonString]);

  // Generate filename based on namespace convention
  const getFilename = () => {
    const artifactName = generateArtifactName(metadata.category, metadata.credentialName);
    const baseName = artifactName || currentProjectName.replace(/\s+/g, '-').toLowerCase() || 'schema';

    if (isJsonLdMode) {
      return `${baseName}.context.jsonld`;
    }
    return `${baseName}.schema.json`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localJson || storeJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([localJson || storeJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Action buttons */}
      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700 items-center">
        <button
          onClick={handleCopy}
          className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>

        {/* Reset button - shown when there are changes or errors */}
        {(parseError || hasUnsavedChanges) && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs bg-yellow-600 text-white hover:bg-yellow-700 rounded flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto truncate max-w-[200px]" title={getFilename()}>
          {getFilename()}
        </span>
      </div>

      {/* Parse error banner */}
      {parseError && (
        <div className="px-3 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-xs">
          <span className="font-semibold">JSON Error:</span> {parseError}
        </div>
      )}

      {/* Unsaved changes hint */}
      {hasUnsavedChanges && !parseError && isFocused && (
        <div className="px-3 py-1.5 bg-yellow-900/30 border-b border-yellow-700/50 text-yellow-300 text-xs">
          Click outside to apply changes
        </div>
      )}

      {/* Editable JSON textarea / Display area */}
      <div
        className={`flex-1 overflow-auto border-l-4 ${
          parseError
            ? 'border-red-500'
            : hasUnsavedChanges
            ? 'border-yellow-500'
            : 'border-transparent'
        }`}
      >
        {isFocused ? (
          // Editable textarea when focused
          <textarea
            value={localJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-full p-4 font-mono text-xs leading-relaxed bg-transparent text-gray-100 resize-none outline-none"
            style={{ tabSize: 2 }}
            spellCheck={false}
            autoFocus
          />
        ) : (
          // Syntax-highlighted display when not focused
          <pre
            className="p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words cursor-text"
            style={{ tabSize: 2 }}
            onClick={handleFocus}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        )}
      </div>

      {/* Edit hint at bottom */}
      {!isFocused && (
        <div className="px-3 py-1.5 bg-gray-800 border-t border-gray-700 text-gray-500 text-xs text-center">
          Click to edit JSON directly
        </div>
      )}
    </div>
  );
}
