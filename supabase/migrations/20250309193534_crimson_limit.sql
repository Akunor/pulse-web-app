/*
  # Workout Notifications System

  1. New Functions
    - `send_workout_notification`: Sends workout notifications to users based on their last workout time
    - `process_workout_notifications`: Scheduled function to process notifications for all users

  2. Changes
    - Adds notification processing trigger that runs every hour
    - Uses existing profile data (timezone, last_workout_at) to determine notification timing

  3. Security
    - Functions run with security definer to ensure proper access to user data
*/

-- Function to send workout notifications
CREATE OR REPLACE FUNCTION send_workout_notification(
  user_profile profiles
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_time timestamp with time zone;
  last_workout_time timestamp with time zone;
  active_friends json;
  email_subject text;
  email_html text;
BEGIN
  -- Get user's local time
  user_time := NOW() AT TIME ZONE COALESCE(user_profile.timezone, 'UTC');
  last_workout_time := user_profile.last_workout_at AT TIME ZONE COALESCE(user_profile.timezone, 'UTC');
  
  -- Only send if it's around the same time as their last workout (±30 minutes)
  IF last_workout_time IS NOT NULL AND 
     ABS(EXTRACT(HOUR FROM user_time)::integer * 60 + EXTRACT(MINUTE FROM user_time)::integer - 
         EXTRACT(HOUR FROM last_workout_time)::integer * 60 - EXTRACT(MINUTE FROM last_workout_time)::integer) <= 30 THEN
    
    -- Get friends who worked out today
    WITH friend_workouts AS (
      SELECT 
        p.email,
        p.pulse_level,
        p.last_workout_at
      FROM friendships f
      JOIN profiles p ON p.id = f.friend_id
      WHERE f.user_id = user_profile.id
        AND DATE(p.last_workout_at AT TIME ZONE COALESCE(user_profile.timezone, 'UTC')) = 
            DATE(user_time)
    )
    SELECT json_agg(friend_workouts)
    INTO active_friends
    FROM friend_workouts;

    -- Check if user worked out today
    IF DATE(last_workout_time) = DATE(user_time) THEN
      email_subject := '🎉 Great job on your workout today!';
    ELSE
      email_subject := '💪 Time for your daily workout!';
    END IF;

    -- Build email HTML
    email_html := format(
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #E11D48; margin-bottom: 20px;">%s</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #334155; margin-bottom: 20px;">%s</p>
        <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #334155; margin-top: 0;">Your Stats</h2>
          <p style="margin: 0; color: #334155;">
            🔥 Pulse Level: <strong>%s</strong><br>
            📅 Days Without Workout: <strong>%s</strong>
          </p>
        </div>',
      CASE 
        WHEN DATE(last_workout_time) = DATE(user_time) THEN 'Congratulations!'
        ELSE 'Time to Exercise!'
      END,
      CASE 
        WHEN DATE(last_workout_time) = DATE(user_time) THEN 
          'You''ve already completed your workout for today. Keep up the great work!'
        ELSE 'It''s time for your daily workout! This is when you usually exercise.'
      END,
      user_profile.pulse_level,
      user_profile.days_without_workout
    );

    -- Add rest day warning if applicable
    IF user_profile.rest_day_used AND DATE(last_workout_time) != DATE(user_time) THEN
      email_html := email_html || 
        '<div style="background-color: #FEF2F2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #DC2626; margin-top: 0;">⚠️ Warning</h2>
          <p style="margin: 0; color: #DC2626;">
            Your Pulse is in danger of decaying since you''ve already used your rest day.
          </p>
        </div>';
    END IF;

    -- Add friends' activity if any
    IF active_friends IS NOT NULL AND json_array_length(active_friends) > 0 THEN
      email_html := email_html || 
        '<div style="background-color: #F0FDF4; padding: 15px; border-radius: 8px;">
          <h2 style="color: #334155; margin-top: 0;">Friends'' Activity Today</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">';
      
      FOR i IN 0..json_array_length(active_friends)-1 LOOP
        email_html := email_html || format(
          '<li style="margin-bottom: 10px; color: #334155;">
            ✅ %s (Pulse: %s)
          </li>',
          active_friends->i->>'email',
          active_friends->i->>'pulse_level'
        );
      END LOOP;

      email_html := email_html || '</ul></div>';
    END IF;

    -- Add footer
    email_html := email_html || 
      '<div style="margin-top: 30px; text-align: center; color: #64748B; font-size: 14px;">
        <p>Stay active and keep your Pulse high!</p>
      </div>
      </div>';

    -- Send email using pg_net
    PERFORM net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.resend_api_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'Pulse <notifications@pulse-fitness.app>',
        'to', user_profile.email,
        'subject', email_subject,
        'html', email_html
      )
    );
  END IF;
END;
$$;

-- Function to process notifications for all users
CREATE OR REPLACE FUNCTION process_workout_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile profiles;
BEGIN
  FOR user_profile IN SELECT * FROM profiles LOOP
    PERFORM send_workout_notification(user_profile);
  END LOOP;
END;
$$;

-- Schedule the notification processing to run every hour
SELECT cron.schedule(
  'process-workout-notifications',
  '0 * * * *', -- Every hour at minute 0
  'SELECT process_workout_notifications()'
);