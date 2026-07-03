import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  FileSearch,
  FileText,
  ReceiptText,
  Send,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { LoadingLink } from "@/components/LoadingLink";
import { PaginationControls } from "@/components/PaginationControls";
import { ReceiptStatusBadge } from "@/components/ReceiptStatusBadge";
import {
  fetchDocumentReceiptStatusMap,
  fetchOutgoingReceiptStatusMap,
  matchesReceiptFilter,
  validReceiptFilters,
  type ReceiptFilter,
  type ReceiptStatus,
  type ReceiptStatusSummary,
} from "@/lib/receipts";
import { fetchAllRows } from "@/lib/supabase/pagination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SearchFilters } from "./SearchFilters";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    category?: string;
    receipt?: string;
    page?: string;
  }>;
};

type DbDocumentType = "LETTER" | "INVOICE";
type GlobalResultType = DbDocumentType | "OUTGOING" | "RECEIPT";

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

type SearchDocument = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  letter_number: string | null;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  notes: string | null;
  employee_name: string | null;
  amount: number | null;
  category_id: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
  creator: { full_name: string } | null;
};

type SearchOutgoingLetter = {
  id: string;
  agenda_number: string;
  sent_at: string;
  sender_staff: string;
  sender_department: "GA" | "HRM";
  letter_number: string | null;
  destination_name: string;
  attention_to: string | null;
  subject: string | null;
  notes: string | null;
};

type SearchReceipt = {
  id: string;
  token: string;
  target_type: "DOCUMENT" | "INVOICE" | "OUTGOING";
  document_id: string | null;
  outgoing_letter_id: string | null;
  status: ReceiptStatus;
  recipient_name: string | null;
  recipient_unit: string | null;
  recipient_note: string | null;
  confirmed_at: string | null;
  created_at: string;
  document: SearchDocument | SearchDocument[] | null;
  outgoing_letter: SearchOutgoingLetter | SearchOutgoingLetter[] | null;
};

type GlobalSearchResult = {
  id: string;
  resultType: GlobalResultType;
  number: string;
  date: string;
  sender: string;
  category: string;
  categoryId: string | null;
  department: string;
  pic: string;
  title: string;
  detail: string;
  amount: number;
  receipt?: ReceiptStatusSummary;
  href: string;
  searchableText: string;
};

const validTypes = new Set(["LETTER", "INVOICE", "OUTGOING", "RECEIPT"]);

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 20;

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getSearchPageHref({
  page,
  keyword,
  type,
  category,
  receipt,
}: {
  page: number;
  keyword: string;
  type: string;
  category: string;
  receipt: ReceiptFilter;
}) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("q", keyword);
  }

  if (type) {
    params.set("type", type);
  }

  if (category) {
    params.set("category", category);
  }

  if (receipt) {
    params.set("receipt", receipt);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatResultType(type: GlobalResultType) {
  if (type === "INVOICE") {
    return "Invoice";
  }

  if (type === "OUTGOING") {
    return "Surat Keluar";
  }

  if (type === "RECEIPT") {
    return "Tanda Terima";
  }

  return "Dokumen";
}

function getTypeClass(type: GlobalResultType) {
  if (type === "INVOICE") {
    return "bg-[#D71920] text-white";
  }

  if (type === "OUTGOING") {
    return "bg-[#0F6B7D] text-white";
  }

  if (type === "RECEIPT") {
    return "bg-emerald-600 text-white";
  }

  return "bg-[#0A3A60] text-white";
}

function singleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getInvoiceDetail(details: SearchDocument["invoice_details"]) {
  return singleRelation(details);
}

function getDocumentPic(document: SearchDocument) {
  if (document.type === "INVOICE") {
    return (
      getInvoiceDetail(document.invoice_details)?.internal_pic ??
      document.recipient_name ??
      "-"
    );
  }

  return document.recipient_name ?? "-";
}

function getDocumentAmount(document: SearchDocument) {
  return Number(getInvoiceDetail(document.invoice_details)?.amount ?? document.amount ?? 0);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function buildSearchText(values: Array<string | number | null | undefined>) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function matchesKeyword(result: GlobalSearchResult, keyword: string) {
  if (!keyword) {
    return true;
  }

  return result.searchableText.includes(normalizeSearch(keyword));
}

function documentToResult(
  document: SearchDocument,
  receipt: ReceiptStatusSummary | undefined,
): GlobalSearchResult {
  const invoiceDetail = getInvoiceDetail(document.invoice_details);
  const amount = getDocumentAmount(document);
  const invoiceNumber = invoiceDetail?.invoice_number ?? "";
  const pic = getDocumentPic(document);
  const detail =
    document.type === "INVOICE"
      ? [
          invoiceNumber ? `Invoice ${invoiceNumber}` : null,
          amount > 0 ? currencyFormatter.format(amount) : null,
          document.notes,
        ]
          .filter(Boolean)
          .join(" | ")
      : [document.letter_number, document.notes].filter(Boolean).join(" | ");

  return {
    id: document.id,
    resultType: document.type,
    number: document.agenda_number,
    date: document.received_at,
    sender: document.sender_name,
    category: document.category?.name ?? "-",
    categoryId: document.category_id,
    department: document.department?.name ?? "-",
    pic,
    title: document.subject,
    detail,
    amount,
    receipt,
    href:
      document.type === "INVOICE"
        ? `/invoices/${document.id}`
        : `/documents/${document.id}`,
    searchableText: buildSearchText([
      document.agenda_number,
      document.letter_number,
      invoiceNumber,
      document.sender_name,
      document.recipient_name,
      document.employee_name,
      invoiceDetail?.internal_pic,
      document.subject,
      document.notes,
      document.department?.name,
      document.department?.code,
      document.category_id,
      document.category?.name,
      document.creator?.full_name,
      amount,
    ]),
  };
}

function outgoingToResult(
  letter: SearchOutgoingLetter,
  receipt: ReceiptStatusSummary | undefined,
): GlobalSearchResult {
  const title = letter.subject || `Surat keluar ke ${letter.destination_name}`;
  const pic = letter.attention_to || letter.destination_name;
  const detail = [letter.letter_number, letter.notes].filter(Boolean).join(" | ");

  return {
    id: letter.id,
    resultType: "OUTGOING",
    number: letter.agenda_number,
    date: letter.sent_at,
    sender: letter.sender_staff,
    category: "Surat Keluar",
    categoryId: null,
    department: letter.sender_department,
    pic,
    title,
    detail,
    amount: 0,
    receipt,
    href: `/outgoing/${letter.id}`,
    searchableText: buildSearchText([
      letter.agenda_number,
      letter.letter_number,
      letter.sender_staff,
      letter.sender_department,
      letter.destination_name,
      letter.attention_to,
      letter.subject,
      letter.notes,
    ]),
  };
}

function receiptToResult(receipt: SearchReceipt): GlobalSearchResult {
  const document = singleRelation(receipt.document);
  const outgoing = singleRelation(receipt.outgoing_letter);
  const documentInvoiceDetail = document
    ? getInvoiceDetail(document.invoice_details)
    : null;
  const linkedNumber = document?.agenda_number ?? outgoing?.agenda_number ?? "-";
  const linkedTitle =
    document?.subject ??
    outgoing?.subject ??
    (outgoing ? `Surat keluar ke ${outgoing.destination_name}` : "Tanda terima");
  const department =
    document?.department?.name ?? outgoing?.sender_department ?? receipt.recipient_unit ?? "-";
  const sender = document?.sender_name ?? outgoing?.sender_staff ?? "-";
  const pic =
    receipt.recipient_name ??
    documentInvoiceDetail?.internal_pic ??
    document?.recipient_name ??
    outgoing?.attention_to ??
    outgoing?.destination_name ??
    "-";

  return {
    id: receipt.id,
    resultType: "RECEIPT",
    number: linkedNumber,
    date: receipt.confirmed_at ?? receipt.created_at,
    sender,
    category: "Tanda Terima",
    categoryId: document?.category_id ?? null,
    department,
    pic,
    title: linkedTitle,
    detail: [
      receipt.status === "CONFIRMED" ? "Sudah diterima" : "Menunggu tanda terima",
      receipt.recipient_unit,
      receipt.recipient_note,
    ]
      .filter(Boolean)
      .join(" | "),
    amount: Number(documentInvoiceDetail?.amount ?? document?.amount ?? 0),
    receipt: {
      id: receipt.id,
      token: receipt.token,
      scope: "SINGLE",
      status: receipt.status,
      confirmed_at: receipt.confirmed_at,
    },
    href: `/receipt/${receipt.token}`,
    searchableText: buildSearchText([
      linkedNumber,
      receipt.token,
      receipt.target_type,
      receipt.status,
      receipt.recipient_name,
      receipt.recipient_unit,
      receipt.recipient_note,
      document?.agenda_number,
      document?.letter_number,
      documentInvoiceDetail?.invoice_number,
      document?.sender_name,
      document?.recipient_name,
      documentInvoiceDetail?.internal_pic,
      document?.subject,
      document?.notes,
      document?.department?.name,
      document?.department?.code,
      document?.category_id,
      document?.category?.name,
      outgoing?.agenda_number,
      outgoing?.letter_number,
      outgoing?.sender_staff,
      outgoing?.sender_department,
      outgoing?.destination_name,
      outgoing?.attention_to,
      outgoing?.subject,
      outgoing?.notes,
    ]),
  };
}

function typeMatches(result: GlobalSearchResult, type: string) {
  if (!type) {
    return true;
  }

  return result.resultType === type;
}

function categoryMatches(result: GlobalSearchResult, category: string) {
  if (!category) {
    return true;
  }

  return result.categoryId === category;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const keyword = String(params.q ?? "").trim();
  const type = validTypes.has(String(params.type)) ? String(params.type) : "";
  const category = String(params.category ?? "").trim();
  const receipt = validReceiptFilters.has(String(params.receipt))
    ? (String(params.receipt) as ReceiptFilter)
    : "";
  const currentPage = parsePage(params.page);

  function createDocumentsQuery() {
    let query = supabase
      .from("documents")
      .select(
        `
        id,
        agenda_number,
        type,
        letter_number,
        received_at,
        sender_name,
        recipient_name,
        subject,
        notes,
        employee_name,
        amount,
        category_id,
        department:departments(name, code),
        category:document_categories(name),
        invoice_details(invoice_number, amount, internal_pic),
        creator:profiles!documents_created_by_fkey(full_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (type === "LETTER" || type === "INVOICE") {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category_id", category);
    }

    return query as unknown as {
      range(
        from: number,
        to: number,
      ): PromiseLike<{ data: SearchDocument[] | null; error: { message: string } | null }>;
    };
  }

  function createOutgoingQuery() {
    return supabase
      .from("outgoing_letters")
      .select(
        "id, agenda_number, sent_at, sender_staff, sender_department, letter_number, destination_name, attention_to, subject, notes",
      )
      .order("created_at", { ascending: false }) as unknown as {
      range(
        from: number,
        to: number,
      ): PromiseLike<{ data: SearchOutgoingLetter[] | null; error: { message: string } | null }>;
    };
  }

  function createReceiptsQuery() {
    return supabase
      .from("receipt_requests")
      .select(
        `
        id,
        token,
        target_type,
        document_id,
        outgoing_letter_id,
        status,
        recipient_name,
        recipient_unit,
        recipient_note,
        confirmed_at,
        created_at,
        document:documents(
          id,
          agenda_number,
          type,
          letter_number,
          received_at,
          sender_name,
          recipient_name,
          subject,
          notes,
          employee_name,
          amount,
          category_id,
          department:departments(name, code),
          category:document_categories(name),
          invoice_details(invoice_number, amount, internal_pic),
          creator:profiles!documents_created_by_fkey(full_name)
        ),
        outgoing_letter:outgoing_letters(
          id,
          agenda_number,
          sent_at,
          sender_staff,
          sender_department,
          letter_number,
          destination_name,
          attention_to,
          subject,
          notes
        )
      `,
      )
      .order("created_at", { ascending: false }) as unknown as {
      range(
        from: number,
        to: number,
      ): PromiseLike<{ data: SearchReceipt[] | null; error: { message: string } | null }>;
    };
  }

  const shouldLoadDocuments = !type || type === "LETTER" || type === "INVOICE";
  const shouldLoadOutgoing = !type || type === "OUTGOING";
  const shouldLoadReceipts = !type || type === "RECEIPT";

  const [
    documentsResult,
    outgoingResult,
    receiptsResult,
    { data: categories },
  ] = await Promise.all([
    shouldLoadDocuments
      ? fetchAllRows<SearchDocument>(createDocumentsQuery)
      : Promise.resolve({ data: [], error: null }),
    shouldLoadOutgoing
      ? fetchAllRows<SearchOutgoingLetter>(createOutgoingQuery)
      : Promise.resolve({ data: [], error: null }),
    shouldLoadReceipts
      ? fetchAllRows<SearchReceipt>(createReceiptsQuery)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("document_categories")
      .select("id, name, type")
      .order("name", { ascending: true }),
  ]);

  const documentRows = documentsResult.data;
  const outgoingRows = outgoingResult.data;
  const receiptRows = receiptsResult.data;
  const [documentReceiptStatusMap, outgoingReceiptStatusMap] = await Promise.all([
    fetchDocumentReceiptStatusMap(
      supabase,
      documentRows.map((document) => document.id),
    ),
    fetchOutgoingReceiptStatusMap(
      supabase,
      outgoingRows.map((letter) => letter.id),
    ),
  ]);

  const documentResults = documentRows.map((document) =>
    documentToResult(document, documentReceiptStatusMap.get(document.id)),
  );
  const outgoingResults = outgoingRows.map((letter) =>
    outgoingToResult(letter, outgoingReceiptStatusMap.get(letter.id)),
  );
  const receiptResults = receiptRows.map(receiptToResult);
  const rows = [...documentResults, ...outgoingResults, ...receiptResults]
    .filter(
      (result) =>
        typeMatches(result, type) &&
        categoryMatches(result, category) &&
        matchesKeyword(result, keyword) &&
        matchesReceiptFilter(result.receipt, receipt),
    )
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        a.number.localeCompare(b.number, "id-ID"),
    );

  const error =
    documentsResult.error ?? outgoingResult.error ?? receiptsResult.error ?? null;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedRows = rows.slice(pageStart, pageStart + PAGE_SIZE);
  const previousHref =
    safeCurrentPage > 1
      ? getSearchPageHref({
          page: safeCurrentPage - 1,
          keyword,
          type,
          category,
          receipt,
        })
      : null;
  const nextHref =
    safeCurrentPage < totalPages
      ? getSearchPageHref({
          page: safeCurrentPage + 1,
          keyword,
          type,
          category,
          receipt,
        })
      : null;
  const categoryOptions = (categories ?? []) as Category[];
  const documentCount = rows.filter((row) => row.resultType === "LETTER").length;
  const invoiceCount = rows.filter((row) => row.resultType === "INVOICE").length;
  const outgoingCount = rows.filter((row) => row.resultType === "OUTGOING").length;
  const receiptCount = rows.filter((row) => row.resultType === "RECEIPT").length;
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const hasActiveFilter = Boolean(keyword || type || category || receipt);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <FileSearch className="size-3.5" aria-hidden="true" />
                Pencarian Global
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Cari Semua Data
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Cari dokumen, invoice, surat keluar, tanda terima, nomor, PIC,
                departemen, kategori, catatan, dan perihal dalam satu tempat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center sm:grid-cols-5">
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Hasil</p>
                <p className="text-lg font-semibold text-slate-950">{rows.length}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Dokumen</p>
                <p className="text-lg font-semibold text-[#0A3A60]">
                  {documentCount}
                </p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="text-lg font-semibold text-[#D71920]">
                  {invoiceCount}
                </p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Surat</p>
                <p className="text-lg font-semibold text-[#0F6B7D]">
                  {outgoingCount}
                </p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Tanda Terima</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {receiptCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SearchFilters
            key={`${keyword}-${type}-${category}-${receipt}`}
            keyword={keyword}
            type={type}
            category={category}
            receipt={receipt}
            categories={categoryOptions}
          />

          {error ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Sebagian data pencarian belum bisa dimuat. Pastikan tabel dan
              policy Supabase untuk dokumen, surat keluar, dan tanda terima
              sudah aktif.
            </div>
          ) : null}

          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[1360px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-5 py-3">
                    Nomor
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
                    Kategori
                  </th>
                  <th className="border-b border-slate-200 px-5 py-3">
                    Departemen
                  </th>
                  <th className="border-b border-slate-200 px-5 py-3">
                    PIC
                  </th>
                  <th className="border-b border-slate-200 px-5 py-3">
                    Perihal / Catatan
                  </th>
                  <th className="border-b border-slate-200 px-5 py-3">
                    Tanda Terima
                  </th>
                  <th className="border-b border-slate-200 px-5 py-3 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((result) => (
                    <tr
                      key={`${result.resultType}-${result.id}`}
                      className="group transition hover:bg-slate-50/80"
                    >
                      <td className="border-b border-slate-100 px-5 py-4">
                        <p className="text-sm font-semibold text-slate-950">
                          {result.number}
                        </p>
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
                            getTypeClass(result.resultType),
                          ].join(" ")}
                        >
                          {formatResultType(result.resultType)}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        {formatDate(result.date)}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-900">
                        {result.sender}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        {result.category}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        {result.department}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="size-4 text-slate-400" aria-hidden="true" />
                          {result.pic}
                        </span>
                      </td>
                      <td className="max-w-sm border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                        <span className="line-clamp-2">{result.title}</span>
                        {result.detail ? (
                          <span className="mt-1 block text-xs font-medium text-slate-500">
                            {result.detail}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <ReceiptStatusBadge receipt={result.receipt} />
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-right">
                        <LoadingLink
                          href={result.href}
                          pendingLabel="Membuka..."
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
                    <td colSpan={10} className="px-5 py-14 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        {hasActiveFilter ? (
                          <FileSearch className="size-6" aria-hidden="true" />
                        ) : (
                          <FileText className="size-6" aria-hidden="true" />
                        )}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-slate-700">
                        {hasActiveFilter
                          ? "Tidak ada data yang cocok"
                          : "Belum ada data untuk dicari"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {hasActiveFilter
                          ? "Coba ubah kata kunci, jenis, kategori, atau status tanda terima."
                          : "Data dokumen, invoice, surat keluar, dan tanda terima akan muncul setelah dibuat."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={safeCurrentPage}
            pageSize={PAGE_SIZE}
            totalItems={rows.length}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-start gap-3">
              <Send className="mt-0.5 size-5 shrink-0 text-[#0A3A60]" />
              <p>
                Pencarian membaca nomor agenda, nomor surat, nomor invoice,
                pengirim/vendor, PIC, departemen, kategori, perihal, dan catatan.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 size-5 shrink-0 text-[#D71920]" />
              <p>
                Total nominal invoice dari hasil pencarian saat ini:{" "}
                <span className="font-semibold text-slate-950">
                  {currencyFormatter.format(totalAmount)}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
