/**
 * VIP_EMAILS — users who skip the paywall and get full access.
 * Synced manually with `supabase/functions/activate-vip/index.ts` (frontend gates UI,
 * edge function gates the DB write — both lists must match).
 */
export const VIP_EMAILS = new Set([
  "victor.vega.0495@gmail.com",
  "cesar.acerosaranda@gmail.com",
]);

/**
 * VIP_JOINER_EMAILS — subset of VIP_EMAILS who joined a mesocycle in motion
 * (skipped onboarding, account created manually) and should see the
 * VipJoinerWelcomeCard on first Home visit. Add new joiners here too.
 */
export const VIP_JOINER_EMAILS = new Set([
  "cesar.acerosaranda@gmail.com",
]);

export function isVip(email: string | null | undefined): boolean {
  return !!email && VIP_EMAILS.has(email.toLowerCase());
}

export function isVipJoiner(email: string | null | undefined): boolean {
  return !!email && VIP_JOINER_EMAILS.has(email.toLowerCase());
}
