"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CleanupDocument = {
  id: string;
  attachment_url: string | null;
};

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function cleanupRedirect(month: string, key: "message" | "error", value: string) {
  const query = new URLSearchParams({ month, [key]: value });

  return `/settings/cleanup?${query.toString()}`;
}

function isValidMonth(value: string) {
  if (!MONTH_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2020 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}

function getMonthRange(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function cleanupDocumentsByMonthAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const month = formString(formData, "month");
  const confirmed = formData.get("backup_confirmed") === "on";

  if (!isValidMonth(month)) {
    redirect(cleanupRedirect(month || new Date().toISOString().slice(0, 7), "error", "Bulan yang dipilih tidak valid."));
  }

  if (!confirmed) {
    redirect(cleanupRedirect(month, "error", "Centang konfirmasi backup sebelum membersihkan data."));
  }

  const { startIso, endIso } = getMonthRange(month);
  const { data: documents, error: readError } = await supabase
    .from("documents")
    .select("id, attachment_url")
    .gte("received_at", startIso)
    .lt("received_at", endIso)
    .range(0, 4999);

  if (readError) {
    console.error("Failed to read documents before cleanup", readError);
    redirect(cleanupRedirect(month, "error", "Data gagal dibaca. Coba ulangi sebentar lagi."));
  }

  const rows = (documents ?? []) as CleanupDocument[];
  const ids = rows.map((item) => item.id);

  if (ids.length === 0) {
    redirect(cleanupRedirect(month, "message", "Tidak ada dokumen atau invoice pada bulan ini."));
  }

  for (const idChunk of chunkArray(ids, 200)) {
    const { error: eventsError } = await supabase
      .from("document_events")
      .delete()
      .in("document_id", idChunk);

    if (eventsError) {
      console.error("Failed to remove document events during cleanup", eventsError);
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .in("id", idChunk);

    if (deleteError) {
      console.error("Failed to cleanup documents", deleteError);
      redirect(cleanupRedirect(month, "error", "Data gagal dibersihkan. Pastikan akun memiliki akses admin."));
    }
  }

  const attachmentPaths = Array.from(
    new Set(
      rows
        .map((item) => item.attachment_url)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  for (const pathChunk of chunkArray(attachmentPaths, 100)) {
    const { error: storageError } = await supabase.storage
      .from("document-attachments")
      .remove(pathChunk);

    if (storageError) {
      console.error("Failed to remove cleaned document attachments", storageError);
    }
  }

  revalidatePath("/");
  revalidatePath("/documents");
  revalidatePath("/invoices");
  revalidatePath("/search");
  revalidatePath("/reports");
  revalidatePath("/receipts");
  revalidatePath("/settings/cleanup");

  redirect(
    cleanupRedirect(
      month,
      "message",
      `${ids.length} data dokumen/invoice bulan ini berhasil dibersihkan.`,
    ),
  );
}
