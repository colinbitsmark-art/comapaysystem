import { useTranslation } from "react-i18next";
import type { ReferenceRatePair, ReferenceRatePairId } from "../../types";
import { PAIR_KINDS, REFERENCE_RATE_PAIR_LABELS } from "../../constants/referenceRatePairs";
import SectionCard from "../common/SectionCard";
import { preventNumberInputWheel } from "../../utils/formInputs";

export type PairFormState = {
  baseModeChoice: "average" | "dual";
  averageBase: string;
  baseBuy: string;
  baseSell: string;
  markupPercent: string;
  markdownPercent: string;
  displayDecimals: string;
};

export default function ReferenceRatesPairEditor({
  pairId,
  form,
  preview,
  canEdit,
  onChange,
}: {
  pairId: ReferenceRatePairId;
  form: PairFormState;
  preview: ReferenceRatePair;
  canEdit: boolean;
  onChange: (patch: Partial<PairFormState>) => void;
}) {
  const { t } = useTranslation();
  const kind = PAIR_KINDS[pairId];
  const isAverage = form.baseModeChoice === "average";
  const showModeToggle = kind === "standalone";
  const showBases = kind === "standalone" || kind === "benchmark";
  const showSpreads = kind === "standalone" || kind === "chain";

  return (
    <SectionCard title={REFERENCE_RATE_PAIR_LABELS[pairId]}>
      <div className="space-y-4">
        {showModeToggle && (
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${pairId}`}
                checked={isAverage}
                disabled={!canEdit}
                onChange={() => onChange({ baseModeChoice: "average" })}
              />
              {t("referenceRates.useAverageBase")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${pairId}`}
                checked={!isAverage}
                disabled={!canEdit}
                onChange={() => onChange({ baseModeChoice: "dual" })}
              />
              {t("referenceRates.useDualBase")}
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {showBases && kind === "standalone" && isAverage && (
            <div>
              <label className="mb-1 block text-sm font-medium">{t("referenceRates.averageBase")}</label>
              <input
                type="number"
                step="any"
                disabled={!canEdit}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.averageBase}
                onChange={(e) => onChange({ averageBase: e.target.value })}
                onWheel={preventNumberInputWheel}
              />
            </div>
          )}
          {showBases && kind === "standalone" && !isAverage && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.baseBuy")}</label>
                <input
                  type="number"
                  step="any"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.baseBuy}
                  onChange={(e) => onChange({ baseBuy: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.baseSell")}</label>
                <input
                  type="number"
                  step="any"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.baseSell}
                  onChange={(e) => onChange({ baseSell: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
            </>
          )}
          {showBases && kind === "benchmark" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.baseBuy")}</label>
                <input
                  type="number"
                  step="any"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.baseBuy}
                  onChange={(e) => onChange({ baseBuy: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.baseSell")}</label>
                <input
                  type="number"
                  step="any"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.baseSell}
                  onChange={(e) => onChange({ baseSell: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
            </>
          )}
          {showSpreads && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.markupPercent")}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.markupPercent}
                  onChange={(e) => onChange({ markupPercent: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("referenceRates.markdownPercent")}</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.markdownPercent}
                  onChange={(e) => onChange({ markdownPercent: e.target.value })}
                  onWheel={preventNumberInputWheel}
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("referenceRates.panelDecimals")}</label>
            <input
              type="number"
              min={0}
              max={8}
              step={1}
              disabled={!canEdit}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.displayDecimals}
              onChange={(e) => onChange({ displayDecimals: e.target.value })}
              onWheel={preventNumberInputWheel}
            />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">{t("referenceRates.computed")}: </span>
          {t("referenceRates.buy")}{" "}
          <span className="font-mono">
            {preview.computedBuy != null
              ? preview.computedBuy.toFixed(preview.displayDecimals ?? 3)
              : "—"}
          </span>
          {" · "}
          {t("referenceRates.sell")}{" "}
          <span className="font-mono">
            {preview.computedSell != null
              ? preview.computedSell.toFixed(preview.displayDecimals ?? 3)
              : "—"}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}
