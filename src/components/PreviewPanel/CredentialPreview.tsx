import { useState, useEffect } from 'react';
import { useVctStore } from '../../store/vctStore';
import {
  getLocaleName,
  isFrontBackFormat,
  isLegacyFormat,
  detectDisplayMode,
  VCTSvgTemplate,
  METADATA_FIELD_OPTIONS,
} from '../../types/vct';

interface CredentialPreviewProps {
  locale: string;
  mode: 'simple' | 'svg';
  cardSide?: 'front' | 'back';
}

export default function CredentialPreview({ locale, mode, cardSide }: CredentialPreviewProps) {
  const currentVct = useVctStore((state) => state.currentVct);
  const sampleData = useVctStore((state) => state.sampleData);
  const [isFlipped, setIsFlipped] = useState(false);

  // Sync flip state when cardSide prop changes from parent buttons
  useEffect(() => {
    if (cardSide === 'back') {
      setIsFlipped(true);
    } else if (cardSide === 'front') {
      setIsFlipped(false);
    }
  }, [cardSide]);

  // Try to find the requested locale, fallback to first available
  const display = currentVct.display.find((d) => d.locale === locale) || currentVct.display[0];
  const effectiveLocale = display?.locale || locale;
  const displayMode = display ? detectDisplayMode(display) : 'legacy';

  // Determine which side to show - clicking always toggles, buttons set a preference that can be toggled from
  const currentSide = isFlipped ? 'back' : 'front';

  if (!display) {
    return (
      <div className="p-8 text-center text-gray-500">
        No display configuration available
      </div>
    );
  }


  const renderSimpleCard = () => {
    const simple = display.rendering?.simple;
    if (!simple) {
      return (
        <div className="p-8 text-center text-gray-500">
          Simple rendering not configured
        </div>
      );
    }

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: simple.background_color || '#1E3A5F',
          color: simple.text_color || '#FFFFFF',
          width: '320px',
          height: '200px',
          backgroundImage: simple.background_image?.uri
            ? `url(${simple.background_image.uri})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Card Header */}
        <div className="p-4 flex items-start justify-between flex-shrink-0">
          {simple.logo?.uri && (
            <img
              src={simple.logo.uri}
              alt={simple.logo.alt_text || 'Logo'}
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="text-right">
            <p className="text-xs opacity-75">Verifiable Credential</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-4 pb-2 flex-grow overflow-hidden">
          <h3 className="text-lg font-bold mb-1 truncate">
            {display.name || currentVct.name || 'Credential Name'}
          </h3>
          {display.description && (
            <p className="text-sm opacity-80 line-clamp-2">{display.description}</p>
          )}

          {/* Sample Data Fields */}
          {currentVct.claims.length > 0 && (
            <div className="space-y-1 mt-2 pt-2 border-t border-white/20">
              {currentVct.claims.slice(0, 3).map((claim, index) => {
                // Try to find the matching locale, fallback to first available
                const claimDisplay = claim.display.find((d) => d.locale === effectiveLocale) || claim.display[0];
                const pathString = claim.path.filter(Boolean).join('.');
                const value = sampleData[pathString];

                if (!claimDisplay?.label) return null;

                return (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="opacity-75 truncate mr-2">{claimDisplay.label}:</span>
                    <span className="font-medium truncate">{value || '-'}</span>
                  </div>
                );
              })}
              {currentVct.claims.length > 3 && (
                <p className="text-xs opacity-60 text-center">
                  +{currentVct.claims.length - 3} more fields
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div
          className="px-4 py-2 text-xs opacity-60 truncate flex-shrink-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
        >
          {currentVct.vct || 'Credential Type URI'}
        </div>
      </div>
    );
  };

  const renderSvgTemplate = (template: VCTSvgTemplate | undefined, side: 'front' | 'back') => {
    if (!template?.uri) {
      return (
        <div
          className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
          style={{ width: '340px', height: '214px' }}
        >
          <p className="text-sm text-gray-400">
            No {side} template configured
          </p>
        </div>
      );
    }

    return (
      <img
        src={template.uri}
        alt={`Credential ${side} template`}
        className="max-w-full h-auto rounded-lg shadow-lg"
        style={{ maxWidth: '340px' }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = `
            <div class="p-8 text-center text-red-500 border border-red-300 rounded-lg" style="width: 340px;">
              <p>Failed to load SVG template</p>
              <p class="text-xs mt-1 break-all">${template.uri}</p>
            </div>
          `;
        }}
      />
    );
  };

  const renderLegacySvgTemplate = () => {
    const svgTemplates = display.rendering?.svg_templates;
    if (!svgTemplates || (Array.isArray(svgTemplates) && svgTemplates.length === 0)) {
      return (
        <div className="p-8 text-center text-gray-500">
          <p>SVG template not configured</p>
          <p className="text-sm mt-2">
            Add an SVG template URL in the Display tab
          </p>
        </div>
      );
    }

    // For legacy array format, show the first template
    const templates = isLegacyFormat(svgTemplates) ? svgTemplates : [];
    const template = templates[0];

    if (!template) {
      return (
        <div className="p-8 text-center text-gray-500">
          <p>SVG template not configured</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <img
          src={template.uri}
          alt="Credential SVG Template"
          className="max-w-full h-auto rounded-lg shadow-lg"
          style={{ maxWidth: '400px' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="p-8 text-center text-red-500 border border-red-300 rounded-lg">
                <p>Failed to load SVG template</p>
                <p class="text-sm mt-1">${template.uri}</p>
              </div>
            `;
          }}
        />
        {template.properties && (
          <div className="mt-2 flex gap-2 text-xs">
            {template.properties.orientation && (
              <span className="px-2 py-1 bg-gray-100 rounded">{template.properties.orientation}</span>
            )}
            {template.properties.color_scheme && (
              <span className="px-2 py-1 bg-gray-100 rounded">{template.properties.color_scheme}</span>
            )}
            {template.properties.contrast && (
              <span className="px-2 py-1 bg-gray-100 rounded">{template.properties.contrast}</span>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500 text-center">
          Note: SVG placeholder replacement not yet implemented.
          <br />
          This shows the raw SVG template.
        </p>
        {templates.length > 1 && (
          <p className="mt-2 text-xs text-blue-600">
            +{templates.length - 1} more template(s) configured
          </p>
        )}
      </div>
    );
  };

  const renderCopaCard = () => {
    const templates = display.rendering?.svg_templates;

    // Get front/back templates
    let frontTemplate: VCTSvgTemplate | undefined;
    let backTemplate: VCTSvgTemplate | undefined;

    if (templates && isFrontBackFormat(templates)) {
      frontTemplate = templates.front;
      backTemplate = templates.back;
    }

    return (
      <div className="flex flex-col items-center">
        {/* Card Container with Flip Animation */}
        <div
          className="relative cursor-pointer perspective-1000"
          style={{ width: '340px', height: '214px' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front Side */}
          <div
            className={`absolute inset-0 backface-hidden transition-transform duration-500 ${
              currentSide === 'back' ? 'rotate-y-180' : ''
            }`}
            style={{
              transform: currentSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden',
            }}
          >
            {frontTemplate?.uri ? (
              renderSvgTemplate(frontTemplate, 'front')
            ) : (
              renderSimpleCardFront()
            )}
          </div>

          {/* Back Side */}
          <div
            className={`absolute inset-0 backface-hidden transition-transform duration-500`}
            style={{
              transform: currentSide === 'front' ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden',
            }}
          >
            {backTemplate?.uri ? (
              renderSvgTemplate(backTemplate, 'back')
            ) : (
              renderSimpleCardBack()
            )}
          </div>
        </div>

        {/* Flip Indicator */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          Click card to flip • Showing {currentSide}
        </p>
      </div>
    );
  };

  // Simple card front (fallback when no SVG template)
  const renderSimpleCardFront = () => {
    const simple = display.rendering?.simple;
    const cardElements = display.card_elements?.front;

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: simple?.background_color || '#1E3A5F',
          color: simple?.text_color || '#FFFFFF',
          width: '340px',
          height: '214px',
        }}
      >
        {/* Top Row: Portfolio Issuer + Network Mark */}
        <div className="p-4 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {cardElements?.portfolio_issuer?.logo_uri ? (
              <img
                src={cardElements.portfolio_issuer.logo_uri}
                alt="Portfolio Issuer"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-xs">
              {cardElements?.portfolio_issuer?.value || (
                !cardElements?.portfolio_issuer?.logo_uri && <span className="opacity-50">Portfolio Issuer</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cardElements?.network_mark?.logo_uri ? (
              <img
                src={cardElements.network_mark.logo_uri}
                alt="Network Mark"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xs font-semibold opacity-75">
                {cardElements?.network_mark?.value === 'cornerstone' ? '◆ CORNERSTONE' : 'Network'}
              </span>
            )}
          </div>
        </div>

        {/* Center: Primary & Secondary Attributes */}
        <div className="px-4 flex-grow flex flex-col justify-center">
          <div className="text-lg font-bold">
            {getClaimValue(cardElements?.primary_attribute?.claim_path) ||
              cardElements?.primary_attribute?.value || (
                <span className="opacity-50">Primary Attribute</span>
              )}
          </div>
          {cardElements?.secondary_attribute && (
            <div className="text-sm opacity-80 mt-1">
              {getClaimValue(cardElements?.secondary_attribute?.claim_path) ||
                cardElements?.secondary_attribute?.value || (
                  <span className="opacity-50">Secondary Attribute</span>
                )}
            </div>
          )}
        </div>

        {/* Bottom Row: Credential Name + Issuer */}
        <div className="px-4 py-3 flex justify-between items-end text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <div>
            {cardElements?.credential_name?.value || display.name || (
              <span className="opacity-50">Credential Name</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cardElements?.credential_issuer?.logo_uri ? (
              <img
                src={cardElements.credential_issuer.logo_uri}
                alt="Credential Issuer"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            <span className="text-right opacity-75">
              {getClaimValue(cardElements?.credential_issuer?.claim_path) ||
                cardElements?.credential_issuer?.value || (
                  !cardElements?.credential_issuer?.logo_uri && <span className="opacity-50">Issuer</span>
                )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Simple card back (fallback when no SVG template)
  const renderSimpleCardBack = () => {
    const simple = display.rendering?.simple;
    const backElements = display.card_elements?.back;
    const metadata = backElements?.metadata;
    const evidence = backElements?.evidence;

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: simple?.background_color || '#1E3A5F',
          color: simple?.text_color || '#FFFFFF',
          width: '340px',
          height: '214px',
        }}
      >
          {/* Metadata Section */}
        {metadata && metadata.fields.length > 0 && (
          <div className="px-4 py-2 text-xs space-y-1">
            {metadata.fields.map((fieldId) => {
              const fieldDef = METADATA_FIELD_OPTIONS.find((f) => f.id === fieldId);
              return (
                <div key={fieldId} className="flex justify-between">
                  <span className="opacity-75">{fieldDef?.label || fieldId}:</span>
                  <span>-</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Evidence Section */}
        {evidence && evidence.sources.length > 0 && (
          <div className="px-4 py-2 flex-grow">
            <p className="text-xs opacity-75 mb-2">Evidence / Data Furnishers:</p>
            <div className="flex flex-wrap gap-2">
              {evidence.sources.slice(0, 4).map((source) => (
                <div
                  key={source.id}
                  className="w-10 h-10 rounded bg-white/20 flex items-center justify-center text-xs font-medium overflow-hidden"
                  title={`${source.display} - ${source.description}`}
                >
                  {source.logo_uri ? (
                    <img
                      src={source.logo_uri}
                      alt={source.display}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          source.display.slice(0, 2).toUpperCase();
                      }}
                    />
                  ) : source.badge === 'initials' ? (
                    source.display.slice(0, 2).toUpperCase()
                  ) : (
                    <span className="text-[8px] opacity-50">IMG</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!metadata || metadata.fields.length === 0) && (!evidence || evidence.sources.length === 0) && (
          <div className="flex-grow flex items-center justify-center text-xs opacity-50">
            Configure back card elements in COPA mode
          </div>
        )}
      </div>
    );
  };

  // Helper to get claim value from sample data
  const getClaimValue = (claimPath: string | undefined): string | undefined => {
    if (!claimPath) return undefined;
    // Remove the $. prefix if present
    const normalizedPath = claimPath.startsWith('$.') ? claimPath.slice(2) : claimPath;
    return sampleData[normalizedPath];
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          {mode === 'simple'
            ? 'Simple Card Preview'
            : displayMode === 'copa'
            ? 'COPA Card Preview'
            : 'SVG Template Preview'}
        </h3>
        <p className="text-xs text-gray-500">
          {getLocaleName(effectiveLocale)}
          {effectiveLocale !== locale && (
            <span className="ml-1 text-amber-600">(fallback from {locale})</span>
          )}
          {displayMode === 'copa' && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">COPA</span>
          )}
        </p>
      </div>

      <div className="flex justify-center">
        {mode === 'simple' ? (
          displayMode === 'copa' ? renderCopaCard() : renderSimpleCard()
        ) : displayMode === 'copa' ? (
          renderCopaCard()
        ) : (
          renderLegacySvgTemplate()
        )}
      </div>

      {/* Claims with Sample Data */}
      {currentVct.claims.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Credential Claims
          </h4>
          <div className="space-y-2">
            {currentVct.claims.map((claim, index) => {
              const pathString = claim.path.filter(Boolean).join('.');
              const claimDisplay = claim.display.find((d) => d.locale === effectiveLocale) || claim.display[0];
              const value = sampleData[pathString];

              return (
                <div key={index} className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {claimDisplay?.label || pathString}
                    </p>
                    {claimDisplay?.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{claimDisplay.description}</p>
                    )}
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{pathString}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm text-gray-700 font-medium">
                      {value || <span className="text-gray-400 italic">No sample</span>}
                    </p>
                    {claim.mandatory && (
                      <span className="text-xs text-amber-600">Required</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
