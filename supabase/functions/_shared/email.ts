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
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: true },
});

// -- Brand constants --
const BRAND = {
  bg: "#0A0A0A",
  card: "#1C1C1E",
  accent: "#C75B39",
  text: "#FAF8F5",
  muted: "#8A8A8E",
  border: "rgba(255,255,255,0.08)",
  headingFont: "'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif",
  bodyFont: "'Inter','Helvetica Neue',Arial,sans-serif",
};

const LOGO_HTML = `<img src="https://liftory.app/liftory-logo-email.png" alt="LIFTORY" width="200" height="21" style="display:block;margin:0 auto;border:0;" />`;

// -- Helpers --

function heading(text: string): string {
  return `<h1 style="font-family:${BRAND.headingFont};font-size:24px;font-weight:900;color:${BRAND.text};margin:0 0 8px;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="font-family:${BRAND.bodyFont};font-size:15px;color:${BRAND.muted};margin:0 0 20px;line-height:1.6;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center">
          <a href="${href}" style="display:inline-block;background:${BRAND.accent};color:${BRAND.text};font-family:${BRAND.headingFont};font-size:14px;font-weight:900;text-decoration:none;padding:14px 36px;border-radius:12px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function sectionTitle(text: string): string {
  return `<p style="font-family:${BRAND.headingFont};font-size:14px;font-weight:900;color:${BRAND.text};margin:0 0 12px;">${text}</p>`;
}

function bulletItem(text: string): string {
  return `
    <tr>
      <td style="padding:4px 0;font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};line-height:1.5;">
        - ${text}
      </td>
    </tr>`;
}

function bulletList(items: string[]): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0">
      ${items.map(bulletItem).join("")}
    </table>`;
}

function infoCard(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;">
          <span style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};">${r.label}</span>
        </td>
        <td align="right" style="padding:6px 0;">
          <span style="font-family:${BRAND.headingFont};font-size:14px;font-weight:900;color:${BRAND.text};">${r.value}</span>
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(199,91,57,0.08);border-radius:12px;border:1px solid rgba(199,91,57,0.15);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

function statusPill(text: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:8px;font-family:${BRAND.headingFont};font-size:12px;font-weight:900;color:#fff;background:${color};">${text}</span>`;
}

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
              ${LOGO_HTML}
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
                &copy; 2026 LIFTORY. Todos los derechos reservados.
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

// -- Public API --

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

// -- Email Templates --

/** Welcome email sent after user completes signup */
export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "Atleta";

  const content = `
    ${heading("Bienvenido a LIFTORY")}
    ${paragraph(`${firstName}, ahora formas parte de una comunidad que entrena con proposito.`)}
    ${paragraph("LIFTORY no es otra app de fitness. Es un sistema de entrenamiento de fuerza disenado para atletas que quieren resultados reales, medibles y verificados.")}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(199,91,57,0.08);border-radius:12px;border:1px solid rgba(199,91,57,0.15);">
          ${sectionTitle("Lo que te espera:")}
          ${bulletList([
            "Programacion periodizada en 6 fases: Base, Base+, Acumulacion, Intensificacion, Peak y Deload",
            "Tracking automatico de personal records en cada sesion",
            "Badges verificados por video que validan tu fuerza real",
            "Analisis de progreso semanal para optimizar tu rendimiento",
          ])}
        </td>
      </tr>
    </table>

    ${button("Comenzar a entrenar", "https://liftory.app")}
  `;

  return {
    subject: "Bienvenido al sistema -- LIFTORY",
    html: wrapInLayout(content, `${firstName}, ahora formas parte de LIFTORY.`),
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

  if (approved) {
    const content = `
      ${heading("Badge Verificado")}
      ${paragraph(`${firstName}, tu envio ha sido revisado y verificado por el equipo de LIFTORY.`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid ${BRAND.border};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-family:${BRAND.headingFont};font-size:18px;font-weight:900;color:${BRAND.text};margin:0;">
                    ${badgeName}
                  </p>
                  <p style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};margin:4px 0 0;">
                    ${tierLabel}
                  </p>
                </td>
                <td align="right" valign="middle">
                  ${statusPill("VERIFICADO", "#34C759")}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${paragraph("Este logro ahora forma parte permanente de tu perfil. Compartelo con tu comunidad.")}
      ${button("Ver mi perfil", "https://liftory.app/profile")}
    `;

    return {
      subject: `Tu badge ${badgeName} ha sido verificado`,
      html: wrapInLayout(content, `${firstName}, tu badge ${badgeName} ha sido verificado.`),
    };
  }

  // Not approved
  const content = `
    ${heading("Envio en revision")}
    ${paragraph(`${firstName}, sabemos el trabajo que requiere llegar hasta aqui. Enviar un video para verificacion demuestra compromiso real con tu entrenamiento.`)}
    ${paragraph("Tu envio ha sido revisado por el equipo de LIFTORY y en esta ocasion no cumplio con los criterios de verificacion.")}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid ${BRAND.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="font-family:${BRAND.headingFont};font-size:18px;font-weight:900;color:${BRAND.text};margin:0;">
                  ${badgeName}
                </p>
                <p style="font-family:${BRAND.bodyFont};font-size:13px;color:${BRAND.muted};margin:4px 0 0;">
                  ${tierLabel}
                </p>
              </td>
              <td align="right" valign="middle">
                ${statusPill("NO APROBADO", "#FF3B30")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${paragraph("Esto no es un retroceso -- es parte del proceso. Revisa el feedback del equipo en la app para saber exactamente que ajustar. Puedes volver a enviar tu video cuando estes listo. No hay limite de intentos.")}
    ${button("Ver feedback", "https://liftory.app/badges")}
  `;

  return {
    subject: `Resultado de tu envio -- ${badgeName}`,
    html: wrapInLayout(content, `${firstName}, tu envio de ${badgeName} ha sido revisado.`),
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
    ${heading("Suscripcion confirmada")}
    ${paragraph(`${firstName}, tu acceso a LIFTORY esta activo. Gracias por confiar en nosotros.`)}

    ${infoCard([
      { label: "Plan", value: tierLabel },
      { label: "Total", value: `$${amount}` },
      { label: "Proxima renovacion", value: periodEnd },
    ])}

    ${paragraph("Si tienes alguna pregunta sobre tu cuenta, escribe a team@liftory.app")}
    ${button("Ir a mi cuenta", "https://liftory.app")}
  `;

  return {
    subject: "Suscripcion activa -- LIFTORY",
    html: wrapInLayout(content, `${firstName}, tu suscripcion ${tierLabel} esta activa.`),
  };
}

/** Payment failed dunning email (steps 1-4) */
export function buildPaymentFailedEmail(
  name: string,
  step: number,
): { subject: string; html: string } {
  const firstName = name?.split(" ")[0] || "Atleta";
  const footer = paragraph("Si tienes alguna pregunta, escribe a team@liftory.app");

  if (step === 1) {
    const content = `
      ${heading("Pago no procesado")}
      ${paragraph(`${firstName}, no pudimos procesar el cobro de tu suscripcion a LIFTORY.`)}
      ${paragraph("Esto puede ocurrir si tu tarjeta expiro, tiene fondos insuficientes o el banco rechazo la transaccion.")}
      ${paragraph("Para mantener tu acceso activo, actualiza tu metodo de pago lo antes posible.")}
      ${button("Actualizar metodo de pago", "https://liftory.app/profile")}
      ${footer}
    `;

    return {
      subject: "Hubo un problema con tu pago -- LIFTORY",
      html: wrapInLayout(content, `${firstName}, no pudimos procesar tu pago.`),
    };
  }

  if (step === 2) {
    const content = `
      ${heading("Recordatorio de pago")}
      ${paragraph(`${firstName}, aun no hemos podido procesar el cobro de tu suscripcion.`)}
      ${paragraph("Tu acceso a LIFTORY sigue activo por ahora, pero necesitamos que actualices tu metodo de pago para evitar interrupciones en tu entrenamiento.")}
      ${button("Actualizar metodo de pago", "https://liftory.app/profile")}
      ${footer}
    `;

    return {
      subject: "Tu acceso a LIFTORY esta en riesgo",
      html: wrapInLayout(content, `${firstName}, actualiza tu metodo de pago.`),
    };
  }

  if (step === 3) {
    const content = `
      ${heading("Accion requerida")}
      ${paragraph(`${firstName}, llevamos una semana intentando procesar tu pago sin exito.`)}
      ${paragraph("Si no actualizas tu metodo de pago pronto, tu suscripcion sera pausada y perderas acceso a tus entrenamientos programados y tu progreso activo.")}
      ${button("Actualizar ahora", "https://liftory.app/profile")}
      ${footer}
    `;

    return {
      subject: "Ultimo aviso -- actualiza tu metodo de pago",
      html: wrapInLayout(content, `${firstName}, ultimo aviso sobre tu pago.`),
    };
  }

  // Step 4
  const content = `
    ${heading("Suscripcion pausada")}
    ${paragraph(`${firstName}, tu suscripcion a LIFTORY ha sido pausada porque no pudimos procesar tu pago.`)}
    ${paragraph("Tu progreso y datos estan seguros. Puedes reactivar tu suscripcion en cualquier momento actualizando tu metodo de pago.")}
    ${button("Reactivar suscripcion", "https://liftory.app/profile")}
    ${footer}
  `;

  return {
    subject: "Tu suscripcion ha sido pausada -- LIFTORY",
    html: wrapInLayout(content, `${firstName}, tu suscripcion ha sido pausada.`),
  };
}

/** Admin alert when a payment fails */
export function buildAdminBadgeSubmissionEmail(
  athleteName: string,
  athleteEmail: string,
  badgeName: string,
  tierLabel: string,
  videoUrl: string,
): { subject: string; html: string } {
  const content = `
    ${heading("Nuevo video de badge")}
    ${paragraph("Un atleta envio un video para aprobacion de badge.")}

    ${infoCard([
      { label: "Atleta", value: athleteName },
      { label: "Email", value: athleteEmail },
      { label: "Badge", value: badgeName },
      { label: "Tier", value: tierLabel },
    ])}

    ${paragraph("Revisa el video y aprueba o rechaza el badge desde el panel de administracion.")}
    ${button("Revisar ahora", "https://liftory.app/admin")}
  `;

  return {
    subject: `Badge pendiente -- ${athleteName} -- ${badgeName} (${tierLabel})`,
    html: wrapInLayout(content, `${athleteName} envio un video para ${badgeName}.`),
  };
}

export function buildAdminPaymentAlertEmail(
  athleteName: string,
  athleteEmail: string,
  tier: string,
  failedAt: string,
): { subject: string; html: string } {
  const tierLabels: Record<string, string> = {
    monthly: "Mensual",
    semiannual: "Semestral",
    annual: "Anual",
  };
  const tierLabel = tierLabels[tier] || tier;

  const content = `
    ${heading("Pago fallido")}
    ${paragraph("Un atleta no pudo completar su pago.")}

    ${infoCard([
      { label: "Atleta", value: athleteName },
      { label: "Email", value: athleteEmail },
      { label: "Plan", value: tierLabel },
      { label: "Fecha del intento", value: failedAt },
    ])}

    ${paragraph("Revisa el estado de la suscripcion en el panel de administracion.")}
    ${button("Ver panel admin", "https://liftory.app/admin")}
  `;

  return {
    subject: `Pago fallido -- ${athleteName}`,
    html: wrapInLayout(content, `Pago fallido para ${athleteName}.`),
  };
}
