import { useSchemaStore } from '../../../store/schemaStore';
import { SchemaProperty, PROPERTY_TYPE_LABELS } from '../../../types/schema';

interface PropertyNodeProps {
  property: SchemaProperty;
  depth: number;
}

function PropertyNode({ property, depth }: PropertyNodeProps) {
  const {
    selectedPropertyId,
    expandedNodes,
    selectProperty,
    toggleExpanded,
    deleteProperty,
    moveProperty,
    addProperty,
  } = useSchemaStore();

  const isSelected = selectedPropertyId === property.id;
  const isExpanded = expandedNodes.has(property.id);
  const hasChildren =
    (property.type === 'object' && property.properties && property.properties.length > 0) ||
    (property.type === 'array' && property.items);

  const canExpand = property.type === 'object' || property.type === 'array';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectProperty(property.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpanded(property.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete property "${property.name || 'Untitled'}"?`)) {
      deleteProperty(property.id);
    }
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveProperty(property.id, 'up');
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveProperty(property.id, 'down');
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    addProperty(property.id);
  };

  return (
    <div>
      {/* Property Row */}
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer group ${
          isSelected
            ? 'bg-blue-100 text-blue-900'
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse Toggle */}
        {canExpand ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            <svg
              className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Type Icon */}
        <span className="text-xs font-mono text-gray-400 w-6">
          {property.type === 'string' && 'str'}
          {property.type === 'integer' && 'int'}
          {property.type === 'number' && 'num'}
          {property.type === 'boolean' && 'bool'}
          {property.type === 'object' && '{ }'}
          {property.type === 'array' && '[ ]'}
        </span>

        {/* Property Name */}
        <span className={`flex-1 text-sm truncate ${property.name ? '' : 'italic text-gray-400'}`}>
          {property.name || 'untitled'}
        </span>

        {/* Required Badge */}
        {property.required && (
          <span className="text-xs text-red-500 font-medium">*</span>
        )}

        {/* Type Badge */}
        <span className="text-xs text-gray-400">
          {PROPERTY_TYPE_LABELS[property.type]}
        </span>

        {/* Actions (shown on hover) */}
        <div className="hidden group-hover:flex items-center gap-1">
          {canExpand && (
            <button
              onClick={handleAddChild}
              className="p-0.5 hover:bg-blue-100 rounded text-blue-600"
              title="Add nested property"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={handleMoveUp}
            className="p-0.5 hover:bg-gray-200 rounded"
            title="Move up"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={handleMoveDown}
            className="p-0.5 hover:bg-gray-200 rounded"
            title="Move down"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-0.5 hover:bg-red-100 rounded text-red-500"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nested Properties */}
      {isExpanded && hasChildren && (
        <div>
          {property.type === 'object' &&
            property.properties?.map((child) => (
              <PropertyNode key={child.id} property={child} depth={depth + 1} />
            ))}
          {property.type === 'array' && property.items && (
            <div
              className="flex items-center gap-1 px-2 py-1.5 text-gray-400 text-sm italic"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <span className="w-4" />
              <span className="text-xs font-mono w-6">[ ]</span>
              <span>items: {PROPERTY_TYPE_LABELS[property.items.type]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropertyTree() {
  const {
    properties,
    addProperty,
    expandAll,
    collapseAll,
    metadata,
    updateMetadata,
  } = useSchemaStore();

  return (
    <div className="flex flex-col h-full">
      {/* Metadata Section */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Schema Title
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => updateMetadata({ title: e.target.value })}
              placeholder="e.g., Home Credential Schema"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Schema $id
            </label>
            <input
              type="text"
              value={metadata.schemaId}
              onChange={(e) => updateMetadata({ schemaId: e.target.value })}
              placeholder="e.g., https://openpropertyassociation.ca/credentials/schemas/home-credential.json"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => updateMetadata({ description: e.target.value })}
              placeholder="Schema description..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Properties Header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-white">
        <span className="text-sm font-medium text-gray-700">
          credentialSubject Properties
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Expand all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Collapse all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          </button>
          <button
            onClick={() => addProperty()}
            className="p-1 hover:bg-blue-100 rounded text-blue-600"
            title="Add property"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Properties Tree */}
      <div className="flex-1 overflow-y-auto">
        {properties.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm mb-2">No properties defined yet.</p>
            <button
              onClick={() => addProperty()}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add first property
            </button>
          </div>
        ) : (
          properties.map((property) => (
            <PropertyNode key={property.id} property={property} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
