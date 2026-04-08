// ══════════════════════════════════════════════════════════════
// Edge Function: notify-badge-submission
//
// Called from BadgeClaim.tsx after a user submits a badge video.
// Sends an email to the admin so they know there's a pending review.
//
// No auth required — this is a fire-and-forget notification.
// ══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail, buildAdminBadgeSubmissionEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "team@liftory.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athleteName, athleteEmail, badgeName, tierLabel, videoUrl } =
      await req.json();

    const { subject, html } = buildAdminBadgeSubmissionEmail(
      athleteName || "Atleta",
      athleteEmail || "",
      badgeName || "",
      tierLabel || "",
      videoUrl || "",
    );

    const sent = await sendEmail({ to: ADMIN_EMAIL, subject, html });

    return new Response(
      JSON.stringify({ ok: sent }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("[notify-badge-submission]", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
