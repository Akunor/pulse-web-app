-- Create app configuration table
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system to read config
CREATE POLICY "System can read config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to safely set configuration
CREATE OR REPLACE FUNCTION set_config_if_not_exists(
  config_key text,
  default_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO app_config (key, value)
  VALUES (config_key, default_value)
  ON CONFLICT (key) DO NOTHING;
END;
$$;

-- Set up email configuration
SELECT set_config_if_not_exists('webapp_url', current_setting('app.webapp_url', true));
SELECT set_config_if_not_exists('resend_api_key', current_setting('app.resend_api_key', true)); 