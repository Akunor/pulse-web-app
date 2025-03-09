/*
  # Update Pulse mechanics and add custom workouts table

  1. New Tables
    - `custom_workouts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `duration` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add rest_day_used boolean to profiles table
    - Add days_without_workout integer to profiles table
    - Update pulse calculation logic
    - Add custom workouts table for saved workout templates

  3. Security
    - Enable RLS on custom_workouts table
    - Add policies for custom workouts management
*/

-- Create custom workouts table
CREATE TABLE custom_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add RLS to custom workouts
ALTER TABLE custom_workouts ENABLE ROW LEVEL SECURITY;

-- Add policies for custom workouts
CREATE POLICY "Users can manage their custom workouts"
  ON custom_workouts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rest_day_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS days_without_workout integer DEFAULT 0;

-- Update the pulse update function
CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  last_workout_date DATE;
  days_since_last_workout INTEGER;
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
    SELECT DATE(completed_at), 
           DATE(NEW.completed_at) - DATE(completed_at)
    INTO last_workout_date, days_since_last_workout
    FROM workouts
    WHERE user_id = NEW.user_id
    AND DATE(completed_at) < DATE(NEW.completed_at)
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Update profile with new pulse level and streak
    UPDATE profiles
    SET 
      -- Increment pulse by 1 for the workout
      pulse_level = LEAST(
        CASE
          -- If it's been more than one day, calculate decay
          WHEN days_since_last_workout > 1 AND NOT rest_day_used THEN
            -- Decay formula: -1 for first day, -3 for second, -5 for third, etc.
            GREATEST(0, pulse_level - (
              CASE
                WHEN days_without_workout = 1 THEN 1
                ELSE (days_without_workout * 2) - 1
              END
            ))
          ELSE pulse_level
        END + 1,
        100
      ),
      -- Reset rest day if it's been used
      rest_day_used = CASE
        WHEN days_since_last_workout > 1 THEN false
        ELSE rest_day_used
      END,
      -- Reset days without workout
      days_without_workout = 0,
      -- Update streak
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

-- Create function to update pulse decay daily
CREATE OR REPLACE FUNCTION update_pulse_decay()
RETURNS TRIGGER AS $$
BEGIN
  -- If no workout today and not using rest day, increase days_without_workout
  IF NOT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE user_id = NEW.user_id 
    AND DATE(completed_at) = CURRENT_DATE
  ) THEN
    UPDATE profiles
    SET 
      days_without_workout = days_without_workout + 1,
      -- Only decay pulse if not using rest day
      pulse_level = CASE
        WHEN NOT rest_day_used THEN
          GREATEST(0, pulse_level - (
            CASE
              WHEN days_without_workout = 0 THEN 1
              ELSE (days_without_workout * 2) - 1
            END
          ))
        ELSE pulse_level
      END
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for daily pulse decay
CREATE TRIGGER pulse_decay_trigger
  AFTER INSERT OR UPDATE
  ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_decay();