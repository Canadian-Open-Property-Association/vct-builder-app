/**
 * Credential List Component
 *
 * Displays a searchable, grouped list of imported credentials.
 * Follows the same pattern as EntityList in EntityManager.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useCatalogueStore } from '../../../store/catalogueStore';
import type { CatalogueCredential } from '../../../types/catalogue';

interface CredentialListProps {
  onAddCredential: () => void;
  onOpenSettings: () => void;
}

export default function CredentialList({ onAddCredential, onOpenSettings }: CredentialListProps) {
  const {
    credentials,
    selectedCredential,
    selectCredential,
    searchQuery,
    setSearchQuery,
    fetchCredentials,
    ecosystemTags,
    fetchTags,
    isLoading,
    error,
  } = useCatalogueStore();

  const credentialRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Fetch credentials and tags on mount
  useEffect(() => {
    fetchCredentials();
    fetchTags();
  }, [fetchCredentials, fetchTags]);

  // Auto-scroll to selected credential when it changes
  useEffect(() => {
    if (selectedCredential && credentialRefs.current[selectedCredential.id]) {
      const element = credentialRefs.current[selectedCredential.id];
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedCredential]);

  // Get ecosystem tag label
  const getEcosystemLabel = (tagId: string): string => {
    const tag = ecosystemTags.find((t) => t.id === tagId);
    return tag?.name || tagId;
  };

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Filter credentials by search query
  const filteredCredentials = credentials.filter((credential) => {
    if (!searchQuery || searchQuery.length < 2) return true;
    const query = searchQuery.toLowerCase();
    return (
      credential.name.toLowerCase().includes(query) ||
      credential.schemaId.toLowerCase().includes(query) ||
      credential.credDefId?.toLowerCase().includes(query) ||
      credential.issuerName?.toLowerCase().includes(query)
    );
  });

  // Group credentials by ecosystem tag
  const groupedCredentials = useMemo(() => {
    const groups: Record<string, CatalogueCredential[]> = {};
    const orderedTags: string[] = [];

    // First pass: collect all ecosystem tags
    filteredCredentials.forEach((credential) => {
      const tag = credential.ecosystemTag || 'other';
      if (!orderedTags.includes(tag)) {
        orderedTags.push(tag);
      }
    });

    // Sort alphabetically by label
    orderedTags.sort((a, b) => {
      return getEcosystemLabel(a).localeCompare(getEcosystemLabel(b));
    });

    // Group credentials by tag
    orderedTags.forEach((tag) => {
      groups[tag] = filteredCredentials
        .filter((c) => (c.ecosystemTag || 'other') === tag)
        .sort((a, b) => a.name.localeCompare(b.name));
    });

    return { groups, orderedTags };
  }, [filteredCredentials]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Button */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            {filteredCredentials.length}{' '}
            {filteredCredentials.length === 1 ? 'credential' : 'credentials'}
            {searchQuery && credentials.length !== filteredCredentials.length && (
              <span className="text-gray-400"> of {credentials.length}</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onAddCredential}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              title="Import credential"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Import
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Catalogue settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm">Loading credentials...</p>
          </div>
        </div>
      ) : error ? (
        /* Error state */
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-red-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm font-medium text-red-600">Error loading credentials</p>
            <p className="text-xs mt-1 text-gray-500">{error}</p>
            <button
              onClick={() => fetchCredentials()}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredCredentials.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium">No credentials found</p>
            {searchQuery ? (
              <p className="text-xs mt-1">Try a different search term</p>
            ) : (
              <button
                onClick={onAddCredential}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Import your first credential
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" ref={listContainerRef}>
          {/* Credential list grouped by ecosystem */}
          <div>
            {groupedCredentials.orderedTags.map((tagId) => {
              const credentialsInGroup = groupedCredentials.groups[tagId];
              const isCollapsed = collapsedSections.has(tagId);
              const ecosystemTag = ecosystemTags.find((t) => t.id === tagId);
              const sectionLabel = ecosystemTag?.name || tagId;

              return (
                <div key={tagId}>
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(tagId)}
                    className="w-full flex items-center gap-2 px-3 py-2 border-y border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* Collapse/expand chevron */}
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isCollapsed ? '' : 'rotate-90'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-xs font-medium uppercase tracking-wide flex-1 text-left text-gray-600">
                      {sectionLabel}
                    </span>
                    {/* Count badge */}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">
                      {credentialsInGroup.length}
                    </span>
                  </button>

                  {/* Section content */}
                  {!isCollapsed && (
                    <div>
                      {credentialsInGroup.map((credential) => {
                        const isSelected = selectedCredential?.id === credential.id;

                        return (
                          <div
                            key={credential.id}
                            ref={(el) => {
                              credentialRefs.current[credential.id] = el;
                            }}
                            onClick={() => selectCredential(credential.id)}
                            className={`group p-3 cursor-pointer transition-colors border-l-4 ${
                              isSelected
                                ? 'bg-blue-50 border-l-blue-500'
                                : 'hover:bg-gray-50 border-l-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Credential icon */}
                              <div
                                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-900 text-sm line-clamp-2 break-words">
                                  {credential.name}
                                </span>
                                {/* Issuer name or ledger */}
                                <div className="flex items-center gap-2 mt-0.5">
                                  {credential.issuerName ? (
                                    <span className="text-xs text-gray-500 truncate">
                                      {credential.issuerName}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 truncate">
                                      {credential.ledger}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Orbit status indicator */}
                              {credential.orbitSchemaId && (
                                <span
                                  className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500"
                                  title="Registered with Orbit"
                                />
                              )}
                              {credential.orbitRegistrationError && (
                                <span
                                  className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-500"
                                  title="Orbit registration failed"
                                />
                              )}

                              {/* Attributes count */}
                              <span
                                className="flex-shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium"
                                title={`${credential.attributes.length} attributes`}
                              >
                                {credential.attributes.length}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
