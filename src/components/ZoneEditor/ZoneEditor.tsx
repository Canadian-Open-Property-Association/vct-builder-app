import { useState, useRef, useCallback, useEffect } from 'react';
import { useZoneTemplateStore } from '../../store/zoneTemplateStore';
import {
  Zone,
  ZonePosition,
  CARD_WIDTH,
  CARD_HEIGHT,
  getZoneColor,
  zonesOverlap,
  ZoneContentType,
} from '../../types/vct';

interface ZoneEditorProps {
  onClose: () => void;
}

interface DragState {
  type: 'create' | 'move' | 'resize';
  zoneId?: string;
  startX: number;
  startY: number;
  initialPosition?: ZonePosition;
  resizeHandle?: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
}

const SCALE = 1.5; // Scale factor for larger editing canvas
const CANVAS_WIDTH = CARD_WIDTH * SCALE;
const CANVAS_HEIGHT = CARD_HEIGHT * SCALE;
const MIN_ZONE_SIZE = 5; // Minimum 5% width/height
const GRID_SIZE = 8; // 8x8 grid

export default function ZoneEditor({ onClose }: ZoneEditorProps) {
  const editingTemplate = useZoneTemplateStore((state) => state.editingTemplate);
  const updateZone = useZoneTemplateStore((state) => state.updateZone);
  const addZone = useZoneTemplateStore((state) => state.addZone);
  const deleteZone = useZoneTemplateStore((state) => state.deleteZone);
  const saveEditingTemplate = useZoneTemplateStore((state) => state.saveEditingTemplate);
  const setEditingTemplate = useZoneTemplateStore((state) => state.setEditingTemplate);
  const copyFrontToBack = useZoneTemplateStore((state) => state.copyFrontToBack);
  const copyBackToFront = useZoneTemplateStore((state) => state.copyBackToFront);

  const [activeFace, setActiveFace] = useState<'front' | 'back'>('front');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [newZonePosition, setNewZonePosition] = useState<ZonePosition | null>(null);
  const [templateName, setTemplateName] = useState(editingTemplate?.name || '');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Snap value to nearest grid line
  const snapToGrid = useCallback((value: number): number => {
    const gridStep = 100 / GRID_SIZE;
    return Math.round(value / gridStep) * gridStep;
  }, []);

  // Update template name in store
  const handleTemplateNameChange = (name: string) => {
    setTemplateName(name);
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, name });
    }
  };

  if (!editingTemplate) {
    return null;
  }

  const zones = activeFace === 'front' ? editingTemplate.front.zones : editingTemplate.back.zones;

  // Convert pixel position to percentage
  const pixelToPercent = useCallback((px: number, isWidth: boolean): number => {
    const maxPx = isWidth ? CANVAS_WIDTH : CANVAS_HEIGHT;
    return (px / maxPx) * 100;
  }, []);

  // Convert percentage to pixel position (currently unused but may be needed for future features)
  // const percentToPixel = useCallback((percent: number, isWidth: boolean): number => {
  //   const maxPx = isWidth ? CANVAS_WIDTH : CANVAS_HEIGHT;
  //   return (percent / 100) * maxPx;
  // }, []);

  // Get canvas-relative position from mouse event
  const getCanvasPosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Check if a new position would overlap with existing zones
  const checkOverlap = useCallback(
    (position: ZonePosition, excludeZoneId?: string): boolean => {
      return zones
        .filter((z) => z.id !== excludeZoneId)
        .some((z) => zonesOverlap(position, z.position));
    },
    [zones]
  );

  // Handle mouse down on canvas (start creating new zone)
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start creating if clicking on empty area
      if ((e.target as HTMLElement).dataset.zoneId) return;

      const pos = getCanvasPosition(e);
      setDragState({
        type: 'create',
        startX: pos.x,
        startY: pos.y,
      });
      setSelectedZoneId(null);
    },
    [getCanvasPosition]
  );

  // Handle mouse down on zone (start moving)
  const handleZoneMouseDown = useCallback(
    (e: React.MouseEvent, zone: Zone) => {
      e.stopPropagation();
      setSelectedZoneId(zone.id);

      const pos = getCanvasPosition(e);
      setDragState({
        type: 'move',
        zoneId: zone.id,
        startX: pos.x,
        startY: pos.y,
        initialPosition: { ...zone.position },
      });
    },
    [getCanvasPosition]
  );

  // Handle mouse down on resize handle
  const handleResizeMouseDown = useCallback(
    (
      e: React.MouseEvent,
      zone: Zone,
      handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
    ) => {
      e.stopPropagation();
      setSelectedZoneId(zone.id);

      const pos = getCanvasPosition(e);
      setDragState({
        type: 'resize',
        zoneId: zone.id,
        startX: pos.x,
        startY: pos.y,
        initialPosition: { ...zone.position },
        resizeHandle: handle,
      });
    },
    [getCanvasPosition]
  );

  // Handle mouse move
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getCanvasPosition(e);

      if (dragState.type === 'create') {
        const startXPercent = pixelToPercent(dragState.startX, true);
        const startYPercent = pixelToPercent(dragState.startY, false);
        const currentXPercent = pixelToPercent(pos.x, true);
        const currentYPercent = pixelToPercent(pos.y, false);

        // Calculate raw position and size
        let x = Math.min(startXPercent, currentXPercent);
        let y = Math.min(startYPercent, currentYPercent);
        let width = Math.abs(currentXPercent - startXPercent);
        let height = Math.abs(currentYPercent - startYPercent);

        // Snap to grid
        x = snapToGrid(Math.max(0, x));
        y = snapToGrid(Math.max(0, y));
        width = snapToGrid(width);
        height = snapToGrid(height);

        // Clamp to canvas bounds (snap to edge if beyond)
        if (x + width > 100) {
          width = 100 - x;
        }
        if (y + height > 100) {
          height = 100 - y;
        }

        setNewZonePosition({
          x,
          y,
          width: Math.max(width, snapToGrid(MIN_ZONE_SIZE)),
          height: Math.max(height, snapToGrid(MIN_ZONE_SIZE)),
        });
      } else if (dragState.type === 'move' && dragState.zoneId && dragState.initialPosition) {
        const deltaX = pixelToPercent(pos.x - dragState.startX, true);
        const deltaY = pixelToPercent(pos.y - dragState.startY, false);

        const zone = zones.find((z) => z.id === dragState.zoneId);
        if (!zone) return;

        let newX = dragState.initialPosition.x + deltaX;
        let newY = dragState.initialPosition.y + deltaY;

        // Snap to edge if beyond bounds, otherwise snap to grid
        if (newX < 0) {
          newX = 0;
        } else if (newX + zone.position.width > 100) {
          newX = 100 - zone.position.width;
        } else {
          newX = snapToGrid(newX);
        }

        if (newY < 0) {
          newY = 0;
        } else if (newY + zone.position.height > 100) {
          newY = 100 - zone.position.height;
        } else {
          newY = snapToGrid(newY);
        }

        const newPosition = {
          ...zone.position,
          x: newX,
          y: newY,
        };

        // Only update if no overlap
        if (!checkOverlap(newPosition, zone.id)) {
          updateZone(activeFace, zone.id, { position: newPosition });
        }
      } else if (dragState.type === 'resize' && dragState.zoneId && dragState.initialPosition) {
        const deltaX = pixelToPercent(pos.x - dragState.startX, true);
        const deltaY = pixelToPercent(pos.y - dragState.startY, false);

        const zone = zones.find((z) => z.id === dragState.zoneId);
        if (!zone) return;

        let { x, y, width, height } = dragState.initialPosition;
        const handle = dragState.resizeHandle;

        // Adjust based on resize handle with snap-to-grid and snap-to-edge
        if (handle?.includes('w')) {
          let newX = x + deltaX;
          let newWidth = width - deltaX;
          // Snap to edge if beyond left border
          if (newX < 0) {
            newWidth = width + x; // Extend to left edge
            newX = 0;
          } else {
            newX = snapToGrid(newX);
            newWidth = snapToGrid(newWidth);
          }
          if (newWidth >= MIN_ZONE_SIZE) {
            x = newX;
            width = newWidth;
          }
        }
        if (handle?.includes('e')) {
          let newWidth = width + deltaX;
          // Snap to edge if beyond right border
          if (x + newWidth > 100) {
            newWidth = 100 - x;
          } else {
            newWidth = snapToGrid(newWidth);
          }
          if (newWidth >= MIN_ZONE_SIZE) {
            width = newWidth;
          }
        }
        if (handle?.includes('n')) {
          let newY = y + deltaY;
          let newHeight = height - deltaY;
          // Snap to edge if beyond top border
          if (newY < 0) {
            newHeight = height + y; // Extend to top edge
            newY = 0;
          } else {
            newY = snapToGrid(newY);
            newHeight = snapToGrid(newHeight);
          }
          if (newHeight >= MIN_ZONE_SIZE) {
            y = newY;
            height = newHeight;
          }
        }
        if (handle?.includes('s')) {
          let newHeight = height + deltaY;
          // Snap to edge if beyond bottom border
          if (y + newHeight > 100) {
            newHeight = 100 - y;
          } else {
            newHeight = snapToGrid(newHeight);
          }
          if (newHeight >= MIN_ZONE_SIZE) {
            height = newHeight;
          }
        }

        const newPosition = { x, y, width, height };

        // Only update if no overlap
        if (!checkOverlap(newPosition, zone.id)) {
          updateZone(activeFace, zone.id, { position: newPosition });
        }
      }
    };

    const handleMouseUp = () => {
      if (dragState?.type === 'create' && newZonePosition) {
        // Only create if minimum size
        if (newZonePosition.width >= MIN_ZONE_SIZE && newZonePosition.height >= MIN_ZONE_SIZE) {
          // Check for overlaps
          if (!checkOverlap(newZonePosition)) {
            const newZone: Zone = {
              id: crypto.randomUUID(),
              name: `Zone ${zones.length + 1}`,
              position: newZonePosition,
              content_type: 'text',
            };
            addZone(activeFace, newZone);
            setSelectedZoneId(newZone.id);
          }
        }
        setNewZonePosition(null);
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState,
    newZonePosition,
    activeFace,
    zones,
    getCanvasPosition,
    pixelToPercent,
    checkOverlap,
    addZone,
    updateZone,
    snapToGrid,
  ]);

  const handleDeleteZone = (zoneId: string) => {
    deleteZone(activeFace, zoneId);
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
  };

  const handleZoneNameChange = (zoneId: string, name: string) => {
    updateZone(activeFace, zoneId, { name });
  };

  const handleContentTypeChange = (zoneId: string, contentType: ZoneContentType) => {
    updateZone(activeFace, zoneId, { content_type: contentType });
  };

  const handleSave = () => {
    saveEditingTemplate();
    onClose();
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    onClose();
  };

  // Check for overlaps in the new zone being drawn
  const isNewZoneOverlapping = newZonePosition && checkOverlap(newZonePosition);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => handleTemplateNameChange(e.target.value)}
              placeholder="Enter template name..."
              className="w-full max-w-md px-3 py-2 text-lg font-semibold border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Template
            </button>
          </div>
        </div>

        {/* Face Tabs and Copy Buttons */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setActiveFace('front')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                activeFace === 'front'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Front ({editingTemplate.front.zones.length})
            </button>
            <button
              onClick={() => setActiveFace('back')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b -ml-px ${
                activeFace === 'back'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Back ({editingTemplate.back.zones.length})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyFrontToBack}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              title="Copy front zones to back"
            >
              Front → Back
            </button>
            <button
              onClick={copyBackToFront}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              title="Copy back zones to front"
            >
              Back → Front
            </button>
          </div>

          <div className="ml-auto text-xs text-gray-500">
            Click and drag on the canvas to create a new zone
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Canvas Area */}
          <div className="flex-1 p-6 bg-gray-100 flex items-center justify-center overflow-auto">
            <div
              ref={canvasRef}
              className="relative bg-white border-2 border-gray-300 rounded shadow-lg cursor-crosshair"
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
              }}
              onMouseDown={handleCanvasMouseDown}
            >
              {/* 8x8 Grid lines for guidance */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical lines */}
                {Array.from({ length: GRID_SIZE - 1 }, (_, i) => {
                  const pos = ((i + 1) / GRID_SIZE) * 100;
                  const isMajor = (i + 1) % 2 === 0; // Every other line is major
                  return (
                    <div
                      key={`v-${i}`}
                      className={`absolute top-0 bottom-0 w-px ${isMajor ? 'bg-gray-200' : 'bg-gray-100'}`}
                      style={{ left: `${pos}%` }}
                    />
                  );
                })}
                {/* Horizontal lines */}
                {Array.from({ length: GRID_SIZE - 1 }, (_, i) => {
                  const pos = ((i + 1) / GRID_SIZE) * 100;
                  const isMajor = (i + 1) % 2 === 0; // Every other line is major
                  return (
                    <div
                      key={`h-${i}`}
                      className={`absolute left-0 right-0 h-px ${isMajor ? 'bg-gray-200' : 'bg-gray-100'}`}
                      style={{ top: `${pos}%` }}
                    />
                  );
                })}
              </div>

              {/* Existing Zones */}
              {zones.map((zone, index) => {
                const isSelected = selectedZoneId === zone.id;
                const color = getZoneColor(index);

                return (
                  <div
                    key={zone.id}
                    data-zone-id={zone.id}
                    className={`absolute border-2 rounded cursor-move transition-shadow ${
                      isSelected ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'
                    }`}
                    style={{
                      left: `${zone.position.x}%`,
                      top: `${zone.position.y}%`,
                      width: `${zone.position.width}%`,
                      height: `${zone.position.height}%`,
                      borderColor: color,
                      backgroundColor: `${color}20`,
                    }}
                    onMouseDown={(e) => handleZoneMouseDown(e, zone)}
                  >
                    {/* Zone label */}
                    <div
                      className="absolute -top-6 left-0 text-xs font-medium px-1.5 py-0.5 rounded-t truncate max-w-full"
                      style={{ backgroundColor: color, color: 'white' }}
                    >
                      {zone.name}
                    </div>

                    {/* Content type indicator */}
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 pointer-events-none">
                      {zone.content_type === 'image' ? '🖼️' : '📝'}
                    </div>

                    {/* Resize handles (only for selected zone) */}
                    {isSelected && (
                      <>
                        {/* Corner handles */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 rounded-full cursor-nw-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'nw')}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 rounded-full cursor-ne-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'ne')}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 rounded-full cursor-sw-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'sw')}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 rounded-full cursor-se-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'se')}
                        />
                        {/* Edge handles */}
                        <div
                          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 rounded-full cursor-n-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'n')}
                        />
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 rounded-full cursor-s-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 's')}
                        />
                        <div
                          className="absolute top-1/2 -left-1 -translate-y-1/2 w-3 h-3 bg-white border-2 rounded-full cursor-w-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'w')}
                        />
                        <div
                          className="absolute top-1/2 -right-1 -translate-y-1/2 w-3 h-3 bg-white border-2 rounded-full cursor-e-resize"
                          style={{ borderColor: color }}
                          onMouseDown={(e) => handleResizeMouseDown(e, zone, 'e')}
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* New zone being drawn */}
              {newZonePosition && (
                <div
                  className={`absolute border-2 border-dashed rounded pointer-events-none ${
                    isNewZoneOverlapping
                      ? 'border-red-500 bg-red-100/50'
                      : 'border-blue-500 bg-blue-100/50'
                  }`}
                  style={{
                    left: `${newZonePosition.x}%`,
                    top: `${newZonePosition.y}%`,
                    width: `${newZonePosition.width}%`,
                    height: `${newZonePosition.height}%`,
                  }}
                >
                  {isNewZoneOverlapping && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-red-600 font-medium">
                      Overlapping!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Zone List Sidebar */}
          <div className="w-64 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Zones ({zones.length})
              </h3>

              {zones.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No zones yet. Draw on the canvas to create zones.
                </p>
              ) : (
                <div className="space-y-2">
                  {zones.map((zone, index) => {
                    const color = getZoneColor(index);
                    const isSelected = selectedZoneId === zone.id;
                    const isEditingName = editingZoneName === zone.id;

                    return (
                      <div
                        key={zone.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedZoneId(zone.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          {isEditingName ? (
                            <input
                              type="text"
                              value={zone.name}
                              onChange={(e) => handleZoneNameChange(zone.id, e.target.value)}
                              onBlur={() => setEditingZoneName(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingZoneName(null);
                              }}
                              autoFocus
                              className="flex-1 text-sm px-1 py-0.5 border border-gray-300 rounded"
                            />
                          ) : (
                            <span
                              className="flex-1 text-sm font-medium truncate"
                              onDoubleClick={() => setEditingZoneName(zone.id)}
                            >
                              {zone.name}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteZone(zone.id);
                            }}
                            className="text-red-400 hover:text-red-600 text-sm"
                            title="Delete zone"
                          >
                            ✕
                          </button>
                        </div>

                        {isSelected && (
                          <div className="mt-2 space-y-2 pt-2 border-t border-gray-100">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Content Type
                              </label>
                              <select
                                value={zone.content_type}
                                onChange={(e) =>
                                  handleContentTypeChange(zone.id, e.target.value as ZoneContentType)
                                }
                                className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                              >
                                <option value="text">Text</option>
                                <option value="image">Image</option>
                              </select>
                            </div>
                            <div className="text-xs text-gray-400">
                              Position: {Math.round(zone.position.x)}%, {Math.round(zone.position.y)}
                              %
                              <br />
                              Size: {Math.round(zone.position.width)}% × {Math.round(zone.position.height)}%
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
