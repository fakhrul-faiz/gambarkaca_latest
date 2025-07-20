/*
  # Fix pg_net Extension Error

  This migration addresses the "schema 'net' does not exist" error by:
  1. Checking if pg_net extension is available
  2. Providing clear instructions if it's not enabled
  3. Creating a safe fallback trigger function

  ## Instructions
  Before running this migration, you MUST enable the pg_net extension:
  1. Go to your Supabase Dashboard
  2. Navigate to Database → Extensions
  3. Search for "pg_net"
  4. Click "Enable" next to pg_net
  5. Wait for it to be enabled (may take a few moments)
  6. Then run this migration
*/

-- First, check if pg_net extension is available and enabled
DO $$
BEGIN
  -- Check if pg_net extension exists and is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE EXCEPTION 'pg_net extension is not enabled. Please enable it in Supabase Dashboard → Database → Extensions before running this migration.';
  END IF;
END $$;

-- Drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON notifications;
DROP FUNCTION IF EXISTS send_whatsapp_notification();

-- Create the WhatsApp notification function that uses pg_net
CREATE OR REPLACE FUNCTION send_whatsapp_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_phone TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  function_url TEXT;
  notification_payload JSONB;
BEGIN
  -- Only send WhatsApp notifications for specific types
  IF NEW.type NOT IN ('campaign_status', 'order_status', 'payment', 'application') THEN
    RETURN NEW;
  END IF;

  -- Get user's phone number
  SELECT phone INTO user_phone
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only proceed if user has a phone number
  IF user_phone IS NULL OR user_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase configuration
  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.settings.service_role_key', true) INTO service_role_key;

  -- Construct the Edge Function URL
  function_url := supabase_url || '/functions/v1/send-whatsapp-notification';

  -- Prepare the payload
  notification_payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'type', NEW.type,
    'phone', user_phone
  );

  -- Make HTTP request to Edge Function using pg_net
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := notification_payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the notification insert
    RAISE WARNING 'Failed to send WhatsApp notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;