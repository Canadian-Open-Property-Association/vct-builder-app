import { useState, useEffect } from 'react';
import { useEntityStore } from '../../../store/entityStore';
import type { Entity, EntityType, EntityStatus } from '../../../types/entity';
import { ENTITY_TYPE_CONFIG, ENTITY_STATUS_CONFIG } from '../../../types/entity';
import AssetLibrary from '../../../components/AssetLibrary/AssetLibrary';

interface EntityFormProps {
  entityId: string | null;
  onClose: () => void;
}

type FormData = Omit<Entity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;

const defaultFormData: FormData = {
  id: '',
  name: '',
  types: [],
  description: '',
  logoUri: '',
  primaryColor: '',
  website: '',
  contactEmail: '',
  did: '',
  status: 'active',
};

// Generate a slug from name with copa- prefix
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `copa-${slug}` : '';
}

export default function EntityForm({ entityId, onClose }: EntityFormProps) {
  const { entities, createEntity, updateEntity } = useEntityStore();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);

  const isEditing = !!entityId;

  useEffect(() => {
    if (entityId) {
      const entity = entities.find((e) => e.id === entityId);
      if (entity) {
        setFormData({
          id: entity.id,
          name: entity.name,
          types: entity.types || [],
          description: entity.description || '',
          logoUri: entity.logoUri || '',
          primaryColor: entity.primaryColor || '',
          website: entity.website || '',
          contactEmail: entity.contactEmail || '',
          did: entity.did || '',
          status: entity.status,
        });
      }
    }
  }, [entityId, entities]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate ID from name for new entities
    if (name === 'name' && !isEditing) {
      setFormData((prev) => ({ ...prev, id: generateSlug(value) }));
    }
  };

  const handleAssetSelect = (uri: string) => {
    setFormData((prev) => ({ ...prev, logoUri: uri }));
    setShowAssetLibrary(false);
  };

  const handleTypeToggle = (type: EntityType) => {
    setFormData((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }

      if (formData.types.length === 0) {
        throw new Error('At least one type is required');
      }

      if (isEditing) {
        await updateEntity(entityId, formData);
      } else {
        await createEntity(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Entity' : 'Add New Entity'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Basic Info Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Organization name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity ID
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-50"
                    placeholder="copa-entity-name"
                    disabled={isEditing}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated from name (format: copa-entity-name)
                  </p>
                </div>
              </div>

              {/* Types (multi-select checkboxes) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(ENTITY_TYPE_CONFIG) as EntityType[]).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.types.includes(type)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.types.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          formData.types.includes(type)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {formData.types.includes(type) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-medium">{ENTITY_TYPE_CONFIG[type].label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select all types that apply to this entity
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(ENTITY_STATUS_CONFIG) as EntityStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {ENTITY_STATUS_CONFIG[status].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the entity"
                />
              </div>

              {/* Logo Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                    {formData.logoUri ? (
                      <img
                        src={
                          formData.logoUri.startsWith('http')
                            ? formData.logoUri
                            : formData.logoUri.startsWith('/')
                              ? formData.logoUri
                              : `/assets/${formData.logoUri}`
                        }
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setShowAssetLibrary(true)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        Browse Library
                      </button>
                      {formData.logoUri && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, logoUri: '' }))}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      name="logoUri"
                      value={formData.logoUri}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Or enter URL directly"
                    />
                  </div>
                </div>
              </div>

              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="primaryColor"
                    value={formData.primaryColor || '#1a365d'}
                    onChange={handleChange}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="#1a365d"
                  />
                </div>
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              {/* DID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DID (Decentralized Identifier)
                </label>
                <input
                  type="text"
                  name="did"
                  value={formData.did}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="did:web:example.com"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Entity' : 'Create Entity'}
            </button>
          </div>
        </div>
      </div>

      {/* Asset Library Modal */}
      <AssetLibrary
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        onSelect={handleAssetSelect}
        title="Select Logo"
      />
    </>
  );
}
