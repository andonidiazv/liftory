/**
 * Generates swap candidates into `substitution_candidates` for admin review.
 *
 * Nothing written here reaches an athlete. A candidate only goes live once
 * approved in Admin → Sustituciones and promoted into exercise_substitutions.
 *
 * Why the filters are this strict: a naive "same pattern + shared muscles"
 * match produces ~3,140 pairs for this catalog, of which 53% cross category
 * and 31% cross set_type — swaps that quietly change what a block is for
 * (a PRIME activation drill offering a loaded barbell squat).
 *
 *   node scripts/generate-swap-candidates.mjs            # write candidates
 *   node scripts/generate-swap-candidates.mjs --dry-run  # report only
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const DRY = process.argv.includes("--dry-run");
const MAX_POR_EJE = 2; // techo duro: 2 por eje = 4 opciones máximo por ejercicio

const env = loadEnv();
const sb = createClient(
  `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const RANK = { beginner: 1, all_levels: 1, intermediate: 2, advanced: 3 };
const PREP_TYPES = new Set(["warmup", "cooldown"]);
const overlap = (a = [], b = []) => a.filter((x) => b.includes(x)).length;

// ─── catálogo + uso real ────────────────────────────────────────────────
const { data: all } = await sb.from("exercises").select("*").eq("is_active", true);
const EX = Object.fromEntries(all.map((e) => [e.id, e]));

const { data: subs } = await sb.from("exercise_substitutions").select("*");
const yaLigado = new Set(subs.map((s) => `${s.exercise_id}|${s.substitute_exercise_id}`));
const subsPorEjercicio = {};
for (const s of subs) (subsPorEjercicio[s.exercise_id] ??= []).push(s);

// Perfil de uso: cómo se programa de verdad cada ejercicio.
// `category` no sirve para esto — discrepa del uso real en ~20 ejercicios
// (11 "strength" se usan solo como warmup, 3 "conditioning" también).
const perfil = {};
let desde = 0;
for (;;) {
  const { data: page } = await sb
    .from("workout_sets")
    .select("exercise_id,set_type")
    .range(desde, desde + 999);
  if (!page?.length) break;
  for (const r of page) {
    if (!r.exercise_id) continue;
    const p = (perfil[r.exercise_id] ??= { prep: 0, trabajo: 0 });
    PREP_TYPES.has(r.set_type) ? p.prep++ : p.trabajo++;
  }
  if (page.length < 1000) break;
  desde += 1000;
}
const perfilDe = (id) => {
  const p = perfil[id];
  if (!p) return "sin_uso";
  if (p.trabajo === 0) return "prep";
  if (p.prep === 0) return "trabajo";
  return "mixto";
};
// Un candidato nunca programado ("sin_uso") es compatible con cualquiera:
// no hay evidencia en contra y el humano decide en la revisión.
const propositoCompatible = (a, b) => {
  const pa = perfilDe(a), pb = perfilDe(b);
  if (pa === "sin_uso" || pb === "sin_uso") return true;
  if (pa === "mixto" || pb === "mixto") return true;
  return pa === pb;
};

// ─── las 5 reglas ───────────────────────────────────────────────────────
function evaluar(origen, cand) {
  if (origen.id === cand.id) return null;

  // R1 · mismo patrón primario
  if (origen.movement_pattern !== cand.movement_pattern) return null;

  // R2 · mismo plano cuando ambos lo declaran (un chin-up no sustituye un remo)
  if (origen.movement_plane && cand.movement_plane &&
      origen.movement_plane !== cand.movement_plane) return null;

  // R3 · al menos 2 músculos primarios compartidos
  const mus = overlap(cand.primary_muscles, origen.primary_muscles);
  if (mus < 2) return null;

  // R4 · propósito compatible según uso real, no según `category`
  if (!propositoCompatible(origen.id, cand.id)) return null;

  // R5 · eje: regresión de nivel, o lateral por equipo
  const rOrigen = RANK[origen.difficulty], rCand = RANK[cand.difficulty];
  const equipoDistinto = overlap(cand.equipment_required, origen.equipment_required) === 0;
  let axis = null;
  if (rCand < rOrigen) axis = "level";
  else if (rCand === rOrigen && equipoDistinto) axis = "equipment";
  if (!axis) return null;

  // score: músculos pesan más que el resto; el video desempata
  let score = mus * 3;
  if (origen.secondary_movement_pattern &&
      origen.secondary_movement_pattern === cand.secondary_movement_pattern) score += 3;
  if (origen.movement_plane && origen.movement_plane === cand.movement_plane) score += 2;
  if (overlap(cand.equipment_required, origen.equipment_required) > 0) score += 1;
  if (cand.video_url) score += 2;
  if (cand.description?.trim() && cand.coaching_cue?.trim()) score += 1;

  const razon = axis === "level"
    ? `Regresión · ${mus} músculos compartidos · ${cand.difficulty}`
    : `Mismo nivel, otro equipo (${(cand.equipment_required ?? []).join("/") || "sin equipo"}) · ${mus} músculos compartidos`;

  return { axis, score, razon };
}

// ─── generar ────────────────────────────────────────────────────────────
const usados = all.filter((e) => perfil[e.id]); // solo lo que está programado
const filas = [];

for (const origen of usados) {
  const porEje = { level: [], equipment: [] };
  for (const cand of all) {
    const r = evaluar(origen, cand);
    if (!r) continue;
    if (yaLigado.has(`${origen.id}|${cand.id}`)) continue; // ya es sustituto vivo
    porEje[r.axis].push({ cand, ...r });
  }
  for (const eje of ["level", "equipment"]) {
    porEje[eje].sort((a, b) => b.score - a.score);
    for (const x of porEje[eje].slice(0, MAX_POR_EJE)) {
      filas.push({
        exercise_id: origen.id,
        candidate_exercise_id: x.cand.id,
        axis: x.axis,
        score: x.score,
        reason: x.razon,
        status: "pending",
      });
    }
  }
}

// ─── reporte ────────────────────────────────────────────────────────────
const porEje = filas.reduce((a, f) => ((a[f.axis] = (a[f.axis] ?? 0) + 1), a), {});
console.log(`Ejercicios programados:   ${usados.length}`);
console.log(`Candidatos generados:     ${filas.length}`);
console.log(`  eje NIVEL (regresión):  ${porEje.level ?? 0}`);
console.log(`  eje EQUIPO (lateral):   ${porEje.equipment ?? 0}`);
console.log(`Ejercicios cubiertos:     ${new Set(filas.map((f) => f.exercise_id)).size}`);

const sinCandidatos = usados.filter((e) => !filas.some((f) => f.exercise_id === e.id));
console.log(`Sin ningún candidato:     ${sinCandidatos.length}`);

console.log("\nMuestra (score más alto primero):");
for (const f of [...filas].sort((a, b) => b.score - a.score).slice(0, 12)) {
  console.log(`  ${String(f.score).padStart(3)} · ${f.axis.padEnd(9)} · ${EX[f.exercise_id].name} → ${EX[f.candidate_exercise_id].name}`);
}

if (DRY) {
  console.log("\n--dry-run: no se escribió nada.");
  process.exit(0);
}

await sb.from("substitution_candidates").delete().eq("status", "pending");
let ins = 0;
for (let i = 0; i < filas.length; i += 200) {
  const { error, count } = await sb
    .from("substitution_candidates")
    .upsert(filas.slice(i, i + 200), { onConflict: "exercise_id,candidate_exercise_id", count: "exact" });
  if (error) { console.log(`❌ ${error.message}`); break; }
  ins += count ?? 0;
}
console.log(`\n✅ ${ins} candidatos en cola de revisión (status=pending)`);
