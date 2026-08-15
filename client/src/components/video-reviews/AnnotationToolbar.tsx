/**
 * AnnotationToolbar Component
 *
 * Toolbar for drawing annotations on video frames
 */

import { useState } from "react";
import {
  Square,
  Circle,
  ArrowRight,
  Type,
  Minus,
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Palette,
} from "lucide-react";
import { ANNOTATION_TOOL_COLORS } from "@/design-system/color-presets";

export type AnnotationTool =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'freehand'
  | 'text'
  | 'eraser';

export interface AnnotationToolbarProps {
  /** Currently selected tool */
  selectedTool: AnnotationTool;

  /** Currently selected color */
  selectedColor: string;

  /** Whether can undo */
  canUndo: boolean;

  /** Whether can redo */
  canRedo: boolean;

  /** Callback when tool changes */
  onToolChange: (tool: AnnotationTool) => void;

  /** Callback when color changes */
  onColorChange: (color: string) => void;

  /** Callback for undo */
  onUndo: () => void;

  /** Callback for redo */
  onRedo: () => void;

  /** Callback to clear all annotations */
  onClear: () => void;

  /** Whether annotations are enabled */
  enabled?: boolean;
}

const TOOLS: Array<{
  id: AnnotationTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hotkey?: string;
}> = [
  { id: 'rectangle', icon: Square, label: 'Retângulo', hotkey: 'R' },
  { id: 'circle', icon: Circle, label: 'Círculo', hotkey: 'C' },
  { id: 'arrow', icon: ArrowRight, label: 'Seta', hotkey: 'A' },
  { id: 'line', icon: Minus, label: 'Linha', hotkey: 'L' },
  { id: 'freehand', icon: Pen, label: 'Desenho Livre', hotkey: 'D' },
  { id: 'text', icon: Type, label: 'Texto', hotkey: 'T' },
  { id: 'eraser', icon: Eraser, label: 'Apagar', hotkey: 'E' },
];

const COLORS = ANNOTATION_TOOL_COLORS;

export function AnnotationToolbar({
  selectedTool,
  selectedColor,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  enabled = true,
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!enabled) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-black/90 border-t border-frame-gray-3">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        <p className="text-xs font-frame-mono uppercase tracking-wider text-frame-gray-light mr-3">
          Ferramentas:
        </p>

        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isSelected = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`
                relative w-9 h-9 flex items-center justify-center rounded transition
                ${isSelected
                  ? 'bg-frame-orange text-white'
                  : 'hover:bg-white/10 text-frame-gray-light'
                }
              `}
              title={`${tool.label}${tool.hotkey ? ` (${tool.hotkey})` : ''}`}
            >
              <Icon className="w-4 h-4" />
              {tool.hotkey && (
                <span className="absolute -bottom-1 -right-1 text-[0.5rem] font-mono bg-black/80 px-1 rounded">
                  {tool.hotkey}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* History & Actions */}
      <div className="flex items-center gap-1">
        {/* Color Picker */}
        <div className="relative mr-2">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition"
            title="Cor"
          >
            <div className="relative">
              <Palette className="w-4 h-4 text-white" />
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          </button>

          {/* Color Menu */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColorPicker(false)}
              />

              <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-frame-gray-3 rounded shadow-lg p-3 z-50">
                <p className="text-xs font-semibold text-frame-gray-light uppercase tracking-wider mb-2">
                  Cor
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => {
                        onColorChange(color.value);
                        setShowColorPicker(false);
                      }}
                      className={`
                        w-8 h-8 rounded border-2 transition
                        ${selectedColor === color.value
                          ? 'border-white scale-110'
                          : 'border-frame-gray-3 hover:border-frame-gray-4'
                        }
                      `}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-frame-gray-3" />

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4 text-white" />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4 text-white" />
        </button>

        <div className="w-px h-6 bg-frame-gray-3" />

        {/* Clear All */}
        <button
          onClick={() => {
            if (confirm('Apagar todas as anotações?')) {
              onClear();
            }
          }}
          className="w-9 h-9 flex items-center justify-center hover:bg-red-500/20 rounded transition text-red-400"
          title="Limpar tudo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
