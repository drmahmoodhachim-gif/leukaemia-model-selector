"""Write a JSON fallback and a SQL upsert for leukemia_model_lines."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "tables" / "leukaemia_model_selector_scores.csv"
OUT_SQL = ROOT / "supabase" / "seed_leukemia_model_lines.sql"
OUT_JSON = ROOT / "src" / "data" / "lines.json"

BOOLS = [
    "FFAR2_detected",
    "SLC5A8_detected",
    "crispr_available",
    "mct1_dependent",
    "CMP_SCFA_pick",
    "CMP_HDACi_sensitive",
    "CMP_HDACi_resistant",
    "CMP_LPS_competent",
    "CMP_redox_pick",
    "CMP_AHR_bile_pick",
    "EBV_caveat",
]

NUMS = [
    "z_scfa_handle",
    "z_scfa_sense",
    "z_transport",
    "z_oxidation",
    "z_hdac_expr",
    "FFAR2",
    "FFAR3",
    "HCAR2",
    "HCAR3",
    "SLC5A8",
    "slc5a8_ccle2025",
    "SLC16A1",
    "SLC16A3",
    "SLC16A1_dep",
    "BSG",
    "ACADS",
    "ECHS1",
    "ACSS2",
    "HDAC1",
    "HDAC3",
    "HDAC6",
    "AUC_Vorinostat",
    "AUC_Entinostat",
    "AUC_Belinostat",
]

COLMAP = {
    "line": "line",
    "lineage": "lineage",
    "z_scfa_handle": "z_scfa_handle",
    "z_scfa_sense": "z_scfa_sense",
    "z_transport": "z_transport",
    "z_oxidation": "z_oxidation",
    "z_hdac_expr": "z_hdac_expr",
    "FFAR2": "ffar2",
    "FFAR3": "ffar3",
    "HCAR2": "hcar2",
    "HCAR3": "hcar3",
    "SLC5A8": "slc5a8",
    "slc5a8_ccle2025": "slc5a8_ccle2025",
    "SLC16A1": "slc16a1",
    "SLC16A3": "slc16a3",
    "SLC16A1_dep": "slc16a1_dep",
    "BSG": "bsg",
    "ACADS": "acads",
    "ECHS1": "echs1",
    "ACSS2": "acss2",
    "HDAC1": "hdac1",
    "HDAC3": "hdac3",
    "HDAC6": "hdac6",
    "AUC_Vorinostat": "auc_vorinostat",
    "AUC_Entinostat": "auc_entinostat",
    "AUC_Belinostat": "auc_belinostat",
    "FFAR2_detected": "ffar2_detected",
    "SLC5A8_detected": "slc5a8_detected",
    "crispr_available": "crispr_available",
    "mct1_dependent": "mct1_dependent",
    "protocol_slot": "protocol_slot",
    "CMP_SCFA_pick": "cmp_scfa_pick",
    "CMP_HDACi_sensitive": "cmp_hdaci_sensitive",
    "CMP_HDACi_resistant": "cmp_hdaci_resistant",
    "CMP_LPS_competent": "cmp_lps_competent",
    "CMP_redox_pick": "cmp_redox_pick",
    "CMP_AHR_bile_pick": "cmp_ahr_bile_pick",
    "EBV_caveat": "ebv_caveat",
    "recommended_for": "recommended_for",
}


def sql_lit(value) -> str:
    if pd.isna(value):
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(float(value)) if isinstance(value, float) else str(int(value))
    return "'" + str(value).replace("'", "''") + "'"


def main() -> None:
    df = pd.read_csv(CSV)
    for col in BOOLS:
        df[col] = df[col].fillna(False).astype(bool)
    records = []
    rows_sql = []
    cols = list(COLMAP)
    db_cols = [COLMAP[c] for c in cols]
    for rec in df.to_dict(orient="records"):
        out = {}
        for src, dest in COLMAP.items():
            val = rec[src]
            if pd.isna(val):
                out[dest] = None
            elif src in BOOLS:
                out[dest] = bool(val)
            elif src in NUMS:
                out[dest] = float(val)
            else:
                out[dest] = val
        records.append(out)
        values = ", ".join(sql_lit(rec[c]) for c in cols)
        rows_sql.append(f"({values})")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(records, indent=2), encoding="utf-8")

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    sql = (
        "insert into public.leukemia_model_lines (\n  "
        + ",\n  ".join(db_cols)
        + "\n) values\n"
        + ",\n".join(rows_sql)
        + "\non conflict (line) do update set\n  "
        + ",\n  ".join(
            f"{c} = excluded.{c}" for c in db_cols if c != "line"
        )
        + ";\n"
    )
    OUT_SQL.write_text(sql, encoding="utf-8")
    print(f"wrote {len(records)} rows -> {OUT_JSON}")
    print(f"wrote SQL -> {OUT_SQL}")


if __name__ == "__main__":
    main()
