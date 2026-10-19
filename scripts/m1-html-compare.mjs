/**
 * M1 · HTML side-by-side comparativo · Beginner | Intermediate | Advanced.
 * Vista de "spec sheet" para CEO — glance and decide.
 * Filas donde los 3 niveles son iguales colapsan a 1 sola línea.
 * Filas donde difieren se muestran en 3 columnas.
 */
import { readFileSync, writeFileSync } from "fs";

const M1 = JSON.parse(readFileSync("/private/tmp/claude-501/-Users-andonidiazvidrio-Library-Mobile-Documents-com-apple-CloudDocs-Desktop-LIFTORY/fd5ef784-cb49-4973-a965-53195317e119/scratchpad/m1-full.json"));

// EX_SWAPS · entries can be string (name only) OR object { name, note }.
// The `note` renders as a small italic gold line below the exercise spec.
const EX_SWAPS = {
  "L-Sit Chin-up":                     { intermediate: { name: "Chin-up", note: "Opción · band-assisted si no llegás a las reps" }, beginner: { name: "Cable Lat Pulldown", note: "Mantiene el patrón vertical de jalón" } },
  "High-Hang Power Clean":             { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Low-Hang Power Clean":              { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Low-Hang Clean":                    { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Clean":                             { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Dip Bodyweight":                    { intermediate: "Bench Dip",                        beginner: "Bench Dip (assisted)" },
  "Shrimp Squat":                      { intermediate: "Split Squat",                      beginner: "Box Step-up" },
  "Plyo Bulgarian Split Squat":        { intermediate: "Bulgarian Split Squat",            beginner: "Reverse Lunge" },
  "KB Suitcase Squat Jump":            { intermediate: "Goblet Squat Jump",                beginner: "Bodyweight Squat Jump" },
  "Goblet Cossack Squat":              { beginner: "Bodyweight Cossack Squat" },
  "V-ups":                             { beginner: "Sit Ups" },
  "Heel Elevated Front Squat":         { intermediate: "Heel Elevated Front Squat",        beginner: "Goblet Squat (heels elevated)" },
  "Barbell Romanian Deadlift":         { intermediate: "Barbell Romanian Deadlift",        beginner: "DB Romanian Deadlift" },
  "Barbell Hip Thrust":                { intermediate: "Barbell Hip Thrust",               beginner: "Single-Leg Hip Thrust (BW)" },
  "Landmine Press":                    { intermediate: "Landmine Press",                   beginner: "DB Shoulder Press (seated)" },
  "DB Military Press":                 { intermediate: "DB Military Press",                beginner: "DB Shoulder Press (seated)" },
  "Nordic Hamstring Curl":             { intermediate: "Bodyweight Reverse Nordic",        beginner: "Glute Bridge March" },
  // Incline Dumbbell Press · beginner mantiene el ejercicio, solo aplica -1 serie via reduceSetCount
  "Sprint":                            { intermediate: "Sprint",                           beginner: "Jogging" },
  "Muscle Up":                         { intermediate: "Chest to Bar Pull-up",             beginner: { name: "Banded Pull Down to Push Down", note: "Mantiene el pull vertical + agrega push" } },
  "Handstand Push-up":                 { intermediate: "Pike Push-up (feet elevated)",     beginner: "Pike Push-up (floor)" },
  "Turkish Get-up":                    { intermediate: "Half Turkish Get-up",              beginner: "KB Windmill" },
  "High Plank Kettlebell Pull Through": { intermediate: "High Plank Kettlebell Pull Through", beginner: { name: "Plank", override: { reps: null, duration_s: 30 }, note: "Anti-extension iso 30s" } },
  "Side Crunch on Bench":              { beginner: { omit: true } },
  "Commando Plank":                    { beginner: { name: "Plank", override: { reps: null, duration_s: 30 }, note: "Iso 30s · anti-extension puro" } },
  "Single Leg Hip Thrust":             { beginner: { omit: true } },
  "Weighted Plank":                    { beginner: { name: "Plank", override: { reps: null, duration_s: 45 }, note: "Iso 45s · sin peso · progresión gradual" } },
};

// EX_NOTES · shown on the exercise in ALL levels (technique clarifications).
const EX_NOTES = {
  "Kettlebell Curl to Halo": "Reps totales · alterná la dirección del halo cada rep",
};

// EX_FIXED · reemplaza todos los sets de un ejercicio (para un nivel) por N
// sets fijos con reps constantes — útil cuando el beginner necesita reps
// altas constantes en vez de la progresión advanced (peso más fácil de calibrar).
// Skip la reducción global de reduceSetCount para este ejercicio.
// perWeek override permite honrar deloads: W6 baja volumen/reps sobre la baseline.
const EX_FIXED = {
  "Landmine Press": {
    beginner: {
      reps: 10, count: 3, note: "10 reps constantes · fácil calibrar peso",
      perWeek: { 6: { reps: 8, count: 2, note: "Deload W6 · 2×8 · baja peso ~40%" } }
    }
  },
  "Single-Leg Hip Thrust (BW)": {
    beginner: {
      reps: 8, count: 4, note: "8 reps por lado · activación glútea sin peso",
      perWeek: { 6: { reps: 6, count: 3, note: "Deload W6 · 3×6 por lado · técnica" } }
    }
  },
  "DB Romanian Deadlift": {
    beginner: {
      reps: 10, count: 3, note: "10 reps · foco en estiramiento hamstrings",
      perWeek: { 6: { reps: 8, count: 3, note: "Deload W6 · 3×8 · baja peso, mantén tempo" } }
    }
  },
  "Lying Leg Curl": {
    beginner: {
      reps: 15, count: 3, type: "working", note: "3 straight sets · sin superset",
      perWeek: { 6: { reps: 12, count: 3, type: "working", note: "Deload W6 · 3×12 · RPE 6" } }
    }
  },
  // Plank en Athletic Hinge · progresión paulatina para beginner (scoped al bloque)
  "ATHLETIC HINGE::Plank": {
    beginner: {
      perWeek: {
        1: { duration_s: 30, count: 2, note: "Iso 30s · baseline · construir base" },
        2: { duration_s: 30, count: 2, note: "Iso 30s · consolidar" },
        5: { duration_s: 60, count: 2, note: "Iso 60s · pico de progresión" },
      }
    }
  },
};

function applyFixedIfAny(sets, level, week, blockName) {
  if (level === "advanced") return sets;
  const result = [];
  const done = new Set();
  for (const s of sets) {
    // Scoped key primero (`BLOCK::Exercise`), luego plano (`Exercise`)
    const scopedKey = `${blockName}::${s.exercise}`;
    const base = EX_FIXED[scopedKey]?.[level] ?? EX_FIXED[s.exercise]?.[level];
    if (!base) { result.push(s); continue; }
    if (done.has(s.exercise)) continue;
    done.add(s.exercise);
    const fix = base.perWeek?.[week] ?? (base.reps !== undefined || base.duration_s !== undefined || base.count !== undefined ? base : null);
    if (!fix) { result.push(s); continue; }
    const count = fix.count ?? 1;
    for (let i = 0; i < count; i++) {
      const spec = {};
      if (fix.reps !== undefined) { spec.reps = fix.reps; spec.duration_s = null; }
      if (fix.duration_s !== undefined) { spec.duration_s = fix.duration_s; spec.reps = null; }
      if (fix.type !== undefined) { spec.type = fix.type; }
      result.push({ ...s, ...spec, note: fix.note ?? s.note, swapped: true, _fixed: true, order: s.order + i * 0.001 });
    }
  }
  return result;
}

const HEAVY_BLOCKS = ["HEAVY BLOCK — A","HEAVY BLOCK — B","POWER BLOCK","ATHLETIC HINGE","ATHLETIC INTEGRATION"];
const isHeavy = (blk) => HEAVY_BLOCKS.includes(blk);
const isMobility = (blk) => /PRIME|RECOVERY|RESET|SPINE|FLOW/i.test(blk);

function applyLevel(set, blockName, level) {
  const s = { ...set };

  // Global technique note (applies to all levels · shown under the exercise)
  if (EX_NOTES[s.exercise]) s.note = EX_NOTES[s.exercise];

  if (level === "advanced") return s;

  let pendingOverride = null; // swap.override se aplica AL FINAL para ganar sobre reglas globales
  if (EX_SWAPS[s.exercise]) {
    const swap = EX_SWAPS[s.exercise][level];
    if (swap) {
      if (typeof swap === "string") {
        s.exercise = swap;
      } else if (swap.omit) {
        s._omit = true;
      } else {
        s.exercise = swap.name;
        if (swap.note) s.note = swap.note;
        if (swap.override) pendingOverride = swap.override;
      }
      s.swapped = true;
    }
  }
  if (isMobility(blockName)) {
    if (pendingOverride) Object.assign(s, pendingOverride);
    return s;
  }

  if (level === "intermediate") {
    if (isHeavy(blockName) && s.rest_s != null) s.rest_s += 15;
  } else if (level === "beginner") {
    if (s.reps != null && s.reps > 5) s.reps = Math.max(5, Math.round(s.reps * 0.8));
    if (s.rest_s != null) s.rest_s += isHeavy(blockName) ? 30 : 15;
    if (s.duration_s != null && s.duration_s > 15) s.duration_s = Math.max(15, Math.round(s.duration_s * 0.7));
    if (s.tempo && /[X-]/.test(s.tempo) && s.tempo !== "2-1-1") s.tempo = "2-1-1";
  }
  if (pendingOverride) Object.assign(s, pendingOverride); // override gana sobre reglas globales
  return s;
}

function reduceSetCount(sets, blockName, level) {
  if (level !== "beginner" || isMobility(blockName)) return sets;
  const byEx = new Map();
  const order = [];
  for (const s of sets) {
    if (!byEx.has(s.exercise)) { byEx.set(s.exercise, []); order.push(s.exercise); }
    byEx.get(s.exercise).push(s);
  }
  const kept = [];
  for (const ex of order) {
    const arr = byEx.get(ex);
    // Skip reduction si el ejercicio tiene EX_FIXED aplicado (count ya es el correcto)
    if (arr.some(s => s._fixed)) { kept.push(...arr); continue; }
    if (arr.length >= 3) arr.pop();
    kept.push(...arr);
  }
  return kept.sort((a,b)=>a.order-b.order);
}

function fmtTime(s) {
  if (s == null) return "";
  if (s >= 60) {
    const m = Math.floor(s/60); const r = s%60;
    return r === 0 ? `${m}:00` : `${m}:${String(r).padStart(2,"0")}`;
  }
  return `${s}s`;
}

// Compact spec line: "5×3 · 2:00" style
function specLine(count, s) {
  const parts = [];
  const reps = s.reps != null ? `${s.reps}` : "";
  const dur = s.duration_s != null ? `${s.duration_s}s` : "";
  const target = reps || dur;
  if (count > 1 && target) parts.push(`${count}×${target}`);
  else if (target) parts.push(target);
  if (s.tempo) parts.push(`t${s.tempo}`);
  if (s.rpe) parts.push(`RPE${s.rpe}`);
  if (s.rest_s != null) parts.push(`rest ${fmtTime(s.rest_s)}`);
  return parts.join(" · ");
}

// Group consecutive same-exercise sets.
// NOTE: we intentionally IGNORE rest_s when signing — the last set of a block
// usually has rest_s=0 (no rest after the block ends). Grouping by rest would
// split it out and misleadingly show "N-1 sets + 1 orphan". We use the rest_s
// of the first set of the group as the representative value.
function groupSets(sets) {
  const groups = [];
  let curr = null;
  for (const s of sets) {
    const sig = `${s.exercise}|${s.tempo??""}|${s.rpe??""}|${s.reps??""}|${s.duration_s??""}|${s.type??""}`;
    if (curr && curr.sig === sig) {
      curr.count++;
    } else {
      if (curr) groups.push(curr);
      curr = { sig, exercise: s.exercise, tempo: s.tempo, rpe: s.rpe, reps: s.reps, duration_s: s.duration_s, type: s.type, rest_s: s.rest_s, swapped: s.swapped, note: s.note, count: 1 };
    }
  }
  if (curr) groups.push(curr);
  return groups;
}

function h(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

const fmtType = { working:"", warmup:"", cooldown:"", emom:"EMOM", amrap:"AMRAP", superset:"SUPERSET", interval:"INT", backoff:"BACKOFF" };

// ═══ BLOCK OVERRIDES · custom layout for specific day::block combinations ═══
// These override the generic 3-column table with a bespoke card per level.
// Use when the block is a complex/sequence that doesn't map cleanly to row-by-row.
const BLOCK_OVERRIDES = {
  "UPPER PULL::POWER BLOCK": {
    beginner: {
      title: "EMOM 8 min",
      lines: [
        { text: "10 KB Deadlift + Shrug", type: "main" },
        { text: "todos los minutos", type: "sub" },
      ],
      notes: "RPE 6-7 · ~30s trabajo · ~30s descanso por minuto",
    },
    intermediate: {
      title: "ALTERNA · EMOM 8 min",
      lines: [
        { text: "Min impar · 8 DB Power Clean", type: "main" },
        { text: "Min par · 8 DB Clean", type: "main" },
      ],
      notes: "RPE 7 · alterna cada minuto · 4 rondas de cada",
    },
    advanced: {
      title: "COMPLEX · EMOM 8 min",
      lines: [
        { text: "1 complex por minuto · SIN soltar la barra", type: "main" },
        { text: "2 High-Hang Power Clean", type: "sub" },
        { text: "1 Low-Hang Power Clean", type: "sub" },
        { text: "1 Low-Hang Clean", type: "sub" },
        { text: "1 Clean", type: "sub" },
        { text: "= 5 reps por complex · 8 rondas totales", type: "summary" },
      ],
      notes: "RPE progresivo (sube semana a semana) · barra pegada al cuerpo durante toda la serie · desciende de rango dentro de cada complex",
    },
  },
  "SHOULDERS + ARMS::ENGINE BLOCK": (week) => BLOCK_OVERRIDES["UPPER PUSH::ENGINE BLOCK"](week),
  "UPPER PUSH::ENGINE BLOCK": (week) => {
    // Advanced · progresión existente
    const adv = {
      1: { title: "JOGGING · 15 min", lines: [{ text: "5 min warmup", type: "sub" }, { text: "8 min steady RPE 6-7", type: "sub" }, { text: "2 min cooldown", type: "sub" }], notes: "Ritmo conversacional" },
      2: { title: "JOGGING · 15 min", lines: [{ text: "5 min warmup", type: "sub" }, { text: "8 min steady RPE 6.5-7.5", type: "sub" }, { text: "2 min cooldown", type: "sub" }], notes: "" },
      3: { title: "JOGGING · 17 min", lines: [{ text: "5 min warmup", type: "sub" }, { text: "9 min steady RPE 7-8", type: "sub" }, { text: "3 min cooldown", type: "sub" }], notes: "" },
      4: { title: "JOGGING · 20 min", lines: [{ text: "5 min walk/jog warmup", type: "sub" }, { text: "8 min · 30s fast / 60s easy", type: "sub" }, { text: "5 min steady", type: "sub" }, { text: "2 min cooldown", type: "sub" }], notes: "Intervalos + steady" },
      5: { title: "JOGGING · 20 min", lines: [{ text: "5 min walk/jog warmup", type: "sub" }, { text: "8 min · 30s fast / 60s easy", type: "sub" }, { text: "5 min steady", type: "sub" }, { text: "2 min cooldown", type: "sub" }], notes: "Intervalos + steady" },
      6: { title: "JOGGING · 12 min · DELOAD", lines: [{ text: "4 min warmup", type: "sub" }, { text: "5 min steady RPE 6", type: "sub" }, { text: "3 min cooldown", type: "sub" }], notes: "DELOAD" },
    };
    // Intermediate · 15/15/15/20/20/10
    const intMinutes = { 1: 15, 2: 15, 3: 15, 4: 20, 5: 20, 6: 10 };
    const intMin = intMinutes[week];
    const int = week === 6
      ? { title: `JOGGING · ${intMin} min · DELOAD`, lines: [{ text: "3 min warmup · 5 min steady RPE 6 · 2 min cooldown", type: "sub" }], notes: "Ritmo suave" }
      : { title: `JOGGING · ${intMin} min`, lines: [{ text: `5 min warmup · ${intMin - 7} min steady RPE 7 · 2 min cooldown`, type: "sub" }], notes: "Ritmo conversacional" };
    // Beginner · igual que intermedio pero Incline Walk
    const beg = week === 6
      ? { title: `INCLINE WALK · ${intMin} min · DELOAD`, lines: [{ text: "3 min warmup · 5 min steady RPE 5-6 · 2 min cooldown", type: "sub" }], notes: "Inclinación 5-8% · caminar" }
      : { title: `INCLINE WALK · ${intMin} min`, lines: [{ text: `5 min warmup · ${intMin - 7} min steady RPE 6-7 · 2 min cooldown`, type: "sub" }], notes: "Inclinación 5-8% · caminata firme" };
    return { beginner: beg, intermediate: int, advanced: adv[week] };
  },
  "LOWER POWER::HEAVY BLOCK — B": {
    beginner: {
      title: "ALTERNA · EMOM 6 min",
      lines: [
        { text: "Bulgarian Split Squat alternando", type: "main" },
        { text: "Min impar · Bulgarian Split Squat L", type: "sub" },
        { text: "Min par · Bulgarian Split Squat R", type: "sub" },
        { text: "= 3 rondas por lado (6 min)", type: "summary" },
      ],
      notes: "RPE 6-7 · calidad de rango > velocidad · descenso controlado",
    },
    intermediate: {
      title: "ALTERNA · EMOM 8 min",
      lines: [
        { text: "Bulgarian Split Squat alternando", type: "main" },
        { text: "Min impar · Bulgarian Split Squat L", type: "sub" },
        { text: "Min par · Bulgarian Split Squat R", type: "sub" },
        { text: "= 4 rondas por lado (8 min)", type: "summary" },
      ],
      notes: "RPE 7-8 · control eccentric · pausa 1s en el bottom",
    },
    advanced: {
      title: "COMPLEX ALTERNA · EMOM 12 min",
      lines: [
        { text: "Rotación de 4 movimientos · 1 lado por minuto", type: "main" },
        { text: "Min 1 · Shrimp Squat L", type: "sub" },
        { text: "Min 2 · Shrimp Squat R", type: "sub" },
        { text: "Min 3 · Plyo Bulgarian Split Squat L", type: "sub" },
        { text: "Min 4 · Plyo Bulgarian Split Squat R", type: "sub" },
        { text: "= 3 rondas completas · 12 min totales", type: "summary" },
      ],
      notes: "RPE progresivo · skill + explosividad · Shrimp = control unilateral profundo · Plyo BSS = potencia",
    },
  },
};

const CHIP_BY_BLOCK = {
  "LOWER POWER::HEAVY BLOCK — B": { cls: "format-emom", label: "EMOM" },
  "UPPER PUSH::ENGINE BLOCK": { cls: "format-cardio", label: "CARDIO" },
  "SHOULDERS + ARMS::ENGINE BLOCK": { cls: "format-cardio", label: "CARDIO" },
};

function renderCustomBlock(overrideKey, blockName, week) {
  const raw = BLOCK_OVERRIDES[overrideKey];
  const ov = typeof raw === "function" ? raw(week) : raw;
  const line = (l) => {
    const item = typeof l === "string" ? { text: l, type: "main" } : l;
    return `<li class="cx-line cx-${item.type}">${h(item.text)}</li>`;
  };
  const col = (levelData) => `
    <td>
      <div class="cx-title">${h(levelData.title)}</div>
      <ul class="cx-lines">${levelData.lines.map(line).join("")}</ul>
      <div class="cx-notes">${h(levelData.notes)}</div>
    </td>`;
  const chip = CHIP_BY_BLOCK[overrideKey];
  const chipHTML = chip ? `<span class="format-chip ${chip.cls}">${chip.label}</span>` : "";
  return `
  <div class="block block-custom">
    <div class="block-header">
      <h4>${h(blockName)}</h4>
      ${chipHTML}
    </div>
    <table class="spec">
      <thead><tr><th>Beginner</th><th>Intermediate</th><th>Advanced</th></tr></thead>
      <tbody><tr>${col(ov.beginner)}${col(ov.intermediate)}${col(ov.advanced)}</tr></tbody>
    </table>
  </div>`;
}

function renderBlockRows(day, blockName, block, week) {
  // Custom override?
  const overrideKey = `${day.day_label}::${blockName}`;
  if (BLOCK_OVERRIDES[overrideKey]) return renderCustomBlock(overrideKey, blockName, week);

  const filterOmit = arr => arr.filter(s => !s._omit);
  const gBeg = groupSets(reduceSetCount(applyFixedIfAny(filterOmit(block.sets.map(s => applyLevel(s, blockName, "beginner"))), "beginner", week, blockName), blockName, "beginner"));
  const gInt = groupSets(reduceSetCount(applyFixedIfAny(filterOmit(block.sets.map(s => applyLevel(s, blockName, "intermediate"))), "intermediate", week, blockName), blockName, "intermediate"));
  const gAdv = groupSets(reduceSetCount(applyFixedIfAny(filterOmit(block.sets.map(s => applyLevel(s, blockName, "advanced"))), "advanced", week, blockName), blockName, "advanced"));

  // Rows are indexed by the advanced group index. Fallback: pad if lengths differ.
  const maxLen = Math.max(gBeg.length, gInt.length, gAdv.length);
  let rows = "";
  for (let i = 0; i < maxLen; i++) {
    const b = gBeg[i]; const it = gInt[i]; const a = gAdv[i];
    const isBlank = (x) => !x;
    const beg = isBlank(b) ? { blank: true } : { exercise: b.exercise, spec: specLine(b.count, b), swapped: b.swapped, note: b.note };
    const int = isBlank(it) ? { blank: true } : { exercise: it.exercise, spec: specLine(it.count, it), swapped: it.swapped, note: it.note };
    const adv = isBlank(a) ? { blank: true } : { exercise: a.exercise, spec: specLine(a.count, a), swapped: a.swapped, note: a.note };

    const cell = (d) => d.blank ? "&mdash;" : `<div class="ex-name">${h(d.exercise)}${d.swapped?' <span class="badge">↩</span>':""}</div><div class="ex-spec">${h(d.spec)}</div>${d.note ? `<div class="ex-note">${h(d.note)}</div>` : ""}`;

    // Collapse if all 3 are identical (same name + spec + note)
    const sameName = !beg.blank && beg.exercise === int.exercise && int.exercise === adv.exercise;
    const sameSpec = !beg.blank && beg.spec === int.spec && int.spec === adv.spec;
    const sameNote = beg.note === int.note && int.note === adv.note;
    if (sameName && sameSpec && sameNote) {
      rows += `<tr class="row-same"><td colspan="3">
        <div class="ex-name">${h(beg.exercise)}</div>
        <div class="ex-spec">${h(beg.spec) || "&mdash;"}</div>
        ${beg.note ? `<div class="ex-note">${h(beg.note)}</div>` : ""}
      </td></tr>`;
    } else {
      rows += `<tr><td>${cell(beg)}</td><td>${cell(int)}</td><td>${cell(adv)}</td></tr>`;
    }
  }

  // Chip per-nivel: si difieren mostramos advanced + caveat en gris
  const chipFor = (groups) => {
    const first = groups.find(g => g.type && fmtType[g.type]);
    return first ? { type: first.type, label: fmtType[first.type] } : null;
  };
  const chipA = chipFor(gAdv), chipI = chipFor(gInt), chipB = chipFor(gBeg);
  let formatChip = "";
  if (chipA) formatChip += `<span class="format-chip format-${chipA.type}">${chipA.label}</span>`;
  const caveats = [];
  if (chipA && (!chipI || chipI.type !== chipA.type)) caveats.push(`Int: ${chipI ? chipI.label : "straight"}`);
  if (chipA && (!chipB || chipB.type !== chipA.type)) caveats.push(`Beg: ${chipB ? chipB.label : "straight"}`);
  if (caveats.length) formatChip += ` <span class="format-caveat">${caveats.join(" · ")}</span>`;

  return `
  <div class="block">
    <div class="block-header">
      <h4>${h(blockName)}</h4>
      ${formatChip}
    </div>
    <table class="spec">
      <thead><tr><th>Beginner</th><th>Intermediate</th><th>Advanced</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderDay(day, week) {
  if (day.is_rest_day) {
    return `<div class="day-card rest">
      <div class="day-title">${h(day.day_label)}</div>
      <div class="day-meta">Descanso completo</div>
    </div>`;
  }
  const blockOrder = ["PRIME BLOCK","POWER BLOCK","HEAVY BLOCK — A","ATHLETIC HINGE","HEAVY BLOCK — B","BUILD BLOCK — A","BUILD BLOCK — B","ENGINE BLOCK","ATHLETIC INTEGRATION","DYNAMIC FLOW","RESET & BREATHE","SPINE & HIPS","RECOVERY BLOCK"];
  const blockKeys = Object.keys(day.blocks).sort((a,b)=>{
    const ia = blockOrder.indexOf(a); const ib = blockOrder.indexOf(b);
    return (ia<0?999:ia)-(ib<0?999:ib);
  });
  let blocksHTML = "";
  for (const bk of blockKeys) {
    if (!day.blocks[bk].sets.length) continue;
    blocksHTML += renderBlockRows(day, bk, day.blocks[bk], week);
  }
  return `
  <article class="day-card">
    <header class="day-header">
      <div>
        <div class="day-title">${h(day.day_label)}</div>
        <div class="day-meta">${h(day.date)} · ${day.estimated_duration ?? "?"} min</div>
      </div>
    </header>
    ${blocksHTML}
  </article>`;
}

let weeksHTML = "";
for (const wkKey of Object.keys(M1.weeks).sort()) {
  const wk = M1.weeks[wkKey];
  const phase = ["BASE","BASE+","ACUMULACIÓN","INTENSIFICACIÓN","PEAK","DELOAD"][wk.week-1];
  weeksHTML += `
  <section class="week" id="w${wk.week}">
    <header class="week-header">
      <h2>Semana ${wk.week}</h2>
      <span class="phase">${phase}</span>
    </header>
    <div class="days">${wk.days.map(d => renderDay(d, wk.week)).join("\n")}</div>
  </section>`;
}

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LIFTORY M1 · comparativa 3 niveles</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0D0D0F;
    --bg-card: #14141A;
    --bg-row-same: rgba(196,162,78,0.05);
    --fg: #EAE6DE;
    --muted: #8A7E72;
    --dim: #4A4638;
    --border: rgba(138,126,114,0.20);
    --gold: #C4A24E;
    --gold-strong: #D4A03C;
    --gold-bg: rgba(196,162,78,0.14);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 400;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
  }
  .app-header {
    position: sticky; top: 0; z-index: 20;
    background: rgba(13,13,15,0.95);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  }
  .brand {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px;
    letter-spacing: -0.03em; color: var(--gold); text-transform: uppercase;
  }
  .subtitle {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px;
    color: var(--muted); text-transform: uppercase;
  }
  .week-nav {
    display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap;
  }
  .week-nav a {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 1.5px;
    color: var(--muted); text-decoration: none;
    padding: 5px 10px; border: 1px solid var(--border); border-radius: 999px;
    transition: all 0.15s;
  }
  .week-nav a:hover { color: var(--gold); border-color: var(--gold); }

  main { padding: 20px 24px 60px; max-width: 1600px; margin: 0 auto; }

  .legend {
    padding: 12px 16px; margin-bottom: 24px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
    font-size: 12px; color: var(--muted); line-height: 1.55;
  }
  .legend strong { color: var(--fg); }
  .legend .badge { display: inline-block; background: var(--gold-bg); color: var(--gold); border: 1px solid var(--gold); border-radius: 3px; padding: 1px 4px; font-family: 'DM Mono', monospace; font-size: 10px; margin: 0 3px; }

  .week { margin-bottom: 36px; }
  .week-header {
    display: flex; align-items: baseline; gap: 12px;
    padding-bottom: 10px; margin-bottom: 12px;
    border-bottom: 2px solid var(--gold);
  }
  .week-header h2 {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 22px;
    letter-spacing: -0.02em; margin: 0; color: var(--fg); text-transform: uppercase;
  }
  .week-header .phase {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.5px;
    color: var(--gold); text-transform: uppercase; font-weight: 600;
  }

  .days { display: flex; flex-direction: column; gap: 20px; }

  .day-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
    padding: 16px 20px;
  }
  .day-card.rest {
    padding: 12px 20px;
    background: transparent; border-style: dashed;
    display: flex; justify-content: space-between; align-items: center;
  }
  .day-card.rest .day-title { color: var(--muted); font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; }
  .day-card.rest .day-meta { color: var(--dim); font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; }

  .day-header {
    display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--border);
  }
  .day-title {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px;
    letter-spacing: -0.01em; color: var(--fg); text-transform: uppercase;
  }
  .day-meta {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase;
  }

  .block { margin-bottom: 14px; }
  .block-header {
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  }
  .block-header h4 {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.5px;
    color: var(--gold); text-transform: uppercase; font-weight: 600; margin: 0;
  }
  .format-chip {
    display: inline-block; font-family: 'DM Mono', monospace; font-size: 8px;
    letter-spacing: 1.5px; padding: 2px 6px; border-radius: 3px;
    text-transform: uppercase; font-weight: 600;
  }
  .format-emom { background: rgba(196,162,78,0.16); color: var(--gold); border: 1px solid var(--gold); }
  .format-amrap { background: rgba(212,85,85,0.14); color: #D45555; border: 1px solid rgba(212,85,85,0.4); }
  .format-superset { background: rgba(165,188,129,0.14); color: #A5BC81; border: 1px solid rgba(165,188,129,0.4); }
  .format-cardio { background: rgba(120,168,204,0.14); color: #78A8CC; border: 1px solid rgba(120,168,204,0.4); }
  .format-caveat { display: inline-block; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 1px; color: var(--text-dim); text-transform: none; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.04); }

  table.spec {
    width: 100%; border-collapse: collapse;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  table.spec thead th {
    font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 2px;
    text-transform: uppercase; color: var(--muted); font-weight: 500;
    padding: 6px 10px; text-align: left;
    border-bottom: 1px solid var(--border); width: 33.33%;
  }
  table.spec tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(138,126,114,0.08);
    vertical-align: top;
    font-size: 13px;
  }
  table.spec tr:last-child td { border-bottom: none; }
  table.spec tr.row-same td {
    background: var(--bg-row-same);
    padding: 6px 10px;
  }
  table.spec tr.row-same .ex-name { color: var(--fg); }
  table.spec tr.row-same .ex-spec { color: var(--muted); }
  .ex-name {
    font-weight: 500; font-size: 13px; color: var(--fg);
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    line-height: 1.3;
  }
  .ex-spec {
    font-family: 'DM Mono', monospace; font-size: 10.5px;
    color: var(--muted); margin-top: 2px; letter-spacing: 0.3px;
  }
  .ex-note {
    font-size: 11px; color: var(--gold); font-style: italic;
    margin-top: 4px; line-height: 1.4; opacity: 0.85;
  }
  .badge {
    display: inline-block; font-family: 'DM Mono', monospace; font-size: 8px;
    letter-spacing: 1px; background: var(--gold-bg); color: var(--gold);
    padding: 1px 5px; border-radius: 3px; border: 1px solid var(--gold);
    font-weight: 600;
  }

  /* Custom block layout (complex/EMOM sequences) */
  .block-custom table.spec tbody td { padding: 10px 12px; }
  .cx-title {
    font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; color: var(--gold); font-weight: 600; margin-bottom: 8px;
  }
  .cx-lines {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .cx-line {
    font-size: 13px; color: var(--fg); line-height: 1.35;
    padding-left: 10px; position: relative;
  }
  .cx-line.cx-main::before {
    content: ""; position: absolute; left: 0; top: 8px;
    width: 4px; height: 1px; background: var(--gold);
  }
  .cx-line.cx-sub {
    padding-left: 22px; font-size: 12.5px; color: var(--muted);
  }
  .cx-line.cx-sub::before {
    content: "→"; position: absolute; left: 8px; top: 0;
    color: var(--dim); font-size: 10px; line-height: 1.6;
  }
  .cx-line.cx-summary {
    margin-top: 6px; padding-top: 6px; padding-left: 10px;
    border-top: 1px dashed var(--border);
    font-family: 'DM Mono', monospace; font-size: 11px;
    color: var(--gold); font-weight: 500; letter-spacing: 0.3px;
  }
  .cx-line.cx-summary::before { display: none; }
  .cx-notes {
    font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted);
    margin-top: 8px; letter-spacing: 0.3px; line-height: 1.4;
  }

  footer {
    text-align: center; padding: 40px 24px; border-top: 1px solid var(--border);
    margin-top: 40px; font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 2px; color: var(--muted); text-transform: uppercase;
  }

  @media (max-width: 900px) {
    .app-header { padding: 12px 16px; }
    main { padding: 12px 12px 40px; }
    .day-card { padding: 12px; }
    table.spec { font-size: 12px; }
    table.spec thead th { font-size: 8px; padding: 4px 6px; }
    table.spec tbody td { padding: 6px 6px; font-size: 12px; }
    .ex-name { font-size: 12px; }
    .ex-spec { font-size: 9.5px; }
  }
</style>
</head>
<body>
<header class="app-header">
  <div class="brand">LIFTORY</div>
  <div class="subtitle">M1 · BUILD HIM ELITE · comparativa 3 niveles</div>
  <nav class="week-nav">
    ${["1","2","3","4","5","6"].map(w => `<a href="#w${w}">W${w}</a>`).join("")}
  </nav>
</header>

<main>
  <div class="legend">
    <strong>Cómo leer</strong> · filas donde los 3 niveles son idénticas se colapsan (fondo suave · una sola línea). Filas donde algo difiere muestran las 3 columnas <strong>Beginner | Intermediate | Advanced</strong>. Badge <span class="badge">↩</span> = regresión de ejercicio. Bloques con formato especial (EMOM/AMRAP/Superset) llevan el chip a la derecha. Coach Adonis philosophy · esencia intacta · solo se ajusta lo necesario.
  </div>
  ${weeksHTML}
</main>
<footer>LIFTORY · M1 · BUILD HIM ELITE · v1 launch spec sheet</footer>
</body>
</html>`;

const outPath = "/private/tmp/claude-501/-Users-andonidiazvidrio-Library-Mobile-Documents-com-apple-CloudDocs-Desktop-LIFTORY/fd5ef784-cb49-4973-a965-53195317e119/scratchpad/M1-compare.html";
writeFileSync(outPath, html);
console.log(`✓ HTML side-by-side · ${(html.length/1024).toFixed(1)} KB`);
console.log(`  ${outPath}`);
