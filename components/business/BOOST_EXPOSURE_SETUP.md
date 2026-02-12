# Boost Exposure Setup Guide

This guide explains how the Boost Exposure feature works and how to manage it.

## Overview

The Boost Exposure feature allows businesses to enter a free weekly raffle to win sponsored placement at the top of search results for 7 days. Only 3 businesses per category are selected each week.

## Database Setup

1. **Run the SQL migration** in your Supabase SQL Editor:
   - File: `lib/boost-exposure-migration.sql`
   - This creates all necessary tables, functions, views, and RLS policies

## How It Works

### Weekly Raffle Cycle
1. **Monday-Sunday**: Businesses can enter the raffle for free
2. **Sunday 11:59 PM**: Winners are randomly selected (3 per category)
3. **Following Monday**: Winners get 7 days of sponsored placement

### Tables Created
- `boost_raffle_periods` - Weekly raffle periods
- `boost_raffle_entries` - Business entries in raffles
- `boost_sponsored_placements` - Active and past sponsored placements

### Functions Available
- `get_active_raffle_period()` - Get current raffle period
- `has_entered_raffle(business_id)` - Check if business entered
- `get_raffle_entries_count(period_id, category)` - Count entries
- `select_raffle_winners(period_id)` - Randomly select 3 winners per category
- `create_sponsored_placements_for_winners(period_id, start_date)` - Create placements
- `create_next_raffle_period()` - Start next week's raffle

## Weekly Management

### Automated Process (Recommended)
Set up a weekly cron job or Edge Function to:

```sql
-- 1. Select winners (run Sunday night)
SELECT * FROM select_raffle_winners('<current_raffle_period_id>');

-- 2. Create sponsored placements starting Monday
SELECT create_sponsored_placements_for_winners(
  '<current_raffle_period_id>',
  CURRENT_DATE + 1,  -- Start Monday
  7                   -- Duration in days
);

-- 3. Create next week's raffle period
SELECT create_next_raffle_period();
```

### Manual Process
You can run these functions manually in Supabase SQL Editor every Sunday night.

## Usage in App

### Business Dashboard Integration
The feature is already integrated into the Business Dashboard:

1. **Quick Actions**: "Boost Exposure" button
2. **More Menu**: "Boost Exposure" option
3. **Recommendations**: Suggests entering the raffle

### BoostExposureModal Component
Located at: `components/business/BoostExposureModal.tsx`

Features:
- Shows current raffle status
- Displays entry count for business category
- Days remaining until winners announced
- One-click entry
- Success confirmation

### Utility Functions
Located at: `lib/boostExposureUtils.ts`

Available functions:
```typescript
// Get active raffle period
const period = await getActiveRafflePeriod();

// Check if business entered
const entered = await hasBusinessEnteredRaffle(businessId);

// Get entries count for category
const count = await getRaffleEntriesCount(periodId, category);

// Enter the raffle
const result = await enterRaffle(businessId, category);

// Get active sponsored placement
const placement = await getActiveSponsoredPlacement(businessId);
```

## Displaying Sponsored Businesses

To show sponsored businesses in search results:

```typescript
import { supabase } from './lib/supabase';

// Get active sponsored businesses for a category
const { data: sponsoredBusinesses } = await supabase
  .from('active_sponsored_businesses')
  .select('*')
  .eq('category', 'Bars & Nightlife')
  .limit(3);

// Get regular businesses (exclude sponsored ones)
const { data: regularBusinesses } = await supabase
  .from('business_profiles')
  .select('*')
  .not('id', 'in', sponsoredBusinesses.map(b => b.business_id));

// Combine: sponsored first, then regular
const allBusinesses = [...sponsoredBusinesses, ...regularBusinesses];
```

## Analytics

Track boost performance:
- `boost_impressions_count` - Times shown in sponsored results  
- `boost_clicks_count` - Clicks from sponsored placement

These columns are automatically added to `business_analytics` table.

## RLS Policies

Security policies are already configured:
- ✅ Anyone can view raffle periods
- ✅ Business owners can enter raffles
- ✅ Business owners see their own entries
- ✅ Anyone can view active sponsored businesses
- ✅ Entry counts are public (for transparency)

## Testing

### Create Test Raffle Period
```sql
-- Insert a test raffle period
INSERT INTO boost_raffle_periods (start_date, end_date, announcement_date, status)
VALUES (
  CURRENT_DATE,
  CURRENT_DATE + 6,
  CURRENT_DATE + 6 + TIME '23:59:00',
  'active'
);
```

### Test Entry
```typescript
// In your app, as a business owner
const result = await enterRaffle(
  'your-business-id',
  'Bars & Nightlife'
);
console.log(result); // { success: true }
```

### Test Winner Selection
```sql
-- Select winners for a raffle period
SELECT * FROM select_raffle_winners('raffle-period-id');

-- Create placements
SELECT create_sponsored_placements_for_winners(
  'raffle-period-id',
  CURRENT_DATE,
  7
);
```

## Troubleshooting

### Issue: No active raffle period
**Solution**: Run `SELECT create_next_raffle_period();`

### Issue: Business can't enter raffle
**Checks**:
- Is there an active raffle period?
- Has the business already entered?
- Is the business profile valid?
- Check RLS policies are enabled

### Issue: Winners not selected
**Solution**: 
```sql
-- Manually select winners
SELECT * FROM select_raffle_winners('period-id');

-- Then create placements
SELECT create_sponsored_placements_for_winners('period-id', CURRENT_DATE, 7);
```

## Future Enhancements

Potential improvements:
- Push notifications for winners
- Email notifications on Sunday night
- Analytics dashboard for raffle performance
- Historical win tracking
- Category-specific entry limits
- Waiting list for future raffles

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify RLS policies
3. Test functions in SQL Editor
4. Check business profile exists and is active
