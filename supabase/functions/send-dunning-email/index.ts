// ══════════════════════════════════════════════════════════════
// Edge Function: send-dunning-email
//
// Called by pg_cron daily job. Queries users with past_due
// subscriptions and sends the appropriate dunning email
// based on how many days since payment_failed_at.
//
// Dunning schedule:
//   Day 1  → Step 1 (sent immediately by stripe-webhook)
//   Day 3  → Step 2
//   Day 7  → Step 3
//   Day 14 → Step 4
//
// Requires service_role_key auth (called from pg_net).
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendEmail, buildPaymentFailedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://liftory.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map: days elapsed → dunning step
const DUNNING_SCHEDULE = [
  { minDays: 14, step: 4 },
  { minDays: 7, step: 3 },
  { minDays: 3, step: 2 },
  // Step 1 is sent immediately by stripe-webhook, not by this function
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // Get all users with past_due status and a payment_failed_at date
    const { data: pastDueUsers, error } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, subscription_tier, payment_failed_at, dunning_step")
      .eq("subscription_status", "past_due")
      .not("payment_failed_at", "is", null);

    if (error) {
      console.error("[dunning] Failed to query users:", error.message);
      throw new Error("Failed to query past_due users");
    }

    if (!pastDueUsers || pastDueUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No past_due users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    let emailsSent = 0;
    const now = Date.now();

    for (const user of pastDueUsers) {
      const failedAt = new Date(user.payment_failed_at).getTime();
      const daysElapsed = Math.floor((now - failedAt) / (1000 * 60 * 60 * 24));
      const currentStep = user.dunning_step || 1;

      // Determine which step this user should be on
      let targetStep = 1; // default
      for (const schedule of DUNNING_SCHEDULE) {
        if (daysElapsed >= schedule.minDays) {
          targetStep = schedule.step;
          break;
        }
      }

      // Only send if they haven't received this step yet
      if (targetStep > currentStep) {
        try {
          // Get user email
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.user_id);
          const userEmail = userData?.user?.email;
          const displayName = userData?.user?.user_metadata?.full_name || "Atleta";

          if (userEmail) {
            const { subject, html } = buildPaymentFailedEmail(displayName, targetStep);
            const sent = await sendEmail({ to: userEmail, subject, html });

            if (sent) {
              // Update dunning_step
              await supabaseAdmin
                .from("user_profiles")
                .update({ dunning_step: targetStep })
                .eq("user_id", user.user_id);

              emailsSent++;
              console.log(`[dunning] Step ${targetStep} sent to ${userEmail} (${daysElapsed} days elapsed)`);
            }
          }
        } catch (err) {
          console.error(`[dunning] Error processing user ${user.user_id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: pastDueUsers.length, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-dunning-email] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
