-- Grupo nuevo: jalón con brazo recto.
--
-- El pullover y el straight-arm pulldown estaban repartidos entre
-- pull_horizontal y pull_vertical, y no son ninguno de los dos. En un remo el
-- codo flexiona; en una dominada el cuerpo sube. Aquí el codo permanece casi
-- bloqueado y el movimiento ocurre sólo en el hombro, en extensión — por eso
-- las fuentes los describen como aislamiento de dorsal y no como un jalón
-- compuesto.
--
-- Importa para las sustituciones: ofrecer un pullover a quien no puede hacer
-- un remo con barra le cambia el estímulo por completo, y al revés.
INSERT INTO movement_groups (code, label_es, familia)
VALUES ('pull_straight_arm','Jalón con brazo recto','tren superior')
ON CONFLICT (code) DO NOTHING;
