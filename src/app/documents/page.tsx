import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  FilePlus2,
  FileText,
  Inbox,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbDocumentType = "LETTER" | "INVOICE";

type RawDocument = {
  id: string;
  agenda_number: string;
  type: "LETTER";
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  creator: { full_name: string } | null;
};

const typeStyles: Record<DbDocumentType, string> = {
  LETTER: "bg-[#0A3A60] text-white",
  INVOICE: "bg-[#D71920] text-white",
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Dokumen";
}

export default async function DocumentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documents, error } = await supabase
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
      creator:profiles!documents_created_by_fkey(full_name)
    `,
    )
    .eq("type", "LETTER")
    .order("received_at", { ascending: false })
    .limit(100);

  const rows = (documents ?? []) as unknown as RawDocument[];

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Inbox className="size-3.5" aria-hidden="true" />
                Dokumen Operasional
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Semua Dokumen
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Pantau dokumen masuk dengan pencarian cepat, filter terpusat,
                dan akses langsung ke halaman detail.
              </p>
            </div>

            <Link
              href="/documents/new?type=letter"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              Tambah Surat
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Hasil tampil
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
              {rows.length}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Daftar dokumen terbaru
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Gunakan menu Pencarian untuk filter kategori, departemen,
                tanggal, dan PIC.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <Inbox className="size-4" aria-hidden="true" />
              Buka Pencarian
            </Link>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Data dokumen gagal dimuat.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cek koneksi Supabase dan policy database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
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
                      Perihal
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
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((document) => (
                        <tr
                          key={document.id}
                          className="group transition hover:bg-slate-50/80"
                        >
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="text-sm font-semibold text-slate-950">
                              {document.agenda_number}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Dibuat oleh {document.creator?.full_name ?? "-"}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <span
                              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${typeStyles[document.type]}`}
                            >
                              {formatDocumentType(document.type)}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(document.received_at)}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-900">
                            {document.sender_name}
                          </td>
                          <td className="max-w-sm border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            <span className="line-clamp-2">
                              {document.subject}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.department?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.category?.name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                            {document.recipient_name ?? "-"}
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right">
                            <Link
                              href={`/documents/${document.id}`}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                            >
                              Detail
                              <ArrowUpRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-14 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <FileText className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          Tidak ada dokumen yang cocok
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Coba ubah kata kunci atau filter yang dipilih.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
