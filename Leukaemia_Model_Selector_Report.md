# Leukaemia model selector — which lines can sense, transport and oxidise microbial metabolites, and which respond to HDACi

**Programme CSRG-25-14** · Model-choice note for the thesis bench panel  
**Sources triangulated 13 September 2026**

1. [Sanger Cell Model Passports dashboard](https://claude.ai/code/artifact/9c5560ad-be43-43cb-be40-4d29991327a4) (CMP data release 2.20.0): 172 leukaemia models; **139** scored on **169** genes; **85** with GDSC dose–response for vorinostat, entinostat, romidepsin and PCI-34051 (302 fitted curves). Expression treated as log2(TPM+1) and **z-scored within quantification batch** (the API serves raw TPM and log2 on different scales; naive merge mixes ~470-fold artefacts).
2. Local locked panel already on disk: **CCLE 2025** RNA-seq, **115** leukaemia lines (AML 53, B-ALL 25, T-ALL 18, MPN 17, ALAL 2), 53-gene CSRG panel. Ranked in `Thesis/tables/leukaemia_model_selector_scores.csv`.
3. **CCLE 2019** drug AUC (cBioPortal) for vorinostat / entinostat / belinostat, used as an independent HDACi check of the GDSC ranking.

The browse view of the artifact lists names only. The numbers below are from the dashboard summary plus a re-score of the CCLE files in `Cell_line_public_results/`. Claude’s workbook was not sitting in this folder (the download lives behind the signed-in artifact), so the spreadsheet here is the CCLE re-score with the CMP picks flagged.

---

## 1. The result that should shape the experiment before any line is picked

**Leukaemia lines almost never express the surface receptors that sense short-chain fatty acids.** What they do have is the importer.

| Gene | Role | CMP (139 lines) | CCLE 2025 (115 lines, TPM > 1) |
|---|---|---|---|
| FFAR2 (GPR43) | SCFA receptor | 13% detectable | 3/115 (2.6%); only **P31-FUJ** is real (TPM 7.65). OCI-AML4 and U937 sit just above 1. |
| FFAR3 (GPR41) | SCFA receptor | 1% | 2/115 (P31-FUJ, MO91) |
| HCAR2 (GPR109A) | butyrate / niacin receptor | 7% | **1/115** (BDCM, TPM 1.35) |
| SLC5A8 (SMCT1) | Na+-coupled butyrate transporter | **< 1%** | **20/115 (17%)**, almost all myeloid; median still ~0.06 TPM. See §6. |
| SLC16A1 (MCT1) | H+-coupled monocarboxylate importer | **100%** | **115/115**, median TPM 60.5 |
| TLR4 + CD14 + LY96 | minimum LPS holoreceptor | **17 / 139** | not on the locked 53-gene panel |

So a butyrate or propionate experiment in these models reports **intracellular HDAC inhibition after MCT1 uptake**, not FFAR2 / FFAR3 / HCAR2 signalling. If the scientific question is receptor biology, these lines need reconstitution or a different system (primary monocytes, engineered reporter). Related: only 17 of 139 CMP lines co-express TLR4 + CD14 + LY96, the minimum for a canonical LPS response. Most “leukaemia + LPS” papers are therefore using a small monocytic subset, not the disease as a whole.

Leukaemia as a group sits about **+1.0 z** more sensitive to HDAC inhibitors than the average GDSC cancer line. Across the 84 CMP lines with drug data, only **TP53 (ρ = 0.36, p = 0.0008)** and **HDAC1 (ρ = 0.34, p = 0.001)** expression track measured HDACi sensitivity. HDAC6, RAD23B and ABC efflux do not. That matches the earlier four-screen CSRG note: baseline HDAC transcript is a weak predictor; **use measured IC50/AUC, not HDAC1–11 expression, to pick sensitive versus resistant contrasts**.

---

## 2. What each experimental question is actually asking

Four axes were requested. They are not interchangeable. A line that is good for one is often wrong for another.

| Axis | What “equipped” means | What a positive result would mean | What it does **not** mean |
|---|---|---|---|
| **SCFA sense** | FFAR2 / FFAR3 / HCAR2 protein | GPCR signalling (Gi/Gq, NLRP3, neutrophil chemotaxis) | HDAC inhibition |
| **SCFA transport** | SLC16A1 (universal) ± SLC5A8 | metabolite gets in | receptor occupancy |
| **SCFA oxidation** | ACADS, ECHS1, ACSM/ACSS2, HADH | butyrate/propionate is fuel, not only a drug | epigenetic effect |
| **HDACi response** | measured GDSC / CCLE AUC | the cell dies or arrests when HDACs are blocked | that butyrate will do the same at marrow-realistic µM |
| **Pathogen products** | TLR4/CD14/LY96, NOD1/2, TLR2 | LPS / peptidoglycan signalling | SCFA handling |
| **Redox** | NFE2L2, HMOX1, SOD2, CAT, GPX | the line can buffer ROS from microbial oxidants | SCFA uptake |
| **Tryptophan / bile** | AHR, CYP1B1, GPBAR1, NR1H4 | indoles and bile acids are ligands, not just toxins | butyrate |

**Practical rule:** pick the line for the *mechanism you will claim*, then add one contrast line that lacks that machinery.

---

## 3. Recommended panel by question

Picks below combine CMP ranks (169-gene / GDSC) with the CCLE re-score. **Exclude CESS and JVM-3** from any leukaemic-blast claim: Cellosaurus records CESS (CVCL_0209) as an EBV-transformed B-lymphoblastoid line from an AML patient; JVM-3 is likewise EBV-positive. Their high FFAR2 / SLC5A8 / innate-immune signal is LCL biology.

### 3.1 SCFA transport and β-oxidation  
*Question: can the line take up butyrate/propionate and burn it?*

| Priority | Line | Lineage | Why | Watch |
|---|---|---|---|---|
| 1 | **MUTZ-3** | AML (dendritic / myeloid) | Highest CCLE SCFA-handling z (1.13). SLC5A8 TPM **44** — the strongest SMCT1 call in the 115-line set. CMP redox pick. | Needs cytokine support; confirm identity. No CCLE vorinostat AUC in this extract. |
| 2 | **P31-FUJ** | AML | Only line with **usable FFAR2** (TPM 7.65) plus FFAR3 (1.12) and SLC5A8 (24.8). CMP SCFA + redox pick. | Vorinostat AUC 0.64 — not an HDACi-sensitive contrast. |
| 3 | **MONO-MAC-1** | AML (monocytic) | SLC5A8 TPM 42; oxidation z 0.72; CMP LPS-competent. | Pair with MONO-MAC-6, do not treat as replicates. |
| 4 | **MONO-MAC-6** | AML (monocytic) | CMP SCFA + LPS + AHR pick. MCT1 TPM 60, MCT4 TPM **294** (highest in the set). Vorinostat AUC 0.49. | MCT4-high: expect weaker MCT1 dependence. |
| 5 | **THP-1** | AML (monocytic) | Already on the bench. Transport z 1.26; LPS- and AHR-competent. | Vorinostat AUC **0.68** / entinostat 0.97 — HDACi-resistant relative to HL-60. |
| 6 | **PLB-985** | AML (HL-60 subline) | CMP SCFA pick (oxidation / neutrophil-like). | CCLE handling z is only −0.18; SLC5A8 0.66. Treat as an HL-60 derivative, not an independent AML. |
| — | KY821, JK-1 | myeloid | CMP-only (not in the 115-line CCLE extract). | Fetch before ordering. |

**Do not use lymphoid lines to test SCFA oxidation.** B-ALL and T-ALL are MCT1-high but MCT4-low, SLC5A8-absent, and oxidation-low (median z −0.08 and −0.25). They are the right models for *MCT1-dependent uptake without myeloid disposal*, not for burning butyrate.

### 3.2 HDAC-inhibitor response  
*Question: does the line die when class I/II HDACs are blocked?*  
Use **measured dose–response**, not HDAC transcript. T-ALL has the highest HDAC1–11 RNA (median z +0.52) and that is not the same as sensitivity.

**CMP (GDSC, ≥3 compounds):** sensitive — SUP-B8, **NB4**, SIG-M5, TALL-1, **RCH-ACV**. Resistant contrasts — KG-1, ME-1, **NOMO-1**, Mo-T.

**CCLE 2019 vorinostat AUC (low = sensitive), haematopoietic:**

| Line | Vorinostat AUC | Role |
|---|---|---|
| RCH-ACV | 0.36 | CMP sensitive — confirmed |
| NB4 | 0.39 | CMP sensitive — confirmed |
| **HL-60** | **0.40** | already on the bench; good sensitive AML |
| EoL-1 | 0.38 | also an AHR/bile CMP pick |
| MONO-MAC-6 | 0.49 | intermediate |
| NOMO-1 | 0.50 | CMP resistant contrast is milder in CCLE AUC |
| Jurkat | 0.57 | intermediate T-ALL |
| P31-FUJ | 0.64 | transport-high, HDACi-intermediate |
| **THP-1** | **0.68** | resistant contrast to HL-60 |
| CESS | 0.79 | resistant **and** EBV — do not use |

HL-60 versus THP-1 is a usable **same-lineage HDACi contrast** that you already have: both monocytic-myeloid, both MCT1/MCT4-high, both LPS-competent, different vorinostat AUC (0.40 vs 0.68) and different entinostat AUC (0.59 vs 0.97).

### 3.3 Pathogen products (LPS / peptidoglycan)

CMP LPS-competent set (TLR4 + CD14 + LY96): **MONO-MAC-6, THP-1, MONO-MAC-1, SIG-M5, OCI-AML3, MOLM-13, HL-60**.

That is the entire usable leukaemia list for a canonical LPS experiment. Lymphoid lines (Jurkat, REH, NALM-6, TALL-1) are the negative control, not a second LPS model.

### 3.4 Oxidant handling

CMP: MUTZ-3, JK-1, TF-1, Set-2, P31-FUJ.  
CCLE oxidation z agrees on **SET-2 (0.95), MONO-MAC-1 (0.72), P31-FUJ (0.65), TF-1 (0.64), MUTZ-3 (0.54)**.

### 3.5 Indole / AHR and bile-acid receptors

CMP: **EoL-1, HNT-34, NCO2, THP-1, MONO-MAC-6**.  
EoL-1 is also vorinostat-sensitive (AUC 0.38), so it can carry both an AHR and an HDACi question — do not collapse those two readouts into one claim.

---

## 4. What to do with the three lines already extracted

| Line | Keep for | Do not claim |
|---|---|---|
| **HL-60** | MCT1/MCT4-high myeloid uptake; LPS; HDACi-sensitive (vorinostat 0.40); SLC5A8 present in CCLE 2025 (TPM 14) | FFAR2/HCAR2 signalling (both floor). Not B-ALL. |
| **THP-1** | Monocytic LPS / AHR; high transport; KMT2A–MLLT3 genetics | HDACi-sensitive (it is relatively resistant). Receptor signalling. |
| **Jurkat** | T-ALL, MCT4-low, HDAC-transcript-high, lymphoid negative for LPS and SCFA receptors | Microbial-metabolite sensing. SCFA oxidation. A paediatric B-ALL surrogate. |

They are a coherent **uptake-plus-HDACi** starter set, not a sensing set. To add sensing you need either P31-FUJ (FFAR2) or an engineered receptor line. To add B-ALL uptake you need REH or NALM-6 (MCT1-high, MCT4-near-zero), not another AML.

Suggested first expansion, if only two new lines can be ordered:

1. **MUTZ-3** or **P31-FUJ** — SCFA transport / oxidation (and FFAR2 only if P31-FUJ).
2. **NB4** or **RCH-ACV** — HDACi-sensitive confirmation that is not HL-60.

---

## 5. Lineage pattern (CCLE 2025, n = 115)

Median TPM / z by OncoTree lineage:

| | AML (53) | B-ALL (25) | T-ALL (18) | MPN (17) |
|---|---|---|---|---|
| SLC16A1 (MCT1) | 45 | 69 | 63 | 89 |
| SLC16A3 (MCT4) | **80** | **3.1** | 14 | 22 |
| SLC5A8 | 0.18 (long myeloid tail) | 0.05 | 0.04 | 0.06 |
| SCFA-handling z | **+0.20** | −0.13 | −0.26 | −0.03 |
| Oxidation z | **+0.22** | −0.08 | −0.25 | +0.01 |
| HDAC-expression z | −0.05 | +0.04 | **+0.52** | −0.31 |

This is the same transporter phenotype already in the CSRG chapter: **B-ALL is MCT4-low and MCT1-dependent; AML is MCT4-high and equipped to dispose of monocarboxylates.** Microbial-metabolite *sensing* is not a lineage phenotype — it is near-absent in all of them.

---

## 6. Conflicts you must keep in the thesis, not bury

**SLC5A8 scale — resolved for this tool.** MCT1 and MCT4 in the cBioPortal CCLE 2025 extract match DepMap to the decimal. SLC5A8 does not: the same extract reports MUTZ-3 44 TPM, MONO-MAC-1 42, NOMO-1 26, HL-60 14, while DepMap 26Q1 has a leukaemia maximum of 0.010 TPM and TARGET blasts are floor. That is a bad column, not a CMP-versus-CCLE conflict and not a qPCR to-do. The selector now treats SMCT1 as absent, drops it from transport / handle z-scores, and stores the discarded tail as `slc5a8_ccle2025` only. Protocol v5.0 stands: butyrate entry in these lines is MCT-mediated.

**HCAR1.** CCLE 2025 reports HCAR1 in 115/115 lines (median TPM 35). That conflicts with DepMap 26Q1 (1/119). HCAR1/2/3 are homologous; **do not write that leukaemia lines express HCA1** until the DepMap gene page is checked. HCAR2 is floor in both releases.

**CESS rank.** The CMP dashboard ranks CESS first on several immune/SCFA scores. Cellosaurus CVCL_0209 = EBV-LCL. Treat any CESS-led ranking as a provenance error until proven otherwise.

**Two RNA-seq scales in the CMP API.** Raw TPM and log2 were not merged. Everything on the dashboard is within-batch z. The CCLE re-score here is a single matrix (TPM, then log2(TPM+1) z). Do not paste numbers from the two sources into one table without a unit label.

**Expression does not equal HDACi sensitivity.** HDAC1–11 RNA is highest in T-ALL. Measured vorinostat sensitivity is not. The CMP correlation (TP53, HDAC1) is real but modest; the CSRG four-screen analysis found **no HDAC-expression vs HDACi association that survived lineage correction**.

**Butyrate was never screened.** GDSC/CTRP/PRISM do not contain butyrate. HDACi IC50 is a *proxy* for the intracellular deacetylase axis, not a butyrate IC50 at marrow-realistic concentrations.

---

## 7. Decision rule for the protocol

Write the first experiment as three separate claims, each with its own line pair:

1. **Uptake / HDAC claim** — HL-60 (sensitive) vs THP-1 (resistant), both MCT1-positive, receptors off. Readout: histone acetylation, MCT1 dependency, vorinostat/butyrate dose.  
2. **Oxidation / disposal claim** — MUTZ-3 or P31-FUJ vs a B-ALL (REH or NALM-6). Readout: 13C-butyrate → TCA, ACSS2/ACADS, MCT4.  
3. **Pathogen-product claim** — THP-1 or MONO-MAC-6 vs Jurkat. Readout: LPS/PGN cytokines. Do not mix this with the butyrate claim in the same paragraph.

If a fourth claim is receptor signalling, **stop and engineer FFAR2/HCAR2** (or use P31-FUJ only as a rare-expressor pilot). Do not hunt for a “natural” FFAR2 leukaemia panel — it does not exist in these resources.

---

## 8. Files

| File | Content |
|---|---|
| `Thesis/tables/leukaemia_model_selector_scores.csv` | 115 CCLE lines, axis z-scores, TPM for key genes, vorinostat/entinostat/belinostat AUC, CMP pick flags |
| `Thesis/scripts/score_leukaemia_models.py` | Regenerates the CSV from `Cell_line_public_results/` |
| [Leukaemia Model Selector dashboard](https://claude.ai/code/artifact/9c5560ad-be43-43cb-be40-4d29991327a4) | CMP 139-line interactive rank (sortable by axis) |
| [Cell Model Passports](https://cellmodelpassports.sanger.ac.uk/) | Underlying RNA-seq and model metadata |
| [Cellosaurus CESS CVCL_0209](https://www.cellosaurus.org/CVCL_0209) | EBV-LCL provenance |

---

## 9. Protocol v5.0 pick list (dependency-aware)

HL-60, THP-1, MUTZ-3, MONO-MAC-6, LOUCY and SUP-T11 are off this list: no CRISPR, or dependency-null. They can still supply expression contrast. P31-FUJ is receptor-only.

| Slot | Line | Primary job | Avoid using it for |
|---|---|---|---|
| A | KASUMI-1 | AML axis contrast | Calling it MCT1-essential |
| B | OCI-AML3 | AML axis contrast; MCT4-high | The B-ALL uptake claim |
| C | NALM-6 | B-ALL MCT1-dependent | Oxidation or LPS |
| D | SEM | B-ALL weak MCT1 dependency | The strong B-ALL arm |
| E | DND-41 | T-ALL dependent (26Q1; absent from locked 24Q4 Chronos) | Assuming 24Q4 coverage |
| F | Jurkat | T-ALL dependency-null contrast | Causal MCT1 uptake or LPS |
| G | K-562 | Method development (MCT1 151 / MCT4 3.3 / Chronos −0.95) | Paediatric ALL biology |
| H | RCH-ACV | B-ALL dependent + vorinostat-sensitive (AUC 0.36) | Receptor signalling |
