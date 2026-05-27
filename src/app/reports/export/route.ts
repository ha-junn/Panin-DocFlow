import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbDocumentType = "LETTER" | "INVOICE";

type InvoiceDetail = {
  invoice_number: string | null;
  internal_pic: string | null;
};

type ReportDocument = {
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
};

function isValidDateInput(value: string | null) {
  return value ? /^\d{4}-\d{2}-\d{2}$/.test(value) : false;
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function getInvoiceDetail(details: ReportDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Dokumen";
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
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
  const defaults = getDefaultDateRange();
  const dateFrom = isValidDateInput(url.searchParams.get("date_from"))
    ? String(url.searchParams.get("date_from"))
    : defaults.from;
  const dateTo = isValidDateInput(url.searchParams.get("date_to"))
    ? String(url.searchParams.get("date_to"))
    : defaults.to;

  let query = supabase
    .from("documents")
    .select(
      `
      agenda_number,
      type,
      received_at,
      sender_name,
      recipient_name,
      subject,
      department:departments(name, code),
      category:document_categories(name),
      invoice_details(invoice_number, internal_pic)
    `,
    )
    .gte("received_at", `${dateFrom}T00:00:00`)
    .lte("received_at", `${dateTo}T23:59:59`)
    .order("received_at", { ascending: true });

  const type = url.searchParams.get("type");
  const department = url.searchParams.get("department");
  const category = url.searchParams.get("category");

  if (type === "LETTER" || type === "INVOICE") {
    query = query.eq("type", type);
  }

  if (department) {
    query = query.eq("department_id", department);
  }

  if (category) {
    query = query.eq("category_id", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { message: "Report export failed", error: error.message },
      { status: 500 },
    );
  }

  const documents = (data ?? []) as unknown as ReportDocument[];
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
    ].map(escapeCsv);
  });

  const csv = [headers.map(escapeCsv), ...rows]
    .map((row) => row.join(","))
    .join("\n");
  const fileName = `panin-docflow-laporan-${dateFrom}-sd-${dateTo}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
