import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReceiptStatus = "PENDING" | "CONFIRMED";
export type ReceiptFilter = "" | "pending" | "confirmed";

export type ReceiptStatusSummary = {
  status: ReceiptStatus;
  confirmed_at: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type DocumentReceiptRow = {
  document_id: string | null;
  status: ReceiptStatus;
  confirmed_at: string | null;
};

type OutgoingReceiptRow = {
  outgoing_letter_id: string | null;
  status: ReceiptStatus;
  confirmed_at: string | null;
};

export const validReceiptFilters = new Set(["pending", "confirmed"]);

export async function fetchDocumentReceiptStatusMap(
  supabase: SupabaseServerClient,
  documentIds: string[],
) {
  const uniqueIds = Array.from(new Set(documentIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, ReceiptStatusSummary>();
  }

  const { data, error } = await supabase
    .from("receipt_requests")
    .select("document_id, status, confirmed_at")
    .in("document_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) {
    return new Map<string, ReceiptStatusSummary>();
  }

  const map = new Map<string, ReceiptStatusSummary>();

  for (const row of (data ?? []) as DocumentReceiptRow[]) {
    if (row.document_id && !map.has(row.document_id)) {
      map.set(row.document_id, {
        status: row.status,
        confirmed_at: row.confirmed_at,
      });
    }
  }

  return map;
}

export async function fetchOutgoingReceiptStatusMap(
  supabase: SupabaseServerClient,
  outgoingIds: string[],
) {
  const uniqueIds = Array.from(new Set(outgoingIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map<string, ReceiptStatusSummary>();
  }

  const { data, error } = await supabase
    .from("receipt_requests")
    .select("outgoing_letter_id, status, confirmed_at")
    .in("outgoing_letter_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) {
    return new Map<string, ReceiptStatusSummary>();
  }

  const map = new Map<string, ReceiptStatusSummary>();

  for (const row of (data ?? []) as OutgoingReceiptRow[]) {
    if (row.outgoing_letter_id && !map.has(row.outgoing_letter_id)) {
      map.set(row.outgoing_letter_id, {
        status: row.status,
        confirmed_at: row.confirmed_at,
      });
    }
  }

  return map;
}

export function matchesReceiptFilter(
  receipt: ReceiptStatusSummary | undefined,
  filter: ReceiptFilter,
) {
  if (filter === "confirmed") {
    return receipt?.status === "CONFIRMED";
  }

  if (filter === "pending") {
    return receipt?.status !== "CONFIRMED";
  }

  return true;
}
