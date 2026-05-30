import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForgotPasswordMutation, useResetPasswordMutation } from "../services/api";

type Step = "request" | "reset";

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [forgotPassword, { isLoading: requesting }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  const submitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setMessage(null);
    try {
      const result = await forgotPassword({ email: email.trim() }).unwrap();
      setMessage(result.message);
      setStep("reset");
    } catch (err) {
      const data =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data
          : null;
      setError(data?.message || t("auth.forgotPasswordError"));
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || code.length < 6 || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setError(null);
    try {
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
      }).unwrap();
      navigate("/login", {
        replace: true,
        state: { resetSuccess: true },
      });
    } catch (err) {
      const data =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data
          : null;
      setError(data?.message || t("auth.resetPasswordError"));
    }
  };

  const isLoading = requesting || resetting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">
            {step === "request" ? t("auth.forgotPasswordTitle") : t("auth.resetPasswordTitle")}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                i18n.language === "en"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("zh")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                i18n.language === "zh"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              中文
            </button>
          </div>
        </div>

        {step === "request" ? (
          <form className="grid gap-3" onSubmit={submitRequest}>
            <p className="text-sm text-slate-600">{t("auth.forgotPasswordDesc")}</p>
            <input
              type="email"
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("users.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? t("common.saving") : t("auth.sendResetCode")}
            </button>
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 text-center">
              {t("auth.backToLogin")}
            </Link>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={submitReset}>
            {message && <div className="text-sm text-emerald-700">{message}</div>}
            <p className="text-sm text-slate-600">{t("auth.resetPasswordDesc")}</p>
            <input
              type="email"
              className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
              placeholder={t("users.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="rounded-lg border border-slate-200 px-3 py-2 tracking-widest"
              placeholder={t("auth.resetCodePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <input
              type="password"
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("auth.newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <input
              type="password"
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("auth.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <button
              type="submit"
              disabled={isLoading || code.length < 6}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? t("common.saving") : t("auth.resetPassword")}
            </button>
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => {
                setStep("request");
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
                setMessage(null);
              }}
            >
              {t("auth.resendResetCode")}
            </button>
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 text-center">
              {t("auth.backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
