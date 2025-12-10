import type { VocabProperty, ValueType } from '../../../types/dictionary';

interface JsonPreviewModalProps {
  property: VocabProperty;
  vocabTypeName: string;
  onClose: () => void;
}

// Generate a sample value based on property type
function getSampleValue(property: VocabProperty): unknown {
  if (property.sampleValue) {
    if (property.sampleValue.startsWith('{') || property.sampleValue.startsWith('[')) {
      try {
        return JSON.parse(property.sampleValue);
      } catch {
        return property.sampleValue;
      }
    }
    if (property.valueType === 'number' || property.valueType === 'currency' || property.valueType === 'integer') {
      const num = parseFloat(property.sampleValue);
      return isNaN(num) ? property.sampleValue : num;
    }
    if (property.valueType === 'boolean') {
      return property.sampleValue.toLowerCase() === 'true';
    }
    return property.sampleValue;
  }

  const placeholders: Record<ValueType, unknown> = {
    string: '<string>',
    number: 0,
    integer: 0,
    boolean: false,
    date: '2024-01-15',
    datetime: '2024-01-15T10:30:00Z',
    array: [],
    object: {},
    currency: 0.00,
    url: 'https://example.com',
    email: 'user@example.com',
    phone: '+1-555-123-4567',
  };

  return placeholders[property.valueType] ?? '<value>';
}

export default function JsonPreviewModal({ property, vocabTypeName, onClose }: JsonPreviewModalProps) {
  const sampleValue = getSampleValue(property);

  const credentialPayload = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://openpropertyassociation.ca/credentials/v1',
    ],
    type: ['VerifiableCredential', vocabTypeName.replace(/\s+/g, '')],
    credentialSubject: {
      [property.name]: sampleValue,
    },
  };

  const jsonString = JSON.stringify(credentialPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">JSON Preview</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Property: <span className="font-mono text-gray-700">{property.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Credential Payload Preview</span>
              <button onClick={handleCopy} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
              <code>{jsonString}</code>
            </pre>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Property Details</h4>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Display Name</dt>
                <dd className="font-medium text-gray-800">{property.displayName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Technical Name</dt>
                <dd className="font-mono text-gray-800">{property.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Value Type</dt>
                <dd className="text-gray-800">{property.valueType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Required</dt>
                <dd className="text-gray-800">{property.required ? 'Yes' : 'No'}</dd>
              </div>
              {property.description && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-gray-800">{property.description}</dd>
                </div>
              )}
              {property.jsonLdTerm && (
                <div className="col-span-2">
                  <dt className="text-gray-500">JSON-LD Term</dt>
                  <dd className="font-mono text-blue-600">{property.jsonLdTerm}</dd>
                </div>
              )}
              {property.constraints && Object.keys(property.constraints).length > 0 && (
                <div className="col-span-2">
                  <dt className="text-gray-500 mb-1">Constraints</dt>
                  <dd className="text-xs bg-white rounded px-2 py-1 border border-gray-200 font-mono">
                    <pre>{JSON.stringify(property.constraints, null, 2)}</pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
