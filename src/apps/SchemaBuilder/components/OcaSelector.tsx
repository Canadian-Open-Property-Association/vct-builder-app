/**
 * OcaSelector Component
 *
 * Selector for OCA/VCT branding URL in JSON-LD Context mode.
 * The OCA URL is embedded in the JSON-LD context output.
 */

import { useState, useEffect } from 'react';
import { useSchemaStore } from '../../../store/schemaStore';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';
const VCT_BASE_URL = 'https://openpropertyassociation.ca/credentials/branding';

interface VctFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

export default function OcaSelector() {
  const [vctFiles, setVctFiles] = useState<VctFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const ocaUrl = useSchemaStore((state) => state.metadata.ocaUrl);
  const updateMetadata = useSchemaStore((state) => state.updateMetadata);

  // Fetch VCT files from the library
  useEffect(() => {
    const fetchVctFiles = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/github/vct-library`, {
          credentials: 'include',
        });
        if (response.ok) {
          const files = await response.json();
          setVctFiles(files);
        }
      } catch (error) {
        console.error('Failed to fetch VCT library:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVctFiles();
  }, []);

  const handleSelectVct = (filename: string) => {
    if (!filename) {
      updateMetadata({ ocaUrl: undefined });
    } else {
      updateMetadata({ ocaUrl: `${VCT_BASE_URL}/${filename}` });
    }
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      updateMetadata({ ocaUrl: customUrl.trim() });
      setShowCustomInput(false);
      setCustomUrl('');
    }
  };

  // Get currently selected filename from URL
  const selectedFilename = ocaUrl?.split('/').pop() || '';
  const isCustomUrl = ocaUrl && !vctFiles.some((f) => ocaUrl.endsWith(f.name));

  return (
    <div className="p-3 border-b border-gray-200 bg-purple-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"
            />
          </svg>
          OCA / VCT Branding
        </h3>
        <button
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="text-xs text-purple-600 hover:text-purple-800"
        >
          {showCustomInput ? 'Cancel' : 'Custom URL'}
        </button>
      </div>

      <p className="text-xs text-purple-600 mb-2">
        Link to VCT branding file (embedded in JSON-LD context)
      </p>

      {/* Custom URL Input */}
      {showCustomInput && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/my-vct.json"
              className="flex-1 px-2 py-1.5 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomUrl();
              }}
            />
            <button
              onClick={handleCustomUrl}
              disabled={!customUrl.trim()}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* VCT Selector */}
      <select
        value={isCustomUrl ? '__custom__' : selectedFilename}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            setShowCustomInput(true);
          } else {
            handleSelectVct(e.target.value);
          }
        }}
        disabled={isLoading}
        className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-1 focus:ring-purple-500 bg-white"
      >
        <option value="">No OCA/VCT (optional)</option>
        {vctFiles.map((file) => (
          <option key={file.name} value={file.name}>
            {file.name.replace('.json', '')}
          </option>
        ))}
        {isCustomUrl && (
          <option value="__custom__">Custom: {ocaUrl}</option>
        )}
      </select>

      {/* Current URL Display */}
      {ocaUrl && (
        <div className="mt-2 flex items-center justify-between">
          <a
            href={ocaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-800 truncate flex-1"
            title={ocaUrl}
          >
            {ocaUrl}
          </a>
          <button
            onClick={() => updateMetadata({ ocaUrl: undefined })}
            className="ml-2 text-purple-500 hover:text-red-600"
            title="Clear OCA URL"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
