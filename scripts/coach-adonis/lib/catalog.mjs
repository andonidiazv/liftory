/**
 * Catalog access — exercise_lookup + create_exercise.
 * Tools que Coach Adonis usa para consultar y crecer el catálogo.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "../../_lib-env.mjs";

const env = loadEnv();
export const sb = createClient(
  `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/**
 * Busca ejercicios en el catálogo por nombre exacto, sub-string o keyword.
 * Devuelve ejercicios activos NO en draft (los drafts son privados a Coach Adonis).
 *
 * @param {string} query  Nombre exacto, sub-string, o keyword.
 * @returns {Promise<Array>}  Lista de ejercicios con metadata completa.
 */
export async function exerciseLookup(query) {
  const q = (query || "").trim();
  if (!q) return [];
  // Exact match first
  const { data: exact } = await sb
    .from("exercises")
    .select("id, name, name_es, category, movement_pattern, difficulty, equipment_required, primary_muscles, description, coaching_cue, founder_notes, default_tempo")
    .eq("name", q)
    .eq("is_active", true)
    .eq("is_draft", false);
  if (exact?.length) return exact;
  // Fuzzy on name + name_es
  const { data: fuzzy } = await sb
    .from("exercises")
    .select("id, name, name_es, category, movement_pattern, difficulty, equipment_required, primary_muscles, description, coaching_cue, founder_notes, default_tempo")
    .or(`name.ilike.%${q}%,name_es.ilike.%${q}%`)
    .eq("is_active", true)
    .eq("is_draft", false)
    .limit(15);
  return fuzzy ?? [];
}

/**
 * Lista TODOS los ejercicios activos no-draft. Usado al inicio del run para
 * dar al agente la vista completa del catálogo (cabe en una llamada).
 */
export async function exerciseListAll() {
  const { data } = await sb
    .from("exercises")
    .select("id, name, category, movement_pattern, difficulty, equipment_required, primary_muscles")
    .eq("is_active", true)
    .eq("is_draft", false)
    .order("name");
  return data ?? [];
}

/**
 * Crea un ejercicio nuevo en `is_draft = true`. Andoni los revisa después.
 *
 * Validación mínima: los campos requeridos están presentes y dentro de límites
 * LIFTORY (description ≤ 200, cue ≤ 300, founder ≤ 150). Si una validación
 * falla, lanza Error con detalle (el agente lo recibe y corrige).
 *
 * @param {Object} spec
 * @returns {Promise<{id: string, name: string}>}
 */
export async function createExercise(spec) {
  const required = ["name", "name_es", "category", "movement_pattern", "difficulty", "primary_muscles", "equipment_required", "description", "coaching_cue", "founder_notes"];
  for (const k of required) {
    if (!spec[k]) throw new Error(`create_exercise: campo "${k}" faltante`);
  }
  // Voz LIFTORY length caps
  if (spec.description.length > 200) throw new Error(`description > 200 chars (${spec.description.length})`);
  if (spec.coaching_cue.length > 300) throw new Error(`coaching_cue > 300 chars (${spec.coaching_cue.length})`);
  if (spec.founder_notes.length > 150) throw new Error(`founder_notes > 150 chars (${spec.founder_notes.length})`);

  // Skip if name already exists (catalog or draft)
  const { data: existing } = await sb.from("exercises").select("id, name, is_draft").eq("name", spec.name).maybeSingle();
  if (existing) {
    return { id: existing.id, name: existing.name, status: existing.is_draft ? "draft_exists" : "live_exists" };
  }

  const { data, error } = await sb
    .from("exercises")
    .insert({ ...spec, is_active: true, is_draft: true })
    .select("id, name")
    .single();
  if (error) throw new Error(`create_exercise insert: ${error.message}`);
  return { id: data.id, name: data.name, status: "created_draft" };
}

/**
 * Lista los drafts pendientes de revisión humana.
 */
export async function listDrafts() {
  const { data } = await sb
    .from("exercises")
    .select("id, name, name_es, category, movement_pattern, description, coaching_cue, founder_notes, created_at")
    .eq("is_draft", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Promueve un draft a vivo (Andoni aprueba).
 */
export async function approveDraft(idOrName) {
  const q = idOrName.length === 36 ? sb.from("exercises").update({ is_draft: false }).eq("id", idOrName) : sb.from("exercises").update({ is_draft: false }).eq("name", idOrName);
  const { data, error } = await q.select("id, name").maybeSingle();
  if (error) throw new Error(`approve: ${error.message}`);
  return data;
}
