# WhatsApp Notification Setup Guide

This guide explains how to set up WhatsApp notifications using wasapbot in your GambarKaca application.

## Prerequisites

1. **Wasapbot Account**: You need an active wasapbot account with:
   - Instance ID: `609ACF283XXXX` (replace with your actual instance ID)
   - Access Token: `687c9e185296c` (replace with your actual access token)

2. **Supabase Project**: Your Supabase project should have:
   - Edge Functions enabled
   - pg_net extension enabled (for HTTP requests from database triggers)

## Setup Steps

### ⚠️ CRITICAL: Enable pg_net Extension First

**Before running any migrations, you MUST enable the pg_net extension:**

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Search for "pg_net"
4. Click **"Enable"** next to pg_net
5. Wait for it to be enabled (may take a few moments)
6. Verify it's enabled by checking the "Enabled" tab

**If you don't enable pg_net first, you'll get the error: "schema 'net' does not exist"**

### 1. Configure Environment Variables

In your Supabase project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following environment variables:
   ```
   WASAPBOT_INSTANCE_ID=609ACF283XXXX
   WASAPBOT_ACCESS_TOKEN=687c9e185296c
   ```
   
   **Important**: Replace the values above with your actual wasapbot credentials.

### 2. Enable pg_net Extension

1. Go to **Database** → **Extensions** in your Supabase dashboard
2. Search for `pg_net` and enable it
3. This extension allows database triggers to make HTTP requests

### 3. Configure Supabase Settings

Add these settings to your Supabase project:

1. Go to **Settings** → **Database** → **Custom Settings**
2. Add the following settings:
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
   ```
   
   Replace with your actual Supabase URL and service role key.

### 4. Deploy the Edge Function

The Edge Function `send-whatsapp-notification` has been created and will be automatically deployed to Supabase.

### 5. Run the Database Migration

The migration `add_whatsapp_notification_trigger.sql` will:
- Create the trigger function
- Set up the trigger on the notifications table
- Configure proper permissions

### 6. Test the Integration

To test if WhatsApp notifications are working:

1. Create a test notification in your application
2. Check the Supabase Edge Function logs for any errors
3. Verify that the WhatsApp message was sent to the user's phone number

## How It Works

1. **Notification Creation**: When your application creates a new notification in the `notifications` table
2. **Trigger Activation**: The database trigger `whatsapp_notification_trigger` fires automatically
3. **Edge Function Call**: The trigger calls the `send-whatsapp-notification` Edge Function
4. **User Lookup**: The Edge Function fetches the user's phone number from the `profiles` table
5. **Message Sending**: The Edge Function sends a formatted message to wasapbot API
6. **WhatsApp Delivery**: Wasapbot delivers the message to the user's WhatsApp

## Message Format

WhatsApp messages are formatted as:
```
🔔 *[Notification Title]*

[Notification Message]

_GambarKaca Platform_
```

## Notification Types

Currently, WhatsApp notifications are sent for these notification types:
- `campaign_status`
- `order_status` 
- `payment`
- `application`

You can modify this in the trigger function if needed.

## Troubleshooting

### Common Issues

1. **No WhatsApp message sent**:
   - Check if the user has a phone number in their profile
   - Verify wasapbot credentials in environment variables
   - Check Edge Function logs for errors

2. **Edge Function errors**:
   - Ensure pg_net extension is enabled
   - Verify Supabase settings are configured correctly
   - Check that environment variables are set

3. **Phone number format**:
   - Phone numbers should include country code (e.g., +60123456789)
   - The system automatically removes non-digit characters

### Logs and Monitoring

- **Edge Function Logs**: Check in Supabase Dashboard → Edge Functions → Logs
- **Database Logs**: Check in Supabase Dashboard → Database → Logs
- **Wasapbot Status**: Check your wasapbot dashboard for delivery status

## Security Notes

- Never expose your wasapbot credentials in frontend code
- Environment variables are securely stored in Supabase
- The Edge Function runs server-side with proper authentication
- Database triggers execute with appropriate permissions

## Customization

You can customize the WhatsApp notification system by:

1. **Modifying message format** in the Edge Function
2. **Adding/removing notification types** in the trigger function
3. **Adding conditional logic** for when to send notifications
4. **Enhancing error handling** and retry mechanisms

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify your wasapbot account status
3. Ensure all environment variables are correctly set
4. Test with a simple notification first