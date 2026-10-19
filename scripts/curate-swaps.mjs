/**
 * Curates swap proposals by MOVEMENT FAMILY, not by muscle overlap.
 *
 * The first generator scored on shared muscles and produced noise: it ranked
 * "Pause Box Squat → Dumbbell Thruster" as high confidence (both squat, both
 * share quads/glutes/core) while rejecting "Barbell Back Squat → Goblet Squat"
 * for sharing "only 2 muscles". Muscle overlap does not tell you whether two
 * exercises are interchangeable — being the same movement does.
 *
 * So: strip the implement and the side/limb qualifier from the name. What
 * remains is the movement. Two exercises are candidates only if that core
 * matches AND they agree on pattern, plane and purpose.
 *
 *   node scripts/curate-swaps.mjs            # print the proposal
 *   node scripts/curate-swaps.mjs --write    # queue it for review
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const WRITE = process.argv.includes("--write");
const env = loadEnv();
const sb = createClient(
  `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const RANK = { beginner: 1, all_levels: 1, intermediate: 2, advanced: 3 };

// Implement and side are variables; everything else is the movement.
// Position words (bench, overhead, incline, front, back) stay — in
// "Bench Press" vs "Overhead Press" the position IS the movement.
const IMPLEMENTO = /\b(barbell|bb|dumbbell|db|kettlebell|kb|cable|machine|banded|band|landmine|trap bar|ez bar|plate|plates|smith|medball|medicine ball|ring|trx|pvc|sled|rope|bodyweight|weighted|erg)\b/gi;
const LADO = /\b(single[- ]arm|single[- ]leg|one[- ]arm|alternating|alternate|unilateral|sa|dual|double|b[- ]stance|staggered|cross[- ]body)\b/gi;
const RUIDO = /\b(strength|variation|regression|progression)\b/gi;

const nucleo = (n) =>
  n.toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(IMPLEMENTO, " ")
    .replace(LADO, " ")
    .replace(RUIDO, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();



const NO_APLICA = /\b(breathing|respiraci|stretch|cars|mobility|flow|walk|hold)\b/i;
/** Two names that differ only by a parenthetical or a single word are the same card twice. */
const casiIgual = (x, y) => {
  const limpio = (n) => n.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return limpio(x) === limpio(y);
};

const ERG = /\b(erg|ergometer|assault bike|bike|treadmill|rower|ski)\b/i;
const esErg = (e) => ERG.test(e.name) || e.category === "conditioning";

const UNILATERAL = /\b(single[- ]arm|single[- ]leg|one[- ]arm|b[- ]stance|staggered|sa\b|unilateral|alternating)\b/i;
const esUnilateral = (n) => UNILATERAL.test(n);

const { data: all } = await sb.from("exercises").select("*").eq("is_active", true);
const EX = Object.fromEntries(all.map((e) => [e.id, e]));

const { data: subs } = await sb.from("exercise_substitutions").select("*");
const yaVive = new Set(subs.map((s) => `${s.exercise_id}|${s.substitute_exercise_id}`));

const { data: cands } = await sb.from("substitution_candidates").select("*").neq("status", "pending");
const yaJuzgado = new Set(cands.map((c) => `${c.exercise_id}|${c.candidate_exercise_id}`));

// Real programming usage, to keep a warmup drill from swapping into loaded work.
const ids = all.map((e) => e.id);
const perfil = {};
for (let i = 0; i < ids.length; i += 400) {
  const { data } = await sb.rpc("exercise_usage_profiles", { ex_ids: ids.slice(i, i + 400) });
  for (const p of data ?? []) perfil[p.exercise_id] = p.profile;
}
const compatible = (a, b) => {
  const pa = perfil[a], pb = perfil[b];
  if (pa === "sin_uso" || pb === "sin_uso") return true;
  if (pa === "mixto" || pb === "mixto") return true;
  return pa === pb;
};

// ─── agrupar por familia ─────────────────────────────────────────────────
const familias = {};
for (const e of all) {
  const k = nucleo(e.name);
  if (!k || k.length < 3) continue;
  (familias[k] ??= []).push(e);
}

const propuestas = [];
for (const [fam, miembros] of Object.entries(familias)) {
  if (miembros.length < 2) continue;
  for (const a of miembros) {
    for (const b of miembros) {
      if (a.id === b.id) continue;
      if (yaVive.has(`${a.id}|${b.id}`) || yaJuzgado.has(`${a.id}|${b.id}`)) continue;

      // misma mecánica
      if (a.movement_pattern !== b.movement_pattern) continue;
      if (a.movement_plane && b.movement_plane && a.movement_plane !== b.movement_plane) continue;
      if (!compatible(a.id, b.id)) continue;

      // Un ergómetro no sustituye un movimiento cargado: "Row Erg" cae en la
      // familia "row" por nombre, pero es acondicionamiento continuo.
      if (esErg(a) !== esErg(b)) continue;

      // Unilateral y bilateral no se sustituyen entre sí: cambia la demanda de
      // estabilidad y la carga por pierna, que es el punto del unilateral.
      if (esUnilateral(a.name) !== esUnilateral(b.name)) continue;

      // Respiración y estiramientos sostenidos no se "sustituyen" — se eligen
      // por lo que hacen, no por el implemento.
      if (NO_APLICA.test(a.name) || NO_APLICA.test(b.name)) continue;

      // Nombres casi idénticos son duplicados del catálogo, no alternativas.
      if (casiIgual(a.name, b.name)) continue;

      const ra = RANK[a.difficulty], rb = RANK[b.difficulty];
      const equipoDistinto =
        (a.equipment_required ?? []).filter((x) => (b.equipment_required ?? []).includes(x)).length === 0;

      let axis = null;
      if (rb < ra) axis = "level";
      else if (rb === ra && equipoDistinto) axis = "equipment";
      if (!axis) continue;

      let score = 10;
      if (b.video_url) score += 3;
      if (b.description?.trim() && b.coaching_cue?.trim()) score += 2;
      if (a.movement_plane && a.movement_plane === b.movement_plane) score += 2;
      if (perfil[b.id] !== "sin_uso") score += 2;

      propuestas.push({
        familia: fam,
        exercise_id: a.id,
        candidate_exercise_id: b.id,
        axis,
        score,
        reason:
          axis === "level"
            ? `Misma familia "${fam}" · regresión a ${b.difficulty}`
            : `Misma familia "${fam}" · otro implemento (${(b.equipment_required ?? []).join("/") || "sin equipo"})`,
      });
    }
  }
}

// máximo 2 por eje por ejercicio, el mejor score primero
const porOrigen = {};
for (const p of propuestas) (porOrigen[p.exercise_id] ??= []).push(p);
const final = [];
for (const lista of Object.values(porOrigen)) {
  for (const eje of ["level", "equipment"]) {
    lista.filter((x) => x.axis === eje).sort((a, b) => b.score - a.score).slice(0, 2)
      .forEach((x) => final.push(x));
  }
}

// ─── reporte ─────────────────────────────────────────────────────────────
const porFamilia = {};
for (const p of final) (porFamilia[p.familia] ??= []).push(p);

console.log(`Familias con 2+ variantes : ${Object.values(familias).filter((v) => v.length > 1).length}`);
console.log(`Propuestas               : ${final.length}`);
console.log(`  eje nivel              : ${final.filter((p) => p.axis === "level").length}`);
console.log(`  eje equipo             : ${final.filter((p) => p.axis === "equipment").length}`);
console.log(`Ejercicios cubiertos     : ${new Set(final.map((p) => p.exercise_id)).size}\n`);

for (const [fam, lista] of Object.entries(porFamilia).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`▸ ${fam}`);
  for (const p of lista.sort((a, b) => b.score - a.score)) {
    const a = EX[p.exercise_id], b = EX[p.candidate_exercise_id];
    const eje = p.axis === "level" ? "↓ nivel " : "⇄ equipo";
    console.log(`    ${eje}  ${a.name} [${a.difficulty.slice(0, 3)}] → ${b.name} [${b.difficulty.slice(0, 3)}]${b.video_url ? " 🎬" : ""}`);
  }
}

if (!WRITE) {
  console.log("\n(sin --write: no se escribió nada)");
  process.exit(0);
}

await sb.from("substitution_candidates").delete().eq("status", "pending");
const filas = final.map((p) => ({
  exercise_id: p.exercise_id,
  candidate_exercise_id: p.candidate_exercise_id,
  axis: p.axis,
  score: p.score,
  reason: p.reason,
  status: "pending",
}));
let ins = 0;
for (let i = 0; i < filas.length; i += 200) {
  const { count, error } = await sb
    .from("substitution_candidates")
    .upsert(filas.slice(i, i + 200), { onConflict: "exercise_id,candidate_exercise_id", count: "exact" });
  if (error) { console.log(`❌ ${error.message}`); break; }
  ins += count ?? 0;
}
console.log(`\n✅ ${ins} propuestas en cola de revisión`);
