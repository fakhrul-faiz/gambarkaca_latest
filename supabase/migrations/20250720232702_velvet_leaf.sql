/*
  # Temporarily disable WhatsApp notification trigger

  This migration temporarily disables the WhatsApp notification trigger to prevent
  the "schema 'net' does not exist" error until pg_net extension is properly enabled.

  1. Drop the existing trigger
  2. Create a placeholder function that doesn't use pg_net
  3. Add instructions for re-enabling after pg_net setup

  IMPORTANT: After enabling pg_net extension, run the main WhatsApp setup migration.
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON notifications;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS send_whatsapp_notification();

-- Create a placeholder function that doesn't use pg_net
CREATE OR REPLACE FUNCTION send_whatsapp_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that WhatsApp notification was attempted but pg_net is not available
  RAISE NOTICE 'WhatsApp notification attempted for user % but pg_net extension is not enabled. Please enable pg_net extension and run the WhatsApp setup migration.', NEW.user_id;
  
  -- Return NEW to continue with the notification insert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger with the placeholder function
CREATE TRIGGER whatsapp_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.type IN ('campaign_status', 'order_status', 'payment', 'application'))
  EXECUTE FUNCTION send_whatsapp_notification();

-- Add a comment explaining the temporary state
COMMENT ON FUNCTION send_whatsapp_notification() IS 'Temporary placeholder function. Enable pg_net extension and run WhatsApp setup migration to activate WhatsApp notifications.';