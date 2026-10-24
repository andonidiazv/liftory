-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-105 · Relaciones tipadas entre ejercicios.
--
-- El problema medido: la tabla tenía cinco columnas y ninguna decía QUÉ tipo
-- de relación era. De sus 168 filas, 128 bajaban de nivel, 40 eran laterales
-- y CERO eran progresiones — era literalmente imposible expresar "este
-- ejercicio es el siguiente escalón". Todo se apretujaba en `priority`, que
-- además no codificaba nivel de forma confiable: priority 1 contenía 47
-- intermedios, 14 principiantes y 4 all_levels mezclados.
--
-- Una sustitución NO es una regresión. Cambiar barra por mancuerna porque no
-- hay barra es otra cosa que bajar de dificultad porque el movimiento no sale.
-- Mezclarlas impide razonar sobre cualquiera de las dos.
--
-- DESVIACIÓN del blueprint (§7), a propósito: allí se proponía una tabla nueva
-- `exercise_relations`. Se descartó. La tabla actual la leen 8 puntos del
-- código, dos de ellos con joins que referencian el nombre de la llave foránea
-- (`exercises!exercise_substitutions_substitute_exercise_id_fkey`). Crear una
-- tabla paralela dejaría dos fuentes de verdad — justo el error que causó el
-- desastre del vocabulario de equipo — y renombrarla rompería esos joins sin
-- ganar nada hoy. Se evoluciona en su sitio. El nombre queda impreciso: esta
-- tabla ya no guarda sólo sustituciones. Es deuda cosmética, anotada.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE exercise_substitutions
  ADD COLUMN IF NOT EXISTS relation_type   TEXT,
  ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rationale       TEXT,
  ADD COLUMN IF NOT EXISTS approved_by     UUID,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ;

-- ─── deducir el tipo de las 168 filas existentes ─────────────────────────
-- El nivel se compara por rango. all_levels cuenta igual que beginner: ambos
-- son accesibles desde el día uno.
WITH rango AS (
  SELECT id, CASE difficulty
               WHEN 'all_levels'   THEN 1 WHEN 'beginner' THEN 1
               WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 END AS r,
         COALESCE(equipment_required, '{}') AS eq
    FROM exercises
)
UPDATE exercise_substitutions s
   SET relation_type = CASE
         WHEN d.r < o.r THEN 'regression'
         WHEN d.r > o.r THEN 'progression'
         WHEN NOT (o.eq && d.eq) THEN 'equipment_swap'
         ELSE 'equivalent'
       END
  FROM rango o, rango d
 WHERE o.id = s.exercise_id AND d.id = s.substitute_exercise_id
   AND s.relation_type IS NULL;

UPDATE exercise_substitutions SET relation_type = 'equivalent' WHERE relation_type IS NULL;

ALTER TABLE exercise_substitutions
  ALTER COLUMN relation_type SET NOT NULL,
  ADD CONSTRAINT exercise_substitutions_relation_type_check
  CHECK (relation_type IN ('regression','progression','equipment_swap','equivalent','unilateral_variant'));

-- ─── generar la dirección que faltaba ────────────────────────────────────
-- Si A→B es una regresión, entonces B→A es una progresión. Esa fila nunca
-- existió, y es la que permite a un atleta volver a subir desde donde se bajó
-- sin depender de haber hecho el cambio él mismo.
INSERT INTO exercise_substitutions (exercise_id, substitute_exercise_id, priority, relation_type, rationale)
SELECT s.substitute_exercise_id, s.exercise_id, s.priority, 'progression',
       'Inversa generada en LFT-105 a partir de una regresión existente'
  FROM exercise_substitutions s
 WHERE s.relation_type = 'regression'
   AND NOT EXISTS (
     SELECT 1 FROM exercise_substitutions x
      WHERE x.exercise_id = s.substitute_exercise_id
        AND x.substitute_exercise_id = s.exercise_id
   );

CREATE INDEX IF NOT EXISTS idx_exsub_tipo ON exercise_substitutions (exercise_id, relation_type);

COMMENT ON COLUMN exercise_substitutions.relation_type IS
  'Qué tipo de relación es. regression: el destino es más fácil. progression: más difícil. equipment_swap: mismo nivel, otro implemento. equivalent: intercambiable. unilateral_variant: misma mecánica a una extremidad. `priority` queda sólo por compatibilidad: no codifica nivel de forma confiable.';
COMMENT ON COLUMN exercise_substitutions.requires_review IS
  'true mientras la relación sea una propuesta automática sin aprobar. Nada con requires_review=true debe ofrecerse a un atleta.';
