-- Create app configuration table for non-sensitive settings
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "System can read config" ON app_config;

-- Create policy to allow system to read config
CREATE POLICY "System can read config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to safely set configuration
CREATE OR REPLACE FUNCTION set_config_if_not_exists(
  config_key text,
  config_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF config_value IS NOT NULL THEN
    INSERT INTO app_config (key, value)
    VALUES (config_key, config_value)
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = now()
    WHERE app_config.value = 'PLEASE_SET_RESEND_API_KEY_IN_ENV' 
       OR app_config.value = 'https://pulse-fitness.app';
  END IF;
END;
$$;

-- Store configuration values directly
SELECT set_config_if_not_exists(
  'resend_api_key',
  'YOUR_RESEND_API_KEY_HERE'  -- Replace this with your actual Resend API key
);

SELECT set_config_if_not_exists(
  'webapp_url', 
  'YOUR_WEBAPP_URL_HERE'  -- Replace this with your actual webapp URL
); 