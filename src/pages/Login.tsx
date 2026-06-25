import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";
import { z } from "zod";

const GOLD = "#C4A24E";
const RED = "#D45555";

const loginSchema = z.object({
  email: z.string().trim().email("Email no válido").max(255),
  password: z.string().min(1, "La contraseña es obligatoria").max(128),
});

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
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
    background: "transparent",
    borderBottom: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    padding: "12px 0",
    fontSize: 15,
    width: "100%",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    transition: "border-color 0.2s",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderBottomColor = GOLD;
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderBottomColor = "hsl(var(--border))";
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
        navigate("/home", { replace: true });
      }
    } catch {
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
    <div className="grain-overlay flex min-h-screen flex-col items-center justify-center px-7 bg-background">
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Wordmark — same Atelier treatment as Home */}
        <span
          className="font-display uppercase"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.04em",
            color: GOLD,
            lineHeight: 1,
            textShadow: `0 0 18px ${GOLD}30`,
          }}
        >
          LIFTORY
        </span>

        <p
          className="mt-5 font-body italic"
          style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
        >
          Inicia sesión en tu cuenta
        </p>

        <div className="mx-auto h-px mt-5" style={{ width: 36, background: GOLD }} />

        {/* Form */}
        <div className="mt-10 flex w-full flex-col gap-7">
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
              <p className="mt-2 font-mono uppercase" style={{ fontSize: 9, letterSpacing: "2px", color: RED }}>{errors.email}</p>
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
              <p className="mt-2 font-mono uppercase" style={{ fontSize: 9, letterSpacing: "2px", color: RED }}>{errors.password}</p>
            )}
          </div>

          <button
            onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); setForgotError(""); }}
            className="self-end font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))", background: "none", border: "none", marginTop: -10 }}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {generalError && (
            <p className="font-mono uppercase text-center" style={{ fontSize: 9, letterSpacing: "2px", color: RED }}>{generalError}</p>
          )}

          {/* Atelier CTA */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="press-scale flex items-center justify-center gap-3 mt-2 disabled:opacity-50"
          >
            <span
              className="font-mono uppercase"
              style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
            >
              {loading ? "Procesando…" : "Iniciar sesión"}
            </span>
            <span
              className={`flex items-center justify-center shrink-0 ${!loading ? "liftory-breathe" : ""}`}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                border: `1px solid ${GOLD}`,
                boxShadow: `0 0 24px ${GOLD}40`,
              }}
            >
              <ChevronRight className="h-4 w-4" style={{ color: GOLD }} />
            </span>
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
            <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}>O</span>
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="press-scale flex w-full items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              {googleLoading ? "Conectando…" : "Continuar con Google"}
            </span>
          </button>
        </div>

        {/* Create account link */}
        <button
          onClick={() => navigate("/onboarding")}
          className="mt-10 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "2.5px", color: GOLD, background: "none", border: "none" }}
        >
          Crear cuenta nueva
        </button>
      </div>

      {/* Forgot Password Overlay — Atelier sheet */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
          onClick={() => setShowForgot(false)}
        >
          <div
            className="w-full max-w-sm p-8 flex flex-col gap-5"
            style={{ background: "#15151A", borderRadius: 24, border: "1px solid hsl(var(--border))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}>
              Recuperar contraseña
            </p>

            {forgotSent ? (
              <>
                <h2
                  className="font-display"
                  style={{ fontWeight: 300, fontSize: 22, color: "hsl(var(--foreground))", letterSpacing: "-0.03em", lineHeight: 1.1 }}
                >
                  Enlace <strong style={{ fontWeight: 700 }}>enviado</strong>
                </h2>
                <p className="font-body italic" style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
                  Te enviamos un enlace de recuperación a <strong style={{ color: "hsl(var(--foreground))" }}>{forgotEmail.trim()}</strong>. Revisa tu bandeja de entrada.
                </p>
                <button
                  onClick={() => setShowForgot(false)}
                  className="press-scale flex items-center gap-3 mt-3 self-center"
                >
                  <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}>
                    Entendido
                  </span>
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${GOLD}` }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: GOLD }} />
                  </span>
                </button>
              </>
            ) : (
              <>
                <p className="font-body italic" style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
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
                  <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "2px", color: RED }}>{forgotError}</p>
                )}
                <div className="flex flex-col items-center gap-4 mt-3">
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="press-scale flex items-center gap-3 disabled:opacity-50"
                  >
                    <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}>
                      {forgotLoading ? "Enviando…" : "Enviar enlace"}
                    </span>
                    <span
                      className={`flex items-center justify-center shrink-0 ${!forgotLoading ? "liftory-breathe" : ""}`}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        border: `1px solid ${GOLD}`,
                        boxShadow: `0 0 18px ${GOLD}40`,
                      }}
                    >
                      <ChevronRight className="h-3.5 w-3.5" style={{ color: GOLD }} />
                    </span>
                  </button>
                  <button
                    onClick={() => setShowForgot(false)}
                    className="font-mono uppercase"
                    style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))", background: "none", border: "none" }}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
