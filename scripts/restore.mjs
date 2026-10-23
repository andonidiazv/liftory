/**
 * Restaura un respaldo de scripts/snapshot.mjs de vuelta a la base.
 *
 * Orden de tablas: las padres primero, para no romper llaves foráneas.
 * Método: upsert por id. No borra filas que existan en la base y no en el
 * respaldo, salvo que se pase --purge.
 *
 *   node scripts/restore.mjs <archivo>                  # simulacro (no escribe)
 *   node scripts/restore.mjs <archivo> --tabla exercises --apply
 *   node scripts/restore.mjs <archivo> --apply --purge  # restauración total
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
import { readFileSync } from "node:fs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

// padres → hijos. Restaurar fuera de este orden rompe FKs.
const ORDEN = [
  "user_profiles","exercises","programs","mesocycles","badge_definitions","badge_tiers",
  "ai_rules","insights","workouts","workout_sets","exercise_substitutions",
  "substitution_candidates","workout_exercise_swaps","onboarding_answers",
  "subscriptions","payments","user_badges","user_feedback","push_subscriptions",
  "wearable_data","audit_log","insights_unlocked",
];

const args = process.argv.slice(2);
const archivo = args.find(a => !a.startsWith("--"));
const APLICAR = args.includes("--apply");
const PURGAR  = args.includes("--purge");
const soloTabla = args.includes("--tabla") ? args[args.indexOf("--tabla")+1] : null;

if (!archivo) { console.log("Falta el archivo de respaldo."); process.exit(1); }
const snap = JSON.parse(readFileSync(archivo, "utf8"));
console.log(`Respaldo del ${snap.tomado_en}  ·  proyecto ${snap.proyecto}`);
console.log(APLICAR ? "MODO: APLICAR (escribe en la base)\n" : "MODO: SIMULACRO (no escribe nada)\n");

for (const t of ORDEN) {
  if (soloTabla && t !== soloTabla) continue;
  const filas = snap.tablas[t];
  if (!filas) continue;
  const { count: viva } = await sb.from(t).select("*", { count:"exact", head:true });
  const delta = filas.length - (viva ?? 0);
  const nota = delta === 0 ? "sin cambio" : (delta > 0 ? `faltan ${delta}` : `sobran ${-delta}`);

  if (!APLICAR) { console.log(`  ${t.padEnd(26)} respaldo ${String(filas.length).padStart(6)}  viva ${String(viva).padStart(6)}  → ${nota}`); continue; }

  if (PURGAR && filas.length === 0) {
    await sb.from(t).delete().neq("id","00000000-0000-0000-0000-000000000000");
  }
  let escritas = 0, err = null;
  for (let i=0;i<filas.length;i+=500){
    const { error } = await sb.from(t).upsert(filas.slice(i,i+500), { onConflict:"id" });
    if (error) { err = error.message; break; }
    escritas += filas.slice(i,i+500).length;
  }
  console.log(`  ${err ? "✗" : "✓"} ${t.padEnd(26)} ${String(escritas).padStart(6)} filas restauradas ${err ?? ""}`);
}
if (!APLICAR) console.log("\n(simulacro: no se escribió nada. Añade --apply para restaurar de verdad)");
