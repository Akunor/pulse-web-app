/*
  # Update workout completion trigger

  1. Changes
    - Modify update_pulse_on_workout function to ensure pulse never goes below 0
    - Add GREATEST function to ensure pulse_level stays at minimum 0

  2. Security
    - No changes to RLS policies
*/

CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  last_workout_date DATE;
  current_pulse INTEGER;
BEGIN
  -- Get the last workout date and current pulse for this user
  SELECT last_workout_at::DATE, pulse_level
  INTO last_workout_date, current_pulse
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only increase pulse if this is the first workout of the day
  IF last_workout_date IS NULL OR last_workout_date < CURRENT_DATE THEN
    -- Update profile
    UPDATE profiles
    SET 
      pulse_level = GREATEST(0, pulse_level + 1),
      last_workout_at = NEW.completed_at,
      days_without_workout = 0,
      last_pulse_update = CURRENT_DATE
    WHERE id = NEW.user_id;
  ELSE
    -- Just update the last workout time without changing pulse
    UPDATE profiles
    SET 
      last_workout_at = NEW.completed_at,
      days_without_workout = 0
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;