import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileUp,
  Paperclip,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CompressedAttachmentInput } from "@/components/CompressedAttachmentInput";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOutgoingLettersAction } from "../actions";
import { OutgoingRows } from "./OutgoingRows";

type NewOutgoingPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default async function NewOutgoingPage({
  searchParams,
}: NewOutgoingPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <LoadingLink
                href="/outgoing"
                pendingLabel="Kembali..."
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke surat keluar
              </LoadingLink>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Send className="size-3.5" aria-hidden="true" />
                Surat Keluar
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Tambah Surat Keluar
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Isi staff pengirim satu kali, lalu tambahkan beberapa tujuan
                surat sekaligus. Nomor surat boleh dikosongkan jika amplop tidak
                memiliki nomor. Semua teks otomatis disimpan dalam huruf kapital.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Format agenda
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                SK/YYYY/MM/0001
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
          action={createOutgoingLettersAction}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarClock className="size-4 text-slate-400" />
                  Tanggal kirim
                </span>
                <input
                  name="sent_at"
                  type="date"
                  required
                  defaultValue={toDateInputValue(new Date())}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <UserRound className="size-4 text-slate-400" />
                  Staff pengirim
                </span>
                <input
                  name="sender_staff"
                  type="text"
                  required
                  placeholder="Contoh: Sylvie"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 className="size-4 text-slate-400" />
                  Departemen pengirim
                </span>
                <select
                  name="sender_department"
                  required
                  defaultValue="GA"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  <option value="GA">General Affair (GA)</option>
                  <option value="HRM">Human Resource Management (HRM)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Catatan batch
                </span>
                <input
                  name="batch_notes"
                  type="text"
                  placeholder="Opsional, contoh: dikirim via kurir internal"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Daftar Surat Keluar
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tambahkan satu baris untuk setiap amplop atau surat yang akan
                  dikirim.
                </p>
              </div>
              <OutgoingRows />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">
                Cara penyimpanan
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Satu baris surat keluar akan menjadi satu record dengan nomor
                agenda SK sendiri, sehingga 10 amplop bisa diinput dalam satu
                proses.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Paperclip className="size-4 text-slate-400" />
                  Lampiran / foto amplop
                </span>
                <CompressedAttachmentInput
                  name="attachment"
                  kind="SK"
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
              pendingLabel="Menyimpan surat keluar..."
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan Surat Keluar
            </PendingSubmitButton>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500 shadow-sm">
              <div className="flex items-start gap-3">
                <FileUp className="mt-0.5 size-5 shrink-0 text-[#0A3A60]" />
                <p>
                  Jika nomor surat tidak ada, kosongkan saja. Sistem tetap
                  membuat nomor agenda SK otomatis.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </AppLayout>
  );
}
