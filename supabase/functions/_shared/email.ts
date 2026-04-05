// ══════════════════════════════════════════════════════════════
// Shared Email Utility for LIFTORY Edge Functions
//
// Uses IONOS SMTP via nodemailer to send branded HTML emails
// from team@liftory.app.
//
// Required Supabase secrets:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// ══════════════════════════════════════════════════════════════

import nodemailer from "npm:nodemailer@6.9.16";

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.ionos.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "587");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "team@liftory.app";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: true },
});

// ── Brand constants ──
const BRAND = {
  bg: "#0A0A0A",
  card: "#1C1C1E",
  accent: "#C75B39",
  text: "#FAF8F5",
  muted: "#8A8A8E",
  border: "rgba(255,255,255,0.08)",
  fontFamily:
    "'Syne', 'Helvetica Neue', Arial, sans-serif",
  bodyFont:
    "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

/** Wrap content in the LIFTORY branded email layout */
function wrapInLayout(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LIFTORY</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${BRAND.bodyFont};-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:${BRAND.fontFamily};font-size:28px;font-weight:800;letter-spacing:-0.03em;color:${BRAND.text};">LIFTORY</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:${BRAND.card};border-radius:16px;border:1px solid ${BRAND.border};padding:32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="font-family:${BRAND.bodyFont};font-size:12px;color:${BRAND.muted};margin:0;">
                Move Better. Lift Stronger. Live Longer.
              </p>
              <p style="font-family:${BRAND.bodyFont};font-size:11px;color:${BRAND.muted};margin:8px 0 0;">
                &copy; ${new Date().getFullYear()} LIFTORY. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email builders ──

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!SMTP_PASS) {
    console.error("[email] SMTP_PASS not configured, skipping send");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"LIFTORY" <${SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    console.log("[email] Sent:", info.messageId, "to:", opts.to);
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

// ── Pre-built email templates ──

/** Welcome email sent after user completes signup */
export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "Atleta";

  const content = `
    <h1 style="font-family:${BRAND.fontFamily};font-size:24px;font-weight:800;letter-spacing:-0.03em;color:${BRAND.text};margin:0 0 8px;">
      Bienvenido a LIFTORY
    </h1>
    <p style="font-family:${BRAND.bodyFont};font-size:15px;color:${BRAND.muted};margin:0 0 24px;line-height:1.5;">
      ${firstName}, tu camino hacia un entrenamiento de fuerza inteligente comienza ahora.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(199,91,57,0.08);border-radius:12px;border:1px solid rgba(199,91,57,0.15);">
          <p style="font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;color:${BRAND.text};margin:0 0 12px;">
            Que puedes hacer en LIFTORY:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};line-height:1.5;">
                Entrenamientos programados con periodizacion inteligente
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};line-height:1.5;">
                Tracking de personal records automatico
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};line-height:1.5;">
                Badges verificados que demuestran tu fuerza real
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};line-height:1.5;">
                Mesociclos con fases de acumulacion, intensificacion y deload
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="https://liftory.app" style="display:inline-block;background:${BRAND.accent};color:${BRAND.text};font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:12px;">
            Abrir LIFTORY
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: "Bienvenido a LIFTORY",
    html: wrapInLayout(content, `${firstName}, tu camino de fuerza comienza ahora.`),
  };
}

/** Badge review result email */
export function buildBadgeReviewEmail(
  name: string,
  badgeName: string,
  tierLabel: string,
  approved: boolean,
): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "Atleta";
  const statusColor = approved ? "#34C759" : "#FF3B30";
  const statusText = approved ? "Aprobado" : "No aprobado";

  const content = `
    <h1 style="font-family:${BRAND.fontFamily};font-size:22px;font-weight:800;letter-spacing:-0.03em;color:${BRAND.text};margin:0 0 8px;">
      Badge ${statusText}
    </h1>
    <p style="font-family:${BRAND.bodyFont};font-size:15px;color:${BRAND.muted};margin:0 0 24px;line-height:1.5;">
      ${firstName}, tu badge ha sido revisado por el equipo de LIFTORY.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid ${BRAND.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="font-family:${BRAND.fontFamily};font-size:18px;font-weight:800;color:${BRAND.text};margin:0;letter-spacing:-0.02em;">
                  ${badgeName || "Badge"}
                </p>
                <p style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};margin:4px 0 0;">
                  ${tierLabel || ""}
                </p>
              </td>
              <td align="right" valign="middle">
                <span style="display:inline-block;padding:4px 12px;border-radius:8px;font-family:${BRAND.fontFamily};font-size:12px;font-weight:700;color:#fff;background:${statusColor};">
                  ${statusText.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-family:${BRAND.bodyFont};font-size:14px;color:${BRAND.muted};margin:20px 0 24px;line-height:1.5;">
      ${approved
        ? "Tu badge ya es parte de tu perfil. Puedes compartirlo con tu comunidad."
        : "Puedes volver a enviar tu video para una nueva revision."}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://liftory.app/badges" style="display:inline-block;background:${BRAND.accent};color:${BRAND.text};font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:12px;">
            Ver mis badges
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: approved
      ? `Tu badge ${badgeName} fue aprobado`
      : `Resultado de tu badge ${badgeName}`,
    html: wrapInLayout(content, `${firstName}, tu badge ${badgeName} fue ${statusText.toLowerCase()}.`),
  };
}

/** Stripe payment confirmation email */
export function buildPaymentConfirmationEmail(
  name: string,
  tier: string,
  amount: string,
  periodEnd: string,
): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "Atleta";

  const tierLabels: Record<string, string> = {
    monthly: "Mensual",
    semiannual: "Semestral",
    annual: "Anual",
  };
  const tierLabel = tierLabels[tier] || tier;

  const content = `
    <h1 style="font-family:${BRAND.fontFamily};font-size:22px;font-weight:800;letter-spacing:-0.03em;color:${BRAND.text};margin:0 0 8px;">
      Pago confirmado
    </h1>
    <p style="font-family:${BRAND.bodyFont};font-size:15px;color:${BRAND.muted};margin:0 0 24px;line-height:1.5;">
      ${firstName}, tu suscripcion a LIFTORY ha sido procesada exitosamente.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(199,91,57,0.08);border-radius:12px;border:1px solid rgba(199,91,57,0.15);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;">
                <span style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};">Plan</span>
              </td>
              <td align="right" style="padding:6px 0;">
                <span style="font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;color:${BRAND.text};">${tierLabel}</span>
              </td>
            </tr>
            ${amount ? `<tr>
              <td style="padding:6px 0;">
                <span style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};">Total</span>
              </td>
              <td align="right" style="padding:6px 0;">
                <span style="font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;color:${BRAND.text};">$${amount}</span>
              </td>
            </tr>` : ""}
            ${periodEnd ? `<tr>
              <td style="padding:6px 0;">
                <span style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};">Proximo cobro</span>
              </td>
              <td align="right" style="padding:6px 0;">
                <span style="font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;color:${BRAND.text};">${periodEnd}</span>
              </td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>

    <p style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};margin:20px 0 24px;line-height:1.5;">
      Si tienes alguna pregunta sobre tu suscripcion, contactanos a team@liftory.app
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://liftory.app" style="display:inline-block;background:${BRAND.accent};color:${BRAND.text};font-family:${BRAND.fontFamily};font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:12px;">
            Ir a LIFTORY
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: "Pago confirmado — LIFTORY",
    html: wrapInLayout(content, `${firstName}, tu suscripcion ${tierLabel} esta activa.`),
  };
}
