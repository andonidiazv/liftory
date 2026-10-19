# Coach Adonis · LIFTORY Director Deportivo (CLI MVP)

Agente de IA que arma mesociclos completos con la metodología de Andoni.

## Quick start

```bash
# 1) Una vez: poné tu Anthropic API key en .env
echo 'ANTHROPIC_API_KEY="sk-ant-..."' >> .env

# 2) Crear un meso nuevo (lee spec, llama Claude, escupe plan)
node scripts/coach-adonis/new-meso.mjs scripts/coach-adonis/specs/m4-example.json
# → output (en out/coach-adonis/M4/):
#   plan.json    (lo que vas a aplicar)
#   audit.txt    (resultado del validador automático)
#   raw.txt      (respuesta completa del agente, para debugging)

# 3) Revisar el audit + plan.json. Si está bien:
node scripts/coach-adonis/apply-meso.mjs out/coach-adonis/M4/plan.json
# → re-corre el validador, pide confirmación, crea workouts en DB
# → flags: --dry-run para preview · --yes para skip confirm

# 4) Revisar y aprobar drafts de ejercicios nuevos:
node scripts/coach-adonis/approve-draft.mjs --list
node scripts/coach-adonis/approve-draft.mjs "Nombre exacto del ejercicio"
```

## Cómo funciona

```
spec.json ──► new-meso.mjs ──► Coach Adonis (Claude Opus 4.7)
                  │                  │
                  │                  ├──► tools: exercise_lookup, create_exercise
                  │                  └──► knowledge/*.md (system prompt)
                  ▼
            plan.json + raw.txt
                  │
                  ▼
            validator.mjs ──► audit.txt
                  │
                  ▼ (si errors === 0)
            apply-meso.mjs ──► DB
                              ├── mesocycle
                              ├── workout templates (user_id=NULL)
                              └── instancias × 3 atletas
```

### Tools que Coach Adonis usa internamente

- **`exercise_lookup(query)`** — busca en el catálogo activo (~370 ejercicios) por nombre o keyword
- **`create_exercise(spec)`** — crea un ejercicio nuevo en DB con `is_draft=true`. Andoni los revisa después

El catálogo completo se inyecta en el system prompt al inicio del run, así que Coach Adonis arranca con vista de pájaro. `exercise_lookup` se usa para chequear detalle de un ejercicio específico.

El validador (`lib/validator.mjs`) se corre DESPUÉS de que el agente devuelve el plan — no es una tool que el agente llama.

### Knowledge base (`knowledge/`)

Markdown files con la filosofía + reglas que Coach Adonis lee como contexto en cada llamada:

- `00-philosophy.md` — Marcus Filly + Brian Pruett + Colin Pasque · FBB Stack
- `01-liftory-rules.md` — NEVER rules · block order · phase names
- `02-voice.md` — descripción + cue + founder_notes patterns con ejemplos
- `03-target-athlete.md` — BUILD HIM ELITE: hombros 3D, V-taper, cintura pequeña
- `04-prior-mesos/M3-summary.md` — M3 día por día como referencia
- `05-block-formats.md` — EMOM, For Time, Death By, Superset, Density

## Output

El plan JSON tiene esta estructura:

```jsonc
{
  "mesocycle": {
    "name": "M4",
    "program_name": "BUILD HIM ELITE",
    "cycle_number": 4,
    "start_date": "2026-07-20",
    "total_weeks": 6
  },
  "exercises_to_create": [
    { "name": "...", "description": "...", "coaching_cue": "...", ... }
  ],
  "workouts": [
    {
      "week_number": 1,
      "day_label": "DENSITY DAY",
      "scheduled_date": "2026-07-20",
      "blocks": [
        {
          "label": "PRIME BLOCK",
          "sets": [
            { "exercise": "Wall Slide", "set_type": "warmup", "planned_reps": 8, "coaching_cue_override": "..." }
          ]
        }
      ]
    }
  ]
}
```

`apply-meso.mjs` toma este JSON y crea todo en DB con la misma lógica que `m3-build-w2-w6.mjs`.

## Approval

El validador automático (`lib/validator.mjs`) chequea las reglas duras:
- Block order correcto (PRIME → strength → CORE → RECOVERY)
- RECOVERY siempre al final
- No rotacional con peso pesado
- Phase names canónicos (BASE → BASE+ → ACUMULACIÓN → INTENSIFICACIÓN → PEAK → DELOAD)
- Voz LIFTORY (descripciones ≤ 200 chars, cues ≤ 300, founder ≤ 150)
- Block labels registrados en `src/constants/blocks.ts`
- Set orders únicos
- Exercise refs válidos

Cualquier violación va a `out/coach-adonis/M{N}/audit.txt`. Si hay errores → `new-meso.mjs` sale con código 2 y `apply-meso.mjs` se niega a correr.

Luego vos revisás `plan.json` + `audit.txt` y aprobás con `apply-meso.mjs`.

## Próximas fases (no incluidas en MVP)

- **HTML proposal renderer** — convertir `plan.json` → preview navegable estilo workout-card (como M3 HTML v3)
- **Fase 2**: UI en admin panel (lanzar Coach Adonis desde la web app)
- **Fase 3**: Multi-program author (mujeres, 3 días, 4 días)
- **Fase 4**: Live coach por atleta (progressions/regressions en-app)
