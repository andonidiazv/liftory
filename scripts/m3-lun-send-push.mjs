/**
 * Dispara la push notification del DENSITY DAY a Andoni, César y Víctor.
 * Llama al edge function send-workout-notification con SERVICE_ROLE auth.
 */

import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const URL = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-workout-notification`;

const TARGETS = [
  { name: "Andoni", id: "8117e549-8314-471d-87c2-c7c68cccac17" },
  { name: "César",  id: "f54d2d89-c304-419e-93d2-8a7fadfccc51" },
  { name: "Víctor", id: "3b1c600f-46ee-4332-a937-731c4445c144" },
];

const payload = {
  userIds: TARGETS.map(t => t.id),
  title: "M3 arrancó — Density Day",
  body: "Tu workout de hoy: KB Z Press + Commando EMOM, Cable Lean-Away, DB Bench, Arms. ~78 min. Abre la app para empezar.",
  url: "/home",
};

console.log("Llamando edge function send-workout-notification…\n");
console.log("Payload:", JSON.stringify(payload, null, 2));

const res = await fetch(URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log(`\nHTTP ${res.status}`);
console.log(text);

if (!res.ok) {
  process.exit(1);
}

const result = JSON.parse(text);
console.log("\n── Resumen por usuario ──");
for (const target of TARGETS) {
  const pu = result.perUser?.find(p => p.userId === target.id);
  if (!pu) console.log(`  ${target.name}: sin suscripciones (no recibe push)`);
  else console.log(`  ${target.name}: enviadas=${pu.sent} · fallidas=${pu.failed}`);
}
