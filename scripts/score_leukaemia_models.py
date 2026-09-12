"""Score leukaemia lines on SCFA / HDAC / microbial-metabolite axes.

Uses the locked CCLE 2025 TPM panel already on disk and CCLE 2019 AUC
for vorinostat / entinostat / belinostat. CMP flags are the published
picks from the Cell Model Passports dashboard (artifact 9c5560ad).
"""
from pathlib import Path

import numpy as np
import pandas as pd

AHMED = Path(__file__).resolve().parents[2]
TABLES = AHMED / "Cell_line_public_results" / "02_Analysis" / "tables"
DRUG = (
    AHMED
    / "Cell_line_public_results"
    / "01_Data"
    / "ccle_cbioportal"
    / "leukemia_cohort"
    / "drug_auc_2019_selected.csv"
)
OUT = Path(__file__).resolve().parents[1] / "tables"
OUT.mkdir(parents=True, exist_ok=True)


def clean(name: str) -> str:
    s = str(name)
    s = s.replace("_HAEMATOPOIETIC_AND_LYMPHOID_TISSUE", "")
    s = s.replace("_HAEMATOPOIETIC_AND_LYMPHOID", "")
    return s.replace("_", "-")


def zmean(df: pd.DataFrame, cols: list[str]) -> pd.Series:
    z = pd.DataFrame({g: np.log2(df[g] + 1) for g in cols})
    z = (z - z.mean()) / z.std(ddof=0)
    return z.mean(axis=1)


def flag_set(line: str, names: set[str]) -> bool:
    n = line.replace("-", "").upper()
    for nm in names:
        m = nm.replace("-", "").upper()
        if n == m or n.startswith(m) or m.startswith(n):
            return True
    return False


def main() -> None:
    df = pd.read_csv(TABLES / "leukemia_expression_panel_wide_tpm.csv")
    df["line"] = df["cell_line"].map(clean)

    sense = ["FFAR2", "FFAR3", "HCAR2", "HCAR3", "FFAR1", "FFAR4"]
    transport = ["SLC16A1", "SLC16A3", "SLC5A8", "BSG", "EMB"]
    ox = [
        "ACADS",
        "ECHS1",
        "ACSS2",
        "ACSS1",
        "ACAT1",
        "HADHA",
        "HADHB",
        "ACADM",
        "SLC25A20",
    ]
    hdac = [f"HDAC{i}" for i in range(1, 12)]

    df["z_scfa_sense"] = zmean(df, sense)
    df["z_transport"] = zmean(df, transport)
    df["z_oxidation"] = zmean(df, ox)
    df["z_scfa_handle"] = (zmean(df, ["SLC16A1", "SLC5A8"]) + df["z_oxidation"]) / 2
    df["z_hdac_expr"] = zmean(df, hdac)
    df["FFAR2_detected"] = df["FFAR2"] > 1
    df["HCAR2_detected"] = df["HCAR2"] > 1
    df["SLC5A8_detected"] = df["SLC5A8"] > 1

    drug = pd.read_csv(DRUG)
    hem = drug[drug.sampleId.str.contains("HAEMATOPOIETIC|LYMPHOID", case=False, na=False)].copy()
    hem["line"] = hem.sampleId.map(clean)
    for name in ["Vorinostat", "Entinostat", "Belinostat"]:
        sub = hem[hem.stableId == name][["line", "value"]].drop_duplicates("line")
        sub.columns = ["line", f"AUC_{name}"]
        df = df.merge(sub, on="line", how="left")

    cmp_scfa = {"P31-FUJ", "PLB-985", "KY821", "JK-1", "MUTZ-3", "MONO-MAC-6", "CESS"}
    cmp_hdac_sens = {"SUP-B8", "NB4", "SIG-M5", "TALL-1", "RCH-ACV"}
    cmp_hdac_res = {"KG-1", "ME-1", "NOMO-1", "Mo-T"}
    cmp_lps = {
        "MONO-MAC-6",
        "THP-1",
        "MONO-MAC-1",
        "SIG-M5",
        "OCI-AML3",
        "MOLM-13",
        "HL-60",
    }
    cmp_redox = {"MUTZ-3", "JK-1", "TF-1", "SET2", "P31-FUJ"}
    cmp_ahr = {"EOL-1", "HNT-34", "NCO2", "THP-1", "MONO-MAC-6"}
    ebv = {"CESS", "JVM-3"}

    df["CMP_SCFA_pick"] = df.line.map(lambda s: flag_set(s, cmp_scfa))
    df["CMP_HDACi_sensitive"] = df.line.map(lambda s: flag_set(s, cmp_hdac_sens))
    df["CMP_HDACi_resistant"] = df.line.map(lambda s: flag_set(s, cmp_hdac_res))
    df["CMP_LPS_competent"] = df.line.map(lambda s: flag_set(s, cmp_lps))
    df["CMP_redox_pick"] = df.line.map(lambda s: flag_set(s, cmp_redox))
    df["CMP_AHR_bile_pick"] = df.line.map(lambda s: flag_set(s, cmp_ahr))
    df["EBV_caveat"] = df.line.map(lambda s: flag_set(s, ebv))

    recs = []
    for _, r in df.iterrows():
        tags = []
        if r.CMP_SCFA_pick or r.z_scfa_handle > 0.6:
            tags.append("SCFA transport/ox")
        if r.CMP_HDACi_sensitive or (
            pd.notna(r.AUC_Vorinostat) and r.AUC_Vorinostat < 0.42
        ):
            tags.append("HDACi-sensitive")
        if r.CMP_HDACi_resistant or (
            pd.notna(r.AUC_Vorinostat) and r.AUC_Vorinostat > 0.65
        ):
            tags.append("HDACi-resistant")
        if r.CMP_LPS_competent:
            tags.append("LPS/pathogen")
        if r.CMP_redox_pick or r.z_oxidation > 0.6:
            tags.append("oxidant handling")
        if r.CMP_AHR_bile_pick:
            tags.append("AHR/bile")
        if r.EBV_caveat:
            tags.append("EBV-exclude")
        recs.append("; ".join(tags))
    df["recommended_for"] = recs

    keep = [
        "line",
        "lineage",
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
        "SLC16A1",
        "SLC16A3",
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
        "FFAR2_detected",
        "SLC5A8_detected",
        "CMP_SCFA_pick",
        "CMP_HDACi_sensitive",
        "CMP_HDACi_resistant",
        "CMP_LPS_competent",
        "CMP_redox_pick",
        "CMP_AHR_bile_pick",
        "EBV_caveat",
        "recommended_for",
    ]
    out = df[keep].sort_values("z_scfa_handle", ascending=False)
    dest = OUT / "leukaemia_model_selector_scores.csv"
    out.to_csv(dest, index=False)
    print(f"wrote {len(out)} rows -> {dest}")


if __name__ == "__main__":
    main()
