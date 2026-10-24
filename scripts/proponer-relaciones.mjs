/**
 * Generador de relaciones entre ejercicios, con comprobaciones cruzadas.
 *
 * La versión anterior filtraba sólo por movement_group + un músculo en común.
 * Mejor que patrón+músculo, pero todavía dejaba pasar cosas como ofrecer un
 * Air Squat (bloque PRIME, 6s de descanso) para sustituir una sentadilla con
 * barra (bloque HEAVY, 135s). Mismo grupo, mismo músculo, propósito opuesto.
 *
 * Ahora cada par pasa SEIS filtros duros antes de puntuarse. Si falla uno,
 * se descarta: no se compensa con puntaje.
 *
 *   node scripts/proponer-relaciones.mjs "Nombre"        # candidatos de uno
 *   node scripts/proponer-relaciones.mjs "Nombre" --why  # y por qué se cae cada uno
 *   node scripts/proponer-relaciones.mjs --faltantes     # resumen global
 *   node scripts/proponer-relaciones.mjs --write         # a la cola de revisión
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const page=async(t,s,f)=>{let o=[];for(let i=0;;i+=1000){let q=sb.from(t).select(s).range(i,i+999);if(f)q=f(q);const{data}=await q;o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};

const ex=(await page("exercises","*")).filter(e=>e.is_active);
const EX=Object.fromEntries(ex.map(e=>[e.id,e]));
const rel=await page("exercise_substitutions","exercise_id,substitute_exercise_id");
const yaHay=new Set(rel.map(r=>`${r.exercise_id}|${r.substitute_exercise_id}`));
const tieneAlgo=new Set(rel.map(r=>r.exercise_id));
const gym=new Set((await page("equipment","code,gym_only")).filter(c=>c.gym_only).map(c=>c.code));

// ── perfil de uso, derivado de la programación real ──────────────────────
const progs=(await page("programs","id,user_id")).filter(p=>!p.user_id);
let sets=[];
for (const p of progs) {
  const ws=await page("workouts","id",q=>q.eq("program_id",p.id).is("user_id",null));
  const ids=ws.map(w=>w.id);
  for(let i=0;i<ids.length;i+=40) sets=sets.concat(await page("workout_sets","exercise_id,block_label,set_type,planned_reps,planned_rest_seconds",q=>q.in("workout_id",ids.slice(i,i+40))));
}
const porEj={}; for(const s of sets)(porEj[s.exercise_id] ??= []).push(s);
const PREP=/^(PRIME|RECOVERY|SOFT|RESET|MOBILITY|DYNAMIC|MYOFASCIAL|BREATHWORK|SPINE)/;
const META=/^(METCON|TABATA|ENGINE|FINISHER|CARDIO|ZONE|OPCIONAL|METABOLIC)/;
const perfil={}, reps={}, descanso={}, bloques={};
for (const [id,l] of Object.entries(porEj)) {
  const bs=[...new Set(l.map(s=>String(s.block_label??"").replace(/ — [A-C]$/,"")))];
  bloques[id]=bs;
  const r=l.filter(s=>s.planned_reps!=null).map(s=>s.planned_reps);
  reps[id]=r.length?[Math.min(...r),Math.max(...r)]:null;
  const d=l.filter(s=>s.planned_rest_seconds!=null).map(s=>s.planned_rest_seconds);
  descanso[id]=d.length?Math.round(d.reduce((a,b)=>a+b,0)/d.length):null;
  const esPrep=bs.every(b=>PREP.test(b)), esMeta=bs.some(b=>META.test(b));
  perfil[id] = esPrep ? "prep" : (esMeta && (descanso[id]??0)<30 ? "metabolico" : "cargado");
}
const perf=id=>perfil[id] ?? "sin_uso";

const UNI=/\b(single[- ]arm|single[- ]leg|one[- ]arm|alternating|unilateral|\bSA\b|b[- ]stance|staggered|bulgarian|split squat|pistol|shrimp|lunge|step-?up|suitcase|cossack|skater)\b/i;
const R={all_levels:1,beginner:1,intermediate:2,advanced:3};
const eq=e=>e.equipment_required??[];
const mus=e=>e.primary_muscles??[];
const nucleo=n=>n.toLowerCase().replace(/\([^)]*\)/g," ")
  .replace(/\b(barbell|bb|dumbbell|db|kettlebell|kb|cable|machine|banded|band|landmine|trap bar|ez bar|plate|plates|smith|ring|trx|pvc|sled|bodyweight|weighted)\b/g," ")
  .replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();

/** Devuelve null si pasa, o el motivo del descarte. */
function rechazo(e, c) {
  if (c.movement_group !== e.movement_group) return "otro grupo de movimiento";
  if (UNI.test(e.name) !== UNI.test(c.name))  return "unilateral vs bilateral";
  if (e.movement_plane && c.movement_plane && e.movement_plane!==c.movement_plane) return "otro plano";
  // La movilidad y el cardio continuo se eligen por lo que hacen, no se sustituyen por nivel
  if ((e.category==="mobility") !== (c.category==="mobility")) return "movilidad vs carga";
  // El filtro por category=="conditioning" se quitó a propósito: KB Swing está
  // categorizado como conditioning y rechazaba TODOS los pesos muertos, cuando
  // funcionalmente es una bisagra cargada. El perfil de uso, que se deriva de
  // la programación real en vez de una etiqueta, hace ese trabajo mejor.
  // Propósito en la programación real: un drill de PRIME no sustituye un HEAVY
  const pe=perf(e.id), pc=perf(c.id);
  if (pe!=="sin_uso" && pc!=="sin_uso" && pe!==pc) return `perfil de uso distinto (${pe} vs ${pc})`;
  // Rangos de repeticiones sin solape = propósitos distintos
  // Sólo aplica entre ejercicios de repeticiones. Un isométrico se programa
  // como "1 rep" de X segundos, y compararlo contra un rango de 6-15 da un
  // falso descarte.
  const re=reps[e.id], rc=reps[c.id];
  const ambosReps = re && rc && re[1]>1 && rc[1]>1;
  if (ambosReps && (rc[0] > re[1] || rc[1] < re[0])) return `rangos de reps sin solape (${re.join("-")} vs ${rc.join("-")})`;
  // Al menos un tercio de los músculos en común
  const comp=mus(c).filter(m=>mus(e).includes(m)).length;
  if (!comp) return "sin músculos en común";
  if (comp / Math.max(1, Math.min(mus(e).length, mus(c).length)) < 0.34) return "solape muscular débil";
  if (nucleo(c.name)===nucleo(e.name)) return "mismo núcleo de nombre (duplicado)";
  return null;
}

function candidatos(e, conMotivo=false) {
  const ok=[], no=[];
  for (const c of ex) {
    if (c.id===e.id || yaHay.has(`${e.id}|${c.id}`)) continue;
    const motivo = rechazo(e,c);
    if (motivo) { if (conMotivo && c.movement_group===e.movement_group) no.push({c,motivo}); continue; }
    const d=R[c.difficulty]-R[e.difficulty];
    const comparte=eq(e).some(q=>eq(c).includes(q));
    // Mismo nivel y mismo equipo no era "nada": Front Squat y Pause Box Squat
    // son alternativas legítimas de la sentadilla trasera — misma barra, otra
    // posición. Las fuentes las ponen en la misma escalera de progresión. Eso
    // es exactamente para lo que existe el tipo 'equivalent'.
    const tipo = d<0 ? "regression" : d>0 ? "progression"
               : (comparte ? "equivalent" : "equipment_swap");
    let score=10-Math.abs(d)*2;
    if (tipo==="equivalent") score-=1;   // una alternativa lateral vale menos que una salida real
    if (c.video_url) score+=3;
    if (!eq(c).some(q=>gym.has(q))) score+=2;
    const de=descanso[e.id], dc=descanso[c.id];
    if (de!=null && dc!=null && Math.abs(de-dc)<45) score+=2;
    const comp=mus(c).filter(m=>mus(e).includes(m)).length;
    score += Math.min(3, comp);
    ok.push({c,tipo,score});
  }
  return { ok: ok.sort((a,b)=>b.score-a.score), no };
}

const args=process.argv.slice(2);
const nombre=args.find(a=>!a.startsWith("--"));
if (nombre) {
  const e=ex.find(x=>x.name===nombre);
  if(!e){console.log("no existe");process.exit(1);}
  console.log(`▸ ${e.name} [${e.difficulty}] · grupo:${e.movement_group} · perfil:${perf(e.id)} · reps:${reps[e.id]?.join("-")??"—"} · descanso:${descanso[e.id]??"—"}s\n`);
  const { ok, no } = candidatos(e, args.includes("--why"));
  for (const {c,tipo,score} of ok.slice(0,8))
    console.log(`   ✓ ${String(tipo).padEnd(15)} ${c.name.padEnd(36)} [${c.difficulty.padEnd(12)}] ${String(perf(c.id)).padEnd(11)} score ${score}`);
  if (args.includes("--why")) {
    console.log(`\n   descartados del mismo grupo:`);
    for (const {c,motivo} of no.slice(0,10)) console.log(`   ✗ ${c.name.padEnd(36)} ${motivo}`);
  }
  process.exit(0);
}

const sinNada=ex.filter(e=>!tieneAlgo.has(e.id) && !["mobility","cardio_continuo"].includes(e.movement_group));
let conCand=0, totalRel=0;
const propuestas=[];
for (const e of sinNada) {
  const { ok } = candidatos(e);
  if (!ok.length) continue;
  conCand++;
  for (const {c,tipo,score} of ok.slice(0,3)) { totalRel++; propuestas.push({exercise_id:e.id, candidate_exercise_id:c.id, axis:tipo==="equipment_swap"?"equipment":"level", score, reason:`${tipo} · grupo ${e.movement_group} · perfil ${perf(e.id)}`}); }
}
console.log(`sin ninguna relación : ${sinNada.length}`);
console.log(`con candidatos       : ${conCand}`);
console.log(`sin candidato posible: ${sinNada.length-conCand}`);
console.log(`relaciones propuestas: ${totalRel}`);

if (!args.includes("--write")) { console.log("\n(sin --write: no se escribió nada)"); process.exit(0); }
await sb.from("substitution_candidates").delete().eq("status","pending");
let ins=0;
for (let i=0;i<propuestas.length;i+=200) {
  const { error } = await sb.from("substitution_candidates").upsert(propuestas.slice(i,i+200), { onConflict:"exercise_id,candidate_exercise_id" });
  if (error) { console.log(`✗ ${error.message}`); break; }
  ins+=propuestas.slice(i,i+200).length;
}
console.log(`\n✅ ${ins} propuestas en la cola de revisión`);
