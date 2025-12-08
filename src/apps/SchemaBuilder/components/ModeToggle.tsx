/**
 * ModeToggle Component
 *
 * Toggle button to switch between SD-JWT Schema and JSON-LD Context modes.
 */

import { useSchemaStore } from '../../../store/schemaStore';
import { SchemaMode } from '../../../types/vocabulary';

export default function ModeToggle() {
  const mode = useSchemaStore((state) => state.metadata.mode);
  const setMode = useSchemaStore((state) => state.setMode);
  const isDirty = useSchemaStore((state) => state.isDirty);

  const handleModeChange = (newMode: SchemaMode) => {
    if (newMode === mode) return;

    // Warn if there are unsaved changes
    if (isDirty) {
      const confirmed = window.confirm(
        `Switch to ${newMode === 'json-schema' ? 'SD-JWT Schema' : 'JSON-LD Context'} mode?\n\nNote: Some property configurations may not transfer between modes.`
      );
      if (!confirmed) return;
    }

    setMode(newMode);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleModeChange('json-schema')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'json-schema'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Generate JSON Schema Draft 2020-12 for SD-JWT-VC credentials"
      >
        SD-JWT Schema
      </button>
      <button
        onClick={() => handleModeChange('jsonld-context')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          mode === 'jsonld-context'
            ? 'bg-white text-purple-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Generate JSON-LD Context with vocabulary support"
      >
        JSON-LD Context
      </button>
    </div>
  );
}
