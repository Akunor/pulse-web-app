/*
  # Add notification system

  1. New Functions
    - `send_workout_notifications()`: Sends workout notifications to users based on their usual workout time
    - `send_test_notification(user_id UUID)`: Test function to send a notification to a specific user

  2. Changes
    - Adds pg_cron extension if not exists
    - Creates scheduled job to run notifications every 30 minutes
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to send notifications
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
BEGIN
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
                    'active_friends', COALESCE(active_friends, '[]'::jsonb)
                );

                -- Send notification using pg_net
                PERFORM net.http_post(
                    url := current_setting('app.notification_webhook_url'),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.notification_api_key')
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
                    'active_friends', COALESCE(active_friends, '[]'::jsonb)
                );

                -- Send notification using pg_net
                PERFORM net.http_post(
                    url := current_setting('app.notification_webhook_url'),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.notification_api_key')
                    ),
                    body := notification_payload
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Function to test notifications for a specific user
CREATE OR REPLACE FUNCTION send_test_notification(user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
    active_friends JSONB;
    user_now TIMESTAMP WITH TIME ZONE;
    notification_payload JSONB;
    has_worked_out_today BOOLEAN;
    response JSONB;
BEGIN
    -- Get user profile
    SELECT 
        p.id,
        p.email,
        p.pulse_level,
        p.last_workout_at,
        p.rest_day_used,
        p.timezone,
        p.days_without_workout
    INTO STRICT profile_record
    FROM profiles p
    WHERE p.id = user_id;

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

    -- Build notification payload
    notification_payload := json_build_object(
        'type', 'workout_reminder',
        'user_id', profile_record.id,
        'email', profile_record.email,
        'subject', CASE 
            WHEN profile_record.last_workout_at IS NULL THEN '🎯 Start your fitness journey today!'
            WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
            ELSE '💪 Time for your daily workout!'
        END,
        'has_worked_out_today', has_worked_out_today,
        'is_new_user', profile_record.last_workout_at IS NULL,
        'pulse_level', profile_record.pulse_level,
        'days_without_workout', profile_record.days_without_workout,
        'rest_day_used', profile_record.rest_day_used,
        'active_friends', COALESCE(active_friends, '[]'::jsonb)
    );

    -- Send notification using pg_net
    SELECT content::jsonb INTO response
    FROM net.http_post(
        url := current_setting('app.notification_webhook_url'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.notification_api_key')
        ),
        body := notification_payload
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Test notification sent to ' || profile_record.email,
        'response', response
    );
END;
$$;

-- Schedule the notification function to run every 30 minutes
SELECT cron.schedule(
    'workout-notifications',  -- unique schedule name
    '*/30 * * * *',         -- every 30 minutes
    'SELECT send_workout_notifications()'
);