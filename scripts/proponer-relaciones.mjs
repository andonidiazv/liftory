/**
 * LFT-118 · Generador de candidatos basado en GRUPO de movimiento.
 *
 * Reemplaza el criterio anterior (patrón + músculo compartido), que proponía
 * "Leg Extension" como alternativa a la sentadilla con barra.
 *
 * Reglas, en orden de dureza:
 *   1. Mismo movement_group. Sin excepción — es lo que define "intercambiable".
 *   2. Perfil de uso compatible: un drill de calentamiento no sustituye trabajo
 *      cargado, aunque el grupo coincida.
 *   3. El eje decide el tipo: nivel distinto → regresión/progresión.
 *      Mismo nivel y equipo distinto → equipment_swap.
 *   4. Se descartan los que ya tienen relación y los casi-duplicados.
 *
 *   node scripts/proponer-relaciones.mjs "Nombre"   # ver candidatos de uno
 *   node scripts/proponer-relaciones.mjs --faltantes # los que no tienen nada
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(t,s)=>{let o=[];for(let i=0;;i+=1000){const{data}=await sb.from(t).select(s).range(i,i+999);o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};

const ex=(await page("exercises","*")).filter(e=>e.is_active);
const EX=Object.fromEntries(ex.map(e=>[e.id,e]));
const rel=await page("exercise_substitutions","exercise_id,substitute_exercise_id");
const yaHay=new Set(rel.map(r=>`${r.exercise_id}|${r.substitute_exercise_id}`));
const tieneAlgo=new Set(rel.map(r=>r.exercise_id));
const gym=new Set((await page("equipment","code,gym_only")).filter(c=>c.gym_only).map(c=>c.code));
const R={all_levels:1,beginner:1,intermediate:2,advanced:3};

const nucleo=n=>n.toLowerCase().replace(/\([^)]*\)/g," ")
  .replace(/\b(barbell|bb|dumbbell|db|kettlebell|kb|cable|machine|banded|band|landmine|trap bar|ez bar|plate|plates|smith|ring|trx|pvc|sled|bodyweight|weighted)\b/g," ")
  .replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();

function candidatos(e) {
  const mismos = ex.filter(c =>
    c.id!==e.id &&
    c.movement_group===e.movement_group &&
    !yaHay.has(`${e.id}|${c.id}`) &&
    nucleo(c.name)!==nucleo(e.name)
  );
  const eq=x=>x.equipment_required??[];
  const comparteEquipo=(a,b)=>eq(a).some(q=>eq(b).includes(q));
  const out=[];
  for (const c of mismos) {
    const d=R[c.difficulty]-R[e.difficulty];
    let tipo = d<0 ? "regression" : d>0 ? "progression" : (comparteEquipo(e,c) ? null : "equipment_swap");
    if (!tipo) continue;
    // comparten al menos un músculo: dentro del grupo, afina el objetivo
    if (!(c.primary_muscles??[]).some(m=>(e.primary_muscles??[]).includes(m))) continue;
    let score = 10 - Math.abs(d)*2;
    if (c.video_url) score += 3;
    if (!eq(c).some(q=>gym.has(q))) score += 2;   // se puede hacer en casa
    out.push({ c, tipo, score });
  }
  return out.sort((a,b)=>b.score-a.score);
}

const arg = process.argv[2];
if (arg && arg!=="--faltantes") {
  const e=ex.find(x=>x.name===arg);
  if(!e){console.log("no existe");process.exit(1);}
  console.log(`▸ ${e.name} [${e.difficulty}] · grupo: ${e.movement_group}\n`);
  for (const {c,tipo,score} of candidatos(e).slice(0,8))
    console.log(`   ${String(tipo).padEnd(15)} ${c.name.padEnd(36)} [${c.difficulty.padEnd(12)}] [${(c.equipment_required??[]).join(",")}]  score ${score}`);
  process.exit(0);
}

const sinNada = ex.filter(e=>!tieneAlgo.has(e.id) && !["mobility","cardio_continuo"].includes(e.movement_group));
console.log(`${sinNada.length} ejercicios sin ninguna relación (excluyendo movilidad y cardio continuo)\n`);
let conCand=0, total=0;
for (const e of sinNada) { const c=candidatos(e); if(c.length){conCand++; total+=Math.min(c.length,3);} }
console.log(`  con candidatos encontrados : ${conCand}`);
console.log(`  sin candidato posible      : ${sinNada.length-conCand}`);
console.log(`  relaciones proponibles     : ~${total}`);
