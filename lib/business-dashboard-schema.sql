-- Business Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hotspot_id UUID REFERENCES hotspots(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  cover_photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(hotspot_id)
);

-- Business categories table
CREATE TABLE IF NOT EXISTS business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business photos table
CREATE TABLE IF NOT EXISTS business_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Monday, 6 = Sunday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, day_of_week)
);

-- Offers/Promotions table
CREATE TABLE IF NOT EXISTS business_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('percentage', 'fixed', 'bogo', 'free_item', 'loyalty')),
  offer_value TEXT, -- Store as text for flexibility (e.g., "15", "5", etc.)
  duration_value INTEGER, -- Number of hours or days
  duration_unit TEXT CHECK (duration_unit IN ('hours', 'days')),
  expires_at TIMESTAMPTZ,
  redemption_limit TEXT DEFAULT 'unlimited', -- 'unlimited', '50', '100', etc.
  redemptions_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  offer_category TEXT CHECK (offer_category IN ('custom', 'loyalty', 'ai')),
  loyalty_mode TEXT CHECK (loyalty_mode IN ('checkins', 'purchases')),
  loyalty_check_ins INTEGER,
  loyalty_product TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offer redemptions tracking
CREATE TABLE IF NOT EXISTS offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES business_offers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business analytics table (daily aggregates)
CREATE TABLE IF NOT EXISTS business_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views_count INTEGER DEFAULT 0,
  check_ins_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  promotions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, date)
);

-- Business chat messages table
CREATE TABLE IF NOT EXISTS business_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'review' CHECK (message_type IN ('review', 'message', 'comment')),
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_business_offers_business_id ON business_offers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_offers_active ON business_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_business_analytics_business_date ON business_analytics(business_id, date);
CREATE INDEX IF NOT EXISTS idx_business_categories_business_id ON business_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_business_photos_business_id ON business_photos(business_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_business_id ON business_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_business_chat_messages_business_id ON business_chat_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_business_chat_messages_moderated ON business_chat_messages(is_moderated);

-- Row Level Security (RLS) Policies

-- Business profiles
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all business profiles"
  ON business_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
  ON business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Business categories
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business categories"
  ON business_categories FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage their categories"
  ON business_categories FOR ALL
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Business photos  
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business photos"
  ON business_photos FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage their photos"
  ON business_photos FOR ALL
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Business hours
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business hours"
  ON business_hours FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage their hours"
  ON business_hours FOR ALL
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Business offers
ALTER TABLE business_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active offers"
  ON business_offers FOR SELECT
  USING (is_active = true OR business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Business owners can manage their offers"
  ON business_offers FOR ALL
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Offer redemptions
ALTER TABLE offer_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redemptions"
  ON offer_redemptions FOR SELECT
  USING (user_id = auth.uid() OR business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create redemptions"
  ON offer_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Business analytics
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their analytics"
  ON business_analytics FOR SELECT
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert analytics"
  ON business_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update analytics"
  ON business_analytics FOR UPDATE
  USING (true);

-- Business chat messages
ALTER TABLE business_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their messages"
  ON business_chat_messages FOR SELECT
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON business_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owners can moderate messages"
  ON business_chat_messages FOR UPDATE
  USING (business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_offers_updated_at
  BEFORE UPDATE ON business_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get business analytics with date range
CREATE OR REPLACE FUNCTION get_business_analytics(
  p_business_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  views_count INTEGER,
  check_ins_count INTEGER,
  comments_count INTEGER,
  promotions_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.date,
    a.views_count,
    a.check_ins_count,
    a.comments_count,
    a.promotions_count
  FROM business_analytics a
  WHERE a.business_id = p_business_id
    AND a.date BETWEEN p_start_date AND p_end_date
  ORDER BY a.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment analytics counters
CREATE OR REPLACE FUNCTION increment_business_metric(
  p_business_id UUID,
  p_metric TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_analytics (business_id, date, views_count, check_ins_count, comments_count, promotions_count)
  VALUES (
    p_business_id,
    p_date,
    CASE WHEN p_metric = 'views' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'check_ins' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'comments' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'promotions' THEN 1 ELSE 0 END
  )
  ON CONFLICT (business_id, date)
  DO UPDATE SET
    views_count = business_analytics.views_count + CASE WHEN p_metric = 'views' THEN 1 ELSE 0 END,
    check_ins_count = business_analytics.check_ins_count + CASE WHEN p_metric = 'check_ins' THEN 1 ELSE 0 END,
    comments_count = business_analytics.comments_count + CASE WHEN p_metric = 'comments' THEN 1 ELSE 0 END,
    promotions_count = business_analytics.promotions_count + CASE WHEN p_metric = 'promotions' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for testing (optional - remove in production)
-- This will insert sample data for a business owner
-- Replace 'YOUR_USER_ID' with an actual auth.users.id from your Supabase auth

-- INSERT INTO business_profiles (user_id, business_name, description, address, phone, website, status)
-- VALUES (
--   'YOUR_USER_ID',
--   'The Brew House',
--   'Craft beers and comfort food in a relaxed atmosphere',
--   '123 Campus Drive, University District',
--   '(555) 123-4567',
--   'www.thebrewhouse.com',
--   'active'
-- );
