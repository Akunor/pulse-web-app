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

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;

DO $$ BEGIN
  -- Drop existing objects if they exist
  DROP TRIGGER IF EXISTS create_notification_settings_trigger ON profiles;
  DROP FUNCTION IF EXISTS create_notification_settings();
  DROP FUNCTION IF EXISTS process_notification_queue();
  
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

-- Create a function to process notifications using Gmail SMTP
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification RECORD;
  gmail_user text;
  gmail_pass text;
  webapp_url text;
  response_status integer;
BEGIN
  -- Get the Gmail credentials and webapp URL from app_config
  SELECT value INTO gmail_user FROM app_config WHERE key = 'gmail_user';
  SELECT value INTO gmail_pass FROM app_config WHERE key = 'gmail_app_password';
  SELECT value INTO webapp_url FROM app_config WHERE key = 'webapp_url';

  -- Process each unprocessed notification
  FOR notification IN
    SELECT * FROM notification_queue
    WHERE processed_at IS NULL
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Send email via SMTP
      WITH email_result AS (
        SELECT 
          CASE 
            WHEN status < 400 THEN NULL 
            ELSE content::text 
          END as error_message,
          status
        FROM net.http_post(
          url := 'smtp://smtp.gmail.com:587',
          headers := jsonb_build_object(
            'From', gmail_user,
            'To', notification.email,
            'Subject', notification.subject,
            'Content-Type', 'text/html; charset=utf-8'
          ),
          body := CASE 
            WHEN notification.is_new_user THEN
              '<p>Welcome to Pulse Fitness! 🎉</p>' ||
              '<p>We''re excited to have you join our community. Get started by setting up your profile and tracking your first workout.</p>' ||
              '<p><a href="' || webapp_url || '">Visit Pulse Fitness</a></p>'
            ELSE
              '<p>Hey there! 👋</p>' ||
              CASE 
                WHEN notification.has_worked_out THEN
                  '<p>Great job on working out today! 💪 Your current Pulse level is ' || notification.pulse_level || '.</p>'
                ELSE
                  '<p>Don''t forget to get your workout in today! ' || 
                  CASE 
                    WHEN notification.active_users > 0 THEN
                      notification.active_users || ' of your friends have already worked out today. '
                    ELSE ''
                  END ||
                  'Keep your streak going!</p>'
              END ||
              '<p><a href="' || webapp_url || '">Log your workout now</a></p>'
          END,
          username := gmail_user,
          password := gmail_pass
        )
      )
      -- Update notification status
      UPDATE notification_queue nq
      SET 
        processed_at = now(),
        error = er.error_message
      FROM email_result er
      WHERE nq.id = notification.id;

      -- Small delay to avoid rate limiting
      PERFORM pg_sleep(0.1);
    EXCEPTION WHEN OTHERS THEN
      -- Update notification with error
      UPDATE notification_queue
      SET 
        processed_at = now(),
        error = SQLERRM
      WHERE id = notification.id;
    END;
  END LOOP;
END;
$$;

-- Create a cron job to process notifications every minute
SELECT cron.schedule(
  'process-notifications',
  '* * * * *',
  'SELECT process_notification_queue()'
);