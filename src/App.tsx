import { useEffect, useMemo, useRef, useState } from "react";
import Inspector from "./Inspector";
import Scatter from "./Scatter";
import { loadLines } from "./lib/supabase";
import {
  LINEAGE_COLOR,
  QUESTIONS,
  SLOTS,
  fmt,
  lineageColor,
  matchesQuestion,
  prettyLine,
} from "./lib/display";
import type { LeukemiaLine, Question } from "./lib/types";

type SortKey = keyof LeukemiaLine;

function pct(rows: LeukemiaLine[], pred: (r: LeukemiaLine) => boolean): string {
  if (!rows.length) return "0%";
  return `${((rows.filter(pred).length / rows.length) * 100).toFixed(1)}%`;
}

export default function App() {
  const [rows, setRows] = useState<LeukemiaLine[]>([]);
  const [source, setSource] = useState<"supabase" | "bundled">("bundled");
  const [q, setQ] = useState<Question>("all");
  const [lineage, setLineage] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "slc16a1_dep",
    dir: "asc",
  });
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    loadLines().then(({ rows: data, source: src }) => {
      setRows(data);
      setSource(src);
    });
  }, []);

  const filtered = useMemo(() => {
    const qlc = search.trim().toLowerCase();
    return rows
      .filter((r) => matchesQuestion(r, q))
      .filter((r) => lineage === "all" || r.lineage === lineage)
      .filter((r) => {
        if (!qlc) return true;
        return (
          prettyLine(r.line).toLowerCase().includes(qlc) ||
          r.line.toLowerCase().includes(qlc) ||
          (r.recommended_for ?? "").toLowerCase().includes(qlc) ||
          (r.protocol_slot ?? "").toLowerCase().includes(qlc)
        );
      })
      .sort((a, b) => {
        if (q === "protocol" && a.protocol_slot && b.protocol_slot && sort.key === "slc16a1_dep") {
          return a.protocol_slot.localeCompare(b.protocol_slot);
        }
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sort.dir === "desc" ? bv - av : av - bv;
        }
        return sort.dir === "desc"
          ? String(bv).localeCompare(String(av))
          : String(av).localeCompare(String(bv));
      });
  }, [rows, q, lineage, search, sort]);

  const selectedRow = rows.find((r) => r.line === selected) ?? null;

  function selectLine(id: string) {
    const next = id && id !== selected ? id : null;
    setSelected(next);
    if (next) {
      requestAnimationFrame(() => {
        rowRefs.current[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  }

  const lineages = ["all", ...Array.from(new Set(rows.map((r) => r.lineage))).sort()];
  const crisprN = rows.filter((r) => r.crispr_available).length;
  const depN = rows.filter((r) => r.mct1_dependent).length;

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="kicker">CSRG-25-14 · CCLE 2025 · DepMap 24Q4 Chronos · Supabase</div>
          <h1>Leukaemia model selector</h1>
          <p className="lead">
            Click the plot, a protocol card, or a row. MCT1 and MCT4 match DepMap. SMCT1 is
            floor. The causal arm is CRISPR gene effect, not expression rank.
          </p>
        </div>
        <div className="stats">
          <div className="stat danger">
            <b>{pct(rows, (r) => r.ffar2_detected)}</b>
            <span>FFAR2 on in lines</span>
          </div>
          <div className="stat ok">
            <b>{pct(rows, (r) => (r.slc16a1 ?? 0) > 1)}</b>
            <span>MCT1 on</span>
          </div>
          <div className="stat warn">
            <b>{depN}</b>
            <span>MCT1 Chronos &lt; −0.5</span>
          </div>
          <div className="stat">
            <b>
              {crisprN}/{rows.length || "—"}
            </b>
            <span>with CRISPR</span>
          </div>
        </div>
      </header>

      <div className="legend">
        {Object.entries(LINEAGE_COLOR).map(([name, color]) => (
          <button
            key={name}
            type="button"
            className={lineage === name ? "swatch active" : "swatch"}
            onClick={() => setLineage(lineage === name ? "all" : name)}
          >
            <i style={{ background: color }} />
            {name}
            <em>{rows.filter((r) => r.lineage === name).length}</em>
          </button>
        ))}
        {lineage !== "all" && (
          <button type="button" className="swatch" onClick={() => setLineage("all")}>
            Clear lineage
          </button>
        )}
      </div>

      <div className="workspace">
        <Scatter rows={filtered} selected={selected} onSelect={selectLine} />
        <Inspector row={selectedRow} />
      </div>

      <h2>Protocol v5.0</h2>
      <div className="slot-grid">
        {SLOTS.map((s) => {
          const row = rows.find((r) => r.line === s.lineId);
          const on = selected === s.lineId;
          return (
            <button
              key={s.slot}
              type="button"
              className={on ? "slot-card on" : "slot-card"}
              onClick={() => selectLine(s.lineId)}
            >
              <span className="slot-id" style={{ color: lineageColor(row?.lineage ?? "AML") }}>
                {s.slot}
              </span>
              <strong>{s.line}</strong>
              <span className="slot-meta">
                {row?.lineage ?? ""} · MCT1 {fmt(row?.slc16a1, 1)} · MCT4 {fmt(row?.slc16a3, 1)} · dep{" "}
                {fmt(row?.slc16a1_dep)}
              </span>
              <span className="slot-job">{s.job}</span>
            </button>
          );
        })}
      </div>
      <p className="source" style={{ marginTop: 8 }}>
        Six-line core plus K-562 for method development and RCH-ACV on the B-ALL arm. P31-FUJ
        is extra, receptor only — click <button type="button" className="textlink" onClick={() => selectLine("P31FUJ")}>P31-FUJ</button>.
      </p>

      <details className="notes" open={notesOpen} onToggle={(e) => setNotesOpen(e.currentTarget.open)}>
        <summary>Why SMCT1 is floor, and why receptors in lines are the wrong story</summary>
        <div className="banner">
          <strong>Butyrate entry is MCT-mediated because SMCT1 is off.</strong>
          The old SMCT1 column (MUTZ-3 44 TPM) was a discarded cBioPortal assignment. DepMap
          26Q1 max in leukaemia is 0.010 TPM. TARGET blasts are floor.
        </div>
        <div className="banner info">
          <strong>Receptors are off in lines and on in patients.</strong>
          P31-FUJ is the only usable FFAR2 line. In TARGET AML, HCAR2 is above 1 TPM in about
          93% of blasts.
        </div>
        <div className="banner">
          <strong>Do not pick a panel on expression alone.</strong>
          HL-60, MUTZ-3 and MONO-MAC-6 have no CRISPR. THP-1 and Jurkat are dependency-null.
          LOUCY and SUP-T11 have no CRISPR.
        </div>
      </details>

      <h2>Ranked matrix</h2>
      <div className="filters">
        {QUESTIONS.map((item) => (
          <button
            key={item.id}
            className={q === item.id ? "filter active" : "filter"}
            onClick={() => setQ(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search line or recommendation"
        />
        <select value={lineage} onChange={(e) => setLineage(e.target.value)}>
          {lineages.map((l) => (
            <option key={l} value={l}>
              {l === "all" ? "All lineages" : l}
            </option>
          ))}
        </select>
        {selected && (
          <button type="button" className="filter" onClick={() => setSelected(null)}>
            Clear selection
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort("protocol_slot")}>Slot</th>
              <th onClick={() => toggleSort("line")}>Line</th>
              <th onClick={() => toggleSort("lineage")}>Lineage</th>
              <th className="num" onClick={() => toggleSort("slc16a1")}>MCT1</th>
              <th className="num" onClick={() => toggleSort("slc16a3")}>MCT4</th>
              <th className="num" onClick={() => toggleSort("slc16a1_dep")}>MCT1 dep</th>
              <th className="num">SMCT1</th>
              <th className="num" onClick={() => toggleSort("ffar2")}>FFAR2</th>
              <th className="num" onClick={() => toggleSort("auc_vorinostat")}>Vor. AUC</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.line}
                ref={(el) => {
                  rowRefs.current[r.line] = el;
                }}
                className={[
                  r.ebv_caveat ? "ebv" : "",
                  r.protocol_slot ? "protocol" : "",
                  r.crispr_available && !r.mct1_dependent ? "dep-null" : "",
                  selected === r.line ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                onClick={() => selectLine(r.line)}
              >
                <td>{r.protocol_slot ?? "—"}</td>
                <td>
                  <i className="dot" style={{ background: lineageColor(r.lineage) }} />
                  {prettyLine(r.line)}
                </td>
                <td>{r.lineage}</td>
                <td className="num">{fmt(r.slc16a1, 1)}</td>
                <td className="num">{fmt(r.slc16a3, 1)}</td>
                <td className="num">{fmt(r.slc16a1_dep)}</td>
                <td className="num muted">floor</td>
                <td className="num">{fmt(r.ffar2, 2)}</td>
                <td className="num">{fmt(r.auc_vorinostat)}</td>
                <td>
                  {r.mct1_dependent && <span className="pill">MCT1-dep</span>}
                  {r.crispr_available && !r.mct1_dependent && <span className="pill">dep-null</span>}
                  {!r.crispr_available && <span className="pill">no CRISPR</span>}
                  {r.line === "P31FUJ" && <span className="pill">receptor only</span>}
                  {r.cmp_lps_competent && <span className="pill">LPS</span>}
                  {r.cmp_hdaci_sensitive && <span className="pill">HDACi-sens</span>}
                  {r.ebv_caveat && <span className="pill">EBV</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="source">
        Showing {filtered.length} of {rows.length} lines.{" "}
        {source === "supabase" ? "Supabase leukemia_model_lines" : "bundled CCLE fallback"}.
        MCT1 / MCT4 = CCLE 2025 TPM. SMCT1 = floor. Chronos = DepMap 24Q4. DND-41 has no 24Q4
        row.
      </p>
    </div>
  );
}
