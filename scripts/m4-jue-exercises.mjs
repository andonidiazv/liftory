/**
 * M4 · JUE Active Recovery · crear 3 ejercicios nuevos con card completa.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NEW = [
  {
    name: "Foam Roll Upper Back",
    name_es: "Foam Roll Espalda Alta",
    description: "Self-myofascial release de la musculatura de la espalda alta y columna torácica usando foam roller. Libera trapecio, romboides, erectores torácicos y ayuda a la extensión T-spine — clave post-días de push/pull heavy.",
    coaching_cue: "Acostado boca arriba con el foam roller perpendicular a la columna, colocado bajo la espalda alta (entre las escápulas). Manos entrelazadas detrás de la cabeza, codos hacia el techo — así abrís la espalda alta. Empujá con las piernas para deslizar el roller de arriba (base del cuello) hacia abajo (base del omóplato) y de vuelta. Respirá profundo. En zonas tensas, pausa 3-4 respiraciones dejando que el peso del cuerpo trabaje. NO rueles sobre la columna lumbar.",
    founder_notes: "El T-spine libre es el requisito 1 para overhead press limpio, front rack de Clean, y cualquier push heavy. 60 segundos de esto los JUEVES devuelven lo que perdés los MIÉ (push heavy) y sirven para el VIE.",
    category: "mobility",
    movement_pattern: "push",
    difficulty: "beginner",
    equipment_required: ["foam_roller"],
    primary_muscles: ["thoracic_spine", "mid_trapezius", "rhomboids", "upper_back"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Lacrosse Ball Piriformis",
    name_es: "Lacrosse Ball en Piriforme",
    description: "Self-myofascial release del piriforme y musculatura glútea profunda usando pelota de lacrosse. Libera el rotador externo profundo de cadera — punto de tensión típico en atletas que hacen mucho squat, hinge y running.",
    coaching_cue: "Sentado en el piso, coloca la pelota de lacrosse bajo el glúteo (más profundo que un foam roll de glute — buscá el punto justo detrás de la cabeza del fémur, en el centro del glute posterior). Cruzá el tobillo del mismo lado sobre la rodilla opuesta para estirar el piriforme mientras lo comprimís. Ajustá el peso apoyando las manos atrás. Cuando encuentres el trigger point (dolor referido característico), pausa 30-45 segundos respirando profundo. NO ruedes activamente — es compresión pasiva.",
    founder_notes: "El piriforme apretado es la causa 1 de dolor de cadera lateral y ciática de gym. En días de hinge heavy (VIE Sumo DL) es no-negociable liberarlo el JUE previo. 45s/lado, dos series.",
    category: "mobility",
    movement_pattern: "hinge",
    difficulty: "beginner",
    equipment_required: ["lacrosse_ball"],
    primary_muscles: ["piriformis", "glutes", "hip_rotators"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Butterfly Pose",
    name_es: "Postura de la Mariposa",
    description: "Postura Yin Yoga clásica (Baddha Konasana) — sentado con las plantas de los pies juntas y las rodillas abriéndose hacia el piso. Stretch pasivo de aductores, cadera interna y suelo pélvico. Postura restorativa sostenida por tiempo prolongado.",
    coaching_cue: "Sentado en el piso, junta las plantas de los pies frente a vos, dejando que las rodillas caigan hacia los lados por su propio peso. NO forces las rodillas hacia abajo con las manos — el estiramiento pasivo es lo que trabaja. Manos suaves sobre los pies o los tobillos. Espalda erguida (o si querés más stretch, inclinás el torso hacia adelante lentamente). Respirás profundo, mantené la postura 60-90 segundos permitiendo que la cadera se abra por gravedad.",
    founder_notes: "La postura Yin más honesta para aductores + cadera interna. En un día de active recovery post-hinge/squat semana, 60s de mariposa devuelven rango de cadera que 4 series de estiramientos activos no logran. Pasivo, largo, respirado.",
    category: "mobility",
    movement_pattern: "hinge",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["adductors", "hip_capsule", "groin"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

console.log("═══ Creando ejercicios JUE ═══\n");
for (const row of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) { console.log(`  ⏭  ${row.name} ya existe`); continue; }
  const { data: created, error } = await sb.from("exercises").insert(row).select("id").single();
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} (${created.id.slice(0,8)})`);
}
console.log("\n✓ Done.");
