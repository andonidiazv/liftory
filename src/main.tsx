import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwaServiceWorker } from "@/lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);

// Single service worker that handles BOTH push notifications and offline
// precache (see src/sw.ts). Auto-updates silently on new deploys.
// In dev this is a no-op so HMR keeps working.
void registerPwaServiceWorker();
