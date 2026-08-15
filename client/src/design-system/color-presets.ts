/**
 * Raw color data that must be passed to native controls, canvas or exported
 * documents. Application UI should consume CSS tokens instead.
 */
export const ANNOTATION_TOOL_COLORS = [
  { value: "#E85002", label: "Laranja" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#10B981", label: "Verde" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#FFFFFF", label: "Branco" },
] as const;

export const ANNOTATION_CANVAS_COLORS = [
  "#f97316",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ffffff",
] as const;

export const COMPANY_PRIMARY_COLOR_PRESETS = [
  "#e63946",
  "#2563eb",
  "#7c3aed",
  "#059669",
] as const;

export const DOCUMENT_TYPE_ACCENTS = {
  roteiro: "#f59e0b",
  callsheet: "#06b6d4",
  decupagem: "#8b5cf6",
  orcamento: "#22c55e",
  cronograma: "#38bdf8",
  checklist: "#eab308",
  entrega: "#10b981",
} as const;

export const DOCUMENT_EXPORT_COLORS = {
  dark: {
    canvas: "#0d0d0d",
    canvasDeep: "#050505",
    canvasWarm: "#15100d",
    page: "#111111",
    panel: "#151515",
    table: "#141414",
    tableHeader: "#1b1b1b",
    border: "#252525",
    borderSoft: "#242424",
    text: "#e8e8e8",
    textStrong: "#ffffff",
    textValue: "#eeeeee",
    textMuted: "#999999",
    textSubtle: "#777777",
    textSoft: "#dddddd",
    textFaint: "#aaaaaa",
    textFooter: "#555555",
    signBorder: "#333333",
  },
  paper: {
    canvas: "#f2ede4",
    page: "#fbf7f0",
    pageEnd: "#f5eee4",
    pageWarm: "#f7f1e8",
    pageWarmEnd: "#eee6da",
    text: "#141414",
    textStrong: "#1a1a1a",
    textDefault: "#333333",
    textMuted: "#777777",
    border: "#ddd4c7",
    borderStrong: "#d8d0c3",
    borderSoft: "#e5ddce",
    negative: "#c0392b",
    shotText: "#111111",
    shotMuted: "#555555",
    shotBorder: "#cccccc",
    shotHeader: "#f3f3f3",
  },
} as const;
