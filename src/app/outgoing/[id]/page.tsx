import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyReceiptLinkButton } from "@/components/CopyReceiptLinkButton";
import { LoadingLink } from "@/components/LoadingLink";
import { ReceiptPanel, type ReceiptSummary } from "@/components/ReceiptPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatOutgoingDestination } from "@/lib/text";
import { deleteOutgoingLetterAction } from "../actions";

type OutgoingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

type OutgoingLetter = {
  id: string;
  agenda_number: string;
  sent_at: string;
  sender_staff: string;
  sender_department: "GA" | "HRM";
  letter_number: string | null;
  destination_name: string;
  attention_to: string | null;
  subject: string | null;
  confidential: boolean;
  notes: string | null;
  batch_notes: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
};

type OutgoingBatchReceipt = {
  batch:
    | {
        token: string;
        status: "PENDING" | "CONFIRMED";
        recipient_name: string;
        confirmed_name: string | null;
        created_at: string;
        confirmed_at: string | null;
      }
    | {
        token: string;
        status: "PENDING" | "CONFIRMED";
        recipient_name: string;
        confirmed_name: string | null;
        created_at: string;
        confirmed_at: string | null;
      }[]
    | null;
};

type TimelineActivity = {
  id: string;
  message: string;
  createdAt: string;
  actor: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default async function OutgoingDetailPage({
  params,
  searchParams,
}: OutgoingDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { message } = await searchParams;
  const [{ data, error }, { data: receipt }, { data: batchItem }] =
    await Promise.all([
      supabase
        .from("outgoing_letters")
        .select(
          "id, agenda_number, sent_at, sender_staff, sender_department, letter_number, destination_name, attention_to, subject, confidential, notes, batch_notes, attachment_url, created_at, updated_at",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("receipt_requests")
        .select(
          "id, token, status, recipient_name, recipient_unit, recipient_note, signature_data, confirmed_at, created_at",
        )
        .eq("outgoing_letter_id", id)
        .maybeSingle(),
      supabase
        .from("outgoing_receipt_batch_items")
        .select(
          "batch:outgoing_receipt_batches(token, status, recipient_name, confirmed_name, created_at, confirmed_at)",
        )
        .eq("outgoing_letter_id", id)
        .maybeSingle(),
    ]);

  if (error || !data) {
    redirect("/outgoing?message=Surat keluar tidak ditemukan.");
  }

  const letter = data as OutgoingLetter;
  const receiptSummary = receipt as unknown as ReceiptSummary | null;
  const batchRelation = (batchItem as unknown as OutgoingBatchReceipt | null)
    ?.batch;
  const outgoingBatch = Array.isArray(batchRelation)
    ? batchRelation[0]
    : batchRelation;
  const timeline: TimelineActivity[] = [
    {
      id: `created-${letter.id}`,
      message: `Surat keluar ${letter.agenda_number} dibuat.`,
      createdAt: letter.created_at,
      actor: letter.sender_staff,
    },
  ];

  if (
    new Date(letter.updated_at).getTime() >
    new Date(letter.created_at).getTime() + 1000
  ) {
    timeline.push({
      id: `updated-${letter.id}`,
      message: `Data surat keluar ${letter.agenda_number} diperbarui.`,
      createdAt: letter.updated_at,
      actor: "Sistem",
    });
  }

  if (receiptSummary) {
    timeline.push({
      id: `receipt-created-${receiptSummary.id}`,
      message: "Link tanda terima surat keluar dibuat.",
      createdAt: receiptSummary.created_at,
      actor: "Sistem",
    });

    if (receiptSummary.confirmed_at) {
      timeline.push({
        id: `receipt-confirmed-${receiptSummary.id}`,
        message: `Tanda terima dikonfirmasi oleh ${
          receiptSummary.recipient_name || "penerima"
        }.`,
        createdAt: receiptSummary.confirmed_at,
        actor: receiptSummary.recipient_name || "Sistem",
      });
    }
  }

  if (outgoingBatch) {
    timeline.push({
      id: `batch-created-${outgoingBatch.token}`,
      message: `Surat dimasukkan ke tanda terima ${outgoingBatch.recipient_name}.`,
      createdAt: outgoingBatch.created_at,
      actor: "Sistem",
    });

    if (outgoingBatch.confirmed_at) {
      timeline.push({
        id: `batch-confirmed-${outgoingBatch.token}`,
        message: `Tanda terima ${outgoingBatch.recipient_name} dikonfirmasi oleh ${
          outgoingBatch.confirmed_name || "petugas penerima"
        }.`,
        createdAt: outgoingBatch.confirmed_at,
        actor: outgoingBatch.confirmed_name || "Sistem",
      });
    }
  }

  timeline.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );
  let signedAttachmentUrl: string | null = null;

  if (letter.attachment_url) {
    const { data: signedUrl } = await supabase.storage
      .from("document-attachments")
      .createSignedUrl(letter.attachment_url, 60 * 10);

    signedAttachmentUrl = signedUrl?.signedUrl ?? null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <LoadingLink
                href="/outgoing"
                pendingLabel="Kembali..."
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke daftar surat keluar
              </LoadingLink>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0A3A60] px-3 py-1.5 text-xs font-semibold text-white">
                <Send className="size-3.5" aria-hidden="true" />
                Surat Keluar
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                {letter.agenda_number}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {formatOutgoingDestination(
                  letter.destination_name,
                  letter.attention_to,
                )}
              </p>
            </div>

            <form action={deleteOutgoingLetterAction}>
              <input type="hidden" name="id" value={letter.id} />
              <ConfirmSubmitButton
                message={`Hapus surat keluar ${letter.agenda_number}?`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-[#B9151B] shadow-sm transition hover:bg-red-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Hapus
              </ConfirmSubmitButton>
            </form>
          </div>
        </section>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <FileText className="size-5 text-[#0A3A60]" aria-hidden="true" />
                Informasi Surat Keluar
              </h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <DetailItem
                  label="Tanggal kirim"
                  value={formatDate(letter.sent_at)}
                />
                <DetailItem
                  label="Nomor surat"
                  value={letter.letter_number || "-"}
                />
                <DetailItem label="Staff pengirim" value={letter.sender_staff} />
                <DetailItem
                  label="Departemen pengirim"
                  value={
                    letter.sender_department === "GA"
                      ? "General Affair (GA)"
                      : "Human Resource Management (HRM)"
                  }
                />
                <DetailItem
                  label="Tujuan / U.P"
                  value={formatOutgoingDestination(
                    letter.destination_name,
                    letter.attention_to,
                  )}
                />
                <DetailItem
                  label="Sifat"
                  value={
                    letter.confidential ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        Confidential
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Catatan</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                {letter.notes || letter.batch_notes || "Tidak ada catatan."}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            {outgoingBatch ? (
              <div className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-orange-700">
                  <Send className="size-5" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">
                    Tanda Terima Surat Keluar Harian
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Surat ini sudah tergabung dalam tanda terima harian.
                </p>
                <span
                  className={[
                    "mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    outgoingBatch.status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-100 text-orange-700",
                  ].join(" ")}
                >
                  {outgoingBatch.status === "CONFIRMED"
                    ? "Sudah diterima"
                    : "Menunggu konfirmasi"}
                </span>
                <div className="mt-4">
                  <CopyReceiptLinkButton
                    href={`/receipt-outgoing-batch/${outgoingBatch.token}`}
                  />
                </div>
              </div>
            ) : (
              <ReceiptPanel
                receipt={receiptSummary}
                targetType="OUTGOING"
                targetId={letter.id}
                returnTo={`/outgoing/${letter.id}`}
              />
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Paperclip className="size-5 text-[#0A3A60]" aria-hidden="true" />
                Lampiran
              </h2>
              {signedAttachmentUrl ? (
                <a
                  href={signedAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white transition hover:bg-[#082f4f]"
                >
                  Buka lampiran
                </a>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Surat keluar ini belum memiliki lampiran.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarClock
                  className="size-5 text-[#0A3A60]"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold text-slate-950">
                  Timeline Aktivitas
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                {timeline.map((activity) => (
                  <div
                    key={activity.id}
                    className="border-l-2 border-slate-200 pl-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {activity.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(activity.createdAt)} oleh {activity.actor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <UserRound className="size-5 text-[#0A3A60]" aria-hidden="true" />
                Metadata
              </h2>
              <div className="mt-5 space-y-5">
                <DetailItem label="Dibuat" value={formatDate(letter.created_at)} />
                <DetailItem
                  label="Terakhir diubah"
                  value={formatDate(letter.updated_at)}
                />
                <DetailItem
                  label="Agenda"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock className="size-4 text-slate-400" />
                      {letter.agenda_number}
                    </span>
                  }
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
