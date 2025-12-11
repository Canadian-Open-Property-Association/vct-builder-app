/**
 * Vocabulary Reference Component
 *
 * Documents the Data Dictionary vocabulary structure and how it integrates
 * with Schema Builder and other credential design tools.
 */

import { useState, useEffect } from 'react';
import { fetchDomains, fetchDataTypes, fetchCatalogueStats, DataType, DataTypeDomain } from '../../../services/catalogueApi';

// Domain colors for badges
const DOMAIN_COLORS: Record<string, string> = {
  property: '#10B981',
  financial: '#3B82F6',
  identity: '#8B5CF6',
  employment: '#F59E0B',
  other: '#6B7280',
  untagged: '#9CA3AF',
};

interface CatalogueStats {
  totalDataTypes: number;
  totalProperties: number;
  totalSources: number;
  totalDomains: number;
  totalCategories: number;
  domainCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
}

export default function VocabReference() {
  const [domains, setDomains] = useState<DataTypeDomain[]>([]);
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Get domains for a vocab type (supporting both new and legacy format)
  const getVocabTypeDomains = (vt: DataType): string[] => {
    if (vt.domains && vt.domains.length > 0) {
      return vt.domains;
    }
    if (vt.category) {
      return [vt.category];
    }
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [doms, types, catalogueStats] = await Promise.all([
          fetchDomains(),
          fetchDataTypes(),
          fetchCatalogueStats(),
        ]);
        setDomains(doms);
        setDataTypes(types);
        setStats(catalogueStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vocabulary data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredDataTypes = selectedDomain
    ? dataTypes.filter((dt) => {
        const vtDomains = getVocabTypeDomains(dt);
        return vtDomains.includes(selectedDomain);
      })
    : dataTypes;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vocabulary Reference</h1>
        <p className="text-gray-600">
          The Data Catalogue serves as the authoritative vocabulary for all credential schemas.
          DataTypes define vocabulary domains, and Properties define the canonical terms.
        </p>
      </div>

      {/* Architecture Overview */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Architecture</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-medium w-32">Data Catalogue</span>
              <span className="text-gray-600">Authoritative source for vocabulary terms (DataTypes + Properties)</span>
            </div>
            <div className="flex items-center gap-2 pl-8 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              provides vocabulary via API
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-medium w-32">Schema Builder</span>
              <span className="text-gray-600">Consumes vocabulary, creates JSON-LD contexts and JSON schemas</span>
            </div>
            <div className="flex items-center gap-2 pl-8 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              publishes schemas to
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-medium w-32">GitHub VDR</span>
              <span className="text-gray-600">Storage for published schemas, contexts, and VCT files</span>
            </div>
            <div className="flex items-center gap-2 pl-8 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              serves via
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-600 font-medium w-32">COPA Website</span>
              <span className="text-gray-600">Public URLs resolve to hosted artifacts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Statistics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Dictionary Statistics</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-gray-500">Loading statistics...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.totalDataTypes}</div>
              <div className="text-sm text-gray-500">Vocab Types</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalProperties}</div>
              <div className="text-sm text-gray-500">Properties</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.totalDomains}</div>
              <div className="text-sm text-gray-500">Domains</div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Vocabulary Structure */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Vocabulary Structure</h2>
        <div className="bg-gray-800 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre">{`Domains (identity, property, financial, employment, other)
└── VocabTypes (vocabulary groups - can belong to multiple domains)
    │   id: "homeowner-details" (kebab-case)
    │   name: "Homeowner Details"
    │   domains: ["identity", "property"]  (multi-domain tagging)
    │
    └── Properties (vocabulary terms)
            id: "prop-homeowner_first_name"
            name: "homeowner_first_name" (snake_case - canonical)
            displayName: "Homeowner First Name"
            valueType: "string" | "number" | "date" | "currency" | ...`}</pre>
        </div>
      </section>

      {/* JSON-LD Integration */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">JSON-LD Integration</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Property @id Pattern</h3>
            <p className="text-sm text-gray-600 mb-3">
              Property <code className="bg-gray-100 px-1.5 py-0.5 rounded">@id</code> values use the{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded">copa:</code> prefix with the canonical snake_case property name.
            </p>
            <div className="bg-gray-800 text-gray-100 rounded p-3 font-mono text-sm">
              <pre>{`{
  "@context": {
    "copa": "https://openpropertyassociation.ca/vocab#",
    "homeowner_first_name": {
      "@id": "copa:homeowner_first_name",
      "@type": "xsd:string"
    },
    "purchase_price": {
      "@id": "copa:purchase_price",
      "@type": "xsd:decimal"
    }
  }
}`}</pre>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Schema Builder Integration</h3>
            <p className="text-sm text-gray-600 mb-3">
              When creating JSON-LD schemas, the Schema Builder fetches vocabulary from the Data Catalogue API
              and maps properties to their canonical names.
            </p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>User clicks "Add from Vocabulary" in Schema Builder</li>
              <li>Modal fetches DataTypes from <code className="bg-gray-100 px-1.5 py-0.5 rounded">/api/catalogue/data-types</code></li>
              <li>User browses and selects properties</li>
              <li>Properties added with <code className="bg-gray-100 px-1.5 py-0.5 rounded">@id: "copa:{'{property_name}'}"</code></li>
            </ol>
          </div>
        </div>
      </section>

      {/* Live DataTypes Browser */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Browse Vocabulary</h2>

        {/* Domain Filter Chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDomain(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedDomain === null
                ? 'bg-gray-700 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {domains.sort((a, b) => a.order - b.order).map(domain => {
            const isActive = selectedDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(isActive ? null : domain.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: getDomainColor(domain.id) } : {}}
              >
                {domain.name}
              </button>
            );
          })}
        </div>

        {/* DataTypes List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        ) : filteredDataTypes.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No vocabulary types found. Add vocabulary terms in the Data Dictionary app.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDataTypes.map((dt) => (
              <DataTypeCard
                key={dt.id}
                dataType={dt}
                getDomainColor={getDomainColor}
                getDomainLabel={getDomainLabel}
                getVocabTypeDomains={getVocabTypeDomains}
              />
            ))}
          </div>
        )}
      </section>

      {/* API Reference */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Vocabulary API</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            The Data Dictionary API provides endpoints for accessing vocabulary terms, domains, and search functionality.
          </p>
          <div className="flex gap-3">
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Swagger UI
            </a>
            <code className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg font-mono">
              Base: /api/dictionary
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}

// DataType Card Component
function DataTypeCard({ dataType, getDomainColor, getDomainLabel, getVocabTypeDomains }: {
  dataType: DataType;
  getDomainColor: (domainId: string) => string;
  getDomainLabel: (domainId: string) => string;
  getVocabTypeDomains: (vt: DataType) => string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const vtDomains = getVocabTypeDomains(dataType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium">{dataType.name}</span>
          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{dataType.id}</code>
          {vtDomains.map(domainId => (
            <span
              key={domainId}
              className="text-xs px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: getDomainColor(domainId) }}
            >
              {getDomainLabel(domainId)}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{dataType.properties.length} properties</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {dataType.description && (
            <p className="text-sm text-gray-600 mb-3">{dataType.description}</p>
          )}
          {dataType.properties.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No properties defined</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2 font-medium">Canonical Name</th>
                    <th className="pb-2 font-medium">Display Name</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">@id</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dataType.properties.map((prop) => (
                    <tr key={prop.id}>
                      <td className="py-2">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded">{prop.name}</code>
                      </td>
                      <td className="py-2 text-gray-600">{prop.displayName}</td>
                      <td className="py-2">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {prop.valueType}
                        </span>
                      </td>
                      <td className="py-2">
                        <code className="text-purple-600">copa:{prop.name}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
