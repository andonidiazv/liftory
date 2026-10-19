#!/usr/bin/env node
/**
 * coach-adonis · apply-meso
 *
 * Uso:
 *   node scripts/coach-adonis/apply-meso.mjs out/coach-adonis/M4/plan.json [--dry-run]
 *
 * Pipeline (idempotente):
 *   1. Crea/upserta el mesocycle (status=draft)
 *   2. Crea/upserta el program template (BUILD HIM ELITE)
 *   3. Para cada workout en el plan:
 *      - Crea template workout (user_id=null)
 *      - Inserta sus sets
 *      - Crea instancias para Andoni, César, Víctor (si tienen programa activo)
 *      - Inserta sets para cada instancia
 *
 * Antes de aplicar, RE-EJECUTA el validador y aborta si hay errors.
 * Confirma con prompt si no es --dry-run y hay drafts no aprobados.
 *
 * --dry-run muestra qué crearía sin tocar la DB.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "../_lib-env.mjs";
import { validateMeso, formatAudit } from "./lib/validator.mjs";
import { listDrafts } from "./lib/catalog.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ─── Args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const planPath = args.find(a => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const skipConfirm = args.includes("--yes");

if (!planPath) {
  console.error("Uso: node apply-meso.mjs <plan.json> [--dry-run] [--yes]");
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

// ─── Constants (mismos que m3-build-w2-w6.mjs) ─────────────────────────────
const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0"; // BUILD HIM ELITE template
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";

// ─── Pre-flight: re-validate ───────────────────────────────────────────────
console.log(`══════════════════════════════════════════════════════════════════════`);
console.log(`  Coach Adonis · apply-meso${dryRun ? " (DRY RUN)" : ""}`);
console.log(`  plan:   ${planPath}`);
console.log(`  meso:   ${plan.mesocycle?.name} · ${plan.mesocycle?.program_name}`);
console.log(`  dates:  ${plan.mesocycle?.start_date} → ?`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

const audit = await validateMeso(plan);
console.log(formatAudit(audit));
console.log("");

if (audit.errors.length > 0) {
  console.error(`✗ Plan tiene ${audit.errors.length} errores · abort.`);
  process.exit(2);
}

// ─── Drafts pending ────────────────────────────────────────────────────────
const drafts = await listDrafts();
if (drafts.length > 0) {
  console.log(`⚠ Hay ${drafts.length} ejercicios en draft no aprobados:`);
  for (const d of drafts.slice(0, 10)) console.log(`   · ${d.name}`);
  if (drafts.length > 10) console.log(`   ... y ${drafts.length - 10} más`);
  console.log(`  Los workouts referenciarán estos ejercicios — funcionan en DB pero no son visibles en buscador.`);
  console.log(`  Aprueba con: node scripts/coach-adonis/approve-draft.mjs <name>\n`);
}

// ─── Confirm ───────────────────────────────────────────────────────────────
if (!dryRun && !skipConfirm) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise(r => rl.question(`Continuar y crear ${plan.workouts.length} workouts × 4 (tpl + 3 atletas)? [y/N] `, r));
  rl.close();
  if (!/^y(es)?$/i.test(ans.trim())) {
    console.log("Cancelado.");
    process.exit(0);
  }
}

// ─── Resolve exercise IDs (catalog + drafts) ───────────────────────────────
async function resolveExerciseId(name) {
  const { data, error } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (error) throw new Error(`resolveExerciseId(${name}): ${error.message}`);
  if (!data) throw new Error(`Ejercicio "${name}" no existe en exercises table`);
  return data.id;
}

const exerciseIds = {};
const usedNames = new Set();
for (const w of plan.workouts) for (const b of w.blocks) for (const s of b.sets) usedNames.add(s.exercise);
console.log(`→ Resolviendo ${usedNames.size} ejercicios únicos...`);
for (const name of usedNames) exerciseIds[name] = await resolveExerciseId(name);

// ─── Mesocycle ─────────────────────────────────────────────────────────────
let mesocycleId;
{
  const m = plan.mesocycle;
  const { data: existing } = await sb
    .from("mesocycles")
    .select("id")
    .eq("program_name", m.program_name)
    .eq("cycle_number", m.cycle_number)
    .maybeSingle();
  if (existing) {
    mesocycleId = existing.id;
    console.log(`  · Mesocycle ${m.name} ya existe (${mesocycleId.slice(0, 8)})`);
  } else if (dryRun) {
    console.log(`  [dry] Crearía mesocycle ${m.name} · cycle ${m.cycle_number} · ${m.start_date}`);
    mesocycleId = "DRY_RUN_MESO_ID";
  } else {
    const { data: created, error } = await sb
      .from("mesocycles")
      .insert({
        program_name: m.program_name,
        cycle_number: m.cycle_number,
        cycle_start_date: m.start_date,
        total_weeks: m.total_weeks ?? 6,
        status: "draft",
        template_program_id: PROGRAM_TEMPLATE_ID,
      })
      .select("id")
      .single();
    if (error) { console.error(`✗ create mesocycle: ${error.message}`); process.exit(1); }
    mesocycleId = created.id;
    console.log(`  ✓ Mesocycle ${m.name} creado → ${mesocycleId.slice(0, 8)}`);
  }
}

// ─── Date helper ───────────────────────────────────────────────────────────
function dayLabelForTemplate(week, dayLabel) {
  return `W${week} ${dayLabel}`;
}

// ─── Apply workouts ────────────────────────────────────────────────────────
const summary = { tplCreated: 0, tplSkipped: 0, instCreated: 0, instSkipped: 0, errors: [] };

for (const w of plan.workouts) {
  const ctx = `W${w.week_number} ${w.day_label}`;
  try {
    // 1. Template workout
    const tplLabel = dayLabelForTemplate(w.week_number, w.day_label);
    let templateId;
    {
      const { data: existing } = await sb
        .from("workouts")
        .select("id")
        .is("user_id", null)
        .eq("mesocycle_id", mesocycleId)
        .eq("week_number", w.week_number)
        .eq("day_label", tplLabel)
        .maybeSingle();
      if (existing) {
        templateId = existing.id;
        summary.tplSkipped++;
      } else if (dryRun) {
        templateId = `DRY_${w.week_number}_${w.day_label}`;
        summary.tplCreated++;
        console.log(`  [dry] tpl ${ctx} (${w.scheduled_date}, ${w.estimated_duration}m, ${w.blocks.length} bloques)`);
      } else {
        const { data: created, error } = await sb
          .from("workouts")
          .insert({
            program_id: PROGRAM_TEMPLATE_ID,
            user_id: null,
            scheduled_date: w.scheduled_date,
            week_number: w.week_number,
            day_label: tplLabel,
            workout_type: w.workout_type || "strength",
            estimated_duration: w.estimated_duration,
            is_completed: false,
            is_rest_day: false,
            coach_note: w.coach_note,
            short_on_time_note: w.short_on_time_note,
            mesocycle_id: mesocycleId,
          })
          .select("id")
          .single();
        if (error) throw new Error(`tpl insert: ${error.message}`);
        templateId = created.id;
        summary.tplCreated++;

        // Template sets
        const setRows = [];
        let setOrder = 0;
        for (const b of w.blocks) {
          for (const s of b.sets) {
            setOrder++;
            setRows.push({
              workout_id: templateId,
              user_id: null,
              set_order: setOrder,
              exercise_id: exerciseIds[s.exercise],
              block_label: b.label,
              set_type: s.set_type ?? "working",
              planned_reps: s.planned_reps ?? null,
              planned_weight: s.planned_weight ?? null,
              planned_tempo: s.planned_tempo ?? null,
              planned_rpe: s.planned_rpe ?? null,
              planned_rir: s.planned_rir ?? null,
              planned_rest_seconds: s.planned_rest_seconds ?? 0,
              planned_duration_seconds: s.planned_duration_seconds ?? null,
              coaching_cue_override: s.coaching_cue_override ?? null,
            });
          }
        }
        const { error: setsErr } = await sb.from("workout_sets").insert(setRows);
        if (setsErr) throw new Error(`tpl sets: ${setsErr.message}`);
        console.log(`  ✓ tpl ${ctx} → ${templateId.slice(0, 8)} (${setRows.length} sets)`);
      }
    }

    // 2. Athlete instances
    for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
      const { data: existing } = await sb
        .from("workouts")
        .select("id")
        .eq("user_id", uid)
        .eq("scheduled_date", w.scheduled_date)
        .maybeSingle();
      if (existing) {
        summary.instSkipped++;
        continue;
      }
      if (dryRun) {
        summary.instCreated++;
        continue;
      }
      const { data: prog } = await sb
        .from("programs")
        .select("id")
        .eq("user_id", uid)
        .eq("is_active", true)
        .maybeSingle();
      if (!prog) {
        console.log(`    · ${name}: no program activo, skip`);
        continue;
      }
      const { data: instW, error: instErr } = await sb
        .from("workouts")
        .insert({
          program_id: prog.id,
          user_id: uid,
          scheduled_date: w.scheduled_date,
          week_number: w.week_number,
          day_label: w.day_label,
          workout_type: w.workout_type || "strength",
          estimated_duration: w.estimated_duration,
          is_completed: false,
          is_rest_day: false,
          coach_note: w.coach_note,
          short_on_time_note: w.short_on_time_note,
          mesocycle_id: null,
        })
        .select("id")
        .single();
      if (instErr) throw new Error(`instance ${name}: ${instErr.message}`);

      // Sets
      const setRows = [];
      let setOrder = 0;
      for (const b of w.blocks) {
        for (const s of b.sets) {
          setOrder++;
          setRows.push({
            workout_id: instW.id,
            user_id: uid,
            set_order: setOrder,
            exercise_id: exerciseIds[s.exercise],
            block_label: b.label,
            set_type: s.set_type ?? "working",
            planned_reps: s.planned_reps ?? null,
            planned_weight: s.planned_weight ?? null,
            planned_tempo: s.planned_tempo ?? null,
            planned_rpe: s.planned_rpe ?? null,
            planned_rir: s.planned_rir ?? null,
            planned_rest_seconds: s.planned_rest_seconds ?? 0,
            planned_duration_seconds: s.planned_duration_seconds ?? null,
            coaching_cue_override: s.coaching_cue_override ?? null,
          });
        }
      }
      const { error: setsErr } = await sb.from("workout_sets").insert(setRows);
      if (setsErr) throw new Error(`instance ${name} sets: ${setsErr.message}`);
      summary.instCreated++;
    }
  } catch (e) {
    summary.errors.push(`${ctx}: ${e.message}`);
    console.error(`  ✗ ${ctx}: ${e.message}`);
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────────────────────────────────────`);
console.log(`  Templates: created ${summary.tplCreated}, skipped ${summary.tplSkipped}`);
console.log(`  Instances: created ${summary.instCreated}, skipped ${summary.instSkipped}`);
if (summary.errors.length) {
  console.log(`  Errors: ${summary.errors.length}`);
  for (const e of summary.errors) console.log(`    ✗ ${e}`);
  process.exit(1);
} else if (dryRun) {
  console.log(`\n[dry-run completo · no se tocó la DB]`);
} else {
  console.log(`\n✓ Apply completo`);
}
