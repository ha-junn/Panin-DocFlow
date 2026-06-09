"use client";

import { Printer } from "lucide-react";

type PrintButtonProps = {
  label?: string;
  className?: string;
};

export function PrintButton({
  label = "Cetak Tanda Terima",
  className,
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
      }
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
