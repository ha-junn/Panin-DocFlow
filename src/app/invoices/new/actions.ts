"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jakartaDateToIso } from "@/lib/date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uppercaseText } from "@/lib/text";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

function createAttachmentFileName(file: File, prefix: "DOC" | "INV") {
  const extension = getFileExtension(file);
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (/^(DOC|INV)-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]{4}$/i.test(safeBaseName)) {
    return `${safeBaseName.toUpperCase()}.${extension}`;
  }

  return `${prefix}-${uploadStamp()}.${extension}`;
}

function parseAmount(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function createAutomaticInvoiceNumber(receivedAt: string) {
  const date = receivedAt.replace(/\D/g, "").slice(0, 8);
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

  return `INV-${date || "AUTO"}-${random}`;
}

export async function createInvoiceBatchAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const receivedAt = formString(formData, "received_at");
  const vendorName = uppercaseText(formString(formData, "vendor_name"));
  const departmentId = formString(formData, "department_id");
  const categoryId = formString(formData, "category_id");
  const internalPic = uppercaseText(formString(formData, "internal_pic"));
  const notes = uppercaseText(formString(formData, "notes"));
  const submittedInvoiceNumbers = formData
    .getAll("invoice_number")
    .map((value) => uppercaseText(String(value)));
  const invoiceNumbers = submittedInvoiceNumbers.map(
    (invoiceNumber) =>
      invoiceNumber || createAutomaticInvoiceNumber(receivedAt),
  );
  const amounts = formData
    .getAll("amount")
    .map((value) => parseAmount(String(value).trim()));
  const attachment = formData.get("attachment");

  if (!receivedAt || !vendorName || !departmentId || !categoryId || !internalPic) {
    redirect(
      "/invoices/new?message=Lengkapi vendor, tanggal diterima, departemen, kategori invoice, dan PIC.",
    );
  }

  const duplicateInForm = invoiceNumbers.find(
    (invoiceNumber, index) => invoiceNumbers.indexOf(invoiceNumber) !== index,
  );

  if (duplicateInForm) {
    redirect(
      `/invoices/new?message=${encodeURIComponent(
        `Nomor invoice ${duplicateInForm} terduplikasi di form.`,
      )}`,
    );
  }

  const invoiceItems = invoiceNumbers.map((invoiceNumber, index) => ({
    invoiceNumber,
    amount: amounts[index] ?? null,
  }));

  const itemsToCreate =
    invoiceItems.length > 0
      ? invoiceItems
      : [
          {
            invoiceNumber: createAutomaticInvoiceNumber(receivedAt),
            amount: null,
          },
        ];

  if (invoiceNumbers.length > 0) {
    const { data: existingInvoices, error: existingError } = await supabase
      .from("invoice_details")
      .select("invoice_number")
      .in("invoice_number", invoiceNumbers);

    if (existingError) {
      console.error("Failed to validate invoice numbers", existingError);
      redirect("/invoices/new?message=Gagal validasi nomor invoice.");
    }

    if (existingInvoices.length > 0) {
      redirect(
        `/invoices/new?message=${encodeURIComponent(
          `Nomor invoice ${existingInvoices[0].invoice_number} sudah ada.`,
        )}`,
      );
    }
  }

  const { data: category, error: categoryError } = await supabase
    .from("document_categories")
    .select("id, name, type")
    .eq("id", categoryId)
    .in("type", ["INVOICE", "BOTH"])
    .maybeSingle();

  if (categoryError || !category) {
    console.error("Failed to find invoice category", categoryError);
    redirect(
      "/invoices/new?message=Kategori invoice belum tersedia atau bukan tipe invoice.",
    );
  }

  let attachmentUrl: string | null = null;
  const createdDocumentIds: string[] = [];

  async function cleanupCreatedRows() {
    if (createdDocumentIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("documents")
        .delete()
        .in("id", createdDocumentIds);

      if (cleanupError) {
        console.error("Failed to rollback invoice documents", cleanupError);
      }
    }

    if (attachmentUrl) {
      const { error: storageCleanupError } = await supabase.storage
        .from("document-attachments")
        .remove([attachmentUrl]);

      if (storageCleanupError) {
        console.error("Failed to rollback invoice attachment", storageCleanupError);
      }
    }
  }

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      redirect("/invoices/new?message=Lampiran hanya boleh PDF atau gambar.");
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      redirect("/invoices/new?message=Ukuran lampiran maksimal 10 MB.");
    }

    const filePath = `${user.id}/invoices/${createAttachmentFileName(
      attachment,
      "INV",
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("document-attachments")
      .upload(filePath, attachment, {
        contentType: attachment.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload invoice attachment", uploadError);
      redirect("/invoices/new?message=Lampiran invoice gagal diupload.");
    }

    attachmentUrl = filePath;
  }

  for (const item of itemsToCreate) {
    const subject = item.invoiceNumber
      ? `INVOICE ${item.invoiceNumber} - ${vendorName}`
      : `INVOICE MASUK - ${vendorName}`;

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        type: "INVOICE",
        received_at: jakartaDateToIso(receivedAt),
        sender_name: vendorName,
        recipient_name: internalPic,
        department_id: departmentId,
        subject,
        category_id: category.id,
        notes: notes || null,
        attachment_url: attachmentUrl,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (documentError || !document) {
      console.error("Failed to create invoice document", documentError);
      await cleanupCreatedRows();
      redirect("/invoices/new?message=Gagal menyimpan salah satu dokumen invoice.");
    }

    createdDocumentIds.push(document.id);

    if (!item.invoiceNumber && !item.amount) {
      continue;
    }

    const { error: detailError } = await supabase.from("invoice_details").insert({
      document_id: document.id,
      invoice_number: item.invoiceNumber,
      amount: item.amount,
      internal_pic: internalPic,
    });

    if (detailError) {
      console.error("Failed to create invoice detail", detailError);
      await cleanupCreatedRows();
      redirect("/invoices/new?message=Gagal menyimpan detail invoice.");
    }
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  redirect("/?created=invoice");
}
