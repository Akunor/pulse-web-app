-- Add AWS SES configuration to app_config if not exists
INSERT INTO app_config (key, value) VALUES 
('aws_ses_region', 'us-east-1'),
('aws_ses_access_key', 'YOUR_AWS_ACCESS_KEY'),
('aws_ses_secret_key', 'YOUR_AWS_SECRET_KEY'),
('aws_ses_source_email', 'notifications@your-verified-domain.com')
ON CONFLICT (key) DO NOTHING;

-- Create a function to send emails via AWS SES
CREATE OR REPLACE FUNCTION send_ses_email(
  to_email text,
  subject text,
  html_body text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aws_region text;
  aws_access_key text;
  aws_secret_key text;
  source_email text;
  aws_endpoint text;
  date_header text;
  timestamp text;
  canonical_request text;
  string_to_sign text;
  signature text;
  authorization_header text;
  response text;
BEGIN
  -- Get AWS credentials from app_config
  SELECT value INTO aws_region FROM app_config WHERE key = 'aws_ses_region';
  SELECT value INTO aws_access_key FROM app_config WHERE key = 'aws_ses_access_key';
  SELECT value INTO aws_secret_key FROM app_config WHERE key = 'aws_ses_secret_key';
  SELECT value INTO source_email FROM app_config WHERE key = 'aws_ses_source_email';
  
  -- Set AWS SES endpoint
  aws_endpoint := 'https://email.' || aws_region || '.amazonaws.com';
  
  -- Generate AWS SES API request headers
  timestamp := to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"');
  date_header := to_char(now() at time zone 'UTC', 'YYYYMMDD');
  
  -- Make AWS SES API request
  SELECT content::text INTO response
  FROM net.http_post(
    url := aws_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/x-www-form-urlencoded',
      'Host', 'email.' || aws_region || '.amazonaws.com',
      'X-Amz-Date', timestamp,
      'Authorization', format(
        'AWS4-HMAC-SHA256 Credential=%s/%s/ses/aws4_request, SignedHeaders=host;x-amz-date, Signature=%s',
        aws_access_key,
        date_header,
        signature
      )
    ),
    body := format(
      'Action=SendEmail&Source=%s&Destination.ToAddresses.member.1=%s&Message.Subject.Data=%s&Message.Body.Html.Data=%s',
      source_email,
      to_email,
      subject,
      html_body
    )
  );
  
  RETURN response;
END;
$$;

-- Create the production notification processor using AWS SES
CREATE OR REPLACE FUNCTION process_notification_queue_ses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification RECORD;
  webapp_url text;
  ses_response text;
BEGIN
  -- Get the webapp URL from app_config
  SELECT value INTO webapp_url FROM app_config WHERE key = 'webapp_url';

  -- Process each unprocessed notification
  FOR notification IN
    SELECT * FROM notification_queue
    WHERE processed_at IS NULL
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Send email using AWS SES
      SELECT send_ses_email(
        notification.email,
        notification.subject,
        CASE 
          WHEN notification.is_new_user THEN
            '<p>Welcome to Pulse Fitness! 🎉</p>' ||
            '<p>We''re excited to have you join our community. Get started by setting up your profile and tracking your first workout.</p>' ||
            '<p><a href="' || webapp_url || '">Visit Pulse Fitness</a></p>'
          ELSE
            '<p>Hey there! 👋</p>' ||
            CASE 
              WHEN notification.has_worked_out THEN
                '<p>Great job on working out today! 💪 Your current Pulse level is ' || notification.pulse_level || '.</p>'
              ELSE
                '<p>Don''t forget to get your workout in today! ' || 
                CASE 
                  WHEN notification.active_users > 0 THEN
                    notification.active_users || ' of your friends have already worked out today. '
                  ELSE ''
                  END ||
                'Keep your streak going!</p>'
            END ||
            '<p><a href="' || webapp_url || '">Log your workout now</a></p>'
          END
      ) INTO ses_response;

      -- Update notification as processed
      UPDATE notification_queue
      SET 
        processed_at = now(),
        error = CASE 
          WHEN ses_response LIKE '%<MessageId>%' THEN NULL
          ELSE ses_response
        END
      WHERE id = notification.id;

      -- Small delay to avoid rate limiting
      PERFORM pg_sleep(0.1);
    EXCEPTION WHEN OTHERS THEN
      -- Update notification with error
      UPDATE notification_queue
      SET 
        processed_at = now(),
        error = SQLERRM
      WHERE id = notification.id;
    END;
  END LOOP;
END;
$$;

-- Update the cron job to use the SES processor
SELECT cron.schedule(
  'process-notifications-ses',
  '* * * * *',
  'SELECT process_notification_queue_ses()'
); 