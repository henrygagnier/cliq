-- Migration to add hotspot_id to business_profiles
-- Run this AFTER running the initial business-dashboard-schema.sql

-- Add hotspot_id column with foreign key to hotspots table
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS hotspot_id UUID REFERENCES hotspots(id) ON DELETE SET NULL;

-- Add unique constraint to ensure one business per hotspot
ALTER TABLE business_profiles 
ADD CONSTRAINT business_profiles_hotspot_id_key UNIQUE (hotspot_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_hotspot_id ON business_profiles(hotspot_id);

-- Note: This migration assumes you have a 'hotspots' table with an 'id' column
-- If your hotspots table has a different structure, adjust the foreign key reference accordingly
