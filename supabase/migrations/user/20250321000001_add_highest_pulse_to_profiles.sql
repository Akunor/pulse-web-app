-- Add highest_pulse field to profiles table
ALTER TABLE profiles ADD COLUMN highest_pulse INTEGER DEFAULT 0;

-- Update existing profiles with their current pulse level
UPDATE profiles
SET highest_pulse = pulse_level;

-- Add trigger to update highest_pulse when pulse is updated
CREATE OR REPLACE FUNCTION update_highest_pulse()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the profile's highest_pulse if the new pulse is higher
    UPDATE profiles
    SET highest_pulse = GREATEST(highest_pulse, NEW.pulse_level)
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_highest_pulse_trigger
    AFTER UPDATE OF pulse_level ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_highest_pulse();

-- Add comment to explain the field
COMMENT ON COLUMN profiles.highest_pulse IS 'The highest Pulse value achieved by the user'; 