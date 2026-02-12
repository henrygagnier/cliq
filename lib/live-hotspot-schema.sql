-- Live Hotspot Features Schema
-- Run this in your Supabase SQL Editor

-- ========================================
-- ACTIVE HOTSPOT USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS active_hotspot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotspot_id TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT,
  location_detail TEXT,
  is_friend BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, hotspot_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_hotspot_users_hotspot_id 
  ON active_hotspot_users(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_active_hotspot_users_user_id 
  ON active_hotspot_users(user_id);
CREATE INDEX IF NOT EXISTS idx_active_hotspot_users_last_seen 
  ON active_hotspot_users(last_seen DESC);

-- Enable Row Level Security
ALTER TABLE active_hotspot_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active users in hotspots"
  ON active_hotspot_users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own presence"
  ON active_hotspot_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
  ON active_hotspot_users FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
  ON active_hotspot_users FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- HOTSPOT MESSAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS hotspot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  avatar TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotspot_messages_hotspot_id 
  ON hotspot_messages(hotspot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotspot_messages_user_id 
  ON hotspot_messages(user_id);

-- Enable RLS
ALTER TABLE hotspot_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view messages in hotspots they're in"
  ON hotspot_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON hotspot_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- HOTSPOT REACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS hotspot_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotspot_reactions_hotspot_id 
  ON hotspot_reactions(hotspot_id, created_at DESC);

-- Enable RLS
ALTER TABLE hotspot_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
  ON hotspot_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reactions"
  ON hotspot_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- HOTSPOT ACTIVITY FEED TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS hotspot_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'join', 'spike', 'milestone', 'moment'
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hotspot_activity_feed_hotspot_id 
  ON hotspot_activity_feed(hotspot_id, created_at DESC);

-- Enable RLS
ALTER TABLE hotspot_activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view activity feed"
  ON hotspot_activity_feed FOR SELECT
  USING (true);

CREATE POLICY "System can insert activity feed items"
  ON hotspot_activity_feed FOR INSERT
  WITH CHECK (true);

-- ========================================
-- FUNCTIONS FOR AUTOMATIC ACTIVITY FEED
-- ========================================

-- Function to create activity when user joins
CREATE OR REPLACE FUNCTION create_join_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Get the user's full name
  SELECT full_name INTO user_full_name
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Insert activity
  INSERT INTO hotspot_activity_feed (
    hotspot_id,
    activity_type,
    message,
    user_id,
    metadata
  ) VALUES (
    NEW.hotspot_id,
    'join',
    COALESCE(user_full_name, 'Someone') || ' joined',
    NEW.user_id,
    jsonb_build_object('user_name', user_full_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for join activity
DROP TRIGGER IF EXISTS trigger_create_join_activity ON active_hotspot_users;
CREATE TRIGGER trigger_create_join_activity
  AFTER INSERT ON active_hotspot_users
  FOR EACH ROW
  EXECUTE FUNCTION create_join_activity();

-- Function to check for activity spikes
CREATE OR REPLACE FUNCTION check_activity_spike()
RETURNS TRIGGER AS $$
DECLARE
  recent_joins INTEGER;
BEGIN
  -- Count joins in last 10 minutes
  SELECT COUNT(*) INTO recent_joins
  FROM active_hotspot_users
  WHERE hotspot_id = NEW.hotspot_id
    AND joined_at > NOW() - INTERVAL '10 minutes';

  -- If 5 or more people joined in last 10 minutes, create spike activity
  IF recent_joins >= 5 THEN
    -- Check if we haven't already created a spike activity in last 15 minutes
    IF NOT EXISTS (
      SELECT 1 FROM hotspot_activity_feed
      WHERE hotspot_id = NEW.hotspot_id
        AND activity_type = 'spike'
        AND created_at > NOW() - INTERVAL '15 minutes'
    ) THEN
      INSERT INTO hotspot_activity_feed (
        hotspot_id,
        activity_type,
        message,
        metadata
      ) VALUES (
        NEW.hotspot_id,
        'spike',
        'Activity spiking 🔥',
        jsonb_build_object('join_count', recent_joins)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for activity spike
DROP TRIGGER IF EXISTS trigger_check_activity_spike ON active_hotspot_users;
CREATE TRIGGER trigger_check_activity_spike
  AFTER INSERT ON active_hotspot_users
  FOR EACH ROW
  EXECUTE FUNCTION check_activity_spike();

-- Function to create milestone activities
CREATE OR REPLACE FUNCTION check_milestone()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Count current users
  SELECT COUNT(*) INTO current_count
  FROM active_hotspot_users
  WHERE hotspot_id = NEW.hotspot_id
    AND last_seen > NOW() - INTERVAL '5 minutes';

  -- Create milestone activity for certain counts
  IF current_count IN (10, 25, 50, 100) THEN
    -- Check if we haven't already created this milestone
    IF NOT EXISTS (
      SELECT 1 FROM hotspot_activity_feed
      WHERE hotspot_id = NEW.hotspot_id
        AND activity_type = 'milestone'
        AND message LIKE '%' || current_count::text || ' people%'
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
      INSERT INTO hotspot_activity_feed (
        hotspot_id,
        activity_type,
        message,
        metadata
      ) VALUES (
        NEW.hotspot_id,
        'milestone',
        current_count::text || ' people here now! 🎉',
        jsonb_build_object('count', current_count)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for milestones
DROP TRIGGER IF EXISTS trigger_check_milestone ON active_hotspot_users;
CREATE TRIGGER trigger_check_milestone
  AFTER INSERT ON active_hotspot_users
  FOR EACH ROW
  EXECUTE FUNCTION check_milestone();

-- ========================================
-- CLEANUP FUNCTION FOR INACTIVE USERS
-- ========================================
-- Remove users who haven't been seen in 30 minutes
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  DELETE FROM active_hotspot_users
  WHERE last_seen < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can set up a cron job in Supabase to run this periodically:
-- SELECT cron.schedule('cleanup-inactive-users', '*/5 * * * *', 'SELECT cleanup_inactive_users();');

-- ========================================
-- HELPFUL VIEWS
-- ========================================

-- View to get current active users count per hotspot
CREATE OR REPLACE VIEW hotspot_active_counts AS
SELECT 
  hotspot_id,
  COUNT(*) as active_count,
  ARRAY_AGG(full_name ORDER BY joined_at DESC) as user_names
FROM active_hotspot_users
WHERE last_seen > NOW() - INTERVAL '10 minutes'
GROUP BY hotspot_id;

-- View to get recent activity per hotspot
CREATE OR REPLACE VIEW hotspot_recent_activity AS
SELECT 
  hotspot_id,
  activity_type,
  message,
  created_at,
  metadata
FROM hotspot_activity_feed
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON TABLE active_hotspot_users IS 'Tracks users currently active in each hotspot';
COMMENT ON TABLE hotspot_messages IS 'Real-time chat messages for hotspots';
COMMENT ON TABLE hotspot_reactions IS 'Live reactions from users at hotspots';
COMMENT ON TABLE hotspot_activity_feed IS 'Activity feed for hotspot events';
