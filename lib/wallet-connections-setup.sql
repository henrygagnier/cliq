/**
 * ============================================
 * WALLET & CONNECTIONS DATABASE SETUP
 * ============================================
 * 
 * This script sets up the complete database schema for the wallet/connections
 * feature in Supabase. Run this in your Supabase SQL Editor.
 * 
 * Prerequisites:
 * - auth.users table must already exist (provided by Supabase Auth)
 * - user_profiles table should already exist
 * - update_updated_at_column() function should already exist
 * 
 * What this script creates:
 * - connections table (stores Cliqs/connections between users)
 * - messages table (stores DMs between connected users)
 * - Row Level Security (RLS) policies-- One-time fix for existing connections
INSERT INTO connections (user_id, connected_user_id, location, met_date, notes, mutual_count, is_active, is_recent)
SELECT connected_user_id, user_id, location, met_date, notes, mutual_count, is_active, is_recent
FROM connections c1
WHERE NOT EXISTS (
  SELECT 1 FROM connections c2 
  WHERE c2.user_id = c1.connected_user_id 
  AND c2.connected_user_id = c1.user_id
);
 * - Indexes for performance
 * - Triggers for auto-updating timestamps
 * - Helper functions and views
 * 
 * Date: February 1, 2026
 */

-- ============================================
-- 1. CREATE HELPER FUNCTION (if not exists)
-- ============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. CREATE CONNECTIONS TABLE
-- ============================================

-- Stores connections/Cliqs between users
-- Represents when two users meet and connect at a location
CREATE TABLE IF NOT EXISTS connections (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User relationships (both must reference existing users)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Connection metadata
  location TEXT NOT NULL,                                    -- Where they met (e.g., "Tech Meetup, SF")
  met_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When they connected
  notes TEXT,                                                -- Optional notes about the connection
  mutual_count INTEGER DEFAULT 0,                            -- Number of mutual connections
  
  -- Status flags
  is_active BOOLEAN DEFAULT true,                            -- Whether connection is still active
  is_recent BOOLEAN DEFAULT true,                            -- True if within last 7 days
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT different_users CHECK (user_id != connected_user_id),
  CONSTRAINT unique_connection UNIQUE (user_id, connected_user_id)
);

-- Add comment to table
COMMENT ON TABLE connections IS 'Stores connections (Cliqs) between users when they meet at locations';

-- ============================================
-- 3. CREATE MESSAGES TABLE
-- ============================================

-- Stores direct messages between connected users
CREATE TABLE IF NOT EXISTS messages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to table
COMMENT ON TABLE messages IS 'Stores direct messages between connected users';

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR CONNECTIONS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;

-- SELECT: Users can view connections where they are either the creator or the connected user
CREATE POLICY "Users can view their own connections"
  ON connections FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- INSERT: Users can only create connections where they are the user_id
CREATE POLICY "Users can create their own connections"
  ON connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update connections they created
CREATE POLICY "Users can update their own connections"
  ON connections FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: Users can delete connections they created
CREATE POLICY "Users can delete their own connections"
  ON connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. CREATE RLS POLICIES FOR MESSAGES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages they send" ON messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON messages;
DROP POLICY IF EXISTS "Users can delete messages they sent" ON messages;

-- SELECT: Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: Users can create messages where they are the sender
CREATE POLICY "Users can create messages they send"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- UPDATE: Users can update messages they received (typically to mark as read)
CREATE POLICY "Users can update messages they received"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- DELETE: Users can delete messages they sent
CREATE POLICY "Users can delete messages they sent"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_user_id 
  ON connections(user_id);

CREATE INDEX IF NOT EXISTS idx_connections_connected_user_id 
  ON connections(connected_user_id);

CREATE INDEX IF NOT EXISTS idx_connections_is_recent 
  ON connections(is_recent) WHERE is_recent = true;

CREATE INDEX IF NOT EXISTS idx_connections_is_active 
  ON connections(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_connections_created_at 
  ON connections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connections_met_date 
  ON connections(met_date DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_connection_id 
  ON messages(connection_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
  ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_id 
  ON messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_is_read 
  ON messages(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
  ON messages(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_connection_created 
  ON messages(connection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_connections_user_recent 
  ON connections(user_id, is_recent, created_at DESC);

-- ============================================
-- 8. CREATE TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at on connections
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create bidirectional connection
CREATE OR REPLACE FUNCTION create_reciprocal_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the reciprocal connection if it doesn't exist
  INSERT INTO connections (
    user_id,
    connected_user_id,
    location,
    met_date,
    notes,
    mutual_count,
    is_active,
    is_recent
  )
  VALUES (
    NEW.connected_user_id,
    NEW.user_id,
    NEW.location,
    NEW.met_date,
    NEW.notes,
    NEW.mutual_count,
    NEW.is_active,
    NEW.is_recent
  )
  ON CONFLICT (user_id, connected_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create reciprocal connection
DROP TRIGGER IF EXISTS create_reciprocal_connection_trigger ON connections;
CREATE TRIGGER create_reciprocal_connection_trigger
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_reciprocal_connection();

-- ============================================
-- 9. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to automatically mark old connections as not recent (> 7 days)
CREATE OR REPLACE FUNCTION update_recent_connections()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE connections
  SET is_recent = false
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_recent = true;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_recent_connections() IS 'Marks connections older than 7 days as not recent. Returns count of updated rows.';

-- Function to get mutual connections count between two users
CREATE OR REPLACE FUNCTION get_mutual_connections_count(user_a UUID, user_b UUID)
RETURNS INTEGER AS $$
DECLARE
  mutual_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c2.connected_user_id)
  INTO mutual_count
  FROM connections c1
  INNER JOIN connections c2 
    ON c1.connected_user_id = c2.connected_user_id
  WHERE c1.user_id = user_a
    AND c2.user_id = user_b
    AND c1.is_active = true
    AND c2.is_active = true;
  
  RETURN COALESCE(mutual_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_mutual_connections_count(UUID, UUID) IS 'Returns the number of mutual connections between two users';

-- Function to create a bidirectional connection (optional, if you want mutual connections)
CREATE OR REPLACE FUNCTION create_bidirectional_connection(
  user_a UUID,
  user_b UUID,
  location_name TEXT,
  connection_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  connection_id UUID;
  mutual_count INTEGER;
BEGIN
  -- Calculate mutual connections
  mutual_count := get_mutual_connections_count(user_a, user_b);
  
  -- Create first direction (A -> B)
  INSERT INTO connections (user_id, connected_user_id, location, notes, mutual_count)
  VALUES (user_a, user_b, location_name, connection_notes, mutual_count)
  ON CONFLICT (user_id, connected_user_id) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO connection_id;
  
  -- Create reverse direction (B -> A) for bidirectional connection
  INSERT INTO connections (user_id, connected_user_id, location, notes, mutual_count)
  VALUES (user_b, user_a, location_name, connection_notes, mutual_count)
  ON CONFLICT (user_id, connected_user_id) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP;
  
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_bidirectional_connection(UUID, UUID, TEXT, TEXT) IS 'Creates a bidirectional connection between two users and returns the connection ID';

-- ============================================
-- 10. CREATE VIEWS
-- ============================================

-- View for connections with user profile details
CREATE OR REPLACE VIEW connection_details AS
SELECT 
  c.id,
  c.user_id,
  c.connected_user_id,
  c.location,
  c.met_date,
  c.notes,
  c.mutual_count,
  c.is_active,
  c.is_recent,
  c.created_at,
  c.updated_at,
  up.full_name AS connected_user_name,
  up.avatar_url AS connected_user_photo,
  up.email AS connected_user_email,
  up.bio AS connected_user_bio,
  up.interests AS connected_user_interests
FROM connections c
LEFT JOIN user_profiles up ON c.connected_user_id = up.id;

COMMENT ON VIEW connection_details IS 'Enriched view of connections with user profile information';

-- View for latest message per connection
CREATE OR REPLACE VIEW latest_messages AS
SELECT DISTINCT ON (m.connection_id)
  m.id,
  m.connection_id,
  m.sender_id,
  m.receiver_id,
  m.content,
  m.is_read,
  m.created_at,
  m.updated_at
FROM messages m
ORDER BY m.connection_id, m.created_at DESC;

COMMENT ON VIEW latest_messages IS 'Shows the most recent message for each connection';

-- View for unread message counts per connection
CREATE OR REPLACE VIEW unread_message_counts AS
SELECT 
  connection_id,
  receiver_id,
  COUNT(*) AS unread_count
FROM messages
WHERE is_read = false
GROUP BY connection_id, receiver_id;

COMMENT ON VIEW unread_message_counts IS 'Shows count of unread messages per connection for each receiver';

-- View for DM conversations (combines connections with message info)
CREATE OR REPLACE VIEW dm_conversations AS
SELECT 
  cd.id,
  cd.user_id,
  cd.connected_user_id,
  cd.location,
  cd.met_date,
  cd.notes,
  cd.mutual_count,
  cd.is_active,
  cd.is_recent,
  cd.created_at,
  cd.updated_at,
  cd.connected_user_name,
  cd.connected_user_photo,
  cd.connected_user_email,
  cd.connected_user_bio,
  cd.connected_user_interests,
  lm.content AS last_message_content,
  lm.created_at AS last_message_time,
  lm.sender_id AS last_message_sender_id,
  COALESCE(umc.unread_count, 0) AS unread_count
FROM connection_details cd
LEFT JOIN latest_messages lm ON cd.id = lm.connection_id
LEFT JOIN unread_message_counts umc ON cd.id = umc.connection_id AND cd.user_id = umc.receiver_id
WHERE cd.is_active = true
ORDER BY COALESCE(lm.created_at, cd.created_at) DESC;

COMMENT ON VIEW dm_conversations IS 'Complete view of DM conversations with latest message and unread counts';

-- ============================================
-- 11. GRANT PERMISSIONS (Optional)
-- ============================================

-- Grant access to authenticated users to use the functions
GRANT EXECUTE ON FUNCTION update_recent_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_connections_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_bidirectional_connection(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- 12. VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the setup:

-- Check if tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('connections', 'messages');

-- Check if indexes were created
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('connections', 'messages');

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('connections', 'messages');

-- Check policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('connections', 'messages');

-- ============================================
-- SETUP COMPLETE!
-- ============================================

-- Next steps:
-- 1. Verify all tables and views were created successfully
-- 2. Test RLS policies with different users
-- 3. Optionally add sample data for testing (see below)

/*
-- ============================================
-- SAMPLE DATA (For Testing Only)
-- ============================================

-- First, get some user IDs from your database:
-- SELECT id, email FROM auth.users LIMIT 5;

-- Then insert sample connections (replace with actual user IDs):
-- INSERT INTO connections (user_id, connected_user_id, location, notes, met_date, is_recent, is_active, mutual_count)
-- VALUES 
--   ('user-id-1', 'user-id-2', 'Tech Meetup, San Francisco', 'Discussed AI startups', NOW() - INTERVAL '1 day', true, true, 3),
--   ('user-id-1', 'user-id-3', 'Coffee Shop, Brooklyn', 'Talked about React Native', NOW() - INTERVAL '5 days', true, true, 1),
--   ('user-id-1', 'user-id-4', 'Conference, Austin', 'Met at networking event', NOW() - INTERVAL '10 days', false, true, 0);

-- Insert sample messages (replace with actual IDs):
-- INSERT INTO messages (connection_id, sender_id, receiver_id, content, is_read)
-- VALUES
--   ('connection-id-1', 'user-id-1', 'user-id-2', 'Hey! Great meeting you at the meetup.', true),
--   ('connection-id-1', 'user-id-2', 'user-id-1', 'Yeah, let''s collaborate on that project!', false),
--   ('connection-id-2', 'user-id-3', 'user-id-1', 'Thanks for the React tips!', false);
*/
