# Wallet Setup Guide

This guide will help you set up the wallet/connections feature with Supabase.

## Step 1: Run Database Migrations

1. Open your Supabase project dashboard
2. Go to the **SQL Editor**
3. Copy and paste the contents of `lib/wallet-schema.sql`
4. Click **Run** to execute the SQL

This will create:
- `connections` table - stores user connections (Cliqs)
- `messages` table - stores DM conversations
- Row Level Security (RLS) policies for data protection
- Indexes for better performance
- Helper views for easier querying

## Step 2: Verify Tables Were Created

Run this query in the SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('connections', 'messages');
```

You should see both `connections` and `messages` tables listed.

## Step 3: Test with Sample Data (Optional)

If you want to test the wallet with some sample data:

### Option A: Create Real Test Users

1. Create a second test account by signing up in your app
2. Get both user IDs:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Open `lib/wallet-sample-data.sql`
4. Replace the placeholder UUIDs with your actual user IDs
5. Run the modified SQL in the SQL Editor

### Option B: Quick Test Without Second User

If you just want to see the UI working, you can create fake connections:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Create a test connection (replace YOUR-USER-ID with your actual ID)
INSERT INTO connections (
  user_id, 
  connected_user_id, 
  location, 
  notes, 
  met_date, 
  is_recent, 
  is_active, 
  mutual_count
)
VALUES (
  'YOUR-USER-ID-HERE',
  gen_random_uuid(), -- generates a random ID for testing
  'Tech Conference, San Francisco',
  'Great conversation about startups',
  NOW() - INTERVAL '2 days',
  true,
  true,
  5
);

-- Also add a matching user_profiles entry so the name/photo display
INSERT INTO user_profiles (id, email, full_name, avatar_url)
VALUES (
  'SAME-UUID-AS-CONNECTED-USER-ID-ABOVE',
  'test.user@example.com',
  'Test User',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800'
);
```

## Step 4: How the App Works

### Wallet Tab
- Shows all your connections (Cliqs)
- **Recently Added**: Connections from the last 7 days (is_recent = true)
- **Earlier**: Older connections (is_recent = false)
- Tap any connection to see details

### DMs Tab
- Shows conversations with your connections
- Displays last message and timestamp
- Shows unread indicator (gold dot) for unread messages
- Tap to view connection details

### Connection Details Modal
- Shows full profile info
- Location where you met
- Personal notes
- Mutual connection count
- Message button (UI only for now)

## API Functions Available

The wallet provides these utility functions (see `lib/walletUtils.ts`):

### Read Operations
- `getUserConnections(userId)` - Get all connections
- `getRecentConnections(userId)` - Get connections from last 7 days
- `getOlderConnections(userId)` - Get older connections
- `getDMConversations(userId)` - Get all DM conversations with unread counts

### Write Operations
- `createConnection(userId, connectedUserId, location, notes?, metDate?)` - Create new connection
- `updateConnectionNotes(connectionId, notes)` - Update notes
- `sendMessage(connectionId, senderId, receiverId, content)` - Send a message
- `markMessagesAsRead(connectionId, userId)` - Mark messages as read
- `deleteConnection(connectionId)` - Delete a connection

### Helper Functions
- `formatRelativeTime(date)` - Format timestamps (e.g., "2 days ago", "1 week ago")

## Creating Connections from Your App

To add a new connection when users meet:

```typescript
import { createConnection } from '../lib/walletUtils';
import { supabase } from '../lib/supabase';

async function addConnection() {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create connection
  const connection = await createConnection(
    user.id,
    'other-user-id', // The person they met
    'Coffee Shop, Downtown',
    'Talked about React Native development',
    new Date()
  );
  
  if (connection) {
    console.log('Connection created:', connection);
  }
}
```

## Automatic Features

The database automatically:
- Updates `updated_at` timestamps when records change
- Enforces that users can't connect to themselves
- Ensures unique connections between users
- Protects data with Row Level Security (users can only see their own data)

## Maintaining the Database

### Mark old connections as not recent
The schema includes a function to update connections older than 7 days:

```sql
SELECT update_recent_connections();
```

You could run this periodically (e.g., via a cron job or Supabase function).

## Troubleshooting

### No connections showing up?
1. Check if you have any connections: `SELECT * FROM connections WHERE user_id = 'your-user-id';`
2. Verify RLS policies are working: Make sure you're authenticated when querying
3. Check the console logs in the app for any errors

### Can't see user names/photos?
1. Make sure the `user_profiles` table has entries for connected users
2. Verify the `connection_details` view exists:
   ```sql
   SELECT * FROM connection_details LIMIT 1;
   ```

### Messages not working?
1. Verify both users have a connection record
2. Check the `messages` table has RLS enabled
3. Make sure sender_id and receiver_id match the connection's user IDs

## Next Steps

Consider adding:
- Real-time subscriptions for live message updates
- Push notifications for new messages
- QR code scanning to quickly add connections
- NFC tap-to-connect functionality
- Location-based connection suggestions

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only see their own connections and messages
- The `connection_details` view automatically filters by user
- Always use `auth.uid()` in RLS policies to ensure proper access control
