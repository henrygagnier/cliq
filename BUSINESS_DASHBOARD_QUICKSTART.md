# 🚀 Business Dashboard - Quick Start Guide

## What's Been Created

Your business dashboard is now ready to integrate! Here's what's been set up:

### 📁 Files Created

1. **Database Schema**
   - `lib/business-dashboard-schema.sql` - Complete Supabase schema

2. **Components**
   - `components/business/BusinessDashboard.tsx` - Main dashboard
   - `components/business/CreateOfferModal.tsx` - Offer creation
   - `components/business/EditProfileModal.tsx` - Profile editing
   - `components/business/ChatModerationModal.tsx` - Message moderation
   - `components/business/index.ts` - Component exports

3. **Utilities**
   - `lib/businessUtils.ts` - Helper functions and API wrappers

4. **Documentation**
   - `BUSINESS_DASHBOARD_SETUP.md` - Complete setup guide
   - `INTEGRATION_EXAMPLE.tsx` - Integration examples
   - `BUSINESS_DASHBOARD_QUICKSTART.md` - This file

5. **Dependencies**
   - Updated `package.json` with `react-native-chart-kit`

## ⚡ Quick Setup (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 2: Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to: **SQL Editor** → **New Query**
3. Copy and paste contents from `lib/business-dashboard-schema.sql`
4. Click **Run** to execute

### Step 3: Integrate into Your App

Choose one of these integration methods:

#### Option A: Modal Presentation (Recommended - Easiest)

Add to your `App.tsx`:

```tsx
import { BusinessDashboard } from './components/business';
import { Briefcase } from 'lucide-react-native';

// Add a root stack navigator wrapping your MainTabs
const RootStack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainApp" component={MainTabs} />
      <RootStack.Screen 
        name="BusinessDashboard" 
        component={BusinessDashboard}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </RootStack.Navigator>
  );
}

// Then in your main return, replace <MainTabs /> with:
<NavigationContainer>
  <RootNavigator />
</NavigationContainer>
```

Add a button in your Profile/Account component:

```tsx
import { useNavigation } from '@react-navigation/native';
import { isBusinessOwner } from '../lib/businessUtils';
import { Briefcase } from 'lucide-react-native';

// Inside your component:
const navigation = useNavigation();
const [isBusiness, setIsBusiness] = useState(false);

useEffect(() => {
  if (session?.user) {
    isBusinessOwner(session.user.id).then(setIsBusiness);
  }
}, [session]);

// Add this button in your UI:
{isBusiness && (
  <TouchableOpacity 
    onPress={() => navigation.navigate('BusinessDashboard')}
    className="mx-6 mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 p-4 rounded-xl flex-row items-center justify-center"
  >
    <Briefcase size={20} color="white" style={{ marginRight: 8 }} />
    <Text className="text-white font-bold">Business Dashboard</Text>
  </TouchableOpacity>
)}
```

#### Option B: Add to Profile Tab

See `INTEGRATION_EXAMPLE.tsx` for complete code examples.

## 📊 Features Included

### ✅ Performance Analytics
- Views, check-ins, comments, promotions tracking
- Trend indicators (% change)
- Time range selection (1D, 7D, 1M, etc.)
- Interactive charts

### ✅ Offer Management
- Create custom offers (%, $, BOGO, free items)
- Loyalty programs (check-in or purchase based)
- AI-suggested templates
- Set expiration & redemption limits
- Toggle active/inactive
- Track redemptions

### ✅ Profile Management
- Edit business info
- Manage categories
- Update contact details
- Add/manage photos (schema ready)
- Set business hours (schema ready)

### ✅ Chat Moderation
- View user reviews & messages
- Approve/reject messages
- Filter by status
- Real-time unread count

### ✅ Quick Actions
- Create offers
- Boost exposure (placeholder)
- View analytics
- Edit profile

## 🧪 Testing with Sample Data

Create a test business profile:

```sql
-- In Supabase SQL Editor
-- Replace 'YOUR_USER_ID' with your auth.users.id

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

-- Use the returned ID in the following queries

-- Add categories
INSERT INTO business_categories (business_id, category)
VALUES 
  ('BUSINESS_ID', 'Café'),
  ('BUSINESS_ID', 'Restaurant');

-- Add a sample offer
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

-- Add sample analytics (last 7 days)
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

## 🔧 Utility Functions Available

Import from `lib/businessUtils.ts`:

```tsx
import {
  isBusinessOwner,
  getBusinessProfile,
  createBusinessProfile,
  updateBusinessProfile,
  getActiveOffers,
  createOffer,
  incrementMetric,
  getAnalytics,
  redeemOffer,
  // ... and more
} from './lib/businessUtils';
```

### Common Use Cases:

```tsx
// Check if user is business owner
const isOwner = await isBusinessOwner(userId);

// Get business profile
const profile = await getBusinessProfile(userId);

// Create offer
const offer = await createOffer({
  business_id: 'uuid',
  title: '20% Off',
  description: 'Limited time only',
  offer_type: 'percentage',
  offer_value: '20',
  duration_value: 7,
  duration_unit: 'days',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  redemption_limit: 'unlimited',
  is_active: true,
  offer_category: 'custom',
});

// Increment analytics
await incrementMetric(businessId, 'views');
await incrementMetric(businessId, 'check_ins');

// Redeem offer
await redeemOffer(offerId, userId, businessId);
```

## 🎨 Customization

### Change Colors

Update gradient colors in components:

```tsx
// Current: cyan-500 to blue-500
className="bg-gradient-to-r from-cyan-500 to-blue-500"

// Change to your brand colors:
className="bg-gradient-to-r from-purple-500 to-pink-500"
```

### Add Features

1. **Photo Gallery** - Schema ready, add image picker UI
2. **Business Hours** - Schema ready, add time picker UI
3. **Push Notifications** - Notify on new messages
4. **Advanced Analytics** - More chart types
5. **Payment Integration** - Process payments

## 📱 Customer-Facing Features

To let customers interact with businesses:

### View Active Offers

```tsx
import { getActiveOffers } from './lib/businessUtils';

const offers = await getActiveOffers(businessId);
```

### Redeem Offers

```tsx
import { redeemOffer } from './lib/businessUtils';

const success = await redeemOffer(offerId, userId, businessId);
```

### Send Reviews/Messages

```tsx
import { supabase } from './lib/supabase';

await supabase
  .from('business_chat_messages')
  .insert({
    business_id: businessId,
    user_id: userId,
    message: 'Great place!',
    message_type: 'review',
  });
```

### Check In at Business

```tsx
import { incrementMetric } from './lib/businessUtils';

await incrementMetric(businessId, 'check_ins');
```

## 🐛 Troubleshooting

### Dashboard Not Loading
- ✅ Check if user has business profile in database
- ✅ Verify Supabase connection
- ✅ Check RLS policies are enabled
- ✅ Look at console logs for errors

### Can't Create Offers
- ✅ Verify expires_at is in future
- ✅ Check business_id is correct
- ✅ Ensure user owns the business
- ✅ Check RLS policies

### Analytics Not Updating
- ✅ Verify `increment_business_metric` function exists
- ✅ Check function permissions in Supabase
- ✅ Ensure businessId is correct

### Navigation Not Working
- ✅ Check NavigationContainer wraps everything
- ✅ Verify screen names match navigation calls
- ✅ Ensure RootStack is set up correctly

## 📚 Next Steps

1. ✅ Run SQL migration in Supabase
2. ✅ Install dependencies (`npm install`)
3. ✅ Add BusinessDashboard to navigation
4. ✅ Test with sample data
5. ✅ Customize styling to match your brand
6. ✅ Add customer-facing features
7. ✅ Deploy and test with real users

## 💡 Tips

- **Start Simple**: Test with modal presentation first
- **Use Sample Data**: Create test business profiles
- **Check Logs**: Console logs help debug issues
- **Read RLS Policies**: Understand who can access what
- **Incremental**: Add features one at a time

## 📞 Support Resources

- **Setup Guide**: `BUSINESS_DASHBOARD_SETUP.md`
- **Integration Examples**: `INTEGRATION_EXAMPLE.tsx`
- **Utility Functions**: `lib/businessUtils.ts`
- **Supabase Docs**: https://supabase.com/docs
- **React Navigation**: https://reactnavigation.org/docs

## 🎉 You're Ready!

Your business dashboard is fully set up and ready to integrate. Follow the Quick Setup steps above and you'll be running in minutes!

Need more help? Check out `BUSINESS_DASHBOARD_SETUP.md` for detailed documentation.
