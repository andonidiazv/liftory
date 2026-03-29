import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { BLOCK_ORDER } from "@/constants/blocks";

interface AddBlockButtonProps {
  existingBlockLabels: string[];
  onInsert: (blockLabel: string) => void;
}

export function AddBlockButton({ existingBlockLabels, onInsert }: AddBlockButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableBlocks = BLOCK_ORDER.filter(
    (b) => !existingBlockLabels.includes(b)
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex items-center justify-center py-1" ref={dropdownRef}>
      <div className="flex-1 h-px" style={{ backgroundColor: "#2A2A2A" }} />
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-6 h-6 rounded-full mx-2 transition-colors hover:opacity-80"
        style={{
          border: "1px dashed #3A3A3A",
          color: "#8A8A8E",
          backgroundColor: "transparent",
        }}
        disabled={availableBlocks.length === 0}
      >
        <Plus className="w-3 h-3" />
      </button>
      <div className="flex-1 h-px" style={{ backgroundColor: "#2A2A2A" }} />

      {open && availableBlocks.length > 0 && (
        <div
          className="absolute top-full mt-1 z-30 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto w-56"
          style={{ backgroundColor: "#1C1C1E", border: "1px solid #3A3A3A" }}
        >
          {availableBlocks.map((block) => (
            <button
              key={block}
              onClick={() => {
                onInsert(block);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 font-mono text-xs hover:opacity-80 transition-opacity"
              style={{ color: "#FAF8F5" }}
            >
              {block}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
