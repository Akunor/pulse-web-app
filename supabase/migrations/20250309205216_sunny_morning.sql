/*
  # Clean up notification-related schema

  1. Changes
    - Remove notification_queue table
    - Remove unused columns from profiles table
    - Keep notification_settings table for future use
    - Update trigger function to remove pulse level cap
    - Add INSERT policy for profiles table
    - Re-create handle_new_user trigger
*/

-- Drop notification queue table
DROP TABLE IF EXISTS notification_queue;

-- Remove unused columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS rest_day_used,
DROP COLUMN IF EXISTS days_without_workout,
DROP COLUMN IF EXISTS last_pulse_update;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "System can create user profiles" ON profiles;

-- Add INSERT policy for profiles
CREATE POLICY "System can create user profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow any authenticated user to have a profile created

-- Create a trigger function to create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    pulse_level, 
    streak_days,
    last_workout_at,
    timezone,
    created_at,
    updated_at
  )
  VALUES (
    new.id, 
    new.email, 
    0, 
    0,
    NULL,
    'UTC',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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