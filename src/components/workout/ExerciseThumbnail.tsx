import { useState, useRef, useCallback } from "react";
import { Dumbbell } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

interface Props {
  thumbnailUrl: string | null;
  videoUrl: string | null;
  name: string;
  width?: number;
  height?: number;
}

/**
 * Displays an exercise thumbnail with three fallback levels:
 * 1. thumbnail_url image (if set in DB)
 * 2. Auto-extracted video frame at 30% duration (if video_url exists)
 * 3. Dumbbell icon placeholder
 */
export default function ExerciseThumbnail({
  thumbnailUrl,
  videoUrl,
  name,
  width = 64,
  height = 48,
}: Props) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = video.duration * 0.3;
  }, []);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setFrameUrl(dataUrl);
    } catch {
      setFailed(true);
    }
  }, []);

  // Case 1: Has a real thumbnail URL
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        className="h-full w-full object-cover"
        style={{ width, height }}
      />
    );
  }

  // Case 2: Has video but no thumbnail — extract frame at 30%
  if (videoUrl && !failed) {
    return (
      <div style={{ width, height }} className="relative overflow-hidden bg-secondary">
        {/* Hidden video + canvas for frame extraction */}
        {!frameUrl && (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              crossOrigin="anonymous"
              className="hidden"
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              onSeeked={handleSeeked}
              onError={() => setFailed(true)}
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {frameUrl ? (
          <img
            src={frameUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className="h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: t.muted, borderTopColor: "transparent" }}
            />
          </div>
        )}
      </div>
    );
  }

  // Case 3: No thumbnail, no video — icon fallback
  return (
    <div
      className="flex items-center justify-center bg-secondary"
      style={{ width, height }}
    >
      <Dumbbell className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
