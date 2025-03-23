-- First, drop the default value if it exists
ALTER TABLE public.notification_queue 
  ALTER COLUMN active_users DROP DEFAULT;

-- Then change the type back to JSONB
ALTER TABLE public.notification_queue 
  ALTER COLUMN active_users TYPE JSONB 
  USING (CASE 
    WHEN active_users IS NULL THEN '0'::jsonb
    WHEN active_users::text ~ '^[0-9]+$' THEN active_users::text::jsonb
    ELSE '0'::jsonb
  END);

-- Finally, set the new default value as JSONB
ALTER TABLE public.notification_queue 
  ALTER COLUMN active_users SET DEFAULT '0'::jsonb; 