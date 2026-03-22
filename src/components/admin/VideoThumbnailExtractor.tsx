import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2, Image as ImageIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Props {
  /** The video source — either a URL string or a File object */
  videoSrc: string | File | null;
  /** Current thumbnail URL saved in the form */
  currentThumbnailUrl: string | null;
  /** Exercise ID (used as filename prefix when uploading) */
  exerciseId?: string;
  /** Callback when a thumbnail URL is selected/uploaded */
  onThumbnailChange: (url: string) => void;
  /** Callback when a thumbnail File blob is generated (for new exercises without ID yet) */
  onThumbnailBlobChange?: (blob: Blob | null) => void;
}

export default function VideoThumbnailExtractor({
  videoSrc,
  currentThumbnailUrl,
  exerciseId,
  onThumbnailChange,
  onThumbnailBlobChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [sliderValue, setSliderValue] = useState(30); // percentage
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [autoExtracted, setAutoExtracted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoSrcUrl =
    videoSrc instanceof File ? URL.createObjectURL(videoSrc) : videoSrc;

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoSrc instanceof File && videoSrcUrl) {
        URL.revokeObjectURL(videoSrcUrl);
      }
    };
  }, [videoSrc, videoSrcUrl]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  // Auto-extract at 30% when video loads
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setVideoReady(true);

    // Seek to 30%
    const targetTime = video.duration * 0.3;
    video.currentTime = targetTime;
    setSliderValue(30);
  }, []);

  const handleSeeked = useCallback(() => {
    const dataUrl = captureFrame();
    if (dataUrl) {
      setPreviewDataUrl(dataUrl);
      if (!autoExtracted) {
        setAutoExtracted(true);
      }
    }
  }, [captureFrame, autoExtracted]);

  // When slider changes, seek video
  const handleSliderChange = useCallback(
    (value: number[]) => {
      const pct = value[0];
      setSliderValue(pct);
      const video = videoRef.current;
      if (video && duration > 0) {
        video.currentTime = (pct / 100) * duration;
      }
    },
    [duration]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Upload thumbnail to Supabase Storage
  const handleUseFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setUploading(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas to blob failed"))),
          "image/jpeg",
          0.85
        );
      });

      if (!exerciseId) {
        // For new exercises, pass the blob up
        onThumbnailBlobChange?.(blob);
        if (previewDataUrl) onThumbnailChange(previewDataUrl);
        toast({ title: "Thumbnail seleccionado", description: "Se subirá al guardar el ejercicio." });
        setUploading(false);
        return;
      }

      const fileName = `${exerciseId}_thumb.jpg`;
      const { error } = await supabase.storage
        .from("exercise-thumbnails")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("exercise-thumbnails")
        .getPublicUrl(fileName);

      // Append cache-buster
      const url = `${data.publicUrl}?t=${Date.now()}`;
      onThumbnailChange(url);
      toast({ title: "Thumbnail guardado" });
    } catch (err: any) {
      toast({
        title: "Error al subir thumbnail",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [exerciseId, onThumbnailChange, onThumbnailBlobChange, previewDataUrl]);

  if (!videoSrcUrl) return null;

  return (
    <div className="space-y-3">
      <label className="text-label-tech text-muted-foreground flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" />
        Selector de thumbnail
      </label>

      {/* Hidden video for frame extraction */}
      <video
        ref={videoRef}
        src={videoSrcUrl}
        className="hidden"
        crossOrigin="anonymous"
        preload="auto"
        muted
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview */}
      {previewDataUrl && (
        <div className="rounded-lg overflow-hidden" style={{ background: "#0D0C0A" }}>
          <img
            src={previewDataUrl}
            alt="Thumbnail preview"
            className="w-full max-h-[180px] object-contain"
          />
        </div>
      )}

      {/* Slider */}
      {videoReady && duration > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground w-10">
              {formatTime((sliderValue / 100) * duration)}
            </span>
            <div className="flex-1">
              <Slider
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                min={0}
                max={100}
                step={0.5}
                className="cursor-pointer"
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">
              {formatTime(duration)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-body text-center">
            Arrastra el slider para elegir el frame del thumbnail
          </p>
        </div>
      )}

      {/* Use frame button */}
      {previewDataUrl && (
        <button
          onClick={handleUseFrame}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors w-full justify-center"
          style={{
            background: "#7A8B5C",
            color: "#FAF8F5",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {uploading ? "Subiendo..." : "Usar este frame como thumbnail"}
        </button>
      )}

      {/* Current saved thumbnail */}
      {currentThumbnailUrl && !previewDataUrl && (
        <div>
          <p className="text-[11px] text-muted-foreground font-body mb-1">Thumbnail actual:</p>
          <img
            src={currentThumbnailUrl}
            alt="Current thumbnail"
            className="h-24 w-auto rounded-lg object-cover"
          />
        </div>
      )}
    </div>
  );
}
