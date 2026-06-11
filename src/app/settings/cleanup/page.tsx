import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  DatabaseBackup,
  DatabaseZap,
  Download,
  FileText,
  Layers3,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cleanupDocumentsByMonthAction } from "./actions";

type CleanupPageProps = {
  searchParams: Promise<{
    month?: string;
    message?: string;
    error?: string;
  }>;
};

type CleanupDocument = {
  id: string;
  agenda_number: string;
  type: "LETTER" | "INVOICE";
  received_at: string;
  sender_name: string;
  attachment_url: string | null;
};

const monthInputPattern = /^\d{4}-\d{2}$/;

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function getCurrentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function getValidMonth(value: string | undefined) {
  if (!value || !monthInputPattern.test(value)) {
    return getCurrentMonthValue();
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2020 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return getCurrentMonthValue();
  }

  return value;
}

function getMonthRange(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function formatMonthLabel(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");

  return monthFormatter.format(
    new Date(Number(yearText), Number(monthText) - 1, 1),
  );
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function buildReportsHref(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");

  return `/reports?backup_month=${Number(monthText)}&backup_year=${yearText}`;
}

function SettingsTabs({
  active,
}: {
  active: "departments" | "categories" | "backup-history" | "cleanup";
}) {
  const tabClass =
    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition hover:bg-white hover:text-[#0A3A60]";
  const activeClass = "bg-white text-[#0A3A60] shadow-sm";
  const inactiveClass = "text-slate-600";

  return (
    <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1">
      <LoadingLink
        href="/settings/departments"
        pendingLabel="Membuka..."
        className={`${tabClass} ${
          active === "departments" ? activeClass : inactiveClass
        }`}
      >
        <Building2 className="size-4" aria-hidden="true" />
        Departemen
      </LoadingLink>
      <LoadingLink
        href="/settings/categories"
        pendingLabel="Membuka..."
        className={`${tabClass} ${
          active === "categories" ? activeClass : inactiveClass
        }`}
      >
        <Layers3 className="size-4" aria-hidden="true" />
        Kategori
      </LoadingLink>
      <LoadingLink
        href="/settings/backup-history"
        pendingLabel="Membuka..."
        className={`${tabClass} ${
          active === "backup-history" ? activeClass : inactiveClass
        }`}
      >
        <DatabaseBackup className="size-4" aria-hidden="true" />
        Riwayat Backup
      </LoadingLink>
      <LoadingLink
        href="/settings/cleanup"
        pendingLabel="Membuka..."
        className={`${tabClass} ${
          active === "cleanup" ? activeClass : inactiveClass
        }`}
      >
        <DatabaseZap className="size-4" aria-hidden="true" />
        Bersihkan Data
      </LoadingLink>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: number | string;
  tone?: "navy" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    navy: "text-[#0A3A60]",
    red: "text-[#D71920]",
    amber: "text-amber-700",
    slate: "text-slate-950",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function CleanupSettingsPage({
  searchParams,
}: CleanupPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedMonth = getValidMonth(params.month);
  const { startIso, endIso } = getMonthRange(selectedMonth);

  const { data, error } = await supabase
    .from("documents")
    .select("id, agenda_number, type, received_at, sender_name, attachment_url")
    .gte("received_at", startIso)
    .lt("received_at", endIso)
    .order("received_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, 4999);

  const documents = (data ?? []) as CleanupDocument[];
  const documentCount = documents.filter((item) => item.type === "LETTER").length;
  const invoiceCount = documents.filter((item) => item.type === "INVOICE").length;
  const attachmentCount = documents.filter((item) => item.attachment_url).length;
  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Settings className="size-3.5" aria-hidden="true" />
                Pengaturan Maintenance
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Bersihkan Data Lama
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Hapus data dokumen dan invoice per bulan setelah backup dari
                menu Laporan selesai disimpan.
              </p>
            </div>

            <SettingsTabs active="cleanup" />
          </div>
        </section>

        {params.message ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {params.message}
          </div>
        ) : null}

        {params.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {params.error}
          </div>
        ) : null}

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Pastikan data bulan ini sudah diexport dari menu Laporan
                  sebelum dibersihkan.
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Data yang dibersihkan akan dihapus permanen dari Supabase,
                  termasuk lampiran dokumen/invoice pada bulan terpilih.
                </p>
              </div>
            </div>

            <LoadingLink
              href={buildReportsHref(selectedMonth)}
              pendingLabel="Membuka..."
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <Download className="size-4" aria-hidden="true" />
              Buka Laporan
            </LoadingLink>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                <CalendarDays className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Pilih Bulan Data
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cocokkan dengan bulan yang sudah diexport.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Bulan</span>
                <input
                  name="month"
                  type="month"
                  defaultValue={selectedMonth}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <PendingSubmitButton
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
                pendingLabel="Memuat..."
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                Tampilkan Data
              </PendingSubmitButton>
            </form>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Periode" value={monthLabel} tone="slate" />
            <StatCard label="Dokumen" value={documentCount} tone="navy" />
            <StatCard label="Invoice" value={invoiceCount} tone="red" />
            <StatCard label="Lampiran" value={attachmentCount} tone="amber" />
          </section>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Preview Data yang Akan Dibersihkan
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Menampilkan contoh data bulan {monthLabel}. Surat keluar tidak
                ikut dibersihkan dari halaman ini.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {documents.length} data ditemukan
            </div>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Data gagal dimuat.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cek koneksi Supabase dan policy database.
              </p>
            </div>
          ) : documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left">
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
                      Lampiran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.slice(0, 8).map((document) => (
                    <tr key={document.id} className="transition hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-950">
                        {document.agenda_number}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold text-white",
                            document.type === "INVOICE"
                              ? "bg-[#D71920]"
                              : "bg-[#0A3A60]",
                          ].join(" ")}
                        >
                          {document.type === "INVOICE" ? "Invoice" : "Dokumen"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        {formatDate(document.received_at)}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-900">
                        {document.sender_name}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        {document.attachment_url ? "Ada" : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {documents.length > 8 ? (
                <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                  Dan {documents.length - 8} data lainnya pada bulan ini.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="size-6" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Tidak ada data pada bulan ini
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Pilih bulan lain jika ingin membersihkan data lama.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#B9151B]">
                <Trash2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Bersihkan Data {monthLabel}
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Setelah tombol ditekan, data dokumen dan invoice bulan ini
                  akan dihapus dari Supabase. Pastikan file CSV/XLSX sudah aman
                  di komputer atau folder backup kamu.
                </p>
              </div>
            </div>

            <form action={cleanupDocumentsByMonthAction} className="space-y-3">
              <input type="hidden" name="month" value={selectedMonth} />
              <label className="flex max-w-md items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                <input
                  name="backup_confirmed"
                  type="checkbox"
                  required
                  className="mt-1 size-4 rounded border-slate-300 text-[#0A3A60] focus:ring-[#0A3A60]"
                />
                Saya sudah export dan menyimpan backup bulan {monthLabel}.
              </label>

              <ConfirmSubmitButton
                message={`Bersihkan data ${monthLabel}? Data dokumen dan invoice akan dihapus permanen dari Supabase.`}
                pendingLabel="Membersihkan..."
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#B9151B] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9f1116]"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Bersihkan Data
              </ConfirmSubmitButton>
            </form>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
