import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useVctStore } from '../../store/vctStore';
import { useZoneTemplateStore } from '../../store/zoneTemplateStore';
import { useZoneSelectionStore } from '../../store/zoneSelectionStore';
import {
  getLocaleName,
  isFrontBackFormat,
  VCTSvgTemplate,
  getZoneColor,
  Zone,
  DynamicCardElement,
  AssetCriteria,
} from '../../types/vct';
import { resolveAssetCriteria } from '../../services/assetResolver';

interface CredentialPreviewProps {
  locale: string;
  cardSide?: 'front' | 'back';
  onZoneSelect?: (face: 'front' | 'back') => void;
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

// Zone overlay visibility: simple on/off toggle

// Dynamic zones overlay for custom templates (interactive, clickable zones)
interface DynamicZonesOverlayProps {
  zones: Zone[];
  face: 'front' | 'back';
  onZoneClick?: (face: 'front' | 'back') => void;
}

function DynamicZonesOverlay({ zones, face, onZoneClick }: DynamicZonesOverlayProps) {
  const hoveredZoneId = useZoneSelectionStore((state) => state.hoveredZoneId);
  const selectedZoneId = useZoneSelectionStore((state) => state.selectedZoneId);
  const setHoveredZone = useZoneSelectionStore((state) => state.setHoveredZone);
  const setSelectedZone = useZoneSelectionStore((state) => state.setSelectedZone);

  return (
    <div className="absolute inset-0 z-10">
      {zones.map((zone, index) => {
        const color = getZoneColor(index);
        const isHovered = hoveredZoneId === zone.id;
        const isSelected = selectedZoneId === zone.id;

        return (
          <div
            key={zone.id}
            className="absolute flex items-center justify-center transition-all duration-150 cursor-pointer"
            style={{
              left: `${zone.position.x}%`,
              top: `${zone.position.y}%`,
              width: `${zone.position.width}%`,
              height: `${zone.position.height}%`,
              backgroundColor: isHovered || isSelected ? `${color}50` : `${color}30`,
              borderWidth: isHovered || isSelected ? '2px' : '1px',
              borderStyle: isHovered || isSelected ? 'solid' : 'dashed',
              borderColor: color,
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
              zIndex: isHovered || isSelected ? 20 : 10,
              boxShadow: isHovered || isSelected ? `0 0 8px ${color}` : 'none',
            }}
            onMouseEnter={() => setHoveredZone(zone.id)}
            onMouseLeave={() => setHoveredZone(null)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedZone(zone.id, face);
              onZoneClick?.(face);
            }}
          >
            <span
              className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded truncate max-w-full transition-all duration-150"
              style={{
                backgroundColor: isHovered || isSelected ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {zone.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Preview mode: 'zones' shows interactive overlay, 'labels' shows zone name placeholders, 'clean' hides everything
type PreviewMode = 'zones' | 'labels' | 'clean';

export default function CredentialPreview({ locale, cardSide, onZoneSelect }: CredentialPreviewProps) {
  const currentVct = useVctStore((state) => state.currentVct);
  const sampleData = useVctStore((state) => state.sampleData);
  const [isFlipped, setIsFlipped] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('zones');

  // Zone template state
  const selectedTemplateId = useZoneTemplateStore((state) => state.selectedTemplateId);
  const getTemplate = useZoneTemplateStore((state) => state.getTemplate);
  const selectedTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;

  // Resolved asset URLs cache (for criteria-based assets)
  const [resolvedAssets, setResolvedAssets] = useState<Record<string, string | null>>({});

  // Resolve all criteria-based assets when VCT changes
  const display = currentVct.display.find((d) => d.locale === locale) || currentVct.display[0];
  useEffect(() => {
    const resolveCriteriaAssets = async () => {
      if (!display?.dynamic_card_elements) return;

      const frontElements = display.dynamic_card_elements.front || [];
      const backElements = display.dynamic_card_elements.back || [];
      const allElements = [...frontElements, ...backElements];

      const criteriaElements = allElements.filter(
        (el): el is DynamicCardElement & { asset_criteria: AssetCriteria } =>
          el.content_type === 'image' && !!el.asset_criteria
      );

      if (criteriaElements.length === 0) return;

      const newResolved: Record<string, string | null> = {};

      await Promise.all(
        criteriaElements.map(async (el) => {
          const key = el.zone_id;
          try {
            const url = await resolveAssetCriteria(el.asset_criteria);
            newResolved[key] = url;
          } catch (error) {
            console.error('Failed to resolve asset criteria:', error);
            newResolved[key] = null;
          }
        })
      );

      setResolvedAssets((prev) => ({ ...prev, ...newResolved }));
    };

    resolveCriteriaAssets();
  }, [display?.dynamic_card_elements]);

  // Helper to get resolved URL for an element (criteria-based or direct)
  const getResolvedImageUrl = (element: DynamicCardElement): string | null => {
    if (element.logo_uri) {
      return element.logo_uri;
    }
    if (element.asset_criteria) {
      return resolvedAssets[element.zone_id] || null;
    }
    return null;
  };

  // Check if the card can be flipped (has back zones)
  const canFlip = selectedTemplate && !selectedTemplate.frontOnly && selectedTemplate.back.zones.length > 0;

  // Sync flip state when cardSide prop changes from parent buttons
  useEffect(() => {
    if (cardSide === 'back') {
      setIsFlipped(true);
    } else if (cardSide === 'front') {
      setIsFlipped(false);
    }
  }, [cardSide]);

  // display was already defined above for asset resolution
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
          className={`relative perspective-1000 ${canFlip ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ width: '340px', height: '214px' }}
          onClick={() => canFlip && setIsFlipped(!isFlipped)}
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
              <div className="relative">
                {renderDynamicCardFront()}
                {previewMode === 'zones' && selectedTemplate && (
                  <DynamicZonesOverlay zones={selectedTemplate.front.zones} face="front" onZoneClick={onZoneSelect} />
                )}
              </div>
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
              <div className="relative">
                {renderDynamicCardBack()}
                {previewMode === 'zones' && selectedTemplate && (
                  <DynamicZonesOverlay zones={selectedTemplate.back.zones} face="back" onZoneClick={onZoneSelect} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <p className="text-xs text-gray-500">
            {canFlip ? (
              <>Click card to flip • Showing {currentSide}</>
            ) : (
              <>Front only (no flip)</>
            )}
            {selectedTemplate && ` • ${selectedTemplate.name}`}
          </p>
          {selectedTemplate && (
            <button
              onClick={() => {
                // Cycle: zones → labels → clean → zones
                setPreviewMode((prev) => {
                  switch (prev) {
                    case 'zones': return 'labels';
                    case 'labels': return 'clean';
                    case 'clean': return 'zones';
                  }
                });
              }}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                previewMode === 'zones'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : previewMode === 'labels'
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
              title={
                previewMode === 'zones'
                  ? 'Click to show labels only'
                  : previewMode === 'labels'
                  ? 'Click to see clean card'
                  : 'Click to show interactive zones'
              }
            >
              {previewMode === 'zones' && '⊞ Zones'}
              {previewMode === 'labels' && '◫ Labels'}
              {previewMode === 'clean' && '▢ Clean'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Helper to get dynamic metadata value (for __dynamic: prefixed values)
  const getDynamicMetadataValue = (dynamicKey: string): string | undefined => {
    switch (dynamicKey) {
      case 'credential_name':
        return currentVct.name || 'Credential Name';
      case 'issuer_name':
        return currentVct.issuer?.name || 'Issuer Name';
      case 'issuer_logo':
        return currentVct.issuer?.logoUri || undefined;
      case 'issuance_date':
        // For preview, show a sample date
        return new Date().toLocaleDateString();
      case 'expiration_date':
        // For preview, show a sample date 1 year from now
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        return expDate.toLocaleDateString();
      default:
        return undefined;
    }
  };

  // Helper to get claim value from sample data or dynamic metadata
  const getClaimValue = (claimPath: string | undefined): string | undefined => {
    if (!claimPath) return undefined;

    // Handle dynamic metadata values
    if (claimPath.startsWith('__dynamic:')) {
      const dynamicKey = claimPath.slice('__dynamic:'.length);
      return getDynamicMetadataValue(dynamicKey);
    }

    // Remove the $. prefix if present
    let normalizedPath = claimPath.startsWith('$.') ? claimPath.slice(2) : claimPath;
    // Remove credentialSubject. prefix to match how sample data is stored
    // (formatPropertyPath removes credentialSubject from the path)
    if (normalizedPath.startsWith('credentialSubject.')) {
      normalizedPath = normalizedPath.slice('credentialSubject.'.length);
    }
    // Remove array index numbers (0, 1, 2, etc.) from the path to match formatPropertyPath
    // which filters out [] placeholders. E.g., "addresses.0.street" -> "addresses.street"
    normalizedPath = normalizedPath.split('.').filter(segment => !/^\d+$/.test(segment)).join('.');
    return sampleData[normalizedPath];
  };

  // Helper to get horizontal alignment CSS justify-content value
  const getAlignmentStyle = (alignment: string | undefined) => {
    switch (alignment) {
      case 'left': return 'flex-start';
      case 'right': return 'flex-end';
      default: return 'center';
    }
  };

  // Helper to get vertical alignment CSS align-items value
  const getVerticalAlignmentStyle = (verticalAlignment: string | undefined) => {
    switch (verticalAlignment) {
      case 'top': return 'flex-start';
      case 'bottom': return 'flex-end';
      default: return 'center';
    }
  };

  // Dynamic card front for custom zone templates
  const renderDynamicCardFront = () => {
    const simple = display.rendering?.simple;
    const dynamicElements = display.dynamic_card_elements?.front || [];

    if (!selectedTemplate) {
      return (
        <div
          className="rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center"
          style={{
            backgroundColor: simple?.background_color || '#1E3A5F',
            color: simple?.text_color || '#FFFFFF',
            width: '340px',
            height: '214px',
          }}
        >
          <div className="text-center px-6">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-sm opacity-75 font-medium">No template selected</p>
            <p className="text-xs opacity-50 mt-1">Create your first zone template in the Display tab</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden relative"
        style={{
          backgroundColor: simple?.background_color || '#1E3A5F',
          color: simple?.text_color || '#FFFFFF',
          fontFamily: simple?.font_family ? `"${simple.font_family}", sans-serif` : undefined,
          width: '340px',
          height: '214px',
        }}
      >
        {selectedTemplate.front.zones.map((zone) => {
          const element = dynamicElements.find((el) => el.zone_id === zone.id);
          const content = element?.claim_path
            ? getClaimValue(element.claim_path) || element.label || 'Claim'
            : element?.static_value || element?.logo_uri || '';
          const alignment = element?.alignment || 'center';
          const verticalAlignment = element?.verticalAlignment || 'middle';
          const scale = element?.scale || 1.0;
          const textWrap = element?.textWrap || false;

          return (
            <div
              key={zone.id}
              className="absolute flex p-1 overflow-hidden"
              style={{
                left: `${zone.position.x}%`,
                top: `${zone.position.y}%`,
                width: `${zone.position.width}%`,
                height: `${zone.position.height}%`,
                justifyContent: getAlignmentStyle(alignment),
                alignItems: getVerticalAlignmentStyle(verticalAlignment),
              }}
            >
              {element?.content_type === 'image' && (element?.logo_uri || element?.asset_criteria) ? (
                (() => {
                  const imageUrl = element ? getResolvedImageUrl(element) : null;
                  if (!imageUrl) {
                    return (
                      <div className="text-xs text-gray-400 italic">
                        {element?.asset_criteria ? 'Loading...' : 'No image'}
                      </div>
                    );
                  }
                  return (
                    <img
                      src={imageUrl}
                      alt={zone.name}
                      className="object-contain"
                      style={{
                        maxWidth: `${100 * scale}%`,
                        maxHeight: `${100 * scale}%`,
                        transform: scale !== 1.0 ? `scale(${scale})` : undefined,
                        transformOrigin: alignment === 'left' ? 'left center' : alignment === 'right' ? 'right center' : 'center center',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  );
                })()
              ) : content ? (
                textWrap ? (
                  // Wrapped text - allows multiple lines
                  <div
                    className={`overflow-hidden ${alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'}`}
                    style={{
                      width: '100%',
                      fontSize: `${16 * scale}px`,
                      lineHeight: 1.2,
                      wordBreak: 'break-word',
                    }}
                  >
                    {content}
                  </div>
                ) : (
                  // Auto-shrink text - single line that shrinks to fit
                  <AutoSizeText
                    text={content}
                    maxFontSize={16 * scale}
                    minFontSize={8}
                    className={alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'}
                    maxWidth={(340 * zone.position.width) / 100 - 8}
                    style={{ width: '100%' }}
                  />
                )
              ) : previewMode !== 'clean' ? (
                <span className="text-xs opacity-30 truncate">{zone.name}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  // Dynamic card back for custom zone templates
  const renderDynamicCardBack = () => {
    const simple = display.rendering?.simple;
    const dynamicElements = display.dynamic_card_elements?.back || [];

    if (!selectedTemplate) {
      return (
        <div
          className="rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center"
          style={{
            backgroundColor: simple?.background_color || '#1E3A5F',
            color: simple?.text_color || '#FFFFFF',
            width: '340px',
            height: '214px',
          }}
        >
          <div className="text-center px-6">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-sm opacity-75 font-medium">No template selected</p>
            <p className="text-xs opacity-50 mt-1">Select a template to configure the back</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="rounded-xl shadow-lg overflow-hidden relative"
        style={{
          backgroundColor: simple?.background_color || '#1E3A5F',
          color: simple?.text_color || '#FFFFFF',
          fontFamily: simple?.font_family ? `"${simple.font_family}", sans-serif` : undefined,
          width: '340px',
          height: '214px',
        }}
      >
        {selectedTemplate.back.zones.length > 0 ? (
          selectedTemplate.back.zones.map((zone) => {
            const element = dynamicElements.find((el) => el.zone_id === zone.id);
            const content = element?.claim_path
              ? getClaimValue(element.claim_path) || element.label || 'Claim'
              : element?.static_value || element?.logo_uri || '';
            const alignment = element?.alignment || 'center';
            const verticalAlignment = element?.verticalAlignment || 'middle';
            const scale = element?.scale || 1.0;
            const textWrap = element?.textWrap || false;

            return (
              <div
                key={zone.id}
                className="absolute flex p-1 overflow-hidden"
                style={{
                  left: `${zone.position.x}%`,
                  top: `${zone.position.y}%`,
                  width: `${zone.position.width}%`,
                  height: `${zone.position.height}%`,
                  justifyContent: getAlignmentStyle(alignment),
                  alignItems: getVerticalAlignmentStyle(verticalAlignment),
                }}
              >
                {element?.content_type === 'image' && (element?.logo_uri || element?.asset_criteria) ? (
                  (() => {
                    const imageUrl = element ? getResolvedImageUrl(element) : null;
                    if (!imageUrl) {
                      return (
                        <div className="text-xs text-gray-400 italic">
                          {element?.asset_criteria ? 'Loading...' : 'No image'}
                        </div>
                      );
                    }
                    return (
                      <img
                        src={imageUrl}
                        alt={zone.name}
                        className="object-contain"
                        style={{
                          maxWidth: `${100 * scale}%`,
                          maxHeight: `${100 * scale}%`,
                          transform: scale !== 1.0 ? `scale(${scale})` : undefined,
                          transformOrigin: alignment === 'left' ? 'left center' : alignment === 'right' ? 'right center' : 'center center',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    );
                  })()
                ) : content ? (
                  textWrap ? (
                    // Wrapped text - allows multiple lines
                    <div
                      className={`overflow-hidden ${alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'}`}
                      style={{
                        width: '100%',
                        fontSize: `${16 * scale}px`,
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                      }}
                    >
                      {content}
                    </div>
                  ) : (
                    // Auto-shrink text - single line that shrinks to fit
                    <AutoSizeText
                      text={content}
                      maxFontSize={16 * scale}
                      minFontSize={8}
                      className={alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center'}
                      maxWidth={(340 * zone.position.width) / 100 - 8}
                      style={{ width: '100%' }}
                    />
                  )
                ) : previewMode !== 'clean' ? (
                  <span className="text-xs opacity-30 truncate">{zone.name}</span>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="flex-grow flex items-center justify-center text-xs opacity-50">
            No zones defined for back
          </div>
        )}
      </div>
    );
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
