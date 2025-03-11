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
    ON CONFLICT (key) DO NOTHING;
  END IF;
END;
$$;

-- Store configuration from environment variables
SELECT set_config_if_not_exists(
  'resend_api_key',
  COALESCE(
    current_setting('app.settings.resend_api_key', true),
    'PLEASE_SET_RESEND_API_KEY_IN_ENV'
  )
);

SELECT set_config_if_not_exists(
  'webapp_url', 
  COALESCE(
    current_setting('app.settings.webapp_url', true),
    'https://pulse-fitness.app'
  )
); 