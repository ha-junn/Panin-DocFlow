import { LoadingLink } from "@/components/LoadingLink";

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
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
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
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
          >
            Sebelumnya
          </LoadingLink>
        ) : (
          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-400">
            Sebelumnya
          </span>
        )}
        <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700">
          {currentPage}/{totalPages}
        </span>
        {nextHref ? (
          <LoadingLink
            href={nextHref}
            pendingLabel="Memuat..."
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
          >
            Berikutnya
          </LoadingLink>
        ) : (
          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-400">
            Berikutnya
          </span>
        )}
      </div>
    </div>
  );
}
