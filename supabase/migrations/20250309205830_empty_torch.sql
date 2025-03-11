/*
  # Add notification settings table and queue policies

  1. New Tables
    - `notification_settings`
      - `user_id` (uuid, primary key, references profiles)
      - `preferred_time` (time, default 12:00:00)
      - `enabled` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on notification_settings table
    - Add policies for users to manage their own settings
    - Enable RLS on notification_queue table
    - Add policies for notification queue management

  3. Triggers
    - Add trigger to create default settings for new users
*/

DO $$ BEGIN
  -- Drop existing objects if they exist
  DROP TRIGGER IF EXISTS create_notification_settings_trigger ON profiles;
  DROP FUNCTION IF EXISTS create_notification_settings();
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read their own notification settings" ON notification_settings;
  DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
  DROP POLICY IF EXISTS "Users can insert their own notifications" ON notification_queue;
  DROP POLICY IF EXISTS "Users can read their own notifications" ON notification_queue;
END $$;

-- Create notification settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_time time DEFAULT '12:00:00',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_settings
CREATE POLICY "Users can read their own notification settings"
  ON notification_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_queue
CREATE POLICY "Users can insert their own notifications"
  ON notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own notifications"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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
CREATE TRIGGER create_notification_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings();

-- Create settings for existing users
INSERT INTO notification_settings (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;