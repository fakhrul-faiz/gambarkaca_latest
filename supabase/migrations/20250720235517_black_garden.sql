/*
  # Re-enable WhatsApp Notification System

  This migration re-enables the WhatsApp notification system by:
  1. Dropping any existing trigger and function to ensure clean state
  2. Re-creating the send_whatsapp_notification function with full logic
  3. Re-creating the trigger on notifications table
  4. Ensuring proper permissions and configuration

  Prerequisites:
  - pg_net extension must be enabled
  - WASAPBOT_INSTANCE_ID and WASAPBOT_ACCESS_TOKEN environment variables must be set
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON public.notifications;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.send_whatsapp_notification();

-- Create the send_whatsapp_notification function
CREATE OR REPLACE FUNCTION public.send_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
    user_phone TEXT;
    user_name TEXT;
    whatsapp_message TEXT;
    wasapbot_payload JSONB;
    wasapbot_response JSONB;
    http_request_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
BEGIN
    -- Check if pg_net extension is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE LOG 'pg_net extension is not enabled. WhatsApp notification skipped for notification ID: %', NEW.id;
        RETURN NEW;
    END IF;

    -- Get Supabase configuration from database settings
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO service_role_key;

    -- If settings are not configured, use environment variables or skip
    IF supabase_url IS NULL OR supabase_url = '' THEN
        RAISE LOG 'Supabase URL not configured. WhatsApp notification skipped for notification ID: %', NEW.id;
        RETURN NEW;
    END IF;

    IF service_role_key IS NULL OR service_role_key = '' THEN
        RAISE LOG 'Service role key not configured. WhatsApp notification skipped for notification ID: %', NEW.id;
        RETURN NEW;
    END IF;

    -- Get user's phone number and name from profiles table
    SELECT phone, name INTO user_phone, user_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Check if user has a phone number
    IF user_phone IS NULL OR user_phone = '' THEN
        RAISE LOG 'User % has no phone number. WhatsApp notification skipped for notification ID: %', NEW.user_id, NEW.id;
        RETURN NEW;
    END IF;

    -- Format the WhatsApp message
    whatsapp_message := '🔔 *' || NEW.title || '*' || E'\n\n' || NEW.message || E'\n\n' || '_GambarKaca Platform_';

    -- Prepare the payload for the Edge Function
    wasapbot_payload := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type
    );

    -- Call the Supabase Edge Function using pg_net
    BEGIN
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/send-whatsapp-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := wasapbot_payload
        ) INTO http_request_id;

        RAISE LOG 'WhatsApp notification Edge Function called for notification ID: %. HTTP request ID: %', NEW.id, http_request_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error calling WhatsApp notification Edge Function for notification ID: %. Error: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER whatsapp_notification_trigger
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    WHEN (NEW.type = ANY (ARRAY['campaign_status'::text, 'order_status'::text, 'payment'::text, 'application'::text]))
    EXECUTE FUNCTION public.send_whatsapp_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_whatsapp_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_whatsapp_notification() TO service_role;

-- Log successful setup
DO $$
BEGIN
    RAISE LOG 'WhatsApp notification system re-enabled successfully. Trigger created on notifications table.';
END $$;