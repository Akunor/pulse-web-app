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

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "System can read config" ON app_config;

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
CREATE OR REPLACE FUNCTION test_email_configuration(test_email text DEFAULT 'test@example.com')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
  webhook_url text;
  webapp_url text;
  http_response record;
BEGIN
  -- Get configuration values
  api_key := get_config('resend_api_key');
  webhook_url := get_config('notification_webhook_url');
  webapp_url := get_config('webapp_url');

  -- Test email sending
  SELECT * INTO http_response
  FROM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Pulse <notifications@' || split_part(webapp_url, '//', 2) || '>',
      'to', test_email,
      'subject', 'Test Email Configuration',
      'html', format(
        '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #E11D48;">Pulse Email Test</h1>
          <p>This is a test email to verify the email notification system.</p>
          <p>If you received this, the email configuration is working correctly!</p>
          <p>Configuration details:</p>
          <ul>
            <li>Webapp URL: %s</li>
            <li>From: notifications@%s</li>
          </ul>
          <div style="margin-top: 20px; padding: 15px; background-color: #F0FDF4; border-radius: 8px;">
            <p style="margin: 0;">✅ Email system is configured and working</p>
          </div>
        </div>',
        webapp_url,
        split_part(webapp_url, '//', 2)
      )
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email test completed. Check your inbox at ' || test_email,
    'response', jsonb_build_object(
      'status', http_response.status,
      'body', http_response.body::jsonb
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'response', NULL
  );
END;
$$;

-- Update the send_workout_notifications function to use the new response format
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
    response_data jsonb;
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
        JOIN notification_settings ns ON ns.user_id = p.id
        WHERE ns.enabled = true
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
                    'from', 'Pulse <notifications@' || split_part(webapp_url, '//', 2) || '>',
                    'to', profile_record.email,
                    'subject', '🎯 Start your fitness journey today!',
                    'html', format(
                        '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1>Start Your Fitness Journey Today!</h1>
                            <p>Welcome to Pulse! It''s time to begin your fitness journey.</p>
                            <p>Your current stats:</p>
                            <ul>
                                <li>Pulse Level: %s</li>
                                <li>Streak: %s days</li>
                            </ul>
                            <a href="%s" style="display: inline-block; background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Start Workout</a>
                        </div>',
                        profile_record.pulse_level,
                        COALESCE(profile_record.days_without_workout, 0),
                        webapp_url
                    )
                );

                -- Send notification using pg_net
                BEGIN
                    SELECT jsonb_build_object(
                      'status', status_code,
                      'body', body::jsonb
                    ) INTO response_data
                    FROM net.http_post(
                        url := webhook_url,
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || api_key
                        ),
                        body := notification_payload
                    );

                    IF (response_data->>'status')::int != 200 THEN
                        RAISE LOG 'Failed to send notification to %: %', profile_record.email, response_data->>'body';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE LOG 'Failed to send notification to %: %', profile_record.email, SQLERRM;
                END;
            END IF;
        ELSE
            -- For existing users, check if it's their usual workout time
            last_workout_time := (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time;
            time_diff := ABS(
                EXTRACT(HOUR FROM user_now::time - last_workout_time) * 60 +
                EXTRACT(MINUTE FROM user_now::time - last_workout_time)
            );

            IF time_diff <= 30 THEN
                -- Build notification payload with friends' activity
                notification_payload := json_build_object(
                    'from', 'Pulse <notifications@' || split_part(webapp_url, '//', 2) || '>',
                    'to', profile_record.email,
                    'subject', CASE 
                        WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
                        ELSE '💪 Time for your daily workout!'
                    END,
                    'html', format(
                        '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1>%s</h1>
                            <p>%s</p>
                            <p>Your current stats:</p>
                            <ul>
                                <li>Pulse Level: %s</li>
                                <li>Streak: %s days</li>
                            </ul>
                            %s
                            <a href="%s" style="display: inline-block; background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">%s</a>
                        </div>',
                        CASE 
                            WHEN has_worked_out_today THEN 'Great Job Today! 🎉'
                            ELSE 'Time to Work Out! 💪'
                        END,
                        CASE 
                            WHEN has_worked_out_today THEN 'You''ve already completed your workout today. Keep up the great work!'
                            ELSE 'It''s your usual workout time. Ready to maintain your streak?'
                        END,
                        profile_record.pulse_level,
                        COALESCE(profile_record.days_without_workout, 0),
                        CASE 
                            WHEN active_friends IS NOT NULL AND json_array_length(active_friends) > 0 THEN
                                '<div style="background: #F0FDF4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin-top: 0;">Friends who worked out today:</h3>
                                    <ul style="list-style: none; padding: 0;">' ||
                                    (SELECT string_agg(
                                        format('<li style="margin-bottom: 10px;">✅ %s (Pulse: %s)</li>', 
                                            (active_friends->>'email'),
                                            (active_friends->>'pulse_level')
                                        ), ''
                                    ) FROM json_array_elements(active_friends)) ||
                                    '</ul>
                                </div>'
                            ELSE ''
                        END,
                        webapp_url,
                        CASE 
                            WHEN has_worked_out_today THEN 'View Progress'
                            ELSE 'Start Workout'
                        END
                    )
                );

                -- Send notification using pg_net
                BEGIN
                    SELECT jsonb_build_object(
                      'status', status_code,
                      'body', body::jsonb
                    ) INTO response_data
                    FROM net.http_post(
                        url := webhook_url,
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || api_key
                        ),
                        body := notification_payload
                    );

                    IF (response_data->>'status')::int != 200 THEN
                        RAISE LOG 'Failed to send notification to %: %', profile_record.email, response_data->>'body';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE LOG 'Failed to send notification to %: %', profile_record.email, SQLERRM;
                END;
            END IF;
        END IF;
    END LOOP;
END;
$$; 