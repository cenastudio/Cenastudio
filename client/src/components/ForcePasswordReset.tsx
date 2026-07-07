/**
 * ForcePasswordReset
 *
 * Intercepts all app navigation when the logged-in user has mustResetPassword=true.
 * Shows a fullscreen overlay forcing the user to set a new password before proceeding.
 * Called from App.tsx wrapping the Router.
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { KeyRound, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function ForcePasswordReset() {
  const { user, refresh } = useAuth();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Only render if user must reset password
  if (!user?.mustResetPassword || done) return null;

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("app.forceReset.errorFillAll"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("app.forceReset.errorMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("app.forceReset.errorMinLength"));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t("app.forceReset.errorSamePassword"));
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      toast.success(t("app.forceReset.success"));
      setDone(true);
      await refresh(); // Re-fetch user so mustResetPassword = false
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.forceReset.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="w-full max-w-md space-y-7 animate-stagger-1"
        style={{
          background: "linear-gradient(160deg, rgba(20,16,12,0.96) 0%, rgba(10,8,6,0.98) 100%)",
          border: "1px solid rgba(255,107,0,0.35)",
          borderRadius: "16px",
          boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 0 60px rgba(232,80,2,0.08)",
          padding: "2.5rem",
        }}
      >
        {/* Icon + Heading */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.1] rounded-full animate-glow-pulse">
            <KeyRound className="w-6 h-6 text-frame-orange" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-frame-white">{t("app.forceReset.title")}</h1>
            <p className="text-sm text-frame-gray-light mt-1">
              {t("app.forceReset.description")}
            </p>
          </div>
          <div
            className="text-xs font-frame-mono text-frame-orange py-1.5 px-3 border border-frame-orange/20 rounded"
            style={{ background: "rgba(232,80,2,0.06)" }}
          >
            {t("app.forceReset.loggedAs").replace("{name}", user.name || user.email)}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password (temp) */}
          <label className="block space-y-1.5">
            <span className="font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-frame-gray-light">
              {t("app.forceReset.tempPassword")}
            </span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="frame-input w-full pl-10 pr-10"
                placeholder={t("app.forceReset.tempPasswordPlaceholder")}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-frame-gray-light hover:text-frame-white transition"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {/* New password */}
          <label className="block space-y-1.5">
            <span className="font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-frame-gray-light">
              {t("app.forceReset.newPassword")}
            </span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="frame-input w-full pl-10 pr-10"
                placeholder={t("app.forceReset.newPasswordPlaceholder")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-frame-gray-light hover:text-frame-white transition"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {/* Confirm */}
          <label className="block space-y-1.5">
            <span className="font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-frame-gray-light">
              {t("app.forceReset.confirmPassword")}
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`frame-input w-full ${mismatch ? "border-frame-red/60 focus:border-frame-red" : ""}`}
              placeholder={t("app.forceReset.confirmPlaceholder")}
            />
            {mismatch && (
              <p className="text-frame-red text-[0.7rem] font-frame-mono">{t("app.forceReset.mismatch")}</p>
            )}
          </label>

          <button
            type="submit"
            disabled={loading || mismatch || !currentPassword || !newPassword || !confirmPassword}
            className="frame-btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {loading ? t("app.forceReset.submitting") : t("app.forceReset.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
