-- Fix for has_entered_raffle function
-- The issue: The function was checking date ranges that might not match
-- Simplified: Just check if entry exists for any active raffle period

DROP FUNCTION IF EXISTS has_entered_raffle(UUID);

CREATE OR REPLACE FUNCTION has_entered_raffle(
    p_business_id UUID
)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE
SECURITY DEFINER  -- This allows it to bypass RLS policies
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM boost_raffle_entries bre
        INNER JOIN boost_raffle_periods brp ON bre.raffle_period_id = brp.id
        WHERE bre.business_id = p_business_id
        AND brp.status = 'active'
    );
$$;

COMMENT ON FUNCTION has_entered_raffle IS 'Check if a business has entered the current active raffle (bypasses RLS for accurate checking)';

-- Debug query: Run this to see what's actually in the database
-- Replace 'YOUR_BUSINESS_ID' with: aaa991c4-1ce5-4efb-9fe2-4484e5d08214
/*
SELECT 
    'Raffle Periods' as table_name,
    jsonb_build_object(
        'id', brp.id,
        'status', brp.status,
        'start_date', brp.start_date,
        'end_date', brp.end_date,
        'current_date', CURRENT_DATE,
        'is_in_range', CURRENT_DATE BETWEEN brp.start_date AND brp.end_date
    ) as data
FROM boost_raffle_periods brp
WHERE status = 'active'

UNION ALL

SELECT 
    'Raffle Entries' as table_name,
    jsonb_build_object(
        'id', bre.id,
        'business_id', bre.business_id,
        'raffle_period_id', bre.raffle_period_id,
        'category', bre.category,
        'entered_at', bre.entered_at
    ) as data
FROM boost_raffle_entries bre
WHERE business_id = 'aaa991c4-1ce5-4efb-9fe2-4484e5d08214';
*/
