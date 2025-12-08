import { FurnisherWithDataTypes } from '../../../types/catalogue';
import { CANADIAN_REGIONS } from '../constants';

interface FurnisherCardProps {
  furnisher: FurnisherWithDataTypes;
  onEdit: () => void;
}

export default function FurnisherCard({ furnisher, onEdit }: FurnisherCardProps) {
  const getRegionLabel = (value: string) => {
    const region = CANADIAN_REGIONS.find(r => r.value === value);
    return region?.label || value;
  };

  const totalAttributes = furnisher.dataTypes.reduce(
    (sum, dt) => sum + (dt.attributes?.length || 0),
    0
  );

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header with logo */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
          {furnisher.logoUri ? (
            <img
              src={furnisher.logoUri}
              alt={furnisher.name}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <span className="text-gray-400 text-3xl font-semibold">
              {furnisher.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800">{furnisher.name}</h2>
          {furnisher.description && (
            <p className="text-gray-600 mt-1">{furnisher.description}</p>
          )}
        </div>

        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Contact & Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Website */}
        {furnisher.website && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a
              href={furnisher.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {furnisher.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {/* Contact */}
        {furnisher.contactName && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-gray-700">{furnisher.contactName}</span>
          </div>
        )}

        {/* Email */}
        {furnisher.contactEmail && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a
              href={`mailto:${furnisher.contactEmail}`}
              className="text-blue-600 hover:underline truncate"
            >
              {furnisher.contactEmail}
            </a>
          </div>
        )}

        {/* Phone */}
        {furnisher.contactPhone && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a
              href={`tel:${furnisher.contactPhone}`}
              className="text-blue-600 hover:underline"
            >
              {furnisher.contactPhone}
            </a>
          </div>
        )}
      </div>

      {/* Regions */}
      {furnisher.regionsCovered && furnisher.regionsCovered.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Regions Covered
          </h4>
          <div className="flex flex-wrap gap-2">
            {furnisher.regionsCovered.map((region) => (
              <span
                key={region}
                className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded"
              >
                {getRegionLabel(region)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* DID */}
      {furnisher.did && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Decentralized Identifier (DID)</h4>
          <code className="block text-xs bg-gray-100 p-2 rounded text-gray-600 break-all">
            {furnisher.did}
          </code>
        </div>
      )}

      {/* Statistics */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Data Statistics
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-gray-800">
              {furnisher.dataTypes.length}
            </div>
            <div className="text-sm text-gray-500">Data Types</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-gray-800">
              {totalAttributes}
            </div>
            <div className="text-sm text-gray-500">Attributes</div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-6 text-xs text-gray-400">
        <p>Created: {new Date(furnisher.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(furnisher.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
