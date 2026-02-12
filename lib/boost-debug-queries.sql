-- Debug Queries for Raffle System
-- Run these one by one in Supabase SQL Editor to diagnose the issue
-- Replace 'YOUR_BUSINESS_ID' with: aaa991c4-1ce5-4efb-9fe2-4484e5d08214

-- 1. Check all raffle periods
SELECT 
    id,
    status,
    start_date,
    end_date,
    CURRENT_DATE as today,
    CURRENT_DATE BETWEEN start_date AND end_date as is_current
FROM boost_raffle_periods
ORDER BY created_at DESC;

-- 2. Check all entries for your business
SELECT 
    bre.id,
    bre.business_id,
    bre.category,
    bre.entered_at,
    brp.id as period_id,
    brp.status as period_status,
    brp.start_date,
    brp.end_date
FROM boost_raffle_entries bre
LEFT JOIN boost_raffle_periods brp ON bre.raffle_period_id = brp.id
WHERE bre.business_id = 'aaa991c4-1ce5-4efb-9fe2-4484e5d08214';

-- 3. Test the has_entered_raffle function
SELECT has_entered_raffle('aaa991c4-1ce5-4efb-9fe2-4484e5d08214'::uuid) as has_entered;

-- 4. Check RLS policies on boost_raffle_entries
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'boost_raffle_entries';

-- 5. Direct check (this should work with SECURITY DEFINER)
SELECT EXISTS (
    SELECT 1
    FROM boost_raffle_entries bre
    INNER JOIN boost_raffle_periods brp ON bre.raffle_period_id = brp.id
    WHERE bre.business_id = 'aaa991c4-1ce5-4efb-9fe2-4484e5d08214'
    AND brp.status = 'active'
) as entry_exists;

-- 6. Count total entries in active raffle
SELECT 
    brp.id as period_id,
    brp.status,
    COUNT(bre.id) as total_entries
FROM boost_raffle_periods brp
LEFT JOIN boost_raffle_entries bre ON brp.id = bre.raffle_period_id
WHERE brp.status = 'active'
GROUP BY brp.id, brp.status;
