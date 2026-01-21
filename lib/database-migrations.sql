/**
 * Supabase Database Schema Setup
 * 
 * Run this in your Supabase SQL Editor to create the user_profiles table
 */

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  dob DATE,
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- Backfill-safe column add for DOB if the table already exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dob DATE;

-- Backfill-safe column add for avatar_url if the table already exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create trigger to update updated_at timestamp
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

/**
 * STORAGE SETUP (Run in Supabase Dashboard)
 * 
 * 1. Go to Storage in Supabase Dashboard
 * 2. Create a new bucket named "avatars"
 * 3. Set it to Public (uncheck "Private bucket")
 * 4. Add the following policy for authenticated uploads:
 * 
 * For INSERT:
 * (role() = 'authenticated')
 * 
 * For SELECT:
 * (role() = 'public')
 * 
 * For UPDATE:
 * (auth.uid() = owner)
 * 
 * For DELETE:
 * (auth.uid() = owner)
 */
