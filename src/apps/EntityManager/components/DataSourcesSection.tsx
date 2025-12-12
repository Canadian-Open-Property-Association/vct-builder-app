import { useState } from 'react';
import type { Entity, FurnisherDataSchema, FurnisherDataSource } from '../../../types/entity';
import { migrateDataSchema } from '../../../types/entity';
import DataSourceCard from './DataSourceCard';
import DataSourceForm from './DataSourceForm';
import SwaggerImportWizard from './SwaggerImportWizard';

interface DataSourcesSectionProps {
  entity: Entity;
  onUpdateSchema: (schema: FurnisherDataSchema) => void;
}

export default function DataSourcesSection({ entity, onUpdateSchema }: DataSourcesSectionProps) {
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [editingSource, setEditingSource] = useState<FurnisherDataSource | null>(null);
  const [showSwaggerWizard, setShowSwaggerWizard] = useState(false);

  // Migrate legacy schema if needed (converts old fields to a sources array)
  const schema = migrateDataSchema(entity.dataSchema);
  const sources = schema.sources || [];

  const handleAddSource = () => {
    setEditingSource(null);
    setShowSourceForm(true);
  };

  const handleEditSource = (source: FurnisherDataSource) => {
    setEditingSource(source);
    setShowSourceForm(true);
  };

  const handleDeleteSource = (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this data source? All fields within it will also be deleted.')) return;

    const updatedSources = sources.filter(s => s.id !== sourceId);
    onUpdateSchema({ ...schema, sources: updatedSources });
  };

  const handleSaveSource = (source: FurnisherDataSource) => {
    let updatedSources: FurnisherDataSource[];

    if (editingSource) {
      // Update existing source
      updatedSources = sources.map(s => s.id === editingSource.id ? source : s);
    } else {
      // Add new source
      updatedSources = [...sources, { ...source, id: `source-${Date.now()}`, createdAt: new Date().toISOString() }];
    }

    onUpdateSchema({ ...schema, sources: updatedSources });
    setShowSourceForm(false);
    setEditingSource(null);
  };

  const handleUpdateSource = (updatedSource: FurnisherDataSource) => {
    const updatedSources = sources.map(s => s.id === updatedSource.id ? { ...updatedSource, updatedAt: new Date().toISOString() } : s);
    onUpdateSchema({ ...schema, sources: updatedSources });
  };

  const handleSwaggerImport = (importedSource: FurnisherDataSource) => {
    const updatedSources = [...sources, { ...importedSource, createdAt: new Date().toISOString() }];
    onUpdateSchema({ ...schema, sources: updatedSources });
    setShowSwaggerWizard(false);
  };

  // Calculate totals
  const totalFields = sources.reduce((acc, source) => acc + (source.fields?.length || 0), 0);
  const directFeedCount = sources.filter(s => s.type === 'direct-feed').length;
  const credentialCount = sources.filter(s => s.type === 'credential').length;

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-700">Data Sources</h3>
          <div className="flex items-center gap-2">
            {sources.length > 0 && (
              <>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {totalFields} {totalFields === 1 ? 'field' : 'fields'}
                </span>
              </>
            )}
            {directFeedCount > 0 && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="text-xs">📡</span> {directFeedCount}
              </span>
            )}
            {credentialCount > 0 && (
              <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="text-xs">🎫</span> {credentialCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSwaggerWizard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import from Swagger
          </button>
          <button
            onClick={handleAddSource}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Source
          </button>
        </div>
      </div>

      {/* Empty State */}
      {sources.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 px-6 py-10 text-center">
          <div className="flex justify-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <span className="text-2xl">📡</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <span className="text-2xl">🎫</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">No data sources defined yet</p>
          <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
            Add data sources to describe how this furnisher provides data—either via direct API feeds or by issuing credentials to external wallets
          </p>
          <button
            onClick={handleAddSource}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add First Data Source
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <DataSourceCard
              key={source.id}
              source={source}
              onEdit={() => handleEditSource(source)}
              onDelete={() => handleDeleteSource(source.id)}
              onUpdateSource={handleUpdateSource}
            />
          ))}
        </div>
      )}

      {/* Entity-level notes */}
      {sources.length > 0 && (
        <div className="pt-2">
          <label className="block text-xs text-gray-500 mb-1">General Notes</label>
          <textarea
            value={schema.notes || ''}
            onChange={(e) => onUpdateSchema({ ...schema, notes: e.target.value || undefined })}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            rows={2}
            placeholder="General notes about this furnisher's data integration..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
          />
        </div>
      )}

      {/* Add/Edit Source Modal */}
      {showSourceForm && (
        <DataSourceForm
          source={editingSource}
          onSave={handleSaveSource}
          onClose={() => {
            setShowSourceForm(false);
            setEditingSource(null);
          }}
        />
      )}

      {/* Swagger Import Wizard */}
      {showSwaggerWizard && (
        <SwaggerImportWizard
          onImport={handleSwaggerImport}
          onClose={() => setShowSwaggerWizard(false)}
        />
      )}
    </div>
  );
}
