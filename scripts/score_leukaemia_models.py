"""Score leukaemia lines on SCFA / HDAC / microbial-metabolite axes.

Expression: locked CCLE 2025 TPM panel on disk.
HDACi: CCLE 2019 AUC for vorinostat / entinostat / belinostat.
Dependency: DepMap 24Q4 Chronos (SLC16A1).
CMP flags: published picks from the Cell Model Passports dashboard.

SLC5A8 / SMCT1: the cBioPortal CCLE 2025 column is discarded. MCT1 and MCT4
in that extract match DepMap; SLC5A8 does not (MUTZ-3 44 TPM vs DepMap 26Q1
max 0.010 TPM across leukaemia). TARGET blasts are also floor. Transport
z-scores therefore use MCT1 / MCT4 / BSG / EMB only. The discarded CCLE
values are stored as slc5a8_ccle2025 for audit, not for ranking.
"""
from pathlib import Path

import numpy as np
import pandas as pd

AHMED = Path(__file__).resolve().parents[2]
TABLES = AHMED / "Cell_line_public_results" / "02_Analysis" / "tables"
DEPMAP = AHMED / "Cell_line_public_results" / "01_Data" / "depmap_24q4"
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

# Protocol v5.0 causal core + two additions from the selector review.
PROTOCOL = {
    "KASUMI1": ("A", "AML axis contrast (pair with OCI-AML3)"),
    "OCIAML3": ("B", "AML axis contrast (pair with KASUMI-1)"),
    "NALM6": ("C", "B-ALL MCT1-dependent"),
    "SEM": ("D", "B-ALL weak MCT1 dependency"),
    "DND41": ("E", "T-ALL MCT1-dependent"),
    "JURKAT": ("F", "T-ALL dependency-null contrast"),
    "K562": ("G", "Method development: extreme MCT1 accumulator"),
    "RCHACV": ("H", "B-ALL dependent + vorinostat-sensitive"),
}
RECEPTOR_ONLY = {"P31FUJ"}
NO_CRISPR_EXCLUDE_CAUSAL = {"HL60", "MUTZ3", "MONOMAC6", "LOUCY", "SUPT11"}


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
    transport = ["SLC16A1", "SLC16A3", "BSG", "EMB"]
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

    df["slc5a8_ccle2025"] = df["SLC5A8"]
    # DepMap 26Q1 + TARGET: gene is off in leukaemia. Do not rank on the
    # cBioPortal myeloid tail.
    df["SLC5A8"] = 0.0

    df["z_scfa_sense"] = zmean(df, sense)
    df["z_transport"] = zmean(df, transport)
    df["z_oxidation"] = zmean(df, ox)
    df["z_scfa_handle"] = (zmean(df, ["SLC16A1"]) + df["z_oxidation"]) / 2
    df["z_hdac_expr"] = zmean(df, hdac)
    df["FFAR2_detected"] = df["FFAR2"] > 1
    df["HCAR2_detected"] = df["HCAR2"] > 1
    df["SLC5A8_detected"] = False

    drug = pd.read_csv(DRUG)
    hem = drug[drug.sampleId.str.contains("HAEMATOPOIETIC|LYMPHOID", case=False, na=False)].copy()
    hem["line"] = hem.sampleId.map(clean)
    for name in ["Vorinostat", "Entinostat", "Belinostat"]:
        sub = hem[hem.stableId == name][["line", "value"]].drop_duplicates("line")
        sub.columns = ["line", f"AUC_{name}"]
        df = df.merge(sub, on="line", how="left")

    models = pd.read_csv(DEPMAP / "Model_leukemia.csv")
    crispr = pd.read_csv(DEPMAP / "CRISPRGeneEffect_panel_leukemia.csv")
    dep = models[["ModelID", "StrippedCellLineName"]].merge(crispr, on="ModelID", how="inner")
    dep["line"] = dep["StrippedCellLineName"].astype(str)
    dep = dep[["line", "SLC16A1"]].drop_duplicates("line")
    dep.columns = ["line", "SLC16A1_dep"]
    df = df.merge(dep, on="line", how="left")
    df["crispr_available"] = df["SLC16A1_dep"].notna()
    df["mct1_dependent"] = df["SLC16A1_dep"] < -0.5

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

    slots, recs = [], []
    for _, r in df.iterrows():
        slot, role = PROTOCOL.get(r.line, (None, None))
        slots.append(slot)
        tags = []
        if r.line in RECEPTOR_ONLY:
            tags.append("receptor arm only — not transport")
        if role:
            tags.append(role)
        if r.line in NO_CRISPR_EXCLUDE_CAUSAL:
            tags.append("no CRISPR — expression only")
        if r.crispr_available and r.mct1_dependent:
            tags.append("MCT1-dependent")
        elif r.crispr_available and pd.notna(r.SLC16A1_dep) and r.SLC16A1_dep > -0.15:
            tags.append("MCT1-null")
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
    df["protocol_slot"] = slots
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
        "FFAR2_detected",
        "SLC5A8_detected",
        "crispr_available",
        "mct1_dependent",
        "protocol_slot",
        "CMP_SCFA_pick",
        "CMP_HDACi_sensitive",
        "CMP_HDACi_resistant",
        "CMP_LPS_competent",
        "CMP_redox_pick",
        "CMP_AHR_bile_pick",
        "EBV_caveat",
        "recommended_for",
    ]
    out = df[keep].sort_values(
        ["protocol_slot", "SLC16A1_dep", "z_scfa_handle"],
        ascending=[True, True, False],
        na_position="last",
    )
    dest = OUT / "leukaemia_model_selector_scores.csv"
    out.to_csv(dest, index=False)
    print(f"wrote {len(out)} rows -> {dest}")
    print("SLC5A8_ccle2025 max", float(df.slc5a8_ccle2025.max()))
    print("CRISPR coverage", int(df.crispr_available.sum()), "/", len(df))
    show = df[df.line.isin(list(PROTOCOL) + list(RECEPTOR_ONLY))][
        ["line", "SLC16A1", "SLC16A3", "SLC16A1_dep", "FFAR2", "protocol_slot"]
    ]
    print(show.to_string(index=False))


if __name__ == "__main__":
    main()
