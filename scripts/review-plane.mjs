/**
 * LFT-106 · Poblar movement_plane.
 *
 * Es el filtro que impide sustituciones absurdas. Sin él, el generador de
 * candidatos propone "Leg Extension" como alternativa a la sentadilla con
 * barra, porque comparten patrón (squat) y músculo (quads). Lo que las separa
 * es el plano y el eje de la fuerza.
 *
 * Vocabulario (5 valores, extiende el que ya existía):
 *   horizontal  empuje/jalón perpendicular al torso — press de banca, remo
 *   vertical    empuje/jalón en el eje del torso — press militar, dominada
 *   sagittal    adelante/atrás — sentadilla, bisagra, zancada frontal
 *   frontal     de lado a lado — cossack, elevación lateral, plancha lateral
 *   transverse  rotación — chops, windmill, russian twist
 *
 *   node scripts/review-plane.mjs            # propuesta
 *   node scripts/review-plane.mjs --write    # aplica
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const WRITE=process.argv.includes("--write");

// Tejido blando, respiración y estiramientos estáticos no tienen plano de
// movimiento: asignarles uno sería precisión falsa. Se quedan en NULL.
const SIN_PLANO = /\b(breathing|respiraci|body scan|foam roll|lacrosse ball|legs up the wall|dead hang|hanging stretch)\b/i;

const LATERAL = /\b(lateral|cossack|side|skater|abduction|adduction|clamshell|monster walk|shuffle|bound|windmill)\b/i;
const ROTA    = /\b(rotation|rotational|chop|twist|CARs|spiderman|thread|scorpion|pass-?through|halo|around the world|crab|shoot through|oblique|t-spine)\b/i;
// Monoarticular de brazo. Se respeta la convención que ya traían las 127
// fichas con plano asignado: el tríceps extiende en el eje del torso
// (vertical) y el bíceps flexiona perpendicular a él (horizontal). No es
// anatomía estricta, pero es internamente coherente y mantener dos
// convenciones a la vez sería peor que elegir la que ya está.
const TRICEP  = /\b(pushdown|tricep|skull ?crusher|kickback|dip)\b/i;
const BICEP   = /\b(curl|preacher|21s|waiter|spider)\b/i;
// Empuje o jalón en el eje del torso.
const ARRIBA  = /\b(overhead|military|pike|handstand|HSPU|jerk|push press|z press|snatch|thruster|ground to overhead|devil press|pull-?up|chin-?up|pulldown|muscle up|rope climb|lat pull|front raise|upright row|toes to bar|T2B|dip|ski erg|wall slide|dislocat)\b/i;
const PRESS_H = /\b(bench|chest press|floor press|pec deck|fly)\b/i;
const JALON_H = /\b(row|face pull|pullover|pull-?through|straight-?arm|rear delt)\b/i;

function plano(e) {
  const n = e.name, p = e.movement_pattern;
  if (SIN_PLANO.test(n)) return [null, "no aplica"];
  if (ROTA.test(n)) return ["transverse", "rotación"];
  if (LATERAL.test(n)) return ["frontal", "movimiento lateral"];
  if (TRICEP.test(n)) return ["vertical", "extensión de tríceps (convención existente)"];
  if (BICEP.test(n))  return ["horizontal", "flexión de bíceps (convención existente)"];
  if (p === "push" || p === "pull") {
    if (PRESS_H.test(n) || JALON_H.test(n)) return ["horizontal", "perpendicular al torso"];
    if (ARRIBA.test(n) || /\bpress\b/i.test(n)) return ["vertical", "eje del torso"];
    return ["horizontal", "empuje/jalón por defecto"];
  }
  if (p === "rotation") return ["transverse", "patrón de rotación"];
  if (p === "carry")    return ["sagittal", "acarreo"];
  return ["sagittal", `patrón ${p}`];
}

let ex=[]; for(let i=0;;i+=1000){const{data}=await sb.from("exercises").select("id,name,movement_pattern,movement_plane,category,is_active").range(i,i+999);ex=ex.concat(data??[]);if(!data||data.length<1000)break;}
const act=ex.filter(e=>e.is_active);

const cambios=[], conflictos=[];
for (const e of act) {
  const [p,razon]=plano(e);
  if (!e.movement_plane) { if (p) cambios.push({...e, destino:p, razon}); }
  else if (p && e.movement_plane!==p) conflictos.push({...e, destino:p, razon});
}
console.log(`activos: ${act.length}  ·  ya tenían plano: ${act.filter(e=>e.movement_plane).length}  ·  a poblar: ${cambios.length}`);
const d={}; for(const c of cambios) d[c.destino]=(d[c.destino]??0)+1;
console.log(`\nreparto de lo nuevo: ${JSON.stringify(d)}`);
console.log(`\n⚠️  la regla contradice el valor existente en ${conflictos.length} ejercicios:`);
for (const c of conflictos.slice(0,20)) console.log(`   ${c.name.padEnd(38)} tiene:${c.movement_plane.padEnd(11)} regla dice:${c.destino.padEnd(11)} (${c.razon})`);
if (conflictos.length>20) console.log(`   … y ${conflictos.length-20} más`);

console.log("\nMuestra de lo que se poblaría:");
for (const p of ["vertical","horizontal","sagittal","frontal","transverse"]) {
  const l=cambios.filter(c=>c.destino===p).slice(0,4);
  console.log(`  ${p.padEnd(11)} ${l.map(c=>c.name).join(" · ")}`);
}

if (!WRITE) { console.log("\n(propuesta: no se escribió nada)"); process.exit(0); }
let n=0;
for (const c of cambios) {
  const { error } = await sb.from("exercises").update({ movement_plane:c.destino }).eq("id",c.id);
  if (!error) n++; else console.log(`✗ ${c.name}: ${error.message}`);
}
console.log(`\n✅ ${n} ejercicios con plano asignado`);
