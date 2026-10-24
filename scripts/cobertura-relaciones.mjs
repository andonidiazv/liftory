/**
 * ¿Qué ejercicios tienen salida (regresión, progresión o cambio de equipo) y
 * cuáles no?
 *
 * No todos la necesitan: una respiración diafragmática o un foam roll no
 * tienen regresión, y exigirles una sería ruido. Este reporte separa lo que
 * de verdad necesita opciones de lo que no aplica.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(t,s,f)=>{let o=[];for(let i=0;;i+=1000){let q=sb.from(t).select(s).range(i,i+999);if(f)q=f(q);const{data}=await q;o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};

const ex=(await page("exercises","*")).filter(e=>e.is_active);
const EX=Object.fromEntries(ex.map(e=>[e.id,e]));
const rel=await page("exercise_substitutions","*");
const porOrigen={}; for(const r of rel)(porOrigen[r.exercise_id] ??= []).push(r);

// Qué ejercicios se usan en la programación real
const progs=(await page("programs","id,name,user_id")).filter(p=>!p.user_id);
const usados=new Set(); const usos={};
for (const p of progs) {
  const ws=await page("workouts","id",q=>q.eq("program_id",p.id).is("user_id",null));
  const ids=ws.map(w=>w.id);
  for(let i=0;i<ids.length;i+=40){
    for(const s of await page("workout_sets","exercise_id",q=>q.in("workout_id",ids.slice(i,i+40)))){
      usados.add(s.exercise_id); usos[s.exercise_id]=(usos[s.exercise_id]??0)+1;
    }
  }
}

// "No aplica": cosas que se eligen por lo que hacen, no por dificultad.
const NO_APLICA = e =>
  e.category==="mobility" && e.difficulty==="all_levels" ||
  /breathing|respiraci|body scan|foam roll|lacrosse|CARs|stretch|pose|legs up the wall/i.test(e.name) ||
  /^(walking|jogging|zone 2|row erg|ski erg)/i.test(e.name);

const tiene = e => (porOrigen[e.id]??[]).length>0;
const enUso = ex.filter(e=>usados.has(e.id));
const necesitan = enUso.filter(e=>!NO_APLICA(e));

console.log("══ RESPUESTA CORTA ══");
console.log(`  ejercicios activos            : ${ex.length}`);
console.log(`  con alguna relación           : ${ex.filter(tiene).length}`);
console.log(`  SIN NINGUNA                   : ${ex.filter(e=>!tiene(e)).length}\n`);
console.log("══ PERO LO QUE IMPORTA ES LA PROGRAMACIÓN REAL ══");
console.log(`  usados en tus plantillas      : ${enUso.length}`);
console.log(`  de esos, "no aplica"          : ${enUso.filter(NO_APLICA).length}  (respiración, estiramientos, foam roll, cardio continuo)`);
console.log(`  los que SÍ necesitan salida   : ${necesitan.length}`);
console.log(`     con salida                 : ${necesitan.filter(tiene).length}  (${(100*necesitan.filter(tiene).length/necesitan.length).toFixed(0)}%)`);
console.log(`     SIN SALIDA                 : ${necesitan.filter(e=>!tiene(e)).length}  <<<\n`);

const sin = necesitan.filter(e=>!tiene(e)).sort((a,b)=>(usos[b.id]??0)-(usos[a.id]??0));
console.log("══ LOS 15 MÁS USADOS QUE NO TIENEN NINGUNA SALIDA ══");
for (const e of sin.slice(0,15))
  console.log(`  ${String(usos[e.id]).padStart(3)} sets · ${e.name.padEnd(34)} [${e.difficulty.padEnd(12)}] ${e.movement_pattern.padEnd(10)} [${(e.equipment_required??[]).join(",")}]`);
