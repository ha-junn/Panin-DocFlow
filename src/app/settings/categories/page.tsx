import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Layers3,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "./actions";

type CategoriesPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type CategoryType = "LETTER" | "INVOICE" | "BOTH";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
  created_at: string;
};

type DocumentReference = {
  category_id: string | null;
};

const categoryTypeLabels: Record<CategoryType, string> = {
  LETTER: "Surat",
  INVOICE: "Invoice",
  BOTH: "Surat & Invoice",
};

const categoryTypeStyles: Record<CategoryType, string> = {
  LETTER: "bg-[#0A3A60]/10 text-[#0A3A60]",
  INVOICE: "bg-[#D71920]/10 text-[#B9151B]",
  BOTH: "bg-emerald-50 text-emerald-700",
};

function countByCategory(documents: DocumentReference[]) {
  return documents.reduce<Record<string, number>>((accumulator, document) => {
    if (document.category_id) {
      accumulator[document.category_id] = (accumulator[document.category_id] ?? 0) + 1;
    }

    return accumulator;
  }, {});
}

function CategoryTypeSelect({
  defaultValue = "LETTER",
}: {
  defaultValue?: CategoryType;
}) {
  return (
    <select
      name="type"
      defaultValue={defaultValue}
      className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
    >
      <option value="LETTER">Surat</option>
      <option value="INVOICE">Invoice</option>
      <option value="BOTH">Surat & Invoice</option>
    </select>
  );
}

export default async function CategoriesSettingsPage({
  searchParams,
}: CategoriesPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ message }, { data: categories, error }, { data: documents }] =
    await Promise.all([
      searchParams,
      supabase
        .from("document_categories")
        .select("id, name, type, created_at")
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("documents").select("category_id"),
    ]);

  const rows = (categories ?? []) as Category[];
  const usageMap = countByCategory((documents ?? []) as DocumentReference[]);

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
                Kategori Dokumen
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Kelola kategori yang muncul di form surat, pencarian, tabel
                dashboard, laporan, dan backup.
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <Link
                href="/settings/departments"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
              >
                <Building2 className="size-4" aria-hidden="true" />
                Departemen
              </Link>
              <Link
                href="/settings/categories"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#0A3A60] shadow-sm"
              >
                <Layers3 className="size-4" aria-hidden="true" />
                Kategori
              </Link>
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
            action={createCategoryAction}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
                <Plus className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Tambah Kategori
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contoh: Form PR, Transport Dinas, Vendor.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Nama kategori
                </span>
                <input
                  name="name"
                  required
                  placeholder="Nama kategori"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Dipakai untuk
                </span>
                <div className="mt-2">
                  <CategoryTypeSelect />
                </div>
              </label>

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
              >
                <Plus className="size-4" aria-hidden="true" />
                Simpan Kategori
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Daftar Kategori
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Kategori yang sudah dipakai dokumen tidak bisa dihapus dari
                database.
              </p>
            </div>

            {error ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-red-700">
                  Data kategori gagal dimuat.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((category) => (
                  <div key={category.id} className="p-5">
                    <form
                      action={updateCategoryAction}
                      className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_150px_auto_auto]"
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <input
                        name="name"
                        defaultValue={category.name}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                      />
                      <CategoryTypeSelect defaultValue={category.type} />
                      <div
                        className={`inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold ${categoryTypeStyles[category.type]}`}
                      >
                        {categoryTypeLabels[category.type]}
                      </div>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
                      >
                        <Save className="size-4" aria-hidden="true" />
                        Simpan
                      </button>
                    </form>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Dipakai oleh {usageMap[category.id] ?? 0} dokumen.
                      </p>
                      <form action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={category.id} />
                        <ConfirmSubmitButton
                          message={`Hapus kategori ${category.name}?`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-[#B9151B] transition hover:bg-red-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Hapus
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                ))}

                {rows.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Belum ada kategori.
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
