import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { FurnisherDataSource, DataSourceType, DirectFeedConfig, CredentialSourceConfig } from '../../../types/entity';

interface DataSourceFormProps {
  source: FurnisherDataSource | null;
  onSave: (source: FurnisherDataSource) => void;
  onClose: () => void;
}

type FormStep = 'type-selection' | 'configuration';

const TRUST_FRAMEWORKS = [
  'BC Digital Trust',
  'Pan-Canadian Trust Framework',
  'DIACC Trust Framework',
  'Other',
];

const WALLET_OPTIONS = [
  'BC Wallet',
  'COPA Wallet',
  'Microsoft Entra Verified ID',
  'Other',
];

export default function DataSourceForm({ source, onSave, onClose }: DataSourceFormProps) {
  const isEditing = !!source;
  const [step, setStep] = useState<FormStep>(isEditing ? 'configuration' : 'type-selection');
  const [sourceType, setSourceType] = useState<DataSourceType>(source?.type || 'direct-feed');

  // Common fields
  const [name, setName] = useState(source?.name || '');
  const [description, setDescription] = useState(source?.description || '');
  const [notes, setNotes] = useState(source?.notes || '');

  // Direct Feed fields
  const [apiDocumentationUrl, setApiDocumentationUrl] = useState(source?.directFeedConfig?.apiDocumentationUrl || '');
  const [apiEndpoint, setApiEndpoint] = useState(source?.directFeedConfig?.apiEndpoint || '');
  const [updateFrequency, setUpdateFrequency] = useState(source?.directFeedConfig?.updateFrequency || '');
  const [authMethod, setAuthMethod] = useState(source?.directFeedConfig?.authMethod || '');

  // Credential fields
  const [credentialName, setCredentialName] = useState(source?.credentialConfig?.credentialName || '');
  const [issuerDid, setIssuerDid] = useState(source?.credentialConfig?.issuerDid || '');
  const [schemaUrl, setSchemaUrl] = useState(source?.credentialConfig?.schemaUrl || '');
  const [vctUrl, setVctUrl] = useState(source?.credentialConfig?.vctUrl || '');
  const [trustFramework, setTrustFramework] = useState(source?.credentialConfig?.trustFramework || '');
  const [governanceDocUrl, setGovernanceDocUrl] = useState(source?.credentialConfig?.governanceDocUrl || '');
  const [supportedWallets, setSupportedWallets] = useState<string[]>(source?.credentialConfig?.supportedWallets || []);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTypeSelect = (type: DataSourceType) => {
    setSourceType(type);
    setStep('configuration');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Source name is required';
    }

    if (sourceType === 'credential') {
      if (!credentialName.trim()) {
        newErrors.credentialName = 'Credential name is required';
      }
      if (!issuerDid.trim()) {
        newErrors.issuerDid = 'Issuer DID is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const baseSource: Partial<FurnisherDataSource> = {
      id: source?.id || `source-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      type: sourceType,
      fields: source?.fields || [],
      notes: notes.trim() || undefined,
    };

    if (sourceType === 'direct-feed') {
      const directFeedConfig: DirectFeedConfig = {
        apiDocumentationUrl: apiDocumentationUrl.trim() || undefined,
        apiEndpoint: apiEndpoint.trim() || undefined,
        updateFrequency: updateFrequency as DirectFeedConfig['updateFrequency'] || undefined,
        authMethod: authMethod.trim() || undefined,
      };
      baseSource.directFeedConfig = directFeedConfig;
      baseSource.credentialConfig = undefined;
    } else {
      const credentialConfig: CredentialSourceConfig = {
        credentialName: credentialName.trim(),
        issuerDid: issuerDid.trim(),
        schemaUrl: schemaUrl.trim() || undefined,
        vctUrl: vctUrl.trim() || undefined,
        trustFramework: trustFramework || undefined,
        governanceDocUrl: governanceDocUrl.trim() || undefined,
        supportedWallets: supportedWallets.length > 0 ? supportedWallets : undefined,
      };
      baseSource.credentialConfig = credentialConfig;
      baseSource.directFeedConfig = undefined;
    }

    onSave(baseSource as FurnisherDataSource);
  };

  const toggleWallet = (wallet: string) => {
    setSupportedWallets(prev =>
      prev.includes(wallet)
        ? prev.filter(w => w !== wallet)
        : [...prev, wallet]
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            {step === 'configuration' && !isEditing && (
              <button
                onClick={() => setStep('type-selection')}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Data Source' : step === 'type-selection' ? 'Add Data Source' : `Configure ${sourceType === 'direct-feed' ? 'Direct Feed' : 'Credential'}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Type Selection */}
        {step === 'type-selection' && (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-6">How does this furnisher provide data?</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Direct Feed Option */}
              <button
                onClick={() => handleTypeSelect('direct-feed')}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <span className="text-2xl">📡</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Direct Data Feed</h4>
                <p className="text-xs text-gray-500">
                  API or data export that we integrate with directly
                </p>
                <p className="text-xs text-gray-400 mt-2 italic">
                  Examples: Landcor, Interac, JLR
                </p>
              </button>

              {/* Credential Option */}
              <button
                onClick={() => handleTypeSelect('credential')}
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <span className="text-2xl">🎫</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Credential</h4>
                <p className="text-xs text-gray-500">
                  VC issued to holder wallets that we consume as relying party
                </p>
                <p className="text-xs text-gray-400 mt-2 italic">
                  Examples: Service BC, City of Vancouver
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 'configuration' && (
          <>
            <div className="p-6 space-y-4">
              {/* Common Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={sourceType === 'direct-feed' ? 'e.g., Assessment Data' : 'e.g., Person Credential'}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this data source..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Direct Feed Configuration */}
              {sourceType === 'direct-feed' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-green-600">📡</span> API Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">API Documentation URL</label>
                      <input
                        type="url"
                        value={apiDocumentationUrl}
                        onChange={(e) => setApiDocumentationUrl(e.target.value)}
                        placeholder="https://docs.example.com/api"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">API Endpoint</label>
                      <input
                        type="url"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Update Frequency</label>
                      <select
                        value={updateFrequency}
                        onChange={(e) => setUpdateFrequency(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select frequency...</option>
                        <option value="realtime">Realtime</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Auth Method</label>
                      <input
                        type="text"
                        value={authMethod}
                        onChange={(e) => setAuthMethod(e.target.value)}
                        placeholder="e.g., API Key, OAuth2, mTLS"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Credential Configuration */}
              {sourceType === 'credential' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-purple-600">🎫</span> Credential Information
                  </h4>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Credential Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={credentialName}
                      onChange={(e) => setCredentialName(e.target.value)}
                      placeholder="e.g., BC Person Credential"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.credentialName ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.credentialName && <p className="mt-1 text-xs text-red-500">{errors.credentialName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Issuer DID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={issuerDid}
                      onChange={(e) => setIssuerDid(e.target.value)}
                      placeholder="e.g., did:web:id.gov.bc.ca"
                      className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.issuerDid ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.issuerDid && <p className="mt-1 text-xs text-red-500">{errors.issuerDid}</p>}
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h5 className="text-xs font-medium text-gray-500 mb-3">References (URLs)</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Schema Location</label>
                        <input
                          type="url"
                          value={schemaUrl}
                          onChange={(e) => setSchemaUrl(e.target.value)}
                          placeholder="https://id.gov.bc.ca/schemas/person.json"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">VCT / Credential Type</label>
                        <input
                          type="url"
                          value={vctUrl}
                          onChange={(e) => setVctUrl(e.target.value)}
                          placeholder="https://id.gov.bc.ca/vct/person.json"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Governance Documentation</label>
                        <input
                          type="url"
                          value={governanceDocUrl}
                          onChange={(e) => setGovernanceDocUrl(e.target.value)}
                          placeholder="https://digital.gov.bc.ca/governance/..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <h5 className="text-xs font-medium text-gray-500 mb-3">Trust Context</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Trust Framework</label>
                        <select
                          value={trustFramework}
                          onChange={(e) => setTrustFramework(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select framework...</option>
                          {TRUST_FRAMEWORKS.map(framework => (
                            <option key={framework} value={framework}>{framework}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Supported Wallets</label>
                        <div className="flex flex-wrap gap-2">
                          {WALLET_OPTIONS.map(wallet => (
                            <button
                              key={wallet}
                              type="button"
                              onClick={() => toggleWallet(wallet)}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                supportedWallets.includes(wallet)
                                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {supportedWallets.includes(wallet) && (
                                <span className="mr-1">✓</span>
                              )}
                              {wallet}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Integration notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Update Source' : 'Add Source'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
