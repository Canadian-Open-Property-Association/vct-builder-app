import { useMemo } from 'react';
import { useSchemaStore } from '../../../store/schemaStore';
import { toJsonSchema, toJsonLdContext } from '../../../types/schema';
import { useVocabularyStore } from '../../../store/vocabularyStore';

export default function SchemaJsonPreview() {
  // Subscribe to metadata and properties so component re-renders when they change
  const metadata = useSchemaStore((state) => state.metadata);
  const properties = useSchemaStore((state) => state.properties);
  const getSelectedVocab = useVocabularyStore((state) => state.getSelectedVocab);

  const isJsonLdMode = metadata.mode === 'jsonld-context';

  // Generate JSON Schema or JSON-LD Context based on mode
  const schemaJson = useMemo(() => {
    if (isJsonLdMode) {
      const vocabulary = getSelectedVocab();
      const context = toJsonLdContext(metadata, properties, vocabulary);
      return JSON.stringify(context, null, 2);
    }
    const schema = toJsonSchema(metadata, properties);
    return JSON.stringify(schema, null, 2);
  }, [metadata, properties, isJsonLdMode, getSelectedVocab]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaJson);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-4 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </button>

      {/* JSON Content */}
      <pre className="p-4 text-sm font-mono text-gray-100 whitespace-pre-wrap overflow-x-auto">
        {schemaJson}
      </pre>
    </div>
  );
}
