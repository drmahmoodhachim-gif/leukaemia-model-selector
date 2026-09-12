"""Bundle the locked RNA panel and CCLE 2019 proteomics for the selector."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

AHMED = Path(__file__).resolve().parents[2]
TABLES = AHMED / "Cell_line_public_results" / "02_Analysis" / "tables"
DATA = AHMED / "Cell_line_public_results" / "01_Data"
OUT = Path(__file__).resolve().parents[1] / "src" / "data"

SKIP_RNA = {"HCAR1", "SLC5A8"}  # untrusted assignments in CCLE 2025


def clean(name: str) -> str:
    s = str(name)
    s = s.replace("_HAEMATOPOIETIC_AND_LYMPHOID_TISSUE", "")
    s = s.replace("_HAEMATOPOIETIC_AND_LYMPHOID", "")
    return s.replace("_", "-")


def main() -> None:
    exp = pd.read_csv(TABLES / "leukemia_expression_panel_wide_tpm.csv")
    exp["line"] = exp["cell_line"].map(clean)
    gene_cols = [c for c in exp.columns if c not in {"sampleId", "cell_line", "lineage", "line"}]
    rna = {}
    for rec in exp.to_dict(orient="records"):
        rna[rec["line"]] = {
            g: None if pd.isna(rec[g]) else float(rec[g])
            for g in gene_cols
            if g not in SKIP_RNA
        }

    ent = pd.read_csv(DATA / "metadata" / "gene_entrez.csv")
    prot = pd.read_csv(DATA / "ccle_cbioportal" / "leukemia_cohort" / "proteomics_2019_panel.csv")
    prot = prot.merge(ent, left_on="entrezGeneId", right_on="entrez_gene_id", how="inner")
    haem = prot[prot.sampleId.str.contains("HAEMATOPOIETIC", na=False)].copy()
    haem["line"] = haem.sampleId.map(clean)
    leuk_lines = set(exp.line)
    haem = haem[haem.line.isin(leuk_lines)]
    protein: dict[str, dict[str, float]] = {}
    for rec in haem.to_dict(orient="records"):
        if pd.isna(rec["hugo_symbol"]) or pd.isna(rec["value"]):
            continue
        protein.setdefault(rec["line"], {})[rec["hugo_symbol"]] = float(rec["value"])

    OUT.mkdir(parents=True, exist_ok=True)
    payload = {
        "rna_genes": sorted({g for row in rna.values() for g in row}),
        "protein_genes": sorted({g for row in protein.values() for g in row}),
        "rna": rna,
        "protein": protein,
        "protein_lines": sorted(protein),
        "notes": {
            "rna": "CCLE 2025 TPM, 53-gene CSRG panel. HCAR1 and SLC5A8 omitted (untrusted).",
            "protein": "CCLE 2019 relative protein abundance, panel genes only. Not all lines were measured.",
        },
    }
    dest = OUT / "panel_matrices.json"
    dest.write_text(json.dumps(payload), encoding="utf-8")
    print(f"wrote {dest} rna_lines={len(rna)} protein_lines={len(protein)}")
    print("protein lines:", ", ".join(sorted(protein)))


if __name__ == "__main__":
    main()
