/**
 * PresentationPreview Component
 *
 * Displays the DIF Presentation Exchange JSON output
 * that will be published to the VDR.
 */

import { useState } from 'react';
import { PresentationDefinition } from '../../../types/proofTemplate';

interface PresentationPreviewProps {
  definition: PresentationDefinition | null;
}

export default function PresentationPreview({ definition }: PresentationPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!definition) return;
    navigator.clipboard.writeText(JSON.stringify(definition, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!definition) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Presentation Exchange Preview</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 p-6">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p className="text-sm">No template loaded</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Presentation Exchange Preview</h3>
          <p className="text-xs text-gray-500 mt-0.5">DIF PE v2.0 format</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
          {JSON.stringify(definition, null, 2)}
        </pre>
      </div>

      {/* Stats footer */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{definition.input_descriptors?.length || 0} input descriptor(s)</span>
          <span>{JSON.stringify(definition).length} bytes</span>
        </div>
      </div>
    </div>
  );
}
