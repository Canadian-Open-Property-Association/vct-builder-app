import { useState } from 'react';
import { useSchemaStore } from '../../../store/schemaStore';
import { GovernanceDoc } from '../../../types/schema';

export default function GovernanceDocsList() {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    governanceDocs,
    isLoadingDocs,
    metadata,
    setGovernanceDoc,
  } = useSchemaStore();

  const handleSelectDoc = (doc: GovernanceDoc) => {
    if (metadata.governanceDocUrl === doc.url) {
      // Deselect if clicking the same doc
      setGovernanceDoc(null);
    } else {
      setGovernanceDoc(doc);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Governance Documents</span>
        </div>
        {metadata.governanceDocName && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {metadata.governanceDocName}
          </span>
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-3">
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            </div>
          ) : governanceDocs.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No governance docs found.</p>
          ) : (
            <ul className="space-y-1">
              {governanceDocs.map((doc) => (
                <li key={doc.path}>
                  <button
                    onClick={() => handleSelectDoc(doc)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${
                      metadata.governanceDocUrl === doc.url
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="truncate">{doc.displayName}</span>
                    {metadata.governanceDocUrl === doc.url && (
                      <svg className="w-4 h-4 ml-auto flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Link to governance doc if selected */}
          {metadata.governanceDocUrl && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <a
                href={metadata.governanceDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View governance document
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
