/*
  # Email Configuration Setup

  1. Changes
    - Add database settings for email configuration
    - Enable required extensions
    - Test email configuration
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to safely set database configuration
CREATE OR REPLACE FUNCTION set_config_if_not_exists(
  config_name text,
  default_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only set if not already set
  IF current_setting(config_name, true) IS NULL THEN
    EXECUTE format('ALTER DATABASE %I SET %I = %L', 
      current_database(), 
      config_name, 
      default_value
    );
  END IF;
END;
$$;

-- Set up email configuration
SELECT set_config_if_not_exists('app.resend_api_key', 'your_resend_api_key_here');
SELECT set_config_if_not_exists('app.webapp_url', 'http://localhost:3000');
SELECT set_config_if_not_exists('app.notification_webhook_url', 'https://api.resend.com/emails');

-- Function to test email configuration
CREATE OR REPLACE FUNCTION test_email_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  SELECT content::jsonb INTO response
  FROM net.http_post(
    url := current_setting('app.notification_webhook_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.resend_api_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Pulse <notifications@' || split_part(current_setting('app.webapp_url'), '//', 2) || '>',
      'to', 'test@example.com',
      'subject', 'Test Email Configuration',
      'html', '<p>This is a test email to verify the configuration.</p>'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email configuration test completed',
    'response', response
  );
END;
$$; 