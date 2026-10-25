-- Grupo nuevo: antiflexión lateral.
--
-- Las planchas laterales y la familia Copenhagen estaban en core_antiextension,
-- pero resisten una fuerza distinta: la plancha frontal impide que la lumbar se
-- extienda; la lateral impide que el torso se venza de lado. No se sustituyen
-- entre sí.
--
-- La familia Copenhagen además carga específicamente los aductores con el pie
-- apoyado en un banco, cosa que ninguna plancha frontal hace.
INSERT INTO movement_groups (code, label_es, familia)
VALUES ('core_antilateral','Core antiflexión lateral','core')
ON CONFLICT (code) DO NOTHING;
