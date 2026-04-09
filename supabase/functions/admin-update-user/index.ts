import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://liftory.app",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    // Verify caller is admin
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { userId, action, newValue } = await req.json();
    if (!userId || !action) throw new Error("userId and action are required");

    let result;

    switch (action) {
      case "update_email": {
        if (!newValue || typeof newValue !== "string") throw new Error("newValue (email) is required");
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email: newValue });
        if (error) throw error;
        result = { success: true, message: "Email updated" };
        break;
      }
      case "update_password": {
        if (!newValue || typeof newValue !== "string" || newValue.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newValue });
        if (error) throw error;
        result = { success: true, message: "Password updated" };
        break;
      }
      case "send_recovery": {
        // Get user email from auth
        const { data: targetUser, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getUserErr || !targetUser?.user?.email) throw new Error("Could not find user email");
        const targetEmail = targetUser.user.email;
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail);
        if (error) throw error;
        result = { success: true, message: `Recovery email sent to ${targetEmail}` };
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      admin_user_id: userData.user.id,
      action_type: `admin_${action}`,
      target_table: "auth.users",
      target_id: userId,
      new_values: { action, newValue: action === "update_password" ? "***" : newValue },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin-update-user] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
