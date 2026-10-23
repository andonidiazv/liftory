/**
 * Chequeo de seguridad: qué puede leer alguien SIN iniciar sesión, y qué
 * políticas RLS están realmente aplicadas.
 *
 * Correr esto después de cualquier cambio de políticas. Los archivos de
 * migración no son fuente de verdad: una política tocada desde el dashboard
 * de Supabase no deja rastro en el repo. Por eso lee pg_policy de verdad,
 * vía la función rls_report().
 *
 *   node scripts/rls-check.mjs            # prueba de fuga anónima
 *   node scripts/rls-check.mjs --policies # además, las políticas de SELECT
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const url = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const anon = createClient(url, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth:{persistSession:false} });
const svc  = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY,     { auth:{persistSession:false} });

const TABLAS = ["workouts","workout_sets","programs","exercises","exercise_substitutions",
  "mesocycles","user_profiles","onboarding_answers","subscriptions","payments",
  "substitution_candidates","user_feedback","push_subscriptions","audit_log","ai_rules"];

console.log("══ ¿QUÉ VE ALGUIEN SIN INICIAR SESIÓN? ══");
let fugas = 0;
for (const t of TABLAS) {
  const { count, error } = await anon.from(t).select("*", { count:"exact", head:true });
  if (error) { console.log(`  ✓  ${t.padEnd(26)} bloqueado (${error.code})`); continue; }
  if (count > 0) { fugas++; console.log(`  ⚠️  ${t.padEnd(26)} ${count} FILAS LEGIBLES`); }
  else console.log(`  ✓  ${t.padEnd(26)} 0 filas`);
}

// Una tabla vacía da 0 filas y parece segura. Esta prueba distingue "cerrado"
// de "vacío" usando una tabla que sabemos que tiene contenido.
const { count: real } = await svc.from("exercises").select("*", { count:"exact", head:true });
const { count: visto } = await anon.from("exercises").select("*", { count:"exact", head:true });
console.log(`\n  control: exercises tiene ${real} filas reales, el anónimo ve ${visto ?? 0}`);

if (process.argv.includes("--policies")) {
  const { data, error } = await svc.rpc("rls_report");
  if (error) console.log(`\n(no se pudo leer rls_report: ${error.message})`);
  else {
    console.log("\n══ POLÍTICAS DE SELECT APLICADAS ══");
    for (const t of TABLAS) {
      const ps = data.filter(r => r.tabla === t && r.comando === "SELECT");
      if (!ps.length) continue;
      console.log(`\n▸ ${t}   RLS ${ps[0].rls_activo ? "ON" : "OFF ⚠️"}`);
      for (const p of ps) {
        const abierto = /anon|PUBLIC/.test(p.roles);
        console.log(`  ${abierto ? "⚠️" : "  "} ${p.roles.padEnd(22)} ${p.politica}`);
      }
    }
  }
}
console.log(fugas ? `\n❌ ${fugas} tablas filtran datos a anónimos` : "\n✅ sin fugas a usuarios anónimos");
process.exit(fugas ? 1 : 0);
