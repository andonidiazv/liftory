import html2canvas from "html2canvas";

/**
 * Capture a DOM node as a 1080×1920 PNG and hand it to the platform's share sheet.
 *
 * Falls back to download when the browser doesn't expose the Web Share API
 * with file support (mostly desktop). On iOS Safari and Chrome Android the
 * native share sheet opens with Instagram Stories as a destination.
 */
export async function shareMesocycleClosing(
  node: HTMLElement,
  opts: { mesoId: string; userName?: string },
): Promise<{ ok: boolean; method: "share" | "download" | "cancelled" }> {
  const canvas = await html2canvas(node, {
    backgroundColor: "#08080A",
    scale: 1, // Node is already authored at 1080×1920 native pixels.
    useCORS: true,
    logging: false,
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.95),
  );
  if (!blob) return { ok: false, method: "download" };

  const filename = `liftory-${opts.mesoId.toLowerCase()}-completado.png`;
  const file = new File([blob], filename, { type: "image/png" });

  // Web Share API with files — supported on iOS 15+, Chrome Android.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${opts.mesoId} completado · LIFTORY`,
        text: opts.userName
          ? `${opts.userName} acaba de cerrar ${opts.mesoId} en LIFTORY`
          : `${opts.mesoId} completado · LIFTORY`,
      });
      return { ok: true, method: "share" };
    } catch (err) {
      // User cancelled the share sheet — not an error.
      if (err instanceof Error && err.name === "AbortError") {
        return { ok: true, method: "cancelled" };
      }
      // Fall through to download fallback.
    }
  }

  // Fallback: download the PNG so the user can post manually.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { ok: true, method: "download" };
}
