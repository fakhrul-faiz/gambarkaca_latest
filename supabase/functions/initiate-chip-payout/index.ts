// supabase/functions/initiate-chip-payout/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

// Define the admin user ID for crediting admin fees
const ADMIN_USER_ID = '066e9f3d-9570-405e-8a43-ab1ed542e9a7'; // Replace with your actual admin user ID

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 405,
    });
  }

  try {
    const { userId, amount, bankName, accountNumber, accountHolder, withdrawalId } = await req.json();
    
    console.log('Received withdrawal request:', { userId, amount, bankName, accountNumber, accountHolder, withdrawalId });

    // Basic input validation
    if (!userId || !amount || !bankName || !accountNumber || !accountHolder || !withdrawalId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Retrieve CHIP API keys from environment variables (Supabase Secrets)
    const chipBrandId = Deno.env.get('CHIP_BRAND_ID');
    const chipSecretKey = Deno.env.get('CHIP_SECRET_KEY');
    const chipApiEndpoint = Deno.env.get('CHIP_API_ENDPOINT') || 'https://gate.chip-in.asia/api/v1/charges';
    
    console.log('CHIP API Endpoint:', chipApiEndpoint);
    console.log('CHIP Brand ID available:', !!chipBrandId);
    console.log('CHIP Secret Key available:', !!chipSecretKey);

    if (!chipBrandId || !chipSecretKey || !chipApiEndpoint) {
      console.error('CHIP API credentials not found in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error: CHIP API credentials missing.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // --- 1. Call CHIP Send API ---
    let chipPayoutId = null;
    let chipStatus = 'pending';
    let chipErrorMessage = null;

    try {
      console.log('Attempting CHIP API call to:', chipApiEndpoint);
      
      const chipResponse = await fetch(chipApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chipSecretKey}`, // Or whatever auth CHIP uses
          'X-Brand-Id': chipBrandId, // Example custom header
        },
        body: JSON.stringify({
          // This is a placeholder. Refer to CHIP API docs for actual payload.
          amount: amount,
          currency: 'MYR', // Assuming MYR based on your currency formatting
          bank_details: {
            bank_name: bankName,
            account_number: accountNumber,
            account_holder_name: accountHolder,
          },
          reference: `Withdrawal-${withdrawalId}`, // Unique reference for the payout
          // Add any other required fields by CHIP API
        }),
      });
      
      console.log('CHIP API response status:', chipResponse.status);

      const chipData = await chipResponse.json();
      console.log('CHIP API response data:', chipData);

      if (chipResponse.ok) {
        chipPayoutId = chipData.id; // Assuming CHIP returns an ID for the payout
        chipStatus = chipData.status || 'successful'; // Assuming CHIP returns a status
        console.log(`CHIP Payout successful: ${chipPayoutId}, Status: ${chipStatus}`);
      } else {
        chipStatus = 'failed';
        chipErrorMessage = chipData.detail || chipData.message || 'Unknown CHIP API error';
        console.error(`CHIP API Error: ${chipResponse.status} - ${chipErrorMessage}`);
      }
    } catch (chipApiError) {
      chipStatus = 'failed';
      chipErrorMessage = `Network or unexpected CHIP API error: ${chipApiError.message}`;
      console.error(`Error calling CHIP API: ${chipApiError.message}`);
      console.error('Full CHIP API error:', chipApiError);
    }

    // --- 2. Update `withdrawals` table with CHIP details ---
    const { error: updateWithdrawalError } = await supabase
      .from('withdrawals')
      .update({
        chip_payout_id: chipPayoutId,
        chip_status: chipStatus,
        chip_error_message: chipErrorMessage,
        status: chipStatus === 'successful' ? 'paid' : 'rejected', // Update main status based on CHIP
      })
      .eq('id', withdrawalId);

    if (updateWithdrawalError) {
      console.error('Error updating withdrawal record with CHIP details:', updateWithdrawalError);
      return new Response(JSON.stringify({ error: 'Failed to update withdrawal record after CHIP call.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    if (chipStatus !== 'successful') {
      // If CHIP payout failed, return error immediately
      return new Response(JSON.stringify({ success: false, message: `Withdrawal failed: ${chipErrorMessage}` }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      });
    }

    // --- 3. Deduct from talent's `total_earnings` and create transactions (only if CHIP payout was successful) ---
    const adminFee = amount * 0.1;
    const talentReceivedAmount = amount - adminFee;

    // Update talent's total_earnings
    const { data: currentProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('total_earnings')
      .eq('id', userId)
      .single();

    if (fetchProfileError || !currentProfile) {
      console.error('Error fetching talent profile:', fetchProfileError);
      return new Response(JSON.stringify({ error: 'Failed to fetch talent profile for earnings update.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    const newTotalEarnings = (currentProfile.total_earnings || 0) - amount;

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ total_earnings: newTotalEarnings })
      .eq('id', userId);

    if (updateProfileError) {
      console.error('Error updating talent total_earnings:', updateProfileError);
      return new Response(JSON.stringify({ error: 'Failed to update talent earnings.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Create transaction for talent (debit)
    const { error: talentTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount: amount,
        description: `Withdrawal to bank account (${bankName})`,
        related_order_id: withdrawalId, // Link to the withdrawal record
      });

    if (talentTxError) {
      console.error('Error creating talent transaction:', talentTxError);
      // Consider rolling back profile update if transaction fails
      return new Response(JSON.stringify({ error: 'Failed to record talent transaction.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Create transaction for admin (credit)
    const { error: adminTxError } = await supabase
      .from('transactions')
      .insert({
        user_id: ADMIN_USER_ID,
        type: 'credit',
        amount: adminFee,
        description: `Admin Fee (10%) from talent withdrawal ${withdrawalId}`,
        related_order_id: withdrawalId, // Link to the withdrawal record
      });

    if (adminTxError) {
      console.error('Error creating admin transaction:', adminTxError);
      // Consider rolling back previous transactions if this fails
      return new Response(JSON.stringify({ error: 'Failed to record admin fee transaction.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Withdrawal initiated successfully.' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (error) {
    console.error('Unhandled error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});