import { redirect } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  DatabaseBackup,
  DatabaseZap,
  Download,
  FileCheck2,
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
import {
  createBackupHistoryAction,
  deleteBackupHistoryAction,
  updateBackupHistoryStatusAction,
} from "./actions";

type BackupHistoryPageProps = {
  searchParams: Promise<{
    month?: string;
    message?: string;
    error?: string;
  }>;
};

type BackupStatus = "BACKED_UP" | "VERIFIED" | "CLEANED";

type BackupHistory = {
  id: string;
  backup_month: string;
  document_count: number;
  invoice_count: number;
  attachment_count: number;
  status: BackupStatus;
  backup_file_name: string | null;
  notes: string | null;
  updated_at: string;
  verified_at: string | null;
  cleaned_at: string | null;
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

const statusLabels: Record<BackupStatus, string> = {
  BACKED_UP: "Sudah backup",
  VERIFIED: "Sudah dicek",
  CLEANED: "Sudah dibersihkan",
};

const statusStyles: Record<BackupStatus, string> = {
  BACKED_UP: "border-sky-200 bg-sky-50 text-sky-700",
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLEANED: "border-amber-200 bg-amber-50 text-amber-700",
};

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

function formatMonth(value: string) {
  const date = new Date(value);

  return monthFormatter.format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function buildReportsHref(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");

  return `/reports?backup_month=${Number(monthText)}&backup_year=${yearText}`;
}

function SettingsTabs({
  active,
}: {
  active:
    | "departments"
    | "categories"
    | "pic-contacts"
    | "backup-history"
    | "cleanup";
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
        href="/settings/pic-contacts"
        pendingLabel="Membuka..."
        className={`${tabClass} ${
          active === "pic-contacts" ? activeClass : inactiveClass
        }`}
      >
        <ContactRound className="size-4" aria-hidden="true" />
        Master PIC
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

function StatusBadge({ status }: { status: BackupStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export default async function BackupHistorySettingsPage({
  searchParams,
}: BackupHistoryPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedMonth = getValidMonth(params.month);
  const { data, error } = await supabase
    .from("backup_histories")
    .select(
      "id, backup_month, document_count, invoice_count, attachment_count, status, backup_file_name, notes, updated_at, verified_at, cleaned_at",
    )
    .order("backup_month", { ascending: false });

  const histories = (data ?? []) as BackupHistory[];
  const totalDocuments = histories.reduce(
    (total, item) => total + item.document_count,
    0,
  );
  const totalInvoices = histories.reduce(
    (total, item) => total + item.invoice_count,
    0,
  );
  const verifiedCount = histories.filter((item) => item.status !== "BACKED_UP").length;

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
                Riwayat Backup
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Catat bulan yang sudah diexport dari menu Laporan agar proses
                backup dan pembersihan data tetap rapi.
              </p>
            </div>

            <SettingsTabs active="backup-history" />
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
            {params.error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Bulan tercatat" value={histories.length} />
          <StatCard label="Dokumen tercatat" value={totalDocuments} />
          <StatCard label="Invoice tercatat" value={totalInvoices} tone="red" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-4">
            <form
              action={createBackupHistoryAction}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                  <DatabaseBackup className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Catat Backup Bulanan
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Export tetap dilakukan dari menu Laporan, lalu catat bulan
                    yang sudah kamu simpan di sini.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Bulan backup
                  </span>
                  <input
                    type="month"
                    name="month"
                    defaultValue={selectedMonth}
                    required
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Status
                  </span>
                  <select
                    name="status"
                    defaultValue="BACKED_UP"
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                  >
                    <option value="BACKED_UP">Sudah backup</option>
                    <option value="VERIFIED">Sudah dicek</option>
                    <option value="CLEANED">Sudah dibersihkan</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Nama file backup
                  </span>
                  <input
                    name="backup_file_name"
                    placeholder="Opsional, contoh: backup-juni-2026.csv"
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Catatan
                  </span>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Opsional, contoh: File sudah masuk folder backup laptop."
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                  />
                </label>

                <PendingSubmitButton
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
                  pendingLabel="Mencatat..."
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  Catat Riwayat Backup
                </PendingSubmitButton>
              </div>
            </form>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Download className="mt-0.5 size-5 shrink-0 text-[#0A3A60]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Export dari Laporan
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Ambil file CSV/XLSX dari menu Laporan terlebih dahulu.
                    Riwayat Backup hanya mencatat bukti bahwa backup bulan
                    tersebut sudah dilakukan.
                  </p>
                  <LoadingLink
                    href={buildReportsHref(selectedMonth)}
                    pendingLabel="Membuka..."
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0A3A60] shadow-sm transition hover:bg-slate-50"
                  >
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Buka Laporan Bulan Ini
                  </LoadingLink>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Daftar Riwayat Backup
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {verifiedCount} bulan sudah dicek atau dibersihkan.
                </p>
              </div>
            </div>

            {error ? (
              <div className="p-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  <p className="font-semibold">
                    Tabel Riwayat Backup belum siap.
                  </p>
                  <p className="mt-1">
                    Jalankan file{" "}
                    <span className="font-mono font-semibold">
                      supabase-add-backup-history.sql
                    </span>{" "}
                    di Supabase SQL Editor, lalu refresh halaman ini.
                  </p>
                </div>
              </div>
            ) : histories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-5 py-3">Bulan</th>
                      <th className="px-5 py-3">Data</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">File/Catatan</th>
                      <th className="px-5 py-3">Update</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {histories.map((history) => {
                      const monthValue = history.backup_month.slice(0, 7);

                      return (
                        <tr key={history.id} className="align-top">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-950">
                              {formatMonth(history.backup_month)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <p>{history.document_count} dokumen</p>
                            <p>{history.invoice_count} invoice</p>
                            <p>{history.attachment_count} lampiran</p>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={history.status} />
                            {history.verified_at ? (
                              <p className="mt-2 text-xs text-slate-500">
                                Dicek {formatDate(history.verified_at)}
                              </p>
                            ) : null}
                            {history.cleaned_at ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Dibersihkan {formatDate(history.cleaned_at)}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-xs px-5 py-4 text-slate-600">
                            <p className="font-medium text-slate-700">
                              {history.backup_file_name || "-"}
                            </p>
                            <p className="mt-1 line-clamp-3">
                              {history.notes || "Tidak ada catatan."}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(history.updated_at)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {history.status === "BACKED_UP" ? (
                                <form action={updateBackupHistoryStatusAction}>
                                  <input type="hidden" name="id" value={history.id} />
                                  <input type="hidden" name="month" value={monthValue} />
                                  <input type="hidden" name="status" value="VERIFIED" />
                                  <PendingSubmitButton
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                    pendingLabel="Mengecek..."
                                  >
                                    <ShieldCheck className="size-4" aria-hidden="true" />
                                    Sudah dicek
                                  </PendingSubmitButton>
                                </form>
                              ) : null}

                              {history.status !== "CLEANED" ? (
                                <form action={updateBackupHistoryStatusAction}>
                                  <input type="hidden" name="id" value={history.id} />
                                  <input type="hidden" name="month" value={monthValue} />
                                  <input type="hidden" name="status" value="CLEANED" />
                                  <ConfirmSubmitButton
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                    pendingLabel="Menandai..."
                                    message="Tandai riwayat ini sebagai sudah dibersihkan?"
                                  >
                                    <DatabaseZap className="size-4" aria-hidden="true" />
                                    Sudah dibersihkan
                                  </ConfirmSubmitButton>
                                </form>
                              ) : null}

                              <form action={deleteBackupHistoryAction}>
                                <input type="hidden" name="id" value={history.id} />
                                <input type="hidden" name="month" value={monthValue} />
                                <ConfirmSubmitButton
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                  pendingLabel="Menghapus..."
                                  message="Hapus catatan riwayat backup ini?"
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                  Hapus
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <DatabaseBackup className="size-6" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-950">
                  Belum ada riwayat backup.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Setelah export dari Laporan, catat bulan backup di form kiri.
                </p>
              </div>
            )}
          </section>
        </section>
      </div>
    </AppLayout>
  );
}
