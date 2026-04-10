-- Fix typo: SHOULDER + ARMS → SHOULDERS + ARMS
-- Only affects 18 template workouts (user_id IS NULL). No user data touched.

UPDATE workouts
SET day_label = 'SHOULDERS + ARMS'
WHERE day_label = 'SHOULDER + ARMS';
