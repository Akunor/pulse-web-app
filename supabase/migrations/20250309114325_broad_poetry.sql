/*
  # Fix pulse streak calculation

  1. Changes
    - Add function to check if a workout was already logged for the day
    - Only increment pulse and streak if it's the first workout of the day
    - Reset streak if no workout was logged the previous day

  2. Security
    - Function is accessible only to authenticated users
*/

CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  last_workout_date DATE;
  workout_today BOOLEAN;
BEGIN
  -- Check if there was already a workout today
  SELECT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE user_id = NEW.user_id 
    AND DATE(completed_at) = DATE(NEW.completed_at)
    AND id != NEW.id
  ) INTO workout_today;

  -- Only proceed if this is the first workout of the day
  IF NOT workout_today THEN
    -- Get the date of the last workout
    SELECT DATE(completed_at)
    INTO last_workout_date
    FROM workouts
    WHERE user_id = NEW.user_id
    AND DATE(completed_at) < DATE(NEW.completed_at)
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Update profile with new pulse level and streak
    UPDATE profiles
    SET 
      pulse_level = LEAST(pulse_level + 10, 100),
      streak_days = CASE
        -- If last workout was yesterday, increment streak
        WHEN last_workout_date = DATE(NEW.completed_at - INTERVAL '1 day') THEN streak_days + 1
        -- If no previous workout or gap in streak, reset to 1
        ELSE 1
      END,
      last_workout_at = NEW.completed_at
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;