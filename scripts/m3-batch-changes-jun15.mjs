/**
 * Cambios batch del 2026-06-15:
 *  1. LUN PRIME · KB Halo + KB Around the World: 5 → 10 reps por lado
 *  2. MIE · quitar CORE BLOCK completo (4 sets, re-shift posteriores)
 *  3. VIE PRIME · Thoracic Foam → Cat-Cow Reach × 8
 *  4. VIE ARM · EZ Bar Preacher Curl → DB Preacher Curl × 10/lado (unilateral)
 *  5. VIE · quitar OPCIONAL Z2 set (1 set, re-shift posteriores)
 *  6. SÁB HEAVY B · Snatch-Grip RDL → B-Stance Barbell RDL 3×8/lado
 *
 * Aplica a template + 3 instancias por día (Andoni, César, Víctor).
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";

// ─── 1. CREATE NEW EXERCISES ─────────────────────────────────────────────
console.log("══ STEP 1: Ejercicios nuevos ══\n");

const NEW = [
  {
    name: "B-Stance Barbell RDL",
    name_es: "Peso Muerto Rumano con Barra en B-Stance",
    category: "strength", movement_pattern: "hinge", difficulty: "intermediate", default_tempo: "3.0.1.0",
    primary_muscles: ["glute_max", "hamstrings", "lower_back"],
    equipment_required: ["barbell"],
    description: "RDL unilateral con barra. Pie trasero solo apoyado en la punta (B-stance) — 80% de la carga en la pierna delantera. Glúteo + ham unilateral con grip bilateral.",
    coaching_cue: "Pie trasero solo en la punta, 30cm atrás. 80% del peso en pie delantero. Bisagra de cadera profunda con barra cerca de la espinilla. Aprieta glúteo arriba. 8 por lado.",
    founder_notes: "Más estable que el single-leg RDL puro. Asistencia residual del pie atrás te deja cargar más peso real al glúteo unilateral.",
  },
  {
    name: "DB Preacher Curl",
    name_es: "Curl Predicador con Mancuerna",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.2.1",
    primary_muscles: ["biceps_brachii_short_head", "brachialis"],
    equipment_required: ["dumbbell", "preacher_bench"],
    description: "Curl unilateral con DB en banco predicador. Un brazo a la vez = isolación + corrección de asimetrías. Estiramiento del bíceps fijo.",
    coaching_cue: "Tríceps apoyado firme en la almohadilla. DB hasta extensión casi completa abajo. Curl controlado apretando bíceps. Cero balanceo. 10 por lado.",
    founder_notes: "Unilateral pone foco quirúrgico en el bíceps que estás trabajando. Brazo dominante no compensa.",
  },
];

for (const e of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", e.name).maybeSingle();
  if (existing) { console.log(`  · "${e.name}" ya existe`); continue; }
  const { error } = await sb.from("exercises").insert({ ...e, is_active: true });
  if (error) { console.error(`  ✗ "${e.name}":`, error.message); process.exit(1); }
  console.log(`  ✓ "${e.name}"`);
}

async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).single();
  return data.id;
}

const EX = {
  kbHalo: await exId("KB Halo"),
  kbATW: await exId("KB Around the World"),
  catCow: await exId("Cat-Cow Reach"),
  thoracicFoam: await exId("Thoracic Extension over Foam Roller"),
  ezPreacher: await exId("EZ Bar Preacher Curl"),
  dbPreacher: await exId("DB Preacher Curl"),
  snatchGrip: await exId("Snatch-Grip Romanian Deadlift"),
  bStanceRdl: await exId("B-Stance Barbell RDL"),
  inclineWalk: await exId("Incline Walk steady pace"),
};

// ─── 2. HELPER: get all workouts for a day ──────────────────────────────
async function getWorkouts(date, templateLabel) {
  const { data: tpl } = await sb.from("workouts").select("id, day_label").is("user_id", null).eq("day_label", templateLabel).maybeSingle();
  const out = [{ id: tpl.id, label: "Template", userId: null }];
  for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
    const { data } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", date).maybeSingle();
    if (data) out.push({ id: data.id, label: name, userId: uid });
  }
  return out;
}

// ─── 3. LUN · KB Halo + ATW · reps 5 → 10 ────────────────────────────────
console.log("\n══ STEP 2: LUN PRIME · KB Halo + ATW a 10 reps ══\n");
for (const w of await getWorkouts("2026-06-08", "W1 DENSITY DAY")) {
  const { data: targets } = await sb.from("workout_sets").select("id, exercise_id, planned_reps").eq("workout_id", w.id).in("exercise_id", [EX.kbHalo, EX.kbATW]);
  for (const s of targets) {
    await sb.from("workout_sets").update({
      planned_reps: 10,
      coaching_cue_override: s.exercise_id === EX.kbHalo
        ? "2 rondas · 10 por lado · KB pegada a la cabeza, codos altos · alterna direcciones"
        : "2 rondas · 10 por lado · KB en cadera, alterna direcciones",
    }).eq("id", s.id);
  }
  console.log(`  ✓ ${w.label}: ${targets.length} sets a 10 reps`);
}

// ─── 4. MIE · quitar CORE BLOCK ──────────────────────────────────────────
console.log("\n══ STEP 3: MIE · eliminar CORE BLOCK ══\n");
for (const w of await getWorkouts("2026-06-10", "W1 SKILL DAY")) {
  const { data: allSets } = await sb.from("workout_sets").select("id, set_order, block_label").eq("workout_id", w.id).order("set_order");
  const coreSets = allSets.filter(s => s.block_label === "CORE BLOCK");
  if (!coreSets.length) { console.log(`  · ${w.label}: sin CORE, skip`); continue; }
  const maxCoreSO = Math.max(...coreSets.map(s => s.set_order));
  const minCoreSO = Math.min(...coreSets.map(s => s.set_order));
  const shiftBy = coreSets.length;
  await sb.from("workout_sets").delete().in("id", coreSets.map(s => s.id));
  // Shift posteriores down by N
  const after = allSets.filter(s => s.set_order > maxCoreSO);
  // Two-pass para evitar uniqueness conflicts
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: 10000 + i }).eq("id", after[i].id);
  }
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: after[i].set_order - shiftBy }).eq("id", after[i].id);
  }
  // Actualizar estimated_duration -10 min
  await sb.from("workouts").update({ estimated_duration: 68 }).eq("id", w.id);
  console.log(`  ✓ ${w.label}: ${coreSets.length} sets CORE eliminados · ${after.length} re-shift -${shiftBy}`);
}

// ─── 5. VIE PRIME · Thoracic Foam → Cat-Cow × 8 ────────────────────────
console.log("\n══ STEP 4: VIE PRIME · Thoracic Foam → Cat-Cow × 8 ══\n");
for (const w of await getWorkouts("2026-06-12", "W1 UPPER HYPERTROPHY")) {
  const { data: target } = await sb.from("workout_sets").select("id").eq("workout_id", w.id).eq("exercise_id", EX.thoracicFoam).maybeSingle();
  if (!target) { console.log(`  · ${w.label}: sin target`); continue; }
  await sb.from("workout_sets").update({
    exercise_id: EX.catCow,
    planned_reps: 8,
    coaching_cue_override: "Mobility t-spine | 2 rondas · alterna lento entre flexión (cat) y extensión (cow) · respira con cada transición",
  }).eq("id", target.id);
  console.log(`  ✓ ${w.label}: Cat-Cow Reach × 8`);
}

// ─── 6. VIE ARM · EZ Preacher → DB Preacher × 10/lado ─────────────────
console.log("\n══ STEP 5: VIE ARM · EZ Preacher → DB Preacher 10/lado ══\n");
for (const w of await getWorkouts("2026-06-12", "W1 UPPER HYPERTROPHY")) {
  const { data: targets } = await sb.from("workout_sets").select("id, coaching_cue_override").eq("workout_id", w.id).eq("exercise_id", EX.ezPreacher);
  if (!targets?.length) { console.log(`  · ${w.label}: sin EZ Preacher`); continue; }
  for (const s of targets) {
    const isFirst = s.coaching_cue_override && s.coaching_cue_override.length > 50;
    await sb.from("workout_sets").update({
      exercise_id: EX.dbPreacher,
      planned_reps: 10,
      coaching_cue_override: isFirst
        ? "10 por lado · DB Preacher unilateral · tríceps apoyado firme · estiramiento profundo abajo · cero balanceo"
        : null,
    }).eq("id", s.id);
  }
  console.log(`  ✓ ${w.label}: ${targets.length} sets DB Preacher 10/lado`);
}

// ─── 7. VIE · quitar OPCIONAL · Z2 ──────────────────────────────────────
console.log("\n══ STEP 6: VIE · eliminar OPCIONAL · Z2 ══\n");
for (const w of await getWorkouts("2026-06-12", "W1 UPPER HYPERTROPHY")) {
  const { data: allSets } = await sb.from("workout_sets").select("id, set_order, block_label").eq("workout_id", w.id).order("set_order");
  const z2Sets = allSets.filter(s => s.block_label === "OPCIONAL · Z2");
  if (!z2Sets.length) { console.log(`  · ${w.label}: sin Z2, skip`); continue; }
  const maxZ2SO = Math.max(...z2Sets.map(s => s.set_order));
  const shiftBy = z2Sets.length;
  await sb.from("workout_sets").delete().in("id", z2Sets.map(s => s.id));
  const after = allSets.filter(s => s.set_order > maxZ2SO);
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: 10000 + i }).eq("id", after[i].id);
  }
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: after[i].set_order - shiftBy }).eq("id", after[i].id);
  }
  console.log(`  ✓ ${w.label}: Z2 eliminado · ${after.length} re-shift -${shiftBy}`);
}

// ─── 8. SÁB HEAVY B · Snatch-Grip → B-Stance Barbell RDL 3×8/lado ───────
console.log("\n══ STEP 7: SÁB HEAVY B · Snatch-Grip → B-Stance Barbell RDL 3×8/lado ══\n");
for (const w of await getWorkouts("2026-06-13", "W1 LOWER HYPERTROPHY")) {
  const { data: targets } = await sb.from("workout_sets").select("id, coaching_cue_override, set_order").eq("workout_id", w.id).eq("exercise_id", EX.snatchGrip).order("set_order");
  if (!targets?.length) { console.log(`  · ${w.label}: sin Snatch-Grip`); continue; }
  for (const s of targets) {
    const isFirst = s.coaching_cue_override && s.coaching_cue_override.length > 50;
    await sb.from("workout_sets").update({
      exercise_id: EX.bStanceRdl,
      planned_reps: 8,
      coaching_cue_override: isFirst
        ? "8 por lado · pie trasero solo en la punta, 30cm atrás · 80% peso en pie delantero · bisagra profunda · aprieta glúteo arriba"
        : null,
    }).eq("id", s.id);
  }
  console.log(`  ✓ ${w.label}: ${targets.length} sets B-Stance Barbell RDL 8/lado`);
}

console.log("\n✓ TODOS los cambios aplicados");
