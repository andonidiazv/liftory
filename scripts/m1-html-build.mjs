/**
 * M1 · HTML builder · genera 3 versiones (Advanced / Intermediate / Beginner)
 * a partir del M1 original (Andoni's advanced baseline).
 *
 * Coach Adonis philosophy · mantener la ESENCIA del meso:
 *  - Split semanal idéntico entre niveles
 *  - Signature lifts se mantienen (con regresión suave donde skill lo demanda)
 *  - Progresión W1-W6 respetada (BASE → BASE+ → ACUM → INTENS → PEAK → DELOAD)
 *  - Solo cambios donde importan para hacer accesible + no cambiar TODO
 */
import { readFileSync, writeFileSync } from "fs";

const M1 = JSON.parse(readFileSync("/private/tmp/claude-501/-Users-andonidiazvidrio-Library-Mobile-Documents-com-apple-CloudDocs-Desktop-LIFTORY/fd5ef784-cb49-4973-a965-53195317e119/scratchpad/m1-full.json"));

// ═══════════════════════════════════════════════════════════
// REGRESSION RULES · exercise-level swaps (skill-heavy movements)
// ═══════════════════════════════════════════════════════════
const EX_SWAPS = {
  "L-Sit Chin-up":                     { intermediate: "Chin-up",                          beginner: "Ring Row" },
  "High-Hang Power Clean":             { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Low-Hang Power Clean":              { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Low-Hang Clean":                    { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Clean":                             { intermediate: "DB Power Clean",                   beginner: "KB Deadlift + Shrug" },
  "Dip Bodyweight":                    { intermediate: "Bench Dip",                        beginner: "Bench Dip (assisted)" },
  "Shrimp Squat":                      { intermediate: "Split Squat",                      beginner: "Box Step-up" },
  "Plyo Bulgarian Split Squat":        { intermediate: "Bulgarian Split Squat",            beginner: "Reverse Lunge" },
  "KB Suitcase Squat Jump":            { intermediate: "Goblet Squat Jump",                beginner: "Bodyweight Squat Jump" },
  "Heel Elevated Front Squat":         { intermediate: "Heel Elevated Front Squat",        beginner: "Goblet Squat (heels elevated)" },
  "Barbell Romanian Deadlift":         { intermediate: "Barbell Romanian Deadlift",        beginner: "DB Romanian Deadlift" },
  "Barbell Hip Thrust":                { intermediate: "Barbell Hip Thrust",               beginner: "Bodyweight Hip Thrust (single leg progression)" },
  "Landmine Press":                    { intermediate: "Landmine Press",                   beginner: "DB Shoulder Press (seated)" },
  "DB Military Press":                 { intermediate: "DB Military Press",                beginner: "DB Shoulder Press (seated)" },
  "Nordic Hamstring Curl":             { intermediate: "Bodyweight Reverse Nordic",        beginner: "Glute Bridge March" },
  "Incline Dumbbell Press":            { intermediate: "Incline Dumbbell Press",           beginner: "Flat DB Press" },
  "Sprint":                            { intermediate: "Sprint",                           beginner: "Jogging" },
  "Muscle Up":                         { intermediate: "Chest to Bar Pull-up",             beginner: "Pull-up" },
  "Handstand Push-up":                 { intermediate: "Pike Push-up (feet elevated)",     beginner: "Pike Push-up (floor)" },
  "Turkish Get-up":                    { intermediate: "Half Turkish Get-up",              beginner: "KB Windmill" },
};

// ═══════════════════════════════════════════════════════════
// GLOBAL MODIFIERS · applied to all exercises (unless already swapped)
// ═══════════════════════════════════════════════════════════

// heavy blocks → signature strength (Squat/DL/Bench/Press)
const HEAVY_BLOCKS = ["HEAVY BLOCK — A", "HEAVY BLOCK — B", "POWER BLOCK", "ATHLETIC HINGE", "ATHLETIC INTEGRATION"];
const ACCESSORY_BLOCKS = ["BUILD BLOCK — A", "BUILD BLOCK — B", "ENGINE BLOCK"];
const isHeavy = (blk) => HEAVY_BLOCKS.includes(blk);

function applyLevel(set, blockName, level) {
  const s = { ...set };
  if (level === "advanced") return s;

  // Exercise swap
  if (EX_SWAPS[s.exercise]) {
    s.exercise = EX_SWAPS[s.exercise][level] ?? s.exercise;
    s.swapped = true;
  }

  // Skip modifiers for PRIME / RECOVERY / MOBILITY blocks (leave warmups intact)
  if (blockName.includes("PRIME") || blockName.includes("RECOVERY") || blockName.includes("RESET") || blockName.includes("SPINE") || blockName.includes("FLOW")) {
    return s;
  }

  if (level === "intermediate") {
    // Rest: +15s in heavy, mismo en accessories
    if (isHeavy(blockName) && s.rest_s != null) s.rest_s = s.rest_s + 15;
    // Sets/reps intact — intermediate keeps advanced volume
  } else if (level === "beginner") {
    // Reps: -20% (mín 5)
    if (s.reps != null && s.reps > 5) s.reps = Math.max(5, Math.round(s.reps * 0.8));
    // Rest: +30s heavy, +15s accessories
    if (s.rest_s != null) s.rest_s = s.rest_s + (isHeavy(blockName) ? 30 : 15);
    // Duration (holds/planks): -30%
    if (s.duration_s != null && s.duration_s > 15) s.duration_s = Math.max(15, Math.round(s.duration_s * 0.7));
    // Tempo: simplify complex tempos (e.g., "3-1-X") to "2-1-1"
    if (s.tempo && /[X-]/.test(s.tempo) && s.tempo !== "2-1-1") s.tempo = "2-1-1";
  }

  return s;
}

// For BEGINNER also drop the last set from accessories (limit total volume)
function reduceSetCount(sets, blockName, level) {
  if (level !== "beginner") return sets;
  if (blockName.includes("PRIME") || blockName.includes("RECOVERY") || blockName.includes("RESET") || blockName.includes("SPINE") || blockName.includes("FLOW")) return sets;

  // Group sets by exercise
  const byEx = new Map();
  const order = [];
  for (const s of sets) {
    if (!byEx.has(s.exercise)) { byEx.set(s.exercise, []); order.push(s.exercise); }
    byEx.get(s.exercise).push(s);
  }

  // Drop last set of each exercise if >= 3 sets (mín 2 sets)
  const kept = [];
  for (const ex of order) {
    const arr = byEx.get(ex);
    if (arr.length >= 3) arr.pop();
    kept.push(...arr);
  }
  return kept.sort((a, b) => a.order - b.order);
}

function fmtTime(s) {
  if (s == null) return "—";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r === 0 ? `${m}:00` : `${m}:${String(r).padStart(2, "0")}`;
  }
  return `${s}s`;
}

function fmtSetLine(s) {
  const parts = [];
  if (s.reps != null) parts.push(`${s.reps} reps`);
  if (s.duration_s != null) parts.push(`${s.duration_s}s`);
  if (s.tempo) parts.push(`tempo ${s.tempo}`);
  if (s.rpe) parts.push(`RPE ${s.rpe}`);
  if (s.rest_s != null) parts.push(`rest ${fmtTime(s.rest_s)}`);
  return parts.join(" · ");
}

// Format set_type as a chip label
function fmtSetType(t) {
  if (!t) return "";
  const map = {
    working: "WORK", warmup: "WARMUP", cooldown: "COOL", emom: "EMOM",
    amrap: "AMRAP", superset: "SUPERSET", interval: "INTERVAL", backoff: "BACKOFF",
  };
  return map[t] ?? t.toUpperCase();
}

// Aggregate consecutive sets of same exercise into "N × ..." rows
function groupSets(sets) {
  const groups = [];
  let curr = null;
  for (const s of sets) {
    if (curr && curr.exercise === s.exercise && curr.tempo === s.tempo && curr.rpe === s.rpe && curr.reps === s.reps && curr.duration_s === s.duration_s && curr.type === s.type) {
      curr.count++;
      curr.sets.push(s);
    } else {
      if (curr) groups.push(curr);
      curr = { exercise: s.exercise, tempo: s.tempo, rpe: s.rpe, reps: s.reps, duration_s: s.duration_s, type: s.type, rest_s: s.rest_s, cue: s.cue, count: 1, sets: [s], swapped: s.swapped };
    }
  }
  if (curr) groups.push(curr);
  return groups;
}

function h(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderDay(day, level) {
  if (day.is_rest_day) {
    return `<div class="day rest">
      <h3 class="day-label">${h(day.day_label)}</h3>
      <p class="rest-note">Descanso completo · CNS reset · sin gym</p>
    </div>`;
  }

  const blockOrder = ["PRIME BLOCK", "POWER BLOCK", "ATHLETIC HINGE", "HEAVY BLOCK — A", "HEAVY BLOCK — B", "BUILD BLOCK — A", "BUILD BLOCK — B", "ENGINE BLOCK", "ATHLETIC INTEGRATION", "DYNAMIC FLOW", "RESET & BREATHE", "SPINE & HIPS", "RECOVERY BLOCK"];
  const blockKeys = Object.keys(day.blocks).sort((a, b) => {
    const ia = blockOrder.indexOf(a); const ib = blockOrder.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  let blocksHTML = "";
  for (const bkey of blockKeys) {
    const block = day.blocks[bkey];
    const setsForLevel = block.sets.map(s => applyLevel(s, bkey, level));
    const setsAfterReduce = reduceSetCount(setsForLevel, bkey, level);
    if (!setsAfterReduce.length) continue;
    const groups = groupSets(setsAfterReduce);

    let rowsHTML = "";
    for (const g of groups) {
      const line = fmtSetLine(g.sets[0]);
      const type = fmtSetType(g.type);
      const countLabel = g.count > 1 ? `<span class="count">${g.count} ×</span>` : "";
      const swapBadge = g.swapped ? `<span class="swap-badge">↩ regresión</span>` : "";
      const restBottom = g.sets[0].rest_s != null && !line.includes("rest") ? `<div class="rest">rest ${fmtTime(g.sets[0].rest_s)}</div>` : "";
      const typeBadge = type ? `<span class="type-badge type-${(g.type ?? "").toLowerCase()}">${type}</span>` : "";
      rowsHTML += `
      <div class="ex-row">
        <div class="ex-left">
          ${countLabel}
          <div class="ex-body">
            <div class="ex-name">${h(g.exercise)}${swapBadge}</div>
            <div class="ex-line">${h(line)}</div>
          </div>
        </div>
        <div class="ex-right">${typeBadge}</div>
      </div>`;
    }

    // Grab the first cue as the block-level note if it's long enough
    const firstCue = groups.find(g => g.sets[0]?.cue)?.sets[0]?.cue;
    const noteHTML = firstCue && firstCue.length > 30
      ? `<p class="block-note">${h(firstCue.substring(0, 260))}${firstCue.length > 260 ? "…" : ""}</p>`
      : "";

    blocksHTML += `
    <section class="block">
      <h4 class="block-name">${h(block.name)}</h4>
      ${noteHTML}
      <div class="ex-list">${rowsHTML}</div>
    </section>`;
  }

  return `
  <article class="day">
    <header class="day-header">
      <span class="day-eyebrow">${h(day.date)}</span>
      <h3 class="day-label">${h(day.day_label)}</h3>
      ${day.estimated_duration ? `<span class="day-duration">${day.estimated_duration} min</span>` : ""}
    </header>
    ${day.coach_note ? `<p class="coach-note"><em>${h(day.coach_note.substring(0, 350))}${day.coach_note.length > 350 ? "…" : ""}</em></p>` : ""}
    <div class="blocks">${blocksHTML}</div>
  </article>`;
}

function renderLevel(level) {
  let weeksHTML = "";
  for (const wkKey of Object.keys(M1.weeks).sort()) {
    const wk = M1.weeks[wkKey];
    const phase = ["BASE", "BASE+", "ACUMULACIÓN", "INTENSIFICACIÓN", "PEAK", "DELOAD"][wk.week - 1];
    weeksHTML += `
    <section class="week" id="${level}-w${wk.week}">
      <header class="week-header">
        <span class="week-eyebrow">Semana ${wk.week} · ${phase}</span>
      </header>
      <div class="days">${wk.days.map(d => renderDay(d, level)).join("\n")}</div>
    </section>`;
  }
  return weeksHTML;
}

// ═══════════════════════════════════════════════════════════
// HTML SHELL
// ═══════════════════════════════════════════════════════════
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LIFTORY · M1 · BUILD HIM ELITE</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0D0D0F;
    --bg-card: #15151A;
    --fg: #EAE6DE;
    --muted: #8A7E72;
    --border: rgba(138,126,114,0.20);
    --gold: #C4A24E;
    --gold-strong: #D4A03C;
    --gold-bg: rgba(196,162,78,0.08);
    --gold-bg-strong: rgba(196,162,78,0.16);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 300;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  header.app-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(13,13,15,0.94);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 24px 32px 20px;
  }
  header.app-header .brand {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 22px;
    letter-spacing: -0.03em;
    color: var(--gold);
    text-transform: uppercase;
  }
  header.app-header .subtitle {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    color: var(--muted);
    text-transform: uppercase;
    margin-top: 4px;
  }
  .level-toggle {
    display: flex;
    gap: 4px;
    margin-top: 16px;
    padding: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 999px;
    width: fit-content;
  }
  .level-toggle button {
    all: unset;
    padding: 8px 20px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    border-radius: 999px;
    transition: all 0.2s;
  }
  .level-toggle button.active {
    background: var(--gold);
    color: #0D0D0F;
    font-weight: 600;
  }
  .level-toggle button:hover:not(.active) { color: var(--fg); }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px;
  }
  .level-container { display: none; }
  .level-container.active { display: block; }
  .week {
    margin-bottom: 48px;
    border-top: 1px solid var(--border);
    padding-top: 32px;
  }
  .week:first-child { border-top: none; padding-top: 0; }
  .week-header .week-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    color: var(--gold);
    text-transform: uppercase;
    font-weight: 600;
  }
  .days { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 16px; }
  .day {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }
  .day.rest { padding: 24px; text-align: center; background: transparent; border-style: dashed; }
  .day.rest .day-label { color: var(--muted); margin: 0; font-size: 15px; }
  .day.rest .rest-note { color: var(--muted); font-size: 12px; margin: 8px 0 0; font-family: 'DM Mono', monospace; letter-spacing: 1.5px; text-transform: uppercase; }
  .day-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .day-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--muted);
    text-transform: uppercase;
  }
  .day-label {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -0.02em;
    color: var(--fg);
    margin: 0;
    text-transform: uppercase;
  }
  .day-duration {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: var(--gold);
    text-transform: uppercase;
    margin-left: auto;
  }
  .coach-note {
    color: var(--muted);
    font-size: 13px;
    font-style: italic;
    line-height: 1.55;
    margin: 0 0 16px;
    padding-left: 12px;
    border-left: 2px solid var(--gold);
  }
  .blocks { display: flex; flex-direction: column; gap: 20px; }
  .block {
    padding: 16px 0;
    border-top: 1px solid var(--border);
  }
  .block:first-child { border-top: none; padding-top: 0; }
  .block-name {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: 2.5px;
    color: var(--gold);
    text-transform: uppercase;
    font-weight: 600;
    margin: 0 0 12px;
  }
  .block-note {
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
    line-height: 1.5;
    margin: 0 0 12px;
  }
  .ex-list { display: flex; flex-direction: column; gap: 8px; }
  .ex-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
  }
  .ex-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
  .ex-body { flex: 1; min-width: 0; }
  .count {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: var(--gold);
    font-weight: 600;
    padding-top: 2px;
    min-width: 32px;
  }
  .ex-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--fg);
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .swap-badge {
    display: inline-block;
    font-family: 'DM Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: var(--gold-bg);
    color: var(--gold);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--gold-bg-strong);
  }
  .ex-line {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .type-badge {
    display: inline-block;
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .type-working { background: rgba(234,230,222,0.05); color: var(--fg); }
  .type-emom { background: rgba(196,162,78,0.14); color: var(--gold); border: 1px solid var(--gold-bg-strong); }
  .type-amrap { background: rgba(212,85,85,0.12); color: #D45555; border: 1px solid rgba(212,85,85,0.3); }
  .type-superset { background: rgba(122,139,92,0.14); color: #A5BC81; border: 1px solid rgba(165,188,129,0.3); }
  .type-warmup { background: rgba(138,126,114,0.10); color: var(--muted); }
  .type-cooldown { background: rgba(138,126,114,0.10); color: var(--muted); }

  .week-nav {
    position: sticky;
    top: 130px;
    background: rgba(13,13,15,0.94);
    backdrop-filter: blur(12px);
    padding: 12px 0 12px;
    margin-bottom: 8px;
    z-index: 5;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
  }
  .week-nav a {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    transition: all 0.2s;
  }
  .week-nav a:hover { color: var(--gold); border-color: var(--gold); }

  .legend {
    margin: 32px 0 16px;
    padding: 16px 20px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.7;
  }
  .legend strong { color: var(--fg); font-weight: 500; }
  .legend .swap-badge { margin-right: 6px; }

  footer {
    text-align: center;
    padding: 48px 32px;
    border-top: 1px solid var(--border);
    margin-top: 48px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: var(--muted);
    text-transform: uppercase;
  }

  @media (min-width: 900px) {
    .days { grid-template-columns: 1fr 1fr; }
    .day.rest { grid-column: span 2; }
  }
  @media (max-width: 640px) {
    header.app-header { padding: 20px 20px 16px; }
    main { padding: 20px; }
    .day { padding: 16px; }
    .day-header { flex-direction: column; align-items: flex-start; gap: 4px; }
    .day-duration { margin-left: 0; }
  }
</style>
</head>
<body>
<header class="app-header">
  <div class="brand">LIFTORY</div>
  <div class="subtitle">M1 · BUILD HIM ELITE · v1 launch</div>
  <div class="level-toggle" role="tablist" aria-label="Nivel del atleta">
    <button type="button" data-level="beginner">Beginner</button>
    <button type="button" data-level="intermediate">Intermediate</button>
    <button type="button" data-level="advanced" class="active">Advanced</button>
  </div>
</header>

<main>
  <div class="legend">
    <strong>Cómo leer las regresiones:</strong> las 3 versiones mantienen el mismo split y filosofía. En Intermediate + Beginner algunos ejercicios cambian a variantes más accesibles (marcadas con <span class="swap-badge">↩ regresión</span>), los descansos crecen ligeramente, y en Beginner el volumen se reduce (menos series en accessories, reps −20%). Los signature lifts (Front Squat, Hip Thrust, Deadlift, Press) se mantienen — la esencia del meso no cambia. Coach Adonis philosophy.
  </div>

  <div class="level-container" data-level="advanced">
    ${renderLevel("advanced")}
  </div>
  <div class="level-container" data-level="intermediate">
    ${renderLevel("intermediate")}
  </div>
  <div class="level-container" data-level="beginner">
    ${renderLevel("beginner")}
  </div>
</main>

<footer>
  LIFTORY · M1 · BUILD HIM ELITE · Coach Adonis architecture
</footer>

<script>
  // Show advanced by default
  document.querySelector('.level-container[data-level="advanced"]').classList.add('active');

  document.querySelectorAll('.level-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      document.querySelectorAll('.level-toggle button').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.level-container').forEach(c => {
        c.classList.toggle('active', c.dataset.level === level);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
</script>
</body>
</html>`;

const outPath = "/private/tmp/claude-501/-Users-andonidiazvidrio-Library-Mobile-Documents-com-apple-CloudDocs-Desktop-LIFTORY/fd5ef784-cb49-4973-a965-53195317e119/scratchpad/M1-3-levels.html";
writeFileSync(outPath, html);
console.log(`✓ HTML escrito · ${(html.length / 1024).toFixed(1)} KB`);
console.log(`  ${outPath}`);
