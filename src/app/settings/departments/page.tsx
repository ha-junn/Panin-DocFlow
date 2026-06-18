import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ContactRound,
  DatabaseBackup,
  DatabaseZap,
  Layers3,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createDepartmentAction,
  deleteDepartmentAction,
  updateDepartmentAction,
} from "./actions";

type DepartmentsPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type Department = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

type DocumentReference = {
  department_id: string | null;
};

function countByDepartment(documents: DocumentReference[]) {
  return documents.reduce<Record<string, number>>((accumulator, document) => {
    if (document.department_id) {
      accumulator[document.department_id] = (accumulator[document.department_id] ?? 0) + 1;
    }

    return accumulator;
  }, {});
}

export default async function DepartmentsSettingsPage({
  searchParams,
}: DepartmentsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ message }, { data: departments, error }, { data: documents }] =
    await Promise.all([
      searchParams,
      supabase
        .from("departments")
        .select("id, name, code, created_at")
        .order("name", { ascending: true }),
      supabase.from("documents").select("department_id"),
    ]);

  const rows = (departments ?? []) as Department[];
  const usageMap = countByDepartment((documents ?? []) as DocumentReference[]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Settings className="size-3.5" aria-hidden="true" />
                Pengaturan Master Data
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Departemen
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Kelola pilihan departemen tujuan yang muncul di form surat,
                invoice, pencarian, laporan, dan backup.
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <LoadingLink
                href="/settings/departments"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#0A3A60] shadow-sm"
              >
                <Building2 className="size-4" aria-hidden="true" />
                Departemen
              </LoadingLink>
              <LoadingLink
                href="/settings/categories"
                pendingLabel="Membuka..."
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
              >
                <Layers3 className="size-4" aria-hidden="true" />
                Kategori
              </LoadingLink>
              <LoadingLink
                href="/settings/pic-contacts"
                pendingLabel="Membuka..."
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
              >
                <ContactRound className="size-4" aria-hidden="true" />
                Master PIC
              </LoadingLink>
              <LoadingLink
                href="/settings/backup-history"
                pendingLabel="Membuka..."
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
              >
                <DatabaseBackup className="size-4" aria-hidden="true" />
                Riwayat Backup
              </LoadingLink>
              <LoadingLink
                href="/settings/cleanup"
                pendingLabel="Membuka..."
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
              >
                <DatabaseZap className="size-4" aria-hidden="true" />
                Bersihkan Data
              </LoadingLink>
            </div>
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            action={createDepartmentAction}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                <Plus className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Tambah Departemen
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contoh: General Affair, HRM.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Nama departemen
                </span>
                <input
                  name="name"
                  required
                  placeholder="Nama departemen"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Kode</span>
                <input
                  name="code"
                  required
                  placeholder="GA"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <PendingSubmitButton
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
                pendingLabel="Menyimpan..."
              >
                <Plus className="size-4" aria-hidden="true" />
                Simpan Departemen
              </PendingSubmitButton>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Daftar Departemen
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Departemen yang sudah dipakai dokumen tidak bisa dihapus dari
                database.
              </p>
            </div>

            {error ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-red-700">
                  Data departemen gagal dimuat.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((department) => (
                  <div key={department.id} className="p-5">
                    <form
                      action={updateDepartmentAction}
                      className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_120px_120px_auto_auto]"
                    >
                      <input type="hidden" name="id" value={department.id} />
                      <input
                        name="name"
                        defaultValue={department.name}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                      />
                      <input
                        name="code"
                        defaultValue={department.code}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm uppercase text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                      />
                      <div className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
                        {usageMap[department.id] ?? 0} dokumen
                      </div>
                      <PendingSubmitButton
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
                        pendingLabel="Menyimpan..."
                      >
                        <Save className="size-4" aria-hidden="true" />
                        Simpan
                      </PendingSubmitButton>
                    </form>

                    <form action={deleteDepartmentAction} className="mt-3">
                      <input type="hidden" name="id" value={department.id} />
                      <ConfirmSubmitButton
                        message={`Hapus departemen ${department.name}?`}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-[#B9151B] transition hover:bg-red-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Hapus
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ))}

                {rows.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Belum ada departemen.
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </div>
    </AppLayout>
  );
}
