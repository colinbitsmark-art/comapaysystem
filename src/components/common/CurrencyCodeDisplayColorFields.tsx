import { useTranslation } from "react-i18next";
import type { Currency } from "../../types";
import type {
  CurrencyCodeDisplayFormFields,
  CurrencyDisplayFormFields,
} from "../../utils/currencyAmountDisplay";
import { CurrencyAmountCell, CurrencyAmountGroup } from "./CurrencyAmountCell";
import { ColorInput } from "./CurrencyDisplayColorFields";

interface CurrencyCodeDisplayColorFieldsProps {
  amountFields: CurrencyDisplayFormFields;
  codeFields: CurrencyCodeDisplayFormFields;
  onChange: (fields: CurrencyCodeDisplayFormFields) => void;
  currencyCode?: string;
}

export function CurrencyCodeDisplayColorFields({
  amountFields,
  codeFields,
  onChange,
  currencyCode = "USD",
}: CurrencyCodeDisplayColorFieldsProps) {
  const { t } = useTranslation();

  const setField = (key: keyof CurrencyCodeDisplayFormFields, value: string | boolean) => {
    onChange({ ...codeFields, [key]: value });
  };

  const useSame = codeFields.codeDisplaySameAsAmount;
  const amountConfigured = Boolean(amountFields.displayBgColor.trim());

  const previewCurrency: Currency = {
    id: 0,
    code: currencyCode,
    name: currencyCode,
    baseRateBuy: 1,
    conversionRateBuy: 1,
    baseRateSell: 1,
    conversionRateSell: 1,
    active: true,
    displayBgColor: amountFields.displayBgColor || null,
    displayPositiveColor: amountFields.displayPositiveColor || null,
    displayNegativeColor: amountFields.displayNegativeColor || null,
    codeDisplaySameAsAmount: useSame ? 1 : 0,
    codeDisplayBgColor: useSame ? null : codeFields.codeDisplayBgColor || null,
    codeDisplayPositiveColor: useSame ? null : codeFields.codeDisplayPositiveColor || null,
    codeDisplayNegativeColor: useSame ? null : codeFields.codeDisplayNegativeColor || null,
  };
  const previewMap = new Map([[currencyCode, previewCurrency]]);
  const hasCodePreview = useSame ? amountConfigured : Boolean(codeFields.codeDisplayBgColor.trim());

  return (
    <fieldset className="col-span-full rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        {t("currencies.codeDisplayTitle")}
      </legend>
      <p className="mb-3 text-xs text-slate-500">{t("currencies.codeDisplayHint")}</p>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={useSame}
          onChange={(e) => setField("codeDisplaySameAsAmount", e.target.checked)}
        />
        {t("currencies.codeDisplaySameAsAmount")}
      </label>

      {!useSame && (
        <div className="grid gap-3 md:grid-cols-3">
          <ColorInput
            label={t("currencies.displayBgColor")}
            value={codeFields.codeDisplayBgColor}
            placeholder="#1e3a8a"
            onChange={(v) => setField("codeDisplayBgColor", v)}
          />
          <ColorInput
            label={t("currencies.displayPositiveColor")}
            value={codeFields.codeDisplayPositiveColor}
            placeholder="#ffffff"
            onChange={(v) => setField("codeDisplayPositiveColor", v)}
          />
          <ColorInput
            label={t("currencies.displayNegativeColor")}
            value={codeFields.codeDisplayNegativeColor}
            placeholder="#22c55e"
            onChange={(v) => setField("codeDisplayNegativeColor", v)}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {hasCodePreview ? (
          <>
            <span className="text-xs font-medium text-slate-600">{t("currencies.displayPreview")}:</span>
            <CurrencyAmountGroup>
              <CurrencyAmountCell amount={135043} currencyCode={currencyCode} currencyByCode={previewMap}>
                135,043
              </CurrencyAmountCell>
              <CurrencyAmountCell
                amount={135043}
                currencyCode={currencyCode}
                currencyByCode={previewMap}
                variant="code"
              >
                {currencyCode}
              </CurrencyAmountCell>
            </CurrencyAmountGroup>
            <span className="text-xs text-slate-400">{t("currencies.codePreviewContextPositive")}</span>
            <CurrencyAmountGroup>
              <CurrencyAmountCell amount={-28382} currencyCode={currencyCode} currencyByCode={previewMap}>
                -28,382
              </CurrencyAmountCell>
              <CurrencyAmountCell
                amount={-28382}
                currencyCode={currencyCode}
                currencyByCode={previewMap}
                variant="code"
              >
                {currencyCode}
              </CurrencyAmountCell>
            </CurrencyAmountGroup>
            <span className="text-xs text-slate-400">{t("currencies.codePreviewContextNegative")}</span>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {useSame && !amountConfigured
              ? t("currencies.codeDisplayNeedsAmount")
              : t("currencies.displayPreviewDefault")}
          </p>
        )}
        {!useSame && (
          <button
            type="button"
            onClick={() =>
              onChange({
                codeDisplaySameAsAmount: false,
                codeDisplayBgColor: "",
                codeDisplayPositiveColor: "",
                codeDisplayNegativeColor: "",
              })
            }
            className="text-sm font-semibold text-slate-600 hover:text-slate-800"
          >
            {t("currencies.clearCodeDisplayColors")}
          </button>
        )}
      </div>
    </fieldset>
  );
}
