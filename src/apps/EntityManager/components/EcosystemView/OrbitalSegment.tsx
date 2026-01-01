import { useState } from 'react';
import type { Entity, DataProviderType } from '../../../../types/entity';
import EntityNode from './EntityNode';

interface OrbitalSegmentProps {
  dataType: DataProviderType;
  label: string;
  entities: Entity[];
  segmentIndex: number;
  totalSegments: number;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  getLogoUrl: (entity: Entity) => string | null;
  onEntityClick: (entity: Entity, event: React.MouseEvent) => void;
  onSegmentClick: (dataType: DataProviderType, event: React.MouseEvent) => void;
  selectedEntityId?: string | null;
  isExpanded?: boolean;
  isFaded?: boolean;
}

// Colors for each data type segment - with hover and expanded states
const SEGMENT_COLORS: Record<DataProviderType, { fill: string; fillHover: string; fillExpanded: string; stroke: string; strokeHover: string; glow: string }> = {
  'identity': { fill: 'rgba(139, 92, 246, 0.15)', fillHover: 'rgba(139, 92, 246, 0.3)', fillExpanded: 'rgba(139, 92, 246, 0.4)', stroke: 'rgba(139, 92, 246, 0.4)', strokeHover: 'rgba(139, 92, 246, 0.8)', glow: 'rgba(139, 92, 246, 0.5)' },
  'title-ownership': { fill: 'rgba(59, 130, 246, 0.15)', fillHover: 'rgba(59, 130, 246, 0.3)', fillExpanded: 'rgba(59, 130, 246, 0.4)', stroke: 'rgba(59, 130, 246, 0.4)', strokeHover: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.5)' },
  'assessment': { fill: 'rgba(16, 185, 129, 0.15)', fillHover: 'rgba(16, 185, 129, 0.3)', fillExpanded: 'rgba(16, 185, 129, 0.4)', stroke: 'rgba(16, 185, 129, 0.4)', strokeHover: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.5)' },
  'market-value-estimate': { fill: 'rgba(245, 158, 11, 0.15)', fillHover: 'rgba(245, 158, 11, 0.3)', fillExpanded: 'rgba(245, 158, 11, 0.4)', stroke: 'rgba(245, 158, 11, 0.4)', strokeHover: 'rgba(245, 158, 11, 0.8)', glow: 'rgba(245, 158, 11, 0.5)' },
  'cost-of-ownership': { fill: 'rgba(236, 72, 153, 0.15)', fillHover: 'rgba(236, 72, 153, 0.3)', fillExpanded: 'rgba(236, 72, 153, 0.4)', stroke: 'rgba(236, 72, 153, 0.4)', strokeHover: 'rgba(236, 72, 153, 0.8)', glow: 'rgba(236, 72, 153, 0.5)' },
  'mortgage-home-equity': { fill: 'rgba(239, 68, 68, 0.15)', fillHover: 'rgba(239, 68, 68, 0.3)', fillExpanded: 'rgba(239, 68, 68, 0.4)', stroke: 'rgba(239, 68, 68, 0.4)', strokeHover: 'rgba(239, 68, 68, 0.8)', glow: 'rgba(239, 68, 68, 0.5)' },
  'municipal': { fill: 'rgba(34, 211, 238, 0.15)', fillHover: 'rgba(34, 211, 238, 0.3)', fillExpanded: 'rgba(34, 211, 238, 0.4)', stroke: 'rgba(34, 211, 238, 0.4)', strokeHover: 'rgba(34, 211, 238, 0.8)', glow: 'rgba(34, 211, 238, 0.5)' },
  'regulatory': { fill: 'rgba(251, 191, 36, 0.15)', fillHover: 'rgba(251, 191, 36, 0.3)', fillExpanded: 'rgba(251, 191, 36, 0.4)', stroke: 'rgba(251, 191, 36, 0.4)', strokeHover: 'rgba(251, 191, 36, 0.8)', glow: 'rgba(251, 191, 36, 0.5)' },
  'employment': { fill: 'rgba(168, 85, 247, 0.15)', fillHover: 'rgba(168, 85, 247, 0.3)', fillExpanded: 'rgba(168, 85, 247, 0.4)', stroke: 'rgba(168, 85, 247, 0.4)', strokeHover: 'rgba(168, 85, 247, 0.8)', glow: 'rgba(168, 85, 247, 0.5)' },
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const start1 = polarToCartesian(x, y, outerRadius, endAngle);
  const end1 = polarToCartesian(x, y, outerRadius, startAngle);
  const start2 = polarToCartesian(x, y, innerRadius, startAngle);
  const end2 = polarToCartesian(x, y, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start1.x, start1.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end1.x, end1.y,
    'L', start2.x, start2.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, end2.x, end2.y,
    'Z',
  ].join(' ');
}

export default function OrbitalSegment({
  dataType,
  label,
  entities,
  segmentIndex,
  totalSegments,
  centerX,
  centerY,
  innerRadius,
  outerRadius,
  getLogoUrl,
  onEntityClick,
  onSegmentClick,
  selectedEntityId,
  isExpanded = false,
  isFaded = false,
}: OrbitalSegmentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = SEGMENT_COLORS[dataType];

  // Calculate segment angles
  const gapAngle = 2; // Gap between segments in degrees
  const segmentAngle = (360 - totalSegments * gapAngle) / totalSegments;
  const startAngle = segmentIndex * (segmentAngle + gapAngle);
  const endAngle = startAngle + segmentAngle;

  // For expanded view, use larger radius and spread entities more
  const expandedScale = isExpanded ? 1.3 : 1;
  const effectiveOuterRadius = outerRadius * expandedScale;
  const effectiveInnerRadius = isExpanded ? innerRadius * 0.8 : innerRadius;

  // Position entities along the segment arc with dynamic sizing to prevent overlap
  const entityRadius = (effectiveInnerRadius + effectiveOuterRadius) / 2;
  const arcThickness = effectiveOuterRadius - effectiveInnerRadius;

  // Calculate available arc length for entities
  const angleRange = endAngle - startAngle - 10; // Leave some padding
  const arcLength = (angleRange * Math.PI / 180) * entityRadius;

  // Calculate entity size based on available space
  const baseSize = isExpanded ? 56 : 48;
  const minSize = 24; // Minimum entity size
  const padding = 8; // Minimum space between entities

  // For non-expanded: fit entities in a single row along the arc
  // For expanded: allow multiple rows
  let entitySize = baseSize;
  let numRows = 1;

  if (entities.length > 0) {
    if (isExpanded) {
      // When expanded, calculate how many entities can fit per row at base size
      const maxPerRowAtBase = Math.max(1, Math.floor(arcLength / (baseSize + padding)));
      numRows = Math.ceil(entities.length / maxPerRowAtBase);
      // Make sure rows fit within the arc thickness
      const maxRows = Math.floor((arcThickness - 20) / (baseSize + padding));
      if (numRows > maxRows) {
        numRows = Math.max(1, maxRows);
        const entitiesPerRow = Math.ceil(entities.length / numRows);
        // Shrink size to fit more entities per row if needed
        entitySize = Math.max(minSize, Math.min(baseSize, (arcLength - padding) / entitiesPerRow - padding));
      }
    } else {
      // Non-expanded: fit all entities in single row, shrink if needed
      const requiredSpace = entities.length * (baseSize + padding);
      if (requiredSpace > arcLength) {
        entitySize = Math.max(minSize, (arcLength - padding) / entities.length - padding);
      }
    }
  }

  const entityPositions = entities.map((entity, i) => {
    let angle: number;
    let radius: number;

    if (isExpanded && entities.length > 1 && numRows > 1) {
      // When expanded with multiple rows, spread entities across rows
      const entitiesPerRow = Math.ceil(entities.length / numRows);
      const row = Math.floor(i / entitiesPerRow);
      const posInRow = i % entitiesPerRow;
      const entitiesInThisRow = Math.min(entitiesPerRow, entities.length - row * entitiesPerRow);

      // Calculate row radius (spread from inner to outer)
      const rowSpacing = (arcThickness - entitySize - 10) / Math.max(numRows - 1, 1);
      radius = effectiveInnerRadius + entitySize / 2 + 5 + row * rowSpacing;

      // Calculate angle position within row
      const rowAngleStep = entitiesInThisRow > 1 ? angleRange / (entitiesInThisRow - 1) : 0;
      angle = startAngle + 5 + (entitiesInThisRow === 1 ? angleRange / 2 : posInRow * rowAngleStep);
    } else {
      // Single row positioning
      radius = entityRadius;
      const angleStep = entities.length > 1 ? angleRange / (entities.length - 1) : 0;
      angle = startAngle + 5 + (entities.length === 1 ? angleRange / 2 : i * angleStep);
    }

    const pos = polarToCartesian(centerX, centerY, radius, angle);
    return { entity, ...pos, angle, size: entitySize };
  });

  // Label position (middle of the segment, outside the arc)
  const labelAngle = (startAngle + endAngle) / 2;
  const labelPos = polarToCartesian(centerX, centerY, effectiveOuterRadius + (isExpanded ? 40 : 30), labelAngle);

  // Calculate label rotation so text is readable
  let labelRotation = labelAngle - 90;
  if (labelRotation > 90) labelRotation -= 180;
  if (labelRotation < -90) labelRotation += 180;

  const arcPath = describeArc(centerX, centerY, effectiveInnerRadius, effectiveOuterRadius, startAngle, endAngle);

  const hasEntities = entities.length > 0;

  // Determine fill and stroke based on state
  const currentFill = isExpanded ? colors.fillExpanded : isHovered ? colors.fillHover : colors.fill;
  const currentStroke = isHovered || isExpanded ? colors.strokeHover : colors.stroke;
  const currentStrokeWidth = isHovered || isExpanded ? 2 : 1;

  return (
    <g
      className="orbital-segment"
      style={{
        opacity: isFaded ? 0.3 : 1,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {/* Segment arc background */}
      <path
        d={arcPath}
        fill={currentFill}
        stroke={currentStroke}
        strokeWidth={currentStrokeWidth}
        className="cursor-pointer"
        onClick={(e) => onSegmentClick(dataType, e)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          filter: (hasEntities || isHovered || isExpanded) ? `drop-shadow(0 0 ${isExpanded ? '20px' : isHovered ? '15px' : '10px'} ${colors.glow})` : undefined,
          transition: 'all 0.3s ease-in-out',
        }}
      />

      {/* Segment label */}
      <g
        transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${labelRotation})`}
        className="cursor-pointer"
        onClick={(e) => onSegmentClick(dataType, e)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none select-none"
          style={{
            fontSize: isExpanded ? '14px' : isHovered ? '12px' : '11px',
            fill: isHovered || isExpanded ? '#f1f5f9' : '#cbd5e1',
            fontWeight: isHovered || isExpanded ? 600 : 500,
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {label}
        </text>
        {/* Entity count badge */}
        <text
          y={isExpanded ? 18 : 14}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none select-none"
          style={{
            fontSize: isExpanded ? '12px' : '10px',
            fill: isHovered || isExpanded ? '#94a3b8' : '#64748b',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {entities.length === 0 ? '(empty)' : `(${entities.length})`}
        </text>
      </g>

      {/* Entity nodes */}
      {entityPositions.map(({ entity, x, y, size }, i) => (
        <EntityNode
          key={entity.id}
          entity={entity}
          logoUrl={getLogoUrl(entity)}
          x={x}
          y={y}
          onClick={(e) => onEntityClick(entity, e)}
          isSelected={selectedEntityId === entity.id}
          animationDelay={i * 0.1}
          size={size}
        />
      ))}
    </g>
  );
}
