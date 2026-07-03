"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Filter, Loader2, RotateCcw, Search } from "lucide-react";
import { LoadingLink } from "@/components/LoadingLink";

type SearchCategory = {
  id: string;
  name: string;
};

type SearchFiltersProps = {
  keyword: string;
  type: string;
  category: string;
  receipt: string;
  categories: SearchCategory[];
};

export function SearchFilters({
  keyword,
  type,
  category,
  receipt,
  categories,
}: SearchFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(keyword);
  const [documentType, setDocumentType] = useState(type);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedReceipt, setSelectedReceipt] = useState(receipt);

  const currentSearch = searchParams.toString();

  const nextSearch = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (documentType) {
      params.set("type", documentType);
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedReceipt) {
      params.set("receipt", selectedReceipt);
    }

    return params.toString();
  }, [documentType, query, selectedCategory, selectedReceipt]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (nextSearch === currentSearch) {
        return;
      }

      startTransition(() => {
        router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
          scroll: false,
        });
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [currentSearch, nextSearch, pathname, router]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nextSearch === currentSearch) {
      return;
    }

    startTransition(() => {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <form className="border-b border-slate-200 p-5" onSubmit={submitSearch}>
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_170px_210px_190px_auto_auto]">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor, PIC, departemen, kategori, catatan, perihal"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
          />
        </label>

        <select
          name="type"
          value={documentType}
          onChange={(event) => setDocumentType(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        >
          <option value="">Semua jenis</option>
          <option value="LETTER">Dokumen</option>
          <option value="INVOICE">Invoice</option>
          <option value="OUTGOING">Surat Keluar</option>
          <option value="RECEIPT">Tanda Terima</option>
        </select>

        <select
          name="category"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        >
          <option value="">Semua kategori</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          name="receipt"
          value={selectedReceipt}
          onChange={(event) => setSelectedReceipt(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        >
          <option value="">Semua tanda terima</option>
          <option value="pending">Belum diterima</option>
          <option value="confirmed">Sudah diterima</option>
        </select>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Filter className="size-4" aria-hidden="true" />
          )}
          {isPending ? "Memuat" : "Cari"}
        </button>

        <LoadingLink
          href="/search"
          pendingLabel="Reset..."
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </LoadingLink>
      </div>
    </form>
  );
}
