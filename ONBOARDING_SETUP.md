# Modern Onboarding Setup Guide

## Overview

Your app now has a modern signup process with an interactive onboarding flow that collects user information through engaging, visual questions.

## Features

### 1. **Modern Sign Up Screen**

- Clean, modern design with icons
- Real-time password strength validation
- Password confirmation matching
- Terms & conditions checkbox
- Beautiful input styling with validation feedback

### 2. **Interactive Onboarding**

After successful signup, users see a step-by-step onboarding with:

- **Full Name** (text input)
- **Role Selection** (single choice: Student, Professional, Entrepreneur, Other)
- **Interests** (multi-select: Technology, Business, Design, Marketing, Education, Health)
- **Goals** (multi-select: Learn, Network, Collaborate, Grow)

Features:

- Progress bar showing completion
- Navigation between steps (back/next)
- Visual feedback for selections
- Real-time validation
- Smooth animations and transitions

## Database Setup

### Step 1: Create the Table in Supabase

Go to your Supabase dashboard and run this SQL in the SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT,
  interests TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Step 2: Test the Flow

1. Sign up with a new email and password
2. Complete the onboarding questions
3. Check your Supabase `user_profiles` table to see the saved data

## Component Structure

### SignUp.tsx

- Modern signup form
- Validates email, password, and terms
- On success, shows the Onboarding component

### Onboarding.tsx

- Multi-step form with visual questions
- Saves answers to user_profiles table
- Progress indicator
- Back/next navigation

## Customizing Questions

To modify the onboarding questions, edit the `questions` array in `Onboarding.tsx`:

```typescript
const questions: OnboardingQuestion[] = [
  {
    id: "customField",
    title: "Question title",
    subtitle: "Question subtitle",
    icon: "icon-name", // From Ionicons
    type: "text" | "single" | "multiselect",
    placeholder: "For text inputs",
    options: [
      { label: "Option 1", value: "value1", icon: "icon-name" },
      // ... more options
    ],
  },
  // ... more questions
];
```

## Styling

All components use a modern color scheme:

- **Primary**: `#6366F1` (Indigo)
- **Background**: `#F8FAFC` (Light Slate)
- **Text Dark**: `#1E293B` (Dark Slate)
- **Text Light**: `#64748B` (Slate)
- **Border**: `#E2E8F0` (Light Gray)
- **Success**: `#22C55E` (Green)
- **Error**: `#EF4444` (Red)

## Accessing Saved Data

To retrieve user profile data:

```typescript
const { data, error } = await supabase
  .from("user_profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

## Next Steps

1. Add email verification (check database-migrations.sql for reference)
2. Customize questions based on your app's needs
3. Add more onboarding flows for different user types
4. Integrate with your Account/Dashboard screen to show saved preferences
