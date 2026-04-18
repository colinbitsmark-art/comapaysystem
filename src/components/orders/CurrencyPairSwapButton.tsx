import React from "react";

type Props = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
};

/** Icon button to swap “from” and “to” currencies (same height as compact selects). */
export function CurrencyPairSwapButton({ onClick, label, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M7.5 21 3 16.5M3 16.5 7.5 12M3 16.5h13.5M16.5 3 21 7.5M21 7.5 16.5 12M21 7.5H7.5" />
      </svg>
    </button>
  );
}
