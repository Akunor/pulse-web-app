-- Update the send_workout_notifications function to use edge functions
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
    has_worked_out_today BOOLEAN;
    webapp_url TEXT;
BEGIN
    -- Get configuration values
    webapp_url := get_config('webapp_url');

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
                p.pulse_level as "pulseLevel"
            FROM friendships f
            JOIN profiles p ON p.id = f.friend_id
            WHERE f.user_id = profile_record.id
            AND (p.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::date = user_now::date
        )
        SELECT json_agg(t)
        INTO active_friends
        FROM active_friends_today t;

        -- For new users, send at midday
        IF profile_record.last_workout_at IS NULL THEN
            IF EXTRACT(HOUR FROM user_now) = 12 AND EXTRACT(MINUTE FROM user_now) < 30 THEN
                -- Call edge function for new user notification
                PERFORM net.http_post(
                    url := webapp_url || '/functions/v1/send-workout-email',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json'
                    ),
                    body := jsonb_build_object(
                        'to', profile_record.email,
                        'subject', '🎯 Start your fitness journey today!',
                        'pulseLevel', profile_record.pulse_level,
                        'streak', COALESCE(profile_record.days_without_workout, 0),
                        'isNewUser', true
                    )
                );
            END IF;
        ELSE
            -- For existing users, check if it's their usual workout time
            IF ABS(
                EXTRACT(HOUR FROM user_now::time - (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time) * 60 +
                EXTRACT(MINUTE FROM user_now::time - (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time)
            ) <= 30 THEN
                -- Call edge function for regular notification
                PERFORM net.http_post(
                    url := webapp_url || '/functions/v1/send-workout-email',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json'
                    ),
                    body := jsonb_build_object(
                        'to', profile_record.email,
                        'subject', CASE 
                            WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
                            ELSE '💪 Time for your daily workout!'
                        END,
                        'pulseLevel', profile_record.pulse_level,
                        'streak', COALESCE(profile_record.days_without_workout, 0),
                        'hasWorkedOut', has_worked_out_today,
                        'activeUsers', COALESCE(active_friends, '[]'::jsonb)
                    )
                );
            END IF;
        END IF;
    END LOOP;
END;
$$; 