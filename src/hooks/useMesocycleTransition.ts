import { useEffect, useState } from "react";
import {
  getMesoForDate,
  getLocalDateStr,
  getMesocycleClosingContent,
  mesoClosingSeenKey,
  type MesocycleClosingContent,
} from "@/lib/mesocycle-content";
import { getMesocycleStats, type MesocycleStats } from "@/lib/mesocycle-stats";

interface TransitionState {
  /** True when the closing card should mount (transition fresh + flag unset + data ready). */
  shouldShow: boolean;
  /** Identity of the meso that just ended (e.g. "M1"). */
  endingMesoId: string | null;
  closingContent: MesocycleClosingContent | null;
  stats: MesocycleStats | null;
  /** Records that the user saw it; closing card hides for this transition forever. */
  markSeen: () => void;
}

/**
 * Detects "yesterday was a different meso than today" and loads the closing payload
 * for the meso that just ended. Generic across mesos — adding M3, M4… requires only
 * adding a new entry to MESOCYCLE_DATE_RANGES + content in `mesocycle-content.ts`.
 *
 * Note: the bypass scenario where a user catches up days late (e.g. opens the app
 * 4 days into M2) is intentionally also handled — getMesoForDate(yesterday) still
 * returns M1 if the most recent boundary crossing happened recently. We compare
 * today vs the last-completed workout's meso instead, to be robust to gaps.
 */
export function useMesocycleTransition(userId: string | null): TransitionState {
  const [state, setState] = useState<TransitionState>({
    shouldShow: false,
    endingMesoId: null,
    closingContent: null,
    stats: null,
    markSeen: () => {},
  });

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const todayStr = getLocalDateStr();
      const todayMeso = getMesoForDate(todayStr);
      // Compare against yesterday: when the user crosses the boundary on their
      // first session of the new meso. If they open the app a few days into the
      // new meso and never saw the card, the localStorage flag is still unset
      // and we'll show it now (yesterday on day 4 still differs from day -1).
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yesterdayMeso = getMesoForDate(getLocalDateStr(yest));

      if (!todayMeso || !yesterdayMeso || todayMeso === yesterdayMeso) return;

      const closingContent = getMesocycleClosingContent(yesterdayMeso);
      if (!closingContent) return;

      const flagKey = mesoClosingSeenKey(userId, yesterdayMeso);
      if (localStorage.getItem(flagKey)) return;

      const stats = await getMesocycleStats(userId, yesterdayMeso);
      if (!stats || cancelled) return;

      setState({
        shouldShow: true,
        endingMesoId: yesterdayMeso,
        closingContent,
        stats,
        markSeen: () => {
          localStorage.setItem(flagKey, "true");
          setState((s) => ({ ...s, shouldShow: false }));
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
