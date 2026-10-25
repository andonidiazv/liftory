/** Estado de la cobertura de relaciones entre ejercicios. */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(t,s)=>{let o=[];for(let i=0;;i+=1000){const{data}=await sb.from(t).select(s).range(i,i+999);o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};
const ex=(await page("exercises","*")).filter(e=>e.is_active);
const EX=Object.fromEntries(ex.map(e=>[e.id,e]));
const rel=await page("exercise_substitutions","*");
const tiene=new Set(rel.map(r=>r.exercise_id));
const R={all_levels:1,beginner:1,intermediate:2,advanced:3};
let mal=0;
for (const r of rel){const o=EX[r.exercise_id],d=EX[r.substitute_exercise_id];if(!o||!d)continue;
  if(r.relation_type==="regression"&&R[d.difficulty]>=R[o.difficulty])mal++;
  if(r.relation_type==="progression"&&R[d.difficulty]<=R[o.difficulty])mal++;}
const rl=ex.filter(e=>!["mobility","cardio_continuo"].includes(e.movement_group));
const t={}; for(const r of rel) t[r.relation_type]=(t[r.relation_type]??0)+1;
console.log(`relaciones ${rel.length}  ·  ${JSON.stringify(t)}`);
console.log(`incoherencias de dirección: ${mal}  ·  sin aprobar: ${rel.filter(r=>r.requires_review).length}`);
console.log(`con salida: ${rl.filter(e=>tiene.has(e.id)).length} de ${rl.length}  ·  sin nada: ${rl.filter(e=>!tiene.has(e.id)).length}\n`);
const g={}; for(const e of rl.filter(e=>!tiene.has(e.id)))(g[e.movement_group] ??= []).push(e.name);
for (const [k,l] of Object.entries(g).sort((a,b)=>b[1].length-a[1].length)) console.log(`  ${k.padEnd(20)} ${String(l.length).padStart(2)}  ${l.slice(0,3).join(" · ")}`);
