# LIFTORY 2.0 — MASTER PRODUCT & EXECUTION BLUEPRINT

**Versión:** 2.1
**Última actualización:** 2026-10-23
**Estado:** En ejecución · Sprint 2
**Fuente de verdad:** este archivo. Todo trabajo futuro referencia los IDs `LFT-xxx` de aquí.

---

## 0 · CÓMO USAR ESTE DOCUMENTO

Este archivo reemplaza a todos los reportes sueltos. Las dos auditorías que lo alimentan
siguen publicadas como evidencia, pero **no se actualizan**: lo que cambia, cambia aquí.

| Documento | Para qué sirve ahora |
|---|---|
| [Auditoría de producto](https://claude.ai/artifact/8GjeARon3jPd8r3LCXKEd3) | Evidencia medida de los bloqueadores de lanzamiento |
| [La capa de inteligencia](https://claude.ai/artifact/4GihbNQ56TAtCcRn1tvL79) | Evidencia medida de la base de ejercicios y las reglas |
| **Este archivo** | **Qué se hace, en qué orden, y cómo sabemos que terminó** |

**Reglas de mantenimiento**
1. Un ID nunca se reusa ni se renumera.
2. Cambiar el alcance o la prioridad de un ítem exige una línea en el *Change Log* (§19).
3. Un ítem no pasa a `completado` sin cumplir su criterio de aceptación.
4. Las decisiones pendientes (§16) bloquean trabajo. No se asumen aprobadas.

---

## 1 · RESUMEN EJECUTIVO

LIFTORY tiene un contenido de entrenamiento excelente envuelto en un producto que
sólo funciona para un perfil: hombre avanzado con gimnasio completo.

Tres hechos medidos lo resumen:

- **La metodología ya es determinista.** En los 5 mesociclos de BUILD HIM ELITE, el RPE sube
  de forma monotónica de W1 a W5, pica en W5 y descarga en W6 — 5 de 5, sin excepción.
  El volumen baja en W6 — 5 de 5. El esqueleto de un mesociclo son reglas, no IA.
- **La base de datos no aguanta la personalización.** 98 de 122 ejercicios intermedios en uso
  no tienen regresión a principiante. 72 de 103 que exigen gimnasio no tienen alternativa.
  El modelo de relaciones no puede expresar "progresión": de 168 filas, 0 lo son.
- **El producto no está listo para cobrar.** Cero suscripciones y cero pagos han pasado por
  el sistema. El acceso se controla con un campo puesto a mano.

**La tesis de ejecución:** no se construye inteligencia sobre datos que no aguantan.
Primero la base (fases 0–2), que además desbloquea el lanzamiento. Después se lanza.
El Coach Studio se construye con suscriptores pagando, no antes.

**El camino crítico tiene seis eslabones y ninguno se puede saltar:**

> Vocabularios controlados → Relaciones tipadas → Poblar relaciones →
> Arquitectura de programa unificada → Onboarding real → Lanzamiento

---

## 2 · VISIÓN DE PRODUCTO

**MOVE WELL. GET STRONG. BUILD A BODY FOR LIFE.**

LIFTORY es una plataforma guiada por una metodología, no un generador de rutinas.
El usuario no compra acceso a entrenamientos: compra acceso a un sistema de coaching
estructurado que se adapta a él.

**Los cinco principios que filtran cada iniciativa de este backlog:**

1. **La metodología manda.** Adaptamos el método al usuario; no reinventamos el método por usuario.
2. **La personalización es por nivel y equipo**, no por género. Objetivo y disponibilidad son secundarios.
3. **La IA sirve a la metodología.** Nunca genera programación sin que un humano la apruebe.
4. **El coach escala, no desaparece.** El objetivo es multiplicar a Andoni, no sustituirlo.
5. **Lanzar bien vale más que lanzar completo.** La fiabilidad gana a la cantidad de features.

**Prueba de filtro:** si una iniciativa no mejora adherencia, retención, calidad de
entrenamiento o fiabilidad, no entra antes del lanzamiento.

---

## 3 · ESTADO ACTUAL VERIFICADO

Todo medido contra producción (`yjgasprksvplswemprsu`) y `main` el 2026-10-22.

| Área | Estado | Evidencia |
|---|---|---|
| Código | 179 archivos, 49,269 líneas, 27 rutas | Medido |
| Ejercicios | 474 registros, 469 activos, 346 usados en plantillas | Medido |
| Video | 127/469 con video (27%); 0 links rotos; 117/129 pesan >8 MB | 129 URLs verificadas una por una |
| Metadatos | `movement_plane` 27%, `secondary_movement_pattern` 9%, `contraindications` 1% | Medido en los 474 |
| Vocabularios | `equipment_required` 59 valores libres; `primary_muscles` 103 | Medido |
| Duplicados | 7 grupos idénticos tras normalizar + 8 familias dudosas | Medido |
| Relaciones | 168 filas: 128 regresiones, 40 laterales, **0 progresiones** | Medido |
| Programas | BUILD HIM ELITE 210 sesiones; los otros 3, 42 cada uno | Medido |
| Divergencia BH vs SH | 22–26% de patrón, explicada por género, no por objetivo | Medido |
| Usuarios | 13; 10 con cero entrenamientos; 3 entrenando de verdad | Medido |
| Pagos | `subscriptions` 0 filas, `payments` 0 filas | Medido |
| Seguridad | Anónimo lee 336 plantillas + 9,014 sets. Sin datos de usuario expuestos. Escritura bloqueada | Probado sin login |
| Badges | 14 definidos, 0 otorgados | Medido |
| Offline | Sprint 1 (cola de escritura) en producción y validado | Sesión previa |

### Lo que NO se ha producido todavía

El encargo original listaba 14 workstreams como completados. **Cuatro no existen.**
No los voy a consolidar como si existieran.

| Workstream | Estado real |
|---|---|
| Rediseño UX/UI con mockups de alta fidelidad | **No producido.** Hay hallazgos sueltos, no un sistema ni pantallas. |
| Auditoría y dirección de marca | **No producida.** La marca se respetó; no se auditó. |
| Estrategia de crecimiento y retención | **No producida.** Sólo existe el análisis de precio. |
| Declaración de posicionamiento | **No producida.** Hay tres ángulos de diferenciación, no un statement. |

Esto está recogido como `LFT-050` a `LFT-053`. Ninguno es bloqueador de lanzamiento.

---

## 4 · DECISIONES ESTRATÉGICAS YA FUNDAMENTADAS

Son **recomendaciones con evidencia**, no decisiones aprobadas. Su aprobación vive en §16.

| # | Recomendación | Evidencia que la sostiene |
|---|---|---|
| E1 | Unificar en **Modelo C**: un motor, tracks por objetivo | Los 4 programas ya comparten vocabulario de bloques; SCULPT HER ELITE vs FOUNDATION divergen 4.7% |
| E2 | Retirar el género como variable de programación | La divergencia BH/SH es pull+push vs core+hinge: estereotipo, no objetivo |
| E3 | Motor **híbrido con reparto invertido**: reglas para la estructura, IA sólo para elegir ejercicio y redactar | La onda y el orden de bloques son 100% consistentes en 180 sesiones |
| E4 | **No bajar el precio**; cerrar la brecha de valor | A ~USD $38 compites con Ladder ELITE ($44.99, con coach 1:1) y con Smart Fit ($299–699 MXN) |
| E5 | Construir fases 0–2 antes de lanzar; Coach Studio después | Las fases 0–2 también resuelven bloqueadores de lanzamiento; 3–5 no |
| E6 | Conservar Build Him / Sculpt Her como marca, no como arquitectura | El nombre tiene valor; la rama de código no |

---

## 5 · ARQUITECTURA UNIFICADA (destino)

```
                    EL MÉTODO LIFTORY
         (reglas duras: onda, orden de bloques, perfiles)
                            │
                ┌───────────┴───────────┐
                │      TRACK            │   ← por objetivo, no por sexo
                │  Fuerza & Hipertrofia │
                │  Rendimiento Atlético │
                │  Recomposición        │
                │  Fuerza & Longevidad  │
                └───────────┬───────────┘
                            │
                      MESOCICLO (6 semanas)
                            │
        ┌───────────────────┼───────────────────┐
     NIVEL               EQUIPO              TIEMPO
  beginner /          full_gym /           días/semana
  intermediate /      home_gym /           duración
  advanced            minimal /
                      bodyweight
                            │
                   SELECCIÓN DE EJERCICIO
              (vía exercise_relations tipadas)
                            │
                      PROGRESIÓN (RPE)
```

**Las tres capas de personalización**

| Capa | Qué decide | Cuándo | Con qué |
|---|---|---|---|
| Programa | Track y mesociclo | Onboarding y al cerrar bloque | Objetivo, nivel, días |
| Ejercicio | Qué variante ves tú | Al asignarse el mesociclo | Nivel + equipo vía `exercise_relations` |
| Sesión | Recortes de hoy | Al abrir la sesión | Prioridad de bloque + swaps aprobados |

**Regla que mantiene esto honesto:** cuando no existe sustitución válida, el sistema lo dice
y lo manda a la cola de trabajo. Nunca improvisa.

---

## 6 · MASTER BACKLOG

Prioridades: **P0** bloquea lanzamiento · **P1** crítico · **P2** alto valor · **P3** futuro
Esfuerzo: **S** horas · **M** días · **L** 1–2 semanas · **XL** más de 2 semanas
Estado inicial: `pendiente` salvo donde se indique.

### Fase 0 — Decisiones y arquitectura

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-001 | Arquitectura | Decidir modelo de programa | 4 programas, 3 famélicos, divergencia por género | Aprobar o rechazar Modelo C (§16 D1) | P0 | S | — | Fundador | Decisión registrada en §16 con fecha | Pre-lanzamiento |
| LFT-002 | Arquitectura | Definir los tracks | Si es Modelo C, hay que nombrar los tracks | Definir 3–4 tracks por objetivo | P0 | S | LFT-001 | Fundador | Lista cerrada de tracks con descripción | Pre-lanzamiento |
| LFT-003 | Arquitectura | Alcance de personalización en v1 | Riesgo de prometer más de lo que la base aguanta | Fijar qué dimensiones se encienden al lanzar | P0 | S | LFT-001 | Fundador | Documentado en §16 D3 | Pre-lanzamiento |
| LFT-004 | Arquitectura | Aprobar la taxonomía | Esquema propuesto sin aprobar | Revisar §7 y aprobar o ajustar | P0 | S | — | Fundador | Esquema firmado | Pre-lanzamiento |
| LFT-005 | Negocio | Fijar precio y modelo de cobro | $699 MXN sin validar contra valor entregado | Decidir precio, prueba gratis y planes | P0 | S | — | Fundador | Price IDs definitivos en Stripe | Pre-lanzamiento |

### Fase 1 — Base de datos y programación

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-100 | Seguridad | Cerrar RLS de plantillas | Anónimo lee 336 workouts y 9,014 sets | Política que exija sesión autenticada | **P0** | S | — | Ingeniería | ✅ **COMPLETADO 2026-10-23.** Anónimo ve 0 filas en 15 tablas; Home, Programa y sesión verificados sin errores | Pre-lanzamiento |
| LFT-101 | Datos | Vocabulario de equipo canónico | 59 valores libres con sinónimos | Tabla `equipment` + `equipment_alias`; migrar los 474 | **P0** | M | LFT-004 | Ingeniería | ✅ **COMPLETADO 2026-10-23.** 59 → 46 códigos, 0 fuera del catálogo, trigger que lo impide, admin lee de la tabla. `gym_only` deja listo el filtro de casa: 355 de 474 ejercicios se pueden hacer sin gimnasio | Pre-lanzamiento |
| LFT-102 | Datos | Vocabulario de músculos | 103 valores libres; 42 sin mapear | Tabla `muscles` + `muscle_alias` | P1 | M | LFT-004 | Ingeniería | ✅ **COMPLETADO 2026-10-23.** 103 → 33 códigos, 71 alias, 0 fuera del catálogo, trigger que lo impide. El análisis de volumen ya no pierde referencias | Pre-lanzamiento |
| LFT-116 | Datos | Revisar el nivel de los 474 ejercicios | `all_levels` se usaba al azar; estiramientos y CARs marcados como principiante | Rúbrica explícita + reclasificación | P1 | M | — | Fundador + Ing. | ✅ **COMPLETADO 2026-10-23.** 94 ejercicios reclasificados; `all_levels` 42 → 122; ninguna cadena de regresión rota (26 antes, 26 después) | Pre-lanzamiento |
| LFT-117 | Datos | Equipo que contradice el nombre | 6 fichas decían "sin equipo" siendo imposibles sin él | Corregir | P1 | S | LFT-101 | Ingeniería | ✅ **COMPLETADO 2026-10-23.** Muscle Up y Chin-up ya no aparecen como entrenables en casa | Pre-lanzamiento |
| LFT-103 | Datos | Resolver 7 duplicados exactos | Mismo ejercicio dos veces | Marcar canónico + `merged_into`; nunca borrar | **P0** | M | LFT-101 | Fundador + Ing. | 7 grupos resueltos; `workout_sets` histórico intacto | Pre-lanzamiento |
| LFT-104 | Datos | Revisar 8 familias dudosas | ¿Variantes o duplicados? | Revisión de coach, una por una | P1 | M | LFT-103 | Fundador | Cada familia marcada como variante legítima o fusionada | Pre-lanzamiento |
| LFT-105 | Datos | Relaciones tipadas | 0 progresiones expresables | `relation_type` + `requires_review` + `rationale` sobre la tabla existente; generar las inversas | **P0** | M | LFT-004 | Ingeniería | ✅ **COMPLETADO 2026-10-23.** 168 → 289 filas: 121 regresiones, **121 progresiones** (antes 0), 44 cambios de equipo, 3 equivalentes. Cero contradicciones con los niveles | Pre-lanzamiento |
| LFT-106 | Datos | Poblar `movement_plane` | ~~27% de relleno~~ **premisa falsa** | — | ~~P0~~ | S | — | — | ✅ **CERRADO 2026-10-23 sin trabajo real.** El campo sólo aplica a push/pull por diseño y ya estaba al **97%** (173 de 179). El "27%" era medir sobre los 474, incluyendo squat, hinge y core, donde NULL es la respuesta correcta | — |
| LFT-119 | Datos | Auditoría de coherencia interna de las 467 fichas | Nadie había verificado que los campos no se contradigan entre sí | `scripts/auditar-fichas.mjs` | P1 | M | — | Ingeniería | ✅ **COMPLETADO 2026-10-23.** 467 auditadas. Sólo 3 errores reales: `none`+`wall` juntos, un skullcrusher mal nombrado y un thumbnail faltante. La coherencia interna está sana | Pre-lanzamiento |
| LFT-120 | Datos | Verificación externa ficha por ficha | La coherencia interna no detecta si la descripción corresponde al movimiento real | Contrastar cada ficha contra fuentes de referencia, por tandas priorizadas por riesgo | P1 | XL | LFT-119 | Fundador + Ing. | Cada ficha contrastada y las divergencias resueltas por criterio de coach | Pre-lanzamiento |
| LFT-118 | Datos | Familia de movimiento para filtrar candidatos | El patrón+músculo propone basura: "Leg Extension" como alternativa a la sentadilla con barra | Usar el núcleo del nombre (ya implementado en `scripts/curate-swaps.mjs`) en vez del plano | **P0** | M | — | Ingeniería | Un candidato propuesto para Barbell Back Squat es reconociblemente una sentadilla | Pre-lanzamiento |
| LFT-107 | Datos | 98 regresiones a principiante | Un principiante no puede entrenar | Generar candidatos por familia; aprobar en lote | **P0** | XL | LFT-105, LFT-106 | Fundador + Ing. | Todo ejercicio intermedio en uso tiene ≥1 ruta a principiante aprobada | Pre-lanzamiento |
| LFT-108 | Datos | 72 alternativas sin gimnasio | No se puede entrenar en casa | Mismo mecanismo que LFT-107, eje equipo | **P0** | XL | LFT-105, LFT-101 | Fundador + Ing. | Todo ejercicio con dependencia de gym tiene alternativa aprobada, o queda marcado como irreducible | Pre-lanzamiento |
| LFT-109 | Datos | Campos nuevos del ejercicio | Falta `technical_demand`, `loading_type`, `suitable_for` | Migración aditiva, sin tocar IDs | P1 | M | LFT-004 | Ingeniería | Columnas creadas; poblado ≥90% en los 346 en uso | Pre-lanzamiento |
| LFT-110 | Datos | Limpiar columnas muertas | `emotional_barrier_tag` 0%, `video_duration_seconds` 0% | Borrar la primera; poblar la segunda | P2 | S | — | Ingeniería | Sin columnas al 0% de relleno | Post-lanzamiento |
| LFT-111 | Datos | `block_types` controlado | 57 etiquetas libres; 64 nombres de día | Catálogo de ~10 tipos con perfil por defecto | P1 | M | LFT-004 | Fundador + Ing. | Todo `block_label` mapea a un `block_type`; el nombre bonito queda como etiqueta | Pre-lanzamiento |
| LFT-112 | Programación | Codificar las reglas duras | La metodología vive en la cabeza de Andoni | Onda W1–W6, orden de bloques, perfiles por bloque, 6+1 | P1 | L | LFT-111 | Ingeniería | Un test reproduce la curva de RPE de los 5 mesociclos existentes | Pre-lanzamiento |
| LFT-113 | Programación | Resolver 3 anomalías de coach | M5 RPE 9.94 · M5 volumen plano · M3 baja en W3 | Decisión de entrenador, no corrección automática | P1 | S | — | Fundador | Cada una confirmada como intencional o corregida | Pre-lanzamiento |
| LFT-114 | Datos | Unificar `status` / `is_selectable` | 4 mesos `draft` pero seleccionables | Separar los dos conceptos y corregir etiquetas viejas | **P0** | S | — | Ingeniería | ✅ **COMPLETADO 2026-10-23.** Los 8 mesociclos verificados completos; M2–M5 pasados a `completed`; restricción `CHECK` impide que un draft sea seleccionable | Pre-lanzamiento |
| LFT-115 | Producto | Ciclo `live` vencido entrega calendario en el pasado | Los 4 programas apuntaban a un ciclo terminado hace 180 días | `assignProgram` ignora el ciclo si ya terminó; el onboarding deja de ofrecerlo por defecto | **P0** | S | — | Ingeniería | ✅ **COMPLETADO 2026-10-23.** Hallado al ejecutar LFT-114, no estaba en el plan | Pre-lanzamiento |

### Fase 2 — Producto y UX

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-200 | UX | Onboarding pregunta equipo y días | `equipment:"full_gym"` y `training_days:5` hardcodeados | Pasos reales + guardar respuesta | **P0** | M | LFT-101, LFT-003 | Ingeniería | 0 constantes escritas a mano; la respuesta llega a la BD | Pre-lanzamiento |
| LFT-201 | UX | Ruta real de principiante | `if (exp==="beginner") return "intermediate"` | Asignación que respeta el nivel declarado | **P0** | M | LFT-001, LFT-107 | Ingeniería | Un principiante recibe contenido de nivel principiante | Pre-lanzamiento |
| LFT-202 | UX | Asignación por track | Hoy es género × nivel | Reescribir `assignProgram` sobre el Modelo C | **P0** | L | LFT-001, LFT-002 | Ingeniería | El género ya no decide selección de ejercicios | Pre-lanzamiento |
| LFT-203 | UX | Enseñar el vocabulario | RPE, PRIME BLOCK, EMOM sin explicar nunca | Microcopy en contexto, primera vez que aparece | P1 | M | — | Diseño + Ing. | Todo término de jerga tiene una explicación de una línea | Pre-lanzamiento |
| LFT-204 | Media | Transcodificar 117 videos pesados | Máx 48.9 MB; inusable con datos móviles | Reencodear a 2–4 MB, generar thumbnails | **P0** | L | — | Ingeniería | Ningún video >5 MB; los 2 sin thumbnail resueltos | Pre-lanzamiento |
| LFT-205 | Media | Grabar video faltante | 27% de cobertura | Priorizar los más usados en programación real | P1 | XL | LFT-103 | Fundador | ≥70% de cobertura en los ejercicios programados | Post-lanzamiento |
| LFT-206 | UX | Selector de mesociclos a todos | Hoy limitado a 2 perfiles | Quitar allowlist tras validar | P2 | S | LFT-114 | Ingeniería | Disponible para todo usuario con suscripción activa | Post-lanzamiento |
| LFT-207 | UX | Badges: conectar o retirar | 14 definidos, 0 otorgados | Decidir y ejecutar | P1 | M | — | Fundador + Ing. | O se otorgan en producción, o desaparecen de la UI | Post-lanzamiento |
| LFT-208 | UX | Progreso por bloque | No se ve qué mejoró | Qué subió, qué se mantuvo, qué se estancó | P2 | L | — | Diseño + Ing. | Al cerrar un mesociclo, el atleta ve su delta | Post-lanzamiento |

### Fase 3 — Listo para lanzar

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-300 | Pagos | Probar Stripe end-to-end | 0 suscripciones, 0 pagos jamás | Alta, cobro, webhook, portal, cancelación en modo test | **P0** | M | LFT-005 | Ingeniería | Un ciclo completo deja filas correctas en `subscriptions` y `payments` | Pre-lanzamiento |
| LFT-301 | Pagos | Control de acceso real | `subscription_status` puesto a mano | Que el acceso derive del estado real de Stripe | **P0** | M | LFT-300 | Ingeniería | Cancelar en Stripe quita el acceso sin intervención manual | Pre-lanzamiento |
| LFT-302 | Seguridad | Separar los secretos del `.env` rastreado | El service role key vivía en el mismo archivo que git rastrea | Secretos a `.env.local` (ignorado); `.env` conserva sólo las `VITE_*`, que ya son públicas | **P0** | S | — | Ingeniería | ✅ **COMPLETADO 2026-10-23.** `git add -A` ya no puede incluir el secreto; build y scripts verificados | Pre-lanzamiento |
| LFT-303 | Calidad | Deuda de tipos | Errores TS preexistentes en ~18 archivos | Limpiar los que afectan rutas críticas | P1 | L | — | Ingeniería | `tsc --noEmit` limpio en las rutas de onboarding, workout y pago | Pre-lanzamiento |
| LFT-304 | Calidad | Llaves duplicadas en `muscleGroups.ts` | 5 errores TS1117; sinónimos que no surten | Consolidar | P1 | S | LFT-102 | Ingeniería | ✅ **COMPLETADO 2026-10-23.** Las 5 tenían el mismo valor: redundancia, no conflicto | Pre-lanzamiento |
| LFT-305 | Analítica | Instrumentar métricas de lanzamiento | No hay forma de ver activación ni adherencia | Eventos de §18 | **P0** | M | — | Ingeniería | Los 6 eventos de lanzamiento se registran y son consultables | Pre-lanzamiento |
| LFT-306 | Calidad | Rendimiento real en celular | Nunca medido en condiciones de gimnasio | Medir carga en gama media con datos | P1 | M | LFT-204 | Ingeniería | Sesión abre en <3 s en 4G en gama media | Pre-lanzamiento |
| LFT-307 | Calidad | Correos transaccionales | Edge functions existen, nunca verificadas | Probar que llegan y se ven bien | P1 | S | — | Ingeniería | Alta, bienvenida, cobro y fallo de cobro verificados | Pre-lanzamiento |
| LFT-308 | Calidad | Accesibilidad | No auditada | Contraste, tamaños, foco, lectores | P2 | L | — | Diseño + Ing. | Sin fallos críticos en las 5 pantallas principales | Post-lanzamiento |
| LFT-309 | Contenido | Resolver la semana 7 | 3 programas se quedan sin contenido | Resuelto por el Modelo C (LFT-202) | **P0** | — | LFT-202 | Fundador | Ningún usuario llega a un calendario vacío | Pre-lanzamiento |

### Fase 4 — Coach Studio

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-400 | Admin | Bandeja de calidad de datos | 474 fichas, mantenimiento manual | Ordenar por lo que falta, no alfabético | P1 | M | LFT-109 | Ingeniería | Se ve "87 sin plano" y se actúa desde ahí | Post-lanzamiento |
| LFT-401 | Admin | Resolución de duplicados | Proceso manual y riesgoso | Dos fichas lado a lado, elegir canónico | P1 | M | LFT-103 | Ingeniería | Fusionar no rompe historial | Post-lanzamiento |
| LFT-402 | Admin | Mapa de relaciones | Editar ficha por ficha no escala | Ver y editar la cadena completa | P2 | L | LFT-105 | Diseño + Ing. | Editar una cadena sin abrir fichas sueltas | Post-lanzamiento |
| LFT-403 | Admin | Cola de propuestas tipadas | `/admin/swaps` sólo cubre swaps | Extender a `exercise_relations` | P1 | M | LFT-105 | Ingeniería | Aprobar en lote cualquier tipo de relación | Post-lanzamiento |
| LFT-404 | IA | Generador de esqueleto | Andoni escribe cada mesociclo | Reglas generan 6 semanas sin modelo | P2 | L | LFT-112 | Ingeniería | Esqueleto válido sin intervención de IA | Futuro |
| LFT-405 | IA | Selección de ejercicio asistida | Elegir ejercicio tiene criterio | IA elige de candidatos pre-filtrados, por `exercise_id` | P2 | L | LFT-404, LFT-107, LFT-108 | Ingeniería | Imposible proponer un ejercicio inexistente | Futuro |
| LFT-406 | IA | Capa de validación | Una propuesta mala no debe pasar callada | Audita cobertura, volumen, duración, redundancia | P2 | M | LFT-404 | Ingeniería | Marca problemas; nunca corrige en silencio | Futuro |
| LFT-407 | Admin | Pantalla de revisión y aprobación | Nada se publica sin Andoni | Revisar, editar, comparar, aprobar, publicar | P2 | XL | LFT-406 | Diseño + Ing. | Ningún mesociclo generado llega a un atleta sin aprobación explícita | Futuro |
| LFT-408 | IA | Captura de ediciones | El sistema no aprende | Guardar propuesto → aprobado con contexto | P3 | M | LFT-407 | Ingeniería | Toda edición queda registrada | Futuro |
| LFT-409 | IA | Promoción de reglas candidatas | Una edición no es una regla | A las 3 repeticiones, proponer regla; Andoni aprueba | P3 | M | LFT-408 | Ingeniería | Una regla aprobada entra al motor determinista, no al modelo | Futuro |
| LFT-410 | Admin | Historial de cambios | `audit_log` existe y está vacía | Conectarla | P2 | M | — | Ingeniería | Todo cambio en ejercicios y mesociclos queda registrado | Post-lanzamiento |

### Fase 5 — Crecimiento, y lo que falta por producir

| ID | Workstream | Iniciativa | Problema | Acción | Pri | Esf | Depende | Owner | Criterio de aceptación | Fase |
|---|---|---|---|---|---|---|---|---|---|---|
| LFT-050 | Diseño | Rediseño UX/UI con mockups | **Nunca producido** | Sistema de diseño + 5 pantallas en alta fidelidad | P2 | XL | LFT-202 | Diseño | Mockups de las 5 pantallas principales | Post-lanzamiento |
| LFT-051 | Marca | Auditoría de marca | **Nunca producida** | Evaluar logo, tipografía, paleta, tono | P3 | L | — | Diseño | Documento con qué se conserva y qué cambia | Futuro |
| LFT-052 | Crecimiento | Estrategia de retención | **Nunca producida** | Activación, hábito, churn, referidos | P2 | L | LFT-305 | Fundador | Plan con métricas objetivo propias | Post-lanzamiento |
| LFT-053 | Marca | Declaración de posicionamiento | **Nunca producida** | Statement y propuesta de valor | P2 | M | LFT-001 | Fundador | Una frase que no sea "la mejor app de fitness" | Post-lanzamiento |
| LFT-500 | Producto | Offline Sprint 2 y 3 | Cache de lectura y pulido PWA | Continuar el roadmap offline | P2 | L | — | Ingeniería | Sesión abre sin red | Post-lanzamiento |
| LFT-501 | Deuda | `BlockDetail.tsx` 2,381 líneas | Concentra demasiada responsabilidad | Separar por modo de bloque | P2 | L | — | Ingeniería | Ningún archivo de componente >800 líneas | Post-lanzamiento |
| LFT-502 | Seguridad | Documentos en historial de git | 8 MB estuvieron públicos unas horas | Decidir si se reescribe historial | P3 | M | — | Fundador | Decisión registrada | Post-lanzamiento |
| LFT-503 | Producto | Wearables | `wearable_data` vacía | Integrar tras validar demanda | P3 | XL | — | Ingeniería | — | Futuro |
| LFT-504 | Producto | Comunidad y retos | No existe | Evaluar tras validar entrenamiento en solitario | P3 | XL | LFT-052 | Fundador | — | Futuro |

---

## 6.5 · CONVENCIÓN DE NOMBRES

Decidida el 2026-10-23 a partir de lo que ya domina en el catálogo, no inventada.

**Forma:** `[Equipo] [Posición/Modificador] [Movimiento] [Variación]`
→ `Barbell Back-Rack Bulgarian Split Squat`, `Half-Kneeling KB Snatch + Windmill`

**Reglas**

1. **Los compuestos van con guión.** `Pull-up`, `Push-up`, `Step-up`, `Chin-up`, `Sit-up`.
   Era la forma dominante (6 de 7 fichas de dominada) y `Pull Up` era la excepción.
2. **No se escribe "Bodyweight" cuando esa es la versión por defecto.** Una dominada es
   con peso corporal salvo que diga lo contrario; la cargada se llama `Weighted Pull-up`.
   Sí se usa cuando distingue de verdad: `Bodyweight Reverse Nordic` frente al lastrado.
3. **El implemento va al frente cuando cambia el ejercicio**, no cuando es incidental.
   `Barbell Bench Press` sí, porque existe la versión con mancuerna.
4. **Pendiente (D11):** `DB`/`Dumbbell` está 31 a 26 y `KB`/`Kettlebell` 29 a 15.
   Hay que elegir uno y renombrar. No urge: no rompe nada, sólo se ve descuidado.

**Fusiones aplicadas bajo esta convención**

| Se queda | Se retira | Por qué |
|---|---|---|
| `Pull-up` | `Bodyweight Pull-up` | 80 sets contra 28, y "Bodyweight" sobra |
| `Barbell Bench Press` | `Bench Press` | 189 sets contra 0, y el otro no tenía video |

Una ficha fusionada **nunca se borra**: queda `is_active = false` con `merged_into`
apuntando a la buena, para que el historial del atleta siga resolviendo.

---

## 7 · ESQUEMA PROPUESTO

Aditivo. No cambia IDs, no borra historial.

```sql
-- 1 · relaciones tipadas (lo más urgente, LFT-105)
CREATE TABLE exercise_relations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_exercise_id uuid NOT NULL REFERENCES exercises(id),
  to_exercise_id   uuid NOT NULL REFERENCES exercises(id),
  relation_type    text NOT NULL CHECK (relation_type IN
                     ('regression','progression','equipment_swap',
                      'equivalent','unilateral_variant')),
  bidirectional    boolean NOT NULL DEFAULT false,
  rank             smallint NOT NULL DEFAULT 1,
  requires_review  boolean NOT NULL DEFAULT true,
  approved_by      uuid,
  approved_at      timestamptz,
  rationale        text,
  UNIQUE (from_exercise_id, to_exercise_id, relation_type)
);

-- 2 · vocabularios controlados (LFT-101, LFT-102, LFT-111)
CREATE TABLE equipment       (code text PRIMARY KEY, label_es text, label_en text,
                              family text, is_machine boolean DEFAULT false);
CREATE TABLE equipment_alias (alias text PRIMARY KEY, canonical_code text REFERENCES equipment(code));
CREATE TABLE muscles         (code text PRIMARY KEY, label_es text, region text);
CREATE TABLE muscle_alias    (alias text PRIMARY KEY, canonical_code text REFERENCES muscles(code));

CREATE TABLE block_types (
  code                  text PRIMARY KEY,   -- PRIME, POWER, HEAVY, BUILD, CORE, POLISH, RECOVERY…
  label_es              text NOT NULL,
  session_position      smallint NOT NULL,  -- 0 abre … 100 cierra
  default_rep_min       smallint,
  default_rep_max       smallint,
  default_rpe_min       numeric(3,1),
  default_rpe_max       numeric(3,1),
  default_rest_seconds  smallint,
  uses_tempo            boolean DEFAULT false
);

-- 3 · campos nuevos del ejercicio (LFT-109)
ALTER TABLE exercises
  ADD COLUMN loading_type     text,      -- bodyweight | external | assisted | timed
  ADD COLUMN stability_demand smallint,  -- 1-5
  ADD COLUMN technical_demand smallint,  -- 1-5, distinto de difficulty
  ADD COLUMN suitable_for     jsonb,     -- {strength:0-3, hypertrophy, mobility, conditioning, power}
  ADD COLUMN rep_range_min    smallint,
  ADD COLUMN rep_range_max    smallint,
  ADD COLUMN is_canonical     boolean NOT NULL DEFAULT true,
  ADD COLUMN merged_into      uuid REFERENCES exercises(id);
```

**Semilla de `block_types`** — medida de las 180 sesiones de BUILD HIM ELITE:

| code | posición | reps | RPE | descanso | tempo |
|---|---|---|---|---|---|
| PRIME | 0 | 8 | — | 8s | no |
| POWER | 20 | 2 | 7.8 | 9s | no |
| HEAVY | 25 | 6 | 8.15 | 116s | **sí** |
| BUILD | 55 | 12 | 8.22 | 54s | a veces |
| CORE | 75 | 11 | 8.09 | 34s | no |
| POLISH | 70 | 14 | 8.57 | 25s | no |
| RECOVERY | 100 | 1 | — | 0s | no |

---

## 8 · MAPA DE DEPENDENCIAS

**Camino crítico** — todo lo demás puede moverse; esto no.

```
LFT-100 ─────────────────────────────────────────────► (independiente, hacer ya)
LFT-302 ─────────────────────────────────────────────► (independiente, hacer ya)
LFT-114 ─────────────────────────────────────────────► (independiente, hacer ya)

LFT-001 ──► LFT-002 ──► LFT-202 ──► LFT-201 ──► LFT-309
  (decisión)              (asignación)   (principiante)  (sin calendario vacío)

LFT-004 ──► LFT-101 ──► LFT-103 ──► LFT-106 ──┐
              │                                ├──► LFT-107 ──┐
              └──────────────► LFT-105 ────────┘              ├──► LANZAR
                                 │                            │
                                 └──► LFT-108 ────────────────┘
                                        │
LFT-003 ──────────────► LFT-200 ────────┘

LFT-005 ──► LFT-300 ──► LFT-301 ─────────────────────► LANZAR
```

**Trabajo en paralelo, sin bloqueos**

| Pista | Ítems | Por qué no bloquea |
|---|---|---|
| Seguridad | LFT-100, LFT-302 | No tocan datos de entrenamiento |
| Media | LFT-204 | Transcodificar es independiente del esquema |
| Pagos | LFT-005, LFT-300, LFT-301 | No depende de la base de ejercicios |
| Analítica | LFT-305 | Instrumentar es independiente |
| Calidad | LFT-303, LFT-304, LFT-307 | Deuda aislada |

**Decisiones que bloquean código**

| Decisión | Bloquea |
|---|---|
| D1 Modelo de programa | LFT-002, LFT-201, LFT-202, LFT-309 |
| D2 Taxonomía | LFT-101, LFT-105, LFT-109, LFT-111 |
| D3 Alcance de personalización | LFT-200, LFT-107, LFT-108 |
| D5 Precio | LFT-300, LFT-301 |

---

## 9 · ALCANCE DE LANZAMIENTO

### MUST HAVE — sin esto no se lanza

| ID | Por qué es innegociable |
|---|---|
| LFT-100 | Tu metodología es el producto y hoy se lee gratis |
| LFT-302 | El service role key no puede llegar a GitHub |
| LFT-114 | No se puede exponer un mesociclo sin terminar |
| LFT-001, LFT-002 | Todo lo de producto depende de esta decisión |
| LFT-101, LFT-103 | Causa raíz de los duplicados; bloquea el filtrado por equipo |
| LFT-105, LFT-106 | Sin relaciones tipadas no hay personalización honesta |
| LFT-107, LFT-108 | Prometer adaptación por nivel y equipo sin esto es vender algo que no existe |
| LFT-200, LFT-201, LFT-202 | Preguntar el nivel y tirarlo a la basura es un defecto, no una carencia |
| LFT-204 | Un video de 48 MB en el gimnasio es un video que nadie ve |
| LFT-300, LFT-301 | Cobrar sin haber probado el cobro es inaceptable |
| LFT-305 | Lanzar sin medir es lanzar a ciegas |
| LFT-309 | Nadie debe llegar a un calendario vacío |

### SHOULD HAVE — si no retrasa

LFT-102, LFT-104, LFT-109, LFT-111, LFT-112, LFT-113, LFT-203, LFT-303, LFT-304, LFT-306, LFT-307

### CAN WAIT — después del lanzamiento

LFT-110, LFT-205, LFT-206, LFT-207, LFT-208, LFT-308, LFT-400, LFT-401, LFT-403, LFT-410, LFT-500, LFT-501, LFT-050, LFT-052, LFT-053

### FUTURE — no debe distraer

LFT-404 a LFT-409 (Coach Studio completo), LFT-051, LFT-502, LFT-503, LFT-504

> **Propuestas que retrasan el lanzamiento sin justificarlo, y por qué las rechazo:**
> construir tres arcos completos de 30 semanas (el Modelo C lo vuelve innecesario);
> el Coach Studio antes de tener suscriptores (multiplica a un coach sin clientes);
> wearables y comunidad (ninguna validada); rediseño visual completo (la app ya se ve bien,
> lo que falla es lo que hay debajo).

---

## 10 · PLAN POR SPRINTS

Sin fechas: no hay fecha de lanzamiento ni capacidad de desarrollo acordadas.
Secuencia relativa. Cada sprint deja algo demostrable.

### Sprint 1 — Tapar los agujeros y decidir
**Objetivo:** cerrar lo que sangra hoy y desbloquear todo lo demás.

| ID | Tarea |
|---|---|
| LFT-100 | Políticas RLS sobre plantillas |
| LFT-302 | Sacar `.env` del control de versiones |
| LFT-114 | Unificar `status` / `is_selectable` |
| LFT-001 → LFT-005 | Las cinco decisiones del fundador |

**Decisiones requeridas:** D1 a D5 (§16) — es el entregable principal del sprint.
**Pruebas:** cliente anónimo devuelve 0 filas; usuario autenticado sin cambios; `git ls-files .env` vacío.
**Resultado:** la metodología deja de ser pública y el equipo sabe qué construir.

### Sprint 2 — Vocabularios y duplicados
**Objetivo:** que los campos de clasificación dejen de ser texto libre.

| ID | Tarea |
|---|---|
| LFT-101 | `equipment` + `equipment_alias`, migrar 474 |
| LFT-102 | `muscles` + `muscle_alias` |
| LFT-304 | Llaves duplicadas en `muscleGroups.ts` |
| LFT-103 | Resolver los 7 duplicados exactos |
| LFT-104 | Revisar las 8 familias dudosas |

**Decisiones requeridas:** cuáles de las 8 familias son el mismo ejercicio.
**Pruebas:** 0 valores fuera de catálogo; backup previo; historial de `workout_sets` intacto.
**Resultado:** se puede filtrar por equipo sin fallos silenciosos.

### Sprint 3 — Relaciones tipadas
**Objetivo:** que el sistema pueda decir "sube".

| ID | Tarea |
|---|---|
| LFT-105 | `exercise_relations` + migrar las 168 |
| LFT-106 | Poblar `movement_plane` en los 346 en uso |
| LFT-109 | Campos nuevos del ejercicio |
| LFT-403 | Extender la cola de aprobación |

**Pruebas:** una progresión se inserta y se lee; el `SwapButton` sigue funcionando con la tabla nueva.
**Resultado:** la base soporta personalización real.

### Sprint 4 — Llenar las relaciones
**Objetivo:** que un principiante sin gimnasio pueda entrenar.

| ID | Tarea |
|---|---|
| LFT-107 | 98 regresiones a principiante |
| LFT-108 | 72 alternativas sin gimnasio |

**Decisiones requeridas:** aprobación en lote de los candidatos. Es el sprint con más trabajo de coach.
**Pruebas:** ningún ejercicio programado sin ruta, o marcado explícitamente como irreducible.
**Resultado:** las dos dimensiones de personalización ya tienen datos detrás.

### Sprint 5 — Arquitectura unificada y onboarding
**Objetivo:** que el producto use lo que acabamos de construir.

| ID | Tarea |
|---|---|
| LFT-202 | Reescribir `assignProgram` sobre el Modelo C |
| LFT-201 | Ruta real de principiante |
| LFT-200 | Onboarding pregunta equipo y días |
| LFT-309 | Verificar que nadie se queda sin contenido |
| LFT-111 | `block_types` controlado |

**Pruebas:** cuatro perfiles de prueba (principiante en casa, intermedio en gym, avanzado en casa, avanzado en gym) reciben programación coherente y completa.
**Resultado:** LIFTORY cumple lo que promete el onboarding.

### Sprint 6 — Listo para cobrar
**Objetivo:** que el negocio funcione.

| ID | Tarea |
|---|---|
| LFT-300 | Stripe end-to-end en modo test |
| LFT-301 | Acceso derivado del estado real |
| LFT-305 | Instrumentar las métricas de lanzamiento |
| LFT-204 | Transcodificar los 117 videos |
| LFT-307 | Verificar correos |
| LFT-306 | Rendimiento en celular real |

**Pruebas:** ciclo completo de suscripción; cancelar en Stripe quita acceso; ningún video >5 MB.
**Resultado:** **listo para lanzar.**

### Sprint 7 en adelante
LFT-203 (vocabulario), LFT-205 (video), LFT-207 (badges), LFT-400/401 (admin),
LFT-500 (offline), LFT-052 (retención). El Coach Studio empieza cuando haya suscriptores.

---

## 11 · REGISTRO DE DECISIONES DEL FUNDADOR

Ninguna está aprobada. Todas bloquean trabajo.

### D1 — Arquitectura de programa · ✅ **DECIDIDO 2026-10-23: Modelo C**

**Opciones**
- **A** · Mantener los cuatro programas.
- **B** · Un método único sin tracks.
- **C** · Motor único con tracks por objetivo. ← **ELEGIDA POR ANDONI**

**Evidencia:** los cuatro programas ya comparten vocabulario de bloques, así que el método
único ya existe de hecho. SCULPT HER ELITE y FOUNDATION divergen 4.7%: son el mismo programa.
La diferencia BUILD HIM / SCULPT HER (22–26%) es pull+push vs core+hinge — un estereotipo
de género, no un objetivo de entrenamiento.

**Trade-off:** C exige migrar la asignación y puede incomodar a usuarios que eligieron por marca.
A no cuesta nada hoy y cuesta cuatro veces más cada mesociclo futuro.

**Bloquea:** LFT-002, LFT-201, LFT-202, LFT-309.

### D2 — Taxonomía de ejercicios · **BLOQUEA 4 ÍTEMS** · estado: `pendiente`

**Opciones:** adoptar el esquema de §7 · adoptarlo con ajustes · proponer otro.
**Evidencia:** 59 valores de equipo, 103 de músculo, 57 etiquetas de bloque, todo texto libre.
**Trade-off:** es trabajo de migración sin beneficio visible para el usuario. Es el precio de que todo lo demás funcione.
**Bloquea:** LFT-101, LFT-105, LFT-109, LFT-111.

### D3 — Personalización en v1 · ✅ **DECIDIDO 2026-10-23: las cuatro dimensiones**

**Opciones**
- Sólo nivel.
- **Nivel + equipo.** ← recomendada por Claude
- **Nivel + equipo + días + duración.** ← **ELEGIDA POR ANDONI**

**Evidencia:** nivel y equipo son tu prioridad declarada. Días y duración multiplican
la superficie de prueba sin evidencia de que los usuarios los pidan.
**Trade-off aceptado:** días y duración exigen decidir qué se recorta cuando alguien entrena 3 días
en vez de 6, o tiene 45 minutos en vez de 70. Eso es criterio de entrenador, no ingeniería, y va a
necesitar una sesión tuya (queda como **D10**). Para que no retrase el lanzamiento se construye en
dos tiempos: nivel y equipo primero (bloquean el lanzamiento), días y duración después, sobre la
misma arquitectura.
**Bloquea:** LFT-200, LFT-107, LFT-108.

### D4 — IA antes o después del lanzamiento · estado: `pendiente`

**Opciones:** Coach Studio antes de lanzar · **después** ← recomendada · nada de IA por ahora.
**Evidencia:** las fases 0–2 también desbloquean el lanzamiento; las 3–5 no. Un motor que
multiplica a un coach sin clientes multiplica por cero.
**Trade-off:** Andoni sigue escribiendo mesociclos a mano unos meses más.

### D5 — Precio y modelo de cobro · **BLOQUEA 2 ÍTEMS** · estado: `pendiente`

**Opciones:** mantener $699 MXN · ajustar · cambiar la estructura (prueba gratis, anual, founder).
**Evidencia:** ~USD $38 está arriba de Ladder PRO ($29.99) y Centr ($29.99), cerca de
Ladder ELITE ($44.99) que incluye coach 1:1. En México, Smart Fit cuesta $299–699.
**Recomendación:** no bajar el precio; cerrar la brecha de valor con las fases 0–2.
**Bloquea:** LFT-300, LFT-301.

### D12 — Russian Baby Maker: ¿qué movimiento es? · estado: `pendiente` · nace de LFT-120
El nombre viene de Catalyst Athletics, donde es un estiramiento de **aductores e ingle**:
pies más abiertos que la sentadilla, torso inclinado, codos presionando la cara interna de
los muslos, sentadilla **parcial**, y advierte explícitamente de no hundirse en sentadilla
profunda. La ficha de LIFTORY describe otra cosa: sentadilla profunda → extender rodillas →
estiramiento de isquios, con `primary_muscles = hamstrings, hip_flexors`.

Las dos versiones existen en el mundo real. Pero la ficha actual se solapa con
`Elephant Walk Stretch` (isquios, pantorrillas) y no toca aductores, que es el punto del
original. Hay que decidir: o se corrige la descripción al original y se añade `adductors`,
o se renombra para que el nombre no prometa lo que no hace.

### D10 — Qué se recorta al entrenar menos días o menos tiempo · estado: `pendiente` · nace de D3
Si alguien entrena 3 días, ¿qué sesiones sobreviven y cuáles se fusionan? Si tiene 45 minutos,
¿qué bloque se sacrifica primero? Hoy existe `short_on_time_note` en los workouts, así que hay
un punto de partida. Decisión de entrenador. **No bloquea el lanzamiento** si se construye después
de nivel y equipo.

### D6 — Las tres anomalías de programación · estado: `pendiente`
M5 semana 5 promedia RPE 9.94 · M5 tiene volumen plano W1–W5 · M3 baja en W3.
Decisión de entrenador. Bloquea codificar las reglas (LFT-112).

### D7 — Las 8 familias de casi-duplicados · estado: `pendiente`
`Pull Up` / `Bodyweight Pull-up`, `Bench Press` / `Barbell Bench Press`, etc.
Sólo tú sabes si son variantes legítimas. Bloquea LFT-104.

### D8 — Marca Build Him / Sculpt Her · estado: `pendiente`
**Recomendación:** conservar como marca y colección editorial; retirar como arquitectura.

### D9 — Reescribir el historial de git · estado: `pendiente`
8 MB de documentos internos estuvieron públicos unas horas y siguen en el historial.
Si el repo es privado, no importa. No pude verificar la visibilidad (`gh` sin autenticar).

---

## 12 · REGISTRO DE RIESGOS

| ID | Riesgo | Prob. | Sev. | Mitigación | Señal temprana | Ítems |
|---|---|---|---|---|---|---|
| R1 | La migración de vocabularios corrompe datos | Media | **Alta** | Backup previo, migración aditiva, alias en vez de reemplazo, validación antes de commit | Conteos que no cuadran tras migrar | LFT-101, LFT-102 |
| R2 | Fusionar duplicados rompe historial | Media | **Alta** | Nunca borrar: `is_canonical` + `merged_into`; IDs intactos | Un `workout_set` apunta a nada | LFT-103 |
| R3 | LFT-107/108 consumen más tiempo de coach del previsto | **Alta** | Media | Generar candidatos por familia y aprobar en lote; aceptar "irreducible" como respuesta | Ritmo de aprobación bajo en la primera semana | LFT-107, LFT-108 |
| R4 | Stripe falla en producción pese a pasar en test | Media | **Alta** | Webhook idempotente, reconciliación manual el primer mes, alertas en fallo de cobro | Discrepancia entre Stripe y `subscriptions` | LFT-300, LFT-301 |
| R5 | El Modelo C molesta a usuarios actuales | Baja | Media | Conservar la marca; migrar sin cambiar lo ya agendado | Quejas tras migrar | LFT-202 |
| R6 | La IA propone programación mala y erosiona confianza | Media | **Alta** | Sólo IDs de catálogo filtrado, esquema estricto, validador que marca, aprobación obligatoria | Tasa de edición alta en las primeras propuestas | LFT-405, LFT-406 |
| R7 | Carga de trabajo del fundador insostenible | **Alta** | **Alta** | Secuenciar las decisiones; no pedir 9 decisiones a la vez; lotes de aprobación | Sprints que se alargan esperando decisiones | Todo |
| R8 | Se lanza sin medir y no se sabe qué falla | Media | **Alta** | LFT-305 es MUST HAVE | Primer usuario real sin eventos registrados | LFT-305 |
| R9 | Activación catastrófica: 10 de 13 usuarios nunca entrenaron | **Desconocida** | **Alta** | Confirmar cuáles son cuentas de prueba antes de concluir nada | — | LFT-305 |
| R10 | Construir la base retrasa tanto que el impulso se pierde | Media | Media | Sprints con entregable demostrable; lanzar al terminar el 6 | Tres sprints sin nada visible | Todo |

---

## 13 · MÉTRICAS

### Necesarias al lanzar

| Métrica | Definición | Instrumentación |
|---|---|---|
| Onboarding completado | % que llega a tener programa activo | Evento `onboarding_completed` |
| Primer entrenamiento | % que completa 1 sesión en 7 días | `workouts.is_completed` + fecha de alta |
| Atletas activos semanales | Usuarios únicos con ≥1 sesión completada por semana | Agregado de `workouts` |
| Adherencia | Sesiones completadas ÷ sesiones agendadas | Ya calculable |
| Conversión prueba → pago | % que paga tras la prueba | `subscriptions` tras LFT-300 |
| Churn mensual | Cancelaciones ÷ suscriptores activos | Webhook de Stripe |

### Después de features avanzadas

Retención a 4 y 8 semanas · Mesociclos completados · Éxito de sustitución
(% de swaps que no se revierten) · Fricción de registro (tiempo por set) ·
Tasa de aceptación de mesociclos generados · Tiempo de edición del coach ·
Horas de programación ahorradas.

> **Advertencia sobre benchmarks externos:** los números que circulan (retención día 30
> de 3–12%, churn 7–10% mensual) vienen de blogs de vendors que se citan entre sí y varios
> trazan a datos de 2023. No fijes metas con ellos. Tus propios números serán el único
> benchmark útil.

---

## 14 · CHECKLIST DE LANZAMIENTO

```
SEGURIDAD
  [ ] LFT-100  Anónimo no lee plantillas
  [ ] LFT-302  .env fuera del control de versiones
  [ ] RLS verificada tabla por tabla con cliente anónimo

DATOS
  [ ] LFT-101  Vocabulario de equipo canónico
  [ ] LFT-103  7 duplicados resueltos sin romper historial
  [ ] LFT-105  Relaciones tipadas en producción
  [ ] LFT-106  movement_plane al 100% en los programados
  [ ] LFT-107  Toda ruta a principiante existe o está marcada irreducible
  [ ] LFT-108  Toda alternativa sin gimnasio existe o está marcada irreducible
  [ ] Backup verificado antes de cada migración

PRODUCTO
  [ ] LFT-200  Onboarding pregunta equipo y días de verdad
  [ ] LFT-201  Un principiante recibe contenido de principiante
  [ ] LFT-202  El género ya no decide selección de ejercicios
  [ ] LFT-309  Ningún perfil llega a calendario vacío
  [ ] LFT-204  Ningún video supera 5 MB
  [ ] 4 perfiles de prueba entrenan una semana completa sin hueco

NEGOCIO
  [ ] LFT-300  Ciclo completo de Stripe probado
  [ ] LFT-301  Cancelar en Stripe quita el acceso
  [ ] LFT-307  Correos verificados
  [ ] LFT-305  Las 6 métricas de lanzamiento registran

CALIDAD
  [ ] LFT-306  Sesión abre en <3 s en 4G gama media
  [ ] LFT-114  Imposible exponer un mesociclo sin aprobar
  [ ] tsc limpio en onboarding, workout y pago
```

---

## 15 · QUÉ HACEMOS AHORA — LAS 10 ACCIONES

En orden exacto de ejecución.

**1 · Cerrar RLS en las plantillas** — `LFT-100`
Tu metodología se lee hoy sin pagar y sin registrarse. Dos políticas, horas de trabajo.
Desbloquea: poder hablar del producto sin regalarlo. No depende de nada.
*Terminado cuando:* un cliente anónimo devuelve 0 filas de `workouts` y `workout_sets`, y un usuario con sesión sigue viendo lo suyo.

**2 · Sacar `.env` del control de versiones** — `LFT-302`
Está rastreado pese al `.gitignore`. El próximo `git add -A` sube el service role key.
Requiere antes: confirmar que Vercel tiene las variables.
*Terminado cuando:* `git ls-files .env` sale vacío y el build de Vercel sigue pasando.

**3 · Decidir el modelo de programa** — `LFT-001` / `D1`
Es la decisión que más trabajo desbloquea y la única que no puedo tomar yo.
Desbloquea: LFT-002, LFT-201, LFT-202, LFT-309 — todo el producto.
*Terminado cuando:* la decisión está escrita en §16 con fecha.

**4 · Aprobar la taxonomía** — `LFT-004` / `D2`
Sin vocabularios controlados, nada posterior es confiable.
*Terminado cuando:* el esquema de §7 está aprobado o ajustado.

**5 · Vocabulario de equipo canónico** — `LFT-101`
59 valores con sinónimos. Causa raíz de los duplicados y de que el filtrado por equipo falle.
Requiere antes: acción 4.
*Terminado cuando:* 0 valores fuera del catálogo y los pares `band`/`resistance_band`, `cable`/`cable_machine`, `rack`/`squat_rack` resueltos.

**6 · Resolver los 7 duplicados exactos** — `LFT-103`
`High Hang Power Clean` ×2 con video en ambos. `Goblet Squat` ×2 con equipo idéntico.
Requiere antes: acción 5.
*Terminado cuando:* los 7 grupos tienen canónico marcado y el historial de `workout_sets` quedó intacto.

**7 · Relaciones tipadas** — `LFT-105`
Hoy es imposible expresar una progresión. Es el bloqueador técnico de toda la personalización.
Requiere antes: acción 4.
*Terminado cuando:* una progresión se inserta y se lee, y las 168 filas quedaron migradas con su tipo correcto.

**8 · Poblar `movement_plane`** — `LFT-106`
27% de relleno. Es el filtro que impide sustituciones malas.
Requiere antes: acción 5.
*Terminado cuando:* los 346 ejercicios programados tienen plano.

**9 · Llenar las relaciones faltantes** — `LFT-107` + `LFT-108`
98 regresiones y 72 alternativas sin gimnasio. El sprint más pesado y el que convierte a
LIFTORY en lo que dice ser.
Requiere antes: acciones 7 y 8.
*Terminado cuando:* todo ejercicio programado tiene ruta por nivel y por equipo, o está marcado explícitamente como irreducible.

**10 · Onboarding y asignación reales** — `LFT-200` + `LFT-201` + `LFT-202`
Preguntar el nivel y reescribirlo a "intermediate" es un defecto, no una carencia.
Requiere antes: acciones 3 y 9.
*Terminado cuando:* cuatro perfiles de prueba reciben una semana completa de programación coherente.

---

### LA ACCIÓN MÁS IMPORTANTE

> ## Cerrar RLS en las plantillas — `LFT-100`

No es la más ambiciosa. Es la primera por tres razones:

**No depende de ninguna decisión tuya.** Las otras nueve esperan a que decidas el modelo de
programa o la taxonomía. Ésta se puede hacer hoy.

**Es la más barata.** Dos políticas de RLS. Horas, no semanas.

**Protege lo único que no se puede recuperar.** Dijiste que el usuario no compra rutinas:
compra tu sistema. Ese sistema —336 sesiones, 9,014 series, con tus cues de entrenador—
está disponible gratis para quien sepa dónde mirar. Cada día que pasa es un día más en que
cualquiera puede llevárselo, y eso no se deshace cerrando la puerta después.

Las otras nueve construyen el producto. Ésta evita que el producto deje de ser tuyo
mientras lo construimos.

---

## 16 · LOG DE DECISIONES

| Fecha | Decisión | Resultado |
|---|---|---|
| 2026-10-22 | Documento creado | v1.0 pendiente de aprobación |
| 2026-10-23 | Punto de regreso v1.0 establecido | Tag `v1.0-pre-2.0` + snapshot de 47,405 filas, restauración probada end-to-end |
| 2026-10-23 | LFT-100 ejecutado y aprobado por Andoni | Plantillas cerradas a usuarios autenticados. Gating por suscripción queda para LFT-301 |
| 2026-10-23 | LFT-302 cambió de enfoque | No se desrastrea `.env`: las 4 `VITE_*` ya viajan públicas en el bundle, así que tenerlas en git no filtra nada y quitarlas podía romper el build de Vercel. Se separó sólo el secreto a `.env.local` |
| 2026-10-23 | LFT-114 · premisa descartada | "4 mesociclos sin terminar expuestos" era falso: los 8 están completos (36 sesiones, 6 descansos, 0 huecos). El `draft` era etiqueta vieja. Su daño real era bloquear `handleNewCycle` en el admin |
| 2026-10-23 | **D1 · Modelo C** | Un motor con tracks por objetivo. El género deja de decidir la selección de ejercicios; Build Him y Sculpt Her quedan como marca |
| 2026-10-23 | LFT-106 · premisa descartada | "movement_plane al 27%" estaba mal medido: el campo tiene un CHECK que sólo admite vertical/horizontal y su comentario dice que NULL es correcto en squat, hinge, core y movilidad. Sobre push/pull — su alcance real — ya estaba al 97%. Al intentar "poblarlo" se escribió plano en 8 ejercicios de pierna (la regla capturó "Leg Curl" por la palabra curl); revertidos el mismo día |
| 2026-10-23 | LFT-105 · tabla nueva descartada | El blueprint (§7) proponía crear `exercise_relations`. Se evolucionó la tabla existente: la leen 8 puntos del código, dos con joins que citan el nombre de la llave foránea. Una tabla paralela dejaría dos fuentes de verdad — el mismo error que causó el desastre del vocabulario de equipo. Queda deuda cosmética: el nombre `exercise_substitutions` ya no describe lo que guarda |
| 2026-10-23 | **D3 · Las cuatro dimensiones** | Andoni eligió nivel + equipo + días + duración, por encima de la recomendación de limitarlo a dos. Se construye en dos tiempos para no retrasar el lanzamiento. Abre D10 |
| 2026-10-23 | LFT-115 añadido y resuelto | El ciclo `live` llevaba 180 días vencido en los 4 programas. No se cambió el `status` de los `live`: assignProgram lo usa para decidir cuántos workouts copiar, y tocarlo era un cambio de comportamiento no acordado |

## 17 · CHANGE LOG

| Fecha | Versión | Cambio |
|---|---|---|
| 2026-10-22 | 1.0 | Consolidación de la auditoría de producto y la capa de inteligencia |
| 2026-10-23 | 1.1 | Red de seguridad verificada (snapshot + restore probados). LFT-100 completado. |
| 2026-10-23 | 1.2 | LFT-302 completado. Se descartó `git rm --cached .env`: habría arriesgado el build de Vercel sin necesidad. |
| 2026-10-23 | 1.3 | LFT-114 completado. Su premisa era falsa (nada estaba a medio construir) pero destapó LFT-115, un P0 que no estaba en el plan. |
| 2026-10-23 | 1.4 | D1 y D3 decididas. Sprint 1 cerrado. Arranca Sprint 2. |
| 2026-10-23 | 1.5 | LFT-101 completado. El admin deja de tener su propia lista de equipo. |
| 2026-10-23 | 1.6 | LFT-116 y LFT-117 completados a petición de Andoni (revisión de nivel de los 474). |
| 2026-10-23 | 1.7 | Convención de nombres fijada (§6.5). Primeras dos fusiones de duplicados. |
| 2026-10-23 | 1.8 | LFT-102 y LFT-304 completados. Sprint 2 cerrado salvo las familias dudosas (D7). |
| 2026-10-23 | 1.9 | LFT-105 completado. El selector de ejercicios ya sabe subir, no sólo bajar. |
| 2026-10-23 | 2.0 | LFT-106 cerrado: su premisa era falsa. Nace LFT-118, que es el arreglo de verdad. |
| 2026-10-23 | 2.1 | LFT-119 completado. Nace LFT-120: verificación externa por tandas. |

## 18 · COMPLETADO EN ESTA SESIÓN

| Qué | Dónde |
|---|---|
| **LFT-100** · Plantillas cerradas a anónimos | `20261023110000_lft100_close_template_rls.sql` |
| **LFT-302** · Secretos fuera del archivo rastreado | `.env.local` + `scripts/_lib-env.mjs` |
| **LFT-114** · Etiquetas de mesociclo corregidas + guardia | `20261023120000_lft114_mesocycle_status.sql` |
| **LFT-115** · Ciclo vencido ya no agenda en el pasado | `assignProgram.ts`, `Onboarding.tsx` |
| **LFT-101** · Vocabulario de equipo canónico, 59 → 46 | `20261023130000_lft101_equipment_vocabulary.sql` |
| **LFT-116** · Nivel revisado en los 474, con rúbrica escrita | `scripts/review-difficulty.mjs` |
| **LFT-117** · Seis fichas con equipo imposible, corregidas | base de datos |
| **LFT-103 (parcial)** · `Pull-up` y `Barbell Bench Press` fusionados | `20261023140000_merged_into.sql` |
| **LFT-102** · Vocabulario de músculos, 103 → 33 | `20261023150000_lft102_muscle_vocabulary.sql` |
| **LFT-304** · Llaves duplicadas eliminadas | `src/utils/muscleGroups.ts` |
| **LFT-105** · Relaciones tipadas + 121 progresiones generadas | `20261023160000_lft105_typed_relations.sql` |
| **LFT-105** · El selector etiqueta la dirección y ofrece el escalón más cercano | `SwapBottomSheet.tsx` |
| **LFT-119** · Auditoría de coherencia de las 467 fichas | `scripts/auditar-fichas.mjs` |
| `rls_report()` + `scripts/rls-check.mjs` para auditar políticas reales | migración + script |
| Respaldo y restauración verificados | `scripts/snapshot.mjs`, `scripts/restore.mjs` |
| `start_mesocycle` arranca hoy, no "el próximo lunes" | `20261019180000_start_mesocycle_today.sql` |
| Borrado asimétrico que dejaba `workout_sets` huérfanos | misma migración |
| Indicador de mesociclo y semana en el Home | `Home.tsx`, `useNavigableHome.ts` |
| `SwapButton` en los 6 modos de bloque | `SwapButton.tsx` + timers |
| Orden de lookup del swap corregido (se puede volver a subir) | `SwapButton.tsx`, `BlockDetail.tsx` |
| Selector de mesociclos con stats medidas | `MesocyclePicker.tsx` |
| RPE de M5 corregido en la copy: decía 8.58, es 8.87 | base de datos |
| 33 documentos internos sacados de `public/` | `docs/` |

## 19 · BLOQUEADORES ABIERTOS

| Bloqueador | Bloquea | Quién lo resuelve |
|---|---|---|
| D2 (taxonomía) sin decidir formalmente | LFT-101, 105, 109, 111 | Se avanza con la propuesta de §7; Andoni puede vetar |
| D5 (precio) sin decidir | LFT-300, LFT-301 | Fundador · no urge hasta Sprint 6 |
| Visibilidad del repo desconocida | D9 | Fundador |
| No se sabe qué usuarios son de prueba | R9, métricas base | Fundador |

**Sprint actual:** Sprint 3 — Relaciones tipadas. **Siguiente ítem: LFT-120** (verificación externa por tandas) y **LFT-118** (familia de movimiento).

**Pendiente de criterio de Andoni:** quedan 6 familias de casi-duplicados (D7); `Scap Pull-up` / `Scapular Pull-up` es la más clara.
**Estado de lanzamiento:** no listo. 6 de 13 ítems MUST HAVE pendientes. Completados: LFT-100, LFT-302, LFT-114, LFT-115, LFT-101, LFT-102, LFT-116, LFT-117, LFT-304 y la mitad de LFT-103.
