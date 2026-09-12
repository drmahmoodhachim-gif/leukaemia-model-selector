import { SLOTS, fmt, lineageColor, prettyLine } from "./lib/display";
import type { LeukemiaLine } from "./lib/types";

function Meter({
  label,
  value,
  max,
  invert,
  text,
}: {
  label: string;
  value: number | null;
  max: number;
  invert?: boolean;
  text: string;
}) {
  const raw = value ?? 0;
  const pct = Math.max(0, Math.min(100, (Math.abs(raw) / max) * 100));
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="meter-track">
        <i
          style={{
            width: `${pct}%`,
            background: invert ? "var(--accent)" : "var(--info)",
          }}
        />
      </div>
    </div>
  );
}

type Props = { row: LeukemiaLine | null };

export default function Inspector({ row }: Props) {
  if (!row) {
    return (
      <div className="inspector empty">
        <h2>Line inspector</h2>
        <p>Click a point, a protocol card, or a table row. The plot, cards and matrix stay in sync.</p>
      </div>
    );
  }
  const slot = SLOTS.find((s) => s.lineId === row.line);
  return (
    <div className="inspector">
      <div className="panel-head">
        <p className="kicker" style={{ color: lineageColor(row.lineage) }}>
          {row.lineage}
          {row.protocol_slot ? ` · slot ${row.protocol_slot}` : ""}
        </p>
        <h2>{prettyLine(row.line)}</h2>
      </div>
      <Meter label="MCT1 TPM" value={row.slc16a1} max={160} text={fmt(row.slc16a1, 1)} />
      <Meter label="MCT4 TPM" value={row.slc16a3} max={300} text={fmt(row.slc16a3, 1)} />
      <Meter
        label="MCT1 Chronos"
        value={row.slc16a1_dep}
        max={1.2}
        invert={(row.slc16a1_dep ?? 0) < -0.5}
        text={fmt(row.slc16a1_dep)}
      />
      <Meter
        label="Vorinostat AUC"
        value={row.auc_vorinostat}
        max={1}
        invert={(row.auc_vorinostat ?? 9) < 0.42}
        text={fmt(row.auc_vorinostat)}
      />
      <Meter label="FFAR2 TPM" value={row.ffar2} max={8} text={fmt(row.ffar2, 2)} />
      <div className="meter">
        <div className="meter-top">
          <span>SMCT1</span>
          <b>floor</b>
        </div>
        <div className="meter-track">
          <i style={{ width: "2%", background: "var(--rule)" }} />
        </div>
      </div>
      <div className="flag-row">
        {row.mct1_dependent && <span className="pill on">MCT1-dep</span>}
        {row.crispr_available && !row.mct1_dependent && <span className="pill">dep-null</span>}
        {!row.crispr_available && <span className="pill">no CRISPR</span>}
        {row.line === "P31FUJ" && <span className="pill on">receptor only</span>}
        {row.cmp_lps_competent && <span className="pill">LPS</span>}
        {row.cmp_hdaci_sensitive && <span className="pill">HDACi-sens</span>}
        {row.cmp_hdaci_resistant && <span className="pill">HDACi-res</span>}
        {row.ebv_caveat && <span className="pill">EBV</span>}
      </div>
      {slot && (
        <div className="why">
          <p>
            <strong>Use for.</strong> {slot.job}
          </p>
          <p>
            <strong>Do not use for.</strong> {slot.avoid}
          </p>
        </div>
      )}
      {row.recommended_for && <p className="source">{row.recommended_for}</p>}
    </div>
  );
}
