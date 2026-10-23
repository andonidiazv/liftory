-- Rastro de fusiones de ejercicios duplicados.
--
-- Cuando dos fichas resultan ser el mismo movimiento, la perdedora NO se
-- borra: se desactiva y apunta a la ganadora. Así los workout_sets históricos
-- siguen resolviendo su ejercicio y el historial del atleta queda intacto,
-- mientras la programación nueva sólo ve la ficha buena.
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES exercises(id);

COMMENT ON COLUMN exercises.merged_into IS
  'Si esta ficha se fusionó con otra por ser duplicada, apunta a la ficha canónica. Va siempre junto a is_active=false. Nunca se borra la fila: hay historial colgando de ella.';
