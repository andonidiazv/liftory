import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // PWA service worker — Sprint 3.
    // - Generates a service worker that precaches the JS/CSS bundles (with hashes
    //   so each deploy invalidates the old ones cleanly).
    // - HTML uses NetworkFirst: when there's signal, we always try the freshest
    //   index.html from Vercel. If the network fails, fall back to the cached one
    //   so the app still opens offline.
    // - Supabase API requests are EXCLUDED from the SW entirely (denylist) — never
    //   cache user data. Sprint 1+2 already handle their own offline strategy in
    //   userland (sync queue + workout cache).
    // - registerType 'autoUpdate' = silent updates: when a new deploy ships, the
    //   SW downloads it in the background and activates the next time the user
    //   reopens the app. No popup.
    // - Disabled in dev so HMR keeps working. Only active in `vite build`.
    // PWA service worker — Sprint 3.
    // - Uses `injectManifest` strategy because we have a custom SW source at
    //   src/sw.ts that ALSO handles Web Push notifications (preserved from
    //   the legacy /public/sw.js). vite-plugin-pwa injects the precache list
    //   into our SW; the cache strategies live in sw.ts.
    // - registerType 'autoUpdate' = silent updates: a new deploy ships, the
    //   SW downloads it in the background and activates next time the user
    //   reopens the app. No popup.
    // - Disabled in dev so HMR keeps working. Only active in `vite build`.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false, // we register manually in main.tsx for control
      disable: mode === "development",
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png"],
      manifest: false, // reuse public/manifest.json
      injectManifest: {
        // Precache only the actual app build artifacts. /public has many
        // internal mockup HTML files (brand previews, audit pages, etc.)
        // that we don't want shipping to athletes' devices.
        // Whitelist by extension/path, not by glob exclusion of dozens.
        globPatterns: [
          "index.html",
          "assets/**/*.{js,css,woff,woff2}",
          "favicon.{png,ico}",
          "icon-*.png",
          "manifest.json",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
}));
