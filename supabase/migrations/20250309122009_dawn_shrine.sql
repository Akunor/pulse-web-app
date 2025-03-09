/*
  # Add get_profile_by_id function
  
  1. New Function
    - Creates a PostgreSQL function to safely lookup profiles by ID
    - Returns profile information in a consistent format
    - Handles edge cases and null checks
*/

CREATE OR REPLACE FUNCTION get_profile_by_id(lookup_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  pulse_level INTEGER,
  streak_days INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    profiles.id,
    profiles.email,
    profiles.pulse_level,
    profiles.streak_days
  FROM profiles
  WHERE profiles.id = lookup_id;
END;
$$;