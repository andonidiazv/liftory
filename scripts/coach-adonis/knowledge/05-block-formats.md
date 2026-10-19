# Block formats · cómo modelo cada tipo de bloque

## Strength (working sets)

```
block_label: "HEAVY PUSH" (o nombre custom registrado en constants/blocks.ts)
sets:
  - exercise: "Incline DB Bench Press"
    set_type: "working"
    planned_reps: 10
    planned_rpe: 7.5
    planned_tempo: "2-1-1-0"
    planned_rest_seconds: 150   # Heavy = 2:30 mínimo
    coaching_cue_override: null  # Solo si hay variación específica al set
```

## Superset

```
block_label: "ARM SUPERSET"
sets:                            # Alterna: ex1, ex2, ex1, ex2 (set_orders consecutivos)
  - exercise: "DB Preacher Curl"
    set_type: "superset"
    planned_reps: 10
    planned_rest_seconds: 0      # 0 rest entre los 2 ejercicios del superset
    coaching_cue_override: "10 por lado · DB Preacher unilateral"
  - exercise: "Cable Overhead Tricep Extension (rope)"
    set_type: "superset"
    planned_reps: 12
    planned_rest_seconds: 75     # Rest entre rondas (después del último ejercicio del superset)
  # repetir N rondas (los set_orders alternan)
```

## EMOM (Every Minute On the Minute)

El render reconoce el formato del cue. El cue del **primer set** del bloque debe tener este formato exacto:

```
"EMOM {windowSeconds}s | {totalRondas}R x {ventanasPerRonda}V. Alterna: {ej1 detail}, {ej2 detail}. R{N}-{M}: RPE {x}"
```

Ejemplo:
```
"EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando Pull-up 8-10. R1-3: RPE 8, R4-6: RPE 9"
```

Sets en el bloque:
```
block_label: "DENSITY BLOCK A"
sets:
  - exercise: "KB Alternating Z Press"      # ventana 1
    set_type: "emom"
    planned_reps: 8
    planned_rest_seconds: 0
    coaching_cue_override: "EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando Pull-up 8-10. R1-3: RPE 8, R4-6: RPE 9"
  - exercise: "Commando Pull-up"             # ventana 2
    set_type: "emom"
    planned_reps: 10
    planned_rest_seconds: 0
    coaching_cue_override: null  # El primer set ya tiene el cue completo
  # Repetir N rondas — total 12 sets para 6R x 2V
```

## For Time

```
block_label: "SKILL B"   (o "BENCHMARK", "METCON BLOCK")
sets:
  - exercise: "MU Burpee"
    set_type: "working"
    planned_reps: 40
    planned_duration_seconds: 720   # cap 12 min
    coaching_cue_override: "FOR TIME · cap 12 min · 40 MU Burpees. 1 rep = burpee → jump-to-bar → Muscle-Up. Regresiones: R1 Banded · R2 Jumping · R3 High Pull-up + Bar Dip · R4 Pull-up + Push-up."
```

El render reconoce `FOR TIME · cap N min` y dispara el ForTime timer block.

## Death By (EMOM ascending)

```
block_label: "POWER ENGINE"
sets:
  - exercise: "Landmine Clean & Jerk"
    set_type: "working"
    planned_reps: 1
    coaching_cue_override: "DEATH BY · EMOM ascending · Min 1: 1R+1L · Min 2: 2R+2L · Min 3: 3R+3L... continúa hasta fallar la ronda dentro del minuto · Score = minuto más alto completado"
```

## Mobility / Warm-up

```
block_label: "PRIME BLOCK"   (o sub-bloques "PRIME BLOCK — A/B/C")
sets:
  - exercise: "Wall Slide"
    set_type: "warmup"
    planned_reps: 8
    planned_rest_seconds: 0
    coaching_cue_override: "Mobility hombro | 2 rondas · pegado a la pared, sin perder contacto"
  # El primer ejercicio del sub-grupo tiene el prefix "Label |"
  # Los siguientes sin prefix se agrupan visualmente bajo el último header detectado
```

## Recovery / Cooldown

```
block_label: "RECOVERY BLOCK"
sets:
  - exercise: "Pigeon"
    set_type: "cooldown"
    planned_reps: 1
    planned_duration_seconds: 90
    coaching_cue_override: "90s/lado"
```

## Hold isométrico (Plank, Farmer Hold, Calf pause)

```
block_label: "CALF + CARRY"   (o cualquier strength block)
sets:
  - exercise: "Farmer Hold"
    set_type: "superset"   # o "working" si es bloque solo
    planned_reps: 1
    planned_duration_seconds: 45
    planned_rest_seconds: 60
    coaching_cue_override: "45s hold · DBs pesadas · postura erguida, hombros atrás"
```

El render reconoce `planned_duration_seconds > 0` y dispara el TimedSetRow overlay fullscreen.

## Z2 Cardio / OPCIONAL

```
block_label: "OPCIONAL · Z2"
sets:
  - exercise: "Incline Walk steady pace"
    set_type: "working"
    planned_reps: 1
    planned_duration_seconds: 900   # 15 min
    coaching_cue_override: "OPCIONAL · 15 min · caminadora 12-15% incline · HR 130-145 · ritmo conversacional"
```

OPCIONAL · Z2 está registrado como `COOLDOWN_BLOCKS` en código — renderiza como mobility card sin inputs de peso.

## Sub-bloques (PRIME — A/B/C, HEAVY — A/B/C)

Cuando el bloque tiene 3 sub-grupos visuales distintos pero queremos que aparezcan en una sola card del overview:

**OPCIÓN A (preferida)** — Un solo `block_label` con sub-headers en cue:
```
block_label: "PRIME BLOCK"
sets:
  - exercise: "Wall Slide"
    coaching_cue_override: "Mobility hombro | 2 rondas · cue específico"   # ← prefix LABEL |
  - exercise: "Band Dislocates"
    coaching_cue_override: "2 rondas · cue específico"   # sin prefix, queda bajo el último header
  - exercise: "Scap Push-up"
    coaching_cue_override: "Activación escapular | 2 rondas · cue específico"   # ← nuevo header
```

**OPCIÓN B** — Sub-bloques separados como cards distintas:
```
block_label: "HEAVY BLOCK — A"   (siguiente bloque: "HEAVY BLOCK — B")
```

Para PRIME siempre OPCIÓN A. Para HEAVY/BUILD blocks OPCIÓN B (es la convención).
