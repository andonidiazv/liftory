/**
 * Regenera public/pendientes-grabacion.html desde el catálogo en producción.
 * Agrupa por estación de grabación — el costo real de una sesión es montar y
 * desmontar equipo, no el ejercicio en sí.
 *
 *   node scripts/video-pendientes.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
import { writeFileSync, readFileSync } from "fs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const ELITE="32302803-ead8-4e08-809a-606031a7b7e0";
const { data: all } = await sb.from("exercises").select("*").eq("is_active",true);
const { data: subs } = await sb.from("exercise_substitutions").select("*");
const esSub=new Set(subs.map(s=>s.substitute_exercise_id));
const { data: ws } = await sb.from("workouts").select("id").eq("program_id",ELITE).is("user_id",null);
const ids=ws.map(w=>w.id); const uso={};
for(let i=0;i<ids.length;i+=200){ const{data}=await sb.from("workout_sets").select("exercise_id").in("workout_id",ids.slice(i,i+200));
  for(const r of data??[]) if(r.exercise_id) uso[r.exercise_id]=(uso[r.exercise_id]??0)+1; }
const sinVideo=all.filter(e=>!e.video_url);

// ── SESIONES por estación de grabación ──
const SESIONES=[
 { id:"bw", nombre:"Sin equipo", sub:"Piso, pared y tu cuerpo", match:q=>q.every(x=>["none","wall","mat"].includes(x)) },
 { id:"db", nombre:"Mancuernas", sub:"Un par de mancuernas y un banco", match:q=>q.some(x=>["dumbbell","dumbbells"].includes(x)) },
 { id:"kb", nombre:"Kettlebells", sub:"Juego de KB", match:q=>q.includes("kettlebell") },
 { id:"bb", nombre:"Barra y rack", sub:"Barra, discos, rack y banco", match:q=>q.some(x=>["barbell","plates","plate","rack","squat_rack","ez_bar","trap_bar","landmine","landmine_attachment","smith_machine"].includes(x)) },
 { id:"band", nombre:"Bandas", sub:"Bandas de resistencia y mini-bandas", match:q=>q.some(x=>["band","resistance_band","band_or_partner"].includes(x)) },
 { id:"bar", nombre:"Barra de dominadas", sub:"Barra fija y anillas", match:q=>q.some(x=>["pull_up_bar","dip_bars","rope"].includes(x)) },
 { id:"cable", nombre:"Poleas", sub:"Torre de cables", match:q=>q.some(x=>["cable","cable_machine","straight_bar_attachment","rope_attachment","ankle_attachment"].includes(x)) },
 { id:"maq", nombre:"Máquinas", sub:"Selectorizadas del gym", match:q=>q.some(x=>x.includes("machine")||["leg_press_machine","hyperextension_bench","pec_deck_machine"].includes(x)) },
 { id:"box", nombre:"Cajón y plyo", sub:"Cajón, step y balón medicinal", match:q=>q.some(x=>["box","plyo_box","box_or_bench","step","medicine_ball","medball"].includes(x)) },
 { id:"rec", nombre:"Recuperación", sub:"Foam roller, pelota y PVC", match:q=>q.some(x=>["foam_roller","lacrosse_ball","pvc"].includes(x)) },
 { id:"cardio", nombre:"Cardio", sub:"Ergs y caminadora", match:q=>q.some(x=>["ski_erg","treadmill","assault_bike","rowing_machine","sled","cardio_modality"].includes(x)) },
];
const asignado=new Set(); const porSesion={};
for(const s of SESIONES){
  porSesion[s.id]=sinVideo.filter(e=>!asignado.has(e.id)&&s.match(e.equipment_required??["none"]));
  porSesion[s.id].forEach(e=>asignado.add(e.id));
}
const huerf=sinVideo.filter(e=>!asignado.has(e.id));
if(huerf.length) porSesion["otros"]=huerf;

const prio=e=> esSub.has(e.id) ? 1 : (uso[e.id] ? 2 : 3);
// dentro de la sesión: por prioridad, luego por posición corporal, luego por uso
const POS=e=>{ const n=e.name.toLowerCase();
  if(/lying|supine|dead bug|floor|prone|plank|bridge|glute bridge|sit.?up|crunch|hollow/.test(n)) return 3;
  if(/kneeling|quadruped|bear|crawl|child|cat/.test(n)) return 2;
  return 1; };
const POSN=["","De pie","Arrodillado / cuadrupedia","En el piso"];

const data=SESIONES.concat([{id:"otros",nombre:"Otros",sub:"Equipo suelto"}]).filter(s=>porSesion[s.id]?.length).map(s=>({
  ...s,
  ejercicios: porSesion[s.id].sort((a,b)=> prio(a)-prio(b) || POS(a)-POS(b) || (uso[b.id]??0)-(uso[a.id]??0))
    .map(e=>({ name:e.name, es:e.name_es, p:prio(e), uso:uso[e.id]??0, pos:POS(e), dif:e.difficulty,
               eq:(e.equipment_required??[]).join(" · "), cue:(e.coaching_cue??"").slice(0,180) })),
}));
writeFileSync("/tmp/videos.json", JSON.stringify({ total:sinVideo.length, conVideo:all.length-sinVideo.length, catalogo:all.length,
  p1:sinVideo.filter(e=>prio(e)===1).length, p2:sinVideo.filter(e=>prio(e)===2).length, p3:sinVideo.filter(e=>prio(e)===3).length,
  sesiones:data }, null, 1));
console.log(`${sinVideo.length} sin video · ${data.length} sesiones`);
data.forEach(s=>console.log(`  ${s.nombre.padEnd(22)} ${String(s.ejercicios.length).padStart(3)}  (P1:${s.ejercicios.filter(e=>e.p===1).length} P2:${s.ejercicios.filter(e=>e.p===2).length} P3:${s.ejercicios.filter(e=>e.p===3).length})`));
const D = JSON.parse(readFileSync("/tmp/videos.json","utf8"));
const esc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const PTAG = { 1:["P1","Ruta de escape"], 2:["P2","Programado"], 3:["P3","Dormido"] };

// bloques de ~30 para dividir sesiones largas
const bloques = s => {
  const out=[]; const max=30;
  for(let i=0;i<s.ejercicios.length;i+=max) out.push(s.ejercicios.slice(i,i+max));
  return out;
};

const sesionHTML = (s, idx) => {
  const bs = bloques(s);
  const p1 = s.ejercicios.filter(e=>e.p===1).length;
  const mins = Math.round(s.ejercicios.length * 2.5);
  return `
<section class="ses" id="ses-${s.id}">
  <div class="seshead">
    <div class="sesnum">${String(idx+1).padStart(2,"0")}</div>
    <div class="sesinfo">
      <h2>${esc(s.nombre)}</h2>
      <p class="sessub">${esc(s.sub)}</p>
    </div>
    <div class="sesmeta">
      <span class="chip">${s.ejercicios.length} ejercicios</span>
      ${p1?`<span class="chip crit">${p1} críticos</span>`:""}
      <span class="chip ghost">~${mins>60?`${(mins/60).toFixed(1)} h`:`${mins} min`}</span>
    </div>
  </div>
  ${bs.map((b,bi)=>`
  <div class="tanda">
    ${bs.length>1?`<p class="tandatit">Tanda ${bi+1} de ${bs.length}</p>`:""}
    <div class="tscroll"><table>
      <thead><tr><th class="c-chk"></th><th>Ejercicio</th><th class="c-pos">Posición</th><th class="c-pri">Prioridad</th><th class="c-uso n">Sets</th></tr></thead>
      <tbody>
      ${b.map(e=>`<tr class="p${e.p}">
        <td class="c-chk"><span class="chk"></span></td>
        <td class="nom"><b>${esc(e.name)}</b><span class="es">${esc(e.es)}</span></td>
        <td class="c-pos pos">${POSN[e.pos]}</td>
        <td class="c-pri"><span class="pri p${e.p}">${PTAG[e.p][0]}</span> <span class="pril">${PTAG[e.p][1]}</span></td>
        <td class="c-uso n">${e.uso||"—"}</td>
      </tr>`).join("")}
      </tbody>
    </table></div>
  </div>`).join("")}
</section>`;
};

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Pendientes de Grabación</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap">
<style>
/* Lista de rodaje · dark LIFTORY · una columna, tablas a sangre, pensada para
   abrirse en el celular en el gym y tacharse con el dedo. */
:root{
  --pitch:#0D0D0F; --graphite:#16161A; --slate:#1F1F24; --hairline:#2A2A30;
  --clean:#FAFAFA; --ash:#A1A1AA; --zinc:#71717A;
  --gold:#C4A24E; --gold-dim:#8A7236; --sage:#7A8B5C; --brick:#C0392B; --amber:#B8862B;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{background:var(--pitch);color:var(--clean);font-family:"DM Sans",system-ui,sans-serif;
  font-size:16px;line-height:1.6;font-weight:300;margin:0;-webkit-font-smoothing:antialiased}
.wrap{max-width:900px;margin:0 auto;padding-inline:18px;padding-block:0 80px}
h1,h2,h3{font-family:"Syne",system-ui,sans-serif;font-weight:800;text-wrap:balance;margin:0}
h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.04;letter-spacing:-.02em;text-transform:uppercase}
h2{font-size:clamp(1.1rem,3vw,1.4rem);line-height:1.15;text-transform:uppercase;letter-spacing:-.01em}
h3{font-size:.95rem;font-weight:700;margin-bottom:.4em}
p{margin:0 0 1em}
.lede{font-size:1.06rem;color:var(--ash);line-height:1.6}
strong{font-weight:600;color:var(--clean)}
code{font-family:"DM Mono",monospace;font-size:.86em;background:var(--slate);padding:2px 6px;border-radius:3px;color:var(--gold)}

header{padding-block:clamp(42px,9vw,76px) 0;border-bottom:1px solid var(--hairline);margin-bottom:38px}
.kicker{font-family:"DM Mono",monospace;font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:0 0 1.5em}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:2em 0}
.stat{background:var(--graphite);border:1px solid var(--hairline);border-radius:3px;padding:14px 16px}
.stat .n{font-family:"Syne",sans-serif;font-weight:800;font-size:1.7rem;line-height:1;color:var(--clean)}
.stat .n.gold{color:var(--gold)}
.stat .l{font-family:"DM Mono",monospace;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--zinc);margin-top:6px}

.box{border:1px solid var(--hairline);border-left:2px solid var(--gold);border-radius:3px;
  background:var(--graphite);padding:clamp(16px,3.5vw,24px);margin:1.8em 0}
.box.warn{border-left-color:var(--amber)}
.box .tag{display:block;font-family:"DM Mono",monospace;font-size:.62rem;letter-spacing:.14em;
  text-transform:uppercase;color:var(--gold);margin-bottom:.8em}
.box.warn .tag{color:var(--amber)}
.box p:last-child{margin-bottom:0}

ul.clean{list-style:none;padding:0;margin:1.2em 0}
ul.clean li{padding-left:20px;position:relative;margin-bottom:.7em;font-size:.95rem;color:var(--ash)}
ul.clean li::before{content:"";position:absolute;left:0;top:.62em;width:7px;height:1px;background:var(--gold)}
ul.clean li strong{color:var(--clean)}

/* sesiones */
.ses{margin-block:44px;scroll-margin-top:16px}
.seshead{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;
  padding-bottom:14px;border-bottom:1px solid var(--hairline);margin-bottom:18px}
.sesnum{font-family:"Syne",sans-serif;font-weight:800;font-size:1.8rem;color:var(--gold-dim);line-height:1}
.sessub{font-family:"DM Mono",monospace;font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;
  color:var(--zinc);margin:5px 0 0}
.sesmeta{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.chip{font-family:"DM Mono",monospace;font-size:.63rem;letter-spacing:.1em;text-transform:uppercase;
  border:1px solid var(--hairline);border-radius:99px;padding:3px 10px;color:var(--ash)}
.chip.crit{border-color:var(--gold-dim);color:var(--gold)}
.chip.ghost{color:var(--zinc)}

.tanda{margin-bottom:16px}
.tandatit{font-family:"DM Mono",monospace;font-size:.63rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--gold-dim);margin:0 0 7px}
.tscroll{overflow-x:auto;border:1px solid var(--hairline);border-radius:3px}
table{width:100%;border-collapse:collapse;font-size:.86rem;min-width:520px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--hairline);vertical-align:middle}
thead th{font-family:"DM Mono",monospace;font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;
  color:var(--zinc);font-weight:400;background:var(--graphite)}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:#ffffff06}
td.n,th.n{text-align:right;font-family:"DM Mono",monospace;font-variant-numeric:tabular-nums}
.c-chk{width:34px}
.chk{display:block;width:15px;height:15px;border:1px solid var(--hairline);border-radius:3px}
tr.p1 .chk{border-color:var(--gold-dim)}
.nom b{display:block;font-weight:600;font-size:.9rem;color:var(--clean);line-height:1.25}
.nom .es{display:block;font-size:.76rem;color:var(--zinc);margin-top:1px}
.pos{font-family:"DM Mono",monospace;font-size:.68rem;color:var(--ash);white-space:nowrap}
.pri{font-family:"DM Mono",monospace;font-size:.6rem;letter-spacing:.1em;border-radius:3px;padding:2px 6px;border:1px solid}
.pri.p1{color:var(--gold);border-color:var(--gold-dim)}
.pri.p2{color:var(--ash);border-color:var(--hairline)}
.pri.p3{color:var(--zinc);border-color:var(--hairline)}
.pril{font-family:"DM Mono",monospace;font-size:.6rem;color:var(--zinc);letter-spacing:.06em}
.c-uso{width:60px}

.toc{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin:1.5em 0}
.toc a{display:flex;justify-content:space-between;gap:10px;align-items:baseline;
  background:var(--graphite);border:1px solid var(--hairline);border-radius:3px;padding:10px 13px;
  text-decoration:none;color:var(--clean);font-size:.86rem;font-weight:500}
.toc a:hover{border-color:var(--gold-dim)}
.toc a span{font-family:"DM Mono",monospace;font-size:.68rem;color:var(--zinc)}
.toc a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

hr.rule{height:1px;background:var(--hairline);border:0;margin-block:44px}
footer{border-top:1px solid var(--hairline);margin-top:48px;padding-top:22px;
  font-family:"DM Mono",monospace;font-size:.65rem;color:var(--zinc);letter-spacing:.06em;line-height:1.8}
@media (max-width:620px){ .c-pri .pril{display:none} .c-pos{display:none} }
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="wrap">

<header>
  <p class="kicker">LIFTORY · Producción de video · ${new Date().toISOString().slice(0,10)}</p>
  <h1>Pendientes<br>de grabación</h1>
  <p class="lede">Faltan <strong>${D.total} videos</strong> de ${D.catalogo} ejercicios del catálogo. Esta lista no está ordenada alfabéticamente ni por importancia: está ordenada por <strong>estación de grabación</strong>, porque lo que cuesta tiempo no es el ejercicio — es montar y desmontar el equipo.</p>
  <div class="stats">
    <div class="stat"><div class="n gold">${D.total}</div><div class="l">Por grabar</div></div>
    <div class="stat"><div class="n">${D.conVideo}</div><div class="l">Ya grabados</div></div>
    <div class="stat"><div class="n">${Math.round(D.conVideo/D.catalogo*100)}%</div><div class="l">Cobertura actual</div></div>
    <div class="stat"><div class="n gold">${D.p1}</div><div class="l">Críticos (P1)</div></div>
  </div>
</header>

<section>
  <h2 style="margin-bottom:.6em">Cómo grabarlos</h2>

  <div class="box">
    <span class="tag">La regla que lo ordena todo</span>
    <p><strong>Una estación por sesión.</strong> Montas las mancuernas una vez y grabas los 56 ejercicios que las usan, en fila. Si grabas por orden alfabético acabas yendo del rack a la polea y de vuelta al rack treinta veces.</p>
  </div>

  <p>Dentro de cada sesión están ordenados por <strong>posición corporal</strong>: primero todo lo de pie, luego lo arrodillado, al final lo del piso. Así bajas al suelo una sola vez y la cámara no se mueve de altura entre tomas.</p>

  <h3 style="margin-top:1.6em">Prioridades</h3>
  <ul class="clean">
    <li><strong>P1 · Ruta de escape (${D.p1}).</strong> Son los sustitutos a los que llega un atleta cuando toca swap. Hoy lee el cue pero no ve cómo se hace — y justo son los que menos dominan, porque llegó ahí buscando algo más fácil.</li>
    <li><strong>P2 · Programado (${D.p2}).</strong> Están en los mesociclos. El atleta los ve en su rutina.</li>
    <li><strong>P3 · Dormido (${D.p3}).</strong> En el catálogo pero sin usar. Pueden esperar.</li>
  </ul>

  <div class="box warn">
    <span class="tag">Si solo grabas una cosa</span>
    <p>Los <strong>${D.p1} marcados P1</strong>. Un principiante que toca swap en Dragon Flag llega a Negative Dragon Flag sin referencia visual de un movimiento que es justo donde más fácil se lastima. Esos ${D.p1} cierran el hueco de todo el sistema de regresiones que construimos.</p>
  </div>

  <h3 style="margin-top:1.6em">Especificación técnica</h3>
  <p>La misma que ya usamos en los 127 que están arriba, y funciona:</p>
  <ul class="clean">
    <li><strong>Formato:</strong> horizontal, 1080p, ángulo que muestre la articulación que manda el movimiento (de lado para sentadilla y bisagra, de frente para press y jalón).</li>
    <li><strong>Duración:</strong> 2 a 4 repeticiones limpias, 6–12 segundos. Nadie ve más.</li>
    <li><strong>Sin audio ni texto.</strong> El cue ya está escrito en la ficha; el video solo muestra la ejecución.</li>
    <li><strong>Un plano fijo</strong>, cámara en trípode. Sin zoom ni paneo.</li>
    <li><strong>Mismo fondo y misma ropa</strong> dentro de una sesión — así se ven como una biblioteca y no como un collage.</li>
  </ul>
  <p style="font-size:.9rem;color:var(--ash)">Compresión antes de subir (el bucket corta en 50 MB):<br>
  <code>ffmpeg -y -i IN.mov -c:v libx264 -crf 28 -preset fast -vf "scale=-2:'min(720,ih)'" -c:a aac -b:a 96k -movflags +faststart OUT.mp4</code></p>

  <h3 style="margin-top:1.6em">Plan sugerido</h3>
  <p>A ritmo de 2–3 minutos por ejercicio (montar, dos tomas, revisar), con descanso:</p>
  <ul class="clean">
    <li><strong>Día 1 — Sin equipo.</strong> La sesión más grande (117) y la que más P1 cubre. Se puede hacer en casa.</li>
    <li><strong>Día 2 — Gym, zona de peso libre.</strong> Mancuernas, kettlebells y bandas: 98 ejercicios sin moverte de una esquina.</li>
    <li><strong>Día 3 — Gym, rack y barra.</strong> Barra, cajón y barra de dominadas: 64.</li>
    <li><strong>Día 4 — Gym, máquinas.</strong> Poleas y selectorizadas: 41. Es el más lento porque cada máquina es una estación.</li>
    <li><strong>Día 5 — Cierre.</strong> Recuperación, cardio y sueltos: 22.</li>
  </ul>
</section>

<hr class="rule">

<section>
  <h2 style="margin-bottom:.5em">Las ${D.sesiones.length} sesiones</h2>
  <div class="toc">
    ${D.sesiones.map((s,i)=>`<a href="#ses-${s.id}">${esc(s.nombre)} <span>${s.ejercicios.length}</span></a>`).join("")}
  </div>
</section>

${D.sesiones.map((s,i)=>sesionHTML(s,i)).join("")}

<footer>
  LIFTORY · ${D.total} ejercicios pendientes de video · ${D.sesiones.length} sesiones<br>
  Generado el ${new Date().toISOString().slice(0,10)} desde el catálogo en producción<br>
  Regenerar: <code style="background:none;padding:0">node scripts/video-pendientes.mjs</code>
</footer>

</div>
</body>
</html>`;
writeFileSync("public/pendientes-grabacion.html", html);
console.log(`✅ public/pendientes-grabacion.html · ${(html.length/1024).toFixed(0)} KB`);
