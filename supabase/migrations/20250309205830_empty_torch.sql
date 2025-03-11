-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notification_queue;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notification_queue;

-- Create notification queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  subject text NOT NULL,
  is_new_user boolean DEFAULT false,
  has_worked_out boolean DEFAULT false,
  pulse_level integer,
  active_users integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

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

-- Add rest_day_used column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rest_day_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_rest_day_at timestamptz;

-- Function to check if it's midnight in a timezone
CREATE OR REPLACE FUNCTION is_midnight_in_timezone(check_timezone text)
RETURNS boolean AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM NOW() AT TIME ZONE check_timezone) = 0 
    AND EXTRACT(MINUTE FROM NOW() AT TIME ZONE check_timezone) BETWEEN 0 AND 59;
END;
$$ LANGUAGE plpgsql;

-- Function to handle workout completion
CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
DECLARE
  last_workout_date DATE;
  workout_today BOOLEAN;
BEGIN
  -- Check if there was already a workout today
  SELECT EXISTS (
    SELECT 1 
    FROM workouts 
    WHERE user_id = NEW.user_id 
    AND DATE(completed_at) = DATE(NEW.completed_at)
    AND id != NEW.id
  ) INTO workout_today;

  -- Only proceed if this is the first workout of the day
  IF NOT workout_today THEN
    -- Get the date of the last workout
    SELECT DATE(completed_at)
    INTO last_workout_date
    FROM workouts
    WHERE user_id = NEW.user_id
    AND DATE(completed_at) < DATE(NEW.completed_at)
    ORDER BY completed_at DESC
    LIMIT 1;

    -- Update profile
    UPDATE profiles
    SET 
      -- Increment pulse by 1 (no cap)
      pulse_level = pulse_level + 1,
      -- Update streak
      streak_days = CASE
        WHEN last_workout_date = DATE(NEW.completed_at - INTERVAL '1 day') THEN streak_days + 1
        ELSE 1
      END,
      -- Update last workout time
      last_workout_at = NEW.completed_at,
      -- Reset rest day when they work out
      rest_day_used = false,
      last_rest_day_at = NULL
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for workout completion
DROP TRIGGER IF EXISTS workout_completed ON workouts;
CREATE TRIGGER workout_completed
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_on_workout();

-- Function to decay pulse levels
CREATE OR REPLACE FUNCTION decay_pulse_levels()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  user_local_time timestamp with time zone;
  days_since_workout integer;
BEGIN
  -- Loop through all users
  FOR user_record IN 
    SELECT 
      id, 
      timezone, 
      last_workout_at, 
      pulse_level,
      rest_day_used
    FROM profiles 
  LOOP
    -- Get user's local time
    user_local_time := NOW() AT TIME ZONE COALESCE(user_record.timezone, 'UTC');
    
    -- Only process if it's midnight in user's timezone
    IF EXTRACT(HOUR FROM user_local_time) = 0 THEN
      -- Calculate days since last workout
      IF user_record.last_workout_at IS NOT NULL THEN
        days_since_workout := 
          EXTRACT(DAY FROM (user_local_time - user_record.last_workout_at));
      ELSE
        days_since_workout := 1; -- If never worked out, start decay
      END IF;

      -- Apply decay if no workout today and not using rest day
      IF days_since_workout > 0 THEN
        -- Check if user can use a rest day
        IF NOT user_record.rest_day_used THEN
          -- Use rest day
          UPDATE profiles
          SET rest_day_used = true
          WHERE id = user_record.id;
        ELSE
          -- Apply decay
          UPDATE profiles
          SET pulse_level = GREATEST(0, pulse_level - 
            CASE 
              WHEN days_since_workout <= 1 THEN 1  -- First day: -1
              WHEN days_since_workout <= 3 THEN 3  -- 2-3 days: -3
              WHEN days_since_workout <= 7 THEN 5  -- 4-7 days: -5
              ELSE 7                               -- 8+ days: -7
            END)
          WHERE id = user_record.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the decay function to run every hour
SELECT cron.schedule(
  'decay-pulse-levels',  -- unique job name
  '0 * * * *',          -- run at the start of every hour
  'SELECT decay_pulse_levels()'
);