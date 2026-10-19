-- Coach Adonis can create new exercises when armé un nuevo mesociclo y necesita
-- un patrón que aún no está en el catálogo. Para que no contaminen el catálogo
-- vivo sin revisión humana, esos rows se insertan con is_draft = true.
--
-- Andoni revisa los drafts en /admin (o en CLI) y los promueve a vivo
-- (is_draft = false) cuando aprueba la card. Los drafts NO aparecen en
-- búsquedas de catálogo de athlete view.
--
-- Hasta hoy todo el catálogo es vivo, así que default = false mantiene los
-- ~120 ejercicios existentes en el estado correcto.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Index para queries de drafts pendientes de revisión (será una query frecuente
-- desde el admin panel y el CLI de Coach Adonis).
CREATE INDEX IF NOT EXISTS exercises_is_draft_idx
  ON public.exercises (is_draft)
  WHERE is_draft = true;

COMMENT ON COLUMN public.exercises.is_draft IS
  'true = ejercicio creado por Coach Adonis pendiente de revisión humana. false = aprobado y visible en catálogo.';
