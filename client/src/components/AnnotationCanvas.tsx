import { useRef, useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowUpRight, Square, Circle, Pencil, Type, Undo2, RotateCcw } from "lucide-react";

export type AnnotationTool = "arrow" | "rect" | "circle" | "draw" | "text";

interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: AnnotationTool;
  points: Point[];
  color: string;
  text?: string;
}

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  active?: boolean;
}

const COLORS = ["#f97316", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#ffffff"];

export default function AnnotationCanvas({
  width,
  height,
  annotations,
  onAnnotationsChange,
  active = true,
}: AnnotationCanvasProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<AnnotationTool>("arrow");
  const [color, setColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  const drawAnnotation = useCallback((ctx: CanvasRenderingContext2D, ann: Annotation) => {
    if (ann.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const [p1, p2] = ann.points;

    switch (ann.type) {
      case "arrow": {
        if (!p2) break;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "rect": {
        if (!p2) break;
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.abs(p2.x - p1.x);
        const rh = Math.abs(p2.y - p1.y);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.fillStyle = ann.color + "1A";
        ctx.fillRect(rx, ry, rw, rh);
        break;
      }
      case "circle": {
        if (!p2) break;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx2 = Math.abs(p2.x - p1.x) / 2;
        const ry2 = Math.abs(p2.y - p1.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = ann.color + "1A";
        ctx.fill();
        break;
      }
      case "draw": {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
        break;
      }
      case "text": {
        ctx.font = "16px sans-serif";
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text || "", p1.x, p1.y);
        break;
      }
    }
    ctx.restore();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    for (const ann of annotations) {
      drawAnnotation(ctx, ann);
    }

    if (isDrawing && currentPoints.length > 0) {
      const tempAnn: Annotation = {
        id: "temp",
        type: tool,
        points: currentPoints,
        color,
      };
      drawAnnotation(ctx, tempAnn);
    }
  }, [annotations, drawAnnotation, isDrawing, currentPoints, tool, color, width, height]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active) return;
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === "text") {
      const text = prompt(t("app.videoReviews.annotationText") as string);
      if (text?.trim()) {
        const newAnn: Annotation = {
          id: crypto.randomUUID(),
          type: "text",
          points: [pos],
          color,
          text: text.trim(),
        };
        onAnnotationsChange([...annotations, newAnn]);
      }
      setIsDrawing(false);
      return;
    }

    if (tool === "draw") {
      setCurrentPoints([pos]);
    } else {
      setCurrentPoints([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const pos = getPos(e);

    if (tool === "draw") {
      setCurrentPoints((prev) => [...prev, pos]);
    } else {
      setCurrentPoints([startPoint, pos]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length < 1) return;
    setIsDrawing(false);

    if (tool !== "draw" && currentPoints.length < 2) {
      setCurrentPoints([]);
      setStartPoint(null);
      return;
    }

    const newAnn: Annotation = {
      id: crypto.randomUUID(),
      type: tool,
      points: tool === "draw" ? currentPoints : [currentPoints[0], currentPoints[currentPoints.length - 1]],
      color,
    };

    if (tool === "draw" && currentPoints.length < 2) {
      setCurrentPoints([]);
      setStartPoint(null);
      return;
    }

    onAnnotationsChange([...annotations, newAnn]);
    setCurrentPoints([]);
    setStartPoint(null);
  };

  const handleUndo = () => {
    onAnnotationsChange(annotations.slice(0, -1));
  };

  const handleClear = () => {
    onAnnotationsChange([]);
  };

  const tools: { key: AnnotationTool; icon: typeof ArrowUpRight; labelKey: string }[] = [
    { key: "arrow", icon: ArrowUpRight, labelKey: "app.videoReviews.arrow" },
    { key: "rect", icon: Square, labelKey: "app.videoReviews.rect" },
    { key: "circle", icon: Circle, labelKey: "app.videoReviews.circle" },
    { key: "draw", icon: Pencil, labelKey: "app.videoReviews.draw" },
    { key: "text", icon: Type, labelKey: "app.videoReviews.text" },
  ];

  return (
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`absolute inset-0 z-10 ${active ? "cursor-crosshair" : "pointer-events-none"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {active && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/80 p-1.5 rounded">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTool(t.key)}
                className={`p-1.5 rounded transition ${
                  tool === t.key ? "bg-frame-orange text-frame-black" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title={t(t.labelKey) as string}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
          <div className="w-px h-5 bg-white/20 mx-1" />
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border-2 transition ${
                color === c ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title={t("app.videoReviews.undo") as string}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={annotations.length === 0}
            className="p-1.5 rounded text-white/70 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title={t("app.videoReviews.clearAll") as string}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
