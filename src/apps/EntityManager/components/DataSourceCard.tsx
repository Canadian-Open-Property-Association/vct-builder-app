import { useState } from 'react';
import type { FurnisherDataSource, FurnisherField } from '../../../types/entity';
import FurnisherFieldForm from './FurnisherFieldForm';

interface DataSourceCardProps {
  source: FurnisherDataSource;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateSource: (source: FurnisherDataSource) => void;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  string: 'String',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  date: 'Date',
  datetime: 'DateTime',
  array: 'Array',
  object: 'Object',
};

const FREQUENCY_LABELS: Record<string, string> = {
  realtime: 'Realtime',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export default function DataSourceCard({ source, onEdit, onDelete, onUpdateSource }: DataSourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<FurnisherField | null>(null);

  const fields = source.fields || [];
  const isDirectFeed = source.type === 'direct-feed';
  const isCredential = source.type === 'credential';

  const handleAddField = () => {
    setEditingField(null);
    setShowFieldForm(true);
  };

  const handleEditField = (field: FurnisherField) => {
    setEditingField(field);
    setShowFieldForm(true);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    const updatedFields = fields.filter(f => f.id !== fieldId);
    onUpdateSource({ ...source, fields: updatedFields });
  };

  const handleSaveField = (field: FurnisherField) => {
    let updatedFields: FurnisherField[];

    if (editingField) {
      updatedFields = fields.map(f => f.id === editingField.id ? field : f);
    } else {
      updatedFields = [...fields, { ...field, id: `field-${Date.now()}` }];
    }

    onUpdateSource({ ...source, fields: updatedFields });
    setShowFieldForm(false);
    setEditingField(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
          isDirectFeed ? 'bg-green-50 border-l-4 border-green-500' : 'bg-purple-50 border-l-4 border-purple-500'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isDirectFeed ? '📡' : '🎫'}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{source.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isDirectFeed ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {isDirectFeed ? 'Direct Feed' : 'Credential'}
              </span>
            </div>
            {source.description && (
              <p className="text-xs text-gray-500 mt-0.5">{source.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
            {fields.length} {fields.length === 1 ? (isCredential ? 'claim' : 'field') : (isCredential ? 'claims' : 'fields')}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit source"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete source"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Source Configuration Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            {isDirectFeed && source.directFeedConfig && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {source.directFeedConfig.apiEndpoint && (
                  <div>
                    <span className="text-xs text-gray-500">API Endpoint:</span>
                    <p className="text-gray-700 font-mono text-xs truncate">{source.directFeedConfig.apiEndpoint}</p>
                  </div>
                )}
                {source.directFeedConfig.apiDocumentationUrl && (
                  <div>
                    <span className="text-xs text-gray-500">Documentation:</span>
                    <p>
                      <a
                        href={source.directFeedConfig.apiDocumentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Docs ↗
                      </a>
                    </p>
                  </div>
                )}
                {source.directFeedConfig.updateFrequency && (
                  <div>
                    <span className="text-xs text-gray-500">Update Frequency:</span>
                    <p className="text-gray-700 text-xs">{FREQUENCY_LABELS[source.directFeedConfig.updateFrequency] || source.directFeedConfig.updateFrequency}</p>
                  </div>
                )}
                {source.directFeedConfig.authMethod && (
                  <div>
                    <span className="text-xs text-gray-500">Auth Method:</span>
                    <p className="text-gray-700 text-xs">{source.directFeedConfig.authMethod}</p>
                  </div>
                )}
              </div>
            )}
            {isCredential && source.credentialConfig && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-xs text-gray-500">Credential Name:</span>
                  <p className="text-gray-700 text-xs">{source.credentialConfig.credentialName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Issuer DID:</span>
                  <p className="text-gray-700 font-mono text-xs truncate">{source.credentialConfig.issuerDid}</p>
                </div>
                {source.credentialConfig.trustFramework && (
                  <div>
                    <span className="text-xs text-gray-500">Trust Framework:</span>
                    <p className="text-gray-700 text-xs">{source.credentialConfig.trustFramework}</p>
                  </div>
                )}
                {source.credentialConfig.schemaUrl && (
                  <div>
                    <span className="text-xs text-gray-500">Schema:</span>
                    <p>
                      <a
                        href={source.credentialConfig.schemaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Schema ↗
                      </a>
                    </p>
                  </div>
                )}
                {source.credentialConfig.vctUrl && (
                  <div>
                    <span className="text-xs text-gray-500">VCT:</span>
                    <p>
                      <a
                        href={source.credentialConfig.vctUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View VCT ↗
                      </a>
                    </p>
                  </div>
                )}
                {source.credentialConfig.governanceDocUrl && (
                  <div>
                    <span className="text-xs text-gray-500">Governance:</span>
                    <p>
                      <a
                        href={source.credentialConfig.governanceDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Governance ↗
                      </a>
                    </p>
                  </div>
                )}
                {source.credentialConfig.supportedWallets && source.credentialConfig.supportedWallets.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">Supported Wallets:</span>
                    <div className="flex gap-1 mt-0.5">
                      {source.credentialConfig.supportedWallets.map((wallet) => (
                        <span key={wallet} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {wallet}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fields/Claims Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase">
                {isCredential ? 'Claims' : 'Fields'}
              </h4>
              <button
                onClick={handleAddField}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add {isCredential ? 'Claim' : 'Field'}
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-sm text-gray-500">No {isCredential ? 'claims' : 'fields'} defined yet</p>
                <button
                  onClick={handleAddField}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Add your first {isCredential ? 'claim' : 'field'}
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{isCredential ? 'Claim Name' : 'Field Name'}</th>
                      <th className="px-3 py-2 text-left font-medium">Display Name</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      {isDirectFeed && <th className="px-3 py-2 text-left font-medium">API Path</th>}
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field) => (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{field.name}</code>
                          {field.required && (
                            <span className="ml-1 text-xs text-red-500">*</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{field.displayName || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {DATA_TYPE_LABELS[field.dataType || 'string'] || field.dataType}
                          </span>
                        </td>
                        {isDirectFeed && (
                          <td className="px-3 py-2">
                            {field.apiPath ? (
                              <code className="text-xs text-gray-500">{field.apiPath}</code>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleEditField(field)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Notes */}
          {source.notes && (
            <div className="text-xs text-gray-500 italic">
              Note: {source.notes}
            </div>
          )}
        </div>
      )}

      {/* Field Form Modal */}
      {showFieldForm && (
        <FurnisherFieldForm
          field={editingField}
          onSave={handleSaveField}
          onClose={() => {
            setShowFieldForm(false);
            setEditingField(null);
          }}
          sourceType={source.type}
        />
      )}
    </div>
  );
}
