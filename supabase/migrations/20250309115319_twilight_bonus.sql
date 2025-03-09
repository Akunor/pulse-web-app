/*
  # Update workouts table schema

  1. Changes
    - Make calories column nullable since it's no longer used
    - Update existing workout records to have null calories

  2. Security
    - No changes to RLS policies
*/

-- Make calories column nullable
ALTER TABLE workouts 
ALTER COLUMN calories DROP NOT NULL;

-- Update existing records to have null calories
UPDATE workouts 
SET calories = NULL;