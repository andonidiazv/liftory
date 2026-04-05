import { supabase } from "@/integrations/supabase/client";

// ══════════════════════════════════════════════════════════════
// Push Notification Utilities
//
// Supports two subscription types for future-proof architecture:
//   "web"    — Web Push API (PWA, current)
//   "native" — FCM/APNs via Capacitor (future App Store release)
//
// The push_subscriptions table stores both types. The Edge
// Function routes to the correct delivery channel.
// ══════════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/** Convert a URL-safe base64 string to Uint8Array (for applicationServerKey) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if Web Push is supported in this browser */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Check current notification permission state */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/** Register the service worker (idempotent — safe to call multiple times) */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("[Push] Service worker registration failed:", err);
    return null;
  }
}

/**
 * Subscribe the user to Web Push notifications.
 *
 * Flow:
 * 1. Register service worker
 * 2. Request notification permission (must be called from user gesture)
 * 3. Subscribe via PushManager
 * 4. Save subscription to Supabase push_subscriptions table
 *
 * Returns true if subscription was successful.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.warn("[Push] Not supported or VAPID key missing");
    return false;
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("[Push] Permission denied");
      return false;
    }

    // 2. Register SW and subscribe
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Wait for the SW to be ready
    const ready = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await ready.pushManager.getSubscription();

    if (!subscription) {
      subscription = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // 3. Extract keys
    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint || "";
    const p256dh = subJson.keys?.p256dh || "";
    const auth = subJson.keys?.auth || "";

    if (!endpoint || !p256dh || !auth) {
      console.warn("[Push] Subscription missing keys");
      return false;
    }

    // 4. Save to Supabase (upsert by user_id + endpoint)
    const { error } = await (supabase as any)
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          type: "web",
          endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      );

    if (error) {
      console.error("[Push] Failed to save subscription:", error.message);
      return false;
    }

    console.info("[Push] Subscribed successfully");
    return true;
  } catch (err) {
    console.error("[Push] Subscription failed:", err);
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 * Removes the subscription from both the browser and Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from DB
      await (supabase as any)
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
    }
  } catch (err) {
    console.warn("[Push] Unsubscribe failed:", err);
  }
}

/**
 * Check if user currently has an active push subscription.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
