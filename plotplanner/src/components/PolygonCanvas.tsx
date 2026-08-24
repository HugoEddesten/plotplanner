import { useRef, useState, useEffect } from "react";
import type { Point } from "../hooks/usePlots";
import { GRID_SIZE, METRES_PER_CELL } from "../lib/plotConstants";

const VIEWBOX_W = 800;
const VIEWBOX_H = 400;
const HIT_RADIUS = 14;
const SNAP_THRESHOLD = GRID_SIZE / 4;
const LABEL_OFFSET = 16; // px perpendicular to edge
const MIN_VB_W = 100; // 8x zoom limit
const ASPECT = VIEWBOX_H / VIEWBOX_W;

interface Viewbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function snapToGrid(pos: Point, snapThreshold: number): Point {
  const snapX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
  const snapY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
  return {
    x: Math.abs(pos.x - snapX) < snapThreshold ? snapX : pos.x,
    y: Math.abs(pos.y - snapY) < snapThreshold ? snapY : pos.y,
  };
}

function isSnappedToCorner(p: Point): boolean {
  return p.x % GRID_SIZE === 0 && p.y % GRID_SIZE === 0;
}

// Positive = CCW in SVG coords (Y-down), negative = CW
function signedArea(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return a / 2;
}

function formatLength(metres: number): string {
  if (metres >= 1) return `${metres.toFixed(1)}m`;
  return `${Math.round(metres * 100)}cm`;
}

function EdgeMeasurement({
  p1,
  p2,
  outwardSign,
  label: keyLabel,
  scale,
}: {
  p1: Point;
  p2: Point;
  outwardSign: 1 | -1;
  label: string | number;
  scale: number;
}) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 20) return null;

  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Outward normal: outwardSign * (-dy, dx) / len
  const nx = (outwardSign * -dy) / len;
  const ny = (outwardSign * dx) / len;

  const metres = (len / GRID_SIZE) * METRES_PER_CELL;
  const text = formatLength(metres);

  // Scale font/halo/offset by viewBox ratio so labels stay the same screen size when zoomed
  const fs = 11 * scale;
  const offset = LABEL_OFFSET * scale;

  return (
    <text
      key={keyLabel}
      x={mx + nx * offset}
      y={my + ny * offset}
      fontSize={fs}
      fontWeight={600}
      fill="var(--color-primary-dark)"
      textAnchor="middle"
      dominantBaseline="middle"
      paintOrder="stroke"
      stroke="white"
      strokeWidth={3 * scale}
      strokeLinejoin="round"
      style={{ pointerEvents: "none" }}
    >
      {text}
    </text>
  );
}

interface Props {
  points: Point[];
  onChange: (points: Point[]) => void;
}

export default function PolygonCanvas({ points, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    index: number;
    hasMoved: boolean;
    isNew: boolean;
  } | null>(null);
  const pan = useRef<{ lastX: number; lastY: number } | null>(null);
  const [vb, setVb] = useState<Viewbox>({
    x: 0,
    y: 0,
    w: VIEWBOX_W,
    h: VIEWBOX_H,
  });

  // Non-passive listener so preventDefault() actually stops page scroll
  useEffect(() => {
    const el = svgRef.current!;
    const block = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, []);

  function getSVGPoint(clientX: number, clientY: number): Point {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x, y };
  }

  function toSVGCoords(e: React.PointerEvent): Point {
    const { x, y } = getSVGPoint(e.clientX, e.clientY);
    return {
      x: Math.max(0, Math.min(VIEWBOX_W, x)),
      y: Math.max(0, Math.min(VIEWBOX_H, y)),
    };
  }

  function onWheel(e: React.WheelEvent) {
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const { x: cx, y: cy } = getSVGPoint(e.clientX, e.clientY);

    setVb((prev) => {
      const newW = Math.min(Math.max(prev.w * factor, MIN_VB_W), VIEWBOX_W);
      const newH = newW * ASPECT;
      const newX = Math.max(
        0,
        Math.min(
          VIEWBOX_W - newW,
          cx - (cx - prev.x) * (newW / prev.w),
        ),
      );
      const newY = Math.max(
        0,
        Math.min(
          VIEWBOX_H - newH,
          cy - (cy - prev.y) * (newH / prev.h),
        ),
      );
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }

  function hitIndex(pos: Point): number {
    return points.findIndex(
      (p) => Math.hypot(p.x - pos.x, p.y - pos.y) < HIT_RADIUS,
    );
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 1 || e.button === 2) {
      pan.current = { lastX: e.clientX, lastY: e.clientY };
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }

    const pos = snapToGrid(toSVGCoords(e), SNAP_THRESHOLD * (vb.h / VIEWBOX_H));
    const hit = hitIndex(pos);
    if (hit !== -1) {
      drag.current = { index: hit, hasMoved: false, isNew: false };
    } else {
      const next = [...points, pos];
      onChange(next);
      drag.current = { index: next.length - 1, hasMoved: false, isNew: true };
    }
    svgRef.current!.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pan.current) {
      const dx = e.clientX - pan.current.lastX;
      const dy = e.clientY - pan.current.lastY;
      pan.current = { lastX: e.clientX, lastY: e.clientY };
      setVb((prev) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const scaleX = prev.w / rect.width;
        const scaleY = prev.h / rect.height;
        return {
          ...prev,
          x: Math.max(0, Math.min(VIEWBOX_W - prev.w, prev.x - dx * scaleX)),
          y: Math.max(0, Math.min(VIEWBOX_H - prev.h, prev.y - dy * scaleY)),
        };
      });
      return;
    }

    if (!drag.current) return;
    const pos = snapToGrid(toSVGCoords(e), SNAP_THRESHOLD * (vb.h / VIEWBOX_H));
    drag.current.hasMoved = true;
    const next = [...points];
    next[drag.current.index] = pos;
    onChange(next);
  }

  function onPointerUp() {
    if (pan.current) {
      pan.current = null;
      return;
    }
    if (drag.current && !drag.current.hasMoved && !drag.current.isNew) {
      onChange(points.filter((_, i) => i !== drag.current!.index));
    }
    drag.current = null;
  }

  // Grid lines
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= VIEWBOX_W; x += GRID_SIZE) {
    gridLines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={VIEWBOX_H} />);
  }
  for (let y = 0; y <= VIEWBOX_H; y += GRID_SIZE) {
    gridLines.push(<line key={`h${y}`} x1={0} y1={y} x2={VIEWBOX_W} y2={y} />);
  }

  const ptStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const n = points.length;

  // Determine outward normal direction from polygon winding
  const outwardSign: 1 | -1 = n >= 3 && signedArea(points) > 0 ? 1 : -1;

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full rounded-2xl border border-[--color-border] cursor-crosshair select-none"
        style={{ background: "var(--sage-100)", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Grid */}
        <g stroke="var(--green-200)" strokeWidth={0.75}>
          {gridLines}
        </g>

        {/* Scale label */}
        <text x={vb.x + 8 * (vb.h / VIEWBOX_H)} y={vb.h + vb.y - 8 * (vb.h / VIEWBOX_H)} fontSize={12 * vb.h / VIEWBOX_H} fill="var(--sage-400)">
          1 square = 0.5m²
        </text>

        {/* Edges */}
        {n === 2 && (
          <line
            x1={points[0].x}
            y1={points[0].y}
            x2={points[1].x}
            y2={points[1].y}
            stroke="var(--color-primary)"
            strokeWidth={2 * (vb.h / VIEWBOX_H)}
            style={{ pointerEvents: "none" }}
          />
        )}
        {n >= 3 && (
          <>
            <polygon
              points={ptStr}
              fill="rgba(61,107,63,0.12)"
              stroke="var(--color-primary)"
              strokeWidth={2 * (vb.h / VIEWBOX_H)}
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
            <line
              x1={points[n - 1].x}
              y1={points[n - 1].y}
              x2={points[0].x}
              y2={points[0].y}
              stroke="var(--color-primary)"
              strokeWidth={1.5 * (vb.h / VIEWBOX_H)}
              strokeDasharray="6 4"
              opacity={0.4}
              style={{ pointerEvents: "none" }}
            />
          </>
        )}

        {/* Edge measurements */}
        {n === 2 && (
          <EdgeMeasurement
            p1={points[0]}
            p2={points[1]}
            outwardSign={1}
            label="edge"
            scale={vb.h / VIEWBOX_H}
          />
        )}
        {n >= 3 &&
          points.map((p, i) => (
            <EdgeMeasurement
              key={i}
              p1={p}
              p2={points[(i + 1) % n]}
              outwardSign={outwardSign}
              label={i}
              scale={vb.h / VIEWBOX_H}
            />
          ))}

        {/* Point handles */}
        {points.map((p, i) => (
          <g key={i} style={{ pointerEvents: "none" }}>
            {isSnappedToCorner(p) && (
              <circle
                cx={p.x}
                cy={p.y}
                r={11 * (vb.h / VIEWBOX_H)}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={1 * (vb.h / VIEWBOX_H)}
                opacity={0.35}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={6 * (vb.h / VIEWBOX_H)}
              fill="white"
              stroke="var(--color-primary)"
              strokeWidth={2.5 * (vb.h / VIEWBOX_H)}
            />
          </g>
        ))}
      </svg>

      <p
        className="text-center text-sm mt-3"
        style={{ color: "var(--sage-400)" }}
      >
        Click to add a corner &middot; drag to reposition &middot; click a point
        to remove it &middot; scroll to zoom &middot; right-drag to pan
      </p>
    </div>
  );
}
