/*
  # Clean up notification-related schema

  1. Changes
    - Remove notification_queue table
    - Remove unused columns from profiles table
    - Keep notification_settings table for future use
*/

-- Drop notification queue table
DROP TABLE IF EXISTS notification_queue;

-- Remove unused columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS rest_day_used,
DROP COLUMN IF EXISTS days_without_workout,
DROP COLUMN IF EXISTS last_pulse_update;

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