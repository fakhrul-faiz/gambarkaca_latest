import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: string
  title: string
  message: string
  type: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get wasapbot credentials from environment variables
    const wasapbotInstanceId = Deno.env.get('WASAPBOT_INSTANCE_ID')
    const wasapbotAccessToken = Deno.env.get('WASAPBOT_ACCESS_TOKEN')

    if (!wasapbotInstanceId || !wasapbotAccessToken) {
      console.error('Wasapbot credentials not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Wasapbot configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body to get notification data
    const notificationData: NotificationPayload = await req.json()
    console.log('Processing notification:', notificationData)

    // Fetch user's phone number from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone, name')
      .eq('id', notificationData.user_id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has a phone number
    if (!profile.phone) {
      console.log(`User ${notificationData.user_id} has no phone number, skipping WhatsApp notification`)
      return new Response(
        JSON.stringify({ message: 'User has no phone number, notification skipped' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format the WhatsApp message
    const whatsappMessage = `🔔 *${notificationData.title}*\n\n${notificationData.message}\n\n_GambarKaca Platform_`

    // Prepare wasapbot API payload
    const wasapbotPayload = {
      number: profile.phone.replace(/\D/g, ''), // Remove non-digit characters
      type: 'text',
      message: whatsappMessage,
      instance_id: wasapbotInstanceId,
      access_token: wasapbotAccessToken
    }

    console.log('Sending WhatsApp message to:', profile.phone)

    // Send message via wasapbot API
    const wasapbotResponse = await fetch('https://dash.wasapbot.my/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wasapbotPayload)
    })

    const wasapbotResult = await wasapbotResponse.json()

    if (wasapbotResponse.ok) {
      console.log('WhatsApp message sent successfully:', wasapbotResult)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp notification sent successfully',
          recipient: profile.name,
          phone: profile.phone
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('Wasapbot API error:', wasapbotResult)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          details: wasapbotResult
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error in send-whatsapp-notification function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})