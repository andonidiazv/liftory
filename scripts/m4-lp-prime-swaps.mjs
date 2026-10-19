/**
 * M4 · LOWER PUSH · PRIME BLOCK · 3 swaps:
 *  · Thoracic Extension over Foam Roller → 90/90 Hip Opener
 *  · KB Squat Clean with Pause → Single KB Squat Clean with Pause
 *  · Alternating Spiderman Lunge → Alternating Spiderman Lunge with Rotation
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Crear 3 ejercicios nuevos ═══
const NEW = [
  {
    name: "90/90 Hip Opener",
    name_es: "90/90 Apertura de Cadera",
    description: "Movilidad de cadera desde postura 90/90 (una pierna con cadera y rodilla en 90° al frente, otra pierna en 90° al lado). Desde ahí trabajás rango activo de rotación interna + externa de ambas caderas, abriendo el rango disponible sin forzar. Warmup ideal antes de squat pattern.",
    coaching_cue: "Sentado en el piso. Pierna delantera con cadera y rodilla a 90° (tibia perpendicular al torso, muslo hacia adelante). Pierna trasera espejeada a 90° pero hacia el lado. Ambas rodillas en el piso. Torso vertical, apoyate con las manos atrás si necesitás. Desde ahí, baja el torso hacia la pierna delantera (rotación externa), regresa. Rotá el torso al lado opuesto llevando la pierna trasera al 90/90 opuesto sin usar las manos — activo. Alterná lados. Movimiento fluido, buscando rango activo sin dolor.",
    founder_notes: "El 90/90 Hip Opener es el drill que mejor abre la cadera en TODOS los planos antes de un día de squat pesado. En 2 rondas de 5/lado prepara la cadera para catch profundo de Clean, Front Squat con torso vertical, y B-Stance Goblet. Rango activo, no pasivo.",
    category: "mobility",
    movement_pattern: "hinge",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["hip_rotators", "hip_capsule", "glutes", "adductors"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Single KB Squat Clean with Pause",
    name_es: "Squat Clean Unilateral con KB y Pausa",
    description: "Squat clean ejecutado con UNA sola kettlebell (un brazo) con pausa de 2 segundos en full squat en el catch. Combina hip hinge explosivo + catch unilateral en front rack + demanda de estabilización anti-lateral en el bottom del squat. Prep del BB Clean con menos peso y componente unilateral.",
    coaching_cue: "KB en el piso entre los pies. Cadera atrás como si fueras a deadlift, agarrás la KB con UNA mano (agarre supinado o neutro). Explosión desde cadera + rodillas + hombros, jalando la KB pegado al cuerpo. Catch EN FULL SQUAT con la KB en front rack UNILATERAL (KB apoyada en el hombro del mismo lado, codo alto, otra mano libre o extendida al frente para balance). Aguantá 2 segundos en el bottom. Levantate limpio del squat, bajá la KB al piso controlado. Alterná lados o completá un lado antes de cambiar.",
    founder_notes: "El single-arm KB Squat Clean con pausa mete un componente anti-lateral flexion brutal al patrón del squat clean. Prep aún mejor del BB Clean porque exige estabilización core + hombro sostenida en front rack asimétrico. Peso ligero, pattern impecable.",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "intermediate",
    equipment_required: ["kettlebell"],
    primary_muscles: ["quads", "glutes", "hamstrings", "shoulders", "core", "obliques"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Alternating Spiderman Lunge with Rotation",
    name_es: "Spiderman Lunge Alternado con Rotación",
    description: "Spiderman lunge (lunge amplio adelante + codo al piso al lado del pie delantero) con una ROTACIÓN torácica añadida — desde el bottom del lunge, el brazo opuesto rota hacia el techo abriendo el pecho y el T-spine. Combina hip flexor stretch + glute activation + T-spine mobility en un flow.",
    coaching_cue: "Parate erguido. Da un paso amplio adelante con la pierna derecha, bajá a lunge profundo. Apoyá el codo derecho en el piso al lado del pie derecho. Desde ahí, ROTÁ el torso izquierdo llevando el brazo izquierdo HACIA EL TECHO — la mano sube y los ojos siguen la mano. Sentí el T-spine abrir, el pecho abrirse. Aguantá 1s en el peak de la rotación. Bajá el brazo, regresá el codo al piso, empujá con el pie delantero y volvé al centro. Alterná lado. 8 alternating = 4/lado.",
    founder_notes: "El upgrade del Spiderman Lunge tradicional. Agrega la rotación torácica al package = un solo drill que prepara cadera + glute + T-spine + hombro. Perfecto activación pre-squat pattern.",
    category: "mobility",
    movement_pattern: "locomotion",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["hip_flexors", "glutes", "quads", "thoracic_spine", "obliques", "shoulders"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

console.log("═══ Creando exercises ═══\n");
for (const row of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) { console.log(`  ⏭  ${row.name} ya existe`); continue; }
  const { data: created, error } = await sb.from("exercises").insert(row).select("id").single();
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} (${created.id.slice(0,8)})`);
}

// ═══ Resolve IDs ═══
const { data: allEx } = await sb.from("exercises").select("id, name");
const EX = new Map((allEx ?? []).map(e => [e.name, e.id]));
const function_exId = n => { const id = EX.get(n); if (!id) { console.error("NOT FOUND: "+n); process.exit(1); } return id; };

const TE_ID   = function_exId("Thoracic Extension over Foam Roller");
const HO_ID   = function_exId("90/90 Hip Opener");
const KSC_ID  = function_exId("KB Squat Clean with Pause");
const SKSC_ID = function_exId("Single KB Squat Clean with Pause");
const ASL_ID  = function_exId("Alternating Spiderman Lunge");
const ASLR_ID = function_exId("Alternating Spiderman Lunge with Rotation");

// ═══ 3. Update PRIME sets en los 24 LOWER PUSH workouts ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, user_id, scheduled_date, week_number")
  .eq("day_label", "LOWER PUSH")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`\nLOWER PUSH workouts: ${workouts?.length}\n`);

// Sub-A del LOWER PUSH tiene: Weighted Ankle Stretch + Thoracic Extension over Foam Roller
// El Thoracic Extension over Foam Roller PRIME del LOWER PUSH aparece como el 2° ejercicio del sub-A
// (el heading está en el primer ejercicio del sub-A: Weighted Ankle Stretch)
// Voy a swap SOLO el Thoracic Extension (que es específico del LOWER PUSH PRIME)

let swapCount = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ─── Swap 1: Thoracic Extension → 90/90 Hip Opener (dentro del PRIME BLOCK) ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("block_label", "PRIME BLOCK")
      .eq("exercise_id", TE_ID);
    for (const r of rows ?? []) {
      // Nuevo cue mantiene formato M3: no lleva heading (segundo ejercicio del sub-A)
      const newCue = "2 rondas · 5/lado. Postura 90/90 (una pierna al frente 90°, otra al lado 90°). Alterná lados moviendo el torso hacia la pierna delantera, luego rotación al 90/90 opuesto sin usar manos. Rango activo, buscá apertura sin dolor.";
      await sb.from("workout_sets").update({
        exercise_id: HO_ID,
        planned_reps: 5,
        planned_duration_seconds: null,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      swapCount++;
    }
  }

  // ─── Swap 2: KB Squat Clean with Pause → Single KB Squat Clean with Pause ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("block_label", "PRIME BLOCK")
      .eq("exercise_id", KSC_ID);
    for (const r of rows ?? []) {
      const hasHeading = r.coaching_cue_override?.includes("|");
      const newCue = hasHeading
        ? "Activación + patrón squat | 2 rondas · 5 reps · 2s pause en catch bottom. UNA KB (un brazo). Catch en FULL SQUAT con la KB en front rack UNILATERAL (KB en el hombro, codo alto). Pausa 2s en el bottom. Alterná brazos por serie."
        : "2 rondas · 5 reps · 2s pause. UNA KB, un brazo. Catch en full squat front rack unilateral. Alterná brazos por serie.";
      await sb.from("workout_sets").update({
        exercise_id: SKSC_ID,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      swapCount++;
    }
  }

  // ─── Swap 3: Alternating Spiderman Lunge → Alternating Spiderman Lunge with Rotation ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("block_label", "PRIME BLOCK")
      .eq("exercise_id", ASL_ID);
    for (const r of rows ?? []) {
      const newCue = "2 rondas · 4/lado (8 alternating). Lunge amplio, codo mismo lado al piso al lado del pie delantero. Desde ahí ROTÁ el torso opuesto llevando el brazo libre al TECHO — abrí T-spine. Aguantá 1s en peak de rotación. Regresá y alterná.";
      await sb.from("workout_sets").update({
        exercise_id: ASLR_ID,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      swapCount++;
    }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: 3 swaps aplicados`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Total sets swapped: ${swapCount}`);
