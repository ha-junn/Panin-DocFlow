import { LoadingLink } from "@/components/LoadingLink";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  previousHref: string | null;
  nextHref: string | null;
};

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  previousHref,
  nextHref,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p className="leading-6">
        Menampilkan{" "}
        <span className="font-semibold text-slate-900">
          {firstItem}-{lastItem}
        </span>{" "}
        dari <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
        data.
      </p>
      <div className="flex items-center gap-2">
        {previousHref ? (
          <LoadingLink
            href={previousHref}
            pendingLabel="Memuat..."
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Sebelumnya
          </LoadingLink>
        ) : (
          <span
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-white/60 px-3 text-sm font-semibold text-slate-400"
            aria-disabled="true"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Sebelumnya
          </span>
        )}
        <span className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
          {currentPage} / {totalPages}
        </span>
        {nextHref ? (
          <LoadingLink
            href={nextHref}
            pendingLabel="Memuat..."
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
          >
            Berikutnya
            <ChevronRight className="size-4" aria-hidden="true" />
          </LoadingLink>
        ) : (
          <span
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-white/60 px-3 text-sm font-semibold text-slate-400"
            aria-disabled="true"
          >
            Berikutnya
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
