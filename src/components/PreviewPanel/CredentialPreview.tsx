import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useVctStore } from '../../store/vctStore';
import {
  getLocaleName,
  isFrontBackFormat,
  VCTSvgTemplate,
  METADATA_FIELD_OPTIONS,
} from '../../types/vct';

interface CredentialPreviewProps {
  locale: string;
  cardSide?: 'front' | 'back';
}

// Component that auto-sizes text to fit within a container on one line
interface AutoSizeTextProps {
  text: string;
  maxFontSize: number;
  minFontSize?: number;
  className?: string;
  style?: React.CSSProperties;
  maxWidth?: number; // Optional max width in pixels
}

function AutoSizeText({
  text,
  maxFontSize,
  minFontSize = 8,
  className = '',
  style = {},
  maxWidth,
}: AutoSizeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  const calculateFontSize = useCallback(() => {
    if (!containerRef.current || !textRef.current || !text) {
      setFontSize(maxFontSize);
      return;
    }

    const containerWidth = maxWidth || containerRef.current.offsetWidth;
    if (containerWidth === 0) return;

    // Start with max font size and reduce until it fits
    let currentSize = maxFontSize;
    textRef.current.style.fontSize = `${currentSize}px`;
    textRef.current.style.whiteSpace = 'nowrap';

    while (textRef.current.scrollWidth > containerWidth && currentSize > minFontSize) {
      currentSize -= 0.5;
      textRef.current.style.fontSize = `${currentSize}px`;
    }

    setFontSize(currentSize);
  }, [text, maxFontSize, minFontSize, maxWidth]);

  useLayoutEffect(() => {
    calculateFontSize();
    // Recalculate on resize
    window.addEventListener('resize', calculateFontSize);
    return () => window.removeEventListener('resize', calculateFontSize);
  }, [calculateFontSize]);

  return (
    <div ref={containerRef} className={className} style={{ ...style, overflow: 'hidden' }}>
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function CredentialPreview({ locale, cardSide }: CredentialPreviewProps) {
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

  // Determine which side to show - clicking always toggles, buttons set a preference that can be toggled from
  const currentSide = isFlipped ? 'back' : 'front';

  if (!display) {
    return (
      <div className="p-8 text-center text-gray-500">
        No display configuration available
      </div>
    );
  }


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

    // Helper to get text content with fallback
    const getPrimaryText = () =>
      getClaimValue(cardElements?.primary_attribute?.claim_path) ||
      cardElements?.primary_attribute?.value ||
      'Primary Attribute';

    const getSecondaryText = () =>
      getClaimValue(cardElements?.secondary_attribute?.claim_path) ||
      cardElements?.secondary_attribute?.value ||
      'Secondary Attribute';

    const getPortfolioIssuerText = () =>
      cardElements?.portfolio_issuer?.value || '';

    const getCredentialNameText = () =>
      cardElements?.credential_name?.value || display.name || 'Credential Name';

    const getCredentialIssuerText = () =>
      getClaimValue(cardElements?.credential_issuer?.claim_path) ||
      cardElements?.credential_issuer?.value ||
      '';

    const isPrimaryPlaceholder = !getClaimValue(cardElements?.primary_attribute?.claim_path) &&
      !cardElements?.primary_attribute?.value;
    const isSecondaryPlaceholder = !getClaimValue(cardElements?.secondary_attribute?.claim_path) &&
      !cardElements?.secondary_attribute?.value;
    const isCredentialNamePlaceholder = !cardElements?.credential_name?.value && !display.name;

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden flex flex-col"
        style={{
          backgroundColor: simple?.background_color || '#1E3A5F',
          color: simple?.text_color || '#FFFFFF',
          fontFamily: simple?.font_family ? `"${simple.font_family}", sans-serif` : undefined,
          width: '340px',
          height: '214px',
        }}
      >
        {/* Top Row: Portfolio Issuer + Network Mark */}
        <div className="p-4 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-2" style={{ maxWidth: '150px' }}>
            {cardElements?.portfolio_issuer?.logo_uri ? (
              <img
                src={cardElements.portfolio_issuer.logo_uri}
                alt="Portfolio Issuer"
                className="h-8 w-auto object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            {getPortfolioIssuerText() ? (
              <AutoSizeText
                text={getPortfolioIssuerText()}
                maxFontSize={12}
                minFontSize={8}
                maxWidth={cardElements?.portfolio_issuer?.logo_uri ? 100 : 150}
              />
            ) : (
              !cardElements?.portfolio_issuer?.logo_uri && (
                <span className="text-xs opacity-50">Portfolio Issuer</span>
              )
            )}
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
          <AutoSizeText
            text={getPrimaryText()}
            maxFontSize={18}
            minFontSize={10}
            className="font-bold"
            style={{ opacity: isPrimaryPlaceholder ? 0.5 : 1 }}
            maxWidth={308} // 340px - 32px padding
          />
          {cardElements?.secondary_attribute && (
            <AutoSizeText
              text={getSecondaryText()}
              maxFontSize={14}
              minFontSize={9}
              className="mt-1"
              style={{ opacity: isSecondaryPlaceholder ? 0.5 : 0.8 }}
              maxWidth={308}
            />
          )}
        </div>

        {/* Bottom Row: Credential Name + Issuer */}
        <div className="px-4 py-3 flex justify-between items-end gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <div style={{ maxWidth: '150px' }}>
            <AutoSizeText
              text={getCredentialNameText()}
              maxFontSize={12}
              minFontSize={8}
              style={{ opacity: isCredentialNamePlaceholder ? 0.5 : 1 }}
              maxWidth={150}
            />
          </div>
          <div className="flex items-center gap-2" style={{ maxWidth: '150px' }}>
            {cardElements?.credential_issuer?.logo_uri ? (
              <img
                src={cardElements.credential_issuer.logo_uri}
                alt="Credential Issuer"
                className="h-6 w-auto object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
            {getCredentialIssuerText() ? (
              <AutoSizeText
                text={getCredentialIssuerText()}
                maxFontSize={12}
                minFontSize={8}
                style={{ opacity: 0.75, textAlign: 'right' }}
                maxWidth={cardElements?.credential_issuer?.logo_uri ? 100 : 150}
              />
            ) : (
              !cardElements?.credential_issuer?.logo_uri && (
                <span className="text-xs opacity-50">Issuer</span>
              )
            )}
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
          fontFamily: simple?.font_family ? `"${simple.font_family}", sans-serif` : undefined,
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
            Configure back card elements
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
          Card Preview
        </h3>
        <p className="text-xs text-gray-500">
          {getLocaleName(effectiveLocale)}
          {effectiveLocale !== locale && (
            <span className="ml-1 text-amber-600">(fallback from {locale})</span>
          )}
        </p>
      </div>

      <div className="flex justify-center">
        {renderCopaCard()}
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
