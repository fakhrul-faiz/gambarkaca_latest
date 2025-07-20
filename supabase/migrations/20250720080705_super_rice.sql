/*
  # Add WhatsApp Notification Trigger

  1. New Functions
    - `send_whatsapp_notification()` - Trigger function that calls the Edge Function
  
  2. New Triggers
    - `whatsapp_notification_trigger` - Fires after INSERT on notifications table
  
  3. Security
    - Function executes with SECURITY DEFINER to ensure proper permissions
  
  This migration sets up automatic WhatsApp notifications whenever a new notification
  is inserted into the notifications table.
*/

-- Create the trigger function that will call our Edge Function
CREATE OR REPLACE FUNCTION send_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSONB;
  response_status INTEGER;
BEGIN
  -- Only send WhatsApp notifications for certain notification types
  -- You can customize this logic based on your needs
  IF NEW.type IN ('campaign_status', 'order_status', 'payment', 'application') THEN
    
    -- Construct the payload for the Edge Function
    payload := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type
    );
    
    -- Get the Supabase URL from environment (this will be available in the function context)
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-whatsapp-notification';
    
    -- Call the Edge Function using pg_net extension
    -- Note: This requires the pg_net extension to be enabled in your Supabase project
    SELECT status INTO response_status
    FROM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );
    
    -- Log the result (optional)
    IF response_status = 200 THEN
      RAISE NOTICE 'WhatsApp notification sent successfully for user %', NEW.user_id;
    ELSE
      RAISE WARNING 'Failed to send WhatsApp notification for user %, status: %', NEW.user_id, response_status;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires after INSERT on notifications
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON notifications;
CREATE TRIGGER whatsapp_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_whatsapp_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_whatsapp_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION send_whatsapp_notification() TO service_role;