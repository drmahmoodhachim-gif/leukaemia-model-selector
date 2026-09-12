import { useMemo, useState } from "react";
import { fmt, lineageColor, prettyLine } from "./lib/display";
import type { LeukemiaLine } from "./lib/types";

const W = 680;
const H = 420;
const PAD = { l: 52, r: 88, t: 18, b: 46 };

function log1p(n: number): number {
  return Math.log1p(Math.max(0, n));
}

function scale(v: number, d0: number, d1: number, r0: number, r1: number): number {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const TICKS = [0, 1, 3, 10, 30, 100, 300];

type Props = {
  rows: LeukemiaLine[];
  selected: string | null;
  groupA?: string[];
  groupB?: string[];
  onSelect: (line: string) => void;
};

export default function Scatter({ rows, selected, groupA = [], groupB = [], onSelect }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const pts = rows
      .map((r) => ({
        r,
        x: log1p(r.slc16a3 ?? 0),
        y: log1p(r.slc16a1 ?? 0),
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x0 = 0;
    const x1 = Math.max(log1p(300), ...(xs.length ? xs : [1]));
    const y0 = 0;
    const y1 = Math.max(log1p(200), ...(ys.length ? ys : [1]));
    return { pts, x0, x1, y0, y1 };
  }, [rows]);

  function px(x: number): number {
    return scale(x, layout.x0, layout.x1, PAD.l, W - PAD.r);
  }
  function py(y: number): number {
    return scale(y, layout.y0, layout.y1, H - PAD.b, PAD.t);
  }

  const active = hover ?? selected;
  const tip = layout.pts.find((p) => p.r.line === active);

  return (
    <div className="scatter-wrap">
      <div className="panel-head">
        <h2>MCT1 versus MCT4</h2>
        <p>Click a point. Size is |Chronos|; ring is a protocol line. Axes are log1p TPM.</p>
      </div>
      <svg
        className="scatter"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Scatter plot of MCT4 versus MCT1 expression"
      >
        <rect x="0" y="0" width={W} height={H} fill="transparent" onClick={() => onSelect("")} />
        {TICKS.map((t) => {
          const x = px(log1p(t));
          return (
            <g key={`vx-${t}`}>
              <line x1={x} x2={x} y1={PAD.t} y2={H - PAD.b} className="grid" />
              <text x={x} y={H - 28} className="tick" textAnchor="middle">
                {t}
              </text>
            </g>
          );
        })}
        {TICKS.filter((t) => t <= 200).map((t) => {
          const y = py(log1p(t));
          return (
            <g key={`hy-${t}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="grid" />
              <text x={PAD.l - 8} y={y + 3} className="tick" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 8} className="axis-label" textAnchor="middle">
          MCT4 TPM
        </text>
        <text
          x={16}
          y={(PAD.t + H - PAD.b) / 2}
          className="axis-label"
          textAnchor="middle"
          transform={`rotate(-90 16 ${(PAD.t + H - PAD.b) / 2})`}
        >
          MCT1 TPM
        </text>
        <text x={px(log1p(80))} y={PAD.t + 12} className="quad">
          MCT4-high myeloid
        </text>
        <text x={px(log1p(2))} y={PAD.t + 12} className="quad">
          MCT4-low ALL
        </text>

        {layout.pts.map(({ r, x, y }) => {
          const cx = px(x);
          const cy = py(y);
          const dep = r.slc16a1_dep;
          const rad = r.crispr_available
            ? 4.2 + Math.min(6, Math.abs(dep ?? 0) * 4)
            : 3.4;
          const isSel = r.line === selected;
          const isHov = r.line === hover;
          const inA = groupA.includes(r.line);
          const inB = groupB.includes(r.line);
          const stroke = inA ? "#8b2e1a" : inB ? "#2c4a6e" : isSel ? "#1c1914" : "#fffdf8";
          return (
            <g key={r.line}>
              {(r.protocol_slot || inA || inB) && (
                <circle cx={cx} cy={cy} r={rad + 4} className="halo" stroke={stroke} />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSel || isHov || inA || inB ? rad + 2 : rad}
                fill={lineageColor(r.lineage)}
                fillOpacity={r.crispr_available ? 0.88 : 0.4}
                stroke={stroke}
                strokeWidth={inA || inB || isSel ? 2.2 : 1}
                className="dot"
                onMouseEnter={() => setHover(r.line)}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r.line);
                }}
              >
                <title>
                  {`${prettyLine(r.line)} · ${r.lineage} · MCT1 ${fmt(r.slc16a1, 1)} · MCT4 ${fmt(r.slc16a3, 1)} · dep ${fmt(r.slc16a1_dep)}`}
                </title>
              </circle>
              {(r.protocol_slot || isSel) && (
                <text x={cx + rad + 5} y={cy + 3} className="pt-label">
                  {prettyLine(r.line)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="tooltip">
          <b>
            {prettyLine(tip.r.line)}
            {tip.r.protocol_slot ? ` · slot ${tip.r.protocol_slot}` : ""}
          </b>
          <span>
            {tip.r.lineage} · MCT1 {fmt(tip.r.slc16a1, 1)} · MCT4 {fmt(tip.r.slc16a3, 1)}
          </span>
          <span>MCT1 Chronos {fmt(tip.r.slc16a1_dep)}</span>
        </div>
      )}
    </div>
  );
}
