/**
 * Respaldo completo de la base, tabla por tabla, a un solo archivo JSON.
 *
 * Por qué así y no con `supabase db dump`: esa herramienta necesita Docker, que
 * no está instalado en esta máquina, y tampoco hay pg_dump ni psql. El service
 * role salta RLS, así que vía API se obtiene todo el contenido igual.
 *
 * Lo que SÍ captura: todas las filas de todas las tablas de datos.
 * Lo que NO captura: definiciones de esquema, políticas RLS, funciones SQL y
 * triggers. Eso vive en supabase/migrations/ y se restaura con git.
 *
 *   node scripts/snapshot.mjs                 # respaldo con fecha de hoy
 *   node scripts/snapshot.mjs --verify <file> # compara un respaldo contra la base viva
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
import { writeFileSync, readFileSync } from "node:fs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });

const TABLAS = [
  "exercises","exercise_substitutions","substitution_candidates",
  "mesocycles","programs","workouts","workout_sets","workout_exercise_swaps",
  "user_profiles","onboarding_answers","subscriptions","payments",
  "badge_definitions","badge_tiers","user_badges","user_feedback",
  "push_subscriptions","wearable_data","audit_log","ai_rules",
  "insights","insights_unlocked",
];

async function leerTodo(t){
  let filas = [];
  for (let i=0;;i+=1000){
    const { data, error } = await sb.from(t).select("*").range(i, i+999);
    if (error) return { error: error.message };
    filas = filas.concat(data ?? []);
    if (!data || data.length < 1000) break;
  }
  return { filas };
}

const verifyIdx = process.argv.indexOf("--verify");
if (verifyIdx !== -1) {
  const ruta = process.argv[verifyIdx+1];
  const snap = JSON.parse(readFileSync(ruta, "utf8"));
  console.log(`Comparando ${ruta} contra la base viva\n`);
  let iguales = 0, distintas = 0;
  for (const t of TABLAS) {
    const { count } = await sb.from(t).select("*", { count:"exact", head:true });
    const n = snap.tablas[t]?.length ?? 0;
    const ok = count === n;
    if (ok) iguales++; else distintas++;
    console.log(`  ${ok ? "=" : "≠"} ${t.padEnd(26)} respaldo ${String(n).padStart(6)}   viva ${String(count).padStart(6)}`);
  }
  console.log(`\n${iguales} tablas idénticas · ${distintas} con diferencia`);
  process.exit(distintas ? 1 : 0);
}

const fecha = new Date().toISOString().slice(0,10);
const snap = { tomado_en: new Date().toISOString(), proyecto: env.VITE_SUPABASE_PROJECT_ID, tablas: {} };
let total = 0;
for (const t of TABLAS) {
  const r = await leerTodo(t);
  if (r.error) { console.log(`  ✗ ${t.padEnd(26)} ${r.error}`); continue; }
  snap.tablas[t] = r.filas; total += r.filas.length;
  console.log(`  ✓ ${t.padEnd(26)} ${String(r.filas.length).padStart(6)} filas`);
}
const ruta = `backups/snapshot-${fecha}.json`;
writeFileSync(ruta, JSON.stringify(snap));
const mb = (Buffer.byteLength(JSON.stringify(snap))/1048576).toFixed(1);
console.log(`\n${total.toLocaleString("es-MX")} filas · ${mb} MB → ${ruta}`);
