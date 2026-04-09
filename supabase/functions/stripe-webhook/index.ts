import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  sendEmail,
  buildPaymentConfirmationEmail,
  buildPaymentFailedEmail,
  buildAdminPaymentAlertEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://liftory.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRICE_TO_TIER: Record<string, string> = {
  "price_1TD5ll0XOkcK4IZPIGWDFpUX": "monthly",
  "price_1TD5kI0XOkcK4IZPiI7dsbJO": "semiannual",
  "price_1TD5lM0XOkcK4IZPqQudTkwk": "annual",
  "price_1TFjro0XOkcK4IZPvsYWsviF": "monthly", // Founder's Access $199/mo
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log(`[stripe-webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const supabaseUserId = session.metadata?.supabase_user_id;

        if (!supabaseUserId) {
          console.error("[stripe-webhook] No supabase_user_id in session metadata");
          break;
        }

        // Retrieve the subscription to get price and period info
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || "monthly";
        const rawEnd = (subscription as any).current_period_end;
        const currentPeriodEnd = typeof rawEnd === "number"
          ? new Date(rawEnd * 1000).toISOString()
          : typeof rawEnd === "string"
            ? new Date(rawEnd).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin
          .from("user_profiles")
          .update({
            subscription_status: "active",
            stripe_customer_id: customerId,
            subscription_tier: tier,
            current_period_end: currentPeriodEnd,
          })
          .eq("user_id", supabaseUserId);

        console.log(`[stripe-webhook] checkout.session.completed for user ${supabaseUserId}, tier: ${tier}`);

        // Send payment confirmation email (non-blocking)
        try {
          const { data: paidUser } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
          const { data: paidProfile } = await supabaseAdmin
            .from("user_profiles")
            .select("display_name")
            .eq("user_id", supabaseUserId)
            .single();

          const userEmail = paidUser?.user?.email;
          if (userEmail) {
            const displayName = paidProfile?.display_name || paidUser?.user?.user_metadata?.full_name || "Atleta";
            const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "";
            const endDate = new Date(currentPeriodEnd).toLocaleDateString("es-ES", {
              day: "numeric", month: "long", year: "numeric",
            });
            const { subject, html } = buildPaymentConfirmationEmail(displayName, tier, amountTotal, endDate);
            await sendEmail({ to: userEmail, subject, html });
          }
        } catch (emailErr) {
          console.warn("[stripe-webhook] Email send failed (non-blocking):", emailErr);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || "monthly";
        const status = subscription.status === "active" ? "active" : subscription.status;
        const rawEnd2 = (subscription as any).current_period_end;
        const currentPeriodEnd = typeof rawEnd2 === "number"
          ? new Date(rawEnd2 * 1000).toISOString()
          : typeof rawEnd2 === "string"
            ? new Date(rawEnd2).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from("user_profiles")
            .update({
              subscription_status: status,
              subscription_tier: tier,
              current_period_end: currentPeriodEnd,
            })
            .eq("stripe_customer_id", customerId);

          console.log(`[stripe-webhook] subscription.updated for customer ${customerId}, status: ${status}, tier: ${tier}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("user_profiles")
          .update({
            subscription_status: "cancelled",
          })
          .eq("stripe_customer_id", customerId);

        console.log(`[stripe-webhook] subscription.deleted for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Update status + set dunning tracking fields
        const { data: failedProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("user_id, subscription_tier, payment_failed_at")
          .eq("stripe_customer_id", customerId)
          .single();

        // Only set payment_failed_at on the FIRST failure (don't reset on retries)
        const updateFields: Record<string, unknown> = {
          subscription_status: "past_due",
        };
        if (!failedProfile?.payment_failed_at) {
          updateFields.payment_failed_at = new Date().toISOString();
          updateFields.dunning_step = 1;
        }

        await supabaseAdmin
          .from("user_profiles")
          .update(updateFields)
          .eq("stripe_customer_id", customerId);

        console.log(`[stripe-webhook] invoice.payment_failed for customer ${customerId}`);

        // Send Day 1 email to athlete + admin alert (non-blocking)
        if (failedProfile?.user_id && !failedProfile.payment_failed_at) {
          try {
            const { data: failedUser } = await supabaseAdmin.auth.admin.getUserById(failedProfile.user_id);
            const userEmail = failedUser?.user?.email;
            const displayName = failedUser?.user?.user_metadata?.full_name || "Atleta";
            const tier = failedProfile.subscription_tier || "monthly";

            if (userEmail) {
              // Day 1 email to athlete
              const athleteEmail = buildPaymentFailedEmail(displayName, 1);
              await sendEmail({ to: userEmail, subject: athleteEmail.subject, html: athleteEmail.html });

              // Admin alert
              const now = new Date().toLocaleDateString("es-ES", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              });
              const adminEmail = buildAdminPaymentAlertEmail(displayName, userEmail, tier, now);
              await sendEmail({ to: "team@liftory.app", subject: adminEmail.subject, html: adminEmail.html });
            }
          } catch (emailErr) {
            console.warn("[stripe-webhook] Payment failed email error (non-blocking):", emailErr);
          }
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const tier = PRICE_TO_TIER[priceId] || "monthly";
          const rawEnd3 = (subscription as any).current_period_end;
          const currentPeriodEnd = typeof rawEnd3 === "number"
            ? new Date(rawEnd3 * 1000).toISOString()
            : typeof rawEnd3 === "string"
              ? new Date(rawEnd3).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await supabaseAdmin
            .from("user_profiles")
            .update({
              subscription_status: "active",
              subscription_tier: tier,
              current_period_end: currentPeriodEnd,
              payment_failed_at: null,
              dunning_step: 0,
            })
            .eq("stripe_customer_id", customerId);

          console.log(`[stripe-webhook] invoice.payment_succeeded for customer ${customerId}, tier: ${tier}`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
