import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "src" / "data" / "lines.json").read_text(encoding="utf-8"))
outdir = root / "supabase"
n = 30
for i in range(0, len(data), n):
    chunk = data[i : i + n]
    payload = json.dumps(chunk, separators=(",", ":")).replace("'", "''")
    cols = [
        "line",
        "lineage",
        "z_scfa_handle",
        "z_scfa_sense",
        "z_transport",
        "z_oxidation",
        "z_hdac_expr",
        "ffar2",
        "ffar3",
        "hcar2",
        "hcar3",
        "slc5a8",
        "slc16a1",
        "slc16a3",
        "bsg",
        "acads",
        "echs1",
        "acss2",
        "hdac1",
        "hdac3",
        "hdac6",
        "auc_vorinostat",
        "auc_entinostat",
        "auc_belinostat",
        "ffar2_detected",
        "slc5a8_detected",
        "cmp_scfa_pick",
        "cmp_hdaci_sensitive",
        "cmp_hdaci_resistant",
        "cmp_lps_competent",
        "cmp_redox_pick",
        "cmp_ahr_bile_pick",
        "ebv_caveat",
        "recommended_for",
    ]
    col_sql = ", ".join(cols)
    sql = (
        f"insert into public.leukemia_model_lines ({col_sql}) "
        f"select {col_sql} from json_populate_recordset("
        f"null::public.leukemia_model_lines, '{payload}');\n"
    )
    dest = outdir / f"seed_chunk_{i // n}.sql"
    dest.write_text(sql, encoding="utf-8")
    print(dest.name, len(sql), len(chunk))
