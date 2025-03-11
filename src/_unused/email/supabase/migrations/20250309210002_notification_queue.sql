-- Create notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  pulse_level INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  has_worked_out BOOLEAN NOT NULL DEFAULT false,
  is_new_user BOOLEAN NOT NULL DEFAULT false,
  active_users JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to queue notifications
CREATE OR REPLACE FUNCTION queue_workout_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
    active_friends JSONB;
    user_now TIMESTAMP WITH TIME ZONE;
    has_worked_out_today BOOLEAN;
BEGIN
    -- Loop through all profiles
    FOR profile_record IN 
        SELECT 
            p.id,
            p.email,
            p.pulse_level,
            p.last_workout_at,
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

        -- For new users, queue at midday
        IF profile_record.last_workout_at IS NULL THEN
            IF EXTRACT(HOUR FROM user_now) = 12 AND EXTRACT(MINUTE FROM user_now) < 30 THEN
                INSERT INTO notification_queue (
                    user_id,
                    email,
                    subject,
                    pulse_level,
                    streak,
                    is_new_user
                ) VALUES (
                    profile_record.id,
                    profile_record.email,
                    '🎯 Start your fitness journey today!',
                    profile_record.pulse_level,
                    COALESCE(profile_record.days_without_workout, 0),
                    true
                );
            END IF;
        ELSE
            -- For existing users, check if it's their usual workout time
            IF ABS(
                EXTRACT(HOUR FROM user_now::time - (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time) * 60 +
                EXTRACT(MINUTE FROM user_now::time - (profile_record.last_workout_at AT TIME ZONE COALESCE(profile_record.timezone, 'UTC'))::time)
            ) <= 30 THEN
                INSERT INTO notification_queue (
                    user_id,
                    email,
                    subject,
                    pulse_level,
                    streak,
                    has_worked_out,
                    active_users
                ) VALUES (
                    profile_record.id,
                    profile_record.email,
                    CASE 
                        WHEN has_worked_out_today THEN '🎉 Great job on your workout today!'
                        ELSE '💪 Time for your daily workout!'
                    END,
                    profile_record.pulse_level,
                    COALESCE(profile_record.days_without_workout, 0),
                    has_worked_out_today,
                    COALESCE(active_friends, '[]'::jsonb)
                );
            END IF;
        END IF;
    END LOOP;
END;
$$; 