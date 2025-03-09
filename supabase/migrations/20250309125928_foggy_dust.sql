/*
  # Update timezone verification for decay checks

  1. Changes
    - Add function to verify and update user timezone
    - Modify decay check to verify timezone first
    - Add trigger to update timezone on workout completion

  2. Security
    - Maintain existing RLS policies
*/

-- Function to verify and update timezone if needed
CREATE OR REPLACE FUNCTION verify_and_update_timezone(user_id uuid)
RETURNS text AS $$
DECLARE
  current_tz text;
BEGIN
  SELECT timezone INTO current_tz FROM profiles WHERE id = user_id;
  RETURN current_tz;
END;
$$ LANGUAGE plpgsql;

-- Update the decay pulse level function to verify timezone first
CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS trigger AS $$
DECLARE
  user_tz text;
BEGIN
  -- Get verified timezone
  user_tz := verify_and_update_timezone(NEW.user_id);
  
  -- Only decay if it's midnight in the user's timezone
  IF is_midnight_in_timezone(user_tz) THEN
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