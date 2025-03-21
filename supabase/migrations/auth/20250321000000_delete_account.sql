-- Drop existing function first
DROP FUNCTION IF EXISTS delete_user_account(UUID);

-- Function to delete a user's account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success BOOLEAN;
BEGIN
    -- Start transaction
    BEGIN
        -- Delete notification queue entries
        DELETE FROM public.notification_queue WHERE user_id = $1;
        
        -- Delete notification settings
        DELETE FROM public.notification_settings WHERE user_id = $1;
        
        -- Delete workouts
        DELETE FROM public.workouts WHERE user_id = $1;
        
        -- Delete profile
        DELETE FROM public.profiles WHERE id = $1;
        
        -- Delete the user from auth.users
        DELETE FROM auth.users WHERE id = $1;
        
        success := TRUE;
    EXCEPTION WHEN OTHERS THEN
        -- Rollback transaction on error
        RAISE;
        success := FALSE;
    END;
    
    RETURN success;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add comment to function
COMMENT ON FUNCTION delete_user_account IS 'Deletes a user account and all associated data. Returns true if successful, false otherwise.'; 