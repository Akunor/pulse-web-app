-- Update queue_user_notifications function to count only active friends
-- This migration modifies the active_users count to only include friends who have worked out in the last 24 hours
-- instead of all users in the system. This provides more relevant social context to each user.

-- First, add documentation for the updated function
COMMENT ON FUNCTION public.queue_user_notifications() IS 'Scheduled function that queues daily notifications for users. Processes users with notifications enabled, respecting their timezone and preferred notification time (±5 minute window). Includes user metrics (pulse_level, streak_days, active_friend_count) and workout status. Counts only friends who have worked out in the last 24 hours for social context. Prevents duplicate notifications within 24 hours. Comprehensive debug logging for monitoring execution.';

-- Update the function implementation
CREATE OR REPLACE FUNCTION queue_user_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  user_local_time timestamp with time zone;
  preferred_minute integer;
  current_minute integer;
  minute_diff integer;
  active_friend_count integer;
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
      ns.preferred_time
    FROM profiles p
    JOIN notification_settings ns ON ns.user_id = p.id
    WHERE ns.enabled = true
  LOOP
    -- Get count of active friends for this user (friends who worked out in last 24 hours)
    SELECT COUNT(*)
    INTO active_friend_count
    FROM friendships f
    JOIN profiles p ON p.id = f.friend_id
    WHERE f.user_id = user_record.id
    AND p.last_workout_at > NOW() - INTERVAL '24 hours';
    
    -- Log active friend count calculation
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'queue_user_notifications',
      'Active friend count calculation',
      jsonb_build_object(
        'email', user_record.email,
        'active_friend_count', active_friend_count,
        'active_friend_count_type', pg_typeof(active_friend_count)::text,
        'query_result', (
          SELECT jsonb_build_object(
            'count', COUNT(*),
            'friend_ids', array_agg(p.id),
            'last_workouts', array_agg(p.last_workout_at)
          )
          FROM friendships f
          JOIN profiles p ON p.id = f.friend_id
          WHERE f.user_id = user_record.id
          AND p.last_workout_at > NOW() - INTERVAL '24 hours'
        )
      )
    );
    
    -- Log user being processed
    INSERT INTO debug_logs (function_name, message, details)
    VALUES (
      'queue_user_notifications',
      'Processing user',
      jsonb_build_object(
        'email', user_record.email,
        'timezone', user_record.timezone,
        'preferred_time', user_record.preferred_time,
        'active_friend_count', active_friend_count,
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
      -- Log notification attempt with active friend count
      INSERT INTO debug_logs (function_name, message, details)
      VALUES (
        'queue_user_notifications',
        'Attempting to queue notification',
        jsonb_build_object(
          'email', user_record.email,
          'active_friend_count', active_friend_count,
          'active_friend_count_type', pg_typeof(active_friend_count)::text
        )
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
        COALESCE(
          DATE(user_record.last_workout_at AT TIME ZONE COALESCE(user_record.timezone, 'UTC')) = 
          DATE(NOW() AT TIME ZONE COALESCE(user_record.timezone, 'UTC')),
          false
        ),
        user_record.pulse_level,
        to_jsonb(COALESCE(active_friend_count, 0)),  -- Convert to JSONB
        user_record.streak_days
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_queue
        WHERE user_id = user_record.id
        AND DATE(created_at AT TIME ZONE COALESCE(user_record.timezone, 'UTC')) = 
            DATE(NOW() AT TIME ZONE COALESCE(user_record.timezone, 'UTC'))
      );
      
      -- Log notification result with active friend count
      IF FOUND THEN
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
          'queue_user_notifications',
          'Successfully queued notification',
          jsonb_build_object(
            'email', user_record.email,
            'active_friend_count', active_friend_count,
            'active_friend_count_type', pg_typeof(active_friend_count)::text
          )
        );
      ELSE
        INSERT INTO debug_logs (function_name, message, details)
        VALUES (
          'queue_user_notifications',
          'Did not queue notification (possible duplicate)',
          jsonb_build_object(
            'email', user_record.email,
            'active_friend_count', active_friend_count,
            'active_friend_count_type', pg_typeof(active_friend_count)::text
          )
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
$$; 