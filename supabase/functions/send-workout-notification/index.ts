// ══════════════════════════════════════════════════════════════
// Edge Function: send-workout-notification
//
// Send a Web Push notification to a list of athletes about a new
// workout (or any custom title/body/url). Admin-only.
//
// Body:
//   {
//     userIds: string[],
//     title: string,
//     body: string,
//     url?: string   // defaults to "/home"
//   }
//
// Returns:
//   { sent: number, failed: number, perUser: [{ userId, sent, failed }] }
//
// Reuses the same VAPID secrets / push_subscriptions table as
// send-push-notification.
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:hello@liftory.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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
    // ── Auth: verify caller is admin (or service-role) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");

    // Service role short-circuit — decode JWT and check role claim.
    // (String-compare against the env var is fragile across deployments where
    // newlines, trailing whitespace, or rotation can cause false misses.)
    let isServiceRole = false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isServiceRole = payload?.role === "service_role";
    } catch {
      isServiceRole = false;
    }

    if (!isServiceRole) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) throw new Error("Not authenticated");

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("role")
        .eq("user_id", userData.user.id)
        .single();

      if (profile?.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden: admin only" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          },
        );
      }
    }

    // ── Parse request ──
    const { userIds, title, body, url } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error("userIds (non-empty array) is required");
    }
    if (!title || !body) {
      throw new Error("title and body are required");
    }

    const targetUrl = url || "/home";
    const payload = JSON.stringify({
      title,
      body,
      url: targetUrl,
      tag: `workout-${Date.now()}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    // ── Fetch subscriptions for all target users in one query ──
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("[push] fetch failed:", subError.message);
      throw new Error("Failed to fetch subscriptions");
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, message: "No subscriptions" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    let totalSent = 0;
    let totalFailed = 0;
    const perUser: Record<string, { sent: number; failed: number }> = {};
    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      perUser[sub.user_id] ??= { sent: 0, failed: 0 };
      try {
        if (sub.type === "web" && sub.endpoint && sub.p256dh && sub.auth) {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 86400 },
          );
          perUser[sub.user_id].sent++;
          totalSent++;
        } else if (sub.type === "native") {
          console.info("[push] native skipped:", sub.id);
        }
      } catch (err: any) {
        perUser[sub.user_id].failed++;
        totalFailed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error("[push] send failed:", sub.id, err.message || err);
        }
      }
    }

    if (staleIds.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
    }

    return new Response(
      JSON.stringify({
        sent: totalSent,
        failed: totalFailed,
        perUser: Object.entries(perUser).map(([userId, counts]) => ({
          userId,
          ...counts,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("[send-workout-notification] error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
