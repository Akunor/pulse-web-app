-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_time TIME NOT NULL DEFAULT '09:00:00',  -- Default to 9 AM
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences"
    ON notification_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
    ON notification_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to send workout reminder email
CREATE OR REPLACE FUNCTION send_workout_reminder(user_profile RECORD)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_friends JSONB;
    has_worked_out_today BOOLEAN;
    user_local_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's local time
    user_local_time := (now() AT TIME ZONE user_profile.timezone);
    
    -- Check if user has worked out today
    has_worked_out_today := (
        user_profile.last_workout_at IS NOT NULL AND
        (user_profile.last_workout_at AT TIME ZONE user_profile.timezone)::date = user_local_time::date
    );

    -- Get active friends
    WITH active_friends_today AS (
        SELECT 
            p.email,
            p.pulse_level as "pulseLevel"
        FROM friendships f
        JOIN profiles p ON p.id = f.friend_id
        WHERE f.user_id = user_profile.id
        AND (p.last_workout_at AT TIME ZONE user_profile.timezone)::date = user_local_time::date
    )
    SELECT json_agg(t)
    INTO active_friends
    FROM active_friends_today t;

    -- Send email using Resend via pg_net
    PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.resend_api_key'),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'from', 'Pulse <notifications@pulse-fitness.app>',
            'to', user_profile.email,
            'subject', CASE 
                WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
                ELSE '💪 Time for your daily workout!'
            END,
            'html', format(
                '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #E11D48;">%s</h1>
                    <p>%s</p>
                    <p>Your current stats:</p>
                    <ul>
                        <li>Pulse Level: %s</li>
                        <li>Streak: %s days</li>
                    </ul>
                    %s
                    <a href="%s" style="display: inline-block; background: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        %s
                    </a>
                </div>',
                CASE 
                    WHEN has_worked_out_today THEN 'Great Job Today! 🎉'
                    ELSE 'Time to Work Out! 💪'
                END,
                CASE 
                    WHEN has_worked_out_today THEN 'You''ve already completed your workout today. Keep up the great work!'
                    ELSE 'It''s your usual workout time. Ready to maintain your streak?'
                END,
                user_profile.pulse_level,
                COALESCE(user_profile.days_without_workout, 0),
                CASE 
                    WHEN active_friends IS NOT NULL AND json_array_length(active_friends) > 0 
                    THEN format(
                        '<div style="background: #F0FDF4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Friends who worked out today:</h3>
                            <ul style="list-style: none; padding: 0;">%s</ul>
                        </div>',
                        (
                            SELECT string_agg(
                                format('<li style="margin-bottom: 10px;">✅ %s (Pulse: %s)</li>', 
                                    friend->>'email', 
                                    friend->>'pulseLevel'
                                ),
                                ''
                            )
                            FROM json_array_elements(active_friends) AS friend
                        )
                    )
                    ELSE ''
                END,
                current_setting('app.webapp_url'),
                CASE 
                    WHEN has_worked_out_today THEN 'View Progress'
                    ELSE 'Start Workout'
                END
            )
        )
    );
END;
$$;

-- Function to process notifications for all users at their preferred times
CREATE OR REPLACE FUNCTION process_workout_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get all users whose local time matches their preferred notification time
    FOR user_record IN 
        SELECT 
            p.*,
            np.preferred_time,
            np.timezone
        FROM profiles p
        JOIN notification_preferences np ON np.user_id = p.id
        WHERE 
            np.is_enabled = true
            AND EXTRACT(HOUR FROM (now() AT TIME ZONE np.timezone)::time) = EXTRACT(HOUR FROM np.preferred_time)
            AND EXTRACT(MINUTE FROM (now() AT TIME ZONE np.timezone)::time) BETWEEN 0 AND 5
    LOOP
        -- Send notification for each matching user
        PERFORM send_workout_reminder(user_record);
    END LOOP;
END;
$$;

-- Schedule the notification check to run every 5 minutes
SELECT cron.schedule(
    'process-workout-notifications',
    '*/5 * * * *',  -- Run every 5 minutes
    $$
    SELECT process_workout_notifications();
    $$
);

-- Trigger to create notification preferences when a new user signs up
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_preferences(); 