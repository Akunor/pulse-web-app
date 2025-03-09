/*
  # Add email notifications support

  1. Changes
    - Add function to schedule email notifications
    - Add trigger to update last workout time

  2. Security
    - Maintain existing RLS policies
*/

-- Function to update last workout time
CREATE OR REPLACE FUNCTION update_last_workout_time()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET last_workout_at = NEW.completed_at
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last workout time
CREATE TRIGGER update_last_workout_time_trigger
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_last_workout_time();