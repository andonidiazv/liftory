-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-102 · Vocabulario canónico de músculos.
--
-- `exercises.primary_muscles` era texto libre y acumuló 103 nombres distintos
-- para unos 30 músculos reales: glutes / gluteus_maximus / glute_max /
-- glute_med / gluteus_medius / glute_medius / gluteus_minimus eran siete
-- formas de decir glúteo. quads y quadriceps convivían. El pectoral tenía
-- once variantes, incluida pectoralis_major_clavicular con un solo uso.
--
-- Consecuencia medida: el análisis de volumen por grupo muscular no reconocía
-- los sinónimos, así que una parte del trabajo quedaba invisible. Y cualquier
-- regla futura del tipo "este bloque ya cubrió espalda esta semana" era
-- imposible de escribir con confianza.
--
-- Las regiones coinciden con los MacroGroup que ya usa src/utils/muscleGroups.ts
-- para el análisis de volumen, para no romper continuidad con lo ya calculado.
--
-- Seis valores no eran músculos sino agrupaciones (posterior_chain, legs,
-- arms) o sistemas (cardio, heart, coordination). Se mandan a su componente
-- principal, anotado en el alias.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS muscles (
  code     TEXT PRIMARY KEY,
  label_es TEXT NOT NULL,
  region   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS muscle_alias (
  alias          TEXT PRIMARY KEY,
  canonical_code TEXT NOT NULL REFERENCES muscles(code) ON UPDATE CASCADE
);

INSERT INTO muscles (code, label_es, region) VALUES
  ('chest', 'Pectoral', 'Pecho'),
  ('serratus', 'Serrato', 'Pecho'),
  ('lats', 'Dorsal', 'Espalda'),
  ('traps', 'Trapecio', 'Espalda'),
  ('rhomboids', 'Romboides', 'Espalda'),
  ('upper_back', 'Espalda alta', 'Espalda'),
  ('teres_major', 'Redondo mayor', 'Espalda'),
  ('erector_spinae', 'Erectores', 'Lumbar'),
  ('shoulders', 'Hombro', 'Hombros'),
  ('anterior_deltoid', 'Deltoide anterior', 'Hombros'),
  ('lateral_deltoid', 'Deltoide lateral', 'Hombros'),
  ('posterior_deltoid', 'Deltoide posterior', 'Hombros'),
  ('rotator_cuff', 'Manguito rotador', 'Hombros'),
  ('biceps', 'Bíceps', 'Biceps'),
  ('triceps', 'Tríceps', 'Triceps'),
  ('forearms', 'Antebrazo', 'Antebrazos'),
  ('grip', 'Agarre', 'Antebrazos'),
  ('quads', 'Cuádriceps', 'Cuadriceps'),
  ('hamstrings', 'Isquiotibiales', 'Hamstrings'),
  ('glutes', 'Glúteo', 'Gluteos'),
  ('calves', 'Pantorrilla', 'Pantorrillas'),
  ('abs', 'Abdomen', 'Core'),
  ('obliques', 'Oblicuos', 'Core'),
  ('diaphragm', 'Diafragma', 'Core'),
  ('hip_flexors', 'Flexores de cadera', 'Cadera'),
  ('hip_rotators', 'Rotadores de cadera', 'Cadera'),
  ('adductors', 'Aductores', 'Cadera'),
  ('abductors', 'Abductores', 'Cadera'),
  ('thoracic_spine', 'Columna torácica', 'Movilidad'),
  ('ankles', 'Tobillo', 'Movilidad'),
  ('wrists', 'Muñeca', 'Movilidad'),
  ('neck', 'Cuello', 'Movilidad'),
  ('cardiovascular', 'Sistema cardiovascular', 'Sistémico')
ON CONFLICT (code) DO NOTHING;

INSERT INTO muscle_alias (alias, canonical_code) VALUES
  ('quadriceps', 'quads'),
  ('gluteus_maximus', 'glutes'),
  ('glute_max', 'glutes'),
  ('glute_med', 'glutes'),
  ('gluteus_medius', 'glutes'),
  ('glute_medius', 'glutes'),
  ('gluteus_minimus', 'glutes'),
  ('rear_deltoid', 'posterior_deltoid'),
  ('rear_delts', 'posterior_deltoid'),
  ('anterior_deltoid', 'anterior_deltoid'),
  ('front_delts', 'anterior_deltoid'),
  ('deltoid_anterior', 'anterior_deltoid'),
  ('deltoid_medial', 'lateral_deltoid'),
  ('side_delts', 'lateral_deltoid'),
  ('deltoid', 'shoulders'),
  ('pectoralis_major', 'chest'),
  ('pec_major', 'chest'),
  ('pectorals', 'chest'),
  ('upper_pectoralis', 'chest'),
  ('pectoralis_major_clavicular', 'chest'),
  ('chest_lower', 'chest'),
  ('pectorals_inner', 'chest'),
  ('upper_pectorals', 'chest'),
  ('pectorals_upper', 'chest'),
  ('pec_minor', 'chest'),
  ('mid_trapezius', 'traps'),
  ('lower_trapezius', 'traps'),
  ('upper_trapezius', 'traps'),
  ('trapezius', 'traps'),
  ('upper_traps', 'traps'),
  ('levator_scapulae', 'traps'),
  ('latissimus_dorsi', 'lats'),
  ('back', 'upper_back'),
  ('biceps_brachii', 'biceps'),
  ('biceps_brachii_short_head', 'biceps'),
  ('brachialis', 'biceps'),
  ('brachioradialis', 'biceps'),
  ('triceps_long_head', 'triceps'),
  ('triceps_brachii', 'triceps'),
  ('triceps_brachii_long_head', 'triceps'),
  ('forearm', 'forearms'),
  ('wrist_flexors', 'forearms'),
  ('wrist_extensors', 'forearms'),
  ('core', 'abs'),
  ('rectus_abdominis', 'abs'),
  ('transverse_abdominis', 'abs'),
  ('lower_back', 'erector_spinae'),
  ('spine', 'erector_spinae'),
  ('lumbar', 'erector_spinae'),
  ('thoracic_extensors', 'erector_spinae'),
  ('gastrocnemius', 'calves'),
  ('soleus', 'calves'),
  ('hips', 'hip_flexors'),
  ('hip_external_rotators', 'hip_rotators'),
  ('hip_internal_rotators', 'hip_rotators'),
  ('piriformis', 'hip_rotators'),
  ('TFL', 'hip_rotators'),
  ('tensor_fasciae_latae', 'hip_rotators'),
  ('hip_capsule', 'hip_rotators'),
  ('it_band', 'hip_rotators'),
  ('groin', 'adductors'),
  ('gracilis', 'adductors'),
  ('serratus_anterior', 'serratus'),
  ('plantar_fascia', 'ankles'),
  ('cardio', 'cardiovascular'),
  ('cardiovascular_system', 'cardiovascular'),
  ('heart', 'cardiovascular'),
  ('posterior_chain', 'hamstrings'),
  ('legs', 'quads'),
  ('arms', 'biceps'),
  ('coordination', 'cardiovascular')
ON CONFLICT (alias) DO NOTHING;

-- ─── migrar los ejercicios ───────────────────────────────────────────────
UPDATE exercises e
   SET primary_muscles = sub.limpio
  FROM (
    SELECT x.id,
           ARRAY(SELECT DISTINCT COALESCE(a.canonical_code, m)
                   FROM unnest(x.primary_muscles) AS m
                   LEFT JOIN muscle_alias a ON a.alias = m
                  ORDER BY 1) AS limpio
      FROM exercises x
     WHERE x.primary_muscles IS NOT NULL
  ) sub
 WHERE e.id = sub.id AND e.primary_muscles IS DISTINCT FROM sub.limpio;

-- ─── guardia ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validar_primary_muscles()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE desconocido TEXT;
BEGIN
  IF NEW.primary_muscles IS NULL THEN RETURN NEW; END IF;
  SELECT m INTO desconocido
    FROM unnest(NEW.primary_muscles) AS m
   WHERE NOT EXISTS (SELECT 1 FROM muscles WHERE code = m)
   LIMIT 1;
  IF desconocido IS NOT NULL THEN
    RAISE EXCEPTION 'Músculo desconocido: "%". Debe existir en la tabla muscles, o registrarse como alias en muscle_alias.', desconocido;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_muscles ON exercises;
CREATE TRIGGER trg_validar_muscles
  BEFORE INSERT OR UPDATE OF primary_muscles ON exercises
  FOR EACH ROW EXECUTE FUNCTION validar_primary_muscles();

ALTER TABLE muscles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read muscles"       ON muscles      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read muscle alias"  ON muscle_alias FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE muscles IS
  'Vocabulario canónico de músculos. exercises.primary_muscles sólo puede contener estos códigos — lo fuerza el trigger trg_validar_muscles. region agrupa para el análisis de volumen semanal.';
