import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Email no válido").max(255),
  password: z.string().min(1, "La contraseña es obligatoria").max(128),
});

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const inputStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E0DCD7",
    color: "#1C1C1E",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    transition: "border-color 0.2s",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#1C1C1E";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#E0DCD7";
  };

  const redirectByProfile = async (userId: string) => {
    try {
      const profilePromise = supabase
        .from("user_profiles")
        .select("onboarding_completed, subscription_status, role")
        .eq("user_id", userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as { data: { onboarding_completed: boolean; subscription_status: string; role: string } | null; error: unknown };

      fetchProfile(userId).catch(console.error);

      if (error) {
        console.error("Profile fetch error:", error);
        navigate("/home", { replace: true });
        return;
      }

      if (!data || !data.onboarding_completed) {
        navigate("/onboarding", { replace: true });
      } else if (data.subscription_status === "expired") {
        navigate("/paywall", { replace: true });
      } else if (data.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      console.error("redirectByProfile error:", err);
      navigate("/home", { replace: true });
    }
  };

  const handleLogin = async () => {
    setErrors({});
    setGeneralError("");

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signIn(result.data.email, result.data.password);

      if (error) {
        setGeneralError(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        await redirectByProfile(data.user.id);
      }
    } catch (err: unknown) {
      console.error("Login redirect error:", err);
      setGeneralError("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotError("");
    const trimmed = forgotEmail.trim();
    if (!trimmed || !z.string().email().safeParse(trimmed).success) {
      setForgotError("Ingresa un email válido.");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/login`,
    });
    setForgotLoading(false);
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSent(true);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setGeneralError("");
    const { error } = await signInWithGoogle();
    if (error) {
      setGeneralError(error.message);
    }
    setGoogleLoading(false);
  };

  return (
    <div
      className="grain-overlay flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "#FAF8F5" }}
    >
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Wordmark */}
        <h1
          className="font-display"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#1C1C1E" }}
        >
          LIFTORY
        </h1>

        <p className="mt-2 font-body" style={{ fontSize: 14, color: "#8A8580" }}>
          Inicia sesión en tu cuenta
        </p>

        {/* Form — login only */}
        <div className="mt-8 flex w-full flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: "#C0392B" }}>{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "#C0392B" }}>{errors.password}</p>
            )}
          </div>

          <button
            onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); setForgotError(""); }}
            className="self-end text-xs font-body font-medium"
            style={{ color: "#A09D98", background: "none", border: "none" }}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {generalError && (
            <p className="text-xs text-center" style={{ color: "#C0392B" }}>{generalError}</p>
          )}

          {/* Primary CTA */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="press-scale w-full font-body font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: "#1C1C1E",
              color: "#FAF8F5",
              borderRadius: 50,
              padding: "14px 0",
              fontSize: 14,
              letterSpacing: "0.08em",
            }}
          >
            {loading ? "PROCESANDO..." : "INICIAR SESIÓN"}
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: "#E0DCD7" }} />
            <span className="font-body text-xs" style={{ color: "#6B6360" }}>o</span>
            <div className="flex-1 h-px" style={{ background: "#E0DCD7" }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="press-scale flex w-full items-center justify-center gap-3 font-body text-sm font-medium transition-opacity disabled:opacity-60"
            style={{
              background: "transparent",
              border: "1px solid #E0DCD7",
              color: "#1C1C1E",
              borderRadius: 50,
              padding: "14px 0",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : "Continuar con Google"}
          </button>
        </div>

        {/* Create account link */}
        <button
          onClick={() => navigate("/onboarding")}
          className="mt-8 font-body text-sm underline transition-colors"
          style={{ color: "#8A8580", background: "none", border: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1C1C1E")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8580")}
        >
          Crear cuenta nueva
        </button>
      </div>

      {/* Forgot Password Overlay */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowForgot(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "#FFFFFF", border: "1px solid #E0DCD7" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold" style={{ color: "#1C1C1E" }}>
              Recuperar contraseña
            </h2>

            {forgotSent ? (
              <>
                <p className="font-body text-sm" style={{ color: "#A0A0A0" }}>
                  Te enviamos un enlace de recuperación a <strong style={{ color: "#1C1C1E" }}>{forgotEmail.trim()}</strong>. Revisa tu bandeja de entrada.
                </p>
                <button
                  onClick={() => setShowForgot(false)}
                  className="press-scale w-full font-body font-semibold"
                  style={{ background: "#1C1C1E", color: "#FAF8F5", borderRadius: 50, padding: "14px 0", fontSize: 14, letterSpacing: "0.08em" }}
                >
                  ENTENDIDO
                </button>
              </>
            ) : (
              <>
                <p className="font-body text-sm" style={{ color: "#A0A0A0" }}>
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <input
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  style={inputStyle}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                />
                {forgotError && (
                  <p className="text-xs" style={{ color: "#C0392B" }}>{forgotError}</p>
                )}
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="press-scale w-full font-body font-semibold transition-opacity disabled:opacity-60"
                  style={{ background: "#1C1C1E", color: "#FAF8F5", borderRadius: 50, padding: "14px 0", fontSize: 14, letterSpacing: "0.08em" }}
                >
                  {forgotLoading ? "ENVIANDO..." : "ENVIAR ENLACE"}
                </button>
                <button
                  onClick={() => setShowForgot(false)}
                  className="w-full py-2 text-center font-body text-sm"
                  style={{ color: "#6B6360", background: "none", border: "none" }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
