#!/usr/bin/env node
/**
 * coach-adonis · new-meso
 *
 * Uso:
 *   node scripts/coach-adonis/new-meso.mjs scripts/coach-adonis/specs/m4-example.json
 *
 * Pipeline:
 *   1. Lee spec JSON
 *   2. Llama runAgent(spec) → Coach Adonis genera plan + crea drafts
 *   3. extractPlan(rawText) → plan estructurado
 *   4. validateMeso(plan) → errors[] + warnings[]
 *   5. Guarda en out/coach-adonis/<meso>/{plan.json,audit.txt,proposal.html,raw.txt}
 *   6. Si errors.length === 0, dice "listo para aplicar"
 *   7. Si hay errors, dice "fix y volver a correr"
 */

import fs from "node:fs";
import path from "node:path";
import { runAgent, extractPlan } from "./lib/agent.mjs";
import { validateMeso, formatAudit } from "./lib/validator.mjs";

const specPath = process.argv[2];
if (!specPath) {
  console.error("Uso: node new-meso.mjs <spec.json>");
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const mesoName = spec.mesocycle?.name || "UNKNOWN";

const outDir = path.resolve("out/coach-adonis", mesoName);
fs.mkdirSync(outDir, { recursive: true });

console.log(`══════════════════════════════════════════════════════════════════════`);
console.log(`  Coach Adonis · new-meso · ${mesoName}`);
console.log(`  spec:   ${specPath}`);
console.log(`  output: ${outDir}/`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

const t0 = Date.now();
const { rawText, response, toolsUsed } = await runAgent(spec);
const dt = ((Date.now() - t0) / 1000).toFixed(1);

const tokensIn = response.usage?.input_tokens ?? "?";
const tokensOut = response.usage?.output_tokens ?? "?";
console.log(`\n→ ${dt}s · in=${tokensIn} out=${tokensOut} · ${toolsUsed} tool calls\n`);

fs.writeFileSync(path.join(outDir, "raw.txt"), rawText);

let plan;
try {
  plan = extractPlan(rawText);
} catch (e) {
  console.error(`✗ Plan extraction failed: ${e.message}`);
  console.error(`  Revisá ${outDir}/raw.txt para ver lo que el agente devolvió.`);
  process.exit(1);
}

fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2));

const audit = await validateMeso(plan);
const auditText = formatAudit(audit);
fs.writeFileSync(path.join(outDir, "audit.txt"), auditText);

console.log("─── AUDIT ─────────────────────────────────────────────────────────────");
console.log(auditText);
console.log("───────────────────────────────────────────────────────────────────────\n");

if (audit.errors.length === 0) {
  console.log(`✓ Plan limpio. Para aplicarlo a la DB:`);
  console.log(`  node scripts/coach-adonis/apply-meso.mjs ${outDir}/plan.json`);
} else {
  console.log(`✗ ${audit.errors.length} errores · plan NO se aplica. Editá el spec o corré de nuevo.`);
  process.exit(2);
}
