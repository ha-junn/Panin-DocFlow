import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Plus,
  ReceiptText,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { PaginationControls } from "@/components/PaginationControls";
import { ReceiptStatusBadge } from "@/components/ReceiptStatusBadge";
import { fetchDocumentReceiptStatusMap } from "@/lib/receipts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteDocumentAction } from "../documents/actions";

type InvoicesPageProps = {
  searchParams: Promise<{
    message?: string;
    page?: string;
  }>;
};

type InvoiceDetail = {
  invoice_number: string | null;
  amount: number | null;
  internal_pic: string | null;
};

type RawInvoiceDocument = {
  id: string;
  agenda_number: string;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  department: { name: string; code: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
  creator: { full_name: string } | null;
};

type VendorPicDocument = Pick<
  RawInvoiceDocument,
  "sender_name" | "recipient_name" | "invoice_details"
>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 20;

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getPageHref(page: number) {
  return page > 1 ? `/invoices?page=${page}` : "/invoices";
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getInvoiceDetail(details: RawInvoiceDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function getInvoicePic(invoice: RawInvoiceDocument) {
  return getInvoiceDetail(invoice.invoice_details)?.internal_pic ?? invoice.recipient_name ?? "-";
}

function buildVendorPicList(invoices: VendorPicDocument[]) {
  const vendors = new Map<string, { count: number; pics: Set<string> }>();

  invoices.forEach((invoice) => {
    const vendor = invoice.sender_name?.trim() || "-";
    const pic =
      getInvoiceDetail(invoice.invoice_details)?.internal_pic?.trim() ||
      invoice.recipient_name?.trim();
    const current = vendors.get(vendor) ?? { count: 0, pics: new Set<string>() };

    current.count += 1;
    if (pic) {
      current.pics.add(pic);
    }

    vendors.set(vendor, current);
  });

  return Array.from(vendors.entries())
    .map(([vendor, value]) => ({
      vendor,
      count: value.count,
      pics: Array.from(value.pics).sort((a, b) => a.localeCompare(b, "id-ID")),
    }))
    .sort((a, b) => a.vendor.localeCompare(b.vendor, "id-ID"));
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { message, page: pageParam } = await searchParams;
  const currentPage = parsePage(pageParam);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: invoices, error, count } = await supabase
    .from("documents")
    .select(
      `
        id,
        agenda_number,
        received_at,
        created_at,
        sender_name,
        recipient_name,
        subject,
        department:departments(name, code),
        invoice_details(invoice_number, amount, internal_pic),
        creator:profiles!documents_created_by_fkey(full_name)
      `,
      { count: "exact" },
    )
    .eq("type", "INVOICE")
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data: vendorPicData } = await supabase
    .from("documents")
    .select(
      `
        sender_name,
        recipient_name,
        invoice_details(internal_pic)
      `,
    )
    .eq("type", "INVOICE")
    .order("sender_name", { ascending: true })
    .limit(500);

  const totalInvoices = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / PAGE_SIZE));
  if (totalInvoices > 0 && currentPage > totalPages) {
    redirect(getPageHref(totalPages));
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rows = (invoices ?? []) as unknown as RawInvoiceDocument[];
  const vendorPicList = buildVendorPicList(
    (vendorPicData ?? []) as unknown as VendorPicDocument[],
  );
  const receiptStatusMap = await fetchDocumentReceiptStatusMap(
    supabase,
    rows.map((invoice) => invoice.id),
  );
  const previousHref =
    safeCurrentPage > 1 ? getPageHref(safeCurrentPage - 1) : null;
  const nextHref =
    safeCurrentPage < totalPages ? getPageHref(safeCurrentPage + 1) : null;
  const vendorCount = vendorPicList.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D71920]/15 bg-[#D71920]/5 px-3 py-1 text-xs font-semibold text-[#B9151B]">
                <ClipboardList className="size-3.5" aria-hidden="true" />
                Invoice Masuk
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Daftar Invoice
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Pantau invoice berdasarkan vendor, nomor invoice, nominal
                Rupiah, PIC internal, dan detail dokumen.
              </p>
            </div>

            <LoadingLink
              href="/invoices/new"
              pendingLabel="Membuka..."
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#D71920] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b9151b]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah Invoice
            </LoadingLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Invoice tampil
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {totalInvoices}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Vendor
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">
              {vendorCount}
            </p>
          </div>
        </section>

        <details className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="flex cursor-pointer list-none flex-col gap-3 marker:hidden sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#B9151B]">
                <UsersRound className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Daftar Vendor & PIC
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Buka daftar ini saat perlu mengingat PIC dari vendor invoice.
                </p>
              </div>
            </div>
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition group-open:border-[#D71920]/30 group-open:bg-red-50 group-open:text-[#B9151B]">
              {vendorPicList.length} vendor
            </span>
          </summary>

          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/70 p-3">
            {vendorPicList.length > 0 ? (
              <div className="grid gap-2 lg:grid-cols-2">
                {vendorPicList.map((item) => (
                  <div
                    key={item.vendor}
                    className="rounded-md border border-slate-100 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold uppercase text-slate-950">
                        {item.vendor}
                      </p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {item.count} invoice
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.pics.length > 0 ? (
                        item.pics.map((pic) => (
                          <span
                            key={`${item.vendor}-${pic}`}
                            className="rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-[#B9151B]"
                          >
                            {pic}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          PIC belum tercatat
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                Belum ada vendor invoice yang tercatat.
              </p>
            )}
          </div>
        </details>

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
                Daftar invoice terbaru
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cari nomor invoice, vendor, tanggal, departemen, dan PIC dari
                menu Pencarian.
              </p>
            </div>
            <LoadingLink
              href="/search?type=INVOICE"
              pendingLabel="Membuka..."
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#D71920] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b9151b]"
            >
              <ClipboardList className="size-4" aria-hidden="true" />
              Cari Invoice
            </LoadingLink>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Data invoice gagal dimuat.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cek koneksi Supabase dan policy database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nomor Agenda
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nomor Invoice
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Vendor
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nominal
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      PIC
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tanggal
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
                    rows.map((invoice) => {
                      const detail = getInvoiceDetail(invoice.invoice_details);
                      const amount = Number(detail?.amount ?? 0);

                      return (
                        <tr
                          key={invoice.id}
                          className="group transition hover:bg-slate-50/80"
                        >
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold text-slate-950">
                              {invoice.agenda_number}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <span className="inline-flex rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#B9151B]">
                              {detail?.invoice_number || "-"}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold text-slate-950">
                              {invoice.sender_name}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950">
                            {amount > 0 ? currencyFormatter.format(amount) : "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {getInvoicePic(invoice)}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {formatDate(invoice.received_at)}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <LoadingLink
                                href={`/invoices/${invoice.id}`}
                                pendingLabel="Membuka..."
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#D71920]/30 hover:bg-red-50 hover:text-[#B9151B]"
                              >
                                Detail
                                <ArrowUpRight
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              </LoadingLink>
                              <form action={deleteDocumentAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={invoice.id}
                                />
                                <input
                                  type="hidden"
                                  name="type"
                                  value="INVOICE"
                                />
                                <ConfirmSubmitButton
                                  message={`Hapus invoice ${invoice.agenda_number}?`}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-[#B9151B] transition hover:bg-red-50"
                                >
                                  <Trash2
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                  Hapus
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <ReceiptStatusBadge
                              receipt={receiptStatusMap.get(invoice.id)}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-red-50 text-[#B9151B]">
                          <ReceiptText className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          Tidak ada invoice yang cocok
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Coba ubah kata kunci atau filter yang dipilih.
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
            totalItems={totalInvoices}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </section>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 size-5 shrink-0 text-[#D71920]" />
            <p>
              Nominal ditampilkan dalam Rupiah sesuai data invoice yang
              dimasukkan. Halaman ini tidak memakai tanggal jatuh tempo, mata
              uang, PO/SPK, NPWP, atau pembayaran khusus.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
