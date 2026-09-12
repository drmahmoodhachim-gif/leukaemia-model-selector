import type { LeukemiaLine, Question } from "./types";

const NAMES: Record<string, string> = {
  MUTZ3: "MUTZ-3",
  MONOMAC1: "MONO-MAC-1",
  MONOMAC6: "MONO-MAC-6",
  P31FUJ: "P31-FUJ",
  THP1: "THP-1",
  HL60: "HL-60",
  JURKAT: "Jurkat",
  PLB985: "PLB-985",
  NOMO1: "NOMO-1",
  SIGM5: "SIG-M5",
  OCIAML3: "OCI-AML3",
  MOLM13: "MOLM-13",
  EOL1: "EoL-1",
  SET2: "SET-2",
  TF1: "TF-1",
  KG1: "KG-1",
  NALM6: "NALM-6",
  RCHACV: "RCH-ACV",
  TALL1: "TALL-1",
  JK1: "JK-1",
  NCO2: "NCO2",
  HNT34: "HNT-34",
  ME1: "ME-1",
  MV411: "MV4-11",
  K562: "K-562",
  KASUMI1: "KASUMI-1",
  DND41: "DND-41",
  SEM: "SEM",
  LOUCY: "LOUCY",
  SUPT11: "SUP-T11",
};

export function prettyLine(id: string): string {
  if (NAMES[id]) return NAMES[id];
  return id.replace(/([A-Z]+)(\d+)/g, "$1-$2");
}

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function matchesQuestion(row: LeukemiaLine, q: Question): boolean {
  if (q === "all") return true;
  if (q === "protocol") return Boolean(row.protocol_slot);
  if (q === "causal") return row.crispr_available;
  if (q === "scfa") return row.cmp_scfa_pick || (row.z_scfa_handle ?? 0) > 0.6;
  if (q === "hdaci")
    return row.cmp_hdaci_sensitive || row.cmp_hdaci_resistant || (row.auc_vorinostat ?? 9) < 0.42;
  if (q === "lps") return row.cmp_lps_competent;
  if (q === "redox") return row.cmp_redox_pick || (row.z_oxidation ?? 0) > 0.6;
  if (q === "ahr") return row.cmp_ahr_bile_pick;
  if (q === "receptor") return row.ffar2_detected;
  return true;
}

export const LINEAGE_COLOR: Record<string, string> = {
  AML: "#8b2e1a",
  "B-ALL": "#2c4a6e",
  "T-ALL": "#2f5d3a",
  MPN: "#8a5a12",
  ALAL: "#5c4a7a",
};

export const SLOTS: {
  slot: string;
  lineId: string;
  line: string;
  job: string;
  avoid: string;
}[] = [
  { slot: "A", lineId: "KASUMI1", line: "KASUMI-1", job: "AML axis contrast", avoid: "Calling it MCT1-essential (Chronos −0.24)" },
  { slot: "B", lineId: "OCIAML3", line: "OCI-AML3", job: "AML axis contrast; MCT4-high", avoid: "The B-ALL uptake claim" },
  { slot: "C", lineId: "NALM6", line: "NALM-6", job: "B-ALL MCT1-dependent (Chronos −1.07)", avoid: "Oxidation or LPS" },
  { slot: "D", lineId: "SEM", line: "SEM", job: "B-ALL weak MCT1 dependency", avoid: "Treating it as the strong B-ALL arm" },
  { slot: "E", lineId: "DND41", line: "DND-41", job: "T-ALL dependent (26Q1; not in 24Q4 Chronos)", avoid: "Assuming 24Q4 coverage" },
  { slot: "F", lineId: "JURKAT", line: "Jurkat", job: "T-ALL dependency-null contrast", avoid: "Causal MCT1 uptake or LPS" },
  { slot: "G", lineId: "K562", line: "K-562", job: "Method development: MCT1 151 / MCT4 3.3 / Chronos −0.95", avoid: "Paediatric ALL biology" },
  { slot: "H", lineId: "RCHACV", line: "RCH-ACV", job: "B-ALL dependent + vorinostat-sensitive (AUC 0.36)", avoid: "Receptor signalling" },
];

export function lineageColor(lineage: string): string {
  return LINEAGE_COLOR[lineage] ?? "#6b6256";
}

export const QUESTIONS: { id: Question; label: string }[] = [
  { id: "all", label: "All lines" },
  { id: "protocol", label: "Protocol v5.0" },
  { id: "causal", label: "Has CRISPR" },
  { id: "scfa", label: "SCFA transport / ox" },
  { id: "hdaci", label: "HDACi response" },
  { id: "lps", label: "Pathogen products" },
  { id: "redox", label: "Oxidant handling" },
  { id: "ahr", label: "Indole / bile" },
  { id: "receptor", label: "FFAR2+" },
];
