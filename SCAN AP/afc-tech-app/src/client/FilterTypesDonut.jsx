import { useMemo, useState } from "react";

const DEPTH = 18;
const CX = 140;
const CY = 78;
const RX = 108;
const RY = 58;
const IRX = 54;
const IRY = 29;

function shadeHex(hex, amount) {
  const raw = String(hex || "#64748b").replace("#", "");
  const n = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
  if (!Number.isFinite(n)) return hex;
  const mix = (ch) => Math.max(0, Math.min(255, Math.round(ch * amount)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function ellipsePoint(cx, cy, rx, ry, angle) {
  return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
}

function donutSlicePath(cx, cy, rx, ry, irx, iry, start, end) {
  const span = end - start;
  if (span >= Math.PI * 2 - 1e-4) {
    return [
      `M ${cx + rx} ${cy}`,
      `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`,
      `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`,
      `M ${cx + irx} ${cy}`,
      `A ${irx} ${iry} 0 1 0 ${cx - irx} ${cy}`,
      `A ${irx} ${iry} 0 1 0 ${cx + irx} ${cy}`,
    ].join(" ");
  }
  const large = span > Math.PI ? 1 : 0;
  const [ox1, oy1] = ellipsePoint(cx, cy, rx, ry, start);
  const [ox2, oy2] = ellipsePoint(cx, cy, rx, ry, end);
  const [ix1, iy1] = ellipsePoint(cx, cy, irx, iry, end);
  const [ix2, iy2] = ellipsePoint(cx, cy, irx, iry, start);
  return [
    `M ${ox1} ${oy1}`,
    `A ${rx} ${ry} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${irx} ${iry} 0 ${large} 0 ${ix2} ${iy2}`,
    "Z",
  ].join(" ");
}

function outerWallPath(cx, cy, rx, ry, start, end, depth) {
  const span = Math.min(end, Math.PI) - Math.max(start, 0);
  if (span <= 0.001) return "";
  const a0 = Math.max(start, 0);
  const a1 = Math.min(end, Math.PI);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = ellipsePoint(cx, cy, rx, ry, a0);
  const [x1, y1] = ellipsePoint(cx, cy, rx, ry, a1);
  return [
    `M ${x0} ${y0}`,
    `L ${x0} ${y0 + depth}`,
    `A ${rx} ${ry} 0 ${large} 1 ${x1} ${y1 + depth}`,
    `L ${x1} ${y1}`,
    `A ${rx} ${ry} 0 ${large} 0 ${x0} ${y0}`,
    "Z",
  ].join(" ");
}

function innerWallPath(cx, cy, irx, iry, start, end, depth) {
  const span = Math.min(end, Math.PI) - Math.max(start, 0);
  if (span <= 0.001) return "";
  const a0 = Math.max(start, 0);
  const a1 = Math.min(end, Math.PI);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = ellipsePoint(cx, cy, irx, iry, a0);
  const [x1, y1] = ellipsePoint(cx, cy, irx, iry, a1);
  return [
    `M ${x0} ${y0}`,
    `A ${irx} ${iry} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x1} ${y1 + depth}`,
    `A ${irx} ${iry} 0 ${large} 0 ${x0} ${y0 + depth}`,
    "Z",
  ].join(" ");
}

export default function FilterTypesDonut({ items }) {
  const [hover, setHover] = useState(null);
  const slices = useMemo(() => {
    const total = items.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
    if (!total) return [];
    let angle = -Math.PI / 2;
    return items
      .filter((row) => Number(row.value) > 0)
      .map((row) => {
        const span = (Number(row.value) / total) * Math.PI * 2;
        const start = angle;
        const end = angle + span;
        angle = end;
        return { ...row, start, end, mid: (start + end) / 2, total };
      });
  }, [items]);

  if (slices.length === 0) return null;

  const active = slices.find((s) => s.name === hover);

  return (
    <div className="relative flex-1 min-w-0 h-[220px]">
      <svg
        className="js-graph-donut w-full h-full"
        viewBox="0 0 280 196"
        role="img"
        aria-label="Filter types"
      >
        <defs>
          <radialGradient id="donutTopShine" gradientUnits="userSpaceOnUse" cx="110" cy="52" r="130">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
          </radialGradient>
          <filter id="donutShadow" x="-20%" y="-10%" width="140%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0b1f33" floodOpacity="0.18" />
          </filter>
        </defs>

        <ellipse cx={CX} cy={CY + DEPTH + 10} rx={RX * 0.92} ry={RY * 0.38} fill="#0b1f33" opacity="0.08" />

        {slices.map((slice) => {
          const wall = outerWallPath(CX, CY, RX, RY, slice.start, slice.end, DEPTH);
          return wall ? (
            <path key={`wall-${slice.name}`} d={wall} fill={shadeHex(slice.color, 0.62)} />
          ) : null;
        })}
        {slices.map((slice) => {
          const wall = innerWallPath(CX, CY, IRX, IRY, slice.start, slice.end, DEPTH);
          return wall ? (
            <path key={`inner-${slice.name}`} d={wall} fill={shadeHex(slice.color, 0.48)} />
          ) : null;
        })}

        <g filter="url(#donutShadow)">
          {slices.map((slice) => {
            const top = donutSlicePath(CX, CY, RX, RY, IRX, IRY, slice.start, slice.end);
            return (
              <g
                key={`top-${slice.name}`}
                opacity={hover && hover !== slice.name ? 0.72 : 1}
                onMouseEnter={() => setHover(slice.name)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <path d={top} fill={slice.color} fillRule="evenodd">
                  <title>{`${slice.name} ${slice.value}`}</title>
                </path>
                <path d={top} fill="url(#donutTopShine)" fillRule="evenodd" pointerEvents="none" />
              </g>
            );
          })}
        </g>
      </svg>
      {active ? (
        <div className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-base-100/95 border border-base-300 px-2.5 py-1 text-xs shadow-sm">
          <span className="font-semibold">{active.name}</span>
          <span className="text-base-content/60"> · {active.value} qty</span>
        </div>
      ) : null}
    </div>
  );
}
