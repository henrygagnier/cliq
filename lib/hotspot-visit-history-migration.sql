-- Create permanent hotspot visit history table
CREATE TABLE IF NOT EXISTS hotspot_visit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotspot_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hotspot_visit_history_hotspot_id 
  ON hotspot_visit_history(hotspot_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_visit_history_user_id 
  ON hotspot_visit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_visit_history_visited_at 
  ON hotspot_visit_history(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotspot_visit_history_hotspot_visited 
  ON hotspot_visit_history(hotspot_id, visited_at DESC);

-- Enable Row Level Security
ALTER TABLE hotspot_visit_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all visit history
CREATE POLICY "Users can view all visit history"
  ON hotspot_visit_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own visits
CREATE POLICY "Users can insert their own visits"
  ON hotspot_visit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Optional: Add comment for documentation
COMMENT ON TABLE hotspot_visit_history IS 'Permanent record of all hotspot visits with timestamps for analytics and history';
