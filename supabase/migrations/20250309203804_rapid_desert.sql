/*
  # Notification System Setup

  1. New Tables
    - `notification_settings`
      - `user_id` (uuid, references profiles)
      - `preferred_time` (time, when to send notifications)
      - `enabled` (boolean, whether notifications are enabled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - `create_notification_settings`: Creates default settings for new users

  3. Security
    - Enable RLS on notification_settings
    - Add policies for user access
*/

-- Create notification settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_time time DEFAULT '12:00:00',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
    AND policyname = 'Users can read their own notification settings'
  ) THEN
    CREATE POLICY "Users can read their own notification settings"
      ON notification_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
    AND policyname = 'Users can update their own notification settings'
  ) THEN
    CREATE POLICY "Users can update their own notification settings"
      ON notification_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create a function to automatically create notification settings for new users
CREATE OR REPLACE FUNCTION create_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger to create notification settings for new users
DROP TRIGGER IF EXISTS create_notification_settings_trigger ON profiles;
CREATE TRIGGER create_notification_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings();