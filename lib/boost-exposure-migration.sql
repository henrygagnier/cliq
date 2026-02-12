-- Boost Exposure / Sponsored Placement Raffle System
-- This implements a weekly raffle system where businesses can enter for free
-- to win 7 days of sponsored placement at the top of search results

-- ============================================================
-- TABLE: boost_raffle_periods
-- Tracks weekly raffle periods
-- ============================================================
CREATE TABLE IF NOT EXISTS boost_raffle_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    announcement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status can be: 'active' (accepting entries), 'selecting' (choosing winners), 'completed'
    CONSTRAINT raffle_period_status_check CHECK (status IN ('active', 'selecting', 'completed')),
    
    -- Ensure date ranges are valid
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT announcement_after_end CHECK (announcement_date >= end_date)
);

-- Index for finding active raffle periods
CREATE INDEX idx_raffle_periods_status ON boost_raffle_periods(status, start_date);
CREATE INDEX idx_raffle_periods_dates ON boost_raffle_periods(start_date, end_date);

COMMENT ON TABLE boost_raffle_periods IS 'Weekly raffle periods for sponsored placement lottery';
COMMENT ON COLUMN boost_raffle_periods.status IS 'active: accepting entries, selecting: choosing winners, completed: winners announced';

-- ============================================================
-- TABLE: boost_raffle_entries
-- Tracks business entries in weekly raffles
-- ============================================================
CREATE TABLE IF NOT EXISTS boost_raffle_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    raffle_period_id UUID NOT NULL REFERENCES boost_raffle_periods(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- A business can only enter once per raffle period
    CONSTRAINT unique_business_per_period UNIQUE(business_id, raffle_period_id)
);

-- Indexes for performance
CREATE INDEX idx_raffle_entries_business ON boost_raffle_entries(business_id);
CREATE INDEX idx_raffle_entries_period ON boost_raffle_entries(raffle_period_id);
CREATE INDEX idx_raffle_entries_category ON boost_raffle_entries(category, raffle_period_id);

COMMENT ON TABLE boost_raffle_entries IS 'Business entries in weekly raffles for sponsored placement';
COMMENT ON COLUMN boost_raffle_entries.category IS 'Category the business entered under (matches business_categories)';

-- ============================================================
-- TABLE: boost_sponsored_placements
-- Tracks active and past sponsored placements (raffle winners)
-- ============================================================
CREATE TABLE IF NOT EXISTS boost_sponsored_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    raffle_period_id UUID NOT NULL REFERENCES boost_raffle_periods(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status: 'active' (currently sponsored), 'completed' (sponsorship ended)
    CONSTRAINT sponsored_status_check CHECK (status IN ('active', 'completed')),
    
    -- Ensure valid date range
    CONSTRAINT valid_sponsorship_dates CHECK (end_date >= start_date)
);

-- Indexes for finding active sponsored businesses
CREATE INDEX idx_sponsored_active ON boost_sponsored_placements(status, start_date, end_date);
CREATE INDEX idx_sponsored_category ON boost_sponsored_placements(category, status);
CREATE INDEX idx_sponsored_business ON boost_sponsored_placements(business_id);

COMMENT ON TABLE boost_sponsored_placements IS 'Winners of raffles with active/past sponsored placement';
COMMENT ON COLUMN boost_sponsored_placements.status IS 'active: currently sponsored, completed: sponsorship ended';

-- ============================================================
-- FUNCTION: Get current active raffle period
-- ============================================================
CREATE OR REPLACE FUNCTION get_active_raffle_period()
RETURNS boost_raffle_periods AS $$
    SELECT *
    FROM boost_raffle_periods
    WHERE status = 'active'
    AND CURRENT_DATE BETWEEN start_date AND end_date
    ORDER BY start_date DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_active_raffle_period IS 'Returns the current active raffle period if one exists';

-- ============================================================
-- FUNCTION: Get raffle entry count by category
-- ============================================================
CREATE OR REPLACE FUNCTION get_raffle_entries_count(
    p_raffle_period_id UUID,
    p_category TEXT
)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM boost_raffle_entries
    WHERE raffle_period_id = p_raffle_period_id
    AND category = p_category;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_raffle_entries_count IS 'Get total entries for a category in a raffle period';

-- ============================================================
-- FUNCTION: Check if business has entered current raffle
-- ============================================================
CREATE OR REPLACE FUNCTION has_entered_raffle(
    p_business_id UUID
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM boost_raffle_entries bre
        JOIN boost_raffle_periods brp ON bre.raffle_period_id = brp.id
        WHERE bre.business_id = p_business_id
        AND brp.status = 'active'
        AND CURRENT_DATE BETWEEN brp.start_date AND brp.end_date
    );
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION has_entered_raffle IS 'Check if a business has entered the current active raffle';

-- ============================================================
-- FUNCTION: Select random raffle winners
-- Only 3 winners per category
-- ============================================================
CREATE OR REPLACE FUNCTION select_raffle_winners(
    p_raffle_period_id UUID
)
RETURNS TABLE (
    business_id UUID,
    category TEXT,
    business_name TEXT
) AS $$
BEGIN
    -- For each category in this raffle period, select up to 3 random winners
    RETURN QUERY
    WITH category_entries AS (
        SELECT DISTINCT bre.category
        FROM boost_raffle_entries bre
        WHERE bre.raffle_period_id = p_raffle_period_id
    ),
    random_winners AS (
        SELECT 
            bre.business_id,
            bre.category,
            bp.business_name,
            ROW_NUMBER() OVER (
                PARTITION BY bre.category 
                ORDER BY random()
            ) as rn
        FROM boost_raffle_entries bre
        JOIN business_profiles bp ON bre.business_id = bp.id
        WHERE bre.raffle_period_id = p_raffle_period_id
        -- Exclude businesses that are currently sponsored
        AND NOT EXISTS (
            SELECT 1 
            FROM boost_sponsored_placements bsp
            WHERE bsp.business_id = bre.business_id
            AND bsp.status = 'active'
            AND CURRENT_DATE BETWEEN bsp.start_date AND bsp.end_date
        )
    )
    SELECT 
        rw.business_id,
        rw.category,
        rw.business_name
    FROM random_winners rw
    WHERE rw.rn <= 3; -- Only top 3 per category
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION select_raffle_winners IS 'Randomly select up to 3 winners per category from raffle entries';

-- ============================================================
-- FUNCTION: Create sponsored placements for winners
-- ============================================================
CREATE OR REPLACE FUNCTION create_sponsored_placements_for_winners(
    p_raffle_period_id UUID,
    p_start_date DATE,
    p_duration_days INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    v_end_date DATE;
    v_inserted_count INTEGER := 0;
BEGIN
    v_end_date := p_start_date + (p_duration_days || ' days')::INTERVAL;
    
    -- Insert sponsored placements for winners
    WITH winners AS (
        SELECT * FROM select_raffle_winners(p_raffle_period_id)
    )
    INSERT INTO boost_sponsored_placements (
        business_id,
        raffle_period_id,
        category,
        start_date,
        end_date,
        status
    )
    SELECT 
        w.business_id,
        p_raffle_period_id,
        w.category,
        p_start_date,
        v_end_date,
        'active'
    FROM winners w;
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION create_sponsored_placements_for_winners IS 'Create sponsored placement records for raffle winners';

-- ============================================================
-- VIEW: Active sponsored businesses
-- For easy querying of currently sponsored businesses
-- ============================================================
CREATE OR REPLACE VIEW active_sponsored_businesses AS
SELECT 
    bsp.id as placement_id,
    bsp.business_id,
    bp.business_name,
    bp.description,
    bp.address,
    bp.hotspot_id,
    bsp.category,
    bsp.start_date,
    bsp.end_date,
    bsp.created_at,
    (bsp.end_date - CURRENT_DATE) as days_remaining
FROM boost_sponsored_placements bsp
JOIN business_profiles bp ON bsp.business_id = bp.id
WHERE bsp.status = 'active'
AND CURRENT_DATE BETWEEN bsp.start_date AND bsp.end_date
ORDER BY bsp.start_date DESC;

COMMENT ON VIEW active_sponsored_businesses IS 'Currently active sponsored businesses with placement details';

-- ============================================================
-- VIEW: Raffle statistics
-- ============================================================
CREATE OR REPLACE VIEW raffle_statistics AS
SELECT 
    brp.id as raffle_period_id,
    brp.start_date,
    brp.end_date,
    brp.status,
    COUNT(DISTINCT bre.id) as total_entries,
    COUNT(DISTINCT bre.category) as categories_count,
    COUNT(DISTINCT bre.business_id) as unique_businesses,
    COUNT(DISTINCT bsp.id) as winners_count
FROM boost_raffle_periods brp
LEFT JOIN boost_raffle_entries bre ON brp.id = bre.raffle_period_id
LEFT JOIN boost_sponsored_placements bsp ON brp.id = bsp.raffle_period_id
GROUP BY brp.id, brp.start_date, brp.end_date, brp.status
ORDER BY brp.start_date DESC;

COMMENT ON VIEW raffle_statistics IS 'Statistics for each raffle period';

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE boost_raffle_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE boost_raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE boost_sponsored_placements ENABLE ROW LEVEL SECURITY;

-- Raffle Periods: Public read for active periods
CREATE POLICY "Anyone can view raffle periods"
    ON boost_raffle_periods
    FOR SELECT
    TO public
    USING (true);

-- Raffle Entries: Business owners can view their own entries
CREATE POLICY "Business owners can view their raffle entries"
    ON boost_raffle_entries
    FOR SELECT
    TO authenticated
    USING (
        business_id IN (
            SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    );

-- Raffle Entries: Business owners can insert their own entries
DROP POLICY IF EXISTS "Business owners can enter raffles" ON boost_raffle_entries;

CREATE POLICY "Business owners can enter raffles"
    ON boost_raffle_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Verify the business belongs to the current user
        EXISTS (
            SELECT 1 
            FROM business_profiles 
            WHERE id = business_id 
            AND user_id = auth.uid()
        )
        -- Verify it's an active raffle period
        AND EXISTS (
            SELECT 1 
            FROM boost_raffle_periods
            WHERE id = raffle_period_id
            AND status = 'active'
        )
        -- Prevent duplicate entries (business can only enter once per period)
        AND NOT EXISTS (
            SELECT 1 
            FROM boost_raffle_entries
            WHERE boost_raffle_entries.business_id = NEW.business_id
            AND boost_raffle_entries.raffle_period_id = NEW.raffle_period_id
        )
    );

-- Drop the duplicate policy
DROP POLICY IF EXISTS "Anyone can see entry statistics" ON boost_raffle_entries;

-- Sponsored Placements: Anyone can view active sponsored businesses
CREATE POLICY "Anyone can view active sponsored placements"
    ON boost_sponsored_placements
    FOR SELECT
    TO public
    USING (status = 'active');

-- Sponsored Placements: Business owners can see their own placements
CREATE POLICY "Business owners can view their placements"
    ON boost_sponsored_placements
    FOR SELECT
    TO authenticated
    USING (
        business_id IN (
            SELECT id FROM business_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON boost_raffle_periods TO authenticated;
GRANT SELECT ON boost_raffle_periods TO anon;

GRANT SELECT, INSERT ON boost_raffle_entries TO authenticated;
GRANT SELECT ON boost_raffle_entries TO anon;

GRANT SELECT ON boost_sponsored_placements TO authenticated;
GRANT SELECT ON boost_sponsored_placements TO anon;

GRANT SELECT ON active_sponsored_businesses TO authenticated;
GRANT SELECT ON active_sponsored_businesses TO anon;

GRANT SELECT ON raffle_statistics TO authenticated;
GRANT SELECT ON raffle_statistics TO anon;

-- ============================================================
-- TRIGGER: Auto-complete expired sponsorships
-- ============================================================
CREATE OR REPLACE FUNCTION auto_complete_expired_sponsorships()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark sponsorships as completed when their end_date has passed
    UPDATE boost_sponsored_placements
    SET status = 'completed',
        updated_at = NOW()
    WHERE status = 'active'
    AND end_date < CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs daily (on any insert to raffle_periods as a proxy)
CREATE OR REPLACE FUNCTION schedule_sponsorship_cleanup()
RETURNS void AS $$
BEGIN
    PERFORM auto_complete_expired_sponsorships();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INITIAL DATA: Create first raffle period
-- ============================================================

-- Insert the first weekly raffle period (starting next Monday)
DO $$
DECLARE
    v_next_monday DATE;
    v_next_sunday DATE;
    v_announcement_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next Monday
    v_next_monday := CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) % 7);
    
    -- Calculate following Sunday
    v_next_sunday := v_next_monday + 6;
    
    -- Announcement time: Sunday at 11:59 PM
    v_announcement_time := v_next_sunday + TIME '23:59:00';
    
    -- Only insert if no active period exists
    IF NOT EXISTS (SELECT 1 FROM boost_raffle_periods WHERE status = 'active') THEN
        INSERT INTO boost_raffle_periods (start_date, end_date, announcement_date, status)
        VALUES (v_next_monday, v_next_sunday, v_announcement_time, 'active');
    END IF;
END $$;

-- ============================================================
-- HELPER FUNCTION: Create next week's raffle period
-- Call this function every week to create the next raffle period
-- ============================================================
CREATE OR REPLACE FUNCTION create_next_raffle_period()
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
    v_last_end_date DATE;
    v_new_start_date DATE;
    v_new_end_date DATE;
    v_announcement_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the last raffle period's end date
    SELECT end_date INTO v_last_end_date
    FROM boost_raffle_periods
    ORDER BY end_date DESC
    LIMIT 1;
    
    -- New period starts the day after the last one ended
    v_new_start_date := v_last_end_date + 1;
    v_new_end_date := v_new_start_date + 6;  -- 7-day period
    v_announcement_time := v_new_end_date + TIME '23:59:00';
    
    -- Insert new period
    INSERT INTO boost_raffle_periods (start_date, end_date, announcement_date, status)
    VALUES (v_new_start_date, v_new_end_date, v_announcement_time, 'active')
    RETURNING id INTO v_new_id;
    
    -- Mark previous period as completed
    UPDATE boost_raffle_periods
    SET status = 'completed', updated_at = NOW()
    WHERE end_date < v_new_start_date
    AND status != 'completed';
    
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION create_next_raffle_period IS 'Creates the next weekly raffle period and marks old ones as completed';

-- ============================================================
-- ANALYTICS: Add boost analytics columns to business_analytics
-- ============================================================

-- Add columns to track boost impressions if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_analytics') THEN
        -- Add boost_impressions column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'business_analytics' 
            AND column_name = 'boost_impressions_count'
        ) THEN
            ALTER TABLE business_analytics 
            ADD COLUMN boost_impressions_count INTEGER DEFAULT 0;
            
            COMMENT ON COLUMN business_analytics.boost_impressions_count 
            IS 'Number of times business appeared in sponsored/boosted search results';
        END IF;
        
        -- Add boost_clicks column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'business_analytics' 
            AND column_name = 'boost_clicks_count'
        ) THEN
            ALTER TABLE business_analytics 
            ADD COLUMN boost_clicks_count INTEGER DEFAULT 0;
            
            COMMENT ON COLUMN business_analytics.boost_clicks_count 
            IS 'Number of clicks from sponsored/boosted placement';
        END IF;
    END IF;
END $$;
