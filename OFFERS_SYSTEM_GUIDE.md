# Offers System - Complete Implementation Guide

## 📋 Overview

The Offers System is a comprehensive promotional platform that allows businesses to create, manage, and track promotional offers while enabling users to discover and redeem deals at their favorite hotspots.

## 🗄️ Database Schema

### Step 1: Run the SQL Schema

Execute the SQL script located at `lib/offers-system-schema.sql` in your Supabase SQL Editor.

This script creates:

- **business_offers** - Core offers storage with full offer details
- **offer_redemptions** - Track user redemptions with verification
- **user_offer_favorites** - Allow users to save offers
- **user_loyalty_progress** - Track progress toward loyalty rewards
- Helper functions for managing offers
- Row Level Security (RLS) policies
- Automated triggers and views

### Key SQL Functions

#### `get_active_offers(p_business_id, p_hotspot_id)`

Returns all active, non-expired offers for a business/hotspot with business details.

#### `get_user_redeemed_offers(p_user_id)`

Returns all offers redeemed by a specific user with verification status.

#### `update_loyalty_progress(p_user_id, p_offer_id)`

Tracks user progress toward loyalty rewards (e.g., "Buy 5 get 1 free").

#### `deactivate_expired_offers()`

Automatically deactivates expired offers. Can be scheduled as a cron job.

#### `generate_redemption_code()`

Generates unique 8-character redemption codes for offer tracking.

## 🎨 Frontend Implementation

### Components Created

#### 1. **CreateOfferModal** (`components/business/CreateOfferModal.tsx`)

Allows business owners to create offers with three modes:

- **Custom Offers** - Manually create promotional offers
- **Loyalty Programs** - Set up loyalty rewards
- **AI Suggestions** - Quick-start with pre-made offer templates

**Features:**

- Multiple offer types (percentage, fixed, BOGO, free item, loyalty)
- Flexible duration settings (hours/days)
- Redemption limits
- Expiration dates

#### 2. **HotspotDetailScreen Updates** (`components/HotspotDetailScreen.jsx`)

Enhanced the hotspot detail view to display active offers:

- Horizontal scrolling offer cards
- Real-time offer availability
- Expiring soon badges
- One-tap redemption
- Automatic redemption code generation

**Features Added:**

- `fetchOffers()` - Loads active offers for the hotspot
- `handleRedeemOffer()` - Processes offer redemption
- `renderOffer()` - Displays offer cards with styling
- Offers section UI above the chat section

#### 3. **RedeemedOffersScreen** (`components/RedeemedOffersScreen.tsx`)

Full-screen view of user's redeemed offers:

- Stats dashboard (Total, Verified, Pending)
- Redemption code display
- Verification status tracking
- Empty state with call-to-action
- Pull-to-refresh functionality

#### 4. **RewardsScreen Updates** (`components/RewardsScreen.tsx`)

Added navigation button to access redeemed offers:

- Prominent button with ticket icon
- Integrated into rewards flow
- Gradient styling for visibility

### Navigation Setup

Added `RedeemedOffersScreen` to the navigation stack in `App.tsx`:

```tsx
<Stack.Screen
  name="RedeemedOffers"
  component={RedeemedOffersScreen}
  options={{ headerShown: false }}
/>
```

## 🔄 User Flow

### For Users (Consumers)

1. **Discover Offers**
   - Browse hotspots on the map
   - Open hotspot detail screen
   - View active offers in horizontal scrollable section

2. **Redeem Offers**
   - Tap on offer card
   - System checks if already redeemed
   - Generates unique redemption code
   - Displays code in alert popup
   - Code is saved to user's profile

3. **View Redeemed Offers**
   - Navigate to Rewards screen
   - Tap "My Redeemed Offers" button
   - View all redeemed offers with codes
   - Check verification status
   - Show codes to businesses

### For Businesses

1. **Create Offers**
   - Open Business Dashboard
   - Tap "Create Offer" button
   - Choose offer category (Custom, Loyalty, AI)
   - Fill in offer details
   - Set expiration and limits
   - Publish offer

2. **Manage Offers**
   - View active offers in dashboard
   - Toggle offer active/inactive status
   - Edit offer details
   - Delete expired offers
   - Track redemption counts

3. **Verify Redemptions**
   - User shows redemption code
   - Business verifies code in system
   - Updates redemption status to "verified"

## 🎯 Offer Types

### 1. Percentage Discount

Example: "20% off your entire purchase"

- `offer_type`: 'percentage'
- `offer_value`: '20'

### 2. Fixed Amount Discount

Example: "$5 off purchases over $25"

- `offer_type`: 'fixed'
- `offer_value`: '5'

### 3. Buy One Get One (BOGO)

Example: "Buy one coffee, get one free"

- `offer_type`: 'bogo'
- `offer_value`: '1'

### 4. Free Item

Example: "Free appetizer with entrée"

- `offer_type`: 'free_item'
- `offer_value`: 'appetizer'

### 5. Loyalty Rewards

Example: "Buy 5 coffees, get the 6th free"

- `offer_type`: 'loyalty'
- `offer_category`: 'loyalty'
- `loyalty_mode`: 'purchases' or 'checkins'
- `loyalty_check_ins`: Number required (e.g., 5)

## 🔐 Security & Permissions

### Row Level Security (RLS) Policies

#### Business Offers

- **SELECT**: Anyone can view active, non-expired offers
- **INSERT/UPDATE/DELETE**: Only business owners can manage their offers

#### Offer Redemptions

- **SELECT**: Users can view their own redemptions; businesses can view redemptions for their offers
- **INSERT**: Authenticated users can redeem offers
- **UPDATE**: Businesses can verify redemptions

#### User Favorites

- **ALL**: Users can only manage their own favorites

### Validation & Checks

Automatic validation via database triggers:

- ✅ Check redemption limits before allowing redemption
- ✅ Verify offer is active and not expired
- ✅ Prevent duplicate redemptions by same user
- ✅ Increment redemption counters automatically

## 📊 Analytics & Tracking

### Business Analytics

Track for each offer:

- Total redemptions
- Active redemptions count
- Verification rate
- Days remaining until expiration
- Redemptions remaining (if limited)

### User Analytics

Track for each user:

- Total offers redeemed
- Verified redemption count
- Pending redemptions
- Loyalty progress

## 🎨 UI/UX Features

### Visual Elements

- 🎫 Gradient offer cards with icons
- ⚡ "Expiring Soon" badges for urgency
- ✓ Verification status indicators
- 📊 Stats dashboards
- 🔄 Pull-to-refresh functionality
- 📱 Responsive layout for all screen sizes

### Animations

- Spring animations on card press
- Fade transitions for modals
- Smooth scrolling for offer lists
- Gradient backgrounds

### Color Scheme

- **Primary**: Blue gradients (#3B82F6, #2563EB)
- **Success**: Cyan/Teal (#22d3ee, #06b6d4)
- **Warning**: Orange (#F97316)
- **Background**: Dark slate (#0f172a, #1e293b)
- **Text**: White with varying opacity

## 🚀 Getting Started

### 1. Database Setup

```sql
-- Run in Supabase SQL Editor
-- Execute: lib/offers-system-schema.sql
```

### 2. Test the System

#### Create a Test Offer

1. Log in as a business owner
2. Navigate to Business Dashboard
3. Create a test offer with:
   - Title: "Welcome Offer"
   - Type: Percentage
   - Value: 15
   - Duration: 7 days

#### Redeem an Offer

1. Log in as a user
2. Browse hotspots
3. Open hotspot with offers
4. Tap offer card to redeem
5. Note the redemption code

#### View Redeemed Offers

1. Navigate to Rewards screen
2. Tap "My Redeemed Offers"
3. View redemption code and status

## 🔧 Maintenance

### Scheduled Tasks

Set up a Supabase cron job to deactivate expired offers daily:

```sql
SELECT cron.schedule(
  'deactivate-expired-offers',
  '0 0 * * *', -- Run daily at midnight
  'SELECT deactivate_expired_offers();'
);
```

### Monitoring

Monitor these metrics:

- Active offers count
- Daily redemptions
- Verification rate
- Expired offer cleanup
- User engagement

## 📝 API Reference

### Fetching Active Offers

```typescript
const { data, error } = await supabase.rpc("get_active_offers", {
  p_hotspot_id: hotspotId,
});
```

### Redeeming an Offer

```typescript
const { error } = await supabase.from("offer_redemptions").insert({
  offer_id: offerId,
  user_id: userId,
  business_id: businessId,
  hotspot_id: hotspotId,
  redemption_code: code,
  redeemed_location: locationName,
});
```

### Fetching User's Redeemed Offers

```typescript
const { data, error } = await supabase.rpc("get_user_redeemed_offers", {
  p_user_id: userId,
});
```

### Updating Loyalty Progress

```typescript
const { error } = await supabase.rpc("update_loyalty_progress", {
  p_user_id: userId,
  p_offer_id: offerId,
});
```

## 🐛 Troubleshooting

### Offers Not Appearing

1. Check if offers are active: `is_active = true`
2. Verify expiration: `expires_at > NOW()`
3. Check RLS policies are enabled
4. Verify hotspot_id matches

### Redemption Failed

1. Check if user already redeemed
2. Verify redemption limit not reached
3. Check offer is not expired
4. Ensure user is authenticated

### Styles Not Loading

1. Verify StyleSheet is imported
2. Check component imports
3. Rebuild app: `npm start -- --reset-cache`

## 🎯 Future Enhancements

Potential features to add:

- [ ] QR code generation for redemptions
- [ ] Push notifications for new offers
- [ ] Geofencing for location-based offer activation
- [ ] Social sharing of offers
- [ ] Offer analytics dashboard for businesses
- [ ] A/B testing for offers
- [ ] Scheduled offer publishing
- [ ] Bulk offer creation
- [ ] Offer templates library
- [ ] Integration with payment systems

## 📞 Support

For issues or questions:

1. Check the SQL schema is properly installed
2. Verify all RLS policies are active
3. Check Supabase logs for errors
4. Review component imports

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Status:** Production Ready ✅
