import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  Paperclip,
  Save,
  Send,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CompressedAttachmentInput } from "@/components/CompressedAttachmentInput";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLetterAction } from "./actions";
import { DocumentQuickFields } from "./DocumentQuickFields";
import { EmployeeRows } from "./EmployeeRows";
import { TransferNoteRows } from "./TransferNoteRows";

type NewDocumentPageProps = {
  searchParams: Promise<{
    message?: string;
    type?: string;
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
  type: "LETTER" | "INVOICE" | "BOTH";
};

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default async function NewDocumentPage({
  searchParams,
}: NewDocumentPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: departments }, { data: categories }, params] =
    await Promise.all([
      supabase
        .from("departments")
        .select("id, name, code")
        .in("code", ["GA", "HRM"])
        .order("name", { ascending: true }),
      supabase
        .from("document_categories")
        .select("id, name, type")
        .in("type", ["LETTER", "BOTH"])
        .order("name", { ascending: true }),
      searchParams,
    ]);

  const message = params.message;
  const isLetter = params.type !== "invoice";

  if (!isLetter) {
    redirect("/documents/new?type=letter");
  }

  const departmentOptions = (departments ?? []) as Department[];
  const categoryOptions = (categories ?? []) as Category[];
  const now = new Date();

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <LoadingLink
                  href="/"
                  pendingLabel="Kembali..."
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Kembali ke dashboard
                </LoadingLink>
                <LoadingLink
                  href="/invoices/new"
                  pendingLabel="Membuka invoice..."
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-[#D71920]/20 bg-[#D71920]/5 px-3 text-xs font-semibold text-[#B9151B] transition hover:border-[#D71920]/30 hover:bg-[#D71920]/10"
                >
                  <ClipboardList className="size-3.5" aria-hidden="true" />
                  Tambah Invoice
                </LoadingLink>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <FileText className="size-3.5" aria-hidden="true" />
                Dokumen
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Tambah Dokumen
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Nomor agenda akan dibuat otomatis oleh database setelah surat
                disimpan.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Format agenda
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                SM/YYYY/MM/0001
              </p>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {message}
          </div>
        ) : null}

        <form
          action={createLetterAction}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                  defaultValue={toDateInputValue(now)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Tanggal surat
                </span>
                <input
                  name="letter_date"
                  type="date"
                  defaultValue={toDateInputValue(now)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Send className="size-4 text-slate-400" />
                  Pengirim
                </span>
                <input
                  name="sender_name"
                  type="text"
                  required
                  placeholder="Nama pengirim"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <DocumentQuickFields
                departments={departmentOptions}
                categories={categoryOptions}
              />

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Perihal
                </span>
                <input
                  name="subject"
                  type="text"
                  placeholder="Opsional"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <div className="md:col-span-2">
                <PendingSubmitButton
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] focus:outline-none focus:ring-4 focus:ring-[#0A3A60]/20"
                  pendingLabel="Menyimpan surat..."
                >
                  <Save className="size-4" aria-hidden="true" />
                  Simpan Surat
                </PendingSubmitButton>
              </div>

              <div className="md:col-span-2 rounded-xl border border-[#0A3A60]/20 bg-[#0A3A60]/5 p-4">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-950">
                      Daftar karyawan BPKU
                    </h2>
                    <span className="rounded-full bg-[#0A3A60]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0A3A60]">
                      Khusus kategori BPKU
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Opsional. Gunakan untuk BPKU, lembur, transport, atau
                    dokumen lain yang berisi beberapa nama karyawan.
                  </p>
                </div>
                <EmployeeRows />
              </div>

              <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-950">
                      Nota Pemindahan
                    </h2>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                      Khusus kategori Nota Pemindahan
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Isi satu baris untuk setiap keterangan pemindahan beserta
                    jumlahnya.
                  </p>
                </div>
                <TransferNoteRows />
              </div>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Catatan
                </span>
                <textarea
                  name="notes"
                  rows={5}
                  placeholder="Catatan tambahan jika ada"
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Paperclip className="size-4 text-slate-400" />
                  Lampiran
                </span>
                <CompressedAttachmentInput
                  name="attachment"
                  kind="DOC"
                  tone="blue"
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Foto dari HP otomatis dikompres menjadi WebP. PDF tetap
                diupload sebagai PDF. Maksimal 10 MB.
              </p>
            </div>

            <PendingSubmitButton
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] focus:outline-none focus:ring-4 focus:ring-[#0A3A60]/20"
              pendingLabel="Menyimpan surat..."
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan Surat
            </PendingSubmitButton>
          </aside>
        </form>
      </div>
    </AppLayout>
  );
}
