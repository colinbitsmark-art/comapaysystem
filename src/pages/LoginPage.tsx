import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLoginMutation, useVerify2faMutation } from "../services/api";
import { useAppDispatch } from "../app/hooks";
import { setUser } from "../app/authSlice";

function isTwoFactorRequired(
  result: unknown,
): result is { requiresTwoFactor: true; pendingToken: string; email: string } {
  return Boolean(
    result &&
      typeof result === "object" &&
      "requiresTwoFactor" in result &&
      (result as { requiresTwoFactor?: boolean }).requiresTwoFactor,
  );
}

type LoginErrorData = {
  message?: string;
  code?: string;
  attemptsRemaining?: number;
  retryAfterMinutes?: number;
};

function getErrorData(error: unknown): LoginErrorData | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data: unknown }).data;
  if (!data || typeof data !== "object") return null;
  return data as LoginErrorData;
}

function getLoginErrorMessage(error: unknown, t: TFunction): string {
  const data = getErrorData(error);
  if (!data) return t("users.invalidCredentials");

  if (data.code === "ACCOUNT_SUSPENDED") {
    return t("auth.accountSuspended");
  }
  if (data.code === "ACCOUNT_LOCKED") {
    return t("auth.accountLocked", { minutes: data.retryAfterMinutes ?? 15 });
  }
  if (
    data.code === "INVALID_CREDENTIALS" &&
    typeof data.attemptsRemaining === "number" &&
    data.attemptsRemaining > 0
  ) {
    return t("auth.invalidCredentialsWithRemaining", { count: data.attemptsRemaining });
  }

  return data.message || t("users.invalidCredentials");
}

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = Boolean(
    location.state && typeof location.state === "object" && "resetSuccess" in location.state
      && (location.state as { resetSuccess?: boolean }).resetSuccess,
  );
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [verify2fa, { isLoading: verifyLoading, error: verifyError }] = useVerify2faMutation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [twoFactor, setTwoFactor] = useState<{ pendingToken: string; email: string } | null>(null);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoginError(null);
    try {
      const result = await login(form).unwrap();
      if (isTwoFactorRequired(result)) {
        setTwoFactor({ pendingToken: result.pendingToken, email: result.email });
        return;
      }
      dispatch(setUser(result));
      navigate("/", { replace: true });
    } catch (err) {
      setLoginError(getLoginErrorMessage(err, t));
    }
  };

  const submit2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFactor || !code.trim()) return;
    const user = await verify2fa({
      pendingToken: twoFactor.pendingToken,
      code: code.trim(),
    }).unwrap();
    dispatch(setUser(user));
    navigate("/", { replace: true });
  };

  const isLoading = loginLoading || verifyLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">
            {twoFactor ? t("auth.twoFactorTitle") : t("users.login")}
          </h1>
          <div className="flex items-center gap-2">
            <button
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

        {!twoFactor ? (
          <form className="grid gap-3" onSubmit={submit}>
            <input
              type="email"
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("users.emailPlaceholder")}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
            <input
              type="password"
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder={t("users.password")}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
            {loginError && (
              <div className="text-sm text-rose-600">
                {loginError}
              </div>
            )}
            {resetSuccess && (
              <div className="text-sm text-emerald-700">
                {t("auth.resetPasswordSuccess")}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? t("common.saving") : t("users.login")}
            </button>
            <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-slate-700 text-center">
              {t("auth.forgotPasswordLink")}
            </Link>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={submit2fa}>
            <p className="text-sm text-slate-600">{t("auth.twoFactorPrompt", { email: twoFactor.email })}</p>
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
            {verifyError && (
              <div className="text-sm text-rose-600">
                {getLoginErrorMessage(verifyError, t) || t("auth.twoFactorInvalid")}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || code.length < 6}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {isLoading ? t("common.saving") : t("auth.verify")}
            </button>
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => {
                setTwoFactor(null);
                setCode("");
              }}
            >
              {t("auth.backToLogin")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
