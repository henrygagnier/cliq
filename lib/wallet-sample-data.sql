/**
 * Sample Data for Wallet Testing
 * 
 * IMPORTANT: This is OPTIONAL and only for testing purposes.
 * Do NOT run this in production with real data.
 * 
 * To use this:
 * 1. First, run wallet-schema.sql to create the tables
 * 2. Get your user ID by running: SELECT id, email FROM auth.users;
 * 3. Create a second test user or use an existing user's ID
 * 4. Replace the placeholder IDs below with real user IDs
 * 5. Run this SQL in Supabase SQL Editor
 */

-- Replace these with actual user IDs from your auth.users table
-- Example: SELECT id, email FROM auth.users LIMIT 2;

-- SET YOUR USER IDs HERE:
-- Your user ID:
-- DO $$ 
-- DECLARE
--   my_user_id UUID := 'YOUR-USER-ID-HERE';
--   other_user_id_1 UUID := 'OTHER-USER-ID-1-HERE';
--   other_user_id_2 UUID := 'OTHER-USER-ID-2-HERE';
--   other_user_id_3 UUID := 'OTHER-USER-ID-3-HERE';
-- BEGIN

-- Example: Create some sample connections
-- Replace the UUIDs with actual user IDs

-- Connection 1: Recent connection (2 days ago)
INSERT INTO connections (user_id, connected_user_id, location, notes, met_date, is_recent, is_active, mutual_count)
VALUES 
  ('YOUR-USER-ID-HERE', 
   'OTHER-USER-ID-1-HERE', 
   'Tech Meetup, San Francisco', 
   'Talked about AI startups and web3. Really insightful perspective on the future of social networking.',
   NOW() - INTERVAL '2 days',
   true,
   true,
   5
  );

-- Connection 2: Recent connection (5 days ago)
INSERT INTO connections (user_id, connected_user_id, location, notes, met_date, is_recent, is_active, mutual_count)
VALUES 
  ('YOUR-USER-ID-HERE',
   'OTHER-USER-ID-2-HERE',
   'Coffee Shop, Brooklyn',
   'Design lead at a top agency. Shared some great resources on prototyping.',
   NOW() - INTERVAL '5 days',
   true,
   true,
   3
  );

-- Connection 3: Older connection (2 weeks ago)
INSERT INTO connections (user_id, connected_user_id, location, notes, met_date, is_recent, is_active, mutual_count)
VALUES 
  ('YOUR-USER-ID-HERE',
   'OTHER-USER-ID-3-HERE',
   'Startup Conference, Austin',
   'Entrepreneur and founder. Very inspiring conversation about building products people love.',
   NOW() - INTERVAL '2 weeks',
   false,
   false,
   8
  );

-- Add some sample messages (optional)
-- First, get the connection IDs you just created:
-- SELECT id, location FROM connections WHERE user_id = 'YOUR-USER-ID-HERE';

-- Then insert messages using those connection IDs:
-- INSERT INTO messages (connection_id, sender_id, receiver_id, content, created_at, is_read)
-- VALUES 
--   ('CONNECTION-ID-1', 'OTHER-USER-ID-1-HERE', 'YOUR-USER-ID-HERE', 'That sounds great! Let''s sync up next week.', NOW() - INTERVAL '2 minutes', false),
--   ('CONNECTION-ID-2', 'YOUR-USER-ID-HERE', 'OTHER-USER-ID-2-HERE', 'Coffee tomorrow at 10am?', NOW() - INTERVAL '3 hours', true),
--   ('CONNECTION-ID-2', 'OTHER-USER-ID-2-HERE', 'YOUR-USER-ID-HERE', 'Perfect! See you then.', NOW() - INTERVAL '2 hours', false);

-- END $$;


/**
 * ALTERNATIVE: Quick Test Setup (No Second User Required)
 * 
 * If you don't have a second user, you can test by creating fake user profiles.
 * This will create placeholder connections that look real but aren't linked to actual auth users.
 * 
 * Note: This approach won't have real auth.users entries, so some features may not work fully.
 */

-- First, ensure you have your user_profiles entry
-- Get your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then create some test user profiles (without auth users - for display only)
-- These won't be able to log in, but will show up in your connections

-- You'll need to manually insert into user_profiles for testing:
/*
INSERT INTO user_profiles (id, email, full_name, avatar_url)
VALUES 
  (gen_random_uuid(), 'sarah.chen@example.com', 'Sarah Chen', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800'),
  (gen_random_uuid(), 'marcus.johnson@example.com', 'Marcus Johnson', 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=800'),
  (gen_random_uuid(), 'emma.rodriguez@example.com', 'Emma Rodriguez', 'https://images.unsplash.com/photo-1545479620-9fa10b267ae4?w=800');

-- Then create connections using those IDs
-- (Get the IDs from the insert above or query: SELECT id, full_name FROM user_profiles;)
*/

