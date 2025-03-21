-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading all profiles
CREATE POLICY "Allow reading all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Allow users to insert own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy to allow users to delete their own profile
CREATE POLICY "Allow users to delete own profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id); 