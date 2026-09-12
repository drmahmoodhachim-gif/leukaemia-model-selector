import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fallback from "../data/lines.json";
import type { LeukemiaLine } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
if (url && key) {
  client = createClient(url, key);
}

export async function loadLines(): Promise<{ rows: LeukemiaLine[]; source: "supabase" | "bundled" }> {
  if (client) {
    const { data, error } = await client
      .from("leukemia_model_lines")
      .select("*")
      .order("protocol_slot", { ascending: true, nullsFirst: false })
      .order("slc16a1_dep", { ascending: true });
    if (!error && data && data.length > 0) {
      return { rows: data as LeukemiaLine[], source: "supabase" };
    }
  }
  return { rows: fallback as LeukemiaLine[], source: "bundled" };
}
