import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LoadingLink } from "@/components/LoadingLink";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateDocumentAction } from "./actions";

type EditDocumentPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

type DbDocumentType = "LETTER" | "INVOICE";

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

type InvoiceDetail = {
  invoice_number: string | null;
  amount: number | null;
  internal_pic: string | null;
};

type EditableDocument = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  employee_name: string | null;
  amount: number | null;
  notes: string | null;
  letter_number: string | null;
  letter_date: string | null;
  category_id: string | null;
  department_id: string;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
};

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatAmountInput(value: number | null) {
  return value ? String(value) : "";
}

function getInvoiceDetail(details: EditableDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Surat";
}

export default async function EditDocumentPage({
  params,
  searchParams,
}: EditDocumentPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ id }, { message }] = await Promise.all([params, searchParams]);

  const [{ data: document }, { data: departments }, { data: categories }] =
    await Promise.all([
      supabase
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
          employee_name,
          amount,
          notes,
          letter_number,
          letter_date,
          category_id,
          department_id,
          invoice_details(invoice_number, amount, internal_pic)
        `,
        )
        .eq("id", id)
        .single(),
      supabase
        .from("departments")
        .select("id, name, code")
        .in("code", ["GA", "HRM"])
        .order("name", { ascending: true }),
      supabase
        .from("document_categories")
        .select("id, name, type")
        .in("type", ["LETTER", "INVOICE", "BOTH"])
        .order("name", { ascending: true }),
    ]);

  if (!document) {
    redirect("/");
  }

  const detail = document as unknown as EditableDocument;
  const departmentOptions = (departments ?? []) as Department[];
  const categoryOptions = ((categories ?? []) as Category[]).filter(
    (category) => category.type === "BOTH" || category.type === detail.type,
  );
  const invoiceDetail = getInvoiceDetail(detail.invoice_details);
  const isInvoice = detail.type === "INVOICE";
  const selectedCategory = categoryOptions.find(
    (category) => category.id === detail.category_id,
  );
  const isTransferNote =
    selectedCategory?.name.trim().toUpperCase() === "NOTA PEMINDAHAN";

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <LoadingLink
            href={`/documents/${detail.id}`}
            pendingLabel="Kembali..."
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke detail
          </LoadingLink>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  isInvoice
                    ? "border-[#D71920]/15 bg-[#D71920]/5 text-[#B9151B]"
                    : "border-[#0A3A60]/15 bg-[#0A3A60]/5 text-[#0A3A60]",
                ].join(" ")}
              >
                {isInvoice ? (
                  <ClipboardList className="size-3.5" aria-hidden="true" />
                ) : (
                  <FileText className="size-3.5" aria-hidden="true" />
                )}
                Edit {formatDocumentType(detail.type)}
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {detail.agenda_number}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Koreksi data dokumen dengan hati-hati. Perubahan akan tercatat
                otomatis di timeline aktivitas.
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
          action={updateDocumentAction}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
          <input type="hidden" name="document_id" value={detail.id} />
          <input type="hidden" name="document_type" value={detail.type} />

          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarClock className="size-4 text-slate-400" />
                  Tanggal dan waktu diterima
                </span>
                <input
                  name="received_at"
                  type="datetime-local"
                  required
                  defaultValue={toDatetimeLocalValue(detail.received_at)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Send className="size-4 text-slate-400" />
                  {isInvoice ? "Vendor/pengirim" : "Pengirim"}
                </span>
                <input
                  name="sender_name"
                  type="text"
                  required
                  defaultValue={detail.sender_name}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              {!isInvoice ? (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Nomor surat
                    </span>
                    <input
                      name="letter_number"
                      type="text"
                      defaultValue={detail.letter_number ?? ""}
                      placeholder="Opsional"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Tanggal surat
                    </span>
                    <input
                      name="letter_date"
                      type="date"
                      defaultValue={toDateInputValue(detail.letter_date)}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Nomor invoice
                    </span>
                    <input
                      name="invoice_number"
                      type="text"
                      defaultValue={invoiceDetail?.invoice_number ?? ""}
                      placeholder="Opsional"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#D71920] focus:bg-white focus:ring-4 focus:ring-[#D71920]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Nominal
                    </span>
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={invoiceDetail?.amount ?? ""}
                      placeholder="Opsional"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#D71920] focus:bg-white focus:ring-4 focus:ring-[#D71920]/10"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <UserRound className="size-4 text-slate-400" />
                  {isInvoice ? "PIC/penerima internal" : "Ditujukan kepada"}
                </span>
                <input
                  name="recipient_name"
                  type="text"
                  required
                  defaultValue={detail.recipient_name ?? ""}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Departemen tujuan
                </span>
                <select
                  name="department_id"
                  required
                  defaultValue={detail.department_id}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  {isInvoice ? "Kategori invoice" : "Kategori"}
                </span>
                <select
                  name="category_id"
                  required
                  defaultValue={detail.category_id ?? ""}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                >
                  <option value="">Pilih kategori</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Perihal
                </span>
                <input
                  name="subject"
                  type="text"
                  required
                  defaultValue={detail.subject}
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              {!isInvoice ? (
                <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {isTransferNote ? "Keterangan" : "Nama karyawan"}
                    </span>
                    <input
                      name="employee_name"
                      type="text"
                      defaultValue={detail.employee_name ?? ""}
                      placeholder={
                        isTransferNote ? "Keterangan pemindahan" : "Opsional"
                      }
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      {isTransferNote ? "Jumlah" : "Total"}
                    </span>
                    <input
                      name="document_amount"
                      type="text"
                      inputMode="numeric"
                      defaultValue={formatAmountInput(detail.amount)}
                      placeholder="Opsional, contoh: Rp 150.000"
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </label>
                </div>
              ) : null}

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Catatan
                </span>
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={detail.notes ?? ""}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">
                Simpan Perubahan
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Setelah disimpan, dashboard, daftar dokumen, daftar invoice,
                dan timeline akan diperbarui otomatis.
              </p>
            </div>

            {isInvoice ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-[#B9151B]">
                  Invoice opsional
                </p>
                <p className="mt-2 text-sm leading-6 text-red-700">
                  Nomor invoice dan nominal boleh dikosongkan jika dokumen yang
                  diterima belum mencantumkan detail tersebut.
                </p>
              </div>
            ) : null}

            <PendingSubmitButton
              className={[
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4",
                isInvoice
                  ? "bg-[#D71920] hover:bg-[#b9151b] focus:ring-[#D71920]/20"
                  : "bg-[#0A3A60] hover:bg-[#082f4f] focus:ring-[#0A3A60]/20",
              ].join(" ")}
              pendingLabel="Menyimpan..."
            >
              <Save className="size-4" aria-hidden="true" />
              Simpan Perubahan
            </PendingSubmitButton>
          </aside>
        </form>
      </div>
    </AppLayout>
  );
}
