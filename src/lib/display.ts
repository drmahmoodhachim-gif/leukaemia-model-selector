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
