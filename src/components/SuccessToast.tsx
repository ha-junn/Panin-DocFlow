"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type SuccessToastProps = {
  title: string;
  message: string;
};

export function SuccessToast({ title, message }: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsVisible(false), 4500);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed right-5 top-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm gap-3 rounded-lg border border-emerald-200 bg-white p-4 text-sm shadow-lg shadow-slate-900/10"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 leading-5 text-slate-600">{message}</p>
      </div>
      <button
        type="button"
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        onClick={() => setIsVisible(false)}
        aria-label="Tutup notifikasi"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
