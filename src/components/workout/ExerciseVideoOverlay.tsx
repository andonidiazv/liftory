import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronUp, Play, Pause } from "lucide-react";

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
  // Playback state — drives the central play/pause icon visibility.
  const [isPaused, setIsPaused] = useState(false);
  // Momentary tap feedback — shows the central icon for ~700ms after a tap,
  // even while playing. Gives the user visual confirmation the tap registered.
  const [tapFeedback, setTapFeedback] = useState<"play" | "pause" | null>(null);
  // Discoverability hint shown the first 2.5s after opening, fades out.
  const [showHint, setShowHint] = useState(true);
  const touchStartY = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setTranslateY(0);
      setOpacity(1);
      setClosing(false);
      setIsPaused(false);
      setTapFeedback(null);
      setShowHint(true);
      // Auto-pause video after 30s
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      autoPauseTimer.current = setTimeout(() => {
        videoRef.current?.pause();
        // Trigger the persistent paused indicator
        setIsPaused(true);
      }, 30000);
      // Hide the "Toca para pausar" hint after 2.5s
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setShowHint(false), 2500);
    }
    return () => {
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      if (tapFeedbackTimer.current) clearTimeout(tapFeedbackTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
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
    // Tapping anywhere also dismisses the initial hint immediately.
    setShowHint(false);
    if (v.paused) {
      v.play();
      setIsPaused(false);
      // Reset auto-pause timer — full 30s starting now
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      autoPauseTimer.current = setTimeout(() => {
        v.pause();
        setIsPaused(true);
      }, 30000);
      // Brief play-icon flash to confirm the tap was registered
      setTapFeedback("play");
      if (tapFeedbackTimer.current) clearTimeout(tapFeedbackTimer.current);
      tapFeedbackTimer.current = setTimeout(() => setTapFeedback(null), 700);
    } else {
      v.pause();
      setIsPaused(true);
      // Cancel pending auto-pause when the user pauses manually
      if (autoPauseTimer.current) clearTimeout(autoPauseTimer.current);
      // No tap feedback needed — the persistent paused indicator already shows
      setTapFeedback(null);
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
      <div className="relative flex flex-1 flex-col items-center justify-center px-4">
        {videoUrl ? (
          <>
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

            {/* Persistent paused indicator — big Play icon centered, tap to resume.
                Visible whenever the video is paused (manual or 30s auto-pause). */}
            {isPaused && (
              <button
                onClick={togglePlayPause}
                aria-label="Reproducir"
                className="absolute inset-0 flex items-center justify-center pointer-events-auto"
              >
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-sm animate-fade-in"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(255,255,255,0.3)" }}
                >
                  <Play className="h-9 w-9 ml-1" style={{ color: "rgba(255,255,255,0.95)" }} fill="rgba(255,255,255,0.95)" />
                </span>
              </button>
            )}

            {/* Momentary tap feedback — flashes the matching icon for ~700ms
                so the user sees their tap registered. Pointer-events: none so
                the underlying video click area still works. */}
            {tapFeedback && !isPaused && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ animation: "video-tap-flash 700ms ease-out forwards" }}
              >
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                >
                  {tapFeedback === "play" ? (
                    <Play className="h-9 w-9 ml-1" style={{ color: "rgba(255,255,255,0.95)" }} fill="rgba(255,255,255,0.95)" />
                  ) : (
                    <Pause className="h-9 w-9" style={{ color: "rgba(255,255,255,0.95)" }} fill="rgba(255,255,255,0.95)" />
                  )}
                </span>
              </div>
            )}

            {/* First-time tap hint — auto-fades after 2.5s, dismissed on first tap. */}
            {showHint && !isPaused && (
              <div
                className="absolute pointer-events-none"
                style={{
                  bottom: "12%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  animation: "video-hint-fade 2500ms ease-out forwards",
                }}
              >
                <span
                  className="font-body text-xs px-3 py-1.5 rounded-full"
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    backgroundColor: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  Toca para pausar
                </span>
              </div>
            )}
          </>
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
