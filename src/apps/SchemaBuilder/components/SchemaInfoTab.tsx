/**
 * SchemaInfoTab Component
 *
 * Tab 1 of the Schema Builder - contains schema/context metadata:
 * - Title & Description (both modes)
 * - Namespace & Publishing (JSON-LD Context mode only)
 * - Vocabulary Manager (JSON-LD Context mode only)
 *
 * JSON Schema mode is simplified - schemas only define credentialSubject validation.
 * JWT wrapper claims, VCT, and issuer are separate concerns.
 */

import { useSchemaStore } from '../../../store/schemaStore';
import { generateArtifactName, generateContextUrl } from '../../../types/schema';
import VocabularyManager from './VocabularyManager';

// Predefined categories aligned with Data Catalogue (for JSON-LD Context mode)
const SCHEMA_CATEGORIES = [
  { value: '', label: 'Select category...' },
  { value: 'property', label: 'Property' },
  { value: 'identity', label: 'Identity' },
  { value: 'financial', label: 'Financial' },
  { value: 'badge', label: 'Badge' },
  { value: 'professional', label: 'Professional' },
];

export default function SchemaInfoTab() {
  const metadata = useSchemaStore((state) => state.metadata);
  const updateMetadata = useSchemaStore((state) => state.updateMetadata);

  const isJsonLdMode = metadata.mode === 'jsonld-context';

  // Generate artifact name preview (for JSON-LD mode)
  const artifactName = generateArtifactName(metadata.category, metadata.credentialName);

  // Convert title to kebab-case for credential name suggestion
  const suggestCredentialName = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    updateMetadata({ title });
    // Auto-suggest credential name if empty (for JSON-LD mode)
    if (isJsonLdMode && !metadata.credentialName) {
      updateMetadata({ credentialName: suggestCredentialName(title) });
    }
  };

  return (
    <div className="overflow-y-auto h-full">
      {/* Basic Metadata Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isJsonLdMode ? 'Context Metadata' : 'Schema Metadata'}
        </h3>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Home Credential"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => updateMetadata({ description: e.target.value })}
              placeholder="Describe the schema/context..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* JSON-LD Mode: Namespace & Publishing + Vocabulary Manager */}
      {isJsonLdMode && (
        <>
          {/* Namespace & Publishing Section */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Namespace & Publishing
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={metadata.category || ''}
                  onChange={(e) => updateMetadata({ category: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {SCHEMA_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credential Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Name
                </label>
                <input
                  type="text"
                  value={metadata.credentialName || ''}
                  onChange={(e) => updateMetadata({ credentialName: e.target.value || undefined })}
                  placeholder="e.g., home-credential"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Filename Preview */}
            {artifactName && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Filename:</span>{' '}
                  <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                    {artifactName}.context.jsonld
                  </code>
                </p>
                <p className="text-xs text-blue-600 mt-1.5">
                  <span className="font-medium">Context URL:</span>{' '}
                  <code className="bg-blue-100 px-1 rounded break-all">
                    {generateContextUrl(metadata.title, metadata.category, metadata.credentialName)}
                  </code>
                </p>
              </div>
            )}
          </div>

          {/* Vocabulary Manager */}
          <VocabularyManager />
        </>
      )}

      {/* JSON Schema Mode: Simplified - just title and description */}
      {!isJsonLdMode && (
        <div className="p-4 text-sm text-gray-500">
          <p>
            Define the credential subject properties using the Properties tab.
            The schema validates the <code className="bg-gray-100 px-1 rounded">credentialSubject</code> claims.
          </p>
          <p className="mt-2 text-xs">
            JWT wrapper claims (iss, iat, exp, vct) are spec-defined and not included in the schema.
          </p>
        </div>
      )}
    </div>
  );
}
