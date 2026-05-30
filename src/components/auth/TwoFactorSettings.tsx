import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  useGet2faStatusQuery,
  useSetup2faMutation,
  useEnable2faMutation,
  useDisable2faMutation,
} from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setUser } from "../../app/authSlice";

export default function TwoFactorSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data: status, refetch } = useGet2faStatusQuery();
  const [setup2fa, { isLoading: setupLoading }] = useSetup2faMutation();
  const [enable2fa, { isLoading: enableLoading }] = useEnable2faMutation();
  const [disable2fa, { isLoading: disableLoading }] = useDisable2faMutation();

  const [setupData, setSetupData] = useState<{ qrCodeDataUrl: string; manualEntryKey: string } | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = status?.enabled ?? user?.totpEnabled ?? false;
  const isLoading = setupLoading || enableLoading || disableLoading;

  const handleStartSetup = async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await setup2fa().unwrap();
      setSetupData(result);
    } catch {
      setError(t("auth.twoFactorSetupError"));
    }
  };

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await enable2fa({ code: enableCode.trim() }).unwrap();
      setSetupData(null);
      setEnableCode("");
      setMessage(t("auth.twoFactorEnabledSuccess"));
      refetch();
      if (user) {
        dispatch(setUser({ ...user, totpEnabled: true }));
      }
    } catch {
      setError(t("auth.twoFactorInvalid"));
    }
  };

  const handleDisable = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await disable2fa({ code: disableCode.trim(), password: disablePassword }).unwrap();
      setDisableCode("");
      setDisablePassword("");
      setMessage(t("auth.twoFactorDisabledSuccess"));
      refetch();
      if (user) {
        dispatch(setUser({ ...user, totpEnabled: false }));
      }
    } catch {
      setError(t("auth.twoFactorDisableError"));
    }
  };

  return (
    <div className="theme-card rounded-2xl border p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--theme-text-primary)" }}>
          {t("auth.twoFactorSettingsTitle")}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--theme-text-secondary)" }}>
          {t("auth.twoFactorSettingsDesc")}
        </p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {enabled ? (
        <form className="grid gap-3 max-w-sm" onSubmit={handleDisable}>
          <p className="text-sm text-green-700 font-medium">{t("auth.twoFactorEnabled")}</p>
          <input
            type="password"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder={t("users.password")}
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
          />
          <input
            type="text"
            inputMode="numeric"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-widest"
            placeholder={t("auth.twoFactorCodePlaceholder")}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button
            type="submit"
            disabled={isLoading || disableCode.length < 6 || !disablePassword}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 w-fit"
          >
            {t("auth.disableTwoFactor")}
          </button>
        </form>
      ) : !setupData ? (
        <button
          type="button"
          onClick={handleStartSetup}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 w-fit"
        >
          {t("auth.enableTwoFactor")}
        </button>
      ) : (
        <form className="grid gap-3 max-w-md" onSubmit={handleEnable}>
          <p className="text-sm text-slate-600">{t("auth.twoFactorScanQr")}</p>
          <img
            src={setupData.qrCodeDataUrl}
            alt={t("auth.twoFactorQrAlt")}
            className="w-48 h-48 border border-slate-200 rounded-lg"
          />
          <div className="text-xs text-slate-500 break-all">
            <span className="font-medium">{t("auth.manualEntryKey")}: </span>
            {setupData.manualEntryKey}
          </div>
          <input
            type="text"
            inputMode="numeric"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-widest"
            placeholder={t("auth.twoFactorCodePlaceholder")}
            value={enableCode}
            onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || enableCode.length < 6}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {t("auth.confirmEnableTwoFactor")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setSetupData(null);
                setEnableCode("");
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
