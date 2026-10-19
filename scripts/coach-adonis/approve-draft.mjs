#!/usr/bin/env node
/**
 * coach-adonis · approve-draft
 *
 * Uso:
 *   # Listar drafts pendientes:
 *   node scripts/coach-adonis/approve-draft.mjs --list
 *
 *   # Aprobar un draft por nombre exacto o uuid:
 *   node scripts/coach-adonis/approve-draft.mjs "Single-Arm Landmine Press"
 *
 *   # Aprobar TODOS los drafts pendientes (peligroso, usa --all-yes):
 *   node scripts/coach-adonis/approve-draft.mjs --all-yes
 */

import { listDrafts, approveDraft } from "./lib/catalog.mjs";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--list" || args[0] === "-l") {
  const drafts = await listDrafts();
  if (!drafts.length) {
    console.log("No hay drafts pendientes.");
    process.exit(0);
  }
  console.log(`${drafts.length} drafts pendientes de aprobación:\n`);
  for (const d of drafts) {
    console.log(`  · ${d.name}  ·  ${d.category} / ${d.movement_pattern}  ·  ${d.created_at?.slice(0, 10)}`);
    if (d.founder_notes) console.log(`      ${d.founder_notes}`);
  }
  process.exit(0);
}

if (args[0] === "--all-yes") {
  const drafts = await listDrafts();
  console.log(`Aprobando ${drafts.length} drafts...`);
  for (const d of drafts) {
    const r = await approveDraft(d.id);
    console.log(`  ✓ ${r?.name || d.name}`);
  }
  process.exit(0);
}

const target = args[0];
const r = await approveDraft(target);
if (!r) {
  console.error(`✗ No encontré draft "${target}"`);
  process.exit(1);
}
console.log(`✓ Aprobado: ${r.name}`);
