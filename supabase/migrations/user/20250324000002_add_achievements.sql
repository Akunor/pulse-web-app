-- Create achievements table
CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    milestone INTEGER NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, milestone)
);

-- Create achievement types enum
CREATE TYPE achievement_type AS ENUM (
    'pulse_rookie',
    'pulse_warrior',
    'pulse_master',
    'pulse_legend',
    'pulse_champion',
    'pulse_elite'
);

-- Add achievement metadata table
CREATE TABLE achievement_metadata (
    type achievement_type PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    required_pulse INTEGER NOT NULL,
    badge_icon TEXT NOT NULL,
    color_theme TEXT NOT NULL
);

-- Insert achievement metadata
INSERT INTO achievement_metadata (type, name, description, required_pulse, badge_icon, color_theme) VALUES
    ('pulse_rookie', 'Pulse Rookie', 'Reach 25 Pulse', 25, '🌟', 'from-blue-500 to-blue-600'),
    ('pulse_warrior', 'Pulse Warrior', 'Reach 50 Pulse', 50, '⚔️', 'from-purple-500 to-purple-600'),
    ('pulse_master', 'Pulse Master', 'Reach 100 Pulse', 100, '👑', 'from-yellow-500 to-yellow-600'),
    ('pulse_legend', 'Pulse Legend', 'Reach 250 Pulse', 250, '🏆', 'from-orange-500 to-orange-600'),
    ('pulse_champion', 'Pulse Champion', 'Reach 500 Pulse', 500, '💫', 'from-red-500 to-red-600'),
    ('pulse_elite', 'Pulse Elite', 'Reach 1000 Pulse', 1000, '⭐', 'from-rose-500 to-rose-600');

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER AS $$
DECLARE
    achievement_type achievement_type;
BEGIN
    -- Check each achievement level
    FOR achievement_type IN SELECT type FROM achievement_metadata ORDER BY required_pulse ASC
    LOOP
        -- Check if user has already earned this achievement
        IF NOT EXISTS (
            SELECT 1 FROM achievements 
            WHERE user_id = NEW.id AND milestone = (
                SELECT required_pulse FROM achievement_metadata WHERE type = achievement_type
            )
        ) THEN
            -- Check if user has reached the required pulse
            IF NEW.pulse_level >= (
                SELECT required_pulse FROM achievement_metadata WHERE type = achievement_type
            ) THEN
                -- Award the achievement
                INSERT INTO achievements (user_id, milestone)
                VALUES (NEW.id, (
                    SELECT required_pulse FROM achievement_metadata WHERE type = achievement_type
                ));
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check achievements when pulse is updated
CREATE TRIGGER check_achievements_trigger
    AFTER UPDATE OF pulse_level ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_achievements();

-- Add comment to explain the tables
COMMENT ON TABLE achievements IS 'Tracks user achievements and milestones';
COMMENT ON TABLE achievement_metadata IS 'Contains metadata for different achievement types'; 