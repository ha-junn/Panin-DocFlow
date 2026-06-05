"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type OutgoingRow = {
  letterNumber: string | null;
  destinationName: string;
  attentionTo: string | null;
  subject: string | null;
  confidential: boolean;
  notes: string | null;
};

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim());
}

function getFileExtension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return file.name.split(".").pop()?.toLowerCase() || "bin";
}

function uploadStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6);

  return `${year}-${month}-${day}-${hour}${minute}${second}-${random}`;
}

function createAttachmentFileName(file: File) {
  const extension = getFileExtension(file);
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (/^SK-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]{4}$/i.test(safeBaseName)) {
    return `${safeBaseName.toUpperCase()}.${extension}`;
  }

  return `SK-${uploadStamp()}.${extension}`;
}

function dateToIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function collectOutgoingRows(formData: FormData) {
  const letterNumbers = formValues(formData, "letter_number");
  const destinations = formValues(formData, "destination_name");
  const attentionList = formValues(formData, "attention_to");
  const subjects = formValues(formData, "subject");
  const confidentialValues = formValues(formData, "confidential");
  const notes = formValues(formData, "row_notes");
  const maxRows = Math.max(
    letterNumbers.length,
    destinations.length,
    attentionList.length,
    subjects.length,
    confidentialValues.length,
    notes.length,
  );

  const rows: OutgoingRow[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const row = {
      letterNumber: letterNumbers[index] || null,
      destinationName: destinations[index] || "",
      attentionTo: attentionList[index] || null,
      subject: subjects[index] || null,
      confidential: confidentialValues[index] === "true",
      notes: notes[index] || null,
    };

    const hasAnyValue = Boolean(
      row.letterNumber ||
        row.destinationName ||
        row.attentionTo ||
        row.subject ||
        row.confidential ||
        row.notes,
    );

    if (!hasAnyValue) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}

export async function createOutgoingLettersAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sentAt = formString(formData, "sent_at");
  const senderStaff = formString(formData, "sender_staff");
  const senderDepartment = formString(formData, "sender_department");
  const batchNotes = formString(formData, "batch_notes");
  const attachment = formData.get("attachment");
  const rows = collectOutgoingRows(formData);

  if (!sentAt || !senderStaff || !senderDepartment) {
    redirect(
      "/outgoing/new?message=Lengkapi tanggal kirim, staff pengirim, dan departemen pengirim.",
    );
  }

  if (!["GA", "HRM"].includes(senderDepartment)) {
    redirect("/outgoing/new?message=Departemen pengirim tidak valid.");
  }

  if (rows.length === 0) {
    redirect("/outgoing/new?message=Tambahkan minimal satu tujuan surat keluar.");
  }

  const rowWithoutDestination = rows.find((row) => !row.destinationName);

  if (rowWithoutDestination) {
    redirect(
      "/outgoing/new?message=Setiap baris surat keluar yang diisi wajib memiliki tujuan.",
    );
  }

  let attachmentUrl: string | null = null;

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      redirect("/outgoing/new?message=Lampiran hanya boleh PDF atau gambar.");
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      redirect("/outgoing/new?message=Ukuran lampiran maksimal 10 MB.");
    }

    const filePath = `${user.id}/outgoing/${createAttachmentFileName(attachment)}`;

    const { error: uploadError } = await supabase.storage
      .from("document-attachments")
      .upload(filePath, attachment, {
        contentType: attachment.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload outgoing letter attachment", uploadError);
      redirect("/outgoing/new?message=Lampiran surat keluar gagal diupload.");
    }

    attachmentUrl = filePath;
  }

  const payload = rows.map((row) => ({
    sent_at: dateToIso(sentAt),
    sender_staff: senderStaff,
    sender_department: senderDepartment,
    letter_number: row.letterNumber,
    destination_name: row.destinationName,
    attention_to: row.attentionTo,
    subject: row.subject,
    confidential: row.confidential,
    notes: row.notes,
    batch_notes: batchNotes || null,
    attachment_url: attachmentUrl,
    created_by: user.id,
    updated_by: user.id,
  }));

  const { error } = await supabase.from("outgoing_letters").insert(payload);

  if (error) {
    console.error("Failed to create outgoing letters", error);
    redirect(
      "/outgoing/new?message=Surat keluar gagal disimpan. Pastikan SQL Surat Keluar sudah dijalankan di Supabase.",
    );
  }

  revalidatePath("/");
  revalidatePath("/outgoing");
  redirect("/?created=outgoing");
}

export async function deleteOutgoingLetterAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = formString(formData, "id");

  if (!id) {
    redirect("/outgoing?message=Surat keluar tidak ditemukan.");
  }

  const { data: outgoingLetter, error: readError } = await supabase
    .from("outgoing_letters")
    .select("attachment_url")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("Failed to find outgoing letter before delete", readError);
    redirect("/outgoing?message=Surat keluar gagal ditemukan.");
  }

  const { error: deleteError } = await supabase
    .from("outgoing_letters")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Failed to delete outgoing letter", deleteError);
    redirect("/outgoing?message=Surat keluar gagal dihapus.");
  }

  if (outgoingLetter?.attachment_url) {
    const { data: remainingReferences } = await supabase
      .from("outgoing_letters")
      .select("id")
      .eq("attachment_url", outgoingLetter.attachment_url)
      .limit(1);

    if (!remainingReferences || remainingReferences.length === 0) {
      await supabase.storage
        .from("document-attachments")
        .remove([outgoingLetter.attachment_url]);
    }
  }

  revalidatePath("/");
  revalidatePath("/outgoing");
  redirect("/outgoing?message=Surat keluar berhasil dihapus.");
}
