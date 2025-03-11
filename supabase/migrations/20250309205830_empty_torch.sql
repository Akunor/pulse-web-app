-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notification_queue;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notification_queue;

-- Create notification queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  subject text NOT NULL,
  is_new_user boolean DEFAULT false,
  has_worked_out boolean DEFAULT false,
  pulse_level integer,
  active_users integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_queue
CREATE POLICY "Users can insert their own notifications"
  ON notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own notifications"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);