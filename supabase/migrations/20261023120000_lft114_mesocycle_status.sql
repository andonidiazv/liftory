-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-114 · Que `status` e `is_selectable` dejen de contradecirse.
--
-- Qué significa cada campo (no eran lo mismo, y ese era el enredo):
--
--   status        Ciclo de vida de la COHORTE. draft → live → completed.
--                 `live` es el ciclo al que se suma quien se registra hoy.
--                 Lo cambia a mano un admin desde /admin/programs.
--
--   is_selectable Si el atleta puede ELEGIR ese bloque desde el tab Programa.
--                 Nada que ver con la cohorte: es "este contenido está listo".
--
-- El problema medido el 2026-10-23: M2 a M5 de BUILD HIM ELITE estaban en
-- `draft` pese a ser contenido terminado que ya se entrenó de marzo a octubre.
-- Se verificó estructuralmente: los ocho mesociclos tienen sus 36 sesiones de
-- entrenamiento, 6 de descanso, cero sesiones sin series, cero series sin
-- ejercicio y cero ejercicios inactivos. No había nada a medio construir.
--
-- Pero la etiqueta vieja sí tenía una consecuencia real: `handleNewCycle` en
-- AdminPrograms se niega a crear un ciclo nuevo si existe cualquiera en
-- `draft`. O sea que BUILD HIM ELITE llevaba meses sin poder recibir un
-- mesociclo nuevo desde el admin.
--
-- No se toca el `live` de ningún programa: assignProgram lo usa para decidir
-- a qué ciclo entra un usuario nuevo, y cambiarlo alteraría cuántos workouts
-- se le copian. Eso es otra conversación.
-- ═══════════════════════════════════════════════════════════════════════════

-- Los ciclos de M2 a M5 corrieron y terminaron. `completed` es lo que son.
UPDATE mesocycles
   SET status = 'completed'
 WHERE status = 'draft'
   AND cycle_end_date < CURRENT_DATE;

-- Guardia: un bloque a medio construir no puede ofrecerse al atleta.
-- Hoy se cumple sin excepciones; la restricción evita que se rompa después.
ALTER TABLE mesocycles
  DROP CONSTRAINT IF EXISTS mesocycles_draft_no_selectable;
ALTER TABLE mesocycles
  ADD CONSTRAINT mesocycles_draft_no_selectable
  CHECK (NOT (is_selectable AND status = 'draft'));

COMMENT ON COLUMN mesocycles.status IS
  'Ciclo de vida de la cohorte: draft (en construcción) → live (el ciclo al que entra quien se registra hoy) → completed (ya corrió). No indica si el contenido está terminado — para eso es is_selectable.';
