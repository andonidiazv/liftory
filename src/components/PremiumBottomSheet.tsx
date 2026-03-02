import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

interface PremiumBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export default function PremiumBottomSheet({ open, onClose, title, description }: PremiumBottomSheetProps) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full animate-fade-up rounded-t-2xl p-6"
        style={{ background: "#1A1A1A" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm font-body font-light" style={{ color: "#A89F95" }}>{description}</p>
        <button
          onClick={() => navigate("/paywall")}
          className="mt-5 w-full rounded-xl py-3.5 font-body font-bold text-foreground"
          style={{ background: "#C75B39", fontSize: 15 }}
        >
          Ver planes
        </button>
      </div>
    </div>
  );
}
