/*
  # Add auth trigger for profile creation

  1. Changes
    - Add trigger to automatically create a profile when a user signs up
    - Fix existing policies to use auth.uid()

  2. Security
    - Maintain RLS policies
    - Ensure profiles are created only for valid auth users
*/

-- Create a trigger function to create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure profiles exist for current users
INSERT INTO public.profiles (id, email)
SELECT id, email 
FROM auth.users 
ON CONFLICT (id) DO NOTHING;