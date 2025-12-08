import { useState, useEffect } from 'react';
import { useDataCatalogueStore } from '../../../store/dataCatalogueStore';
import { CANADIAN_REGIONS } from '../constants';
import AssetLibrary from '../../../components/AssetLibrary/AssetLibrary';

interface FurnisherFormProps {
  furnisherId: string | null;
  onClose: () => void;
}

export default function FurnisherForm({ furnisherId, onClose }: FurnisherFormProps) {
  const furnishers = useDataCatalogueStore((state) => state.furnishers);
  const createFurnisher = useDataCatalogueStore((state) => state.createFurnisher);
  const updateFurnisher = useDataCatalogueStore((state) => state.updateFurnisher);

  const existingFurnisher = furnisherId
    ? furnishers.find((f) => f.id === furnisherId)
    : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUri: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    did: '',
    regionsCovered: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);

  useEffect(() => {
    if (existingFurnisher) {
      setFormData({
        name: existingFurnisher.name || '',
        description: existingFurnisher.description || '',
        logoUri: existingFurnisher.logoUri || '',
        website: existingFurnisher.website || '',
        contactName: existingFurnisher.contactName || '',
        contactEmail: existingFurnisher.contactEmail || '',
        contactPhone: existingFurnisher.contactPhone || '',
        did: existingFurnisher.did || '',
        regionsCovered: existingFurnisher.regionsCovered || [],
      });
    }
  }, [existingFurnisher]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegionToggle = (regionValue: string) => {
    const newRegions = formData.regionsCovered.includes(regionValue)
      ? formData.regionsCovered.filter((r) => r !== regionValue)
      : [...formData.regionsCovered, regionValue];
    handleChange('regionsCovered', newRegions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (furnisherId) {
        await updateFurnisher(furnisherId, formData);
      } else {
        await createFurnisher(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save furnisher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              {furnisherId ? 'Edit Furnisher' : 'Add Furnisher'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g., Landcor Data Corporation"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Brief description of the data furnisher..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Logo</h4>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                    {formData.logoUri ? (
                      <img
                        src={formData.logoUri}
                        alt="Logo preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-gray-400 text-2xl">
                        {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAssetLibrary(true)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Choose from Library
                      </button>
                      {formData.logoUri && (
                        <button
                          type="button"
                          onClick={() => handleChange('logoUri', '')}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Or enter URL directly:
                    </p>
                    <input
                      type="text"
                      value={formData.logoUri}
                      onChange={(e) => handleChange('logoUri', e.target.value)}
                      placeholder="https://..."
                      className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Website */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Website</h4>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleChange('contactEmail', e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => handleChange('contactPhone', e.target.value)}
                      placeholder="(604) 555-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Regions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Regions Covered</h4>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {CANADIAN_REGIONS.map((region) => (
                    <label
                      key={region.value}
                      className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer transition-colors ${
                        formData.regionsCovered.includes(region.value)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.regionsCovered.includes(region.value)}
                        onChange={() => handleRegionToggle(region.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{region.value}</span>
                      <span className="text-xs text-gray-500 truncate">{region.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* DID */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Decentralized Identifier (DID)
                  <span className="ml-2 text-xs font-normal text-gray-400">Optional</span>
                </h4>
                <input
                  type="text"
                  value={formData.did}
                  onChange={(e) => handleChange('did', e.target.value)}
                  placeholder="did:web:example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For future trust registry integration
                </p>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : furnisherId ? 'Save Changes' : 'Create Furnisher'}
            </button>
          </div>
        </div>
      </div>

      {/* Asset Library Modal */}
      <AssetLibrary
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        onSelect={(uri) => {
          handleChange('logoUri', uri);
          setShowAssetLibrary(false);
        }}
        title="Select Logo"
      />
    </>
  );
}
