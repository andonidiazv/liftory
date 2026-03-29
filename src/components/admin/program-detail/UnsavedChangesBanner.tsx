import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface UnsavedChangesBannerProps {
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving: boolean;
}

export function UnsavedChangesBanner({
  hasChanges,
  onSave,
  onDiscard,
  saving,
}: UnsavedChangesBannerProps) {
  if (!hasChanges) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        backgroundColor: "#1C1C1E",
        border: "1px solid #C75B39",
      }}
    >
      <span className="font-body text-sm" style={{ color: "#FAF8F5" }}>
        Cambios sin guardar
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDiscard}
        disabled={saving}
        className="font-body"
        style={{ color: "#8A8A8E" }}
      >
        Descartar
      </Button>

      <Button
        size="sm"
        onClick={onSave}
        disabled={saving}
        className="font-body"
        style={{ backgroundColor: "#C75B39", color: "#FAF8F5" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        Guardar
      </Button>
    </div>
  );
}
