/*
  # Update Friendship RLS Policies

  1. Changes
    - Update RLS policy for friendships table to allow reciprocal friendship creation
    - Allow users to create friendships where they are either the user_id or friend_id
    
  2. Security
    - Maintains row-level security while enabling reciprocal friendships
    - Users can still only read their own friendships
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create their own friendships" ON friendships;

-- Create new insert policy that allows reciprocal friendships
CREATE POLICY "Users can create friendships"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR 
    (
      -- Allow reciprocal friendship creation only if the user is being added as a friend
      auth.uid() = friend_id AND 
      EXISTS (
        SELECT 1 FROM friendships 
        WHERE user_id = friend_id 
        AND friend_id = user_id
      )
    )
  );