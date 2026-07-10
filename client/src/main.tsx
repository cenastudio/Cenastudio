/* Force rebuild: 2026-07-04 15:45 - URGENT PRESENTATION FIX */
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyBrandTokens } from "./lib/design-system/apply-tokens";
import "./index.css";

// White label (Fase 3): write the operator's primary brand color into
// `--ds-orange` / `--ds-orange-rgb` before the first React paint so any
// CSS relying on these custom properties reflects the branded value from
// t=0 (no FOUC on re-branded deploys).
applyBrandTokens();

createRoot(document.getElementById("root")!).render(<App />);
