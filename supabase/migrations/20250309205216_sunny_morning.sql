/*
  # Clean up notification-related schema

  1. Changes
    - Remove notification_queue table
    - Remove unused columns from profiles table
    - Keep notification_settings table for future use
    - Update trigger function to remove pulse level cap
*/

-- Drop notification queue table
DROP TABLE IF EXISTS notification_queue;

-- Remove unused columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS rest_day_used,
DROP COLUMN IF EXISTS days_without_workout,
DROP COLUMN IF EXISTS last_pulse_update;

-- Update the workout trigger function to remove pulse level cap
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
      pulse_level = pulse_level + 1,  -- Removed LEAST function to allow unlimited growth
      streak_days = CASE
        WHEN last_workout_date = DATE(NEW.completed_at - INTERVAL '1 day') THEN streak_days + 1
        ELSE 1
      END,
      last_workout_at = NEW.completed_at
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notification settings trigger to be idempotent
CREATE OR REPLACE FUNCTION create_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;