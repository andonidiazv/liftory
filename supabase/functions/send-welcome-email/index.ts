// ══════════════════════════════════════════════════════════════
// Edge Function: send-welcome-email
//
// Triggered via a Supabase Database Webhook when a new row
// is inserted into user_profiles. Sends a branded welcome
// email to the new user.
//
// Webhook config (set in Supabase Dashboard → Database → Webhooks):
//   Table:  user_profiles
//   Events: INSERT
//   URL:    https://<project>.supabase.co/functions/v1/send-welcome-email
//   Headers: Authorization: Bearer <service_role_key>
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sendEmail, buildWelcomeEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Database webhooks send: { type, table, record, schema, old_record }
    const record = body.record ?? body;
    const userId = record.user_id;

    if (!userId) {
      console.warn("[welcome-email] No user_id in payload, skipping");
      return new Response(
        JSON.stringify({ success: false, message: "No user_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Get user email from auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      console.error("[welcome-email] Could not get user email:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, message: "User email not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const email = userData.user.email;
    const displayName =
      record.display_name ||
      userData.user.user_metadata?.full_name ||
      userData.user.user_metadata?.name ||
      "Atleta";

    console.log(`[welcome-email] Sending to ${email} (${displayName})`);

    const { subject, html } = buildWelcomeEmail(displayName);
    const sent = await sendEmail({ to: email, subject, html });

    return new Response(
      JSON.stringify({ success: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[welcome-email] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
