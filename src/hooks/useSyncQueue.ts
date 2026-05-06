import { useEffect, useState } from "react";
import { syncQueue, type SyncState } from "@/lib/syncQueue";

/** React hook to subscribe to the global sync queue state for UI rendering. */
export function useSyncQueue(): SyncState {
  const [state, setState] = useState<SyncState>(() => syncQueue.getState());
  useEffect(() => syncQueue.subscribe(setState), []);
  return state;
}
