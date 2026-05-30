import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useChangePasswordMutation, useGet2faStatusQuery } from "../../services/api";

export default function AccountSettings() {
  const { t } = useTranslation();
  const { data: twoFactorStatus } = useGet2faStatusQuery();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const twoFactorEnabled = twoFactorStatus?.enabled ?? false;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCode("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError(t("profile.account.passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("profile.account.passwordTooShort"));
      return;
    }
    if (twoFactorEnabled && code.trim().length < 6) {
      setError(t("auth.twoFactorInvalid"));
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
        ...(twoFactorEnabled ? { code: code.trim() } : {}),
      }).unwrap();
      setMessage(t("profile.account.passwordChanged"));
      resetForm();
    } catch (err: unknown) {
      const apiMessage =
        err &&
        typeof err === "object" &&
        "data" in err &&
        err.data &&
        typeof err.data === "object" &&
        "message" in err.data &&
        typeof (err.data as { message: unknown }).message === "string"
          ? (err.data as { message: string }).message
          : null;
      if (apiMessage?.toLowerCase().includes("verification code")) {
        setError(t("auth.twoFactorInvalid"));
      } else if (apiMessage?.toLowerCase().includes("current password")) {
        setError(t("profile.account.currentPasswordWrong"));
      } else {
        setError(apiMessage || t("profile.account.passwordChangeError"));
      }
    }
  };

  return (
    <div className="theme-card rounded-2xl border p-5 space-y-4 max-w-md">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--theme-text-primary)" }}>
          {t("profile.account.title")}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
          {t("profile.account.description")}
        </p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("profile.account.currentPassword")}</span>
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("profile.account.newPassword")}</span>
          <input
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("profile.account.confirmPassword")}</span>
          <input
            type="password"
            autoComplete="new-password"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {twoFactorEnabled && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">{t("profile.account.authenticatorCode")}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="rounded-lg border border-slate-200 px-3 py-2 tracking-widest"
              placeholder={t("auth.twoFactorCodePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </label>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 w-fit"
        >
          {isLoading ? t("common.saving") : t("profile.account.changePassword")}
        </button>
      </form>
    </div>
  );
}
