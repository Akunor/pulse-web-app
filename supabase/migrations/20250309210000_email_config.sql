/*
  # Email Configuration Setup

  1. Changes
    - Create configuration table for email settings
    - Enable required extensions
    - Test email configuration
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create configuration table
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system to read config
CREATE POLICY "System can read config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to safely set configuration
CREATE OR REPLACE FUNCTION set_config_if_not_exists(
  config_key text,
  default_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_config (key, value)
  VALUES (config_key, default_value)
  ON CONFLICT (key) DO NOTHING;
END;
$$;

-- Set up email configuration
SELECT set_config_if_not_exists('resend_api_key', 'your_resend_api_key_here');
SELECT set_config_if_not_exists('webapp_url', 'http://localhost:3000');
SELECT set_config_if_not_exists('notification_webhook_url', 'https://api.resend.com/emails');

-- Function to get configuration value
CREATE OR REPLACE FUNCTION get_config(key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM app_config
  WHERE app_config.key = get_config.key;
  RETURN config_value;
END;
$$;

-- Function to test email configuration
CREATE OR REPLACE FUNCTION test_email_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
  api_key text;
  webhook_url text;
  webapp_url text;
BEGIN
  -- Get configuration values
  api_key := get_config('resend_api_key');
  webhook_url := get_config('notification_webhook_url');
  webapp_url := get_config('webapp_url');

  -- Test email sending
  SELECT content::jsonb INTO response
  FROM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Pulse <notifications@' || split_part(webapp_url, '//', 2) || '>',
      'to', 'test@example.com',
      'subject', 'Test Email Configuration',
      'html', '<p>This is a test email to verify the configuration.</p>'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email configuration test completed',
    'response', response
  );
END;
$$;

-- Update the send_workout_notifications function to use the new config
CREATE OR REPLACE FUNCTION send_workout_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
    active_friends JSONB;
    user_now TIMESTAMP WITH TIME ZONE;
    notification_payload JSONB;
    last_workout_time TIME;
    time_diff INTEGER;
    has_worked_out_today BOOLEAN;
    webapp_url TEXT;
    api_key TEXT;
    webhook_url TEXT;
BEGIN
    -- Get configuration values
    webapp_url := get_config('webapp_url');
    api_key := get_config('resend_api_key');
    webhook_url := get_config('notification_webhook_url');

    -- Loop through all profiles
    FOR profile_record IN 
        SELECT 
            p.id,
            p.email,
            p.pulse_level,
            p.last_workout_at,
            p.rest_day_used,
            p.timezone,
            p.days_without_workout
        FROM profiles p
    LOOP
        -- Get user's local time
        user_now := (NOW() AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'));
        
        -- Check if user has worked out today
        has_worked_out_today := (
            profile_record.last_workout_at IS NOT NULL AND
            (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::date = user_now::date
        );

        -- Get active friends
        WITH active_friends_today AS (
            SELECT 
                p.email,
                p.pulse_level,
                p.last_workout_at
            FROM friendships f
            JOIN profiles p ON p.id = f.friend_id
            WHERE f.user_id = profile_record.id
            AND (p.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::date = user_now::date
        )
        SELECT json_agg(t)
        INTO active_friends
        FROM active_friends_today t;

        -- Determine if notification should be sent
        IF profile_record.last_workout_at IS NULL THEN
            -- For new users, send at midday
            IF EXTRACT(HOUR FROM user_now) = 12 AND EXTRACT(MINUTE FROM user_now) < 30 THEN
                -- Build notification payload
                notification_payload := json_build_object(
                    'type', 'workout_reminder',
                    'user_id', profile_record.id,
                    'email', profile_record.email,
                    'subject', '🎯 Start your fitness journey today!',
                    'has_worked_out_today', false,
                    'is_new_user', true,
                    'pulse_level', profile_record.pulse_level,
                    'days_without_workout', profile_record.days_without_workout,
                    'rest_day_used', profile_record.rest_day_used,
                    'active_friends', COALESCE(active_friends, '[]'::jsonb),
                    'webapp_url', webapp_url
                );

                -- Send notification using pg_net
                PERFORM net.http_post(
                    url := webhook_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := notification_payload
                );
            END IF;
        ELSE
            -- For existing users, check if it's their usual workout time
            last_workout_time := (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time;
            time_diff := ABS(
                EXTRACT(HOUR FROM user_now::time - last_workout_time) * 60 +
                EXTRACT(MINUTE FROM user_now::time - last_workout_time)
            );

            IF time_diff <= 30 THEN
                -- Build notification payload
                notification_payload := json_build_object(
                    'type', 'workout_reminder',
                    'user_id', profile_record.id,
                    'email', profile_record.email,
                    'subject', CASE 
                        WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
                        ELSE '💪 Time for your daily workout!'
                    END,
                    'has_worked_out_today', has_worked_out_today,
                    'is_new_user', false,
                    'pulse_level', profile_record.pulse_level,
                    'days_without_workout', profile_record.days_without_workout,
                    'rest_day_used', profile_record.rest_day_used,
                    'active_friends', COALESCE(active_friends, '[]'::jsonb),
                    'webapp_url', webapp_url
                );

                -- Send notification using pg_net
                PERFORM net.http_post(
                    url := webhook_url,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || api_key
                    ),
                    body := notification_payload
                );
            END IF;
        END IF;
    END LOOP;
END;
$$; 