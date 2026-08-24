import { useState, useId } from "react";
import type { Point } from "../hooks/usePlots";

const PAD = 8;
const BORDER_WIDTH = 2;

export type CellStatus = "empty" | "planted" | "blocked";

export interface CellState {
  status: CellStatus;
  color?: string; // optional fill override (hex, rgba, css var…)
  label?: string; // short text/emoji rendered inside the cell
}

export type CellGrid = Record<string, CellState>; // key produced by cellKey()

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

// Ray-casting point-in-polygon (handles concave shapes)
function insidePolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const BASE_FILL: Record<CellStatus, string> = {
  empty: "transparent",
  planted: "rgba(61,107,63,0.55)",
  blocked: "rgba(190,40,40,0.45)",
};

const HOVER_FILL: Record<CellStatus, string> = {
  empty: "rgba(255,255,255,0.22)",
  planted: "rgba(61,107,63,0.78)",
  blocked: "rgba(190,40,40,0.68)",
};

function resolveFill(state: CellState, hovered: boolean): string {
  if (state.color) return state.color;
  return hovered ? HOVER_FILL[state.status] : BASE_FILL[state.status];
}

export interface PlotViewProps {
  shape: Point[];
  /**
   * Number of columns to divide the plot width into.
   * Row count is derived automatically to keep cells roughly square.
   * Both dimensions divide the bounding box exactly — no partial cells.
   */
  cols?: number;
  cells?: CellGrid;
  onCellClick?: (col: number, row: number, key: string) => void;
  className?: string;
}

export default function PlotView({ shape, cols: targetCols = 10, cells = {}, onCellClick, className }: PlotViewProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const clipId = useId();
  const borderMaskId = clipId + "m";

  if (shape.length < 3) {
    return (
      <div
        className={`w-full border border-[--color-border] flex items-center justify-center py-24 ${className ?? ""}`}
        style={{ background: "var(--sage-100)" }}
      >
        <p className="text-muted text-sm">No outline drawn yet.</p>
      </div>
    );
  }

  const minX = Math.min(...shape.map((p) => p.x));
  const minY = Math.min(...shape.map((p) => p.y));
  const maxX = Math.max(...shape.map((p) => p.x));
  const maxY = Math.max(...shape.map((p) => p.y));

  const plotW = maxX - minX;
  const plotH = maxY - minY;

  // Derive cell dimensions that tile the bounding box exactly
  const cols = Math.max(1, targetCols);
  const cellW = plotW / cols;
  const rows = Math.max(1, Math.round(plotH / cellW));
  const cellH = plotH / rows;
  const labelSize = Math.min(cellW, cellH) * 0.5;

  const insideCells: { col: number; row: number; x: number; y: number }[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cx = minX + (c + 0.5) * cellW;
      const cy = minY + (r + 0.5) * cellH;
      if (insidePolygon({ x: cx, y: cy }, shape)) {
        insideCells.push({ col: c, row: r, x: minX + c * cellW, y: minY + r * cellH });
      }
    }
  }

  const vbX = minX - PAD;
  const vbY = minY - PAD;
  const vbW = plotW + PAD * 2;
  const vbH = plotH + PAD * 2;

  const ptStr = shape.map((p) => `${p.x},${p.y}`).join(" ");


  function handleClick(col: number, row: number) {
    onCellClick?.(col, row, cellKey(col, row));
  }

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className={`w-full border border-[--color-border] ${className ?? ""}`}
      style={{ background: "var(--sage-100)" }}
    >
      <defs>
        {/* Clips to polygon interior — used for cells */}
        <clipPath id={clipId}>
          <polygon points={ptStr} />
        </clipPath>
        {/* Mask for the border: white = show, black polygon = hide the interior half of the stroke */}
        <mask id={borderMaskId}>
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="white" />
          <polygon points={ptStr} fill="black" />
        </mask>
      </defs>

      {/* Base polygon fill */}
      <polygon points={ptStr} fill="var(--brown-500)" />

      {/* Cells clipped to the polygon interior */}
      <g clipPath={`url(#${clipId})`}>
        {insideCells.map(({ col, row, x, y }) => {
          const key = cellKey(col, row);
          const state = cells[key] ?? { status: "empty" };
          const hovered = hoveredKey === key;

          return (
            <g
              key={key}
              style={{ cursor: "pointer" }}
              onClick={() => handleClick(col, row)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                fill={resolveFill(state, hovered)}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={0.5}
              />
              {state.label && (
                <text
                  x={x + cellW / 2}
                  y={y + cellH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={labelSize}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {state.label}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Border: doubled stroke, masked so only the outer half (outside the polygon) is visible */}
      <polygon
        points={ptStr}
        fill="none"
        stroke="var(--brown-700, #6b4f2a)"
        strokeWidth={BORDER_WIDTH}        
        mask={`url(#${borderMaskId})`}
        style={{ pointerEvents: "none" }}
      />
    </svg>
  );
}
