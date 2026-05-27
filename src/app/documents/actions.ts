"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DocumentType = "LETTER" | "INVOICE";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectPath(type: DocumentType, message: string) {
  const basePath = type === "INVOICE" ? "/invoices" : "/documents";

  return `${basePath}?message=${encodeURIComponent(message)}`;
}

function revalidateDocumentViews(documentId: string) {
  revalidatePath("/");
  revalidatePath("/documents");
  revalidatePath("/invoices");
  revalidatePath("/search");
  revalidatePath("/reports");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/invoices/${documentId}`);
}

export async function deleteDocumentAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = formString(formData, "id");
  const expectedType = formString(formData, "type") as DocumentType;

  if (!id || !["LETTER", "INVOICE"].includes(expectedType)) {
    redirect("/documents?message=Data dokumen tidak valid.");
  }

  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("id, type, attachment_url")
    .eq("id", id)
    .single();

  if (lookupError || !document || document.type !== expectedType) {
    redirect(redirectPath(expectedType, "Dokumen tidak ditemukan."));
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("type", expectedType);

  if (deleteError) {
    console.error("Failed to delete document", deleteError);
    redirect(
      redirectPath(
        expectedType,
        "Dokumen gagal dihapus. Pastikan akun memiliki akses admin.",
      ),
    );
  }

  if (document.attachment_url) {
    const { error: storageError } = await supabase.storage
      .from("document-attachments")
      .remove([document.attachment_url]);

    if (storageError) {
      console.error("Failed to remove document attachment", storageError);
    }
  }

  revalidateDocumentViews(id);
  redirect(
    redirectPath(
      expectedType,
      expectedType === "INVOICE"
        ? "Invoice berhasil dihapus."
        : "Dokumen berhasil dihapus.",
    ),
  );
}
