import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  FileSearch,
  FileText,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SearchFilters } from "./SearchFilters";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    category?: string;
  }>;
};

type DbDocumentType = "LETTER" | "INVOICE";

type Category = {
  id: string;
  name: string;
  type: "LETTER" | "INVOICE" | "BOTH";
};

type InvoiceDetail = {
  invoice_number: string | null;
  amount: number | null;
  internal_pic: string | null;
};

type SearchDocument = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  employee_name: string | null;
  amount: number | null;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
  creator: { full_name: string } | null;
};

const validTypes = new Set(["LETTER", "INVOICE"]);

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

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Surat";
}

function getInvoiceDetail(details: SearchDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function getPic(document: SearchDocument) {
  if (document.type === "INVOICE") {
    return getInvoiceDetail(document.invoice_details)?.internal_pic ?? document.recipient_name ?? "-";
  }

  return document.recipient_name ?? "-";
}

function getInvoiceNumber(document: SearchDocument) {
  return getInvoiceDetail(document.invoice_details)?.invoice_number ?? "-";
}

function getAmount(document: SearchDocument) {
  return Number(getInvoiceDetail(document.invoice_details)?.amount ?? 0);
}

function matchesKeyword(document: SearchDocument, keyword: string) {
  if (!keyword) {
    return true;
  }

  const invoiceDetail = getInvoiceDetail(document.invoice_details);
  const searchableText = [
    document.agenda_number,
    invoiceDetail?.invoice_number,
    document.sender_name,
    document.recipient_name,
    document.employee_name,
    invoiceDetail?.internal_pic,
    document.subject,
    document.department?.name,
    document.department?.code,
    document.category?.name,
    document.creator?.full_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(keyword.toLowerCase());
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const keyword = String(params.q ?? "").trim();
  const type = validTypes.has(String(params.type)) ? String(params.type) : "";
  const category = String(params.category ?? "").trim();

  let documentsQuery = supabase
    .from("documents")
    .select(
      `
      id,
      agenda_number,
      type,
      received_at,
      sender_name,
      recipient_name,
      subject,
      employee_name,
      amount,
      department:departments(name, code),
      category:document_categories(name),
      invoice_details(invoice_number, amount, internal_pic),
      creator:profiles!documents_created_by_fkey(full_name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (type) {
    documentsQuery = documentsQuery.eq("type", type);
  }

  if (category) {
    documentsQuery = documentsQuery.eq("category_id", category);
  }

  const [{ data: documents, error }, { data: categories }] = await Promise.all([
    documentsQuery,
    supabase
      .from("document_categories")
      .select("id, name, type")
      .order("name", { ascending: true }),
  ]);

  const rows = ((documents ?? []) as unknown as SearchDocument[]).filter(
    (document) => matchesKeyword(document, keyword),
  );
  const categoryOptions = (categories ?? []) as Category[];
  const letterCount = rows.filter((row) => row.type === "LETTER").length;
  const invoiceCount = rows.filter((row) => row.type === "INVOICE").length;
  const totalAmount = rows.reduce((sum, row) => sum + getAmount(row), 0);
  const hasActiveFilter = Boolean(keyword || type || category);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <FileSearch className="size-3.5" aria-hidden="true" />
                Pencarian Terpusat
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Cari Surat dan Invoice
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Satu tempat untuk menemukan dokumen berdasarkan nomor agenda,
                vendor/pengirim, kategori, departemen, tanggal diterima, dan PIC.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Hasil</p>
                <p className="text-lg font-semibold text-slate-950">{rows.length}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Surat</p>
                <p className="text-lg font-semibold text-[#0A3A60]">{letterCount}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="text-lg font-semibold text-[#D71920]">{invoiceCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <SearchFilters
            key={`${keyword}-${type}-${category}`}
            keyword={keyword}
            type={type}
            category={category}
            categories={categoryOptions}
          />

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Data pencarian gagal dimuat.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cek koneksi Supabase dan policy database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-5 py-3">
                      Nomor Agenda
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Jenis
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tanggal
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Pengirim/Vendor
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Kategori
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Departemen
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      PIC
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Perihal / Invoice
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((document) => {
                      const isInvoice = document.type === "INVOICE";
                      const amount = getAmount(document);

                      return (
                        <tr
                          key={document.id}
                          className="group transition hover:bg-slate-50/80"
                        >
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold text-slate-950">
                              {document.agenda_number}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <span
                              className={[
                                "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
                                isInvoice
                                  ? "bg-[#D71920] text-white"
                                  : "bg-[#0A3A60] text-white",
                              ].join(" ")}
                            >
                              {formatDocumentType(document.type)}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {formatDate(document.received_at)}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-900">
                            {document.sender_name}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.category?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.department?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-2">
                              <UserRound className="size-4 text-slate-400" aria-hidden="true" />
                              {getPic(document)}
                            </span>
                          </td>
                          <td className="max-w-sm border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            <span className="line-clamp-2">{document.subject}</span>
                            {isInvoice ? (
                              <span className="mt-1 block text-xs font-medium text-slate-500">
                                Invoice {getInvoiceNumber(document)}
                                {amount > 0 ? ` | ${currencyFormatter.format(amount)}` : ""}
                              </span>
                            ) : null}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right">
                            <Link
                              href={
                                isInvoice
                                  ? `/invoices/${document.id}`
                                  : `/documents/${document.id}`
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                            >
                              Detail
                              <ArrowUpRight className="size-4" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          {hasActiveFilter ? (
                            <FileSearch className="size-6" aria-hidden="true" />
                          ) : (
                            <FileText className="size-6" aria-hidden="true" />
                          )}
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          {hasActiveFilter
                            ? "Tidak ada dokumen yang cocok"
                            : "Belum ada dokumen untuk dicari"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {hasActiveFilter
                            ? "Coba ubah kata kunci, kategori, departemen, atau tanggal."
                            : "Data surat dan invoice akan muncul setelah dibuat."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-0.5 size-5 shrink-0 text-[#0A3A60]" />
              <p>
                Pencarian utama membaca nomor agenda, nomor invoice,
                pengirim/vendor, perihal, kategori, departemen, PIC, dan pembuat
                dokumen.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 size-5 shrink-0 text-[#D71920]" />
              <p>
                Total nominal invoice dari hasil pencarian saat ini:{" "}
                <span className="font-semibold text-slate-950">
                  {currencyFormatter.format(totalAmount)}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
