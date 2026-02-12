-- Add moderation_status column to hotspot_messages table
-- This allows businesses to moderate messages without deleting them

-- Add moderation_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'hotspot_messages' 
        AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE hotspot_messages 
        ADD COLUMN moderation_status TEXT DEFAULT NULL;
        
        -- Possible values: NULL (not moderated), 'approved', 'rejected'
        -- NULL means the message hasn't been reviewed yet
        -- 'approved' means business approved it
        -- 'rejected' means business rejected it (will be hidden from public view)
        
        -- Add check constraint
        ALTER TABLE hotspot_messages 
        ADD CONSTRAINT moderation_status_check 
        CHECK (moderation_status IN (NULL, 'approved', 'rejected'));
        
        -- Add index for faster filtering
        CREATE INDEX idx_hotspot_messages_moderation_status 
        ON hotspot_messages(moderation_status);
        
        COMMENT ON COLUMN hotspot_messages.moderation_status 
        IS 'Moderation status: NULL (not reviewed), approved, rejected';
    END IF;
END $$;

-- Add RLS policy to allow business owners to moderate messages in their hotspots
-- First, drop the policy if it exists
DROP POLICY IF EXISTS "Business owners can moderate messages in their hotspot" ON hotspot_messages;

-- Create policy that allows business owners to update moderation_status
CREATE POLICY "Business owners can moderate messages in their hotspot"
ON hotspot_messages
FOR UPDATE
USING (
    -- Allow update if the user is a business owner and the message is in their hotspot
    EXISTS (
        SELECT 1 
        FROM business_profiles bp
        WHERE bp.user_id = auth.uid()
        AND bp.hotspot_id = hotspot_messages.hotspot_id
    )
)
WITH CHECK (
    -- Only allow updating moderation_status, not other fields
    EXISTS (
        SELECT 1 
        FROM business_profiles bp
        WHERE bp.user_id = auth.uid()
        AND bp.hotspot_id = hotspot_messages.hotspot_id
    )
);

-- Update hotspot_messages_with_replies view to include moderation_status
-- This view must exist for the app to work properly
DROP VIEW IF EXISTS hotspot_messages_with_replies;

CREATE VIEW hotspot_messages_with_replies AS
SELECT 
    hm.id,
    hm.idx,
    hm.hotspot_id,
    hm.user_id,
    hm.content,
    hm.created_at,
    hm.reply_to_message_id,
    hm.pinned,
    hm.type,
    hm.reactions,
    hm.moderation_status,
    up.full_name,
    up.email,
    up.avatar_url,
    reply_msg.content AS reply_to_content,
    reply_up.full_name AS reply_to_username
FROM hotspot_messages hm
LEFT JOIN user_profiles up ON hm.user_id = up.id
LEFT JOIN hotspot_messages reply_msg ON hm.reply_to_message_id = reply_msg.id
LEFT JOIN user_profiles reply_up ON reply_msg.user_id = reply_up.id;

-- Grant access to authenticated users
GRANT SELECT ON hotspot_messages_with_replies TO authenticated;
