import { useEffect, useMemo, useState } from "react";
import { loadLines } from "./lib/supabase";
import { QUESTIONS, fmt, matchesQuestion, prettyLine } from "./lib/display";
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "z_scfa_handle",
    dir: "desc",
  });

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
          (r.recommended_for ?? "").toLowerCase().includes(qlc)
        );
      })
      .sort((a, b) => {
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

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  }

  const lineages = ["all", ...Array.from(new Set(rows.map((r) => r.lineage))).sort()];

  return (
    <div className="app">
      <div className="kicker">CSRG-25-14 · Cell Model Passports + CCLE 2025 · live from Supabase</div>
      <h1>Leukaemia model selector</h1>
      <p className="lead">
        Which lines can sense, transport or oxidise microbial metabolites — and which actually
        respond to HDAC inhibitors. Pick the mechanism first. The receptors are almost never on.
      </p>

      <div className="stats">
        <div className="stat danger">
          <b>{pct(rows, (r) => r.ffar2_detected)}</b>
          <span>FFAR2 TPM &gt; 1 (CCLE)</span>
        </div>
        <div className="stat ok">
          <b>{pct(rows, (r) => (r.slc16a1 ?? 0) > 1)}</b>
          <span>SLC16A1 / MCT1 on</span>
        </div>
        <div className="stat warn">
          <b>{rows.filter((r) => r.cmp_lps_competent).length}</b>
          <span>CMP LPS-competent flags</span>
        </div>
        <div className="stat">
          <b>{rows.length}</b>
          <span>lines scored</span>
        </div>
      </div>

      <div className="banner">
        <strong>Write the experiment as MCT1 uptake plus intracellular HDAC inhibition.</strong>
        FFAR2/FFAR3/HCAR2 are floor in almost every line. P31-FUJ is the only usable FFAR2
        expresser. Exclude CESS and JVM-3 (EBV-LCL). SLC5A8 conflicts between CMP and CCLE —
        confirm SMCT1 by qPCR before claiming it.
      </div>

      <h2>Order if starting from scratch</h2>
      <table className="slots">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Line</th>
            <th>Primary job</th>
            <th>Do not use it for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>HL-60</td>
            <td>HDACi-sensitive myeloid uptake + LPS</td>
            <td>Receptor signalling</td>
          </tr>
          <tr>
            <td>B</td>
            <td>THP-1</td>
            <td>LPS / AHR; HDACi-resistant myeloid</td>
            <td>Calling it HDACi-sensitive</td>
          </tr>
          <tr>
            <td>C</td>
            <td>Jurkat</td>
            <td>Lymphoid negative; MCT4-low</td>
            <td>SCFA sensing or LPS</td>
          </tr>
          <tr>
            <td>D</td>
            <td>MUTZ-3 or P31-FUJ</td>
            <td>SCFA transport + oxidation</td>
            <td>Assuming HDACi-sensitive</td>
          </tr>
          <tr>
            <td>E</td>
            <td>NB4 or RCH-ACV</td>
            <td>Independent HDACi-sensitive</td>
            <td>SCFA receptors</td>
          </tr>
          <tr>
            <td>F</td>
            <td>REH or NALM-6</td>
            <td>B-ALL MCT1-high / MCT4-low</td>
            <td>Oxidation or LPS</td>
          </tr>
        </tbody>
      </table>

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
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort("line")}>Line</th>
              <th onClick={() => toggleSort("lineage")}>Lineage</th>
              <th className="num" onClick={() => toggleSort("z_scfa_handle")}>Handle z</th>
              <th className="num" onClick={() => toggleSort("z_oxidation")}>Ox z</th>
              <th className="num" onClick={() => toggleSort("slc16a1")}>MCT1</th>
              <th className="num" onClick={() => toggleSort("slc16a3")}>MCT4</th>
              <th className="num" onClick={() => toggleSort("slc5a8")}>SMCT1</th>
              <th className="num" onClick={() => toggleSort("ffar2")}>FFAR2</th>
              <th className="num" onClick={() => toggleSort("auc_vorinostat")}>Vor. AUC</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.line} className={r.ebv_caveat ? "ebv" : undefined}>
                <td>{prettyLine(r.line)}</td>
                <td>{r.lineage}</td>
                <td className="num">{fmt(r.z_scfa_handle)}</td>
                <td className="num">{fmt(r.z_oxidation)}</td>
                <td className="num">{fmt(r.slc16a1, 1)}</td>
                <td className="num">{fmt(r.slc16a3, 1)}</td>
                <td className="num">{fmt(r.slc5a8, 2)}</td>
                <td className="num">{fmt(r.ffar2, 2)}</td>
                <td className="num">{fmt(r.auc_vorinostat)}</td>
                <td>
                  {r.cmp_lps_competent && <span className="pill">LPS</span>}
                  {r.cmp_scfa_pick && <span className="pill">SCFA</span>}
                  {r.cmp_hdaci_sensitive && <span className="pill">HDACi-sens</span>}
                  {r.cmp_hdaci_resistant && <span className="pill">HDACi-res</span>}
                  {r.cmp_redox_pick && <span className="pill">redox</span>}
                  {r.cmp_ahr_bile_pick && <span className="pill">AHR</span>}
                  {r.ebv_caveat && <span className="pill">EBV</span>}
                  {r.recommended_for && !r.cmp_lps_competent && !r.cmp_scfa_pick && (
                    <span className="pill">{r.recommended_for}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="source">
        Showing {filtered.length} of {rows.length} lines. Data source: {source === "supabase" ? "Supabase leukemia_model_lines" : "bundled CCLE fallback"}.
        Expression is log2(TPM+1) z-scored within the CCLE 2025 matrix. Vorinostat AUC is CCLE 2019 (low = sensitive).
        CMP flags are the Cell Model Passports dashboard picks.
      </p>
    </div>
  );
}
