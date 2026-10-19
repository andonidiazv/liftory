/**
 * M1 · full export a JSON estructurado (para consumir en HTML builder).
 * Un solo objeto: { weeks: [ { week, days: [ { day_label, blocks: [ { name, sets: [...] } ] } ] } ] }
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
import { writeFileSync } from "fs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

const { data: workouts } = await sb.from("workouts")
  .select("id, scheduled_date, week_number, day_label, workout_type, is_rest_day, estimated_duration, coach_note")
  .eq("user_id", ANDONI)
  .lt("scheduled_date", "2026-04-27")
  .order("scheduled_date", { ascending: true });

const meso = { name: "M1 · BUILD HIM ELITE", weeks: {} };

for (const w of workouts ?? []) {
  const wkKey = `W${w.week_number}`;
  if (!meso.weeks[wkKey]) meso.weeks[wkKey] = { week: w.week_number, days: [] };

  const dayObj = {
    date: w.scheduled_date,
    day_label: w.day_label,
    workout_type: w.workout_type,
    is_rest_day: w.is_rest_day,
    estimated_duration: w.estimated_duration,
    coach_note: w.coach_note,
    blocks: {},
  };

  if (!w.is_rest_day) {
    const { data: sets } = await sb.from("workout_sets")
      .select("set_order, block_label, set_type, planned_reps, planned_tempo, planned_rpe, planned_rest_seconds, planned_duration_seconds, coaching_cue_override, exercises:exercise_id(id, name)")
      .eq("workout_id", w.id)
      .order("set_order", { ascending: true });

    for (const s of sets ?? []) {
      const blk = s.block_label ?? "UNTAGGED";
      if (!dayObj.blocks[blk]) dayObj.blocks[blk] = { name: blk, sets: [] };
      dayObj.blocks[blk].sets.push({
        order: s.set_order,
        type: s.set_type,
        reps: s.planned_reps,
        tempo: s.planned_tempo,
        rpe: s.planned_rpe,
        rest_s: s.planned_rest_seconds,
        duration_s: s.planned_duration_seconds,
        cue: s.coaching_cue_override,
        exercise: s.exercises?.name,
      });
    }
  }

  meso.weeks[wkKey].days.push(dayObj);
}

const outPath = "/private/tmp/claude-501/-Users-andonidiazvidrio-Library-Mobile-Documents-com-apple-CloudDocs-Desktop-LIFTORY/fd5ef784-cb49-4973-a965-53195317e119/scratchpad/m1-full.json";
writeFileSync(outPath, JSON.stringify(meso, null, 2));

// Summary
let totalSets = 0;
for (const wk of Object.values(meso.weeks)) {
  for (const d of wk.days) {
    for (const b of Object.values(d.blocks)) totalSets += b.sets.length;
  }
}
console.log(`✓ ${Object.keys(meso.weeks).length} semanas · ${workouts.length} workouts · ${totalSets} sets total`);
console.log(`✓ Written to ${outPath}`);
