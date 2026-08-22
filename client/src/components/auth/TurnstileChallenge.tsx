import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-cena-turnstile]");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Turnstile script failed")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.cenaTurnstile = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Turnstile script failed"));
      document.head.appendChild(script);
    });
  }
  return turnstileScriptPromise;
}

interface TurnstileChallengeProps {
  enabled: boolean;
  onTokenChange: (token: string | undefined) => void;
}

export default function TurnstileChallenge({ enabled, onTokenChange }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!enabled || !siteKey || !containerRef.current) {
      onTokenChange(undefined);
      return;
    }

    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(undefined),
          "error-callback": () => onTokenChange(undefined),
        });
      })
      .catch(() => onTokenChange(undefined));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      onTokenChange(undefined);
    };
  }, [enabled, onTokenChange, siteKey]);

  if (!enabled || !siteKey) return null;

  return (
    <div className="my-3 min-h-[65px] border border-frame-gray-3 bg-frame-black/40 p-2">
      <div ref={containerRef} />
    </div>
  );
}
