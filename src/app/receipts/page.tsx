import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Files,
  Inbox,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import {
  createBatchReceiptAction,
  createOutgoingBatchReceiptAction,
} from "@/app/receipts/actions";
import { AppLayout } from "@/components/AppLayout";
import { CopyReceiptLinkButton } from "@/components/CopyReceiptLinkButton";
import { LoadingLink } from "@/components/LoadingLink";
import { PaginationControls } from "@/components/PaginationControls";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { WhatsappReceiptButton } from "@/components/WhatsappReceiptButton";
import {
  fetchDocumentReceiptStatusMap,
  fetchOutgoingReceiptStatusMap,
  matchesReceiptFilter,
  type ReceiptFilter,
  type ReceiptStatusSummary,
} from "@/lib/receipts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReceiptsPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    type?: string;
    message?: string;
    batch_created?: string;
    batch_recipient?: string;
    batch_date?: string;
    batch_count?: string;
    outgoing_batch_created?: string;
    outgoing_batch_recipient?: string;
    outgoing_batch_section?: string;
    outgoing_batch_date?: string;
    outgoing_batch_count?: string;
    receipt_mode?: string;
  }>;
};

type ReceiptItemType = "DOCUMENT" | "INVOICE" | "OUTGOING";
type ReceiptMode = "incoming" | "outgoing";

type RawDocument = {
  id: string;
  agenda_number: string;
  type: "LETTER" | "INVOICE";
  received_at: string;
  created_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string | null;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details:
    | {
        invoice_number: string | null;
        amount: number | null;
        internal_pic: string | null;
      }
    | {
        invoice_number: string | null;
        amount: number | null;
        internal_pic: string | null;
      }[]
    | null;
};

type RawOutgoingLetter = {
  id: string;
  agenda_number: string;
  sent_at: string;
  created_at: string;
  sender_staff: string;
  sender_department: "GA" | "HRM";
  letter_number: string | null;
  destination_name: string;
  attention_to: string | null;
  confidential: boolean;
};

type ReceiptListItem = {
  id: string;
  type: ReceiptItemType;
  typeLabel: string;
  agendaNumber: string;
  date: string;
  sortDate: string;
  sender: string;
  recipient: string;
  department: string;
  category: string;
  description: string;
  href: string;
  batchRecipient?: string;
  batchUnit?: string;
  receipt?: ReceiptStatusSummary;
};

type BatchReceiptGroup = {
  recipient: string;
  unit: string;
  items: ReceiptListItem[];
};

type PicContact = {
  id: string;
  name: string;
  whatsapp_number: string;
  department: string | null;
  active: boolean;
};

type DailyBatchReceiptSection = {
  dateKey: string;
  dateLabel: string;
  groups: BatchReceiptGroup[];
};

type DailyOutgoingReceiptSection = {
  dateKey: string;
  dateLabel: string;
  items: ReceiptListItem[];
};

const PAGE_SIZE = 20;
const MAX_ROWS_PER_SOURCE = 700;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const validTypeFilters = new Set(["DOCUMENT", "INVOICE", "OUTGOING"]);
const outgoingDeliverySections = [
  {
    name: "Ekspedisi",
    description: "Penyerahan ke petugas ekspedisi atau kurir.",
    icon: Truck,
    cardClass: "border-orange-200 bg-orange-50/60",
    iconClass: "bg-orange-600 text-white",
    buttonClass: "bg-orange-600 hover:bg-orange-700",
    accentClass: "accent-orange-600",
  },
  {
    name: "Mailing Room",
    description: "Penyerahan ke petugas mailing room.",
    icon: Warehouse,
    cardClass: "border-sky-200 bg-sky-50/60",
    iconClass: "bg-sky-700 text-white",
    buttonClass: "bg-sky-700 hover:bg-sky-800",
    accentClass: "accent-sky-700",
  },
] as const;

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSearch(value: string | undefined) {
  return String(value ?? "").replace(/[,%]/g, " ").trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function getDeliveryPicContacts(
  contacts: PicContact[],
  deliverySection: string,
) {
  const normalizedSection = normalizeText(deliverySection);

  return contacts
    .filter(
      (contact) =>
        normalizeText(contact.department ?? "") === normalizedSection ||
        normalizeText(contact.name) === normalizedSection,
    )
    .sort((first, second) => first.name.localeCompare(second.name, "id-ID"));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function getInvoiceDetail(document: RawDocument) {
  return Array.isArray(document.invoice_details)
    ? document.invoice_details[0]
    : document.invoice_details;
}

function getPageHref({
  page,
  q,
  status,
  type,
  mode,
}: {
  page: number;
  q: string;
  status: ReceiptFilter;
  type: ReceiptItemType | "";
  mode: ReceiptMode;
}) {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (status) {
    params.set("status", status);
  }

  if (type) {
    params.set("type", type);
  }

  if (mode === "outgoing") {
    params.set("receipt_mode", "outgoing");
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/receipts?${queryString}` : "/receipts";
}

function getTypeBadgeClass(type: ReceiptItemType) {
  if (type === "INVOICE") {
    return "bg-red-600 text-white";
  }

  if (type === "OUTGOING") {
    return "bg-sky-100 text-[#0A3A60]";
  }

  return "bg-[#0A3A60] text-white";
}

function ReceiptStatusPill({
  receipt,
}: {
  receipt: ReceiptStatusSummary | undefined;
}) {
  if (receipt?.status === "CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Sudah diterima
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
      <Clock3 className="size-3.5" aria-hidden="true" />
      Belum diterima
    </span>
  );
}

function buildDocumentItems(
  documents: RawDocument[],
  receiptStatusMap: Map<string, ReceiptStatusSummary>,
): ReceiptListItem[] {
  return documents.map((document) => {
    const invoiceDetail = getInvoiceDetail(document);
    const isInvoice = document.type === "INVOICE";
    const recipient = isInvoice
      ? invoiceDetail?.internal_pic || document.recipient_name || "-"
      : document.recipient_name || "-";
    const description = isInvoice
      ? [
          invoiceDetail?.invoice_number
            ? `Invoice ${invoiceDetail.invoice_number}`
            : "Invoice masuk",
          document.subject,
        ]
          .filter(Boolean)
          .join(" - ")
      : document.subject || "Tanpa perihal";

    return {
      id: document.id,
      type: isInvoice ? "INVOICE" : "DOCUMENT",
      typeLabel: isInvoice ? "Invoice" : "Dokumen",
      agendaNumber: document.agenda_number,
      date: document.received_at,
      sortDate: document.created_at || document.received_at,
      sender: document.sender_name,
      recipient,
      department: document.department?.name ?? "-",
      category: document.category?.name ?? (isInvoice ? "Vendor" : "-"),
      description,
      href: isInvoice ? `/invoices/${document.id}` : `/documents/${document.id}`,
      receipt: receiptStatusMap.get(document.id),
    };
  });
}

function buildOutgoingItems(
  outgoingLetters: RawOutgoingLetter[],
  receiptStatusMap: Map<string, ReceiptStatusSummary>,
): ReceiptListItem[] {
  return outgoingLetters.map((letter) => ({
    id: letter.id,
    type: "OUTGOING",
    typeLabel: "Surat Keluar",
    agendaNumber: letter.agenda_number,
    date: letter.sent_at,
    sortDate: letter.created_at || letter.sent_at,
    sender: letter.sender_staff,
    recipient: letter.destination_name,
    department: letter.sender_department,
    category: letter.confidential ? "Confidential" : "Umum",
    description: letter.attention_to ? `u.p. ${letter.attention_to}` : "-",
    href: `/outgoing/${letter.id}`,
    batchRecipient: letter.attention_to || letter.destination_name,
    batchUnit: letter.destination_name,
    receipt: receiptStatusMap.get(letter.id),
  }));
}

function itemMatchesKeyword(item: ReceiptListItem, keyword: string) {
  if (!keyword) {
    return true;
  }

  const haystack = normalizeText(
    [
      item.agendaNumber,
      item.typeLabel,
      item.sender,
      item.recipient,
      item.department,
      item.category,
      item.description,
    ].join(" "),
  );

  return haystack.includes(normalizeText(keyword));
}

function buildDailyBatchReceiptSections(items: ReceiptListItem[]) {
  const dailyGroups = new Map<string, Map<string, BatchReceiptGroup>>();

  for (const item of items) {
    if (
      item.type === "OUTGOING" ||
      item.receipt ||
      !item.recipient ||
      item.recipient === "-"
    ) {
      continue;
    }

    const dateKey = getDateKey(item.date);
    const recipientKey = normalizeText(item.recipient);
    const groupsForDate =
      dailyGroups.get(dateKey) ?? new Map<string, BatchReceiptGroup>();
    const existing = groupsForDate.get(recipientKey);

    if (existing) {
      existing.items.push(item);
      if (!existing.unit.includes(item.department)) {
        existing.unit = "Beberapa departemen";
      }
      continue;
    }

    groupsForDate.set(recipientKey, {
      recipient: item.recipient,
      unit: item.department,
      items: [item],
    });
    dailyGroups.set(dateKey, groupsForDate);
  }

  return Array.from(dailyGroups.entries())
    .map(([dateKey, groups]): DailyBatchReceiptSection => ({
      dateKey,
      dateLabel: formatDate(dateKey),
      groups: Array.from(groups.values())
        .sort(
          (first, second) =>
            second.items.length - first.items.length ||
            first.recipient.localeCompare(second.recipient, "id"),
        ),
    }))
    .filter((section) => section.groups.length > 0)
    .sort((first, second) => second.dateKey.localeCompare(first.dateKey));
}

function buildOutgoingDailyBatchReceiptSections(items: ReceiptListItem[]) {
  const dailyItems = new Map<string, ReceiptListItem[]>();

  for (const item of items) {
    if (item.type !== "OUTGOING" || item.receipt) {
      continue;
    }

    const dateKey = getDateKey(item.date);
    const itemsForDate = dailyItems.get(dateKey) ?? [];
    itemsForDate.push(item);
    dailyItems.set(dateKey, itemsForDate);
  }

  return Array.from(dailyItems.entries())
    .map(([dateKey, outgoingItems]): DailyOutgoingReceiptSection => ({
      dateKey,
      dateLabel: formatDate(dateKey),
      items: outgoingItems.sort(
        (first, second) =>
          new Date(second.sortDate).getTime() -
          new Date(first.sortDate).getTime(),
      ),
    }))
    .sort((first, second) => second.dateKey.localeCompare(first.dateKey));
}

export default async function ReceiptsPage({
  searchParams,
}: ReceiptsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const keyword = normalizeSearch(params.q);
  const status = params.status === "pending" || params.status === "confirmed"
    ? params.status
    : "";
  const type = validTypeFilters.has(String(params.type))
    ? (String(params.type) as ReceiptItemType)
    : "";
  const currentPage = parsePage(params.page);
  const receiptMode: ReceiptMode =
    params.receipt_mode === "outgoing" ? "outgoing" : "incoming";

  const [documentsResult, outgoingResult, picContactsResult] = await Promise.all([
    supabase
      .from("documents")
      .select(
        `
          id,
          agenda_number,
          type,
          received_at,
          created_at,
          sender_name,
          recipient_name,
          subject,
          department:departments(name, code),
          category:document_categories(name),
          invoice_details(invoice_number, amount, internal_pic)
        `,
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS_PER_SOURCE),
    supabase
      .from("outgoing_letters")
      .select(
        "id, agenda_number, sent_at, created_at, sender_staff, sender_department, letter_number, destination_name, attention_to, confidential",
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS_PER_SOURCE),
    supabase
      .from("pic_contacts")
      .select("id, name, whatsapp_number, department, active")
      .eq("active", true),
  ]);

  const documents = (documentsResult.data ?? []) as unknown as RawDocument[];
  const outgoingLetters = (outgoingResult.data ?? []) as RawOutgoingLetter[];
  const picContacts = (picContactsResult.data ?? []) as PicContact[];
  const picContactMap = new Map(
    picContacts.map((contact) => [
      normalizeText(contact.name),
      contact.whatsapp_number,
    ]),
  );

  const [documentReceiptMap, outgoingReceiptMap] = await Promise.all([
    fetchDocumentReceiptStatusMap(
      supabase,
      documents.map((document) => document.id),
    ),
    fetchOutgoingReceiptStatusMap(
      supabase,
      outgoingLetters.map((letter) => letter.id),
    ),
  ]);

  const allItems = [
    ...buildDocumentItems(documents, documentReceiptMap),
    ...buildOutgoingItems(outgoingLetters, outgoingReceiptMap),
  ].sort(
    (first, second) =>
      new Date(second.sortDate).getTime() - new Date(first.sortDate).getTime(),
  );
  const dailyBatchReceiptSections = buildDailyBatchReceiptSections(allItems);
  const outgoingDailyBatchSections =
    buildOutgoingDailyBatchReceiptSections(allItems);

  const baseFilteredItems = allItems.filter(
    (item) =>
      (type ? item.type === type : true) && itemMatchesKeyword(item, keyword),
  );
  const confirmedCount = baseFilteredItems.filter(
    (item) => item.receipt?.status === "CONFIRMED",
  ).length;
  const filteredItems = baseFilteredItems.filter((item) =>
    matchesReceiptFilter(item.receipt, status),
  );

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (totalItems > 0 && currentPage > totalPages) {
    redirect(
      getPageHref({
        page: totalPages,
        q: keyword,
        status,
        type,
        mode: receiptMode,
      }),
    );
  }

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const from = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(from, from + PAGE_SIZE);
  const previousHref =
    safeCurrentPage > 1
      ? getPageHref({
          page: safeCurrentPage - 1,
          q: keyword,
          status,
          type,
          mode: receiptMode,
        })
      : null;
  const nextHref =
    safeCurrentPage < totalPages
      ? getPageHref({
          page: safeCurrentPage + 1,
          q: keyword,
          status,
          type,
          mode: receiptMode,
        })
      : null;
  const hasActiveFilter = Boolean(keyword || status || type);
  const hasQueryError = documentsResult.error || outgoingResult.error;
  const createdBatchToken = String(params.batch_created ?? "").trim();
  const createdBatchRecipient = String(params.batch_recipient ?? "").trim();
  const createdBatchDate = String(params.batch_date ?? "").trim();
  const createdBatchCount = Math.max(
    1,
    Number.parseInt(String(params.batch_count ?? "1"), 10) || 1,
  );
  const createdBatchPhone = picContactMap.get(
    normalizeText(createdBatchRecipient),
  );
  const outgoingBatchToken = String(params.outgoing_batch_created ?? "").trim();
  const outgoingBatchRecipient = String(
    params.outgoing_batch_recipient ?? "",
  ).trim();
  const outgoingBatchDate = String(params.outgoing_batch_date ?? "").trim();
  const outgoingBatchCount = Math.max(
    1,
    Number.parseInt(String(params.outgoing_batch_count ?? "1"), 10) || 1,
  );
  const outgoingBatchPhone = picContactMap.get(
    normalizeText(outgoingBatchRecipient),
  );
  const hasCreatedReceipt = Boolean(createdBatchToken || outgoingBatchToken);
  const message = String(params.message ?? "").trim();

  return (
    <AppLayout>
      <div className="space-y-6">
        <nav
          aria-label="Jenis tanda terima harian"
          className="grid gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm sm:grid-cols-2"
        >
          <LoadingLink
            href="/receipts"
            pendingLabel="Membuka dokumen masuk..."
            className={[
              "flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 transition",
              receiptMode === "incoming"
                ? "bg-white text-[#0A3A60] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:bg-white/70 hover:text-[#0A3A60]",
            ].join(" ")}
          >
            <span
              className={[
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                receiptMode === "incoming"
                  ? "bg-[#0A3A60] text-white"
                  : "bg-slate-200 text-slate-500",
              ].join(" ")}
            >
              <Inbox className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">
                Dokumen Masuk & Invoice
              </span>
              <span className="mt-0.5 block text-xs opacity-75">
                Tanda terima internal per PIC
              </span>
            </span>
          </LoadingLink>
          <LoadingLink
            href="/receipts?receipt_mode=outgoing"
            pendingLabel="Membuka surat keluar..."
            className={[
              "flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 transition",
              receiptMode === "outgoing"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-orange-50 hover:text-orange-700",
            ].join(" ")}
          >
            <span
              className={[
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                receiptMode === "outgoing"
                  ? "bg-white/20 text-white"
                  : "bg-orange-100 text-orange-600",
              ].join(" ")}
            >
              <Send className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Surat Keluar</span>
              <span className="mt-0.5 block text-xs opacity-75">
                Tanda terima pengiriman per tujuan
              </span>
            </span>
          </LoadingLink>
        </nav>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <ReceiptText className="size-3.5" aria-hidden="true" />
                Tanda Terima Digital
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
                Daftar Tanda Terima
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Pantau semua dokumen, invoice, dan surat keluar yang belum
                diterima atau sudah diterima dalam satu halaman.
              </p>
            </div>
            <LoadingLink
              href="/receipts/export"
              pendingLabel="Menyiapkan..."
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0A3A60]/20 bg-white px-4 text-sm font-semibold text-[#0A3A60] shadow-sm transition hover:border-[#0A3A60]/40 hover:bg-slate-50"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
              Export Tanda Terima
            </LoadingLink>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Total tampil
            </p>
            <p className="mt-3 text-3xl font-bold tracking-normal text-slate-950">
              {baseFilteredItems.length}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Sudah diterima
            </p>
            <p className="mt-3 text-3xl font-bold tracking-normal text-emerald-700">
              {confirmedCount}
            </p>
          </div>
        </section>

        {hasQueryError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            Data tanda terima belum bisa dimuat lengkap. Pastikan tabel dokumen,
            invoice, surat keluar, dan receipt_requests tersedia di Supabase.
          </div>
        ) : null}

        {message ? (
          <div
            className={[
              "rounded-lg border px-5 py-4 text-sm font-semibold",
              hasCreatedReceipt
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800",
            ].join(" ")}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{message}</span>
              {createdBatchToken ? (
                <div className="flex flex-wrap gap-2">
                  <CopyReceiptLinkButton
                    href={`/receipt-batch/${createdBatchToken}`}
                    compact
                  />
                  {createdBatchPhone && createdBatchRecipient ? (
                    <WhatsappReceiptButton
                      phoneNumber={createdBatchPhone}
                      recipientName={createdBatchRecipient}
                      receiptDate={
                        createdBatchDate
                          ? formatDate(createdBatchDate)
                          : "hari ini"
                      }
                      itemCount={createdBatchCount}
                      href={`/receipt-batch/${createdBatchToken}`}
                      compact
                    />
                  ) : (
                    <LoadingLink
                      href="/settings/pic-contacts"
                      pendingLabel="Membuka..."
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800"
                    >
                      Tambahkan nomor PIC
                    </LoadingLink>
                  )}
                </div>
              ) : outgoingBatchToken ? (
                <div className="flex flex-wrap gap-2">
                  <CopyReceiptLinkButton
                    href={`/receipt-outgoing-batch/${outgoingBatchToken}`}
                    compact
                  />
                  {outgoingBatchPhone && outgoingBatchRecipient ? (
                    <WhatsappReceiptButton
                      phoneNumber={outgoingBatchPhone}
                      recipientName={outgoingBatchRecipient}
                      receiptDate={
                        outgoingBatchDate
                          ? formatDate(outgoingBatchDate)
                          : "hari ini"
                      }
                      itemCount={outgoingBatchCount}
                      itemLabel="surat keluar"
                      href={`/receipt-outgoing-batch/${outgoingBatchToken}`}
                      compact
                    />
                  ) : (
                    <LoadingLink
                      href="/settings/pic-contacts"
                      pendingLabel="Membuka..."
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800"
                    >
                      Tambahkan nomor penerima
                    </LoadingLink>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <section
          className={[
            "rounded-lg border border-slate-200 bg-white p-5 shadow-sm",
            receiptMode === "incoming" ? "block" : "hidden",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3A60]/10 text-[#0A3A60]">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Tanda Terima Harian per PIC
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Semua PIC ditampilkan, termasuk yang hanya memiliki satu item.
                Dokumen tetap dipisahkan berdasarkan tanggal penerimaan.
              </p>
            </div>
          </div>

          {dailyBatchReceiptSections.length > 0 ? (
            <div className="mt-5 space-y-5">
              {dailyBatchReceiptSections.map((section, sectionIndex) => (
                <div
                  key={section.dateKey}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70"
                >
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-[#0A3A60] text-white shadow-sm">
                        <CalendarDays className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Tanggal penerimaan
                        </p>
                        <h3 className="mt-0.5 font-semibold text-slate-950">
                          {section.dateLabel}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={[
                        "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                        sectionIndex === 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {section.groups.length} PIC tersedia
                    </span>
                  </div>

                  <div className="grid gap-3 p-3 lg:grid-cols-2">
                    {section.groups.map((group) => (
                      <details
                        key={`${section.dateKey}-${normalizeText(group.recipient)}`}
                        className="group h-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm open:border-[#0A3A60]/30"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {group.recipient}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {group.items.length} item pada tanggal ini
                            </p>
                            <p
                              className={[
                                "mt-1 text-xs font-medium",
                                picContactMap.has(normalizeText(group.recipient))
                                  ? "text-emerald-600"
                                  : "text-amber-600",
                              ].join(" ")}
                            >
                              {picContactMap.has(normalizeText(group.recipient))
                                ? "Nomor WhatsApp tersedia"
                                : "Nomor WhatsApp belum diatur"}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#0A3A60] px-3 py-1 text-xs font-semibold text-white">
                            Buka
                          </span>
                        </summary>

                        <form
                          action={createBatchReceiptAction}
                          className="border-t border-slate-200 bg-slate-50/70 p-4"
                        >
                          <input
                            type="hidden"
                            name="recipient_name"
                            value={group.recipient}
                          />
                          <input
                            type="hidden"
                            name="recipient_unit"
                            value={group.unit}
                          />
                          <input
                            type="hidden"
                            name="batch_date"
                            value={section.dateKey}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value="/receipts"
                          />

                          <div className="grid gap-2">
                            {group.items.map((item) => (
                              <label
                                key={`${item.type}-${item.id}`}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-[#0A3A60]/30"
                              >
                                <input
                                  type="checkbox"
                                  name="document_ids"
                                  value={item.id}
                                  defaultChecked
                                  className="mt-0.5 size-4 accent-[#0A3A60]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-slate-950">
                                      {item.agendaNumber}
                                    </span>
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                      {item.typeLabel}
                                    </span>
                                  </span>
                                  <span className="mt-1 block truncate text-sm text-slate-500">
                                    {item.sender} · {item.description}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-[#0A3A60]">
                            <CalendarDays
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                            Hanya untuk {section.dateLabel}
                          </div>

                          <PendingSubmitButton
                            pendingLabel="Membuat tanda terima..."
                            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082F4D]"
                          >
                            <Files className="size-4" aria-hidden="true" />
                            {picContactMap.has(normalizeText(group.recipient))
                              ? "Buat & Siapkan WhatsApp"
                              : "Buat Tanda Terima Harian"}
                          </PendingSubmitButton>
                          {!picContactMap.has(
                            normalizeText(group.recipient),
                          ) ? (
                            <LoadingLink
                              href="/settings/pic-contacts"
                              pendingLabel="Membuka..."
                              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:text-[#0A3A60]"
                            >
                              Atur nomor WhatsApp PIC
                            </LoadingLink>
                          ) : null}
                        </form>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Belum ada PIC dengan dokumen atau invoice yang siap dibuatkan
              tanda terima harian.
            </div>
          )}
        </section>

        <section
          className={[
            "overflow-hidden rounded-xl border border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_52%,#fffbeb_100%)] shadow-sm",
            receiptMode === "outgoing" ? "block" : "hidden",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 border-b border-orange-200 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
                <Send className="size-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950">
                    Tanda Terima Surat Keluar Harian
                  </h2>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
                    Pengiriman
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Pilih bagian Ekspedisi atau Mailing Room, lalu centang surat
                  mana saja yang diserahkan pada tanggal tersebut.
                </p>
              </div>
            </div>
            <LoadingLink
              href="/outgoing/new"
              pendingLabel="Membuka..."
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
            >
              Tambah Surat Keluar
            </LoadingLink>
          </div>

          {outgoingDailyBatchSections.length > 0 ? (
            <div className="space-y-5 p-4">
              {outgoingDailyBatchSections.map((section, sectionIndex) => (
                <div
                  key={section.dateKey}
                  className="overflow-hidden rounded-xl border border-orange-200 bg-white"
                >
                  <div className="flex flex-col gap-3 border-b border-orange-100 bg-orange-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                        <CalendarDays className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                          Tanggal pengiriman
                        </p>
                        <h3 className="mt-0.5 font-semibold text-slate-950">
                          {section.dateLabel}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={[
                        "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                        sectionIndex === 0
                          ? "bg-orange-600 text-white"
                          : "bg-orange-100 text-orange-700",
                      ].join(" ")}
                    >
                      {section.items.length} surat tersedia
                    </span>
                  </div>

                  <div className="grid gap-3 p-3 lg:grid-cols-2">
                    {outgoingDeliverySections.map((deliverySection) => {
                      const DeliveryIcon = deliverySection.icon;
                      const deliveryPicContacts = getDeliveryPicContacts(
                        picContacts,
                        deliverySection.name,
                      );
                      const hasPicContacts = deliveryPicContacts.length > 0;

                      return (
                        <form
                          key={`${section.dateKey}-${deliverySection.name}`}
                          action={createOutgoingBatchReceiptAction}
                          className={[
                            "h-fit overflow-hidden rounded-xl border shadow-sm",
                            deliverySection.cardClass,
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3 border-b border-white/80 px-4 py-4">
                            <div
                              className={[
                                "flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm",
                                deliverySection.iconClass,
                              ].join(" ")}
                            >
                              <DeliveryIcon
                                className="size-5"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-950">
                                {deliverySection.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {deliverySection.description}
                              </p>
                              <p
                                className={[
                                  "mt-1 text-xs font-medium",
                                  hasPicContacts
                                    ? "text-emerald-600"
                                    : "text-orange-600",
                                ].join(" ")}
                              >
                                {hasPicContacts
                                  ? `${deliveryPicContacts.length} PIC aktif tersedia`
                                  : "PIC dan nomor WhatsApp belum diatur"}
                              </p>
                            </div>
                          </div>

                          <div className="p-4">
                            <input
                              type="hidden"
                              name="delivery_section"
                              value={deliverySection.name}
                            />
                            <input
                              type="hidden"
                              name="batch_date"
                              value={section.dateKey}
                            />
                            <input
                              type="hidden"
                              name="return_to"
                              value="/receipts?receipt_mode=outgoing"
                            />

                            {hasPicContacts ? (
                              <label className="mb-4 block">
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  PIC yang sedang bertugas
                                </span>
                                <select
                                  name="pic_contact_id"
                                  required
                                  defaultValue=""
                                  className="mt-2 h-11 w-full rounded-lg border border-white bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                >
                                  <option value="" disabled>
                                    Pilih PIC {deliverySection.name}
                                  </option>
                                  {deliveryPicContacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                      {contact.name} · +
                                      {contact.whatsapp_number}
                                    </option>
                                  ))}
                                </select>
                                <span className="mt-1.5 block text-xs text-slate-500">
                                  Link WhatsApp dikirim ke PIC yang dipilih.
                                </span>
                              </label>
                            ) : null}

                            <div className="grid gap-2">
                              {section.items.map((item) => (
                                <label
                                  key={`outgoing-${item.id}`}
                                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white bg-white px-3 py-3 transition hover:border-slate-300"
                                >
                                  <input
                                    type="checkbox"
                                    name="outgoing_ids"
                                    value={item.id}
                                    className={[
                                      "mt-0.5 size-4",
                                      deliverySection.accentClass,
                                    ].join(" ")}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2">
                                      <span className="font-semibold text-slate-950">
                                        {item.agendaNumber}
                                      </span>
                                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                        Surat Keluar
                                      </span>
                                    </span>
                                    <span className="mt-1 block text-sm text-slate-500">
                                      {item.sender} → {item.recipient}
                                    </span>
                                    <span className="mt-1 block truncate text-xs text-slate-400">
                                      {item.description}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>

                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-medium text-orange-700">
                              <CalendarDays
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              Hanya pengiriman {section.dateLabel}
                            </div>

                            {hasPicContacts ? (
                              <PendingSubmitButton
                                pendingLabel="Membuat tanda terima..."
                                className={[
                                  "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition",
                                  deliverySection.buttonClass,
                                ].join(" ")}
                              >
                                <DeliveryIcon
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Buat & Siapkan WhatsApp
                              </PendingSubmitButton>
                            ) : (
                              <LoadingLink
                                href="/settings/pic-contacts"
                                pendingLabel="Membuka..."
                                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700"
                              >
                                Tambah PIC {deliverySection.name}
                              </LoadingLink>
                            )}
                          </div>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="m-4 rounded-xl border border-dashed border-orange-200 bg-white/70 px-4 py-5 text-sm text-slate-500">
              Belum ada surat keluar yang siap dibuatkan tanda terima harian.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <form
              action="/receipts"
              className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto]"
            >
              <input
                type="hidden"
                name="receipt_mode"
                value={receiptMode}
              />
              <label className="relative block">
                <span className="sr-only">Cari tanda terima</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  name="q"
                  defaultValue={keyword}
                  placeholder="Cari agenda, pengirim, penerima, PIC..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60]/40 focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>

              <label className="sr-only" htmlFor="receipt-status">
                Status tanda terima
              </label>
              <select
                id="receipt-status"
                name="status"
                defaultValue={status}
                className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0A3A60]/40 focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              >
                <option value="">Semua status</option>
                <option value="pending">Belum diterima</option>
                <option value="confirmed">Sudah diterima</option>
              </select>

              <label className="sr-only" htmlFor="receipt-type">
                Jenis data
              </label>
              <select
                id="receipt-type"
                name="type"
                defaultValue={type}
                className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#0A3A60]/40 focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
              >
                <option value="">Semua jenis</option>
                <option value="DOCUMENT">Dokumen</option>
                <option value="INVOICE">Invoice</option>
                <option value="OUTGOING">Surat Keluar</option>
              </select>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082F4D]"
              >
                <Search className="size-4" aria-hidden="true" />
                Cari
              </button>

              {hasActiveFilter ? (
                <LoadingLink
                  href={
                    receiptMode === "outgoing"
                      ? "/receipts?receipt_mode=outgoing"
                      : "/receipts"
                  }
                  pendingLabel="Reset..."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset
                </LoadingLink>
              ) : (
                <span className="hidden xl:block" />
              )}
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Nomor agenda</th>
                  <th className="px-5 py-4 font-semibold">Jenis</th>
                  <th className="px-5 py-4 font-semibold">Tanggal</th>
                  <th className="px-5 py-4 font-semibold">Pengirim/Staff</th>
                  <th className="px-5 py-4 font-semibold">Tujuan/PIC</th>
                  <th className="px-5 py-4 font-semibold">Departemen</th>
                  <th className="px-5 py-4 font-semibold">Kategori</th>
                  <th className="px-5 py-4 font-semibold">Tanda Terima</th>
                  <th className="px-5 py-4 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.length > 0 ? (
                  pageItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="align-middle">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">
                          {item.agendaNumber}
                        </p>
                        <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
                          {item.description}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-md px-3 py-1 text-xs font-semibold",
                            getTypeBadgeClass(item.type),
                          ].join(" ")}
                        >
                          {item.typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {item.sender}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.recipient}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.department}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.category}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <ReceiptStatusPill receipt={item.receipt} />
                          {item.receipt?.scope === "BATCH" &&
                          item.receipt.token ? (
                            <CopyReceiptLinkButton
                              href={
                                item.type === "OUTGOING"
                                  ? `/receipt-outgoing-batch/${item.receipt.token}`
                                  : `/receipt-batch/${item.receipt.token}`
                              }
                              compact
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <LoadingLink
                          href={item.href}
                          pendingLabel="Memuat..."
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
                        >
                          Detail
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </LoadingLink>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Inbox className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-950">
                          Data tanda terima tidak ditemukan
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Coba ubah pencarian, status, atau jenis data yang
                          sedang difilter.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={safeCurrentPage}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 size-5 text-[#0A3A60]" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-600">
                Dokumen dan invoice memakai tanda terima digital dari halaman
                detail masing-masing.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Send className="mt-1 size-5 text-[#0A3A60]" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-600">
                Surat keluar juga masuk ke daftar ini, sehingga tanda terima
                ekspedisi atau kurir cabang bisa dipantau dari satu tempat.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-1 size-5 text-emerald-700"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-slate-600">
                Status “Sudah diterima” muncul otomatis setelah penerima
                mengisi tanda terima digital.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
