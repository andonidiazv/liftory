/**
 * Coach Adonis agent · llamada a Claude con tools.
 *
 * Inputs: { spec, knowledge, catalog }
 * Output: { plan, draftExercisesCreated, raw }
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../../_lib-env.mjs";
import { exerciseLookup, createExercise, exerciseListAll } from "./catalog.mjs";

const env = loadEnv();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 16000;

// ─── Load knowledge base files ─────────────────────────────────────────────
function loadKnowledge() {
  const root = path.resolve(__dirname, "../knowledge");
  function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith(".md")) {
        out.push({ file: path.relative(root, full), content: fs.readFileSync(full, "utf8") });
      }
    }
    return out;
  }
  return walk(root).sort((a, b) => a.file.localeCompare(b.file));
}

// ─── Build system prompt ───────────────────────────────────────────────────
async function buildSystemPrompt() {
  const knowledge = loadKnowledge();
  const catalog = await exerciseListAll();
  const knowledgeStr = knowledge.map(k => `=== knowledge/${k.file} ===\n${k.content}`).join("\n\n");
  const catalogStr = catalog
    .map(e => `${e.name} | ${e.category} · ${e.movement_pattern} · ${e.difficulty} · eq=${(e.equipment_required ?? []).join("/")}`)
    .join("\n");

  return `Sos **Coach Adonis** · LIFTORY Director Deportivo.

Tu trabajo es armar un mesociclo completo de 6 semanas siguiendo la metodología de Andoni.

# Knowledge base

${knowledgeStr}

# Catálogo de ejercicios actual (${catalog.length} ejercicios activos)

${catalogStr}

# Reglas de operación

1. **Usá el catálogo primero.** Antes de crear un ejercicio nuevo, buscá en el catálogo. Usá la tool \`exercise_lookup\` si necesitás chequear nombres similares.

2. **Si necesitás un ejercicio que NO existe, llamá \`create_exercise\`** con la voz LIFTORY (description ≤ 200 chars, coaching_cue ≤ 300, founder_notes ≤ 150). Los ejercicios nuevos quedan en \`is_draft = true\` hasta que Andoni revise.

3. **Cuando ya tengas todo el plan listo**, devolvé el output FINAL en un solo bloque JSON al final de tu respuesta dentro de un fence \`\`\`json ... \`\`\`. NO sigas escribiendo después del JSON.

4. **El JSON sigue exactamente este schema**:

\`\`\`jsonc
{
  "mesocycle": {
    "name": "M4",
    "program_name": "BUILD HIM ELITE",
    "cycle_number": 4,
    "start_date": "2026-07-20",
    "total_weeks": 6
  },
  "exercises_to_create": [
    {
      "name": "Nombre exacto",
      "name_es": "Nombre en español",
      "category": "strength|accessory|mobility|conditioning",
      "movement_pattern": "push|pull|squat|hinge|carry|core|rotation|locomotion",
      "difficulty": "beginner|intermediate|advanced|all_levels",
      "default_tempo": "2.0.1.0",
      "primary_muscles": ["..."],
      "equipment_required": ["..."],
      "description": "1-2 frases voz LIFTORY ≤ 200 chars",
      "coaching_cue": "3-5 puntos cortos declarativos ≤ 300 chars",
      "founder_notes": "1 frase punchy ≤ 150 chars"
    }
  ],
  "workouts": [
    {
      "week_number": 1,
      "day_label": "DENSITY DAY",
      "scheduled_date": "2026-07-20",
      "workout_type": "strength",
      "estimated_duration": 78,
      "coach_note": "Voz LIFTORY · 1 párrafo ≤ 350 chars",
      "short_on_time_note": "¿Sin tiempo? ... · NUNCA saltes Recovery.",
      "blocks": [
        {
          "label": "PRIME BLOCK",
          "sets": [
            {
              "exercise": "Wall Slide",
              "set_type": "warmup",
              "planned_reps": 8,
              "planned_rest_seconds": 0,
              "coaching_cue_override": "Mobility hombro | 2 rondas · cue específico"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

5. **Reglas duras** (el validador rechaza el plan si fallan):
   - PRIME BLOCK siempre primero
   - RECOVERY BLOCK siempre último
   - Phase names exactos (BASE, BASE+, ACUMULACIÓN, INTENSIFICACIÓN, PEAK, DELOAD)
   - Sin Russian Twist o rotacional con peso pesado
   - Voz LIFTORY (caps de chars)
   - Sin frases prohibidas (sin trampa, no mames, etc.)

6. **No expliques tu razonamiento en el output final.** Andoni ya tiene el HTML proposal para revisar. El JSON va directo al validador.

7. **Para EMOM, For Time, Death By**: el cue del primer set del bloque debe tener el formato exacto reconocido por el render (ver knowledge/05-block-formats.md).
`;
}

// ─── Tool definitions for Anthropic API ────────────────────────────────────
const TOOLS = [
  {
    name: "exercise_lookup",
    description: "Busca ejercicios en el catálogo activo (no incluye drafts). Devuelve hasta 15 matches por nombre exacto o sub-string.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nombre exacto, sub-string, o keyword" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_exercise",
    description: "Crea un ejercicio nuevo en is_draft=true. Andoni los revisa y aprueba después. Usá esta tool solo si el ejercicio NO existe en el catálogo. La voz LIFTORY se valida: description ≤ 200 chars, coaching_cue ≤ 300, founder_notes ≤ 150.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        name_es: { type: "string" },
        category: { type: "string", enum: ["strength", "accessory", "mobility", "conditioning"] },
        movement_pattern: { type: "string" },
        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced", "all_levels"] },
        default_tempo: { type: ["string", "null"] },
        primary_muscles: { type: "array", items: { type: "string" } },
        equipment_required: { type: "array", items: { type: "string" } },
        description: { type: "string" },
        coaching_cue: { type: "string" },
        founder_notes: { type: "string" },
      },
      required: ["name", "name_es", "category", "movement_pattern", "difficulty", "primary_muscles", "equipment_required", "description", "coaching_cue", "founder_notes"],
    },
  },
];

// ─── Tool dispatcher ───────────────────────────────────────────────────────
async function runTool(name, input) {
  if (name === "exercise_lookup") {
    const results = await exerciseLookup(input.query);
    return { results: results.slice(0, 15) };
  }
  if (name === "create_exercise") {
    try {
      return await createExercise(input);
    } catch (e) {
      return { error: e.message };
    }
  }
  return { error: `unknown tool: ${name}` };
}

// ─── Main entry ────────────────────────────────────────────────────────────
export async function runAgent(spec) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — pegala en .env primero.");
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const systemPrompt = await buildSystemPrompt();

  const userMessage = `Armá el mesociclo siguiente según este spec:

\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

Devolvé el plan JSON al final de tu respuesta, dentro de un fence \`\`\`json ... \`\`\`. NO sigas escribiendo después.`;

  console.log("→ Llamando Claude (model=" + MODEL + ", tools=" + TOOLS.length + ")...");

  let messages = [{ role: "user", content: userMessage }];
  let toolsUsed = 0;
  let lastResponse;

  // Tool-use loop
  for (let i = 0; i < 20; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });
    lastResponse = response;

    if (response.stop_reason === "end_turn") {
      // Done — extract JSON from final text
      const text = response.content.filter(c => c.type === "text").map(c => c.text).join("\n");
      console.log(`  ✓ Coach Adonis terminó (turns=${i + 1}, tools=${toolsUsed})`);
      return { rawText: text, response, toolsUsed };
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          toolsUsed++;
          console.log(`  → tool ${block.name} (${JSON.stringify(block.input).slice(0, 80)}...)`);
          const result = await runTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }
  throw new Error("Tool loop exhausted (20 turns)");
}

/** Parse final JSON from agent's text output. */
export function extractPlan(rawText) {
  const match = rawText.match(/```json\s*([\s\S]+?)\s*```/);
  if (!match) throw new Error("No JSON fence found in agent output");
  return JSON.parse(match[1]);
}
