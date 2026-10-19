# LIFTORY rules · NEVER reglas duras

Estas reglas son **NO-NEGOCIABLES**. El validador automático las chequea. Una violación = el plan no se aplica.

## NEVER 1 · Block order fijo

El orden de los bloques dentro de un workout es **inamovible**:

```
1. PRIME BLOCK         (warmup · activación · CNS prep)
2. HEAVY / DENSITY / SKILL  (strength + skill work)
3. HYPERTROPHY / VOLUME (accessory volumen)
4. CORE BLOCK / FINISHER (core o output corto)
5. RECOVERY BLOCK      (cooldown · stretching · breath)
```

**RECOVERY siempre LAST.** Nunca antes de strength. Nunca en medio.

Sub-bloques permitidos: `HEAVY BLOCK — A`, `HEAVY BLOCK — B`, `PRIME BLOCK — A/B/C` (sub-headers internos visuales).

## NEVER 2 · Phase names fijos

Las 6 semanas tienen estos labels exactos (no inventar variantes):

| Week | Phase label |
|---|---|
| 1 | `BASE` |
| 2 | `BASE+` |
| 3 | `ACUMULACIÓN` |
| 4 | `INTENSIFICACIÓN` |
| 5 | `PEAK` |
| 6 | `DELOAD` |

## NEVER 3 · Rotacional con peso pesado

**Cintura pequeña** es target estético del programa. El oblicuo bajo carga rotacional pesada **ensancha la cintura**.

- ❌ Russian Twist con DB pesada → OUT
- ❌ Rotational Med Ball Slam pesado → OUT
- ✅ Anti-rotation (Pallof Press, Renegade Row, Suitcase Carry) → OK
- ✅ Hanging Knee Raise (lateral) → OK
- ✅ Weighted Lateral Plank Dinámico → OK

## NEVER 4 · Nombres exactos de ejercicios

Los ejercicios tienen un nombre canónico en el catálogo. **Nunca renombrar casualmente** — eso rompe queries, displays, history. El validador chequea que cada referencia exista en el catálogo (o haya un draft pendiente con ese nombre).

Si necesitás un patrón que NO está en el catálogo:
- Buscá si hay un alias (ej. "DB Bench Press" vs "Dumbbell Bench Press")
- Si NO existe, creá con `create_exercise` (queda en `is_draft = true` para revisión)

## NEVER 5 · Voz LIFTORY

Las cards de ejercicios siguen el patrón LIFTORY:

| Field | Max chars | Estilo |
|---|---|---|
| `description` | 200 | 1-2 frases. **Qué + por qué**. |
| `coaching_cue` | 300 | 3-5 comandos cortos declarativos. Sin párrafos. |
| `founder_notes` | 150 | **1 frase punchy** con regla/opinión. |

Ejemplos correctos:

```
Wall Slide
  description: Activación de retractores escapulares contra la pared. Despierta serrato + trapecio bajo antes de cualquier press.
  coaching_cue: Talones, glúteo, espalda alta y cabeza tocan la pared. Brazos en "W" contra la pared. Sube a "Y" sin perder contacto. Si pierdes contacto, baja el rango.
  founder_notes: Warm-up #1 para días de press. Sin esto el press se va al deltoides anterior.
```

NUNCA:
- Descripciones largas explicando biomecánica
- Cues con "ahora vamos a..." o "es importante que..."
- Founder notes con jerga académica
- Emojis (excepto los aprobados: 🥇🥈🥉 PR display, ⚡🌊💀🔥 formato M2 manual)

## NEVER 6 · Frases prohibidas en coach_notes / cues

- "sin trampa"
- "no mames"
- "carajo"
- "pendejo"
- "carga baja obligatoria" (usar **porcentaje del 1RM** explícito)
- Jargon dev ("WIP", "uncommitted", "local")

## NEVER 7 · Mismo signature lift todos los días

No repetir signature lifts tradicionales (Bench / Squat / Pull-up) todos los días sin imaginación. Cada día debe tener una **identidad distinta** y un signature lift distinto.

## NEVER 8 · Bench / Squat / Deadlift 1RM dentro del meso

Reservado para mesos de testing dedicados (M5+ tradicionalmente). En M3-M4 tipo Hybrid Discovery, los tests son específicos:
- Front Squat 4×5 RPE 9 (no 1RM)
- Test Dip 3×5 RPE 9 max peso (no 1RM)
- MU Burpee SUB-12 min (no 1RM)

## Block labels canónicos

Solo estos labels (o sub-bloques `— A/B/C`) son válidos. Si necesitás uno nuevo, agregalo a `src/constants/blocks.ts` con color asignado:

```
PRIME BLOCK · PRIME BLOCK — A/B/C
RESET & BREATHE · SPINE & HIPS · DYNAMIC FLOW · ATHLETIC INTEGRATION
POWER BLOCK
HEAVY BLOCK — A/B/C  · HEAVY A · HEAVY B
BUILD BLOCK — A/B/C
DENSITY BLOCK A/B · HYPERTROPHY BLOCK
SKILL A · SKILL B · SKILL PUSH
LAT VOLUME · PULL POWER · ARM BLOCK · ARM SUPERSET
SHOULDER 3D · STRENGTH COMPOUND
GLUTE VOLUME · LEG ENGINE · CALF + CARRY
ATHLETIC HINGE · CORE BLOCK · CARRY BLOCK
METCON BLOCK · FINISHER BLOCK · ENGINE BLOCK
RECOVERY BLOCK
OPCIONAL · Z2
```
