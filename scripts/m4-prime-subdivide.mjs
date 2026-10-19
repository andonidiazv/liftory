/**
 * M4 · PRIME BLOCK sub-división.
 *
 * En la creación inicial dejé todos los sets bajo `block_label: "PRIME BLOCK"`.
 * Tenía que ir sub-dividido en A/B/C tal como diseñamos con Andoni. Este
 * script reasigna el block_label del PRIME según qué ejercicio es.
 *
 * Convenciones que usa la app: `PRIME BLOCK — A`, `— B`, `— C` (em-dash),
 * consistente con `HEAVY BLOCK — A/B` y `BUILD BLOCK — A/B` que ya existen.
 *
 * Idempotente: si ya está sub-dividido, cada UPDATE es un no-op efectivo.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Por día (day_label) mapeo ejercicio → sub-grupo A/B/C.
// Cada uno según el diseño confirmado con Andoni:
//   - A. Movilidad Articular
//   - B. Prep Específica del día
//   - C. Activación + Patrón
const MAP_BY_DAY = {
  "PULL DAY": {
    A: ["Thoracic Extension over Foam Roller", "Downward Dog to Cobra"],
    B: ["Band Pull-Apart", "Prone Y-T-W"],
    C: ["Dead Hang", "Cat-Cow Reach"],
  },
  "LOWER PUSH": {
    A: ["Weighted Ankle Stretch", "Thoracic Extension over Foam Roller"],
    B: ["Cossack Squat Flow", "Supine Active Hamstring Stretch"],
    C: ["KB Squat Clean with Pause", "Alternating Spiderman Lunge"],
  },
  "PUSH DAY": {
    A: ["Thoracic Extension over Foam Roller", "Downward Dog to Cobra"],
    B: ["Band Dislocates", "Wrist Mobility"],
    C: ["Prone Y-T-W", "Scap Push-up"],
  },
};

// Nombre canonical → id (necesario porque no puedo buscar por nombre en workout_sets directamente)
const { data: exs } = await sb.from("exercises").select("id, name");
const NAME_TO_ID = new Map((exs ?? []).map(e => [e.name, e.id]));

// Todos los workouts de M4 (LUN/MAR/MIÉ, 2026-07-20 a 2026-08-30)
const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, user_id, scheduled_date, week_number")
  .in("day_label", Object.keys(MAP_BY_DAY))
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

console.log(`Workouts en M4 window: ${workouts?.length}\n`);

let updated = 0, alreadyOk = 0, orphans = 0;

for (const w of workouts ?? []) {
  const dayMap = MAP_BY_DAY[w.day_label];
  if (!dayMap) continue;

  // Traigo los sets de PRIME BLOCK (todos los variantes: "PRIME BLOCK", "PRIME BLOCK — A", etc.)
  const { data: sets } = await sb.from("workout_sets")
    .select("id, exercise_id, block_label, set_order")
    .eq("workout_id", w.id)
    .ilike("block_label", "PRIME BLOCK%");

  const targetById = new Map(); // exercise_id → target sub-group letter
  for (const [letter, names] of Object.entries(dayMap)) {
    for (const n of names) {
      const id = NAME_TO_ID.get(n);
      if (id) targetById.set(id, letter);
    }
  }

  for (const s of sets ?? []) {
    const target = targetById.get(s.exercise_id);
    if (!target) {
      // No debería pasar — el ejercicio está en PRIME pero no en mi mapa.
      // Podría ser un ejercicio residual de M3 o algo raro. No lo toco.
      const exName = [...NAME_TO_ID.entries()].find(([, id]) => id === s.exercise_id)?.[0] ?? "?";
      console.log(`  ⚠ ${w.scheduled_date} W${w.week_number} ${w.day_label}: exercise "${exName}" en PRIME sin mapeo → skip`);
      orphans++;
      continue;
    }
    const desired = `PRIME BLOCK — ${target}`;
    if (s.block_label === desired) {
      alreadyOk++;
      continue;
    }
    const { error } = await sb.from("workout_sets").update({ block_label: desired }).eq("id", s.id);
    if (error) { console.error(`  ✗ ${w.scheduled_date} W${w.week_number} ${w.day_label} set ${s.id.slice(0,8)}: ${error.message}`); continue; }
    updated++;
  }
}

console.log(`\n✓ Sets actualizados: ${updated}`);
console.log(`· Ya correctos:      ${alreadyOk}`);
console.log(`· Sin mapeo (skip):  ${orphans}`);
