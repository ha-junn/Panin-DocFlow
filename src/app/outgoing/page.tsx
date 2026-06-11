import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { PaginationControls } from "@/components/PaginationControls";
import { ReceiptStatusBadge } from "@/components/ReceiptStatusBadge";
import { fetchOutgoingReceiptStatusMap } from "@/lib/receipts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteOutgoingLetterAction } from "./actions";

type OutgoingPageProps = {
  searchParams: Promise<{
    message?: string;
    page?: string;
    q?: string;
  }>;
};

type OutgoingLetter = {
  id: string;
  agenda_number: string;
  sent_at: string;
  sender_staff: string;
  sender_department: "GA" | "HRM";
  letter_number: string | null;
  destination_name: string;
  attention_to: string | null;
  confidential: boolean;
};

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getPageHref(page: number, query = "") {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/outgoing?${queryString}` : "/outgoing";
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function normalizeSearch(value: string | undefined) {
  return String(value ?? "").replace(/[,%]/g, " ").trim();
}

export default async function OutgoingPage({ searchParams }: OutgoingPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { message, page: pageParam, q } = await searchParams;
  const searchQuery = normalizeSearch(q);
  const currentPage = parsePage(pageParam);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let outgoingQuery = supabase
    .from("outgoing_letters")
    .select(
      "id, agenda_number, sent_at, sender_staff, sender_department, letter_number, destination_name, attention_to, confidential",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (searchQuery) {
    const likeValue = `%${searchQuery}%`;
    outgoingQuery = outgoingQuery.or(
      [
        `agenda_number.ilike.${likeValue}`,
        `sender_staff.ilike.${likeValue}`,
        `sender_department.ilike.${likeValue}`,
        `letter_number.ilike.${likeValue}`,
        `destination_name.ilike.${likeValue}`,
        `attention_to.ilike.${likeValue}`,
        `subject.ilike.${likeValue}`,
      ].join(","),
    );
  }

  const { data, error, count } = await outgoingQuery.range(from, to);

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (totalItems > 0 && currentPage > totalPages) {
    redirect(getPageHref(totalPages, searchQuery));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rows = (data ?? []) as OutgoingLetter[];
  const receiptStatusMap = await fetchOutgoingReceiptStatusMap(
    supabase,
    rows.map((letter) => letter.id),
  );
  const previousHref =
    safeCurrentPage > 1 ? getPageHref(safeCurrentPage - 1, searchQuery) : null;
  const nextHref =
    safeCurrentPage < totalPages
      ? getPageHref(safeCurrentPage + 1, searchQuery)
      : null;
  const confidentialCount = rows.filter((row) => row.confidential).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Send className="size-3.5" aria-hidden="true" />
                Surat Keluar
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Daftar Surat Keluar
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Pantau amplop dan surat keluar dari staff GA/HRM dengan nomor
                agenda SK otomatis.
              </p>
            </div>

            <LoadingLink
              href="/outgoing/new"
              pendingLabel="Membuka..."
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Surat Keluar
            </LoadingLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Surat keluar
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {totalItems}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Confidential tampil
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#0A3A60]">
              {confidentialCount}
            </p>
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {message}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Daftar surat keluar terbaru
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Data terbaru selalu berada di urutan paling atas.
              </p>
            </div>
            <form
              action="/outgoing"
              className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[480px] sm:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Cari agenda, staff, nomor surat, tujuan..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60]/50 focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
              >
                <Search className="size-4" aria-hidden="true" />
                Cari
              </button>
              {searchQuery ? (
                <LoadingLink
                  href="/outgoing"
                  pendingLabel="Reset..."
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset
                </LoadingLink>
              ) : null}
            </form>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Modul Surat Keluar belum aktif.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Jalankan file supabase-add-outgoing-letters.sql di Supabase SQL
                Editor terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nomor Agenda
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tanggal Kirim
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Staff
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Dept
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nomor Surat
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tujuan
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      U.p
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Sifat
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3 text-right">
                      Aksi
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tanda Terima
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((letter) => (
                      <tr
                        key={letter.id}
                        className="group transition hover:bg-slate-50/80"
                      >
                        <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950">
                          {letter.agenda_number}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                          {formatDate(letter.sent_at)}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950">
                          {letter.sender_staff}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                          {letter.sender_department}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                          {letter.letter_number || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950">
                          {letter.destination_name}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                          {letter.attention_to || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4">
                          {letter.confidential ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <ShieldCheck className="size-3.5" aria-hidden="true" />
                              Confidential
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <LoadingLink
                              href={`/outgoing/${letter.id}`}
                              pendingLabel="Membuka..."
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                            >
                              Detail
                              <ArrowUpRight className="size-4" aria-hidden="true" />
                            </LoadingLink>
                            <form action={deleteOutgoingLetterAction}>
                              <input type="hidden" name="id" value={letter.id} />
                              <ConfirmSubmitButton
                                message={`Hapus surat keluar ${letter.agenda_number}?`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-[#B9151B] transition hover:bg-red-50"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Hapus
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-5 py-4">
                          <ReceiptStatusBadge
                            receipt={receiptStatusMap.get(letter.id)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                          <Send className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          {searchQuery
                            ? "Surat keluar tidak ditemukan"
                            : "Belum ada surat keluar"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {searchQuery
                            ? "Coba kata kunci lain atau reset pencarian."
                            : "Tambahkan data surat keluar pertama dari tombol di kanan atas."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={safeCurrentPage}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </section>
      </div>
    </AppLayout>
  );
}
