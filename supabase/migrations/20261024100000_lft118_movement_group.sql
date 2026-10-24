-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-118 · Grupo de movimiento: el nivel de granularidad que faltaba.
--
-- `movement_pattern` tiene 8 valores y es demasiado grueso para decidir si dos
-- ejercicios son intercambiables. Bajo "squat" conviven la sentadilla con
-- barra, el box jump, la zancada búlgara y el leg extension. Bajo "pull"
-- conviven el remo, la dominada y el curl de bíceps.
--
-- Consecuencia medida: el generador de candidatos proponía "Leg Extension"
-- como alternativa a la sentadilla con barra, y un curl de bíceps como
-- alternativa al remo con barra. Comparten patrón y músculo, y eso bastaba.
--
-- Lo que NO lo arregla:
--   · movement_plane — en sentadilla y bisagra no aplica, por diseño del campo
--     (su CHECK sólo admite vertical/horizontal, para el eje de empuje/jalón).
--   · la familia por nombre — encuentra variantes verdaderas ("Barbell Bench
--     Press" ↔ "Dumbbell Bench Press") pero nunca cruza familias, así que no
--     propondría Goblet Squat para una sentadilla con barra.
--
-- Lo que sí: qué hace el cuerpo, con qué demanda y a cuántas extremidades.
-- Dos ejercicios del mismo grupo son candidatos; de grupos distintos, nunca.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS movement_group TEXT;

CREATE TABLE IF NOT EXISTS movement_groups (
  code      TEXT PRIMARY KEY,
  label_es  TEXT NOT NULL,
  familia   TEXT NOT NULL   -- para agrupar en reportes
);

INSERT INTO movement_groups (code, label_es, familia) VALUES
  ('squat_bilateral','Sentadilla a dos piernas','tren inferior'),
  ('squat_unilateral','Sentadilla a una pierna','tren inferior'),
  ('hinge_bilateral','Bisagra a dos piernas','tren inferior'),
  ('hinge_unilateral','Bisagra a una pierna','tren inferior'),
  ('aisla_pierna','Aislamiento de pierna','tren inferior'),
  ('push_horizontal','Empuje horizontal','tren superior'),
  ('push_vertical','Empuje vertical','tren superior'),
  ('pull_horizontal','Jalón horizontal','tren superior'),
  ('pull_vertical','Jalón vertical','tren superior'),
  ('aisla_brazo','Aislamiento de brazo','tren superior'),
  ('aisla_hombro','Aislamiento de hombro','tren superior'),
  ('core_antiextension','Core antiextensión','core'),
  ('core_antirotacion','Core antirrotación','core'),
  ('core_flexion','Core en flexión','core'),
  ('acarreo','Acarreo','core'),
  ('gimnasia','Destreza gimnástica','destreza'),
  ('olimpico','Derivado olímpico','destreza'),
  ('pliometrico','Pliométrico','potencia'),
  ('cardio_continuo','Cardio continuo','acondicionamiento'),
  ('locomocion','Desplazamiento','acondicionamiento'),
  ('mobility','Movilidad','movilidad')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_movement_group_fkey;
ALTER TABLE exercises
  ADD CONSTRAINT exercises_movement_group_fkey
  FOREIGN KEY (movement_group) REFERENCES movement_groups(code);

CREATE INDEX IF NOT EXISTS idx_exercises_grupo ON exercises (movement_group, difficulty);

ALTER TABLE movement_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read movement groups" ON movement_groups FOR SELECT TO authenticated USING (true);

COMMENT ON COLUMN exercises.movement_group IS
  'Granularidad intermedia entre movement_pattern (8 valores, demasiado grueso) y el nombre. Es el filtro primario de candidatos a sustitución: dos ejercicios de grupos distintos no son intercambiables.';
