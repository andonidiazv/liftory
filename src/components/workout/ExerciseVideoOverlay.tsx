import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronUp } from "lucide-react";

interface Props {
  videoUrl: string | null;
  exerciseName: string;
  coachingCue: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function ExerciseVideoOverlay({ videoUrl, exerciseName, coachingCue, visible, onClose }: Props) {
  const [translateY, setTranslateY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [closing, setClosing] = useState(false);
  const touchStartY = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setTranslateY(0);
      setOpacity(1);
      setClosing(false);
      // Auto-pause video after 30s
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      autoPauseTimer.current = setTimeout(() => {
        videoRef.current?.pause();
      }, 30000);
    }
    return () => {
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY < 0) {
      // Swiping up
      setTranslateY(deltaY);
      setOpacity(Math.max(0.3, 1 - Math.abs(deltaY) / 400));
    }
  };

  const handleTouchEnd = () => {
    if (translateY < -80) {
      handleClose();
    } else {
      setTranslateY(0);
      setOpacity(1);
    }
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      // Reset auto-pause timer
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      autoPauseTimer.current = setTimeout(() => v.pause(), 30000);
    } else {
      v.pause();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col"
      style={{
        backgroundColor: "#000",
        opacity: closing ? 0 : opacity,
        transform: closing ? "translateY(-100%)" : `translateY(${translateY}px)`,
        transition: closing || translateY === 0 ? "all 300ms ease-out" : "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-14 z-[95] flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
      >
        <X className="h-5 w-5" style={{ color: "rgba(255,255,255,0.6)" }} />
      </button>

      {/* Video area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            onClick={togglePlayPause}
            className="w-full rounded-lg"
            style={{ maxHeight: "75vh", objectFit: "contain" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="font-display text-2xl font-bold text-foreground">{exerciseName}</p>
            {coachingCue && (
              <p className="font-body italic text-center" style={{ fontSize: 14, color: "#7A8B5C" }}>
                {coachingCue}
              </p>
            )}
            <p className="font-body text-sm text-muted-foreground">Video próximamente</p>
          </div>
        )}
      </div>

      {/* Bottom info overlay */}
      {videoUrl && (
        <div className="px-6 pb-6">
          <p className="font-display text-lg font-bold text-foreground" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            {exerciseName}
          </p>
          {coachingCue && (
            <p className="mt-1 font-body italic" style={{ fontSize: 14, color: "#7A8B5C" }}>
              {coachingCue}
            </p>
          )}
        </div>
      )}

      {/* Swipe hint */}
      <div className="flex flex-col items-center pb-8 animate-pulse">
        <ChevronUp className="h-5 w-5 text-muted-foreground" />
        <p className="font-body text-xs text-muted-foreground mt-1">Desliza arriba para volver</p>
      </div>
    </div>
  );
}
