-- Fix for RLS Policy Issue on boost_raffle_entries
-- Run this in Supabase SQL Editor to fix the entry permission error

-- Drop all existing policies on boost_raffle_entries
DROP POLICY IF EXISTS "Business owners can view their raffle entries" ON boost_raffle_entries;
DROP POLICY IF EXISTS "Business owners can enter raffles" ON boost_raffle_entries;
DROP POLICY IF EXISTS "Anyone can see entry statistics" ON boost_raffle_entries;

-- Create simplified and corrected policies

-- 1. Business owners can view their own entries
CREATE POLICY "Business owners can view their raffle entries"
    ON boost_raffle_entries
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM business_profiles 
            WHERE id = business_id 
            AND user_id = auth.uid()
        )
    );

-- 2. Business owners can insert their own entries (with duplicate check)
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

-- Verify the policies were created
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
