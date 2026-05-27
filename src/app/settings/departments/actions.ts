"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function settingsPath(message: string) {
  return `/settings/departments?message=${encodeURIComponent(message)}`;
}

async function getAuthenticatedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return supabase;
}

function revalidateDepartmentViews() {
  revalidatePath("/settings/departments");
  revalidatePath("/documents/new");
  revalidatePath("/invoices/new");
  revalidatePath("/search");
  revalidatePath("/documents");
  revalidatePath("/invoices");
}

export async function createDepartmentAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const name = formString(formData, "name");
  const code = formString(formData, "code").toUpperCase();

  if (!name || !code) {
    redirect(settingsPath("Nama departemen dan kode wajib diisi."));
  }

  const { error } = await supabase.from("departments").insert({ name, code });

  if (error) {
    console.error("Failed to create department", error);
    redirect(settingsPath("Departemen gagal ditambahkan. Cek duplikasi nama/kode."));
  }

  revalidateDepartmentViews();
  redirect(settingsPath("Departemen berhasil ditambahkan."));
}

export async function updateDepartmentAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");
  const name = formString(formData, "name");
  const code = formString(formData, "code").toUpperCase();

  if (!id || !name || !code) {
    redirect(settingsPath("Data departemen belum lengkap."));
  }

  const { error } = await supabase
    .from("departments")
    .update({ name, code })
    .eq("id", id);

  if (error) {
    console.error("Failed to update department", error);
    redirect(settingsPath("Departemen gagal diperbarui. Cek duplikasi nama/kode."));
  }

  revalidateDepartmentViews();
  redirect(settingsPath("Departemen berhasil diperbarui."));
}

export async function deleteDepartmentAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");

  if (!id) {
    redirect(settingsPath("Departemen tidak valid."));
  }

  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete department", error);
    redirect(
      settingsPath(
        "Departemen gagal dihapus. Biasanya karena masih dipakai oleh dokumen.",
      ),
    );
  }

  revalidateDepartmentViews();
  redirect(settingsPath("Departemen berhasil dihapus."));
}
