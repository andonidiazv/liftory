/**
 * Fusiona dos fichas que resultaron ser el mismo ejercicio.
 *
 * Nunca borra: la perdedora queda is_active=false con merged_into apuntando a
 * la ganadora, para que los workout_sets históricos sigan resolviendo. Los sets
 * COMPLETADOS no se mueven — son historial del atleta. Sólo se repuntan los
 * pendientes.
 *
 *   node scripts/fusionar.mjs "Ganadora" "Perdedora" ["Nombre final"]
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env=loadEnv();
const sb=createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const [gn,pn,fin]=process.argv.slice(2);
const get=async n=>(await sb.from("exercises").select("id,video_url,thumbnail_url,is_active").eq("name",n).eq("is_active",true).maybeSingle()).data;
const g=await get(gn), p=await get(pn);
if(!g||!p){ console.log(`✗ no encontré ${!g?gn:pn} (activa)`); process.exit(1); }

if (!g.video_url && p.video_url) {
  const r=await sb.from("exercises").update({video_url:p.video_url,thumbnail_url:p.thumbnail_url}).eq("id",g.id);
  console.log(r.error?`✗ video: ${r.error.message}`:"   video heredado de la retirada");
}
let movidas=0, borradas=0;
for (const s of (await sb.from("exercise_substitutions").select("*").eq("substitute_exercise_id",p.id)).data??[]) {
  if (s.exercise_id===g.id) { await sb.from("exercise_substitutions").delete().eq("id",s.id); borradas++; continue; }
  const { data: ya } = await sb.from("exercise_substitutions").select("id").eq("exercise_id",s.exercise_id).eq("substitute_exercise_id",g.id).maybeSingle();
  if (ya) { await sb.from("exercise_substitutions").delete().eq("id",s.id); borradas++; }
  else { const r=await sb.from("exercise_substitutions").update({substitute_exercise_id:g.id}).eq("id",s.id); if(r.error) console.log(`✗ sub: ${r.error.message}`); else movidas++; }
}
for (const s of (await sb.from("exercise_substitutions").select("id").eq("exercise_id",p.id)).data??[]) { await sb.from("exercise_substitutions").delete().eq("id",s.id); borradas++; }

const { count: hechos } = await sb.from("workout_sets").select("*",{count:"exact",head:true}).eq("exercise_id",p.id).eq("is_completed",true);
const { data: mv } = await sb.from("workout_sets").select("id").eq("exercise_id",p.id).eq("is_completed",false);
for (let i=0;i<(mv?.length??0);i+=200) { const r=await sb.from("workout_sets").update({exercise_id:g.id}).in("id",mv.slice(i,i+200).map(x=>x.id)); if(r.error) console.log(`✗ sets: ${r.error.message}`); }
let r=await sb.from("exercises").update({is_active:false, merged_into:g.id}).eq("id",p.id);
if (r.error) { console.log(`✗ retirar: ${r.error.message}`); process.exit(1); }
console.log(`✓ ${pn} → ${gn}  ·  ${movidas} subs movidas, ${borradas} duplicadas borradas, ${mv?.length??0} sets repuntados, ${hechos} completados intactos`);

if (fin && fin!==gn) {
  r=await sb.from("exercises").update({name:`${pn} (fusionado)`}).eq("id",p.id);
  if (r.error) { console.log(`✗ liberar nombre: ${r.error.message}`); process.exit(1); }
  r=await sb.from("exercises").update({name:fin}).eq("id",g.id);
  console.log(r.error?`✗ renombrar: ${r.error.message}`:`✓ renombrada a "${fin}"`);
}
