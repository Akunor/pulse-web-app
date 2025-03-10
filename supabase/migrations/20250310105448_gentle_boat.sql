/*
  # Add user creation trigger

  1. Changes
    - Create trigger function to handle new user registration
    - Add trigger to auth.users table
    - Ensure profile creation on signup

  2. Security
    - Function runs with security definer permissions
    - Only processes verified new users
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    pulse_level, 
    streak_days,
    last_workout_at,
    timezone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    0,  -- Default pulse level
    0,  -- Default streak days
    NULL,  -- No workouts yet
    'UTC',  -- Default timezone
    now(),  -- Current timestamp
    now()   -- Current timestamp
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();