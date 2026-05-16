import { useTranslation } from "react-i18next";
import type { Currency, CurrencyAmountDisplayMode } from "../../types";
import type { CurrencyDisplayFormFields } from "../../utils/currencyAmountDisplay";
import { StyledCurrencyAmount } from "./StyledCurrencyAmount";

interface CurrencyDisplayColorFieldsProps {
  fields: CurrencyDisplayFormFields;
  onChange: (fields: CurrencyDisplayFormFields) => void;
  currencyCode?: string;
}

export function ColorInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#1e3a8a";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

export function CurrencyDisplayColorFields({
  fields,
  onChange,
  currencyCode = "USD",
}: CurrencyDisplayColorFieldsProps) {
  const { t } = useTranslation();

  const setField = <K extends keyof CurrencyDisplayFormFields>(
    key: K,
    value: CurrencyDisplayFormFields[K],
  ) => {
    onChange({ ...fields, [key]: value });
  };

  const previewCurrency: Currency = {
    id: 0,
    code: currencyCode,
    name: currencyCode,
    baseRateBuy: 1,
    conversionRateBuy: 1,
    baseRateSell: 1,
    conversionRateSell: 1,
    active: true,
    displayBgColor: fields.displayBgColor || null,
    displayPositiveColor: fields.displayPositiveColor || null,
    displayNegativeColor: fields.displayNegativeColor || null,
    amountDisplayMode: fields.amountDisplayMode,
    currencySymbol: fields.currencySymbol || null,
  };
  const previewMap = new Map([[currencyCode, previewCurrency]]);
  const hasPreview = Boolean(fields.displayBgColor.trim());

  return (
    <fieldset className="col-span-full rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        {t("currencies.amountDisplayTitle")}
      </legend>
      <p className="mb-3 text-xs text-slate-500">{t("currencies.amountDisplayHint")}</p>

      <div className="mb-4">
        <span className="mb-2 block text-xs font-medium text-slate-600">
          {t("currencies.amountDisplayMode")}
        </span>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={`amountDisplayMode-${currencyCode}`}
              checked={fields.amountDisplayMode === "code"}
              onChange={() => setField("amountDisplayMode", "code" as CurrencyAmountDisplayMode)}
            />
            {t("currencies.amountDisplayModeCode")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={`amountDisplayMode-${currencyCode}`}
              checked={fields.amountDisplayMode === "symbol"}
              onChange={() => setField("amountDisplayMode", "symbol" as CurrencyAmountDisplayMode)}
            />
            {t("currencies.amountDisplayModeSymbol")}
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t("currencies.amountDisplayModeHint")}</p>
      </div>

      {fields.amountDisplayMode === "symbol" && (
        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {t("currencies.currencySymbol")}
          </label>
          <input
            type="text"
            value={fields.currencySymbol}
            onChange={(e) => setField("currencySymbol", e.target.value)}
            placeholder={t("currencies.currencySymbolPlaceholder")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <ColorInput
          label={t("currencies.displayBgColor")}
          value={fields.displayBgColor}
          placeholder="#1e3a8a"
          onChange={(v) => setField("displayBgColor", v)}
        />
        <ColorInput
          label={t("currencies.displayPositiveColor")}
          value={fields.displayPositiveColor}
          placeholder="#ffffff"
          onChange={(v) => setField("displayPositiveColor", v)}
        />
        <ColorInput
          label={t("currencies.displayNegativeColor")}
          value={fields.displayNegativeColor}
          placeholder="#22c55e"
          onChange={(v) => setField("displayNegativeColor", v)}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {hasPreview ? (
          <>
            <span className="text-xs font-medium text-slate-600">{t("currencies.displayPreview")}:</span>
            <StyledCurrencyAmount
              signedAmount={135043}
              currencyCode={currencyCode}
              currencyByCode={previewMap}
              formatAbsValue={(n) => n.toLocaleString()}
            />
            <StyledCurrencyAmount
              signedAmount={-28382}
              currencyCode={currencyCode}
              currencyByCode={previewMap}
              formatAbsValue={(n) => n.toLocaleString()}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">{t("currencies.displayPreviewDefault")}</p>
        )}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...fields,
              displayBgColor: "",
              displayPositiveColor: "",
              displayNegativeColor: "",
            })
          }
          className="text-sm font-semibold text-slate-600 hover:text-slate-800"
        >
          {t("currencies.clearDisplayColors")}
        </button>
      </div>
    </fieldset>
  );
}
