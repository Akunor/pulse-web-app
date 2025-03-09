/*
  # Update pulse decay logic

  1. Changes
    - Modify decay_pulse_level function to prevent pulse from going below 0
    - Add GREATEST function to ensure pulse_level stays at minimum 0

  2. Security
    - No changes to RLS policies
*/

CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS TRIGGER AS $$
DECLARE
  last_workout_date DATE;
  days_since_workout INTEGER;
  decay_amount INTEGER;
BEGIN
  -- Get the last workout date for this user
  SELECT last_workout_at::DATE
  INTO last_workout_date
  FROM profiles
  WHERE id = NEW.user_id;

  -- Calculate days since last workout
  IF last_workout_date IS NOT NULL THEN
    days_since_workout := (CURRENT_DATE - last_workout_date);
  ELSE
    days_since_workout := 0;
  END IF;

  -- Calculate decay amount based on consecutive days without workout
  -- First rest day is free if rest_day_used is false
  -- After that, decay increases: 1, 3, 5, etc.
  IF days_since_workout > 1 THEN
    decay_amount := 2 * (days_since_workout - 2) + 1;
  ELSE
    decay_amount := 0;
  END IF;

  -- Update profile with new pulse level, ensuring it doesn't go below 0
  UPDATE profiles
  SET 
    pulse_level = GREATEST(0, pulse_level - decay_amount),
    days_without_workout = days_since_workout
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;