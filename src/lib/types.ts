export type LeukemiaLine = {
  line: string;
  lineage: string;
  z_scfa_handle: number | null;
  z_scfa_sense: number | null;
  z_transport: number | null;
  z_oxidation: number | null;
  z_hdac_expr: number | null;
  ffar2: number | null;
  ffar3: number | null;
  hcar2: number | null;
  hcar3: number | null;
  slc5a8: number | null;
  slc5a8_ccle2025: number | null;
  slc16a1: number | null;
  slc16a3: number | null;
  slc16a1_dep: number | null;
  bsg: number | null;
  acads: number | null;
  echs1: number | null;
  acss2: number | null;
  hdac1: number | null;
  hdac3: number | null;
  hdac6: number | null;
  auc_vorinostat: number | null;
  auc_entinostat: number | null;
  auc_belinostat: number | null;
  ffar2_detected: boolean;
  slc5a8_detected: boolean;
  crispr_available: boolean;
  mct1_dependent: boolean;
  protocol_slot: string | null;
  cmp_scfa_pick: boolean;
  cmp_hdaci_sensitive: boolean;
  cmp_hdaci_resistant: boolean;
  cmp_lps_competent: boolean;
  cmp_redox_pick: boolean;
  cmp_ahr_bile_pick: boolean;
  ebv_caveat: boolean;
  recommended_for: string | null;
};

export type Question =
  | "all"
  | "protocol"
  | "causal"
  | "scfa"
  | "hdaci"
  | "lps"
  | "redox"
  | "ahr"
  | "receptor";
