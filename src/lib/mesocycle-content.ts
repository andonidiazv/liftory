/**
 * Mesocycle intro content — hardcoded for MVP launch.
 * Future: migrate to mesocycles.intro_content JSONB column for admin editability.
 */

export interface SplitDay {
  day: string;
  name: string;
  signature: string;
}

export interface FormatExplainer {
  icon: string;
  name: string;
  description: string;
}

export interface DetailedFormat {
  icon: string;
  name: string;
  /** One-liner shown as section header */
  tagline: string;
  /** Plain Spanish explanation — assume reader has never heard this term */
  whatIsIt: string;
  /** Concrete example setup, e.g. "Cluster 3+2 × 4 sets · Bench Press @ 100kg" */
  exampleTitle: string;
  /** Step-by-step walkthrough of executing one set/round. Numbered. */
  walkthrough: string[];
  /** How performance is measured */
  scoring: string;
  /** Why this format is programmed — biomechanics or training rationale */
  whyItWorks: string;
  /** ONE highest-leverage tip */
  topTip: string;
}

export interface MesocycleIntroContent {
  title: string;
  subtitle: string;
  heroDescription: string;
  splitOverview: SplitDay[];
  formats: FormatExplainer[];
  deloadNote: string | null;
  /** Hint shown on Welcome Card pointing to Programa tab */
  programaHint: string;
}

export interface ProgressionStep {
  meso: string;
  phase: string;
  description: string;
  isCurrent?: boolean;
}

export interface MesoPurpose {
  philosophy: string;
  progression: ProgressionStep[];
}

export interface RPELevel {
  score: string;
  rir: string;
  description: string;
}

export interface QualitativeDescriptor {
  name: string;
  description: string;
}

export interface RestGuide {
  blockType: string;
  duration: string;
  note: string;
}

export interface ReadingGuide {
  rpeIntro: string;
  rpeScale: RPELevel[];
  descriptorsIntro: string;
  qualitativeDescriptors: QualitativeDescriptor[];
  restIntro: string;
  restByBlock: RestGuide[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface MesocycleManualContent {
  title: string;
  subtitle: string;
  intro: string;
  purpose: MesoPurpose;
  readingGuide: ReadingGuide;
  formats: DetailedFormat[];
  faq: FAQItem[];
}

/**
 * Closing-card content shown when a meso transition is detected on Home.
 *
 * Copy lives here per-meso; numeric stats come from `getMesocycleStats()` at runtime.
 * Achievement strings may contain `{prCount}` and `{bestStreak}` placeholders that
 * the renderer substitutes — keeps the data shape generic across mesos.
 *
 * Bridge fields (`nextMeso*`) describe what comes after this meso. For the final
 * meso of a program these can be omitted.
 */
export interface MesocycleClosingAchievement {
  title: string;
  body: string;
}

export interface MesocycleClosingContent {
  mesoId: string;
  /** Big quote at the top, e.g. "Construiste la base." */
  hero: string;
  /** Short subline under the hero. */
  heroSubline: string;
  achievements: MesocycleClosingAchievement[];
  nextMesoId?: string;
  nextMesoName?: string;
  nextMesoDescription?: string;
  nextMesoFormats?: string[];
}

export const M2_INTRO_CONTENT: MesocycleIntroContent = {
  title: "Bienvenido a M2",
  subtitle: "M2 · BUILD HIM ELITE · Semana 1",
  heroDescription:
    "M2 sube la apuesta. Misma estructura semanal pero más demanda — clusters, wave loading, metcons, formatos atléticos. 6 semanas para construir un atleta híbrido completo.",
  splitOverview: [
    { day: "LUN", name: "Push Strength", signature: "Bench Press signature" },
    { day: "MAR", name: "Leg Strength", signature: "Back Squat signature" },
    { day: "MIÉ", name: "Pull Strength", signature: "Weighted Pull-up signature" },
    { day: "JUE", name: "Active Recovery", signature: "Zone 2 + Turkish Get-Up" },
    { day: "VIE", name: "Athletic Day", signature: "Trap Bar DL + Power Clean" },
    { day: "SÁB", name: "Hybrid + Metcon", signature: "Power Clean + Metcon semanal" },
    { day: "DOM", name: "Descanso", signature: "Recovery completo" },
  ],
  formats: [
    {
      icon: "⚡",
      name: "Clusters",
      description:
        "Reps divididas con 15 seg de descanso intra-set. Ej: cluster 3+2 = 3 reps → rackeas → 15 seg exactos → 2 reps más. Permite cargar más peso con calidad.",
    },
    {
      icon: "🌊",
      name: "Wave Loading",
      description:
        "3-2-1 reps × 2 ciclos con peso ascendente. El single del Ciclo 2 puede ser tu PR. Realization week (S5) en signature lifts.",
    },
    {
      icon: "⏱️",
      name: "EMOM",
      description:
        "Every Minute On the Minute. Cada minuto haces N reps prescritas, descansas el resto del minuto. Density work + skill bajo presión temporal.",
    },
    {
      icon: "💀",
      name: "Death By",
      description:
        "Min 1 = 1 rep, Min 2 = 2 reps, Min N = N reps. Cada minuto añades 1 rep hasta que no completas en los 60 seg. Score = minuto al que llegaste.",
    },
    {
      icon: "🔥",
      name: "For Time",
      description:
        "Circuito × N rondas lo más rápido posible. Hay un cap máximo. Score = tiempo total. Si llegas al cap sin terminar, ese es tu tope.",
    },
    {
      icon: "📈",
      name: "AMRAP",
      description:
        "As Many Rounds As Possible. Tantas rondas como puedas en X minutos. Score = rondas completas + reps parciales. Ritmo SOSTENIBLE, no ráfaga.",
    },
    {
      icon: "🌪️",
      name: "Tabata",
      description:
        "20 seg on / 10 seg off × 8 rondas = 4 min por movimiento. Burst training puro, máxima intensidad por intervalo.",
    },
    {
      icon: "🏋️",
      name: "Complex (Power Clean)",
      description:
        "Múltiples movimientos en secuencia sin soltar la barra. Ej: 2 Hang Power Clean + 1 Push Press = 1 rep del complex. Skill bajo fatiga.",
    },
  ],
  deloadNote:
    "La Semana 6 es DELOAD — peso ligero, recuperación de CNS antes del próximo meso. NO te la saltes. Es donde el progreso se consolida y el cuerpo se prepara para el siguiente jump.",
  programaHint:
    "Encuentra esta info y ejemplos detallados de cada formato cuando quieras en la pestaña Programa → Manual de M2.",
};

/**
 * Detailed manual content — exhaustive walkthrough of each format.
 * Designed to be readable by an athlete who has NEVER heard these terms.
 * Accessible from Programa tab → "Manual de M2" button.
 */
export const M2_MANUAL_CONTENT: MesocycleManualContent = {
  title: "Manual de M2",
  subtitle: "BUILD HIM ELITE · Mesociclo 2",
  intro:
    "Guía completa de M2. Filosofía del meso, cómo leer tu workout, y ejemplos paso a paso de cada formato. Diseñada para que un atleta nuevo entienda exactamente qué hacer y por qué.",
  purpose: {
    philosophy:
      "M2 es donde la base se convierte en performance. Si M1 te dio el hábito y los kilos limpios, M2 te enseña a moverlos en formatos exigentes — clusters, waves, metcons. El objetivo: que tu fuerza no se quede solo en el rack, que la puedas expresar en cualquier demanda física.",
    progression: [
      {
        meso: "M1",
        phase: "BASE",
        description:
          "Construiste técnica limpia, base de fuerza y el hábito de entrenar 5 días + 1 día de active recovery. Volumen tradicional (3-4 sets × 5-12 reps), Z2 cardio, lifts foundational.",
      },
      {
        meso: "M2",
        phase: "INTENSITY",
        description:
          "Sumas formatos atléticos sobre la base. Aprendes a expresar fuerza bajo distintas demandas — clusters, wave loading, metcons, complexes. Aquí estás.",
        isCurrent: true,
      },
    ],
  },
  readingGuide: {
    rpeIntro:
      "RPE (Rate of Perceived Exertion) es una escala de 1-10 que mide qué tan duro fue un set. Es la forma más confiable de calibrar peso porque se ajusta a cómo te sientes ese día. Junto a cada nivel está el RIR (Reps in Reserve) — cuántas reps te quedan en el tanque.",
    rpeScale: [
      { score: "5-6", rir: "RIR 4+", description: "Fácil. Warmup o recovery." },
      { score: "7", rir: "RIR 3", description: "Exigente pero fluido. 3 reps en el tanque." },
      { score: "8", rir: "RIR 2", description: "Pesado. 2 reps en el tanque. Rango trabajado típico en M2." },
      { score: "9", rir: "RIR 1", description: "Muy pesado. 1 rep en el tanque. Top sets en signature lifts." },
      { score: "10", rir: "RIR 0", description: "Fallo técnico. NO se programa intencionalmente." },
    ],
    descriptorsIntro:
      "Cuando el workout NO especifica RPE/RIR (ej: cardio, recovery, accesorios ligeros), usamos descriptores cualitativos. Tu juicio guía el peso.",
    qualitativeDescriptors: [
      {
        name: "Ligero",
        description: "50-65% del peso máximo. Calentamiento, recovery, técnica. Debes terminar el set sintiendo que pudiste hacer 5+ reps más.",
      },
      {
        name: "Moderado",
        description: "65-80% del peso máximo. Trabajo cardio, accesorios, hipertrofia. Pesado pero sostenible — puedes hablar entrecortado entre sets.",
      },
      {
        name: "Pesado",
        description: "80%+ del peso máximo. Strength work principal. Necesitas concentración total. Descansos largos entre sets (2-3 min).",
      },
    ],
    restIntro:
      "El descanso entre sets NO es un detalle — define la adaptación que estás entrenando. Descansos largos = strength. Descansos cortos = capacidad.",
    restByBlock: [
      {
        blockType: "HEAVY (clusters, waves, signature lifts)",
        duration: "2-3 minutos",
        note: "Tu CNS necesita resetear para mover peso máximo. Si descansas menos, comprometes carga.",
      },
      {
        blockType: "BUILD (hipertrofia, accesorios)",
        duration: "60-90 segundos",
        note: "Densidad metabólica óptima para hipertrofia. Suficiente para recuperar pero mantener pump.",
      },
      {
        blockType: "METCON (AMRAP, FOR TIME, EMOM, etc.)",
        duration: "Cero descanso extra",
        note: "El descanso ES parte del workout — está incorporado en la estructura. NO pares fuera del esquema.",
      },
      {
        blockType: "CORE / FINISHER",
        duration: "30-60 segundos",
        note: "Trabajo localizado de baja demanda neural. Descansos cortos para mantener intensidad.",
      },
    ],
  },
  formats: [
    {
      icon: "⚡",
      name: "Clusters",
      tagline: "Reps divididas con un mini-descanso intra-set",
      whatIsIt:
        "Un cluster es UN set, pero divido internamente en mini-bloques con 15 segundos de descanso entre cada bloque. La idea: mover más peso del que podrías mover en reps consecutivas, sin perder técnica.",
      exampleTitle: "Cluster 3+2 × 4 sets · Bench Press 100 kg",
      walkthrough: [
        "Sacas la barra del rack y haces 3 reps controladas.",
        "Rackeas la barra (la apoyas en el rack, NO la sueltas al piso).",
        "Cuentas 15 segundos exactos — usa cronómetro o app.",
        "Sacas la barra otra vez y haces 2 reps más.",
        "Rackeas. ESO ES UN SET completo (5 reps totales con 1 mini-pausa interna).",
        "Descansas 2-3 minutos completos antes de empezar el siguiente set.",
        "Repites hasta completar los 4 sets prescritos.",
      ],
      scoring:
        "Peso máximo movido con técnica limpia en todos los sets. Anota el peso (no se mide tiempo).",
      whyItWorks:
        "Los 15 segundos resetean parcialmente el sistema neuromuscular sin dejar enfriar al músculo. Resultado: mueves un peso que sería imposible mantener con técnica limpia haciendo 5 reps seguidas.",
      topTip:
        "Los 15 segundos son EXACTOS. Ni 10, ni 20. Si te tardas 25 segundos, ya no es un cluster — es 2 sets pequeños.",
    },
    {
      icon: "🌊",
      name: "Wave Loading",
      tagline: "Series de reps descendentes que se repiten con más peso",
      whatIsIt:
        "Wave loading es una técnica para llegar a tu top single (1 rep máxima) usando un patrón de reps descendente que repites dos veces. El segundo ciclo siempre se hace con más peso que el primero — y es donde sueles hacer tu PR.",
      exampleTitle: "Wave 3-2-1, 3-2-1 × 2 ciclos · Bench Press",
      walkthrough: [
        "Set 1 (Ciclo 1): 3 reps al 80% de tu 1RM.",
        "Set 2 (Ciclo 1): 2 reps al 85% de tu 1RM.",
        "Set 3 (Ciclo 1): 1 rep al 90% de tu 1RM (tu primer single).",
        "Descansa 2-3 minutos.",
        "Set 4 (Ciclo 2): vuelves a 3 reps PERO con MÁS peso que set 1 — al 82.5%.",
        "Set 5 (Ciclo 2): 2 reps al 87.5%.",
        "Set 6 (Ciclo 2): 1 rep al 92.5% — ESTE es tu single más pesado del día.",
      ],
      scoring:
        "El peso del último single (set 6). En la semana de realization (S5), busca acercarte o romper tu PR.",
      whyItWorks:
        "El cuerpo 'recuerda' la activación neural del single anterior y puede mover más peso en el siguiente set de 3. El descenso de reps potencia la performance del set siguiente — fenómeno llamado post-activation potentiation.",
      topTip:
        "NO te apresures entre sets. Necesitas 2-3 minutos completos. Wave loading falla cuando descansas poco.",
    },
    {
      icon: "⏱️",
      name: "EMOM (Every Minute On the Minute)",
      tagline: "Cada minuto haces N reps, descansas el resto del minuto",
      whatIsIt:
        "EMOM es una estructura de descanso forzado. Empiezas un set al minuto 0:00, otro al 1:00, otro al 2:00, etc. Cuanto más rápido termines tus reps, más descanso tienes — pero TIENES que terminar antes del próximo minuto.",
      exampleTitle: "EMOM 12 min · 8 KB swings + 3 burpees por minuto",
      walkthrough: [
        "Empieza el reloj a 0:00.",
        "Haces 8 KB swings + 3 burpees lo más rápido posible (con técnica).",
        "Si terminas en 0:35, descansas hasta 1:00 (tienes 25s de descanso).",
        "A las 1:00 exactas empiezas la siguiente ronda con las mismas reps.",
        "Si NO terminas las reps en 60 segundos: tienes que recortar reps en la siguiente ronda o aceptar fallo.",
        "Continúas hasta completar 12 minutos (12 rondas en este ejemplo).",
      ],
      scoring:
        "EMOM normalmente NO se mide — es trabajo de densidad. Lo importante es completar todas las rondas. Si fallas reps, anótalo.",
      whyItWorks:
        "Te obliga a moverte rápido bajo descanso forzado. Construye capacidad de trabajo + skill bajo presión temporal sin destruirte como un AMRAP.",
      topTip:
        "Si terminas tus reps en 30 segundos siempre, el peso/volumen es muy ligero. Si te toma 55s, está perfecto.",
    },
    {
      icon: "💀",
      name: "Death By",
      tagline: "Cada minuto subes 1 rep hasta fallar",
      whatIsIt:
        "Death By es un EMOM ascendente. Minuto 1 = 1 rep. Minuto 2 = 2 reps. Minuto N = N reps. Subes 1 rep cada minuto hasta que ya no puedes completar todas las reps en los 60 segundos.",
      exampleTitle: "Death By Power Clean @ 70 kg",
      walkthrough: [
        "Min 1 (0:00 a 1:00): 1 rep. Descansas el resto.",
        "Min 2 (1:00 a 2:00): 2 reps. Descansas el resto.",
        "Min 3: 3 reps.",
        "Min 8: 8 reps (~30s de trabajo, 30s de descanso).",
        "Min 12: 12 reps (~50s de trabajo, 10s de descanso).",
        "Min 13: intentas 13 reps pero solo logras 11 antes de los 60s. AHÍ TERMINASTE.",
      ],
      scoring:
        "Tu score = el ÚLTIMO minuto que completaste todas las reps. En el ejemplo: minuto 12.",
      whyItWorks:
        "Las primeras rondas son trampa — te sientes fresh. La acumulación de fatiga es exponencial. Death By construye capacidad anaeróbica + tolerancia al ácido láctico.",
      topTip:
        "Arranca CONSERVADOR. No te confíes en las primeras 5-6 rondas. Si vas a all-out desde min 1, te mueres en el min 8.",
    },
    {
      icon: "🔥",
      name: "For Time",
      tagline: "Circuito × N rondas lo más rápido posible (con cap)",
      whatIsIt:
        "For Time = haces todo el trabajo prescrito lo más rápido posible. Hay un cap (tope de tiempo). Si llegas al cap sin terminar, ese es tu tope. Si terminas antes, anotas el tiempo.",
      exampleTitle: "Fran (benchmark): 21-15-9 Thrusters @ 95 lb + Pull-ups · cap 8 min",
      walkthrough: [
        "Empieza el cronómetro a 0:00.",
        "Haces 21 thrusters → 21 pull-ups.",
        "Haces 15 thrusters → 15 pull-ups.",
        "Haces 9 thrusters → 9 pull-ups.",
        "Paras el cronómetro al terminar la última rep. Ese es tu tiempo.",
        "Si llegas a 8:00 (cap) sin terminar: anotas '8:00 + reps que faltaban'.",
      ],
      scoring:
        "Tiempo total. Menor = mejor. Ej: 6:42. Si llegaste al cap: '8:00 + 4 pull-ups restantes'.",
      whyItWorks:
        "Premia ritmo sostenido bajo presión. Combina técnica + capacidad cardiovascular bajo fatiga. Los benchmarks (Fran, Helen, etc.) sirven como medida directa de progreso entre mesos.",
      topTip:
        "El ritmo NO es sprint. Es 'lo más rápido que puedes mantener técnica limpia'. Si fallas técnica, paras 3s, respiras y vuelves.",
    },
    {
      icon: "📈",
      name: "AMRAP (As Many Rounds As Possible)",
      tagline: "Tantas rondas como puedas en X minutos",
      whatIsIt:
        "AMRAP = haces el circuito prescrito tantas veces como puedas en X minutos. Cuando suena el bell, paras donde estés. Tu score son las rondas completas + reps parciales.",
      exampleTitle: "AMRAP 15 min · 5 pull-ups + 10 push-ups + 15 air squats",
      walkthrough: [
        "Empieza el cronómetro a 0:00.",
        "Round 1: 5 pull-ups + 10 push-ups + 15 air squats.",
        "Round 2: igual. Round 3: igual.",
        "Continuas SIN PARAR hasta que el cronómetro llegue a 15:00.",
        "Cuando suena, paras donde estés — incluso a media rep.",
        "Cuentas tu score: rondas completas + reps parciales.",
      ],
      scoring:
        "Ej: '8 rounds + 5 pull-ups + 4 push-ups'. Mejor cada vez que repitas el AMRAP, intenta superar tu score.",
      whyItWorks:
        "Capacidad de trabajo bajo fatiga acumulada. Premia ritmo SOSTENIBLE — un atleta que va parejo casi siempre supera a uno que sprint-y-descansa.",
      topTip:
        "Ritmo PAREJO. Mejor 8 rondas estables que 3 rondas rápidas + 4 rondas lentas. Encuentra tu cadencia y mantenla.",
    },
    {
      icon: "🌪️",
      name: "Tabata",
      tagline: "20 segundos all-out / 10 segundos descanso × 8 rondas",
      whatIsIt:
        "Tabata es un protocolo japonés de intervalos. 20 segundos de trabajo a máxima intensidad, 10 segundos de descanso, 8 rondas. Total: 4 minutos por movimiento. Es brutalmente intenso.",
      exampleTitle: "Tabata Air Squats · 20s on / 10s off × 8 rondas (4 min total)",
      walkthrough: [
        "Round 1: 0:00 a 0:20 → squats lo más rápido posible. 0:20 a 0:30 → descanso parado.",
        "Round 2: 0:30 a 0:50 → squats. 0:50 a 1:00 → descanso.",
        "Round 3, 4, 5, 6, 7, 8: igual cada 30 segundos.",
        "A los 4:00 minutos exactos → terminaste.",
      ],
      scoring:
        "Dos formas: (1) reps totales sumadas de las 8 rondas. (2) Versión estricta: el número MÍNIMO de reps que hiciste en una sola ronda (penaliza si decaes).",
      whyItWorks:
        "Burst training puro. Estimula capacidad anaeróbica máxima en muy poco tiempo. Investigación original (Tabata 1996) muestra mejoras simultáneas en VO2max y capacidad anaeróbica.",
      topTip:
        "En los 20s → ALL OUT, sin pensar. En los 10s → respira PROFUNDO, NO te muevas, prepárate. Esos 10s son sagrados.",
    },
    {
      icon: "🏋️",
      name: "Complex (Power Clean)",
      tagline: "Múltiples movimientos en secuencia sin soltar la barra",
      whatIsIt:
        "Un complex es una serie de movimientos olímpicos encadenados que cuentan como UNA rep. La barra NO toca el piso entre los movimientos. Sirve para construir skill bajo fatiga progresiva.",
      exampleTitle: "Power Clean Complex: 2 Hang Power Clean + 1 Push Press = 1 rep",
      walkthrough: [
        "Cargas la barra del piso a posición de pie (Power Clean inicial — esto NO cuenta dentro del complex, es el setup).",
        "Bajas la barra a posición hang (a la altura de las rodillas).",
        "1er Hang Power Clean → barra al rack frontal.",
        "Bajas otra vez a hang.",
        "2do Hang Power Clean → barra al rack frontal.",
        "Push Press → empujas la barra arriba con drive de piernas.",
        "Bajas la barra controlada al rack/torso. ESO es 1 REP del complex.",
        "Si te dicen '4 reps del complex' = repites toda la secuencia 4 veces.",
      ],
      scoring:
        "Peso máximo del complex completo (los 3 movimientos juntos). El peso lo limita el movimiento más débil (normalmente el Push Press).",
      whyItWorks:
        "Skill bajo fatiga progresiva. Cada movimiento extra del complex te enseña a mantener técnica olímpica cuando estás cansado — exactamente la capacidad que necesitas en metcons.",
      topTip:
        "La barra NO toca el piso entre los 3 movimientos. Si la sueltas, descalifica el rep entero. Si necesitas resetear, baja al piso y empiezas de cero.",
    },
  ],
  faq: [
    {
      question: "¿Qué hago si fallo un workout o pierdo días?",
      answer:
        "Retoma en el día que te toque según tu calendario. Si te tocaba Lunes (Push) pero te lo saltaste y hoy es Martes, hoy haces Leg Strength normal — no intentes recuperar el Push. La consistencia semana a semana importa más que cualquier workout individual. NUNCA dobles workouts en un día para 'ponerte al día' — la fatiga acumulada es peor que el volumen perdido.",
    },
    {
      question: "¿Cómo elijo el peso si no estoy seguro?",
      answer:
        "Empieza CONSERVADOR. La primera vez que veas un movimiento o formato, prioriza técnica sobre carga — si te queda espacio en el tanque, subes en el siguiente set. Es mucho mejor underestimar el peso del día 1 que romperte y perder semanas. Después de 2-3 sesiones ya tendrás calibrado tu rango.",
    },
    {
      question: "¿Qué hago si me lesiono o siento dolor?",
      answer:
        "Diferencia: dolor agudo (punzante, articular, algo que NO debería doler) = STOP, modifica o salta. Dolor muscular normal (DOMS, ardor en el set, fatiga) = sigue. Si el dolor agudo persiste, salta el ejercicio y consulta. Una semana off es nada comparado con 6 meses lesionado.",
    },
    {
      question: "¿Por qué el jueves es Active Recovery? ¿No estoy 'perdiendo' un día?",
      answer:
        "No. Active Recovery (Z2 + mobility) ACELERA tu recuperación entre los 3 días pesados de strength y el atletismo del fin de semana. Sin él, llegas drenado al sábado y rindes 30% menos en metcons. Es la diferencia entre completar M2 íntegro o estancarte en S4 por fatiga acumulada.",
    },
    {
      question: "¿Por qué la S6 es DELOAD? Me siento bien, ¿no debería empujar?",
      answer:
        "Tu sistema nervioso central acumula fatiga durante 5 semanas de intensidad — incluso si te 'sientes bien', tu performance está bajando. La S6 con peso ligero permite que adapten los tejidos blandos (tendones, ligamentos) que tardan más que los músculos. Saltarla = empezar el próximo meso con la batería al 60%. Tu PR del próximo meso depende de este deload.",
    },
  ],
};

/**
 * Closing card content per meso. To add a new meso transition (e.g. M2 → M3):
 *  1. Add the new range to MESOCYCLE_DATE_RANGES below.
 *  2. Add a `M2_CLOSING_CONTENT` here with copy for the closing card.
 *  3. Done — no other code changes needed.
 */
export const M1_CLOSING_CONTENT: MesocycleClosingContent = {
  mesoId: "M1",
  hero: "Construiste la base.",
  heroSubline: "Lo que sigue, te lo ganaste.",
  achievements: [
    {
      title: "Construiste base técnica.",
      body: "Aprendiste los patrones. Tu cuerpo entiende el lenguaje del hierro.",
    },
    {
      title: "Subiste peso en {prCount} ejercicios distintos.",
      body: "No es suerte — es adaptación real, set por set.",
    },
    {
      title: "{bestStreak} días sin saltarte un strength day.",
      body: "Esto ya es identidad, no motivación.",
    },
  ],
  nextMesoId: "M2",
  nextMesoName: "M2 · INTENSITY",
  nextMesoDescription:
    "Sube la apuesta. Misma estructura semanal, más demanda. Aprenderás a expresar tu fuerza bajo presión real — clusters, wave loading, metcons.",
  nextMesoFormats: ["⚡ Clusters", "🌊 Waves", "💀 Death By", "🔥 For Time"],
};

/**
 * Date ranges for each mesocycle. Used to detect which meso a given date / week belongs to.
 * Single source of truth — add new mesos here as they're scheduled.
 *
 * Convention: dates BEFORE the earliest known range are treated as "M1" (pre-launch baseline).
 * This keeps M1 labelable without us hardcoding its start date (which may vary per athlete).
 */
export const MESOCYCLE_DATE_RANGES: Record<string, { start: string; end: string }> = {
  M2: { start: "2026-04-27", end: "2026-06-07" },
  // M3: { start: "2026-06-08", end: "..." },  // Add when defined
};

/**
 * Returns the meso name for a given ISO date string (YYYY-MM-DD).
 *
 * - If date falls within a defined range → returns that meso (e.g. "M2")
 * - If date is BEFORE all known ranges → returns "M1" (legacy/baseline)
 * - If date is AFTER all known ranges → returns null (post-program)
 */
export function getMesoForDate(dateStr: string): string | null {
  // Find the earliest defined range
  const ranges = Object.entries(MESOCYCLE_DATE_RANGES).sort(
    ([, a], [, b]) => a.start.localeCompare(b.start)
  );
  if (ranges.length === 0) return "M1"; // No mesos defined → everything is M1

  // Inside a known range
  for (const [meso, range] of ranges) {
    if (dateStr >= range.start && dateStr <= range.end) return meso;
  }

  // Before earliest range
  if (dateStr < ranges[0][1].start) return "M1";

  // After last range — unknown
  return null;
}

/**
 * Returns the meso name (e.g. "M2") if today's date falls within a known meso's range.
 * Convenience wrapper around getMesoForDate that excludes "M1" baseline (since M1 has no
 * manual content — it's the pre-Apr-27 baseline).
 */
export function getCurrentMesocycle(todayStr: string): string | null {
  for (const [meso, range] of Object.entries(MESOCYCLE_DATE_RANGES)) {
    if (todayStr >= range.start && todayStr <= range.end) return meso;
  }
  return null;
}

/**
 * Get today's date in user's LOCAL timezone as YYYY-MM-DD.
 * IMPORTANT: do NOT use Date.toISOString() — that returns UTC, which can be a day
 * ahead of the user's local date and trigger meso transitions prematurely.
 */
export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get intro content for a mesocycle by name.
 * For MVP: only M2 has content. Future mesos will be added or migrated to DB.
 */
export function getMesocycleIntroContent(mesoName: string): MesocycleIntroContent | null {
  if (mesoName === "M2" || mesoName.toUpperCase().includes("M2")) return M2_INTRO_CONTENT;
  return null;
}

/**
 * Get detailed manual content for a mesocycle by name.
 * Always available from Programa tab — does NOT use localStorage.
 */
export function getMesocycleManualContent(mesoName: string): MesocycleManualContent | null {
  if (mesoName === "M2" || mesoName.toUpperCase().includes("M2")) return M2_MANUAL_CONTENT;
  return null;
}

/**
 * Get closing-card content for a mesocycle by id (e.g. "M1").
 */
export function getMesocycleClosingContent(
  mesoId: string,
): MesocycleClosingContent | null {
  if (mesoId === "M1") return M1_CLOSING_CONTENT;
  return null;
}

/**
 * localStorage key for tracking if user has seen mesocycle intro.
 */
export function welcomeCardSeenKey(userId: string, mesocycleId: string): string {
  return `welcome_card_seen_${mesocycleId}_${userId}`;
}

/**
 * localStorage key for tracking if user has seen the meso closing card.
 * Shown once per (user, just-finished-meso) transition.
 */
export function mesoClosingSeenKey(userId: string, mesoId: string): string {
  return `meso_closing_seen_${mesoId}_${userId}`;
}
