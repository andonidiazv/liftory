/**
 * LFT-118 · Grupo de movimiento: el nivel que faltaba.
 *
 * El problema: `movement_pattern` tiene 8 valores y es demasiado grueso. Bajo
 * "squat" conviven la sentadilla con barra, el box jump, la zancada y el leg
 * extension. Bajo "pull" conviven el remo, la dominada y el curl de bíceps.
 * Por eso el generador de candidatos propone "Leg Extension" como alternativa
 * a la sentadilla con barra: comparten patrón y cuádriceps.
 *
 * `movement_plane` no lo arregla — en sentadilla ni siquiera aplica, por
 * diseño del campo.
 *
 * La familia por nombre (scripts/curate-swaps.mjs) tampoco basta sola:
 * encuentra variantes verdaderas ("Barbell Bench Press" ↔ "Dumbbell Bench
 * Press") pero no cruza familias, así que nunca propondría Goblet Squat para
 * una sentadilla con barra.
 *
 * Lo que sí sirve es un grupo de movimiento: qué hace el cuerpo, con qué
 * demanda, a cuántas extremidades. Dos ejercicios del mismo grupo SÍ son
 * intercambiables; de grupos distintos, nunca.
 *
 *   node scripts/clasificar-grupo.mjs            # propuesta
 *   node scripts/clasificar-grupo.mjs --write    # aplica
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const WRITE=process.argv.includes("--write");

const UNI = /\b(single[- ]arm|single[- ]leg|one[- ]arm|alternating|alternate|unilateral|\bSA\b|b[- ]stance|staggered|bulgarian|split squat|pistol|shrimp|lunge|step-?up|suitcase|windmill|cossack|skater|single-?single)\b/i;
const AISLA_BRAZO = /\b(pushdown|tricep|skull ?crusher|preacher|21s|waiter|spider|brachii)\b|(?<!leg |hamstring |nordic |jefferson |spinal )\bcurl\b/i;
const AISLA_HOMBRO= /\b(lateral raise|front raise|rear delt|reverse fly|face pull|external rotation|y-t-w|prone angels|dislocat|pass-?through|upright row)\b/i;
const AISLA_PIERNA= /\b(leg extension|leg curl|calf raise|abductor|adductor machine|hamstring curl|glute kickback|clamshell|standing abduction|monster walk|lateral walk|fire hydrant|frog pump|hip thrust|glute bridge|back extension|hip extension|reverse hyper|nordic)\b/i;
const GIMNASIA = /\b(muscle up|handstand|HSPU|pike push|l-?sit|dragon flag|ice cream maker|front lever|planche|rope climb|crow|bear crawl|shoot through|crab|ape|beast|recoil|triple sky|kipping|toes to bar|T2B|scap pull|dead hang|hanging)\b/i;
const OLIMPICO = /\b(clean|snatch|jerk|high pull|power position)\b/i;
const PLIO = /\b(jump|plyo|bound|broad|explosive|hand-?release|skater|burpee|slam|wall ball|thruster|devil press|sprint)\b/i;
const CORE_ANTIEXT = /\b(plank|ab wheel|rollout|dead bug|bird dog|hollow|walkout|body saw|walk out)\b/i;
const CORE_ANTIROT = /\b(pallof|chop|side plank|renegade|suitcase|windmill|press-?drag|bear kickstand|shoulder taps)\b/i;
const CORE_FLEX = /\b(sit-?up|crunch|leg raise|knee raise|v-?up|toe touch|spine flexion|russian twist)\b/i;
const CARGA = /\b(carry|farmer|sled)\b|\bsuitcase (hold|carry)\b/i;
const CARDIO = /\b(erg|bike|treadmill|(?<!db )walking(?! lunge)|jogging|zone 2|jump rope|jumping jacks|mountain climber|row erg|ski erg|incline walk)\b/i;

function grupo(e) {
  const n=e.name, p=e.movement_pattern, c=e.category, pl=e.movement_plane;
  if (c==="mobility") return ["mobility","categoría movilidad"];
  if (CARDIO.test(n)) return ["cardio_continuo","ergómetro o marcha continua"];
  if (OLIMPICO.test(n) && !/clean ?& ?jerk complex/i.test(n)) return ["olimpico","derivado de halterofilia"];
  if (GIMNASIA.test(n)) return ["gimnasia","destreza de peso corporal"];
  if (PLIO.test(n)) return ["pliometrico","salto o movimiento balístico"];
  if (CARGA.test(n) || p==="carry") return ["acarreo","transporte bajo carga"];
  if (AISLA_PIERNA.test(n)) return ["aisla_pierna","monoarticular o puente de pierna"];
  if (AISLA_BRAZO.test(n)) return ["aisla_brazo","monoarticular de brazo"];
  if (AISLA_HOMBRO.test(n)) return ["aisla_hombro","monoarticular de hombro"];
  if (CORE_ANTIROT.test(n)) return ["core_antirotacion","resistir rotación"];
  if (CORE_ANTIEXT.test(n)) return ["core_antiextension","resistir extensión"];
  if (CORE_FLEX.test(n)) return ["core_flexion","flexión de tronco"];
  const uni = UNI.test(n);
  if (p==="squat")  return [uni?"squat_unilateral":"squat_bilateral", uni?"sentadilla a una pierna":"sentadilla a dos piernas"];
  if (p==="hinge")  return [uni?"hinge_unilateral":"hinge_bilateral", uni?"bisagra a una pierna":"bisagra a dos piernas"];
  if (p==="push")   return [pl==="vertical"?"push_vertical":"push_horizontal", `empuje ${pl??"horizontal"}`];
  if (p==="pull")   return [pl==="vertical"?"pull_vertical":"pull_horizontal", `jalón ${pl??"horizontal"}`];
  if (p==="core")   return ["core_antiextension","core por defecto"];
  if (p==="rotation") return ["core_antirotacion","patrón de rotación"];
  if (p==="locomotion") return ["locomocion","desplazamiento"];
  return ["otro",`patrón ${p} sin regla`];
}

let ex=[]; for(let i=0;;i+=1000){const{data}=await sb.from("exercises").select("id,name,category,difficulty,movement_pattern,movement_plane,equipment_required,primary_muscles,is_active").range(i,i+999);ex=ex.concat(data??[]);if(!data||data.length<1000)break;}
const act=ex.filter(e=>e.is_active);
const asign=act.map(e=>({...e, g:grupo(e)[0], razon:grupo(e)[1]}));
const porG={}; for(const e of asign)(porG[e.g] ??= []).push(e);
console.log(`${act.length} ejercicios → ${Object.keys(porG).length} grupos\n`);
for (const [g,l] of Object.entries(porG).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`▸ ${g.padEnd(20)} ${String(l.length).padStart(3)}  ${l.slice(0,5).map(e=>e.name).join(" · ")}`);
}
const otros=porG["otro"]??[];
if (otros.length) { console.log(`\n⚠️  sin clasificar: ${otros.length}`); for(const e of otros) console.log(`    ${e.name} (${e.movement_pattern})`); }

if (!WRITE) { console.log("\n(propuesta: no se escribió nada)"); process.exit(0); }
let n=0;
for (const e of asign) { const { error } = await sb.from("exercises").update({ movement_group:e.g }).eq("id",e.id); if(!error)n++; else {console.log(`✗ ${e.name}: ${error.message}`); break;} }
console.log(`\n✅ ${n} clasificados`);
