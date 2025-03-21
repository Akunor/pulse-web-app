-- Document existing database objects that initally existed in the database before any migrations that were run.
-- This migration adds documentation comments to all existing tables and functions

-- First, remove any existing comments to prevent conflicts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Remove comments from tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('COMMENT ON TABLE public.%I IS NULL', r.tablename);
    END LOOP;

    -- Remove comments from columns
    FOR r IN (SELECT table_name, column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public') LOOP
        EXECUTE format('COMMENT ON COLUMN public.%I.%I IS NULL', r.table_name, r.column_name);
    END LOOP;

    -- Remove comments from functions
    FOR r IN (SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
              FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public') LOOP
        EXECUTE format('COMMENT ON FUNCTION public.%I(%s) IS NULL', r.proname, r.args);
    END LOOP;

    -- Remove comments from views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE format('COMMENT ON VIEW public.%I IS NULL', r.viewname);
    END LOOP;

    -- Remove comments from indexes
    FOR r IN (SELECT tablename, indexname 
              FROM pg_indexes 
              WHERE schemaname = 'public') LOOP
        EXECUTE format('COMMENT ON INDEX %I IS NULL', r.indexname);
    END LOOP;

    -- Remove comments from triggers
    FOR r IN (SELECT tgname, relname 
              FROM pg_trigger t
              JOIN pg_class c ON t.tgrelid = c.oid
              WHERE c.relnamespace = 'public'::regnamespace) LOOP
        EXECUTE format('COMMENT ON TRIGGER %I ON public.%I IS NULL', r.tgname, r.relname);
    END LOOP;

    -- Remove comments from policies
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') LOOP
        EXECUTE format('COMMENT ON POLICY %I ON public.%I IS NULL', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Now add the new documentation

-- Tables Documentation
COMMENT ON TABLE public.custom_workouts IS 'Stores user-created custom workout templates with their basic information';
COMMENT ON TABLE public.debug_logs IS 'System logging table for debugging and monitoring function execution';
COMMENT ON TABLE public.friendships IS 'Manages user friendship relationships and connections';
COMMENT ON TABLE public.notification_queue IS 'Queue for managing email notifications with user engagement metrics';
COMMENT ON TABLE public.notification_settings IS 'User preferences for notification timing and delivery';
COMMENT ON TABLE public.profiles IS 'Extended user profile information including engagement metrics and preferences';
COMMENT ON TABLE public.rest_days IS 'Tracks user rest days and recovery periods';
COMMENT ON TABLE public.workouts IS 'Records completed workout sessions with performance metrics';

-- Column Documentation for Profiles Table
COMMENT ON COLUMN public.profiles.id IS 'Primary key, references auth.users.id';
COMMENT ON COLUMN public.profiles.email IS 'User email address';
COMMENT ON COLUMN public.profiles.pulse_level IS 'User engagement level metric';
COMMENT ON COLUMN public.profiles.streak_days IS 'Consecutive days of workout activity';
COMMENT ON COLUMN public.profiles.last_workout_at IS 'Timestamp of most recent workout';
COMMENT ON COLUMN public.profiles.timezone IS 'User local timezone for notification timing';
COMMENT ON COLUMN public.profiles.rest_day_used IS 'Flag indicating if rest day has been used';
COMMENT ON COLUMN public.profiles.last_rest_day_at IS 'Timestamp of most recent rest day';

-- Column Documentation for Workouts Table
COMMENT ON COLUMN public.workouts.id IS 'Primary key';
COMMENT ON COLUMN public.workouts.user_id IS 'Reference to user who completed the workout';
COMMENT ON COLUMN public.workouts.name IS 'Name or description of the workout';
COMMENT ON COLUMN public.workouts.duration IS 'Duration of the workout in minutes';
COMMENT ON COLUMN public.workouts.calories IS 'Estimated calories burned';
COMMENT ON COLUMN public.workouts.completed_at IS 'Timestamp when workout was completed';

-- Column Documentation for Notification Queue Table
COMMENT ON COLUMN public.notification_queue.id IS 'Primary key';
COMMENT ON COLUMN public.notification_queue.user_id IS 'Reference to user receiving notification';
COMMENT ON COLUMN public.notification_queue.email IS 'Email address for notification delivery';
COMMENT ON COLUMN public.notification_queue.pulse_level IS 'Current user engagement level';
COMMENT ON COLUMN public.notification_queue.streak IS 'Current workout streak';
COMMENT ON COLUMN public.notification_queue.has_worked_out IS 'Flag indicating recent workout activity';
COMMENT ON COLUMN public.notification_queue.is_new_user IS 'Flag for new user status';
COMMENT ON COLUMN public.notification_queue.active_users IS 'Count of active users in network';

-- Column Documentation for Notification Settings Table
COMMENT ON COLUMN public.notification_settings.user_id IS 'Primary key, references auth.users.id';
COMMENT ON COLUMN public.notification_settings.preferred_time IS 'User preferred notification time';
COMMENT ON COLUMN public.notification_settings.enabled IS 'Flag for notification preferences';
COMMENT ON COLUMN public.notification_settings.created_at IS 'Timestamp of settings creation';
COMMENT ON COLUMN public.notification_settings.updated_at IS 'Timestamp of last settings update';

-- Column Documentation for Rest Days Table
COMMENT ON COLUMN public.rest_days.id IS 'Primary key';
COMMENT ON COLUMN public.rest_days.user_id IS 'Reference to user taking rest day';
COMMENT ON COLUMN public.rest_days.date IS 'Date of rest day';
COMMENT ON COLUMN public.rest_days.created_at IS 'Timestamp of rest day record creation';

-- Column Documentation for Debug Logs Table
COMMENT ON COLUMN public.debug_logs.id IS 'Primary key';
COMMENT ON COLUMN public.debug_logs.timestamp IS 'Time of log entry';
COMMENT ON COLUMN public.debug_logs.function_name IS 'Name of function generating log';
COMMENT ON COLUMN public.debug_logs.message IS 'Log message content';
COMMENT ON COLUMN public.debug_logs.details IS 'Additional log details in JSON format';

-- Column Documentation for Friendships Table
COMMENT ON COLUMN public.friendships.id IS 'Primary key';
COMMENT ON COLUMN public.friendships.user_id IS 'Reference to primary user';
COMMENT ON COLUMN public.friendships.friend_id IS 'Reference to friend user';
COMMENT ON COLUMN public.friendships.created_at IS 'Timestamp of friendship creation';

-- Column Documentation for Custom Workouts Table
COMMENT ON COLUMN public.custom_workouts.id IS 'Primary key';
COMMENT ON COLUMN public.custom_workouts.user_id IS 'Reference to user who created the workout';
COMMENT ON COLUMN public.custom_workouts.name IS 'Name of the custom workout';
COMMENT ON COLUMN public.custom_workouts.duration IS 'Expected duration in minutes';
COMMENT ON COLUMN public.custom_workouts.created_at IS 'Timestamp of workout template creation';

-- Functions Documentation
COMMENT ON FUNCTION public.create_notification_settings() IS 'Trigger function that automatically creates notification settings for new users. Called after a new user is created in auth.users.';
COMMENT ON FUNCTION public.create_reciprocal_friendship(user1_id uuid, user2_id uuid) IS 'Creates a two-way friendship relationship between two users. Inserts records in both directions (user1->user2 and user2->user1) to ensure reciprocal friendship. Handles conflicts gracefully by ignoring duplicate entries.';
COMMENT ON FUNCTION public.decay_pulse_levels() IS 'Scheduled function that manages user pulse levels and rest days. Runs at midnight in each user''s timezone to: 1) Apply pulse level decay based on days since last workout (-1 to -7 points), 2) Handle rest day usage and reset, 3) Record rest days in the rest_days table, 4) Reset rest day usage weekly on Mondays. Respects user timezones for all calculations.';
COMMENT ON FUNCTION public.delete_user_account(user_id uuid) IS 'Completely removes a user account and all associated data. Executes in a transaction to ensure atomicity. Deletes data from: notification_queue, notification_settings, workouts, profiles, and auth.users. Returns boolean indicating success/failure. Handles rollback on any error.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function that creates a new user profile when a user signs up. Initializes profile with default values: pulse_level=0, streak_days=0, timezone=UTC. Handles conflicts by updating email if profile already exists. Logs errors but continues execution to prevent signup failure.';
COMMENT ON FUNCTION public.queue_user_notifications() IS 'Scheduled function that queues daily notifications for users. Processes users with notifications enabled, respecting their timezone and preferred notification time (±5 minute window). Includes user metrics (pulse_level, streak_days, active_users) and workout status. Prevents duplicate notifications within 24 hours. Comprehensive debug logging for monitoring execution.';
COMMENT ON FUNCTION public.update_pulse_on_workout() IS 'Trigger function that updates user metrics when a workout is completed. Only processes first workout of the day: 1) Increments pulse_level by 1 (uncapped), 2) Updates streak_days (increments if consecutive days, resets to 1 if gap), 3) Updates last_workout_at timestamp, 4) Resets rest_day_used flag and last_rest_day_at. Prevents duplicate processing for multiple workouts on same day.';

-- Views Documentation
COMMENT ON VIEW public.debug_log_view IS 'Summary view of debug_log table';

-- Indexes Documentation

-- Triggers Documentation
COMMENT ON TRIGGER "workout_completed" ON public.workouts IS 'Updates the Pulse of the user and associated values when they log a workout';
COMMENT ON TRIGGER "create_notification_settings_trigger" ON public.profiles IS 'Creates notification settings for new users';

-- Policies Documentation
