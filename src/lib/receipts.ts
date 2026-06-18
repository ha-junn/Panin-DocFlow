import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReceiptStatus = "PENDING" | "CONFIRMED";
export type ReceiptFilter = "" | "pending" | "confirmed";

export type ReceiptStatusSummary = {
  id?: string;
  token?: string;
  scope?: "SINGLE" | "BATCH";
  status: ReceiptStatus;
  confirmed_at: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type DocumentReceiptRow = {
  id: string;
  token: string;
  document_id: string | null;
  status: ReceiptStatus;
  confirmed_at: string | null;
};

type BatchReceiptRow = {
  document_id: string;
  batch:
    | {
        id: string;
        token: string;
        status: ReceiptStatus;
        confirmed_at: string | null;
      }
    | {
        id: string;
        token: string;
        status: ReceiptStatus;
        confirmed_at: string | null;
      }[]
    | null;
};

type OutgoingReceiptRow = {
  id: string;
  token: string;
  outgoing_letter_id: string | null;
  status: ReceiptStatus;
  confirmed_at: string | null;
};

type OutgoingBatchReceiptRow = {
  outgoing_letter_id: string;
  batch:
    | {
        id: string;
        token: string;
        status: ReceiptStatus;
        confirmed_at: string | null;
      }
    | {
        id: string;
        token: string;
        status: ReceiptStatus;
        confirmed_at: string | null;
      }[]
    | null;
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

  const [singleResult, batchResult] = await Promise.all([
    supabase
      .from("receipt_requests")
      .select("id, token, document_id, status, confirmed_at")
      .in("document_id", uniqueIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("receipt_batch_items")
      .select(
        "document_id, batch:receipt_batches(id, token, status, confirmed_at)",
      )
      .in("document_id", uniqueIds),
  ]);

  const map = new Map<string, ReceiptStatusSummary>();

  for (const row of (singleResult.data ?? []) as DocumentReceiptRow[]) {
    if (row.document_id && !map.has(row.document_id)) {
      map.set(row.document_id, {
        id: row.id,
        token: row.token,
        scope: "SINGLE",
        status: row.status,
        confirmed_at: row.confirmed_at,
      });
    }
  }

  if (!batchResult.error) {
    for (const row of (batchResult.data ?? []) as unknown as BatchReceiptRow[]) {
      const batch = Array.isArray(row.batch) ? row.batch[0] : row.batch;

      if (row.document_id && batch) {
        map.set(row.document_id, {
          id: batch.id,
          token: batch.token,
          scope: "BATCH",
          status: batch.status,
          confirmed_at: batch.confirmed_at,
        });
      }
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

  const [singleResult, batchResult] = await Promise.all([
    supabase
      .from("receipt_requests")
      .select("id, token, outgoing_letter_id, status, confirmed_at")
      .in("outgoing_letter_id", uniqueIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("outgoing_receipt_batch_items")
      .select(
        "outgoing_letter_id, batch:outgoing_receipt_batches(id, token, status, confirmed_at)",
      )
      .in("outgoing_letter_id", uniqueIds),
  ]);

  const map = new Map<string, ReceiptStatusSummary>();

  for (const row of (singleResult.data ?? []) as OutgoingReceiptRow[]) {
    if (row.outgoing_letter_id && !map.has(row.outgoing_letter_id)) {
      map.set(row.outgoing_letter_id, {
        id: row.id,
        token: row.token,
        scope: "SINGLE",
        status: row.status,
        confirmed_at: row.confirmed_at,
      });
    }
  }

  if (!batchResult.error) {
    for (const row of (batchResult.data ??
      []) as unknown as OutgoingBatchReceiptRow[]) {
      const batch = Array.isArray(row.batch) ? row.batch[0] : row.batch;

      if (row.outgoing_letter_id && batch) {
        map.set(row.outgoing_letter_id, {
          id: batch.id,
          token: batch.token,
          scope: "BATCH",
          status: batch.status,
          confirmed_at: batch.confirmed_at,
        });
      }
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
