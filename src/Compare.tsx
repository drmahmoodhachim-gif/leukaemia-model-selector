import { useMemo, useState } from "react";
import panel from "./data/panel_matrices.json";
import { fmt, prettyLine } from "./lib/display";
import { contrastFromMaps, identity, log2p1, type ContrastRow } from "./lib/stats";
import type { LeukemiaLine } from "./lib/types";

type Layer = "rna" | "protein";
export type PickMode = "inspect" | "A" | "B";

type Props = {
  rows: LeukemiaLine[];
  groupA: string[];
  groupB: string[];
  pick: PickMode;
  onPick: (mode: PickMode) => void;
  onRemove: (id: string, group: "A" | "B") => void;
  onPreset: (a: string[], b: string[]) => void;
  onClear: () => void;
};

const PRESETS: { label: string; a: (r: LeukemiaLine[]) => string[]; b: (r: LeukemiaLine[]) => string[] }[] = [
  {
    label: "AML vs B-ALL",
    a: (r) => r.filter((x) => x.lineage === "AML").map((x) => x.line),
    b: (r) => r.filter((x) => x.lineage === "B-ALL").map((x) => x.line),
  },
  {
    label: "Protocol myeloid vs B-ALL",
    a: () => ["KASUMI1", "OCIAML3"],
    b: () => ["NALM6", "SEM", "RCHACV"],
  },
  {
    label: "MCT1-dep vs null",
    a: (r) => r.filter((x) => x.mct1_dependent).map((x) => x.line),
    b: (r) => r.filter((x) => x.crispr_available && !x.mct1_dependent).map((x) => x.line),
  },
];

function Volcano({ rows, layer }: { rows: ContrastRow[]; layer: Layer }) {
  const W = 640;
  const H = 280;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const usable = rows.filter((r) => Number.isFinite(r.lfc) && r.p != null);
  const maxAbs = Math.max(1.2, ...usable.map((r) => Math.abs(r.lfc)));
  const maxY = Math.max(1.5, ...usable.map((r) => -Math.log10(r.p ?? 1)));
  const x = (lfc: number) => pad.l + ((lfc + maxAbs) / (2 * maxAbs)) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - -Math.log10(p) / maxY) * (H - pad.t - pad.b);
  return (
    <svg className="volcano" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Volcano plot of panel contrast">
      <line x1={x(0)} x2={x(0)} y1={pad.t} y2={H - pad.b} className="grid" />
      <line x1={pad.l} x2={W - pad.r} y1={y(0.05)} y2={y(0.05)} className="grid" />
      <text x={(pad.l + W - pad.r) / 2} y={H - 8} className="axis-label" textAnchor="middle">
        {layer === "rna" ? "log2FC (A − B) on log2(TPM+1)" : "Δ median protein (A − B)"}
      </text>
      <text
        x={14}
        y={(pad.t + H - pad.b) / 2}
        className="axis-label"
        textAnchor="middle"
        transform={`rotate(-90 14 ${(pad.t + H - pad.b) / 2})`}
      >
        −log10 p
      </text>
      {usable.map((r) => {
        const sig = (r.p ?? 1) < 0.05 && Math.abs(r.lfc) > 0.5;
        return (
          <g key={r.gene}>
            <circle
              cx={x(r.lfc)}
              cy={y(r.p ?? 1)}
              r={sig ? 5 : 3.5}
              fill={r.lfc > 0 ? "#8b2e1a" : "#2c4a6e"}
              fillOpacity={sig ? 0.95 : 0.45}
            >
              <title>{`${r.gene}  Δ=${r.lfc.toFixed(2)}  p=${r.p?.toExponential(2)}`}</title>
            </circle>
            {sig && (
              <text x={x(r.lfc) + 6} y={y(r.p ?? 1) + 3} className="pt-label">
                {r.gene}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Compare({
  rows,
  groupA,
  groupB,
  pick,
  onPick,
  onRemove,
  onPreset,
  onClear,
}: Props) {
  const [layer, setLayer] = useState<Layer>("rna");
  const matrices = panel as {
    rna: Record<string, Record<string, number | null>>;
    protein: Record<string, Record<string, number | null>>;
    rna_genes: string[];
    protein_genes: string[];
    protein_lines: string[];
    notes: { rna: string; protein: string };
  };
  const proteinSet = new Set(matrices.protein_lines);

  const result = useMemo(() => {
    if (!groupA.length || !groupB.length) return [];
    if (layer === "rna") {
      return contrastFromMaps(groupA, groupB, matrices.rna, matrices.rna_genes, log2p1);
    }
    return contrastFromMaps(
      groupA.filter((id) => proteinSet.has(id)),
      groupB.filter((id) => proteinSet.has(id)),
      matrices.protein,
      matrices.protein_genes,
      identity,
    );
  }, [groupA, groupB, layer, matrices, proteinSet]);

  const protA = groupA.filter((id) => proteinSet.has(id)).length;
  const protB = groupB.filter((id) => proteinSet.has(id)).length;

  return (
    <section className="compare">
      <div className="panel-head">
        <h2>Group contrast</h2>
        <p>
          This is the locked 53-gene CSRG panel, not genome-wide DEG. RNA is CCLE 2025 TPM.
          Protein is CCLE 2019 relative abundance on 24 lines. p is Mann–Whitney (needs n≥2
          per group). HCAR1 and SLC5A8 are omitted from RNA.
        </p>
      </div>

      <div className="filters">
        <button type="button" className={pick === "inspect" ? "filter active" : "filter"} onClick={() => onPick("inspect")}>
          Inspect
        </button>
        <button type="button" className={pick === "A" ? "filter active" : "filter"} onClick={() => onPick("A")}>
          Click to add A
        </button>
        <button type="button" className={pick === "B" ? "filter active" : "filter"} onClick={() => onPick("B")}>
          Click to add B
        </button>
        <button type="button" className={layer === "rna" ? "filter active" : "filter"} onClick={() => setLayer("rna")}>
          RNA panel
        </button>
        <button type="button" className={layer === "protein" ? "filter active" : "filter"} onClick={() => setLayer("protein")}>
          Proteomics
        </button>
        {PRESETS.map((pre) => (
          <button
            key={pre.label}
            type="button"
            className="filter"
            onClick={() => onPreset(pre.a(rows), pre.b(rows))}
          >
            {pre.label}
          </button>
        ))}
        <button type="button" className="filter" onClick={onClear}>
          Clear groups
        </button>
      </div>

      <div className="group-cols">
        <div className="group-box a">
          <h3>Group A · higher = red</h3>
          <p>
            {groupA.length} lines
            {layer === "protein" ? ` · ${protA} with protein` : ""}
          </p>
          <div className="chips">
            {groupA.map((id) => (
              <button key={id} type="button" className="chip a" onClick={() => onRemove(id, "A")}>
                {prettyLine(id)}
                {layer === "protein" && !proteinSet.has(id) ? " · no protein" : ""} ×
              </button>
            ))}
          </div>
        </div>
        <div className="group-box b">
          <h3>Group B · higher = blue</h3>
          <p>
            {groupB.length} lines
            {layer === "protein" ? ` · ${protB} with protein` : ""}
          </p>
          <div className="chips">
            {groupB.map((id) => (
              <button key={id} type="button" className="chip b" onClick={() => onRemove(id, "B")}>
                {prettyLine(id)}
                {layer === "protein" && !proteinSet.has(id) ? " · no protein" : ""} ×
              </button>
            ))}
          </div>
        </div>
      </div>

      {groupA.length && groupB.length ? (
        <>
          <Volcano rows={result} layer={layer} />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Gene</th>
                  <th className="num">nA</th>
                  <th className="num">nB</th>
                  <th className="num">{layer === "rna" ? "med log2 A" : "med prot A"}</th>
                  <th className="num">{layer === "rna" ? "med log2 B" : "med prot B"}</th>
                  <th className="num">{layer === "rna" ? "log2FC" : "Δ protein"}</th>
                  <th className="num">p</th>
                </tr>
              </thead>
              <tbody>
                {result.map((r) => (
                  <tr key={r.gene} className={(r.p ?? 1) < 0.05 ? "selected" : undefined}>
                    <td>{r.gene}</td>
                    <td className="num">{r.nA}</td>
                    <td className="num">{r.nB}</td>
                    <td className="num">{fmt(r.meanA)}</td>
                    <td className="num">{fmt(r.meanB)}</td>
                    <td className="num">{fmt(r.lfc)}</td>
                    <td className="num">{r.p == null ? "—" : r.p < 0.001 ? r.p.toExponential(2) : r.p.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="source">
          Choose a preset, or set “Click to add A/B” and pick lines on the plot, cards, or
          table. Protein is only on 24 lines (includes Jurkat, K-562, KASUMI-1, NALM-6, SEM,
          RCH-ACV, THP-1; not OCI-AML3 or DND-41).
        </p>
      )}
    </section>
  );
}
