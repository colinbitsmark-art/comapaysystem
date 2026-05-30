import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { updateUserEmail } from "../../app/authSlice";
import { useChangeEmailMutation, useGet2faStatusQuery } from "../../services/api";

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function parseApiError(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "data" in err &&
    err.data &&
    typeof err.data === "object" &&
    "message" in err.data &&
    typeof (err.data as { message: unknown }).message === "string"
  ) {
    return (err.data as { message: string }).message;
  }
  return null;
}

export default function EmailSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currentEmail = useAppSelector((s) => s.auth.user?.email ?? "");
  const { data: twoFactorStatus } = useGet2faStatusQuery();
  const [changeEmail, { isLoading }] = useChangeEmailMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(currentEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const twoFactorEnabled = twoFactorStatus?.enabled ?? false;

  const startEditing = () => {
    setDraftEmail(currentEmail);
    setPassword("");
    setCode("");
    setError(null);
    setMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftEmail(currentEmail);
    setPassword("");
    setCode("");
    setError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    setError(null);
    setMessage(null);

    if (twoFactorEnabled && code.trim().length < 6) {
      setError(t("auth.twoFactorInvalid"));
      return;
    }

    try {
      const result = await changeEmail({
        newEmail: draftEmail.trim(),
        password,
        ...(twoFactorEnabled ? { code: code.trim() } : {}),
      }).unwrap();
      dispatch(updateUserEmail(result.email));
      setMessage(t("profile.account.emailChanged"));
      setPassword("");
      setCode("");
      setIsEditing(false);
    } catch (err: unknown) {
      const apiMessage = parseApiError(err);
      if (apiMessage?.toLowerCase().includes("verification code")) {
        setError(t("auth.twoFactorInvalid"));
      } else if (apiMessage?.toLowerCase().includes("password")) {
        setError(t("profile.account.passwordWrong"));
      } else if (apiMessage?.toLowerCase().includes("already in use")) {
        setError(t("profile.account.emailInUse"));
      } else if (apiMessage?.toLowerCase().includes("valid email")) {
        setError(t("profile.account.emailInvalid"));
      } else if (apiMessage?.toLowerCase().includes("different")) {
        setError(t("profile.account.emailSameAsCurrent"));
      } else {
        setError(apiMessage || t("profile.account.emailChangeError"));
      }
    }
  };

  return (
    <div className="theme-card rounded-2xl border p-5 space-y-4 max-w-md">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--theme-text-primary)" }}>
          {t("profile.account.emailTitle")}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
          {t("profile.account.emailDescription")}
        </p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">{t("profile.account.currentEmail")}</span>
          <div className="flex items-center gap-2">
            <input
              type="email"
              autoComplete="email"
              readOnly={!isEditing}
              className={`flex-1 rounded-lg border border-slate-200 px-3 py-2 ${
                isEditing ? "bg-white" : "bg-slate-50 text-slate-700 cursor-default"
              }`}
              value={isEditing ? draftEmail : currentEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              required={isEditing}
            />
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="flex-shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                title={t("profile.account.editEmail")}
                aria-label={t("profile.account.editEmail")}
              >
                <PencilIcon />
              </button>
            )}
          </div>
        </label>

        {isEditing && (
          <>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">{t("profile.account.passwordConfirm")}</span>
              <input
                type="password"
                autoComplete="current-password"
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
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
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isLoading ? t("common.saving") : t("profile.account.changeEmail")}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
