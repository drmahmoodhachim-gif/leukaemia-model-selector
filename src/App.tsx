import { useEffect, useMemo, useState } from "react";
import { loadLines } from "./lib/supabase";
import { QUESTIONS, fmt, matchesQuestion, prettyLine } from "./lib/display";
import type { LeukemiaLine, Question } from "./lib/types";

type SortKey = keyof LeukemiaLine;

function pct(rows: LeukemiaLine[], pred: (r: LeukemiaLine) => boolean): string {
  if (!rows.length) return "0%";
  return `${((rows.filter(pred).length / rows.length) * 100).toFixed(1)}%`;
}

const SLOTS: { slot: string; line: string; job: string; avoid: string }[] = [
  { slot: "A", line: "KASUMI-1", job: "AML axis contrast", avoid: "Calling it MCT1-essential (Chronos −0.24)" },
  { slot: "B", line: "OCI-AML3", job: "AML axis contrast; MCT4-high", avoid: "The B-ALL uptake claim" },
  { slot: "C", line: "NALM-6", job: "B-ALL MCT1-dependent (Chronos −1.07)", avoid: "Oxidation or LPS" },
  { slot: "D", line: "SEM", job: "B-ALL weak MCT1 dependency", avoid: "Treating it as the strong B-ALL arm" },
  { slot: "E", line: "DND-41", job: "T-ALL dependent (26Q1; not in 24Q4 Chronos)", avoid: "Assuming 24Q4 coverage" },
  { slot: "F", line: "Jurkat", job: "T-ALL dependency-null contrast", avoid: "Causal MCT1 uptake or LPS" },
  { slot: "G", line: "K-562", job: "Method development: MCT1 151 / MCT4 3.3 / Chronos −0.95", avoid: "Paediatric ALL biology" },
  { slot: "H", line: "RCH-ACV", job: "B-ALL dependent + vorinostat-sensitive (AUC 0.36)", avoid: "Receptor signalling" },
];

export default function App() {
  const [rows, setRows] = useState<LeukemiaLine[]>([]);
  const [source, setSource] = useState<"supabase" | "bundled">("bundled");
  const [q, setQ] = useState<Question>("protocol");
  const [lineage, setLineage] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "slc16a1_dep",
    dir: "asc",
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
      <div className="kicker">CSRG-25-14 · CCLE 2025 expression · DepMap 24Q4 Chronos · live from Supabase</div>
      <h1>Leukaemia model selector</h1>
      <p className="lead">
        Pick lines for an MCT1-uptake experiment, not for receptor signalling. MCT1 and MCT4
        in this matrix match DepMap. SMCT1 does not — that column is discarded. The causal arm
        is CRISPR gene effect, not expression rank.
      </p>

      <div className="stats">
        <div className="stat danger">
          <b>{pct(rows, (r) => r.ffar2_detected)}</b>
          <span>FFAR2 TPM &gt; 1 in lines</span>
        </div>
        <div className="stat ok">
          <b>{pct(rows, (r) => (r.slc16a1 ?? 0) > 1)}</b>
          <span>SLC16A1 / MCT1 on</span>
        </div>
        <div className="stat warn">
          <b>{depN}</b>
          <span>MCT1 Chronos &lt; −0.5</span>
        </div>
        <div className="stat">
          <b>
            {crisprN}/{rows.length || "—"}
          </b>
          <span>lines with CRISPR</span>
        </div>
      </div>

      <div className="banner">
        <strong>Butyrate entry is MCT-mediated because SMCT1 is off.</strong>
        The old SMCT1 column (MUTZ-3 44 TPM, MONO-MAC-1 42, NOMO-1 26, HL-60 14) was the
        cBioPortal CCLE 2025 assignment. Same extract, same Entrez 160728 — MCT1 and MCT4
        match DepMap to the decimal; SLC5A8 does not. DepMap 26Q1 max in leukaemia is 0.010
        TPM. TARGET blasts are floor. Do not qPCR that tail as if it were a CMP conflict.
      </div>
      <div className="banner info">
        <strong>Receptors are off in lines and on in patients.</strong>
        FFAR2/FFAR3/HCAR2 are floor in this matrix. P31-FUJ is the only usable FFAR2 line
        (7.65 TPM) — receptor arm only; it is an oxidiser and not MCT1-dependent. In TARGET
        AML, HCAR2 is above 1 TPM in about 93% of blasts. That is the v5.0 correction, not a
        reason to treat lines as receptor models.
      </div>
      <div className="banner">
        <strong>Do not pick a panel on expression alone.</strong>
        HL-60, MUTZ-3 and MONO-MAC-6 have no CRISPR gene effect. THP-1 and Jurkat are
        dependency-null. LOUCY and SUP-T11 are the only lymphoid oxidisers and have no
        CRISPR — expression contrast only. A pretty A–F list of those lines cannot show the
        effect the causal arm tests.
      </div>

      <h2>Protocol v5.0 — eight lines with a dependency score</h2>
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
          {SLOTS.map((s) => (
            <tr key={s.slot}>
              <td>{s.slot}</td>
              <td>{s.line}</td>
              <td>{s.job}</td>
              <td>{s.avoid}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="source" style={{ marginTop: 8 }}>
        Keep the six-line core (KASUMI-1 / OCI-AML3, NALM-6 / SEM, DND-41 / Jurkat). Add K-562
        for the Belfast histone prep and RCH-ACV to the B-ALL arm. P31-FUJ is extra, receptor
        only.
      </p>

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
              <th onClick={() => toggleSort("protocol_slot")}>Slot</th>
              <th onClick={() => toggleSort("line")}>Line</th>
              <th onClick={() => toggleSort("lineage")}>Lineage</th>
              <th className="num" onClick={() => toggleSort("slc16a1")}>MCT1</th>
              <th className="num" onClick={() => toggleSort("slc16a3")}>MCT4</th>
              <th className="num" onClick={() => toggleSort("slc16a1_dep")}>MCT1 dep</th>
              <th className="num" onClick={() => toggleSort("slc5a8")}>SMCT1</th>
              <th className="num" onClick={() => toggleSort("ffar2")}>FFAR2</th>
              <th className="num" onClick={() => toggleSort("auc_vorinostat")}>Vor. AUC</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.line}
                className={[
                  r.ebv_caveat ? "ebv" : "",
                  r.protocol_slot ? "protocol" : "",
                  r.crispr_available && !r.mct1_dependent ? "dep-null" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
              >
                <td>{r.protocol_slot ?? "—"}</td>
                <td>{prettyLine(r.line)}</td>
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
                  {r.cmp_hdaci_resistant && <span className="pill">HDACi-res</span>}
                  {r.ebv_caveat && <span className="pill">EBV</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="source">
        Showing {filtered.length} of {rows.length} lines. Data source:{" "}
        {source === "supabase" ? "Supabase leukemia_model_lines" : "bundled CCLE fallback"}.
        MCT1 / MCT4 are CCLE 2025 TPM and match DepMap. SMCT1 is shown as floor (DepMap 26Q1
        + TARGET); the discarded cBioPortal tail is in <code>slc5a8_ccle2025</code>, not used
        for ranking. MCT1 dep is DepMap 24Q4 Chronos (more negative = more dependent; −0.5
        threshold). DND-41 is in the protocol panel from 26Q1 and has no 24Q4 Chronos row.
        Vorinostat AUC is CCLE 2019 (low = sensitive).
      </p>
    </div>
  );
}
