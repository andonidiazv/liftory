import { useEffect, useState } from "react";

/**
 * Track online status with the browser's online/offline events.
 *
 * Note: navigator.onLine reports "online" if the device is connected to a
 * router, even if there's no actual internet (very common in gyms with
 * WiFi captive portals or weak cell). For a stronger signal we'd ping a
 * health endpoint periodically; for now we trust the events + treat any
 * supabase error as a hint that we may be offline.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
