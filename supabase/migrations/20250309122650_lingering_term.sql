/*
  # Fix Friendship System

  1. Changes
    - Update RLS policies for friendships table
    - Add stored procedure for safely creating reciprocal friendships
    
  2. Security
    - Maintains row-level security
    - Ensures atomic reciprocal friendship creation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can read their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;

-- Create new policies
CREATE POLICY "Users can create their own friendships"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to safely create reciprocal friendships
CREATE OR REPLACE FUNCTION create_reciprocal_friendship(user1_id UUID, user2_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert both directions of the friendship
  INSERT INTO friendships (user_id, friend_id)
  VALUES 
    (user1_id, user2_id),
    (user2_id, user1_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$;