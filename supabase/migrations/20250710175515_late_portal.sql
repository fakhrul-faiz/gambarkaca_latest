/*
  # Add message notification type

  1. Changes
    - Update the notifications_type_check constraint to include 'message' type
    - This allows direct message notifications to be created properly

  2. Security
    - No changes to RLS policies needed
    - Existing notification policies will handle message notifications
*/

-- Drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated check constraint that includes 'message'
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK ((type = ANY (ARRAY['campaign_status'::text, 'order_status'::text, 'profile_status'::text, 'payment'::text, 'application'::text, 'message'::text])));