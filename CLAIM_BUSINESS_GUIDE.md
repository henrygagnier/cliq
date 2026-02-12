# Claim Your Business - Quick Start Guide

## Overview
Users can now claim real businesses from your map instead of creating fake test profiles! The new flow ensures every business profile is linked to an actual location on your map.

## What Changed

### 1. **New ClaimBusinessModal Component**
- Shows nearby hotspots from your `hotspots` table
- Users can search and select their business
- Two-step flow: Select → Confirm & Add Details
- Validates that hotspots aren't already claimed

### 2. **Updated Database Schema**
- Added `hotspot_id` foreign key to `business_profiles` table
- Ensures one business per hotspot (unique constraint)
- Links business profiles to real map locations

### 3. **Updated Account Flow**
- ✅ **Business Owners**: See "Business Dashboard" button
- ✅ **Non-Business Users**: See "Claim Your Business" button
- Opens claim modal → Select nearby hotspot → Add details → Claim!

## Setup Instructions

### Step 1: Run the Database Migration

**Option A - Fresh Install:**
The new schema is already in [business-dashboard-schema.sql](business-dashboard-schema.sql) with the `hotspot_id` column included.

**Option B - Existing Database:**
Run [business-hotspot-migration.sql](business-hotspot-migration.sql) to add the column to your existing setup:

```sql
-- In Supabase SQL Editor
-- Copy and paste from lib/business-hotspot-migration.sql
```

### Step 2: Test the Flow

1. **Open the app** and go to the **Account/Profile tab**
2. **Look for the button**:
   - If you don't have a business: "Claim Your Business" button
   - If you already have a business: "Business Dashboard" button
3. **Tap "Claim Your Business"**
4. **Select a nearby hotspot** from the list
5. **Add optional details** (phone, website, description)
6. **Tap "Claim This Business"**
7. **Success!** You'll now see the Business Dashboard button

## How It Works

### Data Flow
```
1. User taps "Claim Your Business"
2. App loads hotspots within 12.4 miles
3. User selects a real hotspot from the map
4. App checks if hotspot is already claimed
5. Creates business_profile with hotspot_id
6. Adds category based on hotspot type
7. User gets access to Business Dashboard
```

### Type Mapping
Hotspot types automatically map to business categories:
- `cafe` → Cafe
- `bar`, `pub` → Bar  
- `restaurant` → Restaurant
- `fitness_centre` → Fitness
- `coworking_space` → Coworking
- `college`, `university`, `library` → Education
- Others → Other

### Validation
- ✅ Ensures hotspot exists in database
- ✅ Prevents duplicate claims (unique constraint)
- ✅ Requires location permission to find nearby businesses
- ✅ Only shows real hotspots with coordinates

## Features

### Search & Filter
- Real-time search by business name
- Distance-based sorting (closest first)
- Shows distance in feet (<1mi) or miles
- Type-based icons (cafe ☕, bar 🍺, etc.)

### Two-Step Confirmation
1. **Step 1 - Select**: Browse and choose your business
2. **Step 2 - Confirm**: Add contact info and description

### Smart Distance Display
- **<1 mile**: Shows in feet (e.g., "450ft")
- **≥1 mile**: Shows in miles (e.g., "2.3mi")
- Sorted by proximity automatically

### Claim Protection
- Checks for existing claims before allowing
- Shows alert if business already claimed
- Unique constraint at database level

## Troubleshooting

### "No businesses found nearby"
- **Check location permissions**: App needs location access
- **Verify hotspots exist**: Query your `hotspots` table in Supabase
- **Check distance**: Currently shows hotspots within 12.4 miles

### "Failed to claim business"
- **Run the migration**: Make sure `hotspot_id` column exists
- **Check RLS policies**: Verify business_profiles policies allow INSERT
- **Check foreign key**: Ensure `hotspots` table exists and has `id` column

### "Already claimed" message
- Business has already been claimed by another user
- Check `business_profiles` table for existing `hotspot_id`
- Remove existing claim or select a different hotspot

### Button doesn't appear
- **Check console logs**: Look for "Is business owner: true/false"
- **Verify session**: Make sure user is logged in
- **Run SQL schema**: Ensure all tables are created
- **Check navigation**: Verify RootStack includes BusinessDashboard screen

## Database Queries

### Check if a hotspot is claimed:
```sql
SELECT bp.*, u.email 
FROM business_profiles bp
JOIN auth.users u ON bp.user_id = u.id
WHERE bp.hotspot_id = 'YOUR_HOTSPOT_ID';
```

### See all claimed businesses:
```sql
SELECT 
  bp.business_name,
  h.name as hotspot_name,
  h.type,
  h.address,
  u.email
FROM business_profiles bp
JOIN hotspots h ON bp.hotspot_id = h.id
JOIN auth.users u ON bp.user_id = u.id
WHERE bp.status = 'active';
```

### Find unclaimed hotspots:
```sql
SELECT h.*
FROM hotspots h
LEFT JOIN business_profiles bp ON h.id = bp.hotspot_id
WHERE bp.id IS NULL
LIMIT 50;
```

### Remove a claim (for testing):
```sql
DELETE FROM business_profiles 
WHERE user_id = 'YOUR_USER_ID';
```

## Next Steps

### For Users
1. Claim your business from the map
2. Add contact details and description
3. Access your Business Dashboard
4. Create offers and promotions
5. Moderate chat messages
6. View analytics

### For Developers
1. ✅ Database schema updated with `hotspot_id`
2. ✅ ClaimBusinessModal component created
3. ✅ Account.tsx integrated with modal
4. ✅ All styling converted to StyleSheet
5. ⏭️ Next: Add business verification flow
6. ⏭️ Next: Allow businesses to add photos
7. ⏭️ Next: Integrate with live hotspot data

## File Structure
```
lib/
  ├── business-dashboard-schema.sql       # Main schema with hotspot_id
  ├── business-hotspot-migration.sql      # Migration for existing DBs
  └── businessUtils.ts                   # Helper functions

components/
  ├── Account.tsx                        # Shows claim button
  └── business/
      ├── ClaimBusinessModal.tsx         # NEW - Claim flow
      ├── BusinessDashboard.tsx          # Main dashboard
      ├── CreateOfferModal.tsx           # Create offers
      ├── EditProfileModal.tsx           # Edit profile
      └── ChatModerationModal.tsx        # Moderate messages
```

## Success! 🎉
Your users can now claim real businesses from the map instead of creating fake test profiles. Every business is linked to an actual location, making your platform more authentic and useful!
