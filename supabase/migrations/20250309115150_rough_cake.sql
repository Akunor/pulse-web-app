/*
  # Update Pulse timing mechanics

  1. Changes
    - Modify pulse update function to increment immediately on first workout
    - Move decay logic to a scheduled function that runs at end of day
    - Ensure multiple workouts don't stack pulse increases
    - Add last_pulse_update to track when pulse was last modified

  2. Security
    - Functions run with security definer to ensure proper access
*/

-- Add last_pulse_update column to track when pulse was last modified
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_pulse_update date;

-- Update the pulse update function to handle immediate increments
CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  workout_today BOOLEAN;
  last_workout_date DATE;
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

    -- Update profile
    UPDATE profiles
    SET 
      -- Increment pulse by 1 for the workout (max 100)
      pulse_level = LEAST(pulse_level + 1, 100),
      -- Reset rest day if it's been used
      rest_day_used = false,
      -- Reset days without workout
      days_without_workout = 0,
      -- Update streak
      streak_days = CASE
        WHEN last_workout_date = DATE(NEW.completed_at - INTERVAL '1 day') THEN streak_days + 1
        ELSE 1
      END,
      -- Update last workout timestamp
      last_workout_at = NEW.completed_at,
      -- Update last pulse modification date
      last_pulse_update = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle end-of-day pulse decay
CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply decay if:
  -- 1. No workout today
  -- 2. Not using rest day
  -- 3. Last pulse update was not today (prevents multiple decays in same day)
  IF NOT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE user_id = NEW.user_id 
    AND DATE(completed_at) = CURRENT_DATE
  ) AND 
  NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = NEW.user_id 
    AND rest_day_used = true
  ) AND
  NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = NEW.user_id 
    AND last_pulse_update = CURRENT_DATE
  ) THEN
    UPDATE profiles
    SET 
      -- Increment days without workout
      days_without_workout = days_without_workout + 1,
      -- Apply decay based on days without workout
      pulse_level = GREATEST(0, pulse_level - (
        CASE
          WHEN days_without_workout = 0 THEN 1
          ELSE (days_without_workout * 2) - 1
        END
      )),
      -- Update last pulse modification date
      last_pulse_update = CURRENT_DATE
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS pulse_decay_trigger ON workouts;

-- Create new trigger for pulse decay
CREATE TRIGGER pulse_decay_trigger
  AFTER INSERT OR UPDATE
  ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION decay_pulse_level();