import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useOnline } from "@/hooks/useOnline";

/**
 * Discreet status indicator for offline-first sync state.
 *
 * Renders nothing in the happy path (idle + online) so it doesn't clutter
 * the UI. Only appears when there's something to communicate:
 *   - offline (any state)
 *   - syncing (writes in flight)
 *   - pending writes waiting for retry
 *   - error after several failed attempts
 *
 * Pinned top-right with safe-area inset so it doesn't collide with the
 * notch / dynamic island on iOS.
 */
export default function SyncStatusBadge() {
  const sync = useSyncQueue();
  const online = useOnline();

  // Happy path — nothing to show.
  if (online && sync.kind === "idle") return null;

  let icon: React.ReactNode;
  let label: string;
  let color: string;
  let bg: string;

  if (!online) {
    icon = <CloudOff className="h-3.5 w-3.5" />;
    const pending = sync.kind !== "idle" ? sync.pending : 0;
    label = pending > 0 ? `Sin conexión · ${pending} pendiente${pending !== 1 ? "s" : ""}` : "Sin conexión";
    color = "rgb(245, 158, 11)"; // amber
    bg = "rgba(245, 158, 11, 0.12)";
  } else if (sync.kind === "syncing") {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    label = `Sincronizando · ${sync.pending}`;
    color = "rgb(59, 130, 246)"; // blue
    bg = "rgba(59, 130, 246, 0.12)";
  } else if (sync.kind === "error") {
    icon = <AlertCircle className="h-3.5 w-3.5" />;
    label = `${sync.pending} sin guardar`;
    color = "rgb(239, 68, 68)"; // red
    bg = "rgba(239, 68, 68, 0.12)";
  } else {
    // pending while online — typically transient
    icon = <Cloud className="h-3.5 w-3.5" />;
    label = `Guardando · ${sync.pending}`;
    color = "rgb(59, 130, 246)";
    bg = "rgba(59, 130, 246, 0.12)";
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono uppercase tracking-wider pointer-events-none"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        right: 12,
        fontSize: 9.5,
        letterSpacing: "1px",
        background: bg,
        color,
        border: `1px solid ${color}33`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      aria-live="polite"
      role="status"
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
