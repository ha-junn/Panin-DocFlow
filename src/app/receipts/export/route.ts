import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatOutgoingDestination } from "@/lib/text";

type ReceiptExportRow = {
  id: string;
  target_type: "DOCUMENT" | "INVOICE" | "OUTGOING";
  document_id: string | null;
  outgoing_letter_id: string | null;
  status: "PENDING" | "CONFIRMED";
  recipient_name: string | null;
  recipient_unit: string | null;
  recipient_note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type DocumentExportRow = {
  id: string;
  agenda_number: string;
  type: "LETTER" | "INVOICE";
  sender_name: string;
  recipient_name: string | null;
  subject: string | null;
  department: { name: string } | null;
};

type OutgoingExportRow = {
  id: string;
  agenda_number: string;
  sender_staff: string;
  sender_department: string;
  destination_name: string;
  attention_to: string | null;
  subject: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "";
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(",");
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: receipts, error } = await supabase
    .from("receipt_requests")
    .select(
      "id, target_type, document_id, outgoing_letter_id, status, recipient_name, recipient_unit, recipient_note, created_at, confirmed_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: "Data tanda terima gagal diexport." },
      { status: 500 },
    );
  }

  const receiptRows = (receipts ?? []) as ReceiptExportRow[];
  const documentIds = receiptRows
    .map((row) => row.document_id)
    .filter((id): id is string => Boolean(id));
  const outgoingIds = receiptRows
    .map((row) => row.outgoing_letter_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: documents }, { data: outgoing }] = await Promise.all([
    documentIds.length > 0
      ? supabase
          .from("documents")
          .select(
            "id, agenda_number, type, sender_name, recipient_name, subject, department:departments(name)",
          )
          .in("id", Array.from(new Set(documentIds)))
      : Promise.resolve({ data: [] }),
    outgoingIds.length > 0
      ? supabase
          .from("outgoing_letters")
          .select(
            "id, agenda_number, sender_staff, sender_department, destination_name, attention_to, subject",
          )
          .in("id", Array.from(new Set(outgoingIds)))
      : Promise.resolve({ data: [] }),
  ]);

  const documentMap = new Map(
    ((documents ?? []) as unknown as DocumentExportRow[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const outgoingMap = new Map(
    ((outgoing ?? []) as unknown as OutgoingExportRow[]).map((row) => [
      row.id,
      row,
    ]),
  );

  const header = csvLine([
    "Jenis",
    "Nomor Agenda",
    "Pengirim / Staff",
    "Tujuan / PIC",
    "Departemen",
    "Perihal",
    "Status Tanda Terima",
    "Nama Penerima",
    "Unit / Pihak",
    "Catatan",
    "Link Dibuat",
    "Diterima Pada",
  ]);

  const lines = receiptRows.map((receipt) => {
    const document = receipt.document_id
      ? documentMap.get(receipt.document_id)
      : null;
    const outgoingLetter = receipt.outgoing_letter_id
      ? outgoingMap.get(receipt.outgoing_letter_id)
      : null;
    const targetType =
      receipt.target_type === "OUTGOING"
        ? "Surat Keluar"
        : document?.type === "INVOICE"
          ? "Invoice"
          : "Dokumen";

    return csvLine([
      targetType,
      document?.agenda_number ?? outgoingLetter?.agenda_number ?? "",
      document?.sender_name ?? outgoingLetter?.sender_staff ?? "",
      document?.recipient_name ??
        (outgoingLetter
          ? formatOutgoingDestination(
              outgoingLetter.destination_name,
              outgoingLetter.attention_to,
            )
          : ""),
      document?.department?.name ?? outgoingLetter?.sender_department ?? "",
      document?.subject ?? outgoingLetter?.subject ?? "",
      receipt.status === "CONFIRMED" ? "Sudah diterima" : "Menunggu",
      receipt.recipient_name,
      receipt.recipient_unit,
      receipt.recipient_note,
      formatDate(receipt.created_at),
      formatDate(receipt.confirmed_at),
    ]);
  });

  const csv = [header, ...lines].join("\n");
  const filename = `tanda-terima-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
