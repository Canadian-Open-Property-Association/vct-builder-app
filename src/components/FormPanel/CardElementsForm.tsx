import { useState } from 'react';
import { useVctStore } from '../../store/vctStore';
import {
  VCTFrontCardElements,
  VCTEvidenceSource,
  EvidenceSourceType,
  EVIDENCE_SOURCE_TYPE_LABELS,
  METADATA_FIELD_OPTIONS,
  CardElementPosition,
} from '../../types/vct';
import AssetLibrary from '../AssetLibrary/AssetLibrary';

interface CardElementsFormProps {
  displayIndex: number;
}

const POSITION_OPTIONS: { value: CardElementPosition; label: string }[] = [
  { value: 'top_left', label: 'Top Left' },
  { value: 'top_right', label: 'Top Right' },
  { value: 'center', label: 'Center' },
  { value: 'center_below', label: 'Center Below' },
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_right', label: 'Bottom Right' },
  { value: 'top', label: 'Top' },
  { value: 'center_bottom', label: 'Center Bottom' },
];

type FrontElementConfig = {
  key: keyof VCTFrontCardElements;
  label: string;
  description: string;
  defaultPosition: CardElementPosition;
  isFixed?: boolean;
  fixedValue?: string;
  supportsLogo?: boolean; // Whether this element can have a logo/icon
};

// Display Attributes - the data shown on the card
const DISPLAY_ATTRIBUTES: FrontElementConfig[] = [
  {
    key: 'primary_attribute',
    label: 'Primary Attribute',
    description: 'Main identifying information (address, name, license number)',
    defaultPosition: 'center',
  },
  {
    key: 'secondary_attribute',
    label: 'Secondary Attribute',
    description: 'Supporting information (holder name, role)',
    defaultPosition: 'center_below',
  },
];

// Card Branding - identity and branding elements
const CARD_BRANDING: FrontElementConfig[] = [
  {
    key: 'portfolio_issuer',
    label: 'Portfolio Issuer',
    description: 'Organization operating the credential portfolio (logo or name)',
    defaultPosition: 'top_left',
    supportsLogo: true,
  },
  {
    key: 'network_mark',
    label: 'Network Mark',
    description: 'Cornerstone ecosystem identifier',
    defaultPosition: 'top_right',
    isFixed: true,
    fixedValue: 'cornerstone',
    supportsLogo: true,
  },
  {
    key: 'credential_name',
    label: 'Credential Name',
    description: 'Type of credential (e.g., "Home Credential")',
    defaultPosition: 'bottom_left',
  },
  {
    key: 'credential_issuer',
    label: 'Credential Issuer',
    description: 'Entity that issued/signed this credential',
    defaultPosition: 'bottom_right',
    supportsLogo: true,
  },
];

export default function CardElementsForm({ displayIndex }: CardElementsFormProps) {
  const currentVct = useVctStore((state) => state.currentVct);
  const updateFrontElement = useVctStore((state) => state.updateFrontElement);
  const updateCardElements = useVctStore((state) => state.updateCardElements);
  const addEvidenceSource = useVctStore((state) => state.addEvidenceSource);
  const removeEvidenceSource = useVctStore((state) => state.removeEvidenceSource);

  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Partial<VCTEvidenceSource>>({
    type: 'data_furnisher',
    badge: 'logo',
  });
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<
    'evidence' | keyof VCTFrontCardElements | null
  >(null);

  const display = currentVct.display[displayIndex];
  const cardElements = display?.card_elements;
  const frontElements = cardElements?.front || {};
  const backElements = cardElements?.back || {};
  const evidenceSources = backElements.evidence?.sources || [];
  const metadataFields = backElements.metadata?.fields || [];

  // Get claim paths for dropdown
  const claimPaths = currentVct.claims.map((claim) => {
    const path = '$.' + claim.path.filter((p) => p !== null && p !== undefined).join('.');
    const label = claim.display[0]?.label || path;
    return { path, label };
  });

  const handleMetadataFieldToggle = (fieldId: string) => {
    const currentFields = metadataFields;
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter((f) => f !== fieldId)
      : [...currentFields, fieldId];

    updateCardElements(displayIndex, {
      back: {
        ...backElements,
        metadata: {
          position: backElements.metadata?.position || 'top',
          fields: newFields,
        },
      },
    });
  };

  const handleAddEvidence = () => {
    if (!newEvidence.id || !newEvidence.display || !newEvidence.description) {
      alert('Please fill in all required fields');
      return;
    }

    addEvidenceSource(displayIndex, {
      type: newEvidence.type || 'data_furnisher',
      id: newEvidence.id,
      display: newEvidence.display,
      badge: newEvidence.badge,
      logo_uri: newEvidence.logo_uri,
      description: newEvidence.description,
    });

    setNewEvidence({ type: 'data_furnisher', badge: 'logo' });
    setIsAddingEvidence(false);
  };

  const openAssetPicker = (target: 'evidence' | keyof VCTFrontCardElements) => {
    setAssetPickerTarget(target);
    setAssetPickerOpen(true);
  };

  const handleAssetSelect = (uri: string) => {
    if (assetPickerTarget === 'evidence') {
      setNewEvidence({ ...newEvidence, logo_uri: uri });
    } else if (assetPickerTarget) {
      updateFrontElement(displayIndex, assetPickerTarget, {
        logo_uri: uri,
      });
    }
    setAssetPickerOpen(false);
    setAssetPickerTarget(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-6">
      <div>
        <h4 className="font-medium text-gray-800">Card Elements (COPA Standard)</h4>
        <p className="text-xs text-gray-500 mt-1">
          Configure the elements that appear on the front and back of the credential card.
        </p>
      </div>

      {/* Display Attributes Section */}
      <div className="space-y-4">
        <h5 className="text-sm font-semibold text-gray-700 border-b pb-2">
          Display Attributes
        </h5>
        <p className="text-xs text-gray-500 -mt-2">
          The main data displayed on the front of the credential card.
        </p>

        {DISPLAY_ATTRIBUTES.map((elementConfig) => {
          const element = frontElements[elementConfig.key];

          return (
            <div
              key={elementConfig.key}
              className="border border-gray-100 rounded p-3 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {elementConfig.label}
                  </span>
                  <p className="text-xs text-gray-500">{elementConfig.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Position */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Position</label>
                  <select
                    value={element?.position || elementConfig.defaultPosition}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        position: e.target.value as CardElementPosition,
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Source */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Source</label>
                  <select
                    value={element?.claim_path || ''}
                    onChange={(e) => {
                      if (e.target.value === '__static__') {
                        updateFrontElement(displayIndex, elementConfig.key, {
                          claim_path: undefined,
                          value: '',
                        });
                      } else {
                        updateFrontElement(displayIndex, elementConfig.key, {
                          claim_path: e.target.value || undefined,
                          value: undefined,
                        });
                      }
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="">Select claim...</option>
                    {claimPaths.map((cp) => (
                      <option key={cp.path} value={cp.path}>
                        {cp.label} ({cp.path})
                      </option>
                    ))}
                    <option value="__static__">Static value</option>
                  </select>
                </div>
              </div>

              {/* Static value input (when not using claim_path) */}
              {!element?.claim_path && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Static Value</label>
                  <input
                    type="text"
                    value={element?.value || ''}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        value: e.target.value,
                      })
                    }
                    placeholder="Enter static value..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                </div>
              )}

              {/* Label (for claim-based elements) */}
              {element?.claim_path && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Display Label (optional)
                  </label>
                  <input
                    type="text"
                    value={element?.label || ''}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        label: e.target.value,
                      })
                    }
                    placeholder="e.g., Property Address"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Card Branding Section */}
      <div className="space-y-4">
        <h5 className="text-sm font-semibold text-gray-700 border-b pb-2">
          Card Branding
        </h5>
        <p className="text-xs text-gray-500 -mt-2">
          Identity and branding elements for the credential card.
        </p>

        {CARD_BRANDING.map((elementConfig) => {
          const element = frontElements[elementConfig.key];

          return (
            <div
              key={elementConfig.key}
              className="border border-gray-100 rounded p-3 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {elementConfig.label}
                  </span>
                  <p className="text-xs text-gray-500">{elementConfig.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Position */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Position</label>
                  <select
                    value={element?.position || elementConfig.defaultPosition}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        position: e.target.value as CardElementPosition,
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Source */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {elementConfig.isFixed ? 'Value (Fixed)' : 'Source'}
                  </label>
                  {elementConfig.isFixed ? (
                    <input
                      type="text"
                      value={elementConfig.fixedValue}
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-100 text-gray-500"
                    />
                  ) : (
                    <select
                      value={element?.claim_path || ''}
                      onChange={(e) => {
                        if (e.target.value === '__static__') {
                          updateFrontElement(displayIndex, elementConfig.key, {
                            claim_path: undefined,
                            value: '',
                          });
                        } else {
                          updateFrontElement(displayIndex, elementConfig.key, {
                            claim_path: e.target.value || undefined,
                            value: undefined,
                          });
                        }
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    >
                      <option value="">Select claim...</option>
                      {claimPaths.map((cp) => (
                        <option key={cp.path} value={cp.path}>
                          {cp.label} ({cp.path})
                        </option>
                      ))}
                      <option value="__static__">Static value</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Static value input (when not using claim_path) */}
              {!elementConfig.isFixed && !element?.claim_path && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Static Value</label>
                  <input
                    type="text"
                    value={element?.value || ''}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        value: e.target.value,
                      })
                    }
                    placeholder="Enter static value..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                </div>
              )}

              {/* Label (for claim-based elements) */}
              {!elementConfig.isFixed && element?.claim_path && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Display Label (optional)
                  </label>
                  <input
                    type="text"
                    value={element?.label || ''}
                    onChange={(e) =>
                      updateFrontElement(displayIndex, elementConfig.key, {
                        label: e.target.value,
                      })
                    }
                    placeholder="e.g., Property Address"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                </div>
              )}

              {/* Logo URI (for elements that support logos) */}
              {elementConfig.supportsLogo && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Logo / Icon Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={element?.logo_uri || ''}
                      onChange={(e) =>
                        updateFrontElement(displayIndex, elementConfig.key, {
                          logo_uri: e.target.value || undefined,
                        })
                      }
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => openAssetPicker(elementConfig.key)}
                      className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Browse Asset Library"
                    >
                      Browse
                    </button>
                  </div>
                  {element?.logo_uri && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={element.logo_uri}
                        alt="Logo preview"
                        className="w-10 h-10 object-contain border rounded bg-gray-50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-gray-500 truncate flex-1">{element.logo_uri}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateFrontElement(displayIndex, elementConfig.key, {
                            logo_uri: undefined,
                          })
                        }
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back of Card Elements */}
      <div className="space-y-4">
        <h5 className="text-sm font-semibold text-gray-700 border-b pb-2">
          Back of Card
        </h5>

        {/* Metadata Fields */}
        <div className="border border-gray-100 rounded p-3 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Metadata Fields</span>
            <p className="text-xs text-gray-500">
              Select which metadata to display on the back of the card
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {METADATA_FIELD_OPTIONS.map((field) => (
              <label
                key={field.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={metadataFields.includes(field.id)}
                  onChange={() => handleMetadataFieldToggle(field.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        {/* Evidence Sources */}
        <div className="border border-gray-100 rounded p-3 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-sm font-medium text-gray-700">Evidence Sources</span>
              <p className="text-xs text-gray-500">
                Data furnishers and linked credentials that support this credential
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingEvidence(true)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Source
            </button>
          </div>

          {/* Existing Evidence Sources */}
          {evidenceSources.length > 0 ? (
            <div className="space-y-2">
              {evidenceSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-start gap-3 p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600 shrink-0 overflow-hidden">
                    {source.logo_uri ? (
                      <img
                        src={source.logo_uri}
                        alt={source.display}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            source.display.slice(0, 2).toUpperCase();
                        }}
                      />
                    ) : source.badge === 'initials' ? (
                      source.display.slice(0, 2).toUpperCase()
                    ) : (
                      <span className="text-[8px] opacity-50">IMG</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {source.display}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {EVIDENCE_SOURCE_TYPE_LABELS[source.type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{source.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvidenceSource(displayIndex, source.id)}
                    className="text-red-500 hover:text-red-700 text-sm shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No evidence sources configured</p>
          )}

          {/* Add Evidence Form */}
          {isAddingEvidence && (
            <div className="border border-blue-200 rounded p-3 bg-blue-50 space-y-3">
              <h6 className="text-sm font-medium text-gray-700">Add Evidence Source</h6>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <select
                    value={newEvidence.type || 'data_furnisher'}
                    onChange={(e) =>
                      setNewEvidence({
                        ...newEvidence,
                        type: e.target.value as EvidenceSourceType,
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    {Object.entries(EVIDENCE_SOURCE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Badge Style</label>
                  <select
                    value={newEvidence.badge || 'logo'}
                    onChange={(e) =>
                      setNewEvidence({
                        ...newEvidence,
                        badge: e.target.value as 'initials' | 'logo',
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  >
                    <option value="logo">Logo</option>
                    <option value="initials">Initials</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">ID *</label>
                <input
                  type="text"
                  value={newEvidence.id || ''}
                  onChange={(e) =>
                    setNewEvidence({ ...newEvidence, id: e.target.value })
                  }
                  placeholder="e.g., interac_verified"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={newEvidence.display || ''}
                  onChange={(e) =>
                    setNewEvidence({ ...newEvidence, display: e.target.value })
                  }
                  placeholder="e.g., Interac Verified"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Description *</label>
                <input
                  type="text"
                  value={newEvidence.description || ''}
                  onChange={(e) =>
                    setNewEvidence({ ...newEvidence, description: e.target.value })
                  }
                  placeholder="e.g., Identity Verification"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                />
              </div>

              {newEvidence.badge === 'logo' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Logo URI</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newEvidence.logo_uri || ''}
                      onChange={(e) =>
                        setNewEvidence({ ...newEvidence, logo_uri: e.target.value })
                      }
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => openAssetPicker('evidence')}
                      className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Browse Asset Library"
                    >
                      Browse
                    </button>
                  </div>
                  {newEvidence.logo_uri && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={newEvidence.logo_uri}
                        alt="Logo preview"
                        className="w-8 h-8 object-contain border rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-gray-500 truncate">{newEvidence.logo_uri}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingEvidence(false);
                    setNewEvidence({ type: 'data_furnisher', badge: 'logo' });
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddEvidence}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Evidence
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Library Modal */}
      <AssetLibrary
        isOpen={assetPickerOpen}
        onClose={() => {
          setAssetPickerOpen(false);
          setAssetPickerTarget(null);
        }}
        onSelect={handleAssetSelect}
        title={
          assetPickerTarget === 'evidence'
            ? 'Select Evidence Source Logo'
            : assetPickerTarget === 'portfolio_issuer'
            ? 'Select Portfolio Issuer Logo'
            : assetPickerTarget === 'network_mark'
            ? 'Select Network Mark Logo'
            : assetPickerTarget === 'credential_issuer'
            ? 'Select Credential Issuer Logo'
            : 'Select Image'
        }
      />
    </div>
  );
}
