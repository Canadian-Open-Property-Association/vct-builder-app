import { useState } from 'react';
import { useDictionaryStore } from '../../../store/dictionaryStore';
import type { VocabProperty } from '../../../types/dictionary';
import PropertyForm from './PropertyForm';
import JsonPreviewModal from './JsonPreviewModal';
import MovePropertiesModal from './MovePropertiesModal';

// Domain colors for badges
const DOMAIN_COLORS: Record<string, string> = {
  property: '#10B981',
  financial: '#3B82F6',
  identity: '#8B5CF6',
  employment: '#F59E0B',
  other: '#6B7280',
  untagged: '#9CA3AF',
};

interface VocabTypeDetailProps {
  onEdit: () => void;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const VALUE_TYPE_LABELS: Record<string, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Yes/No',
  date: 'Date',
  datetime: 'Date & Time',
  array: 'List',
  object: 'Object',
  currency: 'Currency',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
};

export default function VocabTypeDetail({ onEdit }: VocabTypeDetailProps) {
  const { selectedVocabType, deleteProperty, domains } = useDictionaryStore();
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<VocabProperty | null>(null);
  const [previewProperty, setPreviewProperty] = useState<VocabProperty | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  if (!selectedVocabType) return null;

  // Get domain color
  const getDomainColor = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.color || DOMAIN_COLORS[domainId] || '#6B7280';
  };

  // Get domain label
  const getDomainLabel = (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || domainId.charAt(0).toUpperCase() + domainId.slice(1);
  };

  // Get domains for the selected vocab type (supporting both new and legacy format)
  const vocabTypeDomains = selectedVocabType.domains && selectedVocabType.domains.length > 0
    ? selectedVocabType.domains
    : (selectedVocabType.category ? [selectedVocabType.category] : []);

  const handleDeleteProperty = async (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      await deleteProperty(selectedVocabType.id, propertyId);
    }
  };

  const properties = selectedVocabType.properties || [];

  const togglePropertySelection = (propertyId: string) => {
    setSelectedPropertyIds(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPropertyIds.size === properties.length) {
      setSelectedPropertyIds(new Set());
    } else {
      setSelectedPropertyIds(new Set(properties.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedPropertyIds(new Set());
  };

  const handleMoveComplete = () => {
    setShowMoveModal(false);
    clearSelection();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{selectedVocabType.name}</h2>
          {/* Domain badges */}
          <div className="flex items-center gap-2 mt-2">
            {vocabTypeDomains.map(domainId => (
              <span
                key={domainId}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: getDomainColor(domainId) }}
              >
                {getDomainLabel(domainId)}
              </span>
            ))}
            {vocabTypeDomains.length === 0 && (
              <span className="text-xs text-gray-400 italic">No domain assigned</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-gray-500 font-mono">
              governance/credentials/vocab/{selectedVocabType.id}.json
            </span>
          </div>
          {selectedVocabType.description && (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{selectedVocabType.description}</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Properties Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Properties
            <span className="text-gray-400 font-normal">({properties.length})</span>
          </h3>
          <button
            onClick={() => { setEditingProperty(null); setShowPropertyForm(true); }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Property
          </button>
        </div>

        {/* Bulk Action Bar */}
        {selectedPropertyIds.size > 0 && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedPropertyIds.size} propert{selectedPropertyIds.size === 1 ? 'y' : 'ies'} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Move to Vocab Type
            </button>
          </div>
        )}

        {properties.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
            No properties defined yet
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedPropertyIds.size === properties.length && properties.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Constraints</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((prop) => (
                  <tr
                    key={prop.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedPropertyIds.has(prop.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => setPreviewProperty(prop)}
                  >
                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPropertyIds.has(prop.id)}
                        onChange={() => togglePropertySelection(prop.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div>
                        <span className="font-medium text-gray-800">{prop.displayName}</span>
                        <span className="text-xs text-gray-400 ml-2 font-mono">{prop.name}</span>
                      </div>
                      {prop.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{prop.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {VALUE_TYPE_LABELS[prop.valueType] || prop.valueType}
                    </td>
                    <td className="px-4 py-2">
                      {prop.required ? (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Required</span>
                      ) : (
                        <span className="text-xs text-gray-400">Optional</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {prop.constraints ? (
                        <div className="text-xs text-gray-500">
                          {prop.constraints.enum && (
                            <span className="mr-2">Enum: {prop.constraints.enum.length} values</span>
                          )}
                          {prop.constraints.format && (
                            <span className="mr-2">Format: {prop.constraints.format}</span>
                          )}
                          {prop.constraints.minLength !== undefined && (
                            <span className="mr-2">Min: {prop.constraints.minLength}</span>
                          )}
                          {prop.constraints.maxLength !== undefined && (
                            <span className="mr-2">Max: {prop.constraints.maxLength}</span>
                          )}
                          {!prop.constraints.enum && !prop.constraints.format &&
                           prop.constraints.minLength === undefined && prop.constraints.maxLength === undefined && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewProperty(prop); }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="View JSON"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); setShowPropertyForm(true); }}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop.id); }}
                        className="text-gray-400 hover:text-red-600 p-1 ml-1"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 text-gray-700">
              {selectedVocabType.createdAt ? formatDateTime(selectedVocabType.createdAt) : '-'}
            </span>
            {selectedVocabType.createdBy && (
              <span className="text-gray-400 ml-1">
                by {selectedVocabType.createdBy.name || selectedVocabType.createdBy.login}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>
            <span className="ml-2 text-gray-700">
              {selectedVocabType.updatedAt ? formatDateTime(selectedVocabType.updatedAt) : '-'}
            </span>
            {selectedVocabType.updatedBy && (
              <span className="text-gray-400 ml-1">
                by {selectedVocabType.updatedBy.name || selectedVocabType.updatedBy.login}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <PropertyForm
          vocabTypeId={selectedVocabType.id}
          property={editingProperty}
          onClose={() => { setShowPropertyForm(false); setEditingProperty(null); }}
        />
      )}

      {/* JSON Preview Modal */}
      {previewProperty && (
        <JsonPreviewModal
          property={previewProperty}
          vocabTypeName={selectedVocabType.name}
          onClose={() => setPreviewProperty(null)}
        />
      )}

      {/* Move Properties Modal */}
      {showMoveModal && (
        <MovePropertiesModal
          sourceVocabTypeId={selectedVocabType.id}
          sourceVocabTypeName={selectedVocabType.name}
          propertyIds={Array.from(selectedPropertyIds)}
          onClose={() => setShowMoveModal(false)}
          onComplete={handleMoveComplete}
        />
      )}
    </div>
  );
}
