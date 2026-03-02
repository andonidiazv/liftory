import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div
      className="grain-overlay flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "#0F0F0F" }}
    >
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <h1
          className="font-display"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFFFFF" }}
        >
          LIFTORY
        </h1>
        <p className="mt-2 font-body text-center" style={{ fontSize: 14, color: "#A89F95" }}>
          Inicia sesión para continuar
        </p>

        <p className="mt-10 font-body text-center" style={{ fontSize: 13, color: "#A89F95" }}>
          Autenticación disponible próximamente.
        </p>

        <button
          onClick={() => navigate("/")}
          className="mt-6 font-body transition-colors"
          style={{ fontSize: 14, color: "#A89F95", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C75B39")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#A89F95")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}
