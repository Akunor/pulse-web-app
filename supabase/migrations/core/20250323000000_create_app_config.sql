-- Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to the table
COMMENT ON TABLE public.app_config IS 'Application configuration settings';

-- Add RLS policies
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow full access to service role
CREATE POLICY "Allow full access to service role"
  ON public.app_config
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert webapp URL
INSERT INTO public.app_config (key, value, description)
VALUES (
  'webapp_url',
  'https://main--join-pulse.netlify.app',
  'Base URL for the Pulse web application'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 