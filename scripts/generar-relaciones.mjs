/**
 * Genera relaciones entre ejercicios SÓLO donde la decisión es defendible sin
 * criterio de entrenador. Todo lo demás se queda sin relación a propósito.
 *
 * Por qué así: un hueco es visible y honesto — el atleta ve "este ejercicio no
 * tiene alternativas". Una relación equivocada es un fallo silencioso: le
 * ofrece algo que no sirve, o peor, algo más difícil cuando necesitaba bajar.
 * Entre quedarme corto y equivocarme, me quedo corto.
 *
 * Dos clases se escriben como aprobadas (requires_review = false):
 *
 *   A · MISMA FAMILIA DE NOMBRE
 *       "Banded Goblet Squat" ↔ "Goblet Squat" — el mismo ejercicio con otra
 *       resistencia. Si además cambia de nivel, la dirección es obvia. No hace
 *       falta juicio: lo dice el nombre.
 *
 *   B · AISLAMIENTO CON EL MISMO OBJETIVO
 *       Un curl de bíceps es un curl de bíceps. Dentro de los grupos de
 *       aislamiento, con ≥60% de solape muscular y el MISMO nivel, cambiar de
 *       implemento no cambia el estímulo.
 *
 * Lo que NO se escribe: regresiones y progresiones que cruzan familias. Ahí sí
 * hay criterio (¿es un goblet squat la regresión correcta de una sentadilla
 * trasera, o lo es un box squat?) y eso se verifica caso por caso.
 *
 *   node scripts/generar-relaciones.mjs           # propuesta
 *   node scripts/generar-relaciones.mjs --write   # aplica
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const WRITE=process.argv.includes("--write");
const page=async(t,s,f)=>{let o=[];for(let i=0;;i+=1000){let q=sb.from(t).select(s).range(i,i+999);if(f)q=f(q);const{data}=await q;o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};

const ex=(await page("exercises","*")).filter(e=>e.is_active);
const EX=Object.fromEntries(ex.map(e=>[e.id,e]));
const rel=await page("exercise_substitutions","exercise_id,substitute_exercise_id");
const yaHay=new Set(rel.map(r=>`${r.exercise_id}|${r.substitute_exercise_id}`));
const gym=new Set((await page("equipment","code,gym_only")).filter(c=>c.gym_only).map(c=>c.code));

// perfil de uso real, para no mezclar un drill de PRIME con trabajo cargado
const progs=(await page("programs","id,user_id")).filter(p=>!p.user_id);
let sets=[];
for (const p of progs) { const ws=await page("workouts","id",q=>q.eq("program_id",p.id).is("user_id",null)); const ids=ws.map(w=>w.id);
  for(let i=0;i<ids.length;i+=40) sets=sets.concat(await page("workout_sets","exercise_id,block_label,planned_rest_seconds",q=>q.in("workout_id",ids.slice(i,i+40)))); }
const PREP=/^(PRIME|RECOVERY|SOFT|RESET|MOBILITY|DYNAMIC|MYOFASCIAL|BREATHWORK|SPINE)/;
const META=/^(METCON|TABATA|ENGINE|FINISHER|CARDIO|ZONE|OPCIONAL|METABOLIC)/;
const porEj={}; for(const s of sets)(porEj[s.exercise_id] ??= []).push(s);
const perfil={};
for (const [id,l] of Object.entries(porEj)) {
  const bs=[...new Set(l.map(s=>String(s.block_label??"").replace(/ — [A-C]$/,"")))];
  const d=l.filter(s=>s.planned_rest_seconds!=null).map(s=>s.planned_rest_seconds);
  const med=d.length?d.reduce((a,b)=>a+b,0)/d.length:null;
  perfil[id]= bs.every(b=>PREP.test(b)) ? "prep" : (bs.some(b=>META.test(b)) && (med??0)<30 ? "metabolico" : "cargado");
}
const perf=id=>perfil[id]??"sin_uso";

const IMPL=/\b(barbell|bb|dumbbell|db|kettlebell|kb|cable|machine|banded|band|landmine|trap bar|ez bar|plate|plates|smith|ring|trx|pvc|sled|bodyweight|weighted|double|seated|standing|lying|incline|decline|kneeling|half|tall|assisted)\b/gi;
const LADO=/\b(single[- ]arm|single[- ]leg|one[- ]arm|alternating|unilateral|\bsa\b|b[- ]stance|staggered)\b/gi;
const pal=n=>new Set(n.toLowerCase().replace(/\([^)]*\)/g," ").replace(IMPL," ").replace(LADO," ").replace(/[^a-z\s]/g," ").split(/\s+/).filter(w=>w.length>2));
const jac=(a,b)=>{const A=pal(a),B=pal(b); if(!A.size||!B.size) return 0; return [...A].filter(x=>B.has(x)).length/new Set([...A,...B]).size;};
const UNI=/\b(single[- ]arm|single[- ]leg|one[- ]arm|alternating|unilateral|\bSA\b|b[- ]stance|staggered|bulgarian|split squat|pistol|shrimp|lunge|step-?up|suitcase|cossack|skater)\b/i;
const R={all_levels:1,beginner:1,intermediate:2,advanced:3};
const mus=e=>e.primary_muscles??[], eq=e=>e.equipment_required??[];
const AISLA=new Set(["aisla_brazo","aisla_pierna","aisla_hombro"]);

// Pares que NO son sustituciones aunque el nombre se parezca.
const VETADOS=new Set([
  "4-7-8 Breathing|90/90 Breathing","90/90 Breathing|4-7-8 Breathing",       // protocolos distintos
  "Foam Roll Glutes|Foam Roll IT Band","Foam Roll IT Band|Foam Roll Glutes", // se rueda lo que está tenso
  "Goblet Cossack Squat|B-Stance DB Goblet Squat","B-Stance DB Goblet Squat|Goblet Cossack Squat", // plano frontal vs sagital
]);

// La etiqueta "más fácil / más difícil" sólo es confiable cuando lo que cambia
// es la CARGA o la ASISTENCIA. Si lo que cambia es el ángulo o el implemento,
// no hay dirección: es otra variante. Un press inclinado con mancuerna no es
// una regresión de uno plano con barra, por mucho que las etiquetas de nivel
// lo sugieran — y presentarlo como "más fácil" engaña al atleta.
const CARGA_O_ASISTENCIA=/\b(banded|assisted|weighted|bodyweight|elevated|deficit|pause|tuck|negative|1\+1\/2|21s|single|double|strict|kipping)\b/i;
const soloFormato=(a,b)=>{
  const dif=[...new Set([...a.toLowerCase().split(/\W+/), ...b.toLowerCase().split(/\W+/)])]
    .filter(w=>w.length>2 && (a.toLowerCase().includes(w)!==b.toLowerCase().includes(w)));
  return dif.length>0 && !dif.some(w=>CARGA_O_ASISTENCIA.test(w));
};

function base(e,c){
  if (c.id===e.id || c.movement_group!==e.movement_group) return false;
  if (yaHay.has(`${e.id}|${c.id}`)) return false;
  if (UNI.test(e.name)!==UNI.test(c.name)) return false;
  if (e.movement_plane && c.movement_plane && e.movement_plane!==c.movement_plane) return false;
  const pe=perf(e.id), pc=perf(c.id);
  if (pe!=="sin_uso" && pc!=="sin_uso" && pe!==pc) return false;
  return true;
}

const filas=[];
for (const e of ex) {
  const A=[], B=[];
  for (const c of ex) {
    if (!base(e,c)) continue;
    const comp=mus(c).filter(m=>mus(e).includes(m)).length;
    const ratio=comp/Math.max(1,Math.min(mus(e).length,mus(c).length));
    if (!comp) continue;
    const d=R[c.difficulty]-R[e.difficulty];
    const j=jac(e.name,c.name);
    const comparte=eq(e).some(q=>eq(c).includes(q));
    if (VETADOS.has(`${e.name}|${c.name}`)) continue;
    let tipo = d<0?"regression" : d>0?"progression" : (comparte?"equivalent":"equipment_swap");
    if ((tipo==="regression"||tipo==="progression") && soloFormato(e.name,c.name))
      tipo = comparte ? "equivalent" : "equipment_swap";
    const puntos=(c.video_url?3:0)+(eq(c).some(q=>gym.has(q))?0:2)+Math.min(3,comp)-Math.abs(d);
    // Umbral subido de 0.5 a 0.65 tras revisar la muestra: a 0.5 se colaba
    // "Kettlebell Swing to Snatch" ↔ "Dumbbell Snatch", que comparten la
    // palabra snatch pero no el movimiento.
    if (j>=0.65 && ratio>=0.5) A.push({c,tipo,puntos,clase:"A",j});
    // La clase B (aislamiento por solape muscular) se ELIMINÓ tras ver lo que
    // producía: "Dumbbell Hip Thrust" ↔ "Banded Hamstring Curl" y "Spider Curl"
    // ↔ "Kettlebell Curl to Halo". El grupo aisla_pierna mete en el mismo saco
    // hip thrusts, leg curls, elevaciones de gemelo y abductores. Demasiado
    // grueso para aprobar sin criterio.
  }
  const elegidos=A.sort((x,y)=>y.puntos-x.puntos).slice(0,3);
  for (const x of elegidos) filas.push({
    exercise_id:e.id, substitute_exercise_id:x.c.id, priority: x.tipo==="regression"?2:1,
    relation_type:x.tipo, requires_review:false,
    rationale: x.clase==="A"
      ? `Misma familia de movimiento (similitud de nombre ${(x.j*100).toFixed(0)}%). Generada en LFT-107.`
      : `Aislamiento equivalente: ${(x.ratio*100).toFixed(0)}% de solape muscular, mismo nivel. Generada en LFT-107.`,
  });
}

const porClase={A:filas.length, B:0};
const cubre=new Set(filas.map(f=>f.exercise_id));
console.log(`relaciones a escribir : ${filas.length}   (A:${porClase.A}  B:${porClase.B})`);
console.log(`ejercicios que cubren : ${cubre.size}`);
const tipos={}; for(const f of filas) tipos[f.relation_type]=(tipos[f.relation_type]??0)+1;
console.log(`por tipo              : ${JSON.stringify(tipos)}`);
console.log(`\nMuestra:`);
for (const f of filas) console.log(`   ${EX[f.exercise_id].name.padEnd(34)} ${String(f.relation_type).padEnd(15)} ${EX[f.substitute_exercise_id].name}`);

if (!WRITE) { console.log("\n(sin --write: no se escribió nada)"); process.exit(0); }
let n=0;
for (let i=0;i<filas.length;i+=200) {
  const { error } = await sb.from("exercise_substitutions").upsert(filas.slice(i,i+200), { onConflict:"exercise_id,substitute_exercise_id" });
  if (error) { console.log(`✗ ${error.message}`); break; }
  n+=filas.slice(i,i+200).length;
}
console.log(`\n✅ ${n} relaciones escritas`);
