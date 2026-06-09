import { CheckCircle2, Clock3, Link2 } from "lucide-react";
import type { ReceiptStatusSummary } from "@/lib/receipts";

type ReceiptStatusBadgeProps = {
  receipt?: ReceiptStatusSummary;
};

export function ReceiptStatusBadge({ receipt }: ReceiptStatusBadgeProps) {
  if (receipt?.status === "CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Sudah diterima
      </span>
    );
  }

  if (receipt?.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock3 className="size-3.5" aria-hidden="true" />
        Menunggu
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
      <Link2 className="size-3.5" aria-hidden="true" />
      Belum dibuat
    </span>
  );
}
