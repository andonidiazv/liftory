// ══════════════════════════════════════════════════════════════
// Edge Function: send-push-notification
//
// Called from the admin client (AdminBadges.tsx) after a badge
// is approved or rejected. Sends push notifications to all of
// the athlete's registered devices.
//
// Supports:
//   type = "web"    → Web Push API with VAPID (current)
//   type = "native" → FCM HTTP v1 (future, when Capacitor is added)
//
// Required Supabase secrets:
//   VAPID_PRIVATE_KEY  — base64url-encoded ECDSA P-256 private key
//   VAPID_PUBLIC_KEY   — base64url-encoded ECDSA P-256 public key
//   VAPID_EMAIL        — contact email for VAPID (e.g. mailto:hello@liftory.com)
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize web-push with VAPID details
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
    // ── Auth: verify caller is admin ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    // ── Parse request ──
    const { userId, status, badgeName, tierLabel } = await req.json();

    if (!userId || !status) {
      throw new Error("userId and status are required");
    }

    // ── Build notification payload ──
    const isApproved = status === "approved";
    const payload = JSON.stringify({
      title: isApproved ? "Badge aprobado" : "Badge no aprobado",
      body: isApproved
        ? `Tu badge ${badgeName || ""} ${tierLabel || ""} fue aprobado. Ya es parte de tu perfil.`
        : `Tu badge ${badgeName || ""} ${tierLabel || ""} no fue aprobado. Puedes volver a enviar tu video.`,
      url: isApproved ? "/badges" : "/badges",
      tag: `badge-review-${Date.now()}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    // ── Get all push subscriptions for this user ──
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      console.error("[push] Failed to fetch subscriptions:", subError.message);
      throw new Error("Failed to fetch subscriptions");
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ── Send to each subscription ──
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        if (sub.type === "web" && sub.endpoint && sub.p256dh && sub.auth) {
          // Web Push
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 86400 }, // 24 hours
          );
          sent++;
        } else if (sub.type === "native" && sub.device_token) {
          // Future: FCM HTTP v1 API for Capacitor apps
          // This block will be implemented when Capacitor is added.
          // For now, skip native subscriptions.
          console.info("[push] Native subscription skipped (not yet implemented):", sub.id);
        }
      } catch (err: any) {
        failed++;
        // 404 or 410 = subscription expired/invalid → clean up
        if (err.statusCode === 404 || err.statusCode === 410) {
          staleIds.push(sub.id);
          console.info("[push] Stale subscription removed:", sub.id);
        } else {
          console.error("[push] Send failed for", sub.id, ":", err.message || err);
        }
      }
    }

    // ── Clean up stale subscriptions ──
    if (staleIds.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, cleaned: staleIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[send-push-notification] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
