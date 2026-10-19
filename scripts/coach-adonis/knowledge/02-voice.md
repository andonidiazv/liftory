# Voz LIFTORY · cómo escribir cards y notas

Toda la copy del programa sigue esta voz. Si una card o nota se siente larga, jerga académica, o adjetival → está mal.

## Principios

1. **Menos es más.** Un cue de 5 palabras vale más que uno de 50.
2. **Comandos directos.** "Baja al piso." Sí. "Es importante que bajes hasta tocar el piso." No.
3. **Sin jerga académica.** "Estiramiento del bíceps largo" sí. "Activación del músculo bicipital braquial en posición elongada" no.
4. **El por qué importa.** Si una regla no es obvia, una frase explica. "Pegado a la pared para sentir la diferencia". No 3 párrafos.
5. **Sin adjetivos heroicos.** "Brutal", "épico", "el mejor del mundo" → fuera.

## Patrón de exercise card

```
{
  description: "[Qué es]. [Por qué importa]."
  coaching_cue: "[Setup]. [Movimiento]. [Forma]. [Si falla, qué hacer]."
  founder_notes: "[Una frase punchy con regla o opinión]."
}
```

### Ejemplos correctos del catálogo

**Wall Slide** (warmup hombro):
```
description: Activación de retractores escapulares contra la pared. Despierta serrato + trapecio bajo antes de cualquier press.
coaching_cue: Talones, glúteo, espalda alta y cabeza tocan la pared. Brazos en "W" contra la pared. Sube a "Y" sin perder contacto. Si pierdes contacto, baja el rango.
founder_notes: Warm-up #1 para días de press. Sin esto el press se va al deltoides anterior.
```

**KB Alternating Z Press** (signature):
```
description: Press unilateral con KB sentado en Z (piernas extendidas). Sin piernas para asistir — todo el press viene del hombro + core anti-rotación.
coaching_cue: Sentado piernas rectas adelante. Espalda erguida, sin doblar lumbar. KB en rack. Press overhead controlado, baja lento. Cambia lado por rep.
founder_notes: El press más honesto. Sin trampa.
```

**Barbell Bulgarian Split Squat** (heavy unilateral):
```
description: Sentadilla unilateral con barra libre sobre los hombros. Pie trasero elevado. Versión elite del Bulgarian.
coaching_cue: Barra libre en back squat. Pie trasero elevado en banco. Torso ligeramente inclinado adelante. Baja hasta que el muslo de adelante quede paralelo al piso. Empuja con el pie de adelante. Si pierdes balance, baja peso.
founder_notes: La barra libre añade demanda neural enorme. Construye propiocepción + fuerza unilateral real.
```

## Patrón de coach_note del workout

```
[Identidad del día]. [Lift signature + formato]. [Otros bloques clave 1 línea]. [Recovery si aplica].
```

Máx **300 chars**.

### Ejemplos correctos

**LUN Density Day**:
```
Density Day. EMOM 12 min (Z Press + Commando alternando) · pec superior + lateral aislado · arm block tríceps · core anti-extensión. Hombros 3D + V-taper.
```

**SÁB Lower Hypertrophy**:
```
Lower Hypertrophy Unilateral. Barbell Bulgarian 4×8/lado (signature) + Snatch-Grip RDL 3×8. Glute volume: Walking Lunges + Pull-Through. Sled Push engine. Calf + Carry pillar.
```

## Patrón de short_on_time_note

```
¿Sin tiempo? [Prioridad 1-3 bloques]. Salta [bloque opcional]. NUNCA saltes [Recovery/Carry].
```

Máx **150 chars**.

### Ejemplos correctos

```
¿Sin tiempo? Density Block + Skill Push. Salta Hypertrophy. NUNCA saltes Recovery.
```

```
¿Sin tiempo? Bulgarian + Snatch-Grip + Glute Volume. Salta Sled. NUNCA saltes Carry + Recovery.
```

## Patrón de coaching_cue_override (override del cue por set específico)

Cuando un set necesita un cue distinto al de la card (ej. "ronda 1: 8 reps / ronda 2: 6 reps"), poner el cue específico aquí. Máx **200 chars**.

### Ejemplos

Para sets de PRIME con sub-headers internos:
```
"Mobility hombro | 2 rondas · pegado a la pared, sin perder contacto"
```

Para EMOM (formato preciso que el render reconoce):
```
"EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando Pull-up 8-10. R1-3: RPE 8, R4-6: RPE 9"
```

Para For Time:
```
"FOR TIME · cap 12 min · 40 MU Burpees. 1 rep = burpee → jump-to-bar → Muscle-Up. Regresiones: R1 Banded · R2 Jumping · R3 High Pull-up + Bar Dip · R4 Pull-up + Push-up."
```

## Anti-patterns (NUNCA escribir así)

❌ "Este ejercicio es fundamental para construir musculatura del tren superior, especialmente del pectoral, y representa una de las mejores opciones para hipertrofia."

❌ "Mantén la columna vertebral en posición neutra durante todo el movimiento para evitar lesiones potenciales en la zona lumbar."

❌ "Recuerda que es muy importante respirar correctamente durante todo el ejercicio para maximizar el rendimiento."

✅ En su lugar: "Espalda neutra. Respira por la nariz."
