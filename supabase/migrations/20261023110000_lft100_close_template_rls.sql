-- ═══════════════════════════════════════════════════════════════════════════
-- LFT-100 · Cerrar la lectura anónima de las plantillas de entrenamiento.
--
-- Problema medido el 2026-10-22: con la llave pública que viaja en el bundle
-- de JavaScript, un cliente SIN iniciar sesión podía leer 336 workouts
-- plantilla, 9,014 workout_sets, los 474 ejercicios y las 168 sustituciones.
-- Es decir, toda la metodología — bloques, series, tempos, RPE y los cues del
-- entrenador — sin pagar y sin registrarse.
--
-- Causa: las políticas de SELECT estaban concedidas a PUBLIC, que incluye el
-- rol `anon`. La condición "user_id IS NULL" (pensada para las plantillas)
-- se cumple para cualquiera, incluido un anónimo.
--
-- Alcance verificado antes de cambiar nada:
--   · Ninguna página pública (/, /welcome, /login) consulta estas tablas.
--   · /onboarding sí lee plantillas vía assignProgram, pero corre DESPUÉS del
--     alta, cuando auth.uid() ya existe. Por eso `authenticated` basta.
--   · No se expuso NI UNA fila de datos de usuarios reales: los 336 workouts
--     legibles eran todos plantilla. La escritura anónima ya estaba bloqueada.
--
-- Lo que cambia: el rol. La lógica de cada política se conserva idéntica.
-- Un usuario autenticado sigue viendo exactamente lo mismo que antes.
--
-- Pendiente para después (LFT-301): condicionar el acceso a plantillas a una
-- suscripción activa. Hoy no se puede porque el estado de suscripción se pone
-- a mano y Stripe nunca ha procesado un pago.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── workouts ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own and template workouts" ON public.workouts;
CREATE POLICY "Users can read own and template workouts"
  ON public.workouts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM programs p
     WHERE p.id = workouts.program_id
       AND (p.user_id IS NULL OR p.user_id = auth.uid())));

DROP POLICY IF EXISTS "Admins can select workouts" ON public.workouts;
CREATE POLICY "Admins can select workouts"
  ON public.workouts FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ─── workout_sets ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own and template sets" ON public.workout_sets;
CREATE POLICY "Users can read own and template sets"
  ON public.workout_sets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workouts w
      JOIN programs p ON p.id = w.program_id
     WHERE w.id = workout_sets.workout_id
       AND (p.user_id IS NULL OR p.user_id = auth.uid())));

DROP POLICY IF EXISTS "Admins can select sets" ON public.workout_sets;
CREATE POLICY "Admins can select sets"
  ON public.workout_sets FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ─── programs ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own and template programs" ON public.programs;
CREATE POLICY "Users can read own and template programs"
  ON public.programs FOR SELECT TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can select programs" ON public.programs;
CREATE POLICY "Admins can select programs"
  ON public.programs FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- ─── exercises ───────────────────────────────────────────────────────────
-- La biblioteca de ejercicios con sus cues es parte del producto, no un
-- catálogo público de marketing.
DROP POLICY IF EXISTS "Anyone can read exercises" ON public.exercises;
CREATE POLICY "Authenticated can read exercises"
  ON public.exercises FOR SELECT TO authenticated
  USING (true);

-- ─── exercise_substitutions ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can read substitutions" ON public.exercise_substitutions;
CREATE POLICY "Authenticated can read substitutions"
  ON public.exercise_substitutions FOR SELECT TO authenticated
  USING (true);
