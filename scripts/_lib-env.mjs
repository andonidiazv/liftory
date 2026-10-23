import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Lee las variables de entorno del proyecto.
 *
 * Están partidas en dos archivos a propósito:
 *
 *   .env        — rastreado en git. Sólo variables VITE_*, que Vite compila
 *                 dentro del bundle del navegador. Ya son públicas: se pueden
 *                 leer descargando el JavaScript de liftory.app. Viven en git
 *                 porque Vercel las necesita al construir.
 *
 *   .env.local  — IGNORADO por git. Los secretos de verdad, empezando por
 *                 SUPABASE_SERVICE_ROLE_KEY, que salta todas las políticas RLS.
 *                 Nunca viaja al navegador ni debe salir de la máquina.
 *
 * Antes todo vivía junto en .env, y como ese archivo está rastreado, cada
 * `git add -A` era una oportunidad de subir el service role key a GitHub.
 * Separarlos vuelve imposible ese error en vez de depender de acordarse.
 *
 * .env.local gana si una variable está en los dos, igual que hace Vite.
 */
export function loadEnv(raiz = RAIZ) {
  const out = {};
  for (const archivo of [".env", ".env.local"]) {
    const ruta = resolve(raiz, archivo);
    if (!existsSync(ruta)) continue;
    for (const linea of readFileSync(ruta, "utf8").split("\n")) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  if (!out.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY. Debe estar en .env.local (no en .env, que está en git).");
  }
  return out;
}
