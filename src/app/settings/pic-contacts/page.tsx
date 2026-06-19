import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ContactRound,
  DatabaseBackup,
  DatabaseZap,
  Layers3,
  MessageCircle,
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
  createPicContactAction,
  deletePicContactAction,
  updatePicContactAction,
} from "./actions";

type PicContactsPageProps = {
  searchParams: Promise<{ message?: string }>;
};

type PicContact = {
  id: string;
  name: string;
  whatsapp_number: string;
  department: string | null;
  active: boolean;
};

function formatWhatsappNumber(value: string) {
  return value.startsWith("62") ? `+${value}` : value;
}

export default async function PicContactsSettingsPage({
  searchParams,
}: PicContactsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ message }, { data, error }] = await Promise.all([
    searchParams,
    supabase
      .from("pic_contacts")
      .select("id, name, whatsapp_number, department, active")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
  ]);
  const rows = (data ?? []) as PicContact[];

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
                Master PIC & WhatsApp
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Simpan nomor WhatsApp PIC agar link tanda terima harian dapat
                dikirim dengan pesan otomatis. Untuk surat keluar, tambahkan
                semua petugas shift dan pilih unit Ekspedisi atau Mailing Room.
              </p>
            </div>

            <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1">
              <LoadingLink
                href="/settings/departments"
                pendingLabel="Membuka..."
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0A3A60]"
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
                className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#0A3A60] shadow-sm"
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

        <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <form
            action={createPicContactAction}
            className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#168A40]">
                <MessageCircle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Tambah PIC
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Satu petugas dibuat satu kali dengan nomor WhatsApp masing-masing.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Nama PIC
                </span>
                <input
                  name="name"
                  required
                  placeholder="Contoh: SHINTA HASAN RALDI"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Nomor WhatsApp
                </span>
                <input
                  name="whatsapp_number"
                  required
                  inputMode="tel"
                  placeholder="081234567890"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#25D366] focus:bg-white focus:ring-4 focus:ring-[#25D366]/10"
                />
                <span className="mt-2 block text-xs text-slate-400">
                  Nomor 08 otomatis diubah menjadi format Indonesia +62.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Digunakan untuk
                </span>
                <select
                  name="department"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                  defaultValue=""
                >
                  <option value="">Dokumen / Invoice Masuk</option>
                  <option value="Ekspedisi" />
                  <option value="Mailing Room" />
                </select>
                <span className="mt-2 block text-xs leading-5 text-slate-400">
                  Pilih unit pengiriman agar PIC tersedia pada tanda terima
                  surat keluar.
                </span>
              </label>

              <PendingSubmitButton
                pendingLabel="Menyimpan..."
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
              >
                <Plus className="size-4" aria-hidden="true" />
                Simpan PIC
              </PendingSubmitButton>
            </div>
          </form>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Daftar PIC & Nomor WhatsApp
              </p>
              <p className="mt-1 text-sm text-slate-500">
                PIC aktif dikelompokkan berdasarkan unit dan dapat dipilih
                sesuai petugas shift yang sedang bekerja.
              </p>
            </div>

            {error ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-red-700">
                  Master PIC belum aktif.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Jalankan file supabase-add-pic-contacts.sql di Supabase SQL
                  Editor.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((contact) => (
                  <div key={contact.id} className="p-5">
                    <form
                      action={updatePicContactAction}
                      className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_170px_minmax(140px,1fr)_90px_auto]"
                    >
                      <input type="hidden" name="id" value={contact.id} />
                      <input
                        name="name"
                        defaultValue={contact.name}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                      />
                      <input
                        name="whatsapp_number"
                        defaultValue={formatWhatsappNumber(
                          contact.whatsapp_number,
                        )}
                        inputMode="tel"
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#25D366] focus:bg-white focus:ring-4 focus:ring-[#25D366]/10"
                      />
                      <select
                        name="department"
                        defaultValue={contact.department ?? ""}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                      >
                        <option value="">Dokumen / Invoice</option>
                        <option value="Ekspedisi">Ekspedisi</option>
                        <option value="Mailing Room">Mailing Room</option>
                        {contact.department &&
                        !["Ekspedisi", "Mailing Room"].includes(
                          contact.department,
                        ) ? (
                          <option value={contact.department}>
                            {contact.department}
                          </option>
                        ) : null}
                      </select>
                      <label className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={contact.active}
                          className="size-4 accent-[#0A3A60]"
                        />
                        Aktif
                      </label>
                      <PendingSubmitButton
                        pendingLabel="Menyimpan..."
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white"
                      >
                        <Save className="size-4" aria-hidden="true" />
                        Simpan
                      </PendingSubmitButton>
                    </form>

                    <form action={deletePicContactAction} className="mt-3">
                      <input type="hidden" name="id" value={contact.id} />
                      <ConfirmSubmitButton
                        message={`Hapus PIC ${contact.name}?`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-[#B9151B] transition hover:bg-red-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Hapus
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                ))}

                {rows.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Belum ada PIC. Tambahkan nama dan nomor WhatsApp di form.
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
