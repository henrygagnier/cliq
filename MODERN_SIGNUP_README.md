# Modern Sign Up & Onboarding System

A beautiful, modern sign-up and multi-step onboarding flow for your Cliq app.

## 🎨 What's Included

### Components

#### 1. **SignUp.tsx** - Modern Registration Screen

- Clean, minimalist design with icons
- Real-time password strength validation
- Password confirmation matching
- Form validation with visual feedback
- Seamless transition to onboarding on success

**Key Features:**

- Email validation
- Password requirements (min 8 chars)
- Terms & conditions checkbox
- Modern input styling with focus states
- Loading states with visual feedback

#### 2. **Onboarding.tsx** - Interactive Multi-Step Flow

A beautiful guided onboarding experience with 4 default questions:

1. **Full Name** - Text input with icon
2. **Role** - Single selection (Student, Professional, Entrepreneur, Other)
3. **Interests** - Multi-select with 6 options
4. **Goals** - Multi-select with 4 options

**Features:**

- Progress bar showing completion
- Beautiful visual feedback for selections
- Back/Next navigation
- Real-time validation
- Checkboxes for multi-select
- Icon-based visual hierarchy
- Auto-save to database on completion

#### 3. **SignIn.tsx** - Sign In Screen

- Password visibility toggle
- Form validation
- Smooth transitions
- Link to sign-up screen

## 📊 Data Saved in Onboarding

All user data is saved to the `user_profiles` table:

```typescript
{
  id: string;              // User ID from auth
  email: string;           // Email from signup
  full_name: string;       // Name from onboarding
  role: string;            // Role selection
  interests: string[];     // Selected interests
  goals: string[];         // Selected goals
  onboarding_completed: boolean;  // Status flag
  created_at: timestamp;   // Creation date
  updated_at: timestamp;   // Last update
}
```

## 🚀 Quick Start

### 1. Database Setup

Run this SQL in your Supabase dashboard:

```sql
-- See lib/database-migrations.sql for the complete migration
```

Or use the provided SQL file:

- Open Supabase SQL Editor
- Copy contents of `lib/database-migrations.sql`
- Execute

### 2. Create User Profile After Signup

The system automatically creates a profile when:

1. User completes signup
2. Onboarding is submitted
3. Data is saved to `user_profiles` table

### 3. Access Saved Data

```typescript
import { getUserProfile, hasCompletedOnboarding } from "./lib/onboardingUtils";

// Get full profile
const profile = await getUserProfile(userId);

// Check onboarding status
const completed = await hasCompletedOnboarding(userId);
```

## 🎯 Customization

### Change Onboarding Questions

Edit `Onboarding.tsx` and modify the `questions` array:

```typescript
const questions: OnboardingQuestion[] = [
  {
    id: "customField",
    title: "Your Question?",
    subtitle: "Subtitle text",
    icon: "icon-name", // Ionicons name
    type: "text" | "single" | "multiselect",
    options: [{ label: "Option", value: "value", icon: "icon-name" }],
  },
];
```

### Use Different Question Sets

Pre-built templates in `lib/onboardingTemplates.ts`:

```typescript
import {
  defaultOnboardingQuestions,
  techOnboardingQuestions,
  businessOnboardingQuestions,
  creatorsOnboardingQuestions,
} from "./lib/onboardingTemplates";
```

### Customize Colors

All components use theme colors defined in styles:

- **Primary**: `#6366F1` (Indigo)
- **Background**: `#F8FAFC` (Light)
- **Text**: `#1E293B` (Dark)
- **Border**: `#E2E8F0` (Light Gray)
- **Success**: `#22C55E` (Green)
- **Error**: `#EF4444` (Red)

Change the hex values in component `StyleSheet` objects.

## 📱 User Flow

```
User Opens App
    ↓
[Not Signed In] → Sign In / Sign Up Screens
    ↓
[Sign Up Form] → Email, Password, Terms
    ↓
[On Success] → Onboarding Flow (4 steps)
    ↓
[Complete] → Saves to user_profiles table
    ↓
[Signed In] → App shows Account/Dashboard
```

## 🔗 Helper Functions

See `lib/onboardingUtils.ts`:

```typescript
// Get user profile
getUserProfile(userId: string)

// Check if onboarding completed
hasCompletedOnboarding(userId: string)

// Update profile
updateUserProfile(userId: string, updates: Record)

// Create initial profile
createUserProfile(userId: string, email: string, data?: Partial)

// Get recommendations based on interests/goals
getRecommendations(interests: string[], goals: string[])

// Format profile for display
formatUserProfile(profile: any)
```

## 🎨 Design System

### Colors

- **Indigo-500**: `#6366F1` (Primary actions, icons)
- **Slate-50**: `#F8FAFC` (Background)
- **Slate-900**: `#1E293B` (Dark text)
- **Slate-600**: `#64748B` (Gray text)
- **Slate-200**: `#E2E8F0` (Borders)
- **Green-500**: `#22C55E` (Success)
- **Red-500**: `#EF4444` (Error)
- **Violet-100**: `#EDE9FE` (Selection background)

### Typography

- **Headers**: 28px, Bold (700)
- **Title**: 16px, Bold (700)
- **Body**: 16px, Regular (400)
- **Caption**: 14px, Medium (600)
- **Small**: 13px, Regular (400)

### Spacing

- Container padding: 20px
- Input height: 48px
- Border radius: 12px
- Gap between elements: 8px-20px

## 📦 Dependencies

Required (already in your project):

- `react-native`
- `@rneui/themed`
- `expo-vector-icons`
- `@supabase/supabase-js`

## 🔐 Security

Row Level Security (RLS) is enabled on `user_profiles`:

- Users can only read their own profile
- Users can only update their own profile
- Users can only insert their own profile
- Email is unique per user (via auth foreign key)

## 🐛 Troubleshooting

### User profile not saving

1. Check Supabase connection in `lib/supabase.ts`
2. Verify `user_profiles` table exists
3. Check RLS policies allow inserts

### Onboarding not showing

1. Verify sign up completes successfully
2. Check console for errors
3. Ensure `userId` is being passed correctly

### Styling issues

1. Clear app cache
2. Restart Expo development server
3. Check all StyleSheet properties match React Native syntax

## 📚 Next Steps

1. **Connect to Dashboard**: Show saved preferences on Account screen
2. **Add Validation**: Add email verification
3. **Extend Onboarding**: Add more questions or conditional steps
4. **Personalization**: Use saved data to customize app experience
5. **Analytics**: Track onboarding completion rates
6. **Notifications**: Alert users about areas of interest

## 💡 Tips

- Use `getUserProfile()` to customize app based on user data
- Combine with user interests to recommend features
- Update profile details in Account screen
- Create different onboarding flows for different user types
- Use `getRecommendations()` to suggest content

## 📄 Files

```
components/
  ├── SignIn.tsx          # Sign in screen
  ├── SignUp.tsx          # Sign up + onboarding flow
  ├── Onboarding.tsx      # Onboarding questions
  └── Auth.tsx            # Auth router

lib/
  ├── supabase.ts         # Supabase client
  ├── onboardingUtils.ts  # Helper functions
  ├── onboardingTemplates.ts # Question templates
  └── database-migrations.sql # DB setup

docs/
  └── ONBOARDING_SETUP.md # Detailed setup guide
```

Enjoy your modern onboarding! 🎉
