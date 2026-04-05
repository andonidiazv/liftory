import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ShareBadgeData {
  badgeName: string;
  tierLabel: string;
  tierColor: string;
  exerciseName: string;
  iconName: string | null;
}

/**
 * Hook that captures the hidden BadgeShareCard with html2canvas
 * and shares it via the Web Share API (with download fallback).
 *
 * Same proven pattern used by WorkoutComplete story card.
 */
export function useShareBadgeCard() {
  const { profile } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [cardData, setCardData] = useState<ShareBadgeData | null>(null);

  const athleteName = profile?.full_name || "Atleta";
  const avatarUrl: string | null = (profile as any)?.avatar_url || null;

  const share = useCallback(
    async (data: ShareBadgeData) => {
      // 1. Set card data so the component renders with the correct badge info
      setCardData(data);
      setSharing(true);

      // Give React one frame to render the card with updated data
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      try {
        const ref = cardRef.current;
        if (!ref) {
          setSharing(false);
          return;
        }

        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(ref, {
          backgroundColor: null,
          scale: 3,
          useCORS: true,
          width: 360,
          height: 640,
        });

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) {
          setSharing(false);
          return;
        }

        const fileName = `liftory-badge-${data.badgeName.toLowerCase().replace(/\s+/g, "-")}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `LIFTORY Badge: ${data.badgeName}`,
            text: `${data.badgeName} — ${data.tierLabel} en LIFTORY`,
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch {
        // Share cancelled or failed — silent
      }

      setSharing(false);
    },
    [],
  );

  return {
    cardRef,
    sharing,
    share,
    cardData,
    athleteName,
    avatarUrl,
  };
}
