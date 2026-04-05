import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  hasActiveSubscription,
} from "@/lib/pushNotifications";

// ── localStorage: track dismissals ──
const DISMISS_KEY = "liftory_push_prompt_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // silent
  }
}

/**
 * Non-intrusive bottom prompt that asks the user to enable
 * push notifications. Only shown when:
 * - Push is supported by the browser
 * - Permission is "default" (not yet asked)
 * - User hasn't dismissed recently (7 day cooldown)
 * - User doesn't already have an active subscription
 *
 * Design: matches LIFTORY's dark aesthetic. Small card above
 * the tab bar with a bell icon, short text, and two buttons.
 */
export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Don't show if not supported, already granted, or recently dismissed
    if (!isPushSupported()) return;
    if (getPushPermission() !== "default") return;
    if (wasDismissedRecently()) return;

    // Check if already subscribed
    hasActiveSubscription().then((active) => {
      if (!active) {
        // Small delay so it doesn't flash on page load
        const t = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(t);
      }
    });
  }, [user]);

  const handleEnable = useCallback(async () => {
    if (!user) return;
    setSubscribing(true);
    const success = await subscribeToPush(user.id);
    setSubscribing(false);
    if (success) {
      setShow(false);
    } else {
      // If user denied permission, dismiss the prompt
      markDismissed();
      setShow(false);
    }
  }, [user]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed left-4 right-4 z-[55] transition-all duration-300"
      style={{
        bottom: 80, // above TabBar (z-50, ~68px tall)
        transform: show ? "translateY(0)" : "translateY(100px)",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        className="rounded-2xl px-4 py-4 flex items-start gap-3"
        style={{
          background: "#1C1C1E",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Bell icon */}
        <div
          className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(199,91,57,0.15)" }}
        >
          <Bell className="h-5 w-5" style={{ color: "#C75B39" }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="font-display text-[14px] font-[700]"
            style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}
          >
            Activa notificaciones
          </p>
          <p
            className="font-body text-[12px] mt-0.5 leading-snug"
            style={{ color: "#8A8A8E" }}
          >
            Te avisamos cuando tus badges sean revisados.
          </p>

          {/* Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="flex-1 rounded-lg py-2 font-display text-[12px] font-[700] transition-all active:scale-[0.97]"
              style={{ background: "#C75B39", color: "#FAF8F5" }}
            >
              {subscribing ? "Activando..." : "Activar"}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-2 font-body text-[12px]"
              style={{ color: "#666" }}
            >
              Ahora no
            </button>
          </div>
        </div>

        {/* Close X */}
        <button
          onClick={handleDismiss}
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <X className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>
    </div>
  );
}
