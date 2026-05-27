import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  DatabaseBackup,
  Download,
  FileText,
  Filter,
  Layers3,
  PieChart,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReportsPageProps = {
  searchParams: Promise<{
    date_from?: string;
    date_to?: string;
    type?: string;
    department?: string;
    category?: string;
    backup_month?: string;
    backup_year?: string;
  }>;
};

type DbDocumentType = "LETTER" | "INVOICE";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Category = {
  id: string;
  name: string;
  type: "LETTER" | "INVOICE" | "BOTH";
};

type InvoiceDetail = {
  invoice_number: string | null;
  internal_pic: string | null;
};

type ReportDocument = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
};

type BreakdownItem = {
  label: string;
  value: number;
};

const validTypes = new Set(["LETTER", "INVOICE"]);

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function getValidMonth(value: string | undefined) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : new Date().getMonth() + 1;
}

function getValidYear(value: string | undefined) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2020 && year <= 2100
    ? year
    : new Date().getFullYear();
}

function buildMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const label = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
      new Date(2026, index, 1),
    );

    return { month, label };
  });
}

function buildYearOptions(selectedYear: number) {
  const currentYear = new Date().getFullYear();
  const start = Math.min(2024, selectedYear);
  const end = Math.max(currentYear + 1, selectedYear);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Dokumen";
}

function getInvoiceDetail(details: ReportDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function getPic(document: ReportDocument) {
  if (document.type === "INVOICE") {
    return getInvoiceDetail(document.invoice_details)?.internal_pic ?? document.recipient_name ?? "-";
  }

  return document.recipient_name ?? "-";
}

function buildExportHref(params: {
  dateFrom: string;
  dateTo: string;
  type: string;
  department: string;
  category: string;
}) {
  const query = new URLSearchParams({
    date_from: params.dateFrom,
    date_to: params.dateTo,
  });

  if (params.type) {
    query.set("type", params.type);
  }

  if (params.department) {
    query.set("department", params.department);
  }

  if (params.category) {
    query.set("category", params.category);
  }

  return `/reports/export?${query.toString()}`;
}

function getBreakdown(
  documents: ReportDocument[],
  getLabel: (document: ReportDocument) => string,
) {
  const counts = documents.reduce<Record<string, number>>((accumulator, document) => {
    const label = getLabel(document);
    accumulator[label] = (accumulator[label] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function BreakdownList({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: typeof BarChart3;
  items: BreakdownItem[];
  emptyText: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">Berdasarkan hasil filter.</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.length > 0 ? (
          items.slice(0, 6).map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-700">
                  {item.label}
                </span>
                <span className="font-semibold text-slate-950">{item.value}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[#0A3A60]"
                  style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const defaults = getDefaultDateRange();
  const params = await searchParams;
  const dateFrom = isValidDateInput(String(params.date_from ?? ""))
    ? String(params.date_from)
    : defaults.from;
  const dateTo = isValidDateInput(String(params.date_to ?? ""))
    ? String(params.date_to)
    : defaults.to;
  const type = validTypes.has(String(params.type)) ? String(params.type) : "";
  const department = String(params.department ?? "").trim();
  const category = String(params.category ?? "").trim();
  const selectedBackupMonth = getValidMonth(params.backup_month);
  const selectedBackupYear = getValidYear(params.backup_year);

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
      department:departments(name, code),
      category:document_categories(name),
      invoice_details(invoice_number, internal_pic)
    `,
    )
    .gte("received_at", `${dateFrom}T00:00:00`)
    .lte("received_at", `${dateTo}T23:59:59`)
    .order("received_at", { ascending: false })
    .limit(300);

  if (type) {
    documentsQuery = documentsQuery.eq("type", type);
  }

  if (department) {
    documentsQuery = documentsQuery.eq("department_id", department);
  }

  if (category) {
    documentsQuery = documentsQuery.eq("category_id", category);
  }

  const [
    { data: documents, error },
    { data: departments },
    { data: categories },
  ] = await Promise.all([
    documentsQuery,
    supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true }),
    supabase
      .from("document_categories")
      .select("id, name, type")
      .order("name", { ascending: true }),
  ]);

  const rows = (documents ?? []) as unknown as ReportDocument[];
  const departmentOptions = (departments ?? []) as Department[];
  const categoryOptions = (categories ?? []) as Category[];
  const documentCount = rows.filter((item) => item.type === "LETTER").length;
  const invoiceCount = rows.filter((item) => item.type === "INVOICE").length;
  const departmentBreakdown = getBreakdown(
    rows,
    (item) => item.department?.name ?? "Tanpa departemen",
  );
  const categoryBreakdown = getBreakdown(
    rows,
    (item) => item.category?.name ?? "Tanpa kategori",
  );
  const exportHref = buildExportHref({
    dateFrom,
    dateTo,
    type,
    department,
    category,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <BarChart3 className="size-3.5" aria-hidden="true" />
                Laporan Operasional
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Rekap Dokumen dan Invoice
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Pantau volume dokumen, invoice, kategori, dan departemen dalam
                rentang tanggal tertentu tanpa field status atau arsip.
              </p>
            </div>

            <Link
              href={exportHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <Download className="size-4" aria-hidden="true" />
              Export CSV
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <form className="grid gap-3 xl:grid-cols-[160px_160px_150px_220px_220px_auto_auto]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Dari tanggal
              </span>
              <input
                name="date_from"
                type="date"
                defaultValue={dateFrom}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Sampai tanggal
              </span>
              <input
                name="date_to"
                type="date"
                defaultValue={dateTo}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Jenis</span>
              <select
                name="type"
                defaultValue={type}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              >
                <option value="">Semua</option>
                <option value="LETTER">Dokumen</option>
                <option value="INVOICE">Invoice</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Departemen
              </span>
              <select
                name="department"
                defaultValue={department}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              >
                <option value="">Semua departemen</option>
                {departmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Kategori
              </span>
              <select
                name="category"
                defaultValue={category}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              >
                <option value="">Semua kategori</option>
                {categoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] xl:w-auto"
              >
                <Filter className="size-4" aria-hidden="true" />
                Tampilkan
              </button>
            </div>

            <div className="flex items-end">
              <Link
                href="/reports"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60] xl:w-auto"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Total hasil
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {rows.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Dokumen
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#0A3A60]">
              {documentCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Invoice
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#D71920]">
              {invoiceCount}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <BreakdownList
            title="Ringkasan Departemen"
            icon={PieChart}
            items={departmentBreakdown}
            emptyText="Belum ada data departemen pada rentang ini."
          />
          <BreakdownList
            title="Ringkasan Kategori"
            icon={Layers3}
            items={categoryBreakdown}
            emptyText="Belum ada data kategori pada rentang ini."
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-950">
              Detail Hasil Laporan
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Periode {formatDate(`${dateFrom}T00:00:00`)} sampai{" "}
              {formatDate(`${dateTo}T23:59:59`)}.
            </p>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Data laporan gagal dimuat.
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
                      Jenis
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Tanggal
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Pengirim/Vendor
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Departemen
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      Kategori
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3">
                      PIC
                    </th>
                    <th className="border-b border-slate-200 px-5 py-3 text-right">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((document) => {
                      const isInvoice = document.type === "INVOICE";

                      return (
                        <tr
                          key={document.id}
                          className="group transition hover:bg-slate-50/80"
                        >
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold text-slate-950">
                              {document.agenda_number}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {document.subject}
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
                            {document.department?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.category?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {getPic(document)}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right">
                            <Link
                              href={
                                document.type === "INVOICE"
                                  ? `/invoices/${document.id}`
                                  : `/documents/${document.id}`
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                            >
                              Detail
                              <FileText className="size-4" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <ReceiptText className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          Tidak ada data pada filter ini
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Coba ubah rentang tanggal, departemen, atau kategori.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <DatabaseBackup className="size-3.5" aria-hidden="true" />
                Backup Bulanan
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">
                Export data per bulan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gunakan ini untuk menyimpan arsip CSV bulanan. Backup berada
                di halaman Laporan agar rekap dan export data tidak tersebar di
                banyak menu.
              </p>
            </div>

            <form
              action="/backups/export"
              className="grid gap-3 sm:grid-cols-[180px_140px_auto]"
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Bulan</span>
                <select
                  name="month"
                  defaultValue={selectedBackupMonth}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  {buildMonthOptions().map((item) => (
                    <option key={item.month} value={item.month}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Tahun</span>
                <select
                  name="year"
                  defaultValue={selectedBackupYear}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  {buildYearOptions(selectedBackupYear).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] sm:w-auto"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export Backup
                </button>
              </div>
            </form>
          </div>
        </section>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-[#0A3A60]" />
            <p>
              Laporan ini mengikuti struktur aplikasi terbaru: tanpa status,
              tanpa arsip, tanpa jatuh tempo, tanpa mata uang, dan tanpa laporan
              pembayaran khusus.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
