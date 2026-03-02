import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  email: z.string().trim().email("Email no válido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email no válido").max(255),
  password: z.string().min(1, "La contraseña es obligatoria").max(128),
});

export default function Login() {
  const navigate = useNavigate();
  const { signUp, signIn, signInWithGoogle, fetchProfile } = useAuth();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const inputStyle: React.CSSProperties = {
    background: "#1A1A1A",
    border: "1px solid #2A2A2A",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: "14px 16px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    transition: "border-color 0.2s",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#C75B39";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#2A2A2A";
  };

  const redirectByProfile = async (userId: string) => {
    await fetchProfile(userId);
    // Small delay to let profile state update
    const { data } = await (await import("@/integrations/supabase/client")).supabase
      .from("user_profiles")
      .select("onboarding_completed, subscription_status, role")
      .eq("user_id", userId)
      .single();

    if (!data || !data.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    } else if (data.subscription_status === "expired") {
      navigate("/paywall", { replace: true });
    } else if (data.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/home", { replace: true });
    }
  };

  const handleSignup = async () => {
    setErrors({});
    setGeneralError("");

    const result = signupSchema.safeParse({ fullName, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { data, error } = await signUp(result.data.email, result.data.password, result.data.fullName);

    if (error) {
      setGeneralError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await redirectByProfile(data.user.id);
    }
    setLoading(false);
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
    const { data, error } = await signIn(result.data.email, result.data.password);

    if (error) {
      setGeneralError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await redirectByProfile(data.user.id);
    }
    setLoading(false);
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
      style={{ background: "#0F0F0F" }}
    >
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Wordmark */}
        <h1
          className="font-display"
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFFFFF" }}
        >
          LIFTORY
        </h1>

        {/* Tabs */}
        <div className="mt-8 flex w-full rounded-xl overflow-hidden" style={{ background: "#1A1A1A" }}>
          {(["signup", "login"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrors({}); setGeneralError(""); }}
              className="flex-1 py-3 text-center font-body text-sm font-medium transition-colors"
              style={{
                color: tab === t ? "#FFFFFF" : "#6B6360",
                background: tab === t ? "#C75B39" : "transparent",
              }}
            >
              {t === "signup" ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="mt-6 flex w-full flex-col gap-4">
          {tab === "signup" && (
            <div>
              <input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ ...inputStyle, placeholderColor: "#6B6360" } as React.CSSProperties}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs" style={{ color: "#C0392B" }}>{errors.fullName}</p>
              )}
            </div>
          )}

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
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "#C0392B" }}>{errors.password}</p>
            )}
          </div>

          {tab === "login" && (
            <button
              className="self-end text-xs font-body font-medium"
              style={{ color: "#C75B39", background: "none", border: "none" }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {generalError && (
            <p className="text-xs text-center" style={{ color: "#C0392B" }}>{generalError}</p>
          )}

          {/* Primary CTA */}
          <button
            onClick={tab === "signup" ? handleSignup : handleLogin}
            disabled={loading}
            className="press-scale w-full font-body font-semibold transition-opacity disabled:opacity-60"
            style={{
              background: "#C75B39",
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 15,
            }}
          >
            {loading
              ? "Procesando..."
              : tab === "signup"
              ? "Crear cuenta"
              : "Iniciar sesión"}
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: "#2A2A2A" }} />
            <span className="font-body text-xs" style={{ color: "#6B6360" }}>o</span>
            <div className="flex-1 h-px" style={{ background: "#2A2A2A" }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="press-scale flex w-full items-center justify-center gap-3 font-body text-sm font-medium transition-opacity disabled:opacity-60"
            style={{
              background: "transparent",
              border: "1px solid #3A3A3A",
              color: "#FFFFFF",
              borderRadius: 12,
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

        {/* Back link */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 font-body text-sm transition-colors"
          style={{ color: "#6B6360", background: "none", border: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C75B39")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6360")}
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}
