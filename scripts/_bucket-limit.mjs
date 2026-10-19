import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Get current bucket config
const { data: bucket, error: getErr } = await sb.storage.getBucket("exercise-videos");
console.log("Current config:", bucket);
if (getErr) console.log("get error:", getErr);

// Update bucket to allow larger files (300 MB) — biggest video is 230.7 MB (Dragon Flag)
const { data: upd, error: updErr } = await sb.storage.updateBucket("exercise-videos", {
  public: true,
  fileSizeLimit: 300 * 1024 * 1024, // 300 MB
});
if (updErr) { console.log("update error:", updErr); process.exit(1); }
console.log("Updated:", upd);

// Verify
const { data: after } = await sb.storage.getBucket("exercise-videos");
console.log("New config:", after);
