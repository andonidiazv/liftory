-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-101 · Vocabulario de equipo canónico.
--
-- `exercises.equipment_required` era texto libre y acumuló 59 valores con
-- sinónimos evidentes: band/resistance_band, cable/cable_machine,
-- dumbbell/dumbbells, plate/plates, box/plyo_box, rack/squat_rack,
-- rope/rope_attachment, landmine/landmine_attachment.
--
-- No es cosmético. Es la causa raíz de los ejercicios duplicados: el mismo
-- movimiento capturado dos veces con distinta ortografía de equipo —
-- "Barbell Back Squat" existe dos veces, una con `rack` y otra con
-- `squat_rack`. Y rompe en silencio cualquier filtro por equipo, que es la
-- mitad de la personalización que vamos a construir.
--
-- Por qué derivaron: el formulario de /admin/exercises ofrecía una lista
-- hardcodeada de 11 opciones (con `cable`, `rack`, `box`) mientras los
-- scripts escribían otras (`cable_machine`, `squat_rack`, `plyo_box`).
-- Dos fuentes de verdad, ninguna autoritativa. Esta migración crea la tabla;
-- el formulario pasa a leer de ella en el mismo commit.
--
-- Los cuatro valores "esto o aquello" se resolvieron por accesibilidad: se
-- queda la opción que más gente tiene, para que el filtro no excluya a nadie
-- de más. Afecta 5 ejercicios y está anotado abajo uno por uno.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS equipment (
  code       TEXT PRIMARY KEY,
  label_es   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  family     TEXT NOT NULL,          -- free_weight | machine | bodyweight | cardio | accessory
  is_machine BOOLEAN NOT NULL DEFAULT false,
  gym_only   BOOLEAN NOT NULL DEFAULT false   -- para el filtro "entreno en casa"
);

CREATE TABLE IF NOT EXISTS equipment_alias (
  alias          TEXT PRIMARY KEY,
  canonical_code TEXT NOT NULL REFERENCES equipment(code) ON UPDATE CASCADE
);

INSERT INTO equipment (code, label_es, label_en, family, is_machine, gym_only) VALUES
  ('none','Sin equipo','None','bodyweight',false,false),
  ('dumbbell','Mancuerna','Dumbbell','free_weight',false,false),
  ('barbell','Barra','Barbell','free_weight',false,true),
  ('ez_bar','Barra Z','EZ Bar','free_weight',false,true),
  ('trap_bar','Barra hexagonal','Trap Bar','free_weight',false,true),
  ('kettlebell','Kettlebell','Kettlebell','free_weight',false,false),
  ('plates','Discos','Plates','free_weight',false,true),
  ('band','Banda','Band','accessory',false,false),
  ('bench','Banca','Bench','accessory',false,false),
  ('bench_incline','Banca inclinada','Incline Bench','accessory',false,true),
  ('bench_decline','Banca declinada','Decline Bench','accessory',false,true),
  ('preacher_bench','Banca Scott','Preacher Bench','accessory',false,true),
  ('hyperextension_bench','Banco de hiperextensiones','Hyperextension Bench','accessory',false,true),
  ('squat_rack','Rack','Squat Rack','accessory',false,true),
  ('pull_up_bar','Barra de dominadas','Pull-up Bar','accessory',false,false),
  ('dip_bars','Barras paralelas','Dip Bars','accessory',false,false),
  ('plyo_box','Cajón','Plyo Box','accessory',false,false),
  ('medicine_ball','Balón medicinal','Medicine Ball','accessory',false,false),
  ('ab_wheel','Rueda abdominal','Ab Wheel','accessory',false,false),
  ('foam_roller','Rodillo','Foam Roller','accessory',false,false),
  ('lacrosse_ball','Pelota de masaje','Lacrosse Ball','accessory',false,false),
  ('mat','Tapete','Mat','accessory',false,false),
  ('wall','Pared','Wall','bodyweight',false,false),
  ('step','Escalón','Step','accessory',false,false),
  ('pvc','Tubo PVC','PVC Pipe','accessory',false,false),
  ('weight_belt','Cinturón de lastre','Weight Belt','accessory',false,false),
  ('sled','Trineo','Sled','accessory',false,true),
  ('cable_machine','Poleas','Cable Machine','machine',true,true),
  ('rope_attachment','Cuerda','Rope Attachment','machine',false,true),
  ('straight_bar_attachment','Barra recta de polea','Straight Bar Attachment','machine',false,true),
  ('ankle_attachment','Tobillera de polea','Ankle Attachment','machine',false,true),
  ('landmine','Landmine','Landmine','machine',false,true),
  ('smith_machine','Máquina Smith','Smith Machine','machine',true,true),
  ('machine','Máquina','Machine','machine',true,true),
  ('leg_extension_machine','Extensión de cuádriceps','Leg Extension Machine','machine',true,true),
  ('leg_press_machine','Prensa','Leg Press Machine','machine',true,true),
  ('leg_curl_machine','Curl femoral','Leg Curl Machine','machine',true,true),
  ('nordic_curl_machine','Banco nórdico','Nordic Curl Machine','machine',true,true),
  ('hip_abductor_machine','Abductores','Hip Abductor Machine','machine',true,true),
  ('hip_adductor_machine','Aductores','Hip Adductor Machine','machine',true,true),
  ('pec_deck_machine','Peck deck','Pec Deck Machine','machine',true,true),
  ('belt_squat_machine','Belt squat','Belt Squat Machine','machine',true,true),
  ('assault_bike','Bici de asalto','Assault Bike','cardio',true,true),
  ('row_erg','Remo ergómetro','Row Erg','cardio',true,true),
  ('ski_erg','Ski ergómetro','Ski Erg','cardio',true,true),
  ('treadmill','Caminadora','Treadmill','cardio',true,true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO equipment_alias (alias, canonical_code) VALUES
  ('dumbbells','dumbbell'),
  ('resistance_band','band'),
  ('cable','cable_machine'),
  ('rope','rope_attachment'),
  ('landmine_attachment','landmine'),
  ('plate','plates'),
  ('rack','squat_rack'),
  ('box','plyo_box'),
  ('incline_bench','bench_incline'),
  ('decline_bench','bench_decline'),
  ('rowing_machine','row_erg'),
  ('seated_leg_curl_machine','leg_curl_machine'),
  ('lying_leg_curl_machine','leg_curl_machine'),
  -- "esto o aquello": se queda la opción más accesible, para no excluir de más.
  ('weight_belt_or_dumbbell','dumbbell'),   -- Weighted Pull-up: más gente tiene mancuerna que cinturón
  ('band_or_partner','band'),               -- Nordic asistido: la banda es el asistente reproducible
  ('box_or_bench','bench'),                 -- Step-up y Pike Push-up: la banca es más común
  ('plates_or_books','none')                -- Deficit Push-up: el déficit lo da cualquier elevación
ON CONFLICT (alias) DO NOTHING;

-- ─── migrar los 474 ejercicios ───────────────────────────────────────────
UPDATE exercises e
   SET equipment_required = sub.limpio
  FROM (
    SELECT x.id,
           ARRAY(SELECT DISTINCT COALESCE(a.canonical_code, q)
                   FROM unnest(x.equipment_required) AS q
                   LEFT JOIN equipment_alias a ON a.alias = q
                  ORDER BY 1) AS limpio
      FROM exercises x
     WHERE x.equipment_required IS NOT NULL
  ) sub
 WHERE e.id = sub.id AND e.equipment_required IS DISTINCT FROM sub.limpio;

-- ─── guardia: que no vuelva a derivar ────────────────────────────────────
CREATE OR REPLACE FUNCTION validar_equipment_required()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE desconocido TEXT;
BEGIN
  IF NEW.equipment_required IS NULL THEN RETURN NEW; END IF;
  SELECT q INTO desconocido
    FROM unnest(NEW.equipment_required) AS q
   WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE code = q)
   LIMIT 1;
  IF desconocido IS NOT NULL THEN
    RAISE EXCEPTION 'Equipo desconocido: "%". Debe existir en la tabla equipment, o registrarse como alias en equipment_alias.', desconocido;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_equipment ON exercises;
CREATE TRIGGER trg_validar_equipment
  BEFORE INSERT OR UPDATE OF equipment_required ON exercises
  FOR EACH ROW EXECUTE FUNCTION validar_equipment_required();

ALTER TABLE equipment       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read equipment"       ON equipment       FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read equipment alias" ON equipment_alias FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE equipment IS
  'Vocabulario canónico de equipo. exercises.equipment_required sólo puede contener estos códigos — lo fuerza el trigger trg_validar_equipment. gym_only marca lo que no se puede tener en casa, para el filtro de personalización por equipo.';
