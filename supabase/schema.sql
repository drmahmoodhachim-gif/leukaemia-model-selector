-- Table already applied on the shared CSRG project as
-- migration 20260912212518_create_leukemia_model_lines.
-- Do not drop or alter unrelated schemas on this project.

create table if not exists public.leukemia_model_lines (
  line text primary key,
  lineage text not null,
  z_scfa_handle double precision,
  z_scfa_sense double precision,
  z_transport double precision,
  z_oxidation double precision,
  z_hdac_expr double precision,
  ffar2 double precision,
  ffar3 double precision,
  hcar2 double precision,
  hcar3 double precision,
  slc5a8 double precision,
  slc16a1 double precision,
  slc16a3 double precision,
  bsg double precision,
  acads double precision,
  echs1 double precision,
  acss2 double precision,
  hdac1 double precision,
  hdac3 double precision,
  hdac6 double precision,
  auc_vorinostat double precision,
  auc_entinostat double precision,
  auc_belinostat double precision,
  ffar2_detected boolean not null default false,
  slc5a8_detected boolean not null default false,
  cmp_scfa_pick boolean not null default false,
  cmp_hdaci_sensitive boolean not null default false,
  cmp_hdaci_resistant boolean not null default false,
  cmp_lps_competent boolean not null default false,
  cmp_redox_pick boolean not null default false,
  cmp_ahr_bile_pick boolean not null default false,
  ebv_caveat boolean not null default false,
  recommended_for text
);

alter table public.leukemia_model_lines enable row level security;

create policy "leukemia_model_lines_select_public"
  on public.leukemia_model_lines
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.leukemia_model_lines from anon, authenticated;
