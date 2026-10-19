/**
 * M3 W2-W6 build · clona W1 templates con deltas por semana.
 *
 * Para cada (semana, día): clona template W1 a un nuevo template W{n} +
 * instancias para Andoni, César, Víctor. Aplica overrides específicos del
 * HTML proposal.
 *
 * Idempotente: si el workout ya existe en (user, scheduled_date), skip.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0";
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";

// ════════════════════════════════════════════════════════════════════════════
// Mapping: W1 templates por day_label (ya en DB)
// ════════════════════════════════════════════════════════════════════════════
const W1_TEMPLATES = {
  "DENSITY DAY":       { id: "4b8ae2ba-1539-45cd-ade0-606f6b5b9062", duration: 78 },
  "TEMPO DAY":         { id: "b26ab1a4-ba26-40eb-9ca9-9fea05410514", duration: 82 },
  "SKILL DAY":         { id: "15f06321-2e76-4507-843d-d25443717745", duration: 68 },
  "UPPER HYPERTROPHY": { id: "4aa9eefe-06c3-4cdc-a72a-8275309984d4", duration: 72 },
  "LOWER HYPERTROPHY": { id: "96c02bcd-2d61-452e-9562-d9be627fd9fc", duration: 85 },
};

// First-day dates por semana
const WEEK_FIRST = {
  2: "2026-06-15",
  3: "2026-06-22",
  4: "2026-06-29",
  5: "2026-07-06",
  6: "2026-07-13",
};

// Day offset desde Monday
const DAY_OFFSET = {
  "DENSITY DAY": 0,
  "TEMPO DAY": 1,
  "SKILL DAY": 2,
  "UPPER HYPERTROPHY": 4,
  "LOWER HYPERTROPHY": 5,
};

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════════════
// Resolve exercise IDs we override on
// ════════════════════════════════════════════════════════════════════════════
async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).single();
  return data.id;
}

const EX = {
  zPress: await exId("KB Alternating Z Press"),
  commando: await exId("Commando Pull-up"),
  iceCream: await exId("Ice Cream Maker"),
  gorillaRow: await exId("KB Gorilla Row"),
  inclineDbBench: await exId("Incline DB Bench Press"),
  csRow: await exId("Chest Supported DB Row"),
  bulgarian: await exId("Barbell Bulgarian Split Squat"),
  bStanceRdl: await exId("B-Stance Barbell RDL"),
};

// ════════════════════════════════════════════════════════════════════════════
// OVERRIDE FUNCTIONS
// Each takes (sets, week) → returns new sets array
// Sets come pre-sorted by set_order with all fields from W1
// ════════════════════════════════════════════════════════════════════════════

// Helper: clone a set with updates
function cloneSet(s, overrides = {}) {
  // Strip W1 id and metadata; keep only the data we want for new set
  const { id, workout_id, user_id, created_at, updated_at, ...rest } = s;
  return { ...rest, ...overrides };
}

// Helper: extend a block to N rounds by duplicating its existing template
// Assumes original block has reps = original rounds × exercises per round
// Strategy: take the first round (first N sets where N = exercises in block)
// and duplicate to reach the target round count.
function expandBlockRounds(sets, blockLabel, originalRounds, targetRounds) {
  if (targetRounds <= originalRounds) return sets;
  const blockSets = sets.filter(s => s.block_label === blockLabel);
  if (blockSets.length === 0) return sets;
  const exercisesPerRound = blockSets.length / originalRounds;
  if (!Number.isInteger(exercisesPerRound)) return sets; // bail safely
  const firstRound = blockSets.slice(0, exercisesPerRound);
  const extraRounds = targetRounds - originalRounds;
  const newSets = [...sets];
  for (let r = 0; r < extraRounds; r++) {
    for (const s of firstRound) newSets.push(cloneSet(s));
  }
  return newSets;
}

// Adjust planned_reps for sets matching exercise_id
function setReps(sets, exerciseId, newReps) {
  return sets.map(s => s.exercise_id === exerciseId ? { ...s, planned_reps: newReps } : s);
}

// Adjust planned_duration_seconds for sets matching exercise_id (and block)
function setDuration(sets, exerciseId, blockLabel, newDuration) {
  return sets.map(s =>
    s.exercise_id === exerciseId && s.block_label === blockLabel
      ? { ...s, planned_duration_seconds: newDuration }
      : s
  );
}

// Drop a block entirely
function dropBlock(sets, blockLabel) {
  return sets.filter(s => s.block_label !== blockLabel);
}

// ════════════════════════════════════════════════════════════════════════════
// OVERRIDE TABLE — what each week × day does to its W1 sets
// ════════════════════════════════════════════════════════════════════════════

const OVERRIDES = {
  // ─── W2 BASE+ · misma estructura, más volumen ───
  2: {
    "DENSITY DAY": (sets) => {
      let s = sets;
      s = setReps(s, EX.zPress, 9);                                  // Z Press 8 → 9
      s = expandBlockRounds(s, "HYPERTROPHY BLOCK", 3, 4);            // 3 → 4 rondas
      s = expandBlockRounds(s, "SKILL PUSH", 3, 4);                   // 3 → 4 sets
      // Hollow Body Hold: 30s → 35s
      const hollowId = sets.find(x => x.block_label === "CORE BLOCK" && (x.planned_duration_seconds ?? 0) > 0)?.exercise_id;
      if (hollowId) s = setDuration(s, hollowId, "CORE BLOCK", 35);
      return s;
    },
    "TEMPO DAY": (sets) => {
      let s = sets;
      // Smith HT iso: si tiene cue mencionando "iso 10s" hay que actualizar a "iso 12s"
      s = s.map(x => {
        if (x.block_label !== "HEAVY B") return x;
        const cue = x.coaching_cue_override || "";
        return { ...x, coaching_cue_override: cue.replace("iso 10s", "iso 12s") };
      });
      // Nordic 3×4 → 3×5
      s = s.map(x => x.block_label === "TENDÓN" && x.planned_reps === 4 ? { ...x, planned_reps: 5 } : x);
      // 45° Hip Ext 4×10 → 4×12
      s = s.map(x => x.block_label === "POSTERIOR CHAIN" && x.planned_reps === 10 ? { ...x, planned_reps: 12 } : x);
      return s;
    },
    "SKILL DAY": (sets) => {
      let s = sets;
      // Lat Vol: 3 rondas (6 sets) → 4 rondas (8 sets)
      s = expandBlockRounds(s, "LAT VOLUME", 3, 4);
      // Pull Power: 4×6 → 4×7
      s = s.map(x => x.block_label === "PULL POWER" ? { ...x, planned_reps: 7 } : x);
      // MU Burpee cap 12 → 10 min
      s = s.map(x => {
        if (x.block_label !== "SKILL B") return x;
        const cue = (x.coaching_cue_override || "").replace("cap 12 min", "cap 10 min").replace("cap 12'", "cap 10'");
        return { ...x, coaching_cue_override: cue, planned_duration_seconds: 600 };
      });
      return s;
    },
    "UPPER HYPERTROPHY": (sets) => {
      let s = sets;
      // Shoulder 3D rep: 12 → 14
      s = s.map(x => x.block_label === "SHOULDER 3D" ? { ...x, planned_reps: 14 } : x);
      // Strength Compound: Weighted Dip 3×6 → 3×8 misma carga
      s = s.map(x => x.block_label === "STRENGTH COMPOUND" ? { ...x, planned_reps: 8 } : x);
      return s;
    },
    "LOWER HYPERTROPHY": (sets) => {
      let s = sets;
      // Bulgarian: +carga (RPE sube de 7.5 → 8 en últimos sets), reps mismas
      // No structural change. Solo ajusto RPE en sets más tarde de Bulgarian
      s = s.map((x, i) => {
        if (x.block_label !== "HEAVY A") return x;
        return { ...x, planned_rpe: 8 };
      });
      // B-Stance RDL: 3 sets → 4 sets, mismas reps
      s = expandBlockRounds(s, "HEAVY B", 3, 4);
      // Walking Lunges: 12/lado → 14/lado
      s = s.map(x => x.block_label === "GLUTE VOLUME" ? { ...x, planned_reps: 14 } : x);
      // Sled Push: 3 → 4 sets
      s = expandBlockRounds(s, "LEG ENGINE", 3, 4);
      // Farmer Hold: 45s → 50s
      s = s.map(x => {
        if (x.block_label === "CALF + CARRY" && x.planned_duration_seconds === 45) {
          return { ...x, planned_duration_seconds: 50, coaching_cue_override: "50s hold · DBs más pesadas · postura erguida, hombros atrás" };
        }
        return x;
      });
      return s;
    },
  },

  // ─── W3 ACUMULACIÓN · volumen pico ───
  3: {
    "DENSITY DAY": (sets) => {
      let s = sets;
      // Density A 12' → 14' EMOM. Add 2 more sets each exercise → from 12 sets (6+6) to 14 sets (7+7)
      // Cue: change "EMOM 60s | 6R x 2V" → "EMOM 60s | 7R x 2V" and reps 9 → 10
      const zSets = s.filter(x => x.block_label === "DENSITY BLOCK A" && x.exercise_id === EX.zPress);
      const cSets = s.filter(x => x.block_label === "DENSITY BLOCK A" && x.exercise_id === EX.commando);
      if (zSets.length === 6) {
        s = [...s, cloneSet(zSets[0]), cloneSet(cSets[0])];
      }
      s = s.map(x => {
        if (x.block_label === "DENSITY BLOCK A") {
          const cue = (x.coaching_cue_override || "")
            .replace("6R x 2V", "7R x 2V")
            .replace("8 por lado", "10 por lado")
            .replace("8/lado", "10/lado");
          const newReps = x.exercise_id === EX.zPress ? 10 : 10;
          return { ...x, planned_reps: newReps, coaching_cue_override: cue };
        }
        return x;
      });
      // Hypertrophy: 4 rondas × 15 reps
      s = expandBlockRounds(s, "HYPERTROPHY BLOCK", 3, 4);
      s = s.map(x => x.block_label === "HYPERTROPHY BLOCK" ? { ...x, planned_reps: 15 } : x);
      // Skill Push: 5 sets
      s = expandBlockRounds(s, "SKILL PUSH", 3, 5);
      // Arm Block: subir reps a 15 y 12
      s = s.map(x => {
        if (x.block_label !== "ARM BLOCK") return x;
        return { ...x, planned_reps: x.planned_reps === 12 ? 15 : 12 };
      });
      // Hollow Body 40s
      const hollowId = sets.find(x => x.block_label === "CORE BLOCK" && (x.planned_duration_seconds ?? 0) > 0)?.exercise_id;
      if (hollowId) s = setDuration(s, hollowId, "CORE BLOCK", 40);
      return s;
    },
    "TEMPO DAY": (sets) => {
      let s = sets;
      // Front Squat 4×10 50-55% → 4×12 60%. Reps 10 → 12
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 12 } : x);
      // Smith HT 4×(8+iso) → 5×8+iso 15s. Add 1 set.
      s = expandBlockRounds(s, "HEAVY B", 4, 5);
      s = s.map(x => {
        if (x.block_label !== "HEAVY B") return x;
        const cue = (x.coaching_cue_override || "").replace("iso 10s", "iso 15s").replace("iso 12s", "iso 15s");
        return { ...x, coaching_cue_override: cue };
      });
      // Reverse Sit Up: 8-10 → 12
      // Lateral Plank Din: 12 → 16
      s = s.map(x => {
        if (x.block_label !== "CORE BLOCK") return x;
        if (x.planned_reps === 8 || x.planned_reps === 10) return { ...x, planned_reps: 12 };
        if (x.planned_reps === 12) return { ...x, planned_reps: 16 };
        return x;
      });
      // Nordic 3×4 → 4×5
      s = expandBlockRounds(s, "TENDÓN", 3, 4);
      s = s.map(x => x.block_label === "TENDÓN" ? { ...x, planned_reps: 5 } : x);
      // 45° Hip Ext 4×10 → 5×10
      s = expandBlockRounds(s, "POSTERIOR CHAIN", 4, 5);
      return s;
    },
    "SKILL DAY": (sets) => {
      let s = sets;
      // KB Complex 3×5 KB pesada (mismo formato, cue update)
      // MU Burpee 50 reps cap 12'
      s = s.map(x => {
        if (x.block_label !== "SKILL B") return x;
        const cue = (x.coaching_cue_override || "")
          .replace("40 MU Burpees", "50 MU Burpees")
          .replace("40 reps", "50 reps");
        return { ...x, planned_reps: 50, coaching_cue_override: cue };
      });
      // Lat Vol 4 rondas, reps 12→15, 20→24
      s = expandBlockRounds(s, "LAT VOLUME", 3, 4);
      s = s.map(x => {
        if (x.block_label !== "LAT VOLUME") return x;
        if (x.exercise_id === EX.iceCream) return { ...x, planned_reps: 15 };
        if (x.exercise_id === EX.gorillaRow) return { ...x, planned_reps: 12 }; // 12/lado = 24 totales
        return x;
      });
      // Pull Power 5×6
      s = expandBlockRounds(s, "PULL POWER", 4, 5);
      s = s.map(x => x.block_label === "PULL POWER" ? { ...x, planned_reps: 6 } : x);
      return s;
    },
    "UPPER HYPERTROPHY": (sets) => {
      let s = sets;
      // Heavy Push 4×10 → 4×12
      s = s.map(x => x.block_label === "HEAVY PUSH" ? { ...x, planned_reps: 12 } : x);
      // Heavy Pull 4×10 → 4×12
      s = s.map(x => x.block_label === "HEAVY PULL" ? { ...x, planned_reps: 12 } : x);
      // Shoulder 3D 3 → 4 rondas
      s = expandBlockRounds(s, "SHOULDER 3D", 3, 4);
      // Arm Superset 3 → 4 rondas
      s = expandBlockRounds(s, "ARM SUPERSET", 3, 4);
      // Weighted Dip 3×6 → 4×6 +carga
      s = expandBlockRounds(s, "STRENGTH COMPOUND", 3, 4);
      return s;
    },
    "LOWER HYPERTROPHY": (sets) => {
      let s = sets;
      // Bulgarian 4×8/lado → 4×10/lado
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 10 } : x);
      // B-Stance RDL 4×8 → 4×10
      s = expandBlockRounds(s, "HEAVY B", 3, 4);
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 10 } : x);
      // Walking Lunges 3×12/lado → 4×12/lado
      s = expandBlockRounds(s, "GLUTE VOLUME", 3, 4);
      // Sled Push 3 → 4×30m (just count change, distance is in cue)
      s = expandBlockRounds(s, "LEG ENGINE", 3, 4);
      s = s.map(x => {
        if (x.block_label !== "LEG ENGINE") return x;
        const cue = (x.coaching_cue_override || "").replace("25m", "30m");
        return { ...x, coaching_cue_override: cue };
      });
      // Calf 15 → 18 reps · Farmer Hold 50 → 55s
      s = s.map(x => {
        if (x.block_label !== "CALF + CARRY") return x;
        if ((x.planned_duration_seconds ?? 0) > 0) {
          return { ...x, planned_duration_seconds: 55, coaching_cue_override: "55s hold · DBs pesadas · postura erguida, hombros atrás" };
        }
        if (x.planned_reps === 15) return { ...x, planned_reps: 18 };
        return x;
      });
      return s;
    },
  },

  // ─── W4 INTENSIFICACIÓN · carga sube, volumen baja ───
  4: {
    "DENSITY DAY": (sets) => {
      let s = sets;
      // Density A: KB top peso, back to 12' (6R x 2V)
      // Reps mismas 10/lado y 10
      s = s.map(x => {
        if (x.block_label === "DENSITY BLOCK A") {
          const cue = (x.coaching_cue_override || "").replace("RPE 9", "RPE 9.5");
          return { ...x, planned_reps: x.exercise_id === EX.zPress ? 10 : 10, coaching_cue_override: cue };
        }
        return x;
      });
      // Hypertrophy 4×10 más peso (era 4×15 en W3 → bajamos reps, subimos peso)
      s = s.map(x => x.block_label === "HYPERTROPHY BLOCK" ? { ...x, planned_reps: 10, planned_rpe: 9 } : x);
      // Skill Push 5×6 +peso
      s = expandBlockRounds(s, "SKILL PUSH", 3, 5);
      s = s.map(x => {
        if (x.block_label !== "SKILL PUSH") return x;
        if (x.planned_reps === 8) return { ...x, planned_reps: 6, planned_rpe: 9 };
        return x;
      });
      // Arm Block 4×(10+8) más peso
      s = s.map(x => {
        if (x.block_label !== "ARM BLOCK") return x;
        return { ...x, planned_reps: x.planned_reps === 12 ? 10 : 8, planned_rpe: 9 };
      });
      // Hollow Body 45s
      const hollowId = sets.find(x => x.block_label === "CORE BLOCK" && (x.planned_duration_seconds ?? 0) > 0)?.exercise_id;
      if (hollowId) s = setDuration(s, hollowId, "CORE BLOCK", 45);
      return s;
    },
    "TEMPO DAY": (sets) => {
      let s = sets;
      // Front Squat 5×6 70% RPE 9
      s = expandBlockRounds(s, "HEAVY A", 4, 5);
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // Smith HT 5×6 RPE 9
      s = expandBlockRounds(s, "HEAVY B", 4, 5);
      s = s.map(x => {
        if (x.block_label !== "HEAVY B") return x;
        const cue = (x.coaching_cue_override || "").replace(/iso \d+s/, "iso 15s");
        return { ...x, planned_reps: 6, planned_rpe: 9, coaching_cue_override: cue };
      });
      // Reverse Sit Up: 3×10 lento
      s = s.map(x => {
        if (x.block_label !== "CORE BLOCK") return x;
        if (x.planned_reps === 10 || x.planned_reps === 12 || x.planned_reps === 16) return { ...x, planned_reps: 10 };
        return x;
      });
      // Nordic 4×3 ecc 6s
      s = expandBlockRounds(s, "TENDÓN", 3, 4);
      s = s.map(x => {
        if (x.block_label !== "TENDÓN") return x;
        const cue = (x.coaching_cue_override || "").replace("5s ecc", "6s ecc").replace("ecc 5s", "ecc 6s");
        return { ...x, planned_reps: 3, coaching_cue_override: cue };
      });
      // 45° Hip Ext 5×8 +carga
      s = expandBlockRounds(s, "POSTERIOR CHAIN", 4, 5);
      s = s.map(x => x.block_label === "POSTERIOR CHAIN" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      return s;
    },
    "SKILL DAY": (sets) => {
      let s = sets;
      // KB Complex KB top
      // MU Burpee → EMOM 10 min: change to working with duration 600 and cue
      s = s.map(x => {
        if (x.block_label !== "SKILL B") return x;
        return {
          ...x,
          set_type: "working",
          planned_reps: 40,
          planned_duration_seconds: 600,
          coaching_cue_override: "EMOM 10 min · 4 MU Burpees por minuto · 40 reps totales · cierre de density skill · cualquier regresión válida",
        };
      });
      // Lat Vol 4 rondas, IC 10, Gorilla 10/lado (=20)
      s = expandBlockRounds(s, "LAT VOLUME", 3, 4);
      s = s.map(x => {
        if (x.block_label !== "LAT VOLUME") return x;
        if (x.exercise_id === EX.iceCream) return { ...x, planned_reps: 10, planned_rpe: 9 };
        if (x.exercise_id === EX.gorillaRow) return { ...x, planned_reps: 10, planned_rpe: 9 };
        return x;
      });
      // Pull Power 5×4 carga
      s = expandBlockRounds(s, "PULL POWER", 4, 5);
      s = s.map(x => x.block_label === "PULL POWER" ? { ...x, planned_reps: 4, planned_rpe: 9 } : x);
      // Arm 3 rondas más peso (sin cambio estructural)
      return s;
    },
    "UPPER HYPERTROPHY": (sets) => {
      let s = sets;
      // Heavy Push 5×8 +peso
      s = expandBlockRounds(s, "HEAVY PUSH", 4, 5);
      s = s.map(x => x.block_label === "HEAVY PUSH" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      // Heavy Pull 5×8 +peso
      s = expandBlockRounds(s, "HEAVY PULL", 4, 5);
      s = s.map(x => x.block_label === "HEAVY PULL" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      // Shoulder 3D mantain 3, +peso (RPE 9)
      s = s.map(x => x.block_label === "SHOULDER 3D" ? { ...x, planned_reps: 10, planned_rpe: 9 } : x);
      // Arm Superset 3 rondas más peso
      s = s.map(x => x.block_label === "ARM SUPERSET" ? { ...x, planned_rpe: 9 } : x);
      // Weighted Dip 4×8 +carga
      s = expandBlockRounds(s, "STRENGTH COMPOUND", 3, 4);
      s = s.map(x => x.block_label === "STRENGTH COMPOUND" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      return s;
    },
    "LOWER HYPERTROPHY": (sets) => {
      let s = sets;
      // Bulgarian 5×6 +peso
      s = expandBlockRounds(s, "HEAVY A", 4, 5);
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // B-Stance RDL 4×6 RPE 8.5
      s = expandBlockRounds(s, "HEAVY B", 3, 4);
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 6, planned_rpe: 8.5 } : x);
      // Walking Lunges 3×10 +peso
      s = s.map(x => x.block_label === "GLUTE VOLUME" ? { ...x, planned_reps: 10, planned_rpe: 9 } : x);
      // Sled Push 4×25m +carga
      s = expandBlockRounds(s, "LEG ENGINE", 3, 4);
      // Calf 15 reps · Farmer Hold 60s top peso
      s = s.map(x => {
        if (x.block_label !== "CALF + CARRY") return x;
        if ((x.planned_duration_seconds ?? 0) > 0) {
          return { ...x, planned_duration_seconds: 60, coaching_cue_override: "60s hold · DBs top peso · postura erguida, hombros atrás · si pierdes postura, peso muy alto" };
        }
        if (x.planned_reps === 15 || x.planned_reps === 18) return { ...x, planned_reps: 15 };
        return x;
      });
      return s;
    },
  },

  // ─── W5 PEAK · top intensidad · 1 test honesto por día ───
  5: {
    "DENSITY DAY": (sets) => {
      let s = sets;
      // Density A: TEST max reps in 12' EMOM
      s = s.map(x => {
        if (x.block_label !== "DENSITY BLOCK A") return x;
        return {
          ...x,
          coaching_cue_override: "TEST · EMOM 60s | 6R x 2V · MAX REPS por minuto · alterna Z Press y Commando · KB top peso · scoring por reps totales",
        };
      });
      // Hypertrophy 5×8 peak
      s = expandBlockRounds(s, "HYPERTROPHY BLOCK", 3, 5);
      s = s.map(x => x.block_label === "HYPERTROPHY BLOCK" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      // Skill Push 4×5 RPE 9
      s = expandBlockRounds(s, "SKILL PUSH", 3, 4);
      s = s.map(x => {
        if (x.block_label !== "SKILL PUSH") return x;
        if (x.planned_reps === 8) return { ...x, planned_reps: 5, planned_rpe: 9 };
        return x;
      });
      // Arm Block 4×6 RPE 9
      s = s.map(x => x.block_label === "ARM BLOCK" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // Hollow Body 45s
      const hollowId = sets.find(x => x.block_label === "CORE BLOCK" && (x.planned_duration_seconds ?? 0) > 0)?.exercise_id;
      if (hollowId) s = setDuration(s, hollowId, "CORE BLOCK", 45);
      return s;
    },
    "TEMPO DAY": (sets) => {
      let s = sets;
      // Front Squat 4×5 RPE 9 (test top)
      s = s.map(x => {
        if (x.block_label !== "HEAVY A") return x;
        const cue = (x.coaching_cue_override || "") + " · TEST peak: 4×5 RPE 9";
        return { ...x, planned_reps: 5, planned_rpe: 9, coaching_cue_override: cue };
      });
      // Smith HT 4×5 pesado
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 5, planned_rpe: 9 } : x);
      // Reverse Sit Up 3×8 lento
      s = s.map(x => {
        if (x.block_label !== "CORE BLOCK") return x;
        if (x.planned_reps === 10 || x.planned_reps === 12) return { ...x, planned_reps: 8 };
        return x;
      });
      // Nordic 3×2 técnico
      s = s.map(x => x.block_label === "TENDÓN" ? { ...x, planned_reps: 2 } : x);
      // 45° Hip Ext 4×6 RPE 9
      s = s.map(x => x.block_label === "POSTERIOR CHAIN" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      return s;
    },
    "SKILL DAY": (sets) => {
      let s = sets;
      // KB Complex 3×4 técnica top
      s = s.map(x => x.block_label === "SKILL A" ? { ...x, planned_reps: 4 } : x);
      // MU Burpee TEST 40 reps SUB-12 min
      s = s.map(x => {
        if (x.block_label !== "SKILL B") return x;
        const cue = (x.coaching_cue_override || "")
          .replace("EMOM 10 min · 4 MU Burpees por minuto · 40 reps totales · cierre de density skill · cualquier regresión válida", "TEST · FOR TIME · cap 12 min · 40 MU Burpees · objetivo SUB-12 min · 1 rep = burpee → jump-to-bar → Muscle-Up")
          .replace("FOR TIME · cap 12 min", "TEST · FOR TIME · cap 12 min")
          .replace("cap 10 min", "cap 12 min")
          .replace("cap 10'", "cap 12'");
        return {
          ...x,
          set_type: "working",
          planned_reps: 40,
          planned_duration_seconds: 720,
          coaching_cue_override: cue.includes("TEST") ? cue : "TEST · FOR TIME · cap 12 min · 40 MU Burpees · objetivo SUB-12 min · scoring por tiempo final",
        };
      });
      // Lat Vol 4×8 peak
      s = expandBlockRounds(s, "LAT VOLUME", 3, 4);
      s = s.map(x => x.block_label === "LAT VOLUME" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      // Pull Power 4×3 RPE 9.5
      s = s.map(x => x.block_label === "PULL POWER" ? { ...x, planned_reps: 3, planned_rpe: 9.5 } : x);
      return s;
    },
    "UPPER HYPERTROPHY": (sets) => {
      let s = sets;
      // Incline DB Bench 4×6 RPE 9
      s = s.map(x => x.block_label === "HEAVY PUSH" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // CS Row 4×6
      s = s.map(x => x.block_label === "HEAVY PULL" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // Shoulder 3D mantain · más peso
      s = s.map(x => x.block_label === "SHOULDER 3D" ? { ...x, planned_rpe: 9 } : x);
      // Arm Superset 3×6 RPE 9
      s = s.map(x => x.block_label === "ARM SUPERSET" ? { ...x, planned_reps: 6, planned_rpe: 9 } : x);
      // Weighted Dip TEST 3×5 RPE 9 max peso
      s = s.map(x => {
        if (x.block_label !== "STRENGTH COMPOUND") return x;
        return {
          ...x,
          planned_reps: 5,
          planned_rpe: 9,
          coaching_cue_override: "TEST · 3×5 RPE 9 · MAX PESO posible · cinturón de dip + lastre · si rompe técnica, baja carga 5%",
        };
      });
      return s;
    },
    "LOWER HYPERTROPHY": (sets) => {
      let s = sets;
      // Bulgarian 4×5 RPE 9 pesado
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 5, planned_rpe: 9 } : x);
      // B-Stance RDL 3×5 RPE 9
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 5, planned_rpe: 9 } : x);
      // Walking Lunges 3×8 top carga
      s = s.map(x => x.block_label === "GLUTE VOLUME" ? { ...x, planned_reps: 8, planned_rpe: 9 } : x);
      // Sled 5×20m sprint
      s = expandBlockRounds(s, "LEG ENGINE", 3, 5);
      s = s.map(x => {
        if (x.block_label !== "LEG ENGINE") return x;
        const cue = (x.coaching_cue_override || "").replace(/25m/g, "20m sprint");
        return { ...x, coaching_cue_override: cue.includes("sprint") ? cue : cue + " · sprint" };
      });
      // Calf 12 reps · Farmer Hold 60s peak
      s = s.map(x => {
        if (x.block_label !== "CALF + CARRY") return x;
        if ((x.planned_duration_seconds ?? 0) > 0) return { ...x, planned_duration_seconds: 60 };
        if (x.planned_reps >= 12) return { ...x, planned_reps: 12, planned_rpe: 9 };
        return x;
      });
      return s;
    },
  },

  // ─── W6 DELOAD · CNS recovery real · 60% intensidad · -30% volumen ───
  6: {
    "DENSITY DAY": (sets) => {
      let s = sets;
      // Density A 8 min · 60%
      const zSets = s.filter(x => x.block_label === "DENSITY BLOCK A" && x.exercise_id === EX.zPress);
      const cSets = s.filter(x => x.block_label === "DENSITY BLOCK A" && x.exercise_id === EX.commando);
      // Reduce density to 4R x 2V = 8 sets total = 4 of each. Drop 2 from each.
      const targetCount = 4;
      const zToKeep = zSets.slice(0, targetCount).map(x => x.id);
      const cToKeep = cSets.slice(0, targetCount).map(x => x.id);
      s = s.filter(x => {
        if (x.block_label !== "DENSITY BLOCK A") return true;
        if (x.exercise_id === EX.zPress) return zToKeep.includes(x.id);
        if (x.exercise_id === EX.commando) return cToKeep.includes(x.id);
        return true;
      });
      s = s.map(x => {
        if (x.block_label !== "DENSITY BLOCK A") return x;
        return {
          ...x,
          planned_reps: x.exercise_id === EX.zPress ? 6 : 6,
          coaching_cue_override: "DELOAD · EMOM 60s | 4R x 2V · 60% carga · Z Press 6/lado, Commando 6 · técnica primero",
        };
      });
      // Hypertrophy 2×10 light
      const hyperSets = s.filter(x => x.block_label === "HYPERTROPHY BLOCK");
      const hyperToKeep = hyperSets.slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "HYPERTROPHY BLOCK" || hyperToKeep.includes(x.id));
      s = s.map(x => x.block_label === "HYPERTROPHY BLOCK" ? { ...x, planned_reps: 10, planned_rpe: 6 } : x);
      // Skill Push 2×8 light
      const spSets = s.filter(x => x.block_label === "SKILL PUSH");
      const spToKeep = spSets.slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "SKILL PUSH" || spToKeep.includes(x.id));
      s = s.map(x => x.block_label === "SKILL PUSH" ? { ...x, planned_reps: 8, planned_rpe: 6 } : x);
      // Arm Block 2×10 light
      const armSets = s.filter(x => x.block_label === "ARM BLOCK");
      const armToKeep = armSets.slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "ARM BLOCK" || armToKeep.includes(x.id));
      s = s.map(x => x.block_label === "ARM BLOCK" ? { ...x, planned_reps: 10, planned_rpe: 6 } : x);
      // Core 2 rondas, holds 30s
      const coreSets = s.filter(x => x.block_label === "CORE BLOCK");
      const coreToKeep = coreSets.slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "CORE BLOCK" || coreToKeep.includes(x.id));
      const hollowId = sets.find(x => x.block_label === "CORE BLOCK" && (x.planned_duration_seconds ?? 0) > 0)?.exercise_id;
      if (hollowId) s = setDuration(s, hollowId, "CORE BLOCK", 30);
      return s;
    },
    "TEMPO DAY": (sets) => {
      let s = sets;
      // Front Squat 3×6 60%
      const haSets = s.filter(x => x.block_label === "HEAVY A").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "HEAVY A" || haSets.includes(x.id));
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 6, planned_rpe: 6 } : x);
      // Smith HT 3×8 60%
      const hbSets = s.filter(x => x.block_label === "HEAVY B").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "HEAVY B" || hbSets.includes(x.id));
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 8, planned_rpe: 6 } : x);
      // Core 2 rondas
      const coreSets = s.filter(x => x.block_label === "CORE BLOCK");
      const coreToKeep = coreSets.slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "CORE BLOCK" || coreToKeep.includes(x.id));
      // Nordic SKIP
      s = dropBlock(s, "TENDÓN");
      // 45° Hip Ext 3×10 light
      const pcSets = s.filter(x => x.block_label === "POSTERIOR CHAIN").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "POSTERIOR CHAIN" || pcSets.includes(x.id));
      s = s.map(x => x.block_label === "POSTERIOR CHAIN" ? { ...x, planned_rpe: 6 } : x);
      return s;
    },
    "SKILL DAY": (sets) => {
      let s = sets;
      // KB Complex 2×3 light
      const skillASets = s.filter(x => x.block_label === "SKILL A").slice(0, 2).map(x => x.id);
      s = s.filter(x => x.block_label !== "SKILL A" || skillASets.includes(x.id));
      s = s.map(x => x.block_label === "SKILL A" ? { ...x, planned_reps: 3, planned_rpe: 6 } : x);
      // MU Burpee skip o 15 reps light → 15 reps For Time cap 8 min
      s = s.map(x => {
        if (x.block_label !== "SKILL B") return x;
        return {
          ...x,
          set_type: "working",
          planned_reps: 15,
          planned_duration_seconds: 480,
          coaching_cue_override: "DELOAD · FOR TIME · cap 8 min · 15 MU Burpees light · técnica primero · si te sientes cansado, skip · 1 rep = burpee → jump-to-bar → Muscle-Up (o regresión)",
        };
      });
      // Lat Vol 2 rondas
      const lvSets = s.filter(x => x.block_label === "LAT VOLUME").slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "LAT VOLUME" || lvSets.includes(x.id));
      s = s.map(x => x.block_label === "LAT VOLUME" ? { ...x, planned_rpe: 6 } : x);
      // Pull Power 3×6 60%
      const ppSets = s.filter(x => x.block_label === "PULL POWER").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "PULL POWER" || ppSets.includes(x.id));
      s = s.map(x => x.block_label === "PULL POWER" ? { ...x, planned_reps: 6, planned_rpe: 6 } : x);
      // Arm 2 rondas
      const armSets = s.filter(x => x.block_label === "ARM BLOCK").slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "ARM BLOCK" || armSets.includes(x.id));
      s = s.map(x => x.block_label === "ARM BLOCK" ? { ...x, planned_rpe: 6 } : x);
      return s;
    },
    "UPPER HYPERTROPHY": (sets) => {
      let s = sets;
      // Heavy Push 3×8 60%
      const hpSets = s.filter(x => x.block_label === "HEAVY PUSH").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "HEAVY PUSH" || hpSets.includes(x.id));
      s = s.map(x => x.block_label === "HEAVY PUSH" ? { ...x, planned_reps: 8, planned_rpe: 6 } : x);
      // Heavy Pull 3×8 60%
      const hPullSets = s.filter(x => x.block_label === "HEAVY PULL").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "HEAVY PULL" || hPullSets.includes(x.id));
      s = s.map(x => x.block_label === "HEAVY PULL" ? { ...x, planned_reps: 8, planned_rpe: 6 } : x);
      // Shoulder 3D 2 rondas
      const sh3dSets = s.filter(x => x.block_label === "SHOULDER 3D").slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "SHOULDER 3D" || sh3dSets.includes(x.id));
      s = s.map(x => x.block_label === "SHOULDER 3D" ? { ...x, planned_rpe: 6 } : x);
      // Arm Superset 2 rondas
      const asSets = s.filter(x => x.block_label === "ARM SUPERSET").slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "ARM SUPERSET" || asSets.includes(x.id));
      s = s.map(x => x.block_label === "ARM SUPERSET" ? { ...x, planned_rpe: 6 } : x);
      // Weighted Dip 2×5 BW
      const scSets = s.filter(x => x.block_label === "STRENGTH COMPOUND").slice(0, 2).map(x => x.id);
      s = s.filter(x => x.block_label !== "STRENGTH COMPOUND" || scSets.includes(x.id));
      s = s.map(x => {
        if (x.block_label !== "STRENGTH COMPOUND") return x;
        return { ...x, planned_reps: 5, planned_rpe: 6, coaching_cue_override: "DELOAD · 2×5 bodyweight · sin lastre · pecho ligeramente inclinado adelante" };
      });
      return s;
    },
    "LOWER HYPERTROPHY": (sets) => {
      let s = sets;
      // Bulgarian 3×6 60%
      const haSets = s.filter(x => x.block_label === "HEAVY A").slice(0, 3).map(x => x.id);
      s = s.filter(x => x.block_label !== "HEAVY A" || haSets.includes(x.id));
      s = s.map(x => x.block_label === "HEAVY A" ? { ...x, planned_reps: 6, planned_rpe: 6 } : x);
      // B-Stance RDL 3×6 60%
      s = s.map(x => x.block_label === "HEAVY B" ? { ...x, planned_reps: 6, planned_rpe: 6 } : x);
      // Walking Lunges 2×10 light
      const gvSets = s.filter(x => x.block_label === "GLUTE VOLUME").slice(0, 2).map(x => x.id);
      s = s.filter(x => x.block_label !== "GLUTE VOLUME" || gvSets.includes(x.id));
      s = s.map(x => x.block_label === "GLUTE VOLUME" ? { ...x, planned_reps: 10, planned_rpe: 6 } : x);
      // Sled SKIP
      s = dropBlock(s, "LEG ENGINE");
      // Calf 2 rondas · Farmer Hold 30s
      const ccSets = s.filter(x => x.block_label === "CALF + CARRY").slice(0, 4).map(x => x.id);
      s = s.filter(x => x.block_label !== "CALF + CARRY" || ccSets.includes(x.id));
      s = s.map(x => {
        if (x.block_label !== "CALF + CARRY") return x;
        if ((x.planned_duration_seconds ?? 0) > 0) {
          return { ...x, planned_duration_seconds: 30, coaching_cue_override: "DELOAD · 30s hold · DBs moderadas · postura erguida" };
        }
        return { ...x, planned_rpe: 6 };
      });
      return s;
    },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CLONE & CREATE: para cada semana, día, atleta
// ════════════════════════════════════════════════════════════════════════════

async function cloneAndCreate(week, dayLabel) {
  const tplInfo = W1_TEMPLATES[dayLabel];
  if (!tplInfo) { console.error(`  ✗ unknown day: ${dayLabel}`); return; }
  const overrideFn = OVERRIDES[week]?.[dayLabel];
  if (!overrideFn) { console.error(`  ✗ no overrides for W${week} ${dayLabel}`); return; }

  // Load W1 template + sets
  const { data: tplW1 } = await sb.from("workouts").select("*").eq("id", tplInfo.id).single();
  const { data: setsW1 } = await sb.from("workout_sets").select("*").eq("workout_id", tplInfo.id).order("set_order");

  // Apply overrides
  let newSets = overrideFn(setsW1.map(s => ({ ...s })));

  // Re-sort by block + set_order and renumber 1..N
  newSets = newSets.sort((a, b) => a.set_order - b.set_order);
  newSets = newSets.map((s, i) => ({ ...s, set_order: i + 1 }));

  // Scheduled date for this week's day
  const scheduledDate = addDays(WEEK_FIRST[week], DAY_OFFSET[dayLabel]);

  // ─── Create TEMPLATE workout ───
  const tplDayLabel = `W${week} ${dayLabel}`;
  let templateId;
  {
    const { data: existing } = await sb.from("workouts").select("id").is("user_id", null).eq("mesocycle_id", M3_ID).eq("week_number", week).eq("day_label", tplDayLabel).maybeSingle();
    if (existing) {
      templateId = existing.id;
      // Already exists — skip
      return { skipped: "template exists", templateId };
    }
    const { data: w, error } = await sb.from("workouts").insert({
      program_id: PROGRAM_TEMPLATE_ID,
      user_id: null,
      scheduled_date: scheduledDate,
      week_number: week,
      day_label: tplDayLabel,
      workout_type: tplW1.workout_type,
      estimated_duration: tplW1.estimated_duration,
      is_completed: false,
      is_rest_day: false,
      coach_note: tplW1.coach_note,
      short_on_time_note: tplW1.short_on_time_note,
      mesocycle_id: M3_ID,
    }).select("id").single();
    if (error) throw new Error(`tpl insert: ${error.message}`);
    templateId = w.id;
  }

  // Insert sets for template
  const tplSetRows = newSets.map(s => {
    const { id, workout_id, user_id, created_at, updated_at, actual_reps, actual_weight, actual_rpe, actual_rir, is_pr, is_completed, logged_at, ...keep } = s;
    return { ...keep, workout_id: templateId, user_id: null };
  });
  const { error: tplSetsErr } = await sb.from("workout_sets").insert(tplSetRows);
  if (tplSetsErr) throw new Error(`tpl sets: ${tplSetsErr.message}`);

  const created = { templateId, templateSets: tplSetRows.length, instances: {} };

  // ─── Athlete instances ───
  for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
    const { data: existing } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", scheduledDate).maybeSingle();
    if (existing) { created.instances[name] = "exists"; continue; }
    // Find user's active program
    const { data: prog } = await sb.from("programs").select("id").eq("user_id", uid).eq("is_active", true).maybeSingle();
    if (!prog) { created.instances[name] = "no program"; continue; }
    const { data: w, error } = await sb.from("workouts").insert({
      program_id: prog.id,
      user_id: uid,
      scheduled_date: scheduledDate,
      week_number: week,
      day_label: dayLabel,
      workout_type: tplW1.workout_type,
      estimated_duration: tplW1.estimated_duration,
      is_completed: false,
      is_rest_day: false,
      coach_note: tplW1.coach_note,
      short_on_time_note: tplW1.short_on_time_note,
      mesocycle_id: null,
    }).select("id").single();
    if (error) { created.instances[name] = "ERR: " + error.message; continue; }
    const instSetRows = newSets.map(s => {
      const { id, workout_id, user_id, created_at, updated_at, actual_reps, actual_weight, actual_rpe, actual_rir, is_pr, is_completed, logged_at, ...keep } = s;
      return { ...keep, workout_id: w.id, user_id: uid };
    });
    const { error: instSetsErr } = await sb.from("workout_sets").insert(instSetRows);
    if (instSetsErr) { created.instances[name] = "ERR sets: " + instSetsErr.message; continue; }
    created.instances[name] = `${w.id.slice(0, 8)} + ${instSetRows.length} sets`;
  }

  return created;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

console.log("══════════════════════════════════════════════════════════════════════");
console.log("  M3 W2-W6 BUILD · 5 weeks × 5 days × 4 workouts = 100 workouts");
console.log("══════════════════════════════════════════════════════════════════════\n");

for (const week of [2, 3, 4, 5, 6]) {
  console.log(`\n══ W${week} ══\n`);
  for (const dayLabel of ["DENSITY DAY", "TEMPO DAY", "SKILL DAY", "UPPER HYPERTROPHY", "LOWER HYPERTROPHY"]) {
    try {
      const r = await cloneAndCreate(week, dayLabel);
      if (r?.skipped) {
        console.log(`  · ${dayLabel}: ${r.skipped}`);
      } else if (r) {
        const inst = Object.entries(r.instances).map(([n, v]) => `${n}: ${v}`).join(" · ");
        console.log(`  ✓ ${dayLabel}: tpl ${r.templateId.slice(0, 8)} (${r.templateSets} sets) · ${inst}`);
      }
    } catch (e) {
      console.error(`  ✗ ${dayLabel}: ${e.message}`);
    }
  }
}

console.log("\n✓ Build complete");
