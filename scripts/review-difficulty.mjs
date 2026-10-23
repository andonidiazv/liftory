/**
 * Revisión de nivel (difficulty) de los 474 ejercicios.
 *
 * RÚBRICA — la regla que decide, para que los cambios no sean a ojo:
 *
 *   all_levels   Sin barrera técnica para un principiante Y sigue siendo útil
 *                para un avanzado. Lo que escala es la carga o la duración, no
 *                el movimiento. Respiración, CARs, liberación miofascial,
 *                estiramientos, planchas, caminar, Zona 2, aislamiento en
 *                máquina, curls y elevaciones básicas.
 *
 *   beginner     Punto de entrada. Seguro y simple, pero un avanzado lo supera
 *                y deja de usarlo. Dominada asistida, remo invertido, zancada
 *                sin peso, burpee con paso atrás.
 *
 *   intermediate Exige un patrón ya establecido. Compuestos con barra,
 *                unilateral cargado, coordinación moderada.
 *
 *   advanced     Alta demanda técnica o prerrequisito de fuerza real.
 *                Olímpicos con barra, gimnasia, unilateral de alta destreza.
 *
 *   node scripts/review-difficulty.mjs            # propuesta, no escribe
 *   node scripts/review-difficulty.mjs --write    # aplica
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,
  env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const WRITE = process.argv.includes("--write");

// ── Reglas por patrón de nombre. La primera que coincide gana. ───────────
const REGLAS = [
  // Nada de esto tiene barrera técnica y nadie lo supera nunca.
  [/\bbreathing\b|respiraci|body scan/i,                 "all_levels", "respiración"],
  [/\bCARs\b/i,                                          "all_levels", "CARs articulares"],
  [/foam roll|lacrosse ball|thoracic extension over foam/i,"all_levels","liberación miofascial"],
  [/\bstretch\b|\bpose\b|forward fold|pancake|butterfly|couch|pigeon|child|hero|scorpion|thread the needle|legs up the wall|elephant walk|russian baby maker|world'?s greatest/i,
                                                          "all_levels", "estiramiento"],
  [/cat-cow|quadruped (t-spine|thoracic)|wall slide|prone (angels|y-t-w)|scap(ular)? (push-up|pull)|spinal twist|hip opener|hip switches|internal rotation|leg swings|wrist mobility|squat priming|hamstring hinge reach|lunge hamstring rock|squatted (spine|lateral|segmented)/i,
                                                          "all_levels", "preparación de movimiento"],
  [/\bhold\b.*squat|bottom of squat|deep squat hold/i,    "all_levels", "posición sostenida"],
  // Cardio de estado estable: el avanzado lo usa igual, sólo más rápido.
  [/^walking$|^jogging$|zone 2|steady pace|incline walk|low intensity|legs only assault|^row erg$|^ski erg$/i,
                                                          "all_levels", "cardio continuo"],
];

// ── Correcciones individuales, con su razón. Lo que la regla no alcanza. ──
const MANUAL = {
  // Estaban demasiado bajo
  "Box Pistol Squat":                        ["intermediate","es la regresión estándar del pistol, no un punto de entrada"],
  "Kettlebell Bottoms-Up Press":             ["intermediate","el bottoms-up exige control de muñeca y hombro ya construido"],
  "Power Position Hold":                     ["intermediate","posición de halterofilia con barra"],
  // Estaban demasiado alto
  "Deadlift":                                ["intermediate","peso muerto convencional es un levantamiento fundacional, no avanzado"],
  "Barbell Bulgarian Split Squat":           ["intermediate","split squat cargado: exige patrón, no destreza avanzada"],
  "Barbell Back-Rack Bulgarian Split Squat": ["intermediate","igual que el anterior"],
  "Barbell Front Rack Lunge":                ["intermediate","zancada con barra al frente: demanda de core, no de destreza"],
  "Banded Row on Side Plank":                ["intermediate","remo con banda en plancha lateral; exigente, no avanzado"],
  "Weighted Lateral Plank Dinámico":         ["intermediate","plancha lateral con peso"],
  // all_levels mal puesto: sí hay barrera de entrada
  "V-ups":                                   ["intermediate","exige fuerza de core ya construida; un principiante no la ejecuta limpia"],
  "Single Arm Dumbbell Push Press":          ["intermediate","unilateral, overhead y con impulso de pierna a la vez"],
  // all_levels que faltaba
  "Air Squat":                               ["all_levels","patrón universal que nadie supera"],
  "Plank":                                   ["all_levels","ya estaba"],
  "Dead Hang":                               ["all_levels","colgarse sirve igual en cualquier nivel"],
  "Bird Dog":                                ["all_levels","activación universal"],
  "Dead Bug":                                ["all_levels","activación universal"],
  "Side Plank":                              ["all_levels","isométrico universal; la progresión es el tiempo"],
  "Glute Bridge Bodyweight":                 ["all_levels","activación universal"],
  "Farmer Carry":                            ["all_levels","el acarreo escala con carga, no con técnica"],
  "Farmer Walk":                             ["all_levels","igual"],
  "Farmer Hold":                             ["all_levels","igual"],
  "SA Farmer Hold":                          ["all_levels","igual"],
  "Jump Rope Singles":                       ["all_levels","salto de cuerda básico"],
  "Jumping Jacks":                           ["all_levels","calentamiento universal"],
  "Mountain Climbers":                       ["all_levels","se usa en todos los niveles"],
  "Wide Mountain Climbers":                  ["all_levels","igual"],
  // Coherencia entre fichas del mismo movimiento
  "Barbell Curl":                            ["beginner","para igualar a Barbell Bicep Curl, que es el mismo movimiento"],
};

// Lo que NO debe tocar ninguna regla aunque el nombre coincida.
const INTOCABLES = new Set([
  "Half-Kneeling KB Snatch + Windmill","Turkish Get-Up","KB Windmill",
  "Kettlebell Half Kneeling Windmill","Jefferson Curl","Kang Squat",
  "Toes Behind Ear Fold","Single Leg L-Sit Pulse","Over Under Fence Push-up",
  "Beast to Ape Flow","Push-up to Alternating Toe Touch","V Pike to Alternating Crab Reach",
  "Weighted Ankle Stretch","Active Adductor Stretch","Supine Active Hamstring Stretch",
  "Hanging Stretch","Crocodile Roll","Sprint",
]);

let ex=[]; for(let i=0;;i+=1000){const{data}=await sb.from("exercises").select("id,name,category,difficulty,is_active").range(i,i+999);ex=ex.concat(data??[]);if(!data||data.length<1000)break;}

const cambios=[];
for (const e of ex.filter(x=>x.is_active)) {
  let destino=null, razon=null;
  if (MANUAL[e.name]) { [destino,razon]=MANUAL[e.name]; }
  else if (!INTOCABLES.has(e.name)) {
    for (const [re,d,r] of REGLAS) if (re.test(e.name)) { destino=d; razon=r; break; }
  }
  if (destino && destino!==e.difficulty) cambios.push({...e, destino, razon});
}

const antes={}, despues={};
for (const e of ex.filter(x=>x.is_active)) { antes[e.difficulty]=(antes[e.difficulty]??0)+1; }
for (const e of ex.filter(x=>x.is_active)) {
  const c=cambios.find(x=>x.id===e.id);
  const d=c?c.destino:e.difficulty; despues[d]=(despues[d]??0)+1;
}
console.log("ANTES  ", JSON.stringify(antes));
console.log("DESPUÉS", JSON.stringify(despues));
console.log(`\n${cambios.length} ejercicios cambian de nivel\n`);
const porRazon={}; for(const c of cambios)(porRazon[c.razon] ??= []).push(c);
for (const [r,l] of Object.entries(porRazon).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`▸ ${r} — ${l.length}`);
  for (const c of l.slice(0,60)) console.log(`    ${c.difficulty.padEnd(13)}→ ${c.destino.padEnd(13)} ${c.name}`);
  if (l.length>60) console.log(`    … y ${l.length-60} más`);
}

if (!WRITE) { console.log("\n(propuesta: no se escribió nada. --write para aplicar)"); process.exit(0); }
let n=0;
for (const c of cambios) {
  const { error } = await sb.from("exercises").update({ difficulty: c.destino }).eq("id", c.id);
  if (error) console.log(`✗ ${c.name}: ${error.message}`); else n++;
}
console.log(`\n✅ ${n} ejercicios actualizados`);
