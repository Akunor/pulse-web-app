/*
  # Initial Schema Setup for Pulse Fitness App

  1. New Tables
    - profiles
      - Stores user profile information
      - Links to Supabase auth.users
      - Tracks pulse level and streak data
    - friendships
      - Manages friend relationships between users
      - Bidirectional friendships (needs two entries for mutual friendship)
    - workouts
      - Records user workout sessions
      - Tracks duration, type, and calories burned

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Ensure users can only access their own data and their friends' basic info
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  pulse_level integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_workout_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create workouts table
CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration interval NOT NULL,
  calories integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to read their friends' profiles
CREATE POLICY "Users can read friends' profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = profiles.id)
    )
  );

-- Friendships policies
CREATE POLICY "Users can read their friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Workouts policies
CREATE POLICY "Users can read their own workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own workouts"
  ON workouts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to update pulse level and streak
CREATE OR REPLACE FUNCTION update_pulse_on_workout()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    pulse_level = LEAST(pulse_level + 5, 100),
    streak_days = streak_days + 1,
    last_workout_at = NEW.completed_at
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pulse level and streak when workout is added
CREATE TRIGGER workout_completed
  AFTER INSERT ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_on_workout();

-- Function to decay pulse level daily
CREATE OR REPLACE FUNCTION decay_pulse_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate days since last workout
  WITH days_since AS (
    SELECT 
      id,
      EXTRACT(DAY FROM (now() - last_workout_at)) as days
    FROM profiles
    WHERE last_workout_at IS NOT NULL
  )
  UPDATE profiles p
  SET 
    pulse_level = GREATEST(
      0, 
      pulse_level - (
        CASE 
          WHEN d.days <= 1 THEN 0
          WHEN d.days <= 3 THEN 5
          WHEN d.days <= 7 THEN 10
          ELSE 15
        END
      )
    )
  FROM days_since d
  WHERE p.id = d.id;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a daily trigger for pulse decay
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('0 0 * * *', $$SELECT decay_pulse_level()$$);