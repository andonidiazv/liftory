/**
 * Auditoría de coherencia interna de las fichas de ejercicio.
 *
 * Busca contradicciones DENTRO del propio registro: el nombre dice una cosa y
 * los campos dicen otra. No necesita fuente externa, así que es barato y
 * encuentra los errores más evidentes antes de gastar investigación web.
 *
 *   node scripts/auditar-fichas.mjs           # resumen
 *   node scripts/auditar-fichas.mjs --detalle # cada hallazgo
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const DET=process.argv.includes("--detalle");
const page=async(t,s)=>{let o=[];for(let i=0;;i+=1000){const{data}=await sb.from(t).select(s).range(i,i+999);o=o.concat(data??[]);if(!data||data.length<1000)break;}return o;};

const ex=(await page("exercises","*")).filter(e=>e.is_active);
const gym=new Set((await page("equipment","code,gym_only")).filter(c=>c.gym_only).map(c=>c.code));
const MUS=Object.fromEntries((await page("muscles","code,region")).map(m=>[m.code,m.region]));

const H=[]; // hallazgos
const add=(e,tipo,detalle)=>H.push({ej:e.name,tipo,detalle});
const eq=e=>e.equipment_required??[];
const mus=e=>e.primary_muscles??[];
const n=e=>e.name.toLowerCase();

for (const e of ex) {
  // ── nombre vs equipo ──
  const exige=[[/\bbarbell\b|^bb |pendlay/,"barbell"],[/\bkettlebell|^kb \b/,"kettlebell"],
    [/\bdumbbell|^db \b/,"dumbbell"],[/\bcable\b/,"cable_machine"],[/\bbanded\b|(?<!it )\bband\b(?! pull)/,"band"],
    [/\bbarbell|landmine/,null]];
  for (const [re,req] of exige) if (req && re.test(n(e)) && !eq(e).includes(req)) add(e,"nombre↔equipo",`dice "${req}" en el nombre pero no lo declara · [${eq(e).join(",")||"—"}]`);
  if (/\bmachine\b/.test(n(e)) && !eq(e).some(q=>q.includes("machine"))) add(e,"nombre↔equipo",`dice "machine" pero no declara ninguna · [${eq(e).join(",")||"—"}]`);
  if (eq(e).length===0) add(e,"sin equipo declarado","el array está vacío (ni siquiera 'none')");
  if (eq(e).includes("none") && eq(e).length>1) add(e,"equipo contradictorio",`'none' junto a [${eq(e).filter(q=>q!=="none").join(",")}]`);

  // ── nombre vs patrón ──
  const patronEsperado=[[/\bsquat\b/,"squat"],[/\b(deadlift|rdl|hinge|hip thrust|good morning|swing)\b/,"hinge"],
    [/\b(press|push-?up|dip|fly)\b/,"push"],[/\b(row|pull-?up|chin-?up|pulldown)\b/,"pull"],[/(?<!leg |hamstring |nordic |jefferson |spinal )\bcurl\b/,"pull"],
    [/\b(carry|farmer)\b/,"carry"],[/\b(rotation|twist|chop)\b/,"rotation"]];
  for (const [re,p] of patronEsperado) if (re.test(n(e)) && e.movement_pattern!==p) {
    // zancadas y split squats son squat aunque digan lunge; los compuestos pueden diferir
    if (!/\b(complex|burpee|thruster|devil|clean|snatch|jerk|get-?up|flow|crawl)\b/.test(n(e)))
      add(e,"nombre↔patrón",`parece "${p}" pero está como "${e.movement_pattern}"`);
    break;
  }

  // ── nombre vs músculo ──
  const musEsperado=[[/(?<!leg |hamstring |nordic |jefferson |spinal |halo to |to )\bcurl\b/,"biceps"],
    [/\b(tricep|skull ?crusher|pushdown|dip)\b/,"triceps"],[/\bcalf|calves\b/,"calves"],
    [/\bglute|hip thrust\b/,"glutes"],[/\bleg curl|hamstring|nordic\b/,"hamstrings"],
    [/\blat pull|pulldown|pull-?up\b/,"lats"]];
  for (const [re,m] of musEsperado) if (re.test(n(e)) && !mus(e).includes(m))
    add(e,"nombre↔músculo",`dice "${m}" en el nombre pero no está en primary_muscles · [${mus(e).join(",")}]`);

  // ── coherencia de dificultad ──
  if (e.difficulty==="all_levels" && /\b(muscle up|pistol|dragon|handstand|HSPU|snatch|clean|nordic|planche|l-?sit)\b/.test(n(e)))
    add(e,"nivel dudoso",`marcado all_levels siendo un movimiento de destreza`);

  // ── texto ──
  if (!e.description?.trim()) add(e,"sin descripción","");
  if (!e.coaching_cue?.trim()) add(e,"sin cue","");
  if (e.description && e.description.length<40) add(e,"descripción muy corta",`${e.description.length} caracteres`);
  if (e.name_es && e.name_es.trim()===e.name.trim()) add(e,"name_es sin traducir",`"${e.name_es}"`);
  if (e.description && /\blorem ipsum\b|\bTODO:|\bTBD\b|\bplaceholder\b/.test(e.description)) add(e,"texto de relleno","");

  // ── media ──
  if (e.video_url && !e.thumbnail_url) add(e,"video sin thumbnail","");
  if (!e.video_url && e.thumbnail_url) add(e,"thumbnail sin video","");

  // ── campos vacíos que importan ──
  if (!e.movement_pattern) add(e,"sin patrón de movimiento","");
  if (!mus(e).length) add(e,"sin músculos","");
  const fueraMus=mus(e).filter(m=>!MUS[m]);
  if (fueraMus.length) add(e,"músculo fuera de catálogo",fueraMus.join(","));
}

const porTipo={}; for(const h of H)(porTipo[h.tipo] ??= []).push(h);
console.log(`${ex.length} fichas auditadas · ${H.length} hallazgos en ${new Set(H.map(h=>h.ej)).size} ejercicios\n`);
for (const [t,l] of Object.entries(porTipo).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`▸ ${t} — ${l.length}`);
  for (const h of (DET?l:l.slice(0,4))) console.log(`    ${h.ej.padEnd(36)} ${h.detalle}`);
  if (!DET && l.length>4) console.log(`    … y ${l.length-4} más (usa --detalle)`);
}
