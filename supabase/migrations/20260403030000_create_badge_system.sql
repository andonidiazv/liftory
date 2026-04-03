-- ══════════════════════════════════════════════════════════════
-- LIFTORY BADGE SYSTEM
-- ══════════════════════════════════════════════════════════════

-- 1. Badge definitions (admin-managed catalog)
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,              -- e.g. "front-squat-club"
  name text NOT NULL,                      -- e.g. "FRONT SQUAT CLUB"
  exercise_name text NOT NULL,             -- exact exercise name from exercises table
  category text NOT NULL DEFAULT 'compound', -- compound | olympic | bodyweight
  description text,                        -- short description of the badge
  fun_fact text,                           -- compelling stat (e.g. "Only 15% of trained lifters...")
  icon_name text DEFAULT 'trophy',         -- lucide icon name
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Badge tiers (3 per badge: longevity, excelente, elite)
CREATE TABLE IF NOT EXISTS public.badge_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('longevity', 'excelente', 'elite')),
  tier_label text NOT NULL,                -- display name: "LONGEVITY STRENGTH", "EXCELENTE", "ELITE"
  weight_male numeric,                     -- kg (NULL for bodyweight exercises)
  weight_female numeric,                   -- kg (NULL for bodyweight exercises)
  reps_male int NOT NULL,
  reps_female int NOT NULL,
  color text NOT NULL DEFAULT '#7A8B5C',   -- tier accent color
  sort_order int DEFAULT 0,
  UNIQUE(badge_id, tier)
);

-- 3. User earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_tier_id uuid NOT NULL REFERENCES public.badge_tiers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_url text,                          -- video link or Instagram URL
  proof_notes text,                        -- user notes
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,                       -- admin notes
  earned_at timestamptz,                   -- set when approved
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_tier_id)
);

-- Indexes
CREATE INDEX idx_badge_tiers_badge_id ON public.badge_tiers(badge_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX idx_user_badges_status ON public.user_badges(status);
CREATE INDEX idx_user_badges_earned ON public.user_badges(user_id, status) WHERE status = 'approved';

-- RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badge definitions: everyone can read
CREATE POLICY "Anyone can read badge definitions" ON public.badge_definitions FOR SELECT USING (true);

-- Badge tiers: everyone can read
CREATE POLICY "Anyone can read badge tiers" ON public.badge_tiers FOR SELECT USING (true);

-- User badges: users can read all approved badges (social), insert/read own
CREATE POLICY "Users can read approved badges" ON public.user_badges FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "Users can claim badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending" ON public.user_badges FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Service role full access for admin operations
CREATE POLICY "Service role full access badges" ON public.user_badges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage definitions" ON public.badge_definitions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manage tiers" ON public.badge_tiers FOR ALL USING (auth.role() = 'service_role');

-- ══════════════════════════════════════════════════════════════
-- SEED: Badge Definitions + Tiers
-- ══════════════════════════════════════════════════════════════

-- COMPOUND LIFTS
INSERT INTO public.badge_definitions (slug, name, exercise_name, category, description, fun_fact, icon_name, sort_order) VALUES
('front-squat-club', 'FRONT SQUAT CLUB', 'Heel Elevated Front Squat', 'compound', 'Domina el squat frontal con elevación de talón — la variante más exigente de squat.', 'Un front squat a 1.5x tu peso corporal te coloca en el top 15-20% de atletas entrenados. La mayoría de la gente en el gym nunca hace front squat.', 'zap', 1),
('back-squat-club', 'BACK SQUAT CLUB', 'Barbell Back Squat', 'compound', 'El rey de los ejercicios de tren inferior. Demuestra fuerza bruta en el squat.', 'Menos del 5% de la gente en un gimnasio hace squat con estos pesos. El back squat es el ejercicio más respetado universalmente.', 'crown', 2),
('press-club', 'PRESS CLUB', 'Incline Dumbbell Press', 'compound', 'Press inclinado con mancuernas — la prueba definitiva de fuerza de pecho y hombro.', 'Más fuerte que el 80% de atletas entrenados. Muchos gimnasios ni siquiera tienen mancuernas tan pesadas.', 'chevrons-up', 3),
('overhead-club', 'OVERHEAD CLUB', 'DB Military Press', 'compound', 'Press militar con mancuernas — el lift que más lento progresa y más respeto gana.', 'Menos del 20% de atletas entrenados llegan a estos pesos. El press overhead es el movimiento de upper body más difícil de progresar.', 'arrow-up-circle', 4),
('hip-thrust-club', 'HIP THRUST CLUB', 'Barbell Hip Thrust', 'compound', 'Fuerza máxima de glúteos y cadena posterior con hip thrust.', 'Superas el estándar "impressive" de Bret Contreras (el investigador que popularizó el hip thrust). Top 15% de entrenados.', 'flame', 5),
('deadlift-club', 'DEADLIFT CLUB', 'Barbell Romanian Deadlift', 'compound', 'RDL pesado — tensión máxima en isquiotibiales y cadena posterior sin descanso en el suelo.', 'Un RDL a 1.75x tu peso corporal te pone por encima del 80% de atletas entrenados. A diferencia del deadlift convencional, aquí no hay reset — tensión constante.', 'anchor', 6);

-- OLYMPIC LIFTING
INSERT INTO public.badge_definitions (slug, name, exercise_name, category, description, fun_fact, icon_name, sort_order) VALUES
('clean-club', 'CLEAN CLUB', 'Clean', 'olympic', 'El squat clean completo — el movimiento más atlético que puedes hacer con una barra.', 'Menos del 5% de la gente en un gimnasio comercial siquiera intenta cleans. Hacer uno pesado combina fuerza, explosividad, timing y movilidad.', 'rocket', 7),
('power-clean-club', 'POWER CLEAN CLUB', 'High-Hang Power Clean', 'olympic', 'Power clean desde high-hang — explosividad pura sin momentum.', 'El high-hang clean es la prueba máxima de Rate of Force Development. Cero momentum, pura potencia en el menor tiempo posible.', 'bolt', 8);

-- BODYWEIGHT MASTERY
INSERT INTO public.badge_definitions (slug, name, exercise_name, category, description, fun_fact, icon_name, sort_order) VALUES
('l-chin-unlocked', 'L-CHIN UNLOCKED', 'L-Sit Chin-up', 'bodyweight', 'Chin-up con L-sit — fuerza de jalón + core isométrico al máximo nivel.', 'Menos del 10% de la gente entrenada puede hacer un L-sit chin-up con piernas extendidas. Con 5 reps estás en el top 3-5%.', 'target', 9),
('nordic-warrior', 'NORDIC WARRIOR', 'Nordic Hamstring Curl', 'bodyweight', 'Nordic curl sin asistencia, ROM completo — fuerza excéntrica de hamstrings a otro nivel.', 'Menos del 10% de atletas entrenados puede hacer un Nordic curl full ROM (bajar Y subir sin ayuda). Está vinculado a 51% menos lesiones de hamstring.', 'shield', 10),
('nordic-rising', 'NORDIC RISING', 'Assisted Nordic Curl', 'bodyweight', 'Nordic curl asistido — construyendo los hamstrings más fuertes del gym.', 'Completar 8 Nordics asistidos con ROM completo significa que tus hamstrings son más fuertes que ~70% de atletas entrenados. Este es el estándar del FIFA 11+.', 'trending-up', 11),
('muscle-up-unlocked', 'MUSCLE-UP UNLOCKED', 'Muscle Up', 'bodyweight', 'Muscle-up con banda — la transición más difícil del calisthenics.', 'Incluso con banda, completar un muscle-up requiere fuerza que menos del 15% de la gente en el gym posee. La transición es donde todos fallan.', 'star', 12),
('strict-muscle-up', 'STRICT MUSCLE-UP', 'Muscle Up', 'bodyweight', 'Muscle-up estricto sin banda ni kip — élite absoluta del bodyweight.', 'Menos del 1% de la población mundial puede hacer un muscle-up. Estricto sin banda ni kip es 1-3% de la gente que entrena regularmente.', 'award', 13);

-- TIERS: Front Squat Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 70, 40, 5, 5, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'front-squat-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 95, 55, 5, 5, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'front-squat-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 120, 70, 5, 5, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'front-squat-club';

-- TIERS: Back Squat Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 90, 50, 5, 5, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'back-squat-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 120, 70, 5, 5, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'back-squat-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 150, 90, 5, 5, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'back-squat-club';

-- TIERS: Press Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 26, 12, 6, 6, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'press-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 36, 18, 6, 6, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'press-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 45, 24, 6, 6, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'press-club';

-- TIERS: Overhead Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 22, 12, 6, 6, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'overhead-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 30, 16, 6, 6, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'overhead-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 38, 20, 6, 6, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'overhead-club';

-- TIERS: Hip Thrust Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 100, 60, 6, 6, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'hip-thrust-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 140, 90, 6, 6, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'hip-thrust-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 180, 120, 6, 6, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'hip-thrust-club';

-- TIERS: Deadlift Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 80, 45, 6, 6, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'deadlift-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 110, 60, 6, 6, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'deadlift-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 140, 80, 6, 6, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'deadlift-club';

-- TIERS: Clean Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 60, 35, 1, 1, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'clean-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 85, 50, 1, 1, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'clean-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 110, 65, 1, 1, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'clean-club';

-- TIERS: Power Clean Club
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', 45, 28, 2, 2, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'power-clean-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', 60, 38, 2, 2, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'power-clean-club';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', 80, 50, 2, 2, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'power-clean-club';

-- TIERS: L-Chin Unlocked (bodyweight — no weight, just reps)
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', NULL, NULL, 1, 1, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'l-chin-unlocked';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', NULL, NULL, 3, 1, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'l-chin-unlocked';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', NULL, NULL, 5, 3, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'l-chin-unlocked';

-- TIERS: Nordic Warrior
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', NULL, NULL, 1, 1, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'nordic-warrior';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', NULL, NULL, 3, 1, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'nordic-warrior';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', NULL, NULL, 5, 3, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'nordic-warrior';

-- TIERS: Nordic Rising
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', NULL, NULL, 3, 2, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'nordic-rising';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', NULL, NULL, 5, 3, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'nordic-rising';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', NULL, NULL, 8, 6, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'nordic-rising';

-- TIERS: Muscle-Up Unlocked (banded)
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'longevity', 'LONGEVITY STRENGTH', NULL, NULL, 1, 1, '#7A8B5C', 1 FROM public.badge_definitions WHERE slug = 'muscle-up-unlocked';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'excelente', 'EXCELENTE', NULL, NULL, 1, 1, '#C75B39', 2 FROM public.badge_definitions WHERE slug = 'muscle-up-unlocked';
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', NULL, NULL, 3, 1, '#C9A96E', 3 FROM public.badge_definitions WHERE slug = 'muscle-up-unlocked';

-- TIERS: Strict Muscle-Up (elite only)
INSERT INTO public.badge_tiers (badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order)
SELECT id, 'elite', 'ELITE', NULL, NULL, 1, 1, '#C9A96E', 1 FROM public.badge_definitions WHERE slug = 'strict-muscle-up';
