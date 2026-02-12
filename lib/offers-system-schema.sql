-- =====================================================
-- SIMPLE OFFERS SYSTEM - Clean & Standalone
-- No foreign key constraints, no dependencies
-- =====================================================

-- Drop triggers only if their parent tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'offer_redemptions'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS after_redemption ON offer_redemptions';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'business_offers'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS before_offer_insert ON business_offers';
  END IF;
END $$;
DROP FUNCTION IF EXISTS increment_redemption_count();
DROP FUNCTION IF EXISTS get_user_redeemed_offers(UUID);
DROP FUNCTION IF EXISTS get_active_offers(UUID, UUID);
DROP FUNCTION IF EXISTS set_offer_created_by();
DROP TABLE IF EXISTS offer_redemptions CASCADE;
DROP TABLE IF EXISTS business_offers CASCADE;

-- Main Offers Table
CREATE TABLE business_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  hotspot_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  offer_type TEXT NOT NULL,
  offer_value TEXT,
  expires_at TIMESTAMPTZ,
  redemption_limit TEXT DEFAULT 'unlimited',
  redemptions_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  offer_category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Redemptions Table
CREATE TABLE offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  hotspot_id UUID,
  redemption_code TEXT,
  redeemed_location TEXT,
  is_verified BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure offers always capture creator
CREATE OR REPLACE FUNCTION set_offer_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_offer_insert
  BEFORE INSERT ON business_offers
  FOR EACH ROW
  EXECUTE FUNCTION set_offer_created_by();

-- Indexes
CREATE INDEX idx_offers_business ON business_offers(business_id);
CREATE INDEX idx_offers_hotspot ON business_offers(hotspot_id);
CREATE INDEX idx_offers_active ON business_offers(is_active);
CREATE INDEX idx_redemptions_user ON offer_redemptions(user_id);
CREATE INDEX idx_redemptions_offer ON offer_redemptions(offer_id);
CREATE UNIQUE INDEX idx_redemptions_offer_user ON offer_redemptions(offer_id, user_id);

-- Enable RLS
ALTER TABLE business_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view active offers" ON business_offers;
DROP POLICY IF EXISTS "Authenticated can create offers" ON business_offers;
DROP POLICY IF EXISTS "Owners can update offers" ON business_offers;
DROP POLICY IF EXISTS "Owners can delete offers" ON business_offers;
DROP POLICY IF EXISTS "Users can view their redemptions" ON offer_redemptions;
DROP POLICY IF EXISTS "Authenticated can redeem" ON offer_redemptions;

CREATE POLICY "Public can view active offers"
  ON business_offers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated can create offers"
  ON business_offers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update offers"
  ON business_offers FOR UPDATE
  USING (
    (created_by = auth.uid() OR created_by IS NULL)
    OR EXISTS (
      SELECT 1
      FROM business_profiles bp
      WHERE bp.id = business_offers.business_id
        AND bp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (created_by = auth.uid() OR created_by IS NULL)
    OR EXISTS (
      SELECT 1
      FROM business_profiles bp
      WHERE bp.id = business_offers.business_id
        AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete offers"
  ON business_offers FOR DELETE
  USING (
    (created_by = auth.uid() OR created_by IS NULL)
    OR EXISTS (
      SELECT 1
      FROM business_profiles bp
      WHERE bp.id = business_offers.business_id
        AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their redemptions"
  ON offer_redemptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can redeem"
  ON offer_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function: Get active offers
CREATE OR REPLACE FUNCTION get_active_offers(
  p_business_id UUID DEFAULT NULL,
  p_hotspot_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  hotspot_id UUID,
  title TEXT,
  description TEXT,
  offer_type TEXT,
  offer_value TEXT,
  expires_at TIMESTAMPTZ,
  redemptions_count INTEGER,
  redemption_limit TEXT,
  is_active BOOLEAN,
  offer_category TEXT,
  image_url TEXT,
  business_name TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.business_id,
    o.hotspot_id,
    o.title,
    o.description,
    o.offer_type,
    o.offer_value,
    o.expires_at,
    o.redemptions_count,
    o.redemption_limit,
    o.is_active,
    o.offer_category,
    o.image_url,
    NULL::TEXT as business_name,
    CASE 
      WHEN o.expires_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (o.expires_at - NOW()))::INTEGER
    END AS days_remaining
  FROM business_offers o
  WHERE o.is_active = true
    AND (o.expires_at IS NULL OR o.expires_at > NOW())
    AND (p_business_id IS NULL OR o.business_id = p_business_id)
    AND (p_hotspot_id IS NULL OR o.hotspot_id = p_hotspot_id)
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's redeemed offers
CREATE OR REPLACE FUNCTION get_user_redeemed_offers(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  offer_title TEXT,
  business_name TEXT,
  redeemed_at TIMESTAMPTZ,
  is_verified BOOLEAN,
  redemption_code TEXT,
  offer_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    o.title AS offer_title,
    'Business'::TEXT AS business_name,
    r.redeemed_at,
    r.is_verified,
    r.redemption_code,
    o.description AS offer_description
  FROM offer_redemptions r
  JOIN business_offers o ON o.id = r.offer_id
  WHERE r.user_id = p_user_id
  ORDER BY r.redeemed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-increment redemption count
CREATE OR REPLACE FUNCTION increment_redemption_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE business_offers
  SET redemptions_count = redemptions_count + 1
  WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_redemption
  AFTER INSERT ON offer_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION increment_redemption_count();

-- Done! Schema is ready to use.

