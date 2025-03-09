/*
  # Add workout tracking functionality

  1. New Tables
    - `workouts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `duration` (interval)
      - `calories` (integer)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on `workouts` table
    - Add policies for authenticated users to:
      - Insert their own workouts
      - Read their own workouts

  3. Functions
    - Add trigger function to update pulse level when workout is completed
    - Add function to decay pulse level daily
*/

-- Create workouts table if it doesn't exist
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration interval NOT NULL,
  calories integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their own workouts" ON workouts;
  DROP POLICY IF EXISTS "Users can read their own workouts" ON workouts;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Users can create their own workouts"
  ON workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own workouts"
  ON workouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create or replace trigger function to update pulse level
CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
BEGIN
  -- Update pulse level and streak
  UPDATE profiles
  SET 
    pulse_level = LEAST(pulse_level + 5, 100),
    streak_days = CASE 
      WHEN last_workout_at >= CURRENT_DATE - interval '1 day' THEN streak_days + 1
      ELSE 1
    END,
    last_workout_at = NEW.completed_at
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS workout_completed ON workouts;

-- Create trigger
CREATE TRIGGER workout_completed
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_on_workout();

-- Create or replace function to decay pulse level daily
CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Decay pulse level if no workout in last 24 hours
  UPDATE profiles
  SET pulse_level = GREATEST(pulse_level - 2, 0)
  WHERE last_workout_at < CURRENT_TIMESTAMP - interval '1 day';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;