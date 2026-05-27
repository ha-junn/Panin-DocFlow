import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbDocumentType = "LETTER" | "INVOICE";

type InvoiceDetail = {
  invoice_number: string | null;
  internal_pic: string | null;
};

type ExportDocument = {
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  notes: string | null;
  attachment_url: string | null;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
};

function getValidMonth(value: string | null) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : new Date().getMonth() + 1;
}

function getValidYear(value: string | null) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2020 && year <= 2100
    ? year
    : new Date().getFullYear();
}

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getInvoiceDetail(details: ExportDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Dokumen";
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const month = getValidMonth(url.searchParams.get("month"));
  const year = getValidYear(url.searchParams.get("year"));
  const { startIso, endIso } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
      agenda_number,
      type,
      received_at,
      sender_name,
      recipient_name,
      subject,
      notes,
      attachment_url,
      department:departments(name, code),
      category:document_categories(name),
      invoice_details(invoice_number, internal_pic)
    `,
    )
    .gte("received_at", startIso)
    .lt("received_at", endIso)
    .order("received_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { message: "Backup export failed", error: error.message },
      { status: 500 },
    );
  }

  const documents = (data ?? []) as unknown as ExportDocument[];
  const headers = [
    "Nomor Agenda",
    "Jenis",
    "Tanggal Diterima",
    "Pengirim/Vendor",
    "Nomor Invoice",
    "PIC/Penerima",
    "Departemen",
    "Kategori",
    "Perihal",
    "Catatan",
    "Path Lampiran",
  ];
  const rows = documents.map((item) => {
    const invoiceDetail = getInvoiceDetail(item.invoice_details);
    const pic =
      item.type === "INVOICE"
        ? invoiceDetail?.internal_pic ?? item.recipient_name
        : item.recipient_name;

    return [
      item.agenda_number,
      formatDocumentType(item.type),
      item.received_at,
      item.sender_name,
      invoiceDetail?.invoice_number,
      pic,
      item.department
        ? `${item.department.name} (${item.department.code})`
        : null,
      item.category?.name,
      item.subject,
      item.notes,
      item.attachment_url,
    ].map(escapeCsv);
  });

  const csv = [headers.map(escapeCsv), ...rows]
    .map((row) => row.join(","))
    .join("\n");
  const fileName = `panin-docflow-backup-${year}-${String(month).padStart(
    2,
    "0",
  )}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
