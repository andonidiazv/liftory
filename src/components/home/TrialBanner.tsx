import { useAuth } from "@/context/AuthContext";

const CONTEXTUAL_MESSAGES: Record<string, string> = {
  "1": "Explora tu programa personalizado",
  "2": "Explora tu programa personalizado",
  "3": "Sigue construyendo tu progreso",
  "4": "Sigue construyendo tu progreso",
  "5": "Último día completo mañana. Lo que construyas es tuyo.",
  "6": "Último día de trial. Tu progreso está listo para continuar.",
};

export default function TrialBanner() {
  const { isFreeTrial, daysLeftInTrial } = useAuth();

  if (!isFreeTrial()) return null;

  const left = daysLeftInTrial();
  const currentDay = Math.max(1, Math.min(6, 6 - left + 1));
  const progress = (currentDay / 6) * 100;
  const message = CONTEXTUAL_MESSAGES[String(currentDay)] ?? CONTEXTUAL_MESSAGES["1"];

  return (
    <div
      className="mt-6 overflow-hidden"
      style={{
        background: "linear-gradient(to right, rgba(199,91,57,0.08), transparent)",
        borderLeft: "3px solid #C75B39",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-foreground">
          Día {currentDay} de 6
        </span>
        <div
          className="overflow-hidden rounded-full"
          style={{ width: 100, height: 4, backgroundColor: "#2A2A2A" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: "#C75B39" }}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs font-body font-light" style={{ color: "#A89F95" }}>
        {message}
      </p>
    </div>
  );
}
