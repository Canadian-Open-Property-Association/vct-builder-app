import { useState, useEffect, useCallback, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useVctStore } from '../../store/vctStore';
import { isFrontBackFormat, VCTSvgTemplate, VCT } from '../../types/vct';

export default function JsonPreview() {
  const currentVct = useVctStore((state) => state.currentVct);
  const setVct = useVctStore((state) => state.setVct);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedJson, setEditedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clean up the VCT object for export (remove empty optional fields)
  const cleanVct = useCallback(() => {
    const cleaned: Record<string, unknown> = {
      vct: currentVct.vct,
      name: currentVct.name,
    };

    if (currentVct.description) {
      cleaned.description = currentVct.description;
    }

    if (currentVct.extends) {
      cleaned.extends = currentVct.extends;
      if (currentVct['extends#integrity']) {
        cleaned['extends#integrity'] = currentVct['extends#integrity'];
      }
    }

    if (currentVct.schema_uri) {
      cleaned.schema_uri = currentVct.schema_uri;
      if (currentVct['schema_uri#integrity']) {
        cleaned['schema_uri#integrity'] = currentVct['schema_uri#integrity'];
      }
    }

    // Clean display array
    cleaned.display = currentVct.display.map((d) => {
      const display: Record<string, unknown> = {
        locale: d.locale,
        name: d.name,
      };

      if (d.description) {
        display.description = d.description;
      }

      if (d.rendering) {
        const rendering: Record<string, unknown> = {};

        if (d.rendering.simple) {
          const simple: Record<string, unknown> = {};

          if (d.rendering.simple.background_color) {
            simple.background_color = d.rendering.simple.background_color;
          }
          if (d.rendering.simple.text_color) {
            simple.text_color = d.rendering.simple.text_color;
          }
          if (d.rendering.simple.font_family) {
            simple.font_family = d.rendering.simple.font_family;
          }

          if (d.rendering.simple.logo?.uri) {
            simple.logo = {
              uri: d.rendering.simple.logo.uri,
              ...(d.rendering.simple.logo['uri#integrity'] && {
                'uri#integrity': d.rendering.simple.logo['uri#integrity'],
              }),
              ...(d.rendering.simple.logo.alt_text && {
                alt_text: d.rendering.simple.logo.alt_text,
              }),
            };
          }

          if (d.rendering.simple.background_image?.uri) {
            simple.background_image = {
              uri: d.rendering.simple.background_image.uri,
              ...(d.rendering.simple.background_image['uri#integrity'] && {
                'uri#integrity': d.rendering.simple.background_image['uri#integrity'],
              }),
            };
          }

          if (Object.keys(simple).length > 0) {
            rendering.simple = simple;
          }
        }

        // Handle svg_templates (COPA front/back format, with backward compatibility for legacy arrays)
        if (d.rendering.svg_templates) {
          const cleanTemplate = (t: VCTSvgTemplate) => {
            const template: Record<string, unknown> = {
              uri: t.uri,
            };
            if (t['uri#integrity']) {
              template['uri#integrity'] = t['uri#integrity'];
            }
            if (t.properties) {
              const props: Record<string, unknown> = {};
              if (t.properties.orientation) props.orientation = t.properties.orientation;
              if (t.properties.color_scheme) props.color_scheme = t.properties.color_scheme;
              if (t.properties.contrast) props.contrast = t.properties.contrast;
              if (Object.keys(props).length > 0) {
                template.properties = props;
              }
            }
            return template;
          };

          // Always output COPA front/back format
          const templates: Record<string, unknown> = {};

          if (isFrontBackFormat(d.rendering.svg_templates)) {
            // Already in COPA format
            if (d.rendering.svg_templates.front?.uri) {
              templates.front = cleanTemplate(d.rendering.svg_templates.front);
            }
            if (d.rendering.svg_templates.back?.uri) {
              templates.back = cleanTemplate(d.rendering.svg_templates.back);
            }
          } else if (Array.isArray(d.rendering.svg_templates)) {
            // Convert legacy array to COPA format
            const filtered = d.rendering.svg_templates.filter((t: VCTSvgTemplate) => t.uri);
            if (filtered[0]) {
              templates.front = cleanTemplate(filtered[0]);
            }
            if (filtered[1]) {
              templates.back = cleanTemplate(filtered[1]);
            }
          }

          if (Object.keys(templates).length > 0) {
            rendering.svg_templates = templates;
          }
        }

        // Handle card_elements (COPA standard)
        if (d.card_elements) {
          const cardElements: Record<string, unknown> = {};

          if (d.card_elements.front) {
            const front: Record<string, unknown> = {};
            for (const [key, element] of Object.entries(d.card_elements.front)) {
              if (element && (element.claim_path || element.value || element.logo_uri)) {
                // Clean the element - only include non-empty fields
                const cleanedElement: Record<string, unknown> = {};
                if (element.position) cleanedElement.position = element.position;
                if (element.claim_path) cleanedElement.claim_path = element.claim_path;
                if (element.value) cleanedElement.value = element.value;
                if (element.label) cleanedElement.label = element.label;
                if (element.logo_uri) cleanedElement.logo_uri = element.logo_uri;
                front[key] = cleanedElement;
              }
            }
            if (Object.keys(front).length > 0) {
              cardElements.front = front;
            }
          }

          if (d.card_elements.back) {
            const back: Record<string, unknown> = {};
            if (d.card_elements.back.metadata && d.card_elements.back.metadata.fields.length > 0) {
              back.metadata = d.card_elements.back.metadata;
            }
            if (d.card_elements.back.evidence && d.card_elements.back.evidence.sources.length > 0) {
              back.evidence = d.card_elements.back.evidence;
            }
            if (Object.keys(back).length > 0) {
              cardElements.back = back;
            }
          }

          if (Object.keys(cardElements).length > 0) {
            display.card_elements = cardElements;
          }
        }

        if (Object.keys(rendering).length > 0) {
          display.rendering = rendering;
        }
      }

      return display;
    });

    // Clean claims array
    if (currentVct.claims.length > 0) {
      const cleanedClaims = currentVct.claims
        .filter((c) => c.path.some((p) => p)) // Only include claims with at least one path segment
        .map((c) => {
          const claim: Record<string, unknown> = {
            path: c.path.filter((p) => p !== null && p !== ''), // Remove empty path segments
            display: c.display
              .filter((d) => d.label) // Only include displays with labels
              .map((d) => ({
                locale: d.locale,
                label: d.label,
                ...(d.description && { description: d.description }),
              })),
          };

          // Add optional claim properties
          if (c.mandatory !== undefined && c.mandatory !== false) {
            claim.mandatory = c.mandatory;
          }
          if (c.sd && c.sd !== 'allowed') {
            claim.sd = c.sd;
          }
          if (c.svg_id) {
            claim.svg_id = c.svg_id;
          }

          return claim;
        });

      if (cleanedClaims.length > 0) {
        cleaned.claims = cleanedClaims;
      }
    }

    return cleaned;
  }, [currentVct]);

  const jsonString = JSON.stringify(cleanVct(), null, 2);

  // Initialize edited JSON when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setEditedJson(jsonString);
      setParseError(null);
      // Focus textarea when entering edit mode
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isEditMode]); // Only run when isEditMode changes, not when jsonString changes

  // Validate JSON as user types
  const handleJsonChange = (value: string) => {
    setEditedJson(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  // Apply changes to store
  const applyChanges = useCallback(() => {
    try {
      const parsed = JSON.parse(editedJson) as VCT;

      // Basic validation - must have required fields
      if (!parsed.vct || !parsed.name || !Array.isArray(parsed.display)) {
        setParseError('Invalid VCT: missing required fields (vct, name, display)');
        return false;
      }

      // Ensure each display has required fields
      for (let i = 0; i < parsed.display.length; i++) {
        const d = parsed.display[i];
        if (!d.locale) {
          setParseError(`Invalid VCT: display[${i}] missing locale`);
          return false;
        }
      }

      // Ensure claims array exists (even if empty)
      if (!parsed.claims) {
        parsed.claims = [];
      }

      setVct(parsed);
      setParseError(null);
      setIsEditMode(false);
      return true;
    } catch (e) {
      setParseError((e as Error).message);
      return false;
    }
  }, [editedJson, setVct]);

  // Cancel edit mode
  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedJson('');
    setParseError(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditMode ? editedJson : jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const content = isEditMode ? editedJson : jsonString;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentVct.name || 'vct'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Action buttons */}
      <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700 flex-wrap">
        {isEditMode ? (
          <>
            <button
              onClick={applyChanges}
              disabled={!!parseError}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                parseError
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-500'
              }`}
            >
              Apply Changes
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditMode(true)}
            className="px-3 py-1 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded"
          >
            Edit JSON
          </button>
        )}
        <button
          onClick={handleCopy}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
        >
          Download
        </button>
      </div>

      {/* Parse error message */}
      {parseError && (
        <div className="px-3 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-xs">
          <span className="font-semibold">JSON Error:</span> {parseError}
        </div>
      )}

      {/* JSON content */}
      <div className="flex-1 overflow-auto">
        {isEditMode ? (
          <textarea
            ref={textareaRef}
            value={editedJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`w-full h-full p-4 bg-transparent text-gray-100 font-mono text-xs leading-relaxed resize-none focus:outline-none ${
              parseError ? 'border-l-2 border-red-500' : ''
            }`}
            spellCheck={false}
          />
        ) : (
          <SyntaxHighlighter
            language="json"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.75rem',
              lineHeight: '1.5',
            }}
            wrapLines
            wrapLongLines
          >
            {jsonString}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
