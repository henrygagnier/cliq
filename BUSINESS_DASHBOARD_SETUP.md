# Business Dashboard Setup Guide

This guide will help you integrate the business dashboard into your Cliq app.

## Table of Contents
1. [Database Setup](#database-setup)
2. [Install Dependencies](#install-dependencies)
3. [Integration](#integration)
4. [Features](#features)
5. [Usage](#usage)

## Database Setup

### 1. Run the SQL Migration

Execute the SQL schema in your Supabase SQL Editor:

```bash
# Navigate to your Supabase project dashboard
# Go to: SQL Editor → New Query
# Copy and paste the contents of: lib/business-dashboard-schema.sql
# Click "Run" to execute
```

The schema includes:
- `business_profiles` - Business profile information
- `business_categories` - Business categories (Bar, Restaurant, etc.)
- `business_photos` - Business photo gallery
- `business_hours` - Operating hours
- `business_offers` - Promotions and offers
- `offer_redemptions` - Track offer usage
- `business_analytics` - Performance metrics
- `business_chat_messages` - User reviews and messages

### 2. Enable Row Level Security (RLS)

All tables have RLS policies automatically created. Key policies:
- Business owners can manage their own data
- Public can view active offers and business info
- Users can redeem offers and send messages

### 3. Storage Setup (Optional)

If you want to upload business photos/logos:

```sql
-- Create storage bucket for business media
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true);

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload business media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-media');

-- Create policy to allow public read access
CREATE POLICY "Public can view business media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-media');
```

## Install Dependencies

Install the required packages:

```bash
npm install @expo/vector-icons react-native-chart-kit react-native-svg

# Or with yarn
yarn add @expo/vector-icons react-native-chart-kit react-native-svg
```

## Integration

### 1. Add to Navigation

Update your navigation to include the business dashboard:

```tsx
// In your navigation file (e.g., App.tsx or navigation/index.tsx)
import { BusinessDashboard } from './components/business';

// Add to your stack/tab navigator
<Stack.Screen 
  name="BusinessDashboard" 
  component={BusinessDashboard}
  options={{ 
    title: 'Business Dashboard',
    headerShown: false // Dashboard has its own header
  }}
/>
```

### 2. Check User Type

Determine if the current user is a business owner:

```tsx
import { supabase } from './lib/supabase';

// Check if user has a business profile
const checkBusinessOwner = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return !!data;
};

// Navigate to dashboard if business owner
const isBusinessOwner = await checkBusinessOwner();
if (isBusinessOwner) {
  navigation.navigate('BusinessDashboard');
}
```

### 3. Create Business Profile Screen (Optional)

Create a screen for new businesses to set up their profile:

```tsx
import { supabase } from './lib/supabase';

const createBusinessProfile = async (profileData: {
  business_name: string;
  description: string;
  categories: string[];
  address?: string;
  phone?: string;
  website?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create business profile
  const { data: profile, error } = await supabase
    .from('business_profiles')
    .insert({
      user_id: user.id,
      business_name: profileData.business_name,
      description: profileData.description,
      address: profileData.address,
      phone: profileData.phone,
      website: profileData.website,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  // Add categories
  const categoryInserts = profileData.categories.map(cat => ({
    business_id: profile.id,
    category: cat,
  }));

  await supabase.from('business_categories').insert(categoryInserts);

  return profile;
};
```

## Features

### 1. Performance Analytics
- View metrics: Views, Check-ins, Comments, Promotions
- Interactive time range selection (1D, 7D, 1M, etc.)
- Trend indicators (% change)
- Visual charts (would need implementation)

### 2. Offer Management
- Create custom offers (% off, $ off, BOGO, free items)
- Loyalty programs (check-in based or purchase based)
- AI-suggested offer templates
- Set expiration dates and redemption limits
- Toggle offers active/inactive
- Track redemptions

### 3. Profile Management
- Edit business information
- Manage categories
- Update contact details
- Set business hours (in schema, needs UI)
- Upload photos (in schema, needs storage setup)

### 4. Chat Moderation
- View user reviews and messages
- Approve or reject messages
- Filter by status (pending, approved, rejected)
- Real-time unread count

### 5. Quick Actions
- Create offers
- Boost exposure (placeholder for future feature)
- View analytics
- Edit profile

### 6. Recommendations
- Smart suggestions to improve engagement
- Data-driven insights

## Usage

### For Business Owners

1. **Initial Setup**
   - Create business profile
   - Add categories
   - Fill in contact info
   - Upload photos

2. **Create Your First Offer**
   - Tap "Create Offer" in Quick Actions
   - Choose offer type (Custom/Loyalty/AI)
   - Set value and duration
   - Define redemption limits
   - Activate offer

3. **Monitor Performance**
   - Check dashboard daily for metrics
   - Review trends and changes
   - Respond to chat messages
   - Adjust offers based on performance

4. **Engage Customers**
   - Moderate chat messages
   - Create loyalty programs
   - Run time-limited promotions
   - Update profile regularly

### For App Users

1. **Discover Businesses**
   - Browse active offers
   - Check business profiles
   - View photos and info
   - See operating hours

2. **Redeem Offers**
   - View offer details
   - Redeem at business location
   - Track redemption history

3. **Interact**
   - Leave reviews
   - Send messages
   - Check in at locations
   - Rate experiences

## API Functions

### Analytics

```tsx
// Increment a metric for a business
await supabase.rpc('increment_business_metric', {
  p_business_id: 'uuid',
  p_metric: 'views', // or 'check_ins', 'comments', 'promotions'
  p_date: '2024-01-01' // optional, defaults to today
});

// Get analytics for date range
const { data } = await supabase.rpc('get_business_analytics', {
  p_business_id: 'uuid',
  p_start_date: '2024-01-01',
  p_end_date: '2024-01-31'
});
```

### Offers

```tsx
// Get active offers for a business
const { data: offers } = await supabase
  .from('business_offers')
  .select('*')
  .eq('business_id', businessId)
  .eq('is_active', true)
  .gt('expires_at', new Date().toISOString());

// Redeem an offer
const { data } = await supabase
  .from('offer_redemptions')
  .insert({
    offer_id: offerId,
    user_id: userId,
    business_id: businessId,
  });

// Update redemption count
const { data: offer } = await supabase
  .from('business_offers')
  .update({ 
    redemptions_count: supabase.rpc('increment', 1)
  })
  .eq('id', offerId);
```

### Chat/Messages

```tsx
// Send a message to a business
const { data } = await supabase
  .from('business_chat_messages')
  .insert({
    business_id: businessId,
    user_id: userId,
    message: 'Great place!',
    message_type: 'review',
  });

// Get unmoderated messages count
const { count } = await supabase
  .from('business_chat_messages')
  .select('*', { count: 'exact', head: true })
  .eq('business_id', businessId)
  .eq('is_moderated', false);
```

## Customization

### Styling

The dashboard uses Tailwind CSS classes via NativeWind. To customize:

1. Update `tailwind.config.js` for colors and themes
2. Modify gradient colors in components
3. Adjust spacing and sizing values

### Add Custom Features

1. **Business Hours UI**
   - Schema already supports hours
   - Add UI in EditProfileModal
   - Display hours on profile

2. **Photo Gallery**
   - Set up Supabase Storage
   - Add image picker
   - Upload to `business-media` bucket
   - Display in profile

3. **Advanced Analytics**
   - Add more chart types
   - Export data functionality
   - Custom date ranges
   - Comparison views

4. **Notifications**
   - Push notifications for new messages
   - Offer expiration alerts
   - Analytics insights

## Troubleshooting

### Dashboard not loading
- Check if user has a business profile
- Verify Supabase connection
- Check RLS policies are enabled

### Offers not appearing
- Verify `expires_at` is in the future
- Check `is_active` is true
- Confirm RLS policies allow reading

### Analytics not updating
- Ensure `increment_business_metric` function exists
- Check function permissions
- Verify date format

### Chat moderation not working
- Check RLS policies
- Verify business_id matches
- Ensure messages table has data

## Sample Data (Testing)

To add sample data for testing:

```sql
-- Insert a test business profile (replace YOUR_USER_ID)
INSERT INTO business_profiles (user_id, business_name, description, address, phone, website, status)
VALUES (
  'YOUR_USER_ID',
  'Test Café',
  'A cozy place for coffee and conversation',
  '123 Main St',
  '(555) 123-4567',
  'www.testcafe.com',
  'active'
) RETURNING id;

-- Add categories (use the returned ID from above)
INSERT INTO business_categories (business_id, category)
VALUES 
  ('BUSINESS_ID', 'Café'),
  ('BUSINESS_ID', 'Restaurant');

-- Add a test offer
INSERT INTO business_offers (business_id, title, description, offer_type, offer_value, expires_at, is_active, offer_category)
VALUES (
  'BUSINESS_ID',
  '20% Off First Visit',
  'New customers get 20% off',
  'percentage',
  '20',
  NOW() + INTERVAL '30 days',
  true,
  'custom'
);

-- Add some analytics data
INSERT INTO business_analytics (business_id, date, views_count, check_ins_count, comments_count, promotions_count)
VALUES 
  ('BUSINESS_ID', CURRENT_DATE - 6, 150, 25, 10, 5),
  ('BUSINESS_ID', CURRENT_DATE - 5, 180, 30, 12, 6),
  ('BUSINESS_ID', CURRENT_DATE - 4, 200, 35, 15, 8),
  ('BUSINESS_ID', CURRENT_DATE - 3, 220, 40, 18, 10),
  ('BUSINESS_ID', CURRENT_DATE - 2, 250, 45, 20, 12),
  ('BUSINESS_ID', CURRENT_DATE - 1, 280, 50, 22, 15),
  ('BUSINESS_ID', CURRENT_DATE, 300, 55, 25, 18);
```

## Next Steps

1. Run the SQL migration in Supabase
2. Install dependencies
3. Add BusinessDashboard to navigation
4. Test with sample data
5. Customize styling and features
6. Deploy and test with real users

## Support

For issues or questions:
- Check Supabase logs for errors
- Verify RLS policies
- Review console logs in app
- Check network requests

## Future Enhancements

- [ ] Real-time chat with Socket.io
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Photo/video uploads
- [ ] Multi-location support
- [ ] Staff/employee management
- [ ] Booking/reservation system
- [ ] Payment integration
- [ ] QR code offers
- [ ] Social media integration
