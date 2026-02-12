# Live Hotspot Feature Setup

## Overview

The Live Hotspot feature provides real-time interaction for users at physical locations, including live chat, activity feeds, user presence tracking, and reactions.

## Database Setup

1. **Run the SQL migration** in your Supabase SQL Editor:
   - Open `lib/live-hotspot-schema.sql`
   - Copy the entire content
   - Go to your Supabase project → SQL Editor
   - Paste and execute the SQL

2. **What the schema creates:**
   - `active_hotspot_users` - Tracks users currently at each hotspot
   - `hotspot_messages` - Real-time chat messages
   - `hotspot_reactions` - Live emoji reactions
   - `hotspot_activity_feed` - Activity timeline (joins, spikes, milestones)
   - Automatic triggers for activity feed generation
   - Views for easy querying
   - RLS policies for secure access

## Features

### 1. Live Presence Tracking

- Automatically tracks when users join/leave hotspots
- Updates every 30 seconds to show active status
- Auto-cleanup of inactive users (>30 min)

### 2. Real-time Chat

- Live chat with Supabase real-time subscriptions
- Message history (last 50 messages)
- User avatars and timestamps

### 3. Activity Feed

- Automatic activity generation:
  - User joins
  - Activity spikes (5+ joins in 10 min)
  - Milestones (10, 25, 50, 100 users)
- Real-time updates via subscriptions

### 4. Live Reactions

- Floating emoji reactions (🔥 😮 🎉)
- Broadcast to all users in real-time
- 2-second animation

### 5. User Directory

- See who's at the hotspot
- Friend indicators
- Last seen timestamps

## Usage

### Joining a Hotspot

When a user clicks "Join" on a hotspot, they're automatically navigated to the LiveHotspotPage:

```typescript
// In HotspotDetailScreen.jsx
navigation.navigate("LiveHotspot", { hotspot });
```

### User Presence

The page automatically:

- Records user presence on mount
- Updates every 30 seconds
- Removes presence on unmount/leave

### Real-time Subscriptions

All components use Supabase real-time to stay in sync:

- Chat messages appear instantly
- User count updates live
- Activity feed shows new events immediately
- Reactions broadcast to everyone

## Components

### LiveHotspotPage

Main container with:

- Tab navigation (Cards, Live Chat, Activity)
- Header with hotspot name and live indicator
- Floating reaction bar
- Leave/Share actions

### PeopleScroller

- Displays active users
- Shows friend status
- Join time and activity status

### LiveChat

- Full chat interface with keyboard handling
- Real-time message sync
- Send messages to other users

### ActivityFeed

- Timeline of hotspot events
- Automatic activity generation
- Real-time updates

### ReactionBar

- Send floating emoji reactions
- Broadcasts to all users

## Optional Enhancements

### Cron Job for Cleanup

To automatically clean up inactive users, set up a Supabase cron job:

```sql
SELECT cron.schedule(
  'cleanup-inactive-users',
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT cleanup_inactive_users();'
);
```

### Distance Validation

The join functionality already validates distance (500ft) before allowing users to join hotspots.

## Troubleshooting

### Real-time not working?

1. Check Supabase project has Realtime enabled
2. Verify table replication is enabled:
   - Go to Database → Replication
   - Enable for all hotspot tables

### Messages not appearing?

1. Check RLS policies are properly set
2. Verify user is authenticated
3. Check browser console for Supabase errors

### Users not showing up?

1. Ensure `active_hotspot_users` table has proper indexes
2. Check that user profile exists in `user_profiles`
3. Verify the hotspot_id matches between join and query

## Data Flow

1. User joins hotspot → Record in `active_hotspot_users`
2. Trigger fires → Creates activity in `hotspot_activity_feed`
3. Real-time broadcast → All connected clients update
4. User presence updates every 30s → `last_seen` timestamp
5. User leaves → Record removed, triggers cleanup

## Notes

- Hotspot IDs must match between the join action and the page navigation
- Users are auto-removed after 30 minutes of inactivity
- Activity feed is limited to last 2 hours by default
- Chat history limited to 50 messages (configurable)
