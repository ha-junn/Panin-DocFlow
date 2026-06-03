import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Paperclip,
  Save,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CompressedAttachmentInput } from "@/components/CompressedAttachmentInput";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvoiceBatchAction } from "./actions";
import { InvoiceRows } from "./InvoiceRows";

type NewInvoicePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

type Department = {
  id: string;
  name: string;
  code: string;
};

type Category = {
  id: string;
  name: string;
  type: "INVOICE" | "BOTH";
};

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default async function NewInvoicePage({
  searchParams,
}: NewInvoicePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: departments }, { data: categories }, params] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code")
      .in("code", ["GA", "HRM"])
      .order("name", { ascending: true }),
    supabase
      .from("document_categories")
      .select("id, name, type")
      .in("type", ["INVOICE", "BOTH"])
      .order("name", { ascending: true }),
    searchParams,
  ]);

  const departmentOptions = (departments ?? []) as Department[];
  const categoryOptions = ((categories ?? []) as Category[]).filter(
    (category) => !category.name.toUpperCase().includes("BPKU"),
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <LoadingLink
                href="/"
                pendingLabel="Kembali..."
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke dashboard
              </LoadingLink>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D71920]/15 bg-[#D71920]/5 px-3 py-1 text-xs font-semibold text-[#B9151B]">
                <ClipboardList className="size-3.5" aria-hidden="true" />
                Invoice Masuk
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Tambah Invoice Masuk
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Isi vendor satu kali, lalu tambahkan nomor invoice atau nominal
                jika tersedia. Nomor invoice dan nominal boleh dikosongkan.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Format agenda
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                INV/YYYY/MM/0001
              </p>
            </div>
          </div>
        </section>

        {params.message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {params.message}
          </div>
        ) : null}

        <form
          action={createInvoiceBatchAction}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarClock className="size-4 text-slate-400" />
                  Tanggal diterima
                </span>
                <input
                  name="received_at"
                  type="date"
                  required
                  defaultValue={toDateInputValue(new Date())}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Vendor/pengirim
                </span>
                <input
                  name="vendor_name"
                  type="text"
                  required
                  placeholder="Contoh: PT Nata Surya Cemerlang"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Departemen tujuan
                </span>
                <select
                  name="department_id"
                  required
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  <option value="">Pilih departemen</option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Kategori invoice
                </span>
                <select
                  name="category_id"
                  required
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  <option value="">Pilih kategori invoice</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <UserRound className="size-4 text-slate-400" />
                  PIC/penerima internal
                </span>
                <input
                  name="internal_pic"
                  type="text"
                  required
                  placeholder="Nama PIC internal"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Daftar Invoice
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tambahkan rincian invoice jika tersedia. Baris boleh
                  dikosongkan dan tetap bisa disimpan.
                </p>
              </div>
              <InvoiceRows />

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">
                  Catatan
                </span>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Catatan umum untuk batch invoice ini"
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">
                Cara penyimpanan
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Satu baris invoice akan menjadi satu dokumen dengan nomor agenda
                sendiri, sehingga pencarian dan detail dokumen tetap rapi.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Paperclip className="size-4 text-slate-400" />
                  Lampiran
                </span>
                <CompressedAttachmentInput
                  name="attachment"
                  kind="INV"
                  tone="red"
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Foto dari HP otomatis dikompres menjadi WebP. PDF tetap
                diupload sebagai PDF. Maksimal 10 MB.
              </p>
            </div>

            <PendingSubmitButton
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D71920] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b9151b] focus:outline-none focus:ring-4 focus:ring-[#D71920]/20"
              pendingLabel="Menyimpan invoice..."
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan Invoice
            </PendingSubmitButton>
          </aside>
        </form>
      </div>
    </AppLayout>
  );
}
