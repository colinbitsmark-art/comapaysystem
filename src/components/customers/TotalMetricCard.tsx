const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  label: string;
  amount: number | null;
  currency: string | null;
  hasUnknownRate?: boolean;
  /** company: + = green (profit), − = red; funding: + = indigo, − = red */
  variant?: "funding" | "company";
}

export function TotalMetricCard({
  label,
  amount,
  currency,
  hasUnknownRate,
  variant = "funding",
}: Props) {
  if (amount == null || currency == null) return null;

  const valueClass =
    amount < 0
      ? "text-rose-700"
      : amount > 0
        ? variant === "company"
          ? "text-emerald-700"
          : "text-indigo-900"
        : "text-slate-700";

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 min-w-[11.5rem] shrink-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        {label}
        <span className="normal-case font-medium text-indigo-500"> ({currency})</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums mt-0.5 ${valueClass}`}>
        {amount < 0 ? "-" : ""}
        {fmt(Math.abs(amount))}
        {hasUnknownRate ? (
          <span className="ml-1 text-sm font-medium text-amber-600">*</span>
        ) : null}
      </div>
    </div>
  );
}
