/*
  # Add timezone support for decay checks

  1. Changes
    - Add timezone column to profiles table
    - Update decay trigger to use user's timezone
    - Add function to check decay based on user timezone

  2. Security
    - Maintain existing RLS policies
*/

-- Add timezone column with UTC default
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Create function to check if it's midnight in user's timezone
CREATE OR REPLACE FUNCTION is_midnight_in_timezone(check_timezone text)
RETURNS boolean AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM NOW() AT TIME ZONE check_timezone) = 0 
    AND EXTRACT(MINUTE FROM NOW() AT TIME ZONE check_timezone) < 5;
END;
$$ LANGUAGE plpgsql;

-- Update the decay pulse level function to consider timezone
CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS trigger AS $$
BEGIN
  -- Only decay if it's midnight in the user's timezone
  IF is_midnight_in_timezone((
    SELECT timezone 
    FROM profiles 
    WHERE id = NEW.user_id
  )) THEN
    UPDATE profiles
    SET 
      pulse_level = GREATEST(0, pulse_level - 1),
      last_pulse_update = CURRENT_DATE
    WHERE id = NEW.user_id
      AND (last_pulse_update IS NULL OR last_pulse_update < CURRENT_DATE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;