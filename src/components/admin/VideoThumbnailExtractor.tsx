import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2, Image as ImageIcon, ZoomIn, ZoomOut } from "lucide-react";
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [sliderValue, setSliderValue] = useState(30); // percentage
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [autoExtracted, setAutoExtracted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0.5); // 0-1, center of visible area
  const [panY, setPanY] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Fetch remote videos as blob to avoid CORS/tainted canvas issues
  useEffect(() => {
    let revoke: string | null = null;
    if (videoSrc instanceof File) {
      const url = URL.createObjectURL(videoSrc);
      revoke = url;
      setBlobUrl(url);
    } else if (videoSrc && typeof videoSrc === "string") {
      fetch(videoSrc)
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          revoke = url;
          setBlobUrl(url);
        })
        .catch(() => setBlobUrl(videoSrc)); // fallback to direct URL
    } else {
      setBlobUrl(null);
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [videoSrc]);

  // Reset zoom and pan when the video source changes
  useEffect(() => {
    setZoom(1);
    setPanX(0.5);
    setPanY(0.5);
    setAutoExtracted(false);
    setVideoReady(false);
    setPreviewDataUrl(null);
  }, [videoSrc]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    // Output size — 16:9 aspect ratio for thumbnail
    const outputW = 640;
    const outputH = 360;
    canvas.width = outputW;
    canvas.height = outputH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate source rectangle based on zoom and pan
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    // The visible portion of the video (smaller when zoomed in)
    const visibleW = videoW / zoom;
    const visibleH = videoH / zoom;

    // Pan offset (panX/panY are 0-1, center of visible area)
    const maxOffsetX = videoW - visibleW;
    const maxOffsetY = videoH - visibleH;
    const sx = panX * maxOffsetX;
    const sy = panY * maxOffsetY;

    ctx.drawImage(video, sx, sy, visibleW, visibleH, 0, 0, outputW, outputH);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [zoom, panX, panY]);

  // Re-capture preview whenever zoom or pan changes
  useEffect(() => {
    if (!videoReady) return;
    const dataUrl = captureFrame();
    if (dataUrl) {
      setPreviewDataUrl(dataUrl);
    }
  }, [zoom, panX, panY, captureFrame, videoReady]);

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

  // Zoom slider change
  const handleZoomChange = useCallback((value: number[]) => {
    const newZoom = value[0] / 100; // slider is 100-300, map to 1-3
    setZoom(newZoom);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- Drag/pan handlers (mouse) ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || zoom <= 1) return;
      e.preventDefault();
      const preview = previewRef.current;
      if (!preview) return;

      const rect = preview.getBoundingClientRect();
      const dx = (e.clientX - dragStartRef.current.x) / rect.width;
      const dy = (e.clientY - dragStartRef.current.y) / rect.height;

      setPanX((prev) => Math.max(0, Math.min(1, prev - dx)));
      setPanY((prev) => Math.max(0, Math.min(1, prev - dy)));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // --- Drag/pan handlers (touch) ---
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (zoom <= 1) return;
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || zoom <= 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const preview = previewRef.current;
      if (!preview) return;

      const rect = preview.getBoundingClientRect();
      const dx = (touch.clientX - dragStartRef.current.x) / rect.width;
      const dy = (touch.clientY - dragStartRef.current.y) / rect.height;

      setPanX((prev) => Math.max(0, Math.min(1, prev - dx)));
      setPanY((prev) => Math.max(0, Math.min(1, prev - dy)));
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [isDragging, zoom]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouseup to stop drag even if mouse leaves the preview
  useEffect(() => {
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  // Upload thumbnail to Supabase Storage
  const handleUseFrame = useCallback(async () => {
    // Re-capture with current zoom/pan to ensure canvas matches preview
    captureFrame();

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

      // Also persist to exercises table directly
      const { error: dbError } = await supabase
        .from("exercises")
        .update({ thumbnail_url: url })
        .eq("id", exerciseId);

      if (dbError) throw dbError;

      onThumbnailChange(url);
      toast({ title: "Thumbnail guardado" });
    } catch (err: unknown) {
      toast({
        title: "Error al subir thumbnail",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [exerciseId, onThumbnailChange, onThumbnailBlobChange, previewDataUrl, captureFrame]);

  if (!blobUrl) return null;

  const previewCursor =
    zoom <= 1
      ? "cursor-default"
      : isDragging
        ? "cursor-grabbing"
        : "cursor-grab";

  return (
    <div className="space-y-3">
      <label className="text-label-tech text-muted-foreground flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" />
        Selector de thumbnail
      </label>

      {/* Hidden video for frame extraction */}
      <video
        ref={videoRef}
        src={blobUrl}
        className="hidden"
        preload="auto"
        muted
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Preview with drag-to-pan */}
      {previewDataUrl && (
        <div
          ref={previewRef}
          className={`rounded-lg overflow-hidden select-none ${previewCursor}`}
          style={{
            background: "#0D0C0A",
            aspectRatio: "16/9",
            position: "relative",
            touchAction: zoom > 1 ? "none" : "auto",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={previewDataUrl}
            alt="Thumbnail preview"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {/* Zoom indicator badge */}
          {zoom > 1 && (
            <div
              className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium"
              style={{
                background: "rgba(13, 12, 10, 0.75)",
                color: "#FAF8F5",
                backdropFilter: "blur(4px)",
              }}
            >
              {zoom.toFixed(1)}x
            </div>
          )}
          {/* Drag hint when zoomed */}
          {zoom > 1 && !isDragging && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[10px] font-body"
              style={{
                background: "rgba(13, 12, 10, 0.65)",
                color: "rgba(250, 248, 245, 0.7)",
                backdropFilter: "blur(4px)",
              }}
            >
              Arrastra para reposicionar
            </div>
          )}
        </div>
      )}

      {/* Timeline slider */}
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

      {/* Zoom slider */}
      {videoReady && previewDataUrl && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <ZoomOut
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "#B8622F" }}
            />
            <div className="flex-1">
              <Slider
                value={[zoom * 100]}
                onValueChange={handleZoomChange}
                min={100}
                max={300}
                step={5}
                className="cursor-pointer [&_[role=slider]]:border-[#B8622F] [&_[role=slider]]:bg-[#B8622F] [&_[data-orientation=horizontal]>[data-orientation=horizontal]]:bg-[#B8622F]"
              />
            </div>
            <ZoomIn
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "#B8622F" }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground font-body text-center">
            Zoom: {zoom.toFixed(1)}x
            {zoom > 1 ? " — arrastra la imagen para ajustar posición" : ""}
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
