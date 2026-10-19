import { readFileSync } from "fs";

/**
 * Load env vars from the project .env file. Returns an object.
 * Strips surrounding quotes from values.
 */
export function loadEnv(path = "/Users/andonidiazvidrio/Library/Mobile Documents/com~apple~CloudDocs/Desktop/LIFTORY/liftory/.env") {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
