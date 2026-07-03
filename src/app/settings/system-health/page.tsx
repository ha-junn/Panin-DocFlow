import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  DatabaseBackup,
  GitBranch,
  HardDrive,
  Server,
} from "lucide-react";
import packageJson from "../../../../package.json";
import { AppLayout } from "@/components/AppLayout";
import { LoadingLink } from "@/components/LoadingLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HealthTone = "healthy" | "warning" | "error" | "neutral";

type BackupStatus = "BACKED_UP" | "VERIFIED" | "CLEANED";

type BackupHistory = {
  backup_month: string;
  document_count: number;
  invoice_count: number;
  attachment_count: number;
  status: BackupStatus;
  backup_file_name: string | null;
  created_at: string;
  updated_at: string;
};

type HealthItemProps = {
  title: string;
  value: string;
  detail: string;
  tone: HealthTone;
  icon: typeof Activity;
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

const statusLabels: Record<BackupStatus, string> = {
  BACKED_UP: "Sudah backup",
  VERIFIED: "Sudah dicek",
  CLEANED: "Sudah dibersihkan",
};

const toneStyles: Record<
  HealthTone,
  {
    card: string;
    icon: string;
    badge: string;
  }
> = {
  healthy: {
    card: "border-emerald-200 bg-emerald-50/60",
    icon: "bg-emerald-600 text-white",
    badge: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/70",
    icon: "bg-amber-600 text-white",
    badge: "bg-amber-100 text-amber-800",
  },
  error: {
    card: "border-red-200 bg-red-50/70",
    icon: "bg-[#D71920] text-white",
    badge: "bg-red-100 text-red-700",
  },
  neutral: {
    card: "border-slate-200 bg-white",
    icon: "bg-[#0A3A60] text-white",
    badge: "bg-slate-100 text-slate-700",
  },
};

function formatDateTime(value: string | null | undefined) {
  return value ? dateTimeFormatter.format(new Date(value)) : "-";
}

function formatBackupMonth(value: string) {
  const date = new Date(value);

  return monthFormatter.format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
}

function shortCommit(value: string | undefined) {
  return value ? value.slice(0, 7) : "local";
}

function getDeploymentUrl() {
  const vercelUrl = process.env.VERCEL_URL;

  if (!vercelUrl) {
    return "Local development";
  }

  return `https://${vercelUrl}`;
}

function HealthItem({
  title,
  value,
  detail,
  tone,
  icon: Icon,
}: HealthItemProps) {
  const style = toneStyles[tone];
  const label =
    tone === "healthy"
      ? "OK"
      : tone === "warning"
        ? "Perlu cek"
        : tone === "error"
          ? "Error"
          : "Info";

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${style.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
          {label}
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="break-all text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

export default async function SystemHealthPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [databaseResult, storageResult, backupResult] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase.storage.from("document-attachments").list("", { limit: 1 }),
    supabase
      .from("backup_histories")
      .select(
        "backup_month, document_count, invoice_count, attachment_count, status, backup_file_name, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastBackup = backupResult.data as BackupHistory | null;
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const buildVersion = `${packageJson.version}-${shortCommit(commitSha)}`;
  const deploymentEnvironment = process.env.VERCEL_ENV ?? "local";
  const deploymentUrl = getDeploymentUrl();
  const databaseHealthy = !databaseResult.error;
  const storageHealthy = !storageResult.error;
  const backupHealthy = !backupResult.error && Boolean(lastBackup);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Activity className="size-3.5" aria-hidden="true" />
                System Health
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Status Sistem
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Ringkasan kondisi koneksi Supabase, storage, database, backup,
                dan deployment aktif Panin DocFlow.
              </p>
            </div>

            <LoadingLink
              href="/settings/backup-history"
              pendingLabel="Membuka..."
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#0A3A60]/20 bg-[#0A3A60]/5 px-3 text-sm font-semibold text-[#0A3A60] transition hover:bg-[#0A3A60]/10"
            >
              <DatabaseBackup className="size-4" aria-hidden="true" />
              Riwayat Backup
            </LoadingLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HealthItem
            title="Supabase Status"
            value={authError ? "Session error" : "Connected"}
            detail={
              authError
                ? "Auth Supabase tidak dapat memvalidasi session aktif."
                : "Auth session aktif dan client Supabase berhasil dibuat."
            }
            tone={authError ? "error" : "healthy"}
            icon={Cloud}
          />
          <HealthItem
            title="Storage Status"
            value={storageHealthy ? "Bucket aktif" : "Tidak tersedia"}
            detail={
              storageHealthy
                ? "Bucket document-attachments bisa diakses oleh user aktif."
                : storageResult.error?.message ?? "Storage gagal dicek."
            }
            tone={storageHealthy ? "healthy" : "error"}
            icon={HardDrive}
          />
          <HealthItem
            title="Database Status"
            value={databaseHealthy ? "Query OK" : "Query gagal"}
            detail={
              databaseHealthy
                ? `${databaseResult.count ?? 0} dokumen terbaca dari database.`
                : databaseResult.error?.message ?? "Database gagal dicek."
            }
            tone={databaseHealthy ? "healthy" : "error"}
            icon={Database}
          />
          <HealthItem
            title="Build Version"
            value={buildVersion}
            detail={`Package ${packageJson.name} versi ${packageJson.version}.`}
            tone="neutral"
            icon={Server}
          />
          <HealthItem
            title="Last Backup"
            value={lastBackup ? formatBackupMonth(lastBackup.backup_month) : "Belum ada"}
            detail={
              lastBackup
                ? `${statusLabels[lastBackup.status]} | ${lastBackup.document_count} dokumen, ${lastBackup.invoice_count} invoice, ${lastBackup.attachment_count} lampiran.`
                : backupResult.error?.message ?? "Belum ada riwayat backup tercatat."
            }
            tone={backupHealthy ? "healthy" : backupResult.error ? "error" : "warning"}
            icon={DatabaseBackup}
          />
          <HealthItem
            title="Last Deployment"
            value={deploymentEnvironment}
            detail={`Deployment aktif: ${deploymentUrl}`}
            tone={process.env.VERCEL_ENV ? "healthy" : "neutral"}
            icon={GitBranch}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Detail Deployment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Metadata ini diambil dari environment runtime Vercel.
                </p>
              </div>
            </div>

            <dl className="mt-5">
              <DetailRow label="Environment" value={deploymentEnvironment} />
              <DetailRow
                label="Branch"
                value={process.env.VERCEL_GIT_COMMIT_REF ?? "local"}
              />
              <DetailRow label="Commit" value={commitSha ?? "local"} />
              <DetailRow
                label="Commit Message"
                value={process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "-"}
              />
              <DetailRow label="Deployment URL" value={deploymentUrl} />
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Catatan Operasional
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Health check membaca status live tanpa mengubah data.
                </p>
              </div>
            </div>

            <dl className="mt-5">
              <DetailRow
                label="Backup terakhir dibuat"
                value={formatDateTime(lastBackup?.created_at)}
              />
              <DetailRow
                label="Backup terakhir diperbarui"
                value={formatDateTime(lastBackup?.updated_at)}
              />
              <DetailRow
                label="Nama file backup"
                value={lastBackup?.backup_file_name ?? "-"}
              />
              <DetailRow
                label="Waktu halaman dicek"
                value={formatDateTime(new Date().toISOString())}
              />
            </dl>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
