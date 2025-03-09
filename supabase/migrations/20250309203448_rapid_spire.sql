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
    - `process_notifications`: Handles notification processing
    - `update_notification_queue`: Updates notification queue based on settings

  3. Security
    - Enable RLS on notification_settings
    - Add policies for user access
*/

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_time time DEFAULT '12:00:00',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Function to process notifications
CREATE OR REPLACE FUNCTION process_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notification records for users based on their preferred time
  INSERT INTO notification_queue (user_id, notification_type)
  SELECT 
    ns.user_id,
    CASE 
      WHEN p.last_workout_at::date = CURRENT_DATE THEN 'workout_completed'
      ELSE 'workout_reminder'
    END as notification_type
  FROM notification_settings ns
  JOIN profiles p ON p.id = ns.user_id
  WHERE 
    ns.enabled = true
    AND (
      -- For new users without last_workout_at, use preferred_time
      (p.last_workout_at IS NULL AND CURRENT_TIME >= ns.preferred_time)
      -- For existing users, use their last workout time
      OR (
        p.last_workout_at IS NOT NULL 
        AND abs(
          extract(epoch from (CURRENT_TIME - (p.last_workout_at::time))) / 60
        ) <= 30
      )
    )
    -- Don't send if already sent today
    AND NOT EXISTS (
      SELECT 1 
      FROM notification_queue nq 
      WHERE nq.user_id = ns.user_id 
      AND nq.created_at::date = CURRENT_DATE
    );
END;
$$;

-- Create notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS on notification queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

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

-- Create cron job to process notifications every 15 minutes
SELECT cron.schedule(
  'process-notifications',
  '*/15 * * * *',
  $$
  SELECT process_notifications();
  $$
);