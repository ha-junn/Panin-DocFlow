"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DbDocumentType = "LETTER" | "INVOICE";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalFormString(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value || null;
}

function parseOptionalAmount(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/rp/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return amount;
}

function revalidateDocumentViews(documentId: string) {
  revalidatePath("/");
  revalidatePath("/documents");
  revalidatePath("/invoices");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${documentId}/edit`);
}

export async function updateDocumentAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = formString(formData, "document_id");
  const documentType = formString(formData, "document_type") as DbDocumentType;
  const receivedAt = formString(formData, "received_at");
  const senderName = formString(formData, "sender_name");
  const recipientName = formString(formData, "recipient_name");
  const departmentId = formString(formData, "department_id");
  const subject = formString(formData, "subject");
  const notes = optionalFormString(formData, "notes");
  const letterNumber = optionalFormString(formData, "letter_number");
  const letterDate = optionalFormString(formData, "letter_date");
  const employeeName = optionalFormString(formData, "employee_name");
  const documentAmountInput = formString(formData, "document_amount");
  const documentAmount = parseOptionalAmount(documentAmountInput);
  const categoryId = formString(formData, "category_id");
  const invoiceNumber = optionalFormString(formData, "invoice_number");
  const amountInput = formString(formData, "amount");
  const amount = parseOptionalAmount(amountInput);

  if (!documentId || !["LETTER", "INVOICE"].includes(documentType)) {
    redirect("/");
  }

  if (
    !receivedAt ||
    !senderName ||
    !recipientName ||
    !departmentId ||
    !subject ||
    !categoryId
  ) {
    redirect(
      `/documents/${documentId}/edit?message=${encodeURIComponent(
        "Lengkapi semua field wajib sebelum menyimpan.",
      )}`,
    );
  }

  if (amount === undefined) {
    redirect(
      `/documents/${documentId}/edit?message=${encodeURIComponent(
        "Nominal harus lebih dari 0 atau dikosongkan.",
      )}`,
    );
  }

  if (documentAmount === undefined) {
    redirect(
      `/documents/${documentId}/edit?message=${encodeURIComponent(
        "Total dokumen harus berupa angka Rupiah lebih dari 0 atau dikosongkan.",
      )}`,
    );
  }

  if (documentType === "INVOICE" && invoiceNumber) {
    const { data: existingInvoice, error: existingError } = await supabase
      .from("invoice_details")
      .select("document_id")
      .eq("invoice_number", invoiceNumber)
      .neq("document_id", documentId)
      .maybeSingle();

    if (existingError) {
      console.error("Failed to validate invoice number", existingError);
      redirect(
        `/documents/${documentId}/edit?message=${encodeURIComponent(
          "Gagal validasi nomor invoice.",
        )}`,
      );
    }

    if (existingInvoice) {
      redirect(
        `/documents/${documentId}/edit?message=${encodeURIComponent(
          `Nomor invoice ${invoiceNumber} sudah digunakan.`,
        )}`,
      );
    }
  }

  const documentPayload = {
    received_at: new Date(receivedAt).toISOString(),
    sender_name: senderName,
    recipient_name: recipientName,
    department_id: departmentId,
    subject,
    notes,
    category_id: categoryId,
    updated_by: user.id,
    ...(documentType === "LETTER"
      ? {
          letter_number: letterNumber,
          letter_date: letterDate,
          employee_name: employeeName,
          amount: documentAmount,
        }
      : {}),
  };

  const { error: documentError } = await supabase
    .from("documents")
    .update(documentPayload)
    .eq("id", documentId);

  if (documentError) {
    console.error("Failed to update document", documentError);
    redirect(
      `/documents/${documentId}/edit?message=${encodeURIComponent(
        "Dokumen gagal diperbarui. Pastikan Anda punya izin edit dokumen ini.",
      )}`,
    );
  }

  if (documentType === "INVOICE") {
    const { data: existingDetail, error: detailLookupError } = await supabase
      .from("invoice_details")
      .select("id")
      .eq("document_id", documentId)
      .maybeSingle();

    if (detailLookupError) {
      console.error("Failed to find invoice detail", detailLookupError);
      redirect(
        `/documents/${documentId}/edit?message=${encodeURIComponent(
          "Dokumen diperbarui, tapi detail invoice gagal dicek.",
        )}`,
      );
    }

    const invoiceDetailPayload = {
      invoice_number: invoiceNumber,
      amount,
      internal_pic: recipientName,
    };

    if (existingDetail) {
      const { error: detailUpdateError } = await supabase
        .from("invoice_details")
        .update(invoiceDetailPayload)
        .eq("document_id", documentId);

      if (detailUpdateError) {
        console.error("Failed to update invoice detail", detailUpdateError);
        redirect(
          `/documents/${documentId}/edit?message=${encodeURIComponent(
            "Dokumen diperbarui, tapi detail invoice gagal disimpan.",
          )}`,
        );
      }
    } else if (invoiceNumber || amount) {
      const { error: detailInsertError } = await supabase
        .from("invoice_details")
        .insert({
          document_id: documentId,
          ...invoiceDetailPayload,
        });

      if (detailInsertError) {
        console.error("Failed to create invoice detail", detailInsertError);
        redirect(
          `/documents/${documentId}/edit?message=${encodeURIComponent(
            "Dokumen diperbarui, tapi detail invoice gagal dibuat.",
          )}`,
        );
      }
    }
  }

  revalidateDocumentViews(documentId);
  redirect(`/documents/${documentId}?message=Dokumen berhasil diperbarui.`);
}
