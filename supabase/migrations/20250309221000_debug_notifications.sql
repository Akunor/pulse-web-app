/*
  # Add debugging to notification queueing

  1. Changes
    - Add debug_logs table for tracking notification processing
    - Update queue_user_notifications function with detailed logging
    - Fix time comparison to use preferred minutes
*/

-- Create debug logs table
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp timestamptz DEFAULT now(),
  function_name text,
  message text,
  details jsonb
);

-- Update the notification queueing function with debugging
CREATE OR REPLACE FUNCTION queue_user_notifications()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  user_local_time timestamp with time zone;
  preferred_minute integer;
  current_minute integer;
  minute_diff integer;
BEGIN
  -- Log function start
  INSERT INTO debug_logs (function_name, message)
  VALUES ('queue_user_notifications', 'Starting function execution');
  
  -- Loop through users with notifications enabled, joining with notification_settings
  FOR user_record IN 
    SELECT 
      p.id,
      p.email,
      p.timezone,
      p.pulse_level,
      p.last_workout_at,
      p.streak_days,
      ns.preferred_time,
      (SELECT COUNT(*) FROM profiles WHERE last_workout_at > NOW() - INTERVAL '24 hours') as active_user_count
    FROM profiles p
    JOIN notification_settings ns ON ns.user_id = p.id
    WHERE ns.enabled = true
  LOOP
    -- Log user being processed
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'queue_user_notifications',
      'Processing user',
      jsonb_build_object(
        'email', user_record.email,
        'timezone', user_record.timezone,
        'preferred_time', user_record.preferred_time,
        'active_user_count', user_record.active_user_count,
        'streak_days', user_record.streak_days
      )
    );
    
    -- Get user's local time
    user_local_time := NOW() AT TIME ZONE COALESCE(user_record.timezone, 'UTC');
    
    -- Calculate minute difference
    preferred_minute := EXTRACT(HOUR FROM user_record.preferred_time) * 60 + EXTRACT(MINUTE FROM user_record.preferred_time);
    current_minute := EXTRACT(HOUR FROM user_local_time) * 60 + EXTRACT(MINUTE FROM user_local_time);
    minute_diff := ABS(current_minute - preferred_minute);
    
    -- Log time comparisons
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'queue_user_notifications',
      'Time comparison details',
      jsonb_build_object(
        'user_local_time', user_local_time,
        'current_minute', current_minute,
        'preferred_minute', preferred_minute,
        'minute_diff', minute_diff,
        'window_size', 5
      )
    );
    
    -- Check if it's within 5 minutes of notification time (±5 minute window)
    IF minute_diff <= 5 THEN
      -- Log notification attempt
      INSERT INTO debug_logs (function_name, message, details)
      VALUES (
        'queue_user_notifications',
        'Attempting to queue notification',
        jsonb_build_object('email', user_record.email)
      );
      
      -- Insert notification into queue if not already queued for today
      INSERT INTO notification_queue (
        user_id,
        email,
        subject,
        has_worked_out,
        pulse_level,
        active_users,
        streak
      )
      SELECT
        user_record.id,
        user_record.email,
        'Your Daily Pulse Update',
        user_record.last_workout_at > NOW() - INTERVAL '24 hours',
        user_record.pulse_level,
        to_jsonb(user_record.active_user_count),
        user_record.streak_days
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_queue
        WHERE user_id = user_record.id
        AND DATE(created_at) = CURRENT_DATE
      );
      
      -- Log notification result
      IF FOUND THEN
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
          'queue_user_notifications',
          'Successfully queued notification',
          jsonb_build_object('email', user_record.email)
        );
      ELSE
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
          'queue_user_notifications',
          'Did not queue notification (possible duplicate)',
          jsonb_build_object('email', user_record.email)
        );
      END IF;
    ELSE
      -- Log why notification was not sent
      INSERT INTO debug_logs (function_name, message, details)
      VALUES (
        'queue_user_notifications',
        'Not notification time for user',
        jsonb_build_object(
          'email', user_record.email,
          'minute_diff', minute_diff,
          'within_window', minute_diff <= 5,
          'window_size', 5
        )
      );
    END IF;
  END LOOP;
  
  -- Log function end
  INSERT INTO debug_logs (function_name, message)
  VALUES ('queue_user_notifications', 'Function execution completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view to easily read the debug logs
CREATE OR REPLACE VIEW debug_log_view AS
SELECT 
  timestamp,
  function_name,
  message,
  details
FROM debug_logs
ORDER BY timestamp DESC; 