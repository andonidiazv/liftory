export interface Exercise {
  id: string;
  name: string;
  tempo: string;
  tempoExplain: string;
  sets: number;
  reps: string;
  weight: string;
  rpe: string;
  rir: string;
  muscles: string[];
  equipment: string;
  type: string;
  commonMistakes: string[];
  substitutions: string[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  subtitle: string;
  exercises: Exercise[];
  estimatedTime: number;
  intensity: string;
  tags: string[];
}

export const todayWorkout: WorkoutDay = {
  id: "push-core-day4",
  name: "Push + Core",
  subtitle: "Día 4",
  exercises: [
    {
      id: "bench-press",
      name: "Barbell Bench Press",
      tempo: "3-1-1-0",
      tempoExplain: "3 seg bajando · 1 seg abajo · 1 seg subiendo · 0 pausa",
      sets: 4,
      reps: "8",
      weight: "70 kg",
      rpe: "7-8",
      rir: "2-3",
      muscles: ["Pecho", "Tríceps", "Hombros"],
      equipment: "Barra",
      type: "Compound",
      commonMistakes: [
        "Rebotar la barra en el pecho",
        "Levantar los glúteos del banco",
        "No controlar la fase excéntrica",
      ],
      substitutions: ["DB Bench Press", "Push-ups con tempo"],
    },
    {
      id: "incline-db-press",
      name: "Incline DB Press",
      tempo: "3-0-1-0",
      tempoExplain: "3 seg bajando · 0 pausa · 1 seg subiendo · 0 pausa",
      sets: 3,
      reps: "10",
      weight: "22 kg",
      rpe: "7",
      rir: "3",
      muscles: ["Pecho superior", "Hombros", "Tríceps"],
      equipment: "Mancuernas",
      type: "Compound",
      commonMistakes: [
        "Ángulo demasiado alto (más de 45°)",
        "No bajar lo suficiente",
      ],
      substitutions: ["Incline Barbell Press", "Landmine Press"],
    },
    {
      id: "cable-fly",
      name: "Cable Fly",
      tempo: "3-0-1-1",
      tempoExplain: "3 seg abriendo · 0 pausa · 1 seg cerrando · 1 seg apretando",
      sets: 3,
      reps: "12",
      weight: "15 kg",
      rpe: "8",
      rir: "2",
      muscles: ["Pecho", "Hombros anteriores"],
      equipment: "Poleas",
      type: "Isolation",
      commonMistakes: [
        "Usar demasiado peso y perder rango",
        "No contraer al final del movimiento",
      ],
      substitutions: ["Pec Deck", "DB Fly en banco plano"],
    },
    {
      id: "shoulder-press",
      name: "Seated DB Shoulder Press",
      tempo: "2-0-1-0",
      tempoExplain: "2 seg bajando · 0 pausa · 1 seg subiendo · 0 pausa",
      sets: 3,
      reps: "10",
      weight: "16 kg",
      rpe: "7",
      rir: "3",
      muscles: ["Hombros", "Tríceps"],
      equipment: "Mancuernas",
      type: "Compound",
      commonMistakes: [
        "Arquear la espalda baja",
        "No bajar hasta 90° en codos",
      ],
      substitutions: ["Barbell OHP", "Arnold Press"],
    },
    {
      id: "lateral-raise",
      name: "Lateral Raise",
      tempo: "3-0-1-0",
      tempoExplain: "3 seg bajando · 0 pausa · 1 seg subiendo · 0 pausa",
      sets: 3,
      reps: "15",
      weight: "8 kg",
      rpe: "8",
      rir: "2",
      muscles: ["Deltoides lateral"],
      equipment: "Mancuernas",
      type: "Isolation",
      commonMistakes: [
        "Subir con impulso del cuerpo",
        "Elevar los hombros (traps)",
      ],
      substitutions: ["Cable Lateral Raise", "Machine Lateral Raise"],
    },
    {
      id: "tricep-pushdown",
      name: "Tricep Rope Pushdown",
      tempo: "2-0-1-0",
      tempoExplain: "2 seg subiendo · 0 pausa · 1 seg bajando · 0 pausa",
      sets: 3,
      reps: "12",
      weight: "20 kg",
      rpe: "7",
      rir: "3",
      muscles: ["Tríceps"],
      equipment: "Poleas",
      type: "Isolation",
      commonMistakes: [
        "Mover los codos lejos del cuerpo",
        "Usar el peso del cuerpo para empujar",
      ],
      substitutions: ["Overhead Tricep Extension", "Diamond Push-ups"],
    },
    {
      id: "pallof-press",
      name: "Pallof Press Hold",
      tempo: "0-0-3-0",
      tempoExplain: "Hold 30 seg por lado · Anti-rotación isométrica",
      sets: 3,
      reps: "30 seg",
      weight: "—",
      rpe: "6",
      rir: "4",
      muscles: ["Core", "Oblicuos"],
      equipment: "Poleas",
      type: "Functional",
      commonMistakes: [
        "Rotar el torso hacia la polea",
        "No activar el core completamente",
      ],
      substitutions: ["Band Pallof Press", "Plank con alcance"],
    },
    {
      id: "dead-bug",
      name: "Dead Bug",
      tempo: "2-0-1-0",
      tempoExplain: "2 seg extendiendo · 0 pausa · 1 seg regresando · 0 pausa",
      sets: 3,
      reps: "10 c/lado",
      weight: "—",
      rpe: "6",
      rir: "4",
      muscles: ["Core", "Transverso abdominal"],
      equipment: "Sin equipo",
      type: "Functional",
      commonMistakes: [
        "Despegar la espalda baja del suelo",
        "Mover muy rápido sin control",
      ],
      substitutions: ["Bird Dog", "Hollow Hold"],
    },
  ],
  estimatedTime: 55,
  intensity: "Media-Alta",
  tags: ["Hipertrofia", "Tempo", "AMRAP"],
};

export const user = {
  name: "Carlos",
  gender: "Hombre",
  level: "Intermedio",
  goal: "Ganar músculo + Mejorar rendimiento",
  daysPerWeek: 5,
  equipment: "Gym completo",
  wearable: "Whoop",
  recovery: 78,
  hrv: 65,
  sleep: 7.2,
  week: 3,
  cycle: 1,
  totalWeeks: 6,
  streak: 4,
  longestStreak: 11,
  totalWorkouts: 23,
  lifetimeVolume: 89200,
};

export const weekSchedule = [
  { day: "L", completed: true, label: "Pull" },
  { day: "M", completed: true, label: "Legs" },
  { day: "M", completed: true, label: "Push" },
  { day: "J", completed: true, label: "Push+Core" },
  { day: "V", completed: false, label: "Upper", isToday: true },
  { day: "S", completed: false, label: "Descanso" },
  { day: "D", completed: false, label: "Descanso" },
];

export const weeklyVolume = [
  { week: "S1", volume: 8200 },
  { week: "S2", volume: 9100 },
  { week: "S3", volume: 9800 },
  { week: "S4", volume: 10500 },
  { week: "S5", volume: 11200 },
  { week: "S6", volume: 10800 },
  { week: "S7", volume: 11900 },
  { week: "S8", volume: 12450 },
];

export const personalRecords = [
  { exercise: "Bench Press", weight: "80 kg", reps: 5, when: "hace 3 días" },
  { exercise: "Back Squat", weight: "100 kg", reps: 3, when: "hace 1 semana" },
  { exercise: "Deadlift", weight: "120 kg", reps: 1, when: "hace 2 semanas" },
];

export const heatmapData: number[][] = [
  [0, 1, 2, 1, 0, 2, 3, 1, 0, 2, 1, 3, 0],
  [1, 0, 2, 3, 1, 0, 2, 1, 3, 0, 2, 1, 0],
  [2, 1, 0, 2, 3, 1, 0, 1, 2, 3, 1, 0, 2],
  [0, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1],
  [1, 0, 3, 2, 0, 1, 2, 0, 3, 1, 0, 2, 1],
  [2, 1, 0, 1, 2, 0, 1, 3, 0, 2, 1, 0, 2],
  [0, 2, 1, 3, 0, 2, 1, 0, 2, 1, 3, 2, 0],
];

export interface BlockExercise {
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  tempo?: string;
  rpe?: string;
  duration?: string;
  note?: string;
}

export interface WorkoutBlock {
  id: string;
  name: string;
  type: "warmup" | "strength" | "conditioning" | "cooldown";
  accentColor: string;
  icon: string;
  estimatedTime: string;
  format?: string;
  exercises: BlockExercise[];
}

export const sessionBlocks: WorkoutBlock[] = [
  {
    id: "warmup",
    name: "CALENTAMIENTO",
    type: "warmup",
    accentColor: "hsl(38, 69%, 50%)",
    icon: "Sun",
    estimatedTime: "8-10 min",
    exercises: [
      { name: "Cat-Cow Stretch", sets: 2, reps: "10", tempo: "2-0-2-0" },
      { name: "World's Greatest Stretch", sets: 2, reps: "5 c/lado" },
      { name: "Band Pull-Apart", sets: 2, reps: "15", tempo: "2-0-1-0" },
      { name: "Scapular Push-Ups", sets: 2, reps: "12", tempo: "2-0-1-0" },
    ],
  },
  {
    id: "strength",
    name: "FUERZA",
    type: "strength",
    accentColor: "hsl(22, 59%, 45%)",
    icon: "Zap",
    estimatedTime: "30-35 min",
    exercises: [
      { name: "Barbell Bench Press", sets: 4, reps: "8", weight: "70 kg", tempo: "3-1-1-0", rpe: "7-8" },
      { name: "Incline DB Press", sets: 3, reps: "10", weight: "22 kg", tempo: "3-0-1-0", rpe: "7" },
      { name: "Cable Fly", sets: 3, reps: "12", weight: "15 kg", tempo: "3-0-1-1", rpe: "8" },
      { name: "Seated DB Shoulder Press", sets: 3, reps: "10", weight: "16 kg", tempo: "2-0-1-0", rpe: "7" },
      { name: "Lateral Raise", sets: 3, reps: "15", weight: "8 kg", tempo: "3-0-1-0", rpe: "8" },
      { name: "Tricep Rope Pushdown", sets: 3, reps: "12", weight: "20 kg", tempo: "2-0-1-0", rpe: "7" },
    ],
  },
  {
    id: "conditioning",
    name: "CONDITIONING",
    type: "conditioning",
    accentColor: "hsl(5, 54%, 50%)",
    icon: "HeartPulse",
    estimatedTime: "10-12 min",
    format: "EMOM 10 min",
    exercises: [
      { name: "KB Swings", reps: "12", weight: "20 kg", note: "Min par" },
      { name: "Burpee to Target", reps: "8", note: "Min impar" },
    ],
  },
  {
    id: "cooldown",
    name: "COOLDOWN",
    type: "cooldown",
    accentColor: "hsl(82, 20%, 45%)",
    icon: "Leaf",
    estimatedTime: "5-8 min",
    exercises: [
      { name: "Foam Roll Thoracic Spine", duration: "2 min" },
      { name: "Pec Doorway Stretch", duration: "30 seg c/lado x2" },
      { name: "Child's Pose with Lat Bias", duration: "60 seg c/lado" },
      { name: "Deep Breathing", reps: "10 respiraciones", note: "Inhala 4 seg, exhala 6 seg" },
    ],
  },
];

export const exerciseLibrary = [
  { id: "bench-press", name: "Barbell Bench Press", muscles: ["Pecho"], equipment: "Barra", type: "Compound" },
  { id: "incline-db-press", name: "Incline DB Press", muscles: ["Pecho"], equipment: "Mancuernas", type: "Compound" },
  { id: "cable-fly", name: "Cable Fly", muscles: ["Pecho"], equipment: "Poleas", type: "Isolation" },
  { id: "shoulder-press", name: "DB Shoulder Press", muscles: ["Hombros"], equipment: "Mancuernas", type: "Compound" },
  { id: "lateral-raise", name: "Lateral Raise", muscles: ["Hombros"], equipment: "Mancuernas", type: "Isolation" },
  { id: "tricep-pushdown", name: "Tricep Pushdown", muscles: ["Tríceps"], equipment: "Poleas", type: "Isolation" },
  { id: "back-squat", name: "Back Squat", muscles: ["Piernas"], equipment: "Barra", type: "Compound" },
  { id: "romanian-dl", name: "Romanian Deadlift", muscles: ["Piernas"], equipment: "Barra", type: "Compound" },
  { id: "pull-up", name: "Pull-up", muscles: ["Espalda"], equipment: "Barra fija", type: "Compound" },
  { id: "barbell-row", name: "Barbell Row", muscles: ["Espalda"], equipment: "Barra", type: "Compound" },
  { id: "bicep-curl", name: "Bicep Curl", muscles: ["Bíceps"], equipment: "Mancuernas", type: "Isolation" },
  { id: "pallof-press", name: "Pallof Press", muscles: ["Core"], equipment: "Poleas", type: "Functional" },
  { id: "dead-bug", name: "Dead Bug", muscles: ["Core"], equipment: "Sin equipo", type: "Functional" },
  { id: "leg-press", name: "Leg Press", muscles: ["Piernas"], equipment: "Máquina", type: "Compound" },
  { id: "face-pull", name: "Face Pull", muscles: ["Hombros"], equipment: "Poleas", type: "Isolation" },
  { id: "hip-thrust", name: "Hip Thrust", muscles: ["Glúteos"], equipment: "Barra", type: "Compound" },
];
