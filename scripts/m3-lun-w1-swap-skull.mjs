/**
 * Cambia DB Skull Crusher por KB Skull Crusher en el ARM BLOCK del DENSITY DAY.
 *
 * 1. Crea KB Skull Crusher en el catálogo (si no existe)
 * 2. Swap exercise_id en los 4 sets de ARM BLOCK en:
 *    - Template (admin)
 *    - Instancia Andoni (2026-06-08)
 *    - Instancia César (2026-06-08)
 *    - Instancia Víctor (2026-06-08)
 *
 * Idempotente.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const WORKOUTS = [
  { id: "4b8ae2ba-1539-45cd-ade0-606f6b5b9062", label: "Template" },
  { id: "584d19f7-719a-4b02-bf42-4e0f3dd1c66c", label: "Andoni" },
  { id: "60003aad", label: "César" }, // partial, will resolve
  { id: "7ed4300f", label: "Víctor" },
];

// ─── 1. Crear KB Skull Crusher si no existe ───────────────────────────────
console.log("══ 1. KB Skull Crusher en catálogo ══");
let kbSkullId;
{
  const { data: existing } = await sb.from("exercises").select("id").eq("name", "KB Skull Crusher").maybeSingle();
  if (existing) {
    kbSkullId = existing.id;
    console.log(`  · ya existe (${kbSkullId.slice(0,8)}), skip`);
  } else {
    const { data: created, error } = await sb.from("exercises").insert({
      name: "KB Skull Crusher",
      name_es: "Skull Crusher con Kettlebell",
      category: "strength",
      movement_pattern: "push",
      difficulty: "intermediate",
      default_tempo: "3.0.1.0",
      primary_muscles: ["triceps_brachii"],
      equipment_required: ["kettlebell", "bench"],
      description: "Acostado en banco, una KB en cada mano agarrada de los cuernos. La campana cuelga detrás del antebrazo. Bajas las KBs flexionando solo el codo (codo apuntando al techo, fijo) hacia los lados de la cabeza; subes extendiendo el tríceps. El offset del peso de la KB respecto al antebrazo cambia el momento arm — el tríceps largo trabaja en una curva de tensión distinta que con mancuerna.",
      coaching_cue: "Acostado en banco plano, agarra cada KB de los cuernos por debajo, la campana queda detrás de la mano. Brazos extendidos arriba, codos apuntando al techo, fijos. Baja las KBs hacia los lados de la cabeza flexionando solo codos — siente el estiramiento en el tríceps largo. Empuja extendiendo el codo. El brazo no se mueve, solo el antebrazo.",
      founder_notes: "Reemplazo serio del DB Skull Crusher. El offset del peso de la KB carga el tríceps largo en posición estirada — la parte del tríceps que más responde a tensión excéntrica. Útil cuando ya hay volumen alto con DB y se necesita reset del estímulo. Reps moderadas (8-12), tempo controlado.",
      is_active: true,
    }).select("id").single();
    if (error) { console.error("  ✗ ERROR creando:", error.message); process.exit(1); }
    kbSkullId = created.id;
    console.log(`  ✓ creado → ${kbSkullId.slice(0,8)}`);
  }
}

const { data: dbSkull } = await sb.from("exercises").select("id").eq("name", "DB Skull Crusher").maybeSingle();
if (!dbSkull) { console.error("✗ DB Skull Crusher no existe — abort"); process.exit(1); }
const dbSkullId = dbSkull.id;
console.log(`  DB Skull Crusher id: ${dbSkullId.slice(0,8)} (origen del swap)`);

// ─── 2. Swap en cada workout ──────────────────────────────────────────────
console.log("\n══ 2. Swap en workouts ══");

for (const w of WORKOUTS) {
  // Resolve partial IDs if needed
  if (w.id.length < 36) {
    const { data: full } = await sb.from("workouts").select("id").gte("id", w.id).lte("id", w.id + "z").limit(1);
    if (full?.[0]) w.id = full[0].id;
  }

  console.log(`\n  ── ${w.label} (${w.id.slice(0,8)}) ──`);

  // Find sets in ARM BLOCK with DB Skull Crusher
  const { data: targetSets } = await sb
    .from("workout_sets")
    .select("id, set_order, block_label, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("block_label", "ARM BLOCK")
    .eq("exercise_id", dbSkullId)
    .order("set_order");

  if (!targetSets || targetSets.length === 0) {
    console.log(`    · sin sets DB Skull Crusher en ARM BLOCK, skip`);
    continue;
  }
  console.log(`    encontrados ${targetSets.length} sets`);

  for (const s of targetSets) {
    // Update exercise_id; also clean up cue if it references DB
    const updates = { exercise_id: kbSkullId };
    if (s.coaching_cue_override) {
      // Si el cue mencionaba "DB" o "mancuerna" para skull crusher, lo dejo igual —
      // los cues que tengo dicen "Baja a los lados de la cabeza..." sin referencia a DB.
      // Lo reviso por si acaso.
      const cleaned = s.coaching_cue_override
        .replace(/\bDB\b/g, "KB")
        .replace(/mancuerna/gi, "KB");
      if (cleaned !== s.coaching_cue_override) updates.coaching_cue_override = cleaned;
    }
    const { error } = await sb.from("workout_sets").update(updates).eq("id", s.id);
    if (error) { console.error(`    ✗ ERROR so=${s.set_order}:`, error.message); process.exit(1); }
  }
  console.log(`    ✓ ${targetSets.length} sets actualizados → KB Skull Crusher`);
}

// ─── 3. Verificar ─────────────────────────────────────────────────────────
console.log("\n══ 3. Verificación ══");
for (const w of WORKOUTS) {
  const { data: arm } = await sb
    .from("workout_sets")
    .select("set_order, exercise_id")
    .eq("workout_id", w.id)
    .eq("block_label", "ARM BLOCK")
    .order("set_order");
  const exIds = [...new Set(arm.map(s => s.exercise_id))];
  const { data: exes } = await sb.from("exercises").select("id, name").in("id", exIds);
  const map = Object.fromEntries(exes.map(e => [e.id, e.name]));
  console.log(`\n  ${w.label} ARM BLOCK:`);
  for (const s of arm) console.log(`    so=${s.set_order} | ${map[s.exercise_id]}`);
}

console.log("\n✓ Listo");
