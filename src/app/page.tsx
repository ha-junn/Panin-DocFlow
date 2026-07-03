import type { SupabaseClient } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  Layers3,
  MailPlus,
  MoreHorizontal,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DigitalClock } from "@/components/DigitalClock";
import { LoadingLink } from "@/components/LoadingLink";
import {
  getCurrentJakartaMonth,
  getJakartaMonthDateRange,
} from "@/lib/date";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Tone = "blue" | "red" | "teal" | "amber";
type DbDocumentType = "LETTER" | "INVOICE";
type DocumentType = "Surat" | "Invoice";

type Metric = {
  label: string;
  value: string;
  change: string;
  caption: string;
  icon: LucideIcon;
  tone: Tone;
};

type TrendPoint = {
  day: string;
  mail: number;
  invoice: number;
};

type MonthlyTrendPoint = {
  key: string;
  label: string;
  mail: number;
  invoice: number;
  total: number;
};

type DepartmentStat = {
  department: string;
  document: number;
  invoice: number;
  total: number;
  percent: number;
};

type TypeStat = {
  type: DocumentType;
  total: number;
  percent: number;
};

type DocumentRow = {
  id: string;
  agenda: string;
  type: DocumentType;
  received: string;
  sender: string;
  subject: string;
  department: string;
  category: string;
  pic: string;
  creator: string;
};

type ActivityRow = {
  event_id: string;
  document_id: string | null;
  agenda_number: string | null;
  document_type: DbDocumentType | null;
  actor_name: string | null;
  event_type: string;
  message: string | null;
  created_at: string;
};

type DashboardSummary = {
  letterToday: number;
  invoiceToday: number;
  documentsThisMonth: number;
  documentsInProgress: number;
  documentsNew: number;
  documentsDone: number;
  documentsArchived: number;
};

type RawSummary = {
  letter_today: number | null;
  invoice_today: number | null;
  documents_this_month: number | null;
  documents_in_progress: number | null;
  documents_new: number | null;
  documents_done: number | null;
  documents_archived: number | null;
};

type RawTrend = {
  day: string;
  letter_count: number | null;
  invoice_count: number | null;
};

type RawDocument = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  department: { name: string } | null;
  category: { name: string } | null;
  invoice_details:
    | { internal_pic: string | null }
    | { internal_pic: string | null }[]
    | null;
  creator: { full_name: string } | null;
};

type AnalyticsDocument = {
  type: DbDocumentType;
  received_at: string;
  department: { name: string } | null;
  category: { name: string } | null;
};

type DashboardMonthWindow = {
  months: MonthlyTrendPoint[];
  startIso: string;
  endIso: string;
};

const emptySummary: DashboardSummary = {
  letterToday: 0,
  invoiceToday: 0,
  documentsThisMonth: 0,
  documentsInProgress: 0,
  documentsNew: 0,
  documentsDone: 0,
  documentsArchived: 0,
};

const typeStyles: Record<DocumentType, string> = {
  Surat: "bg-[#0A3A60] text-white",
  Invoice: "bg-[#D71920] text-white",
};

const toneStyles: Record<
  Tone,
  {
    ring: string;
    accent: string;
  }
> = {
  blue: {
    ring: "bg-[#0A3A60]/10 text-[#0A3A60]",
    accent: "from-[#0A3A60]/14",
  },
  red: {
    ring: "bg-[#D71920]/10 text-[#B9151B]",
    accent: "from-[#D71920]/12",
  },
  teal: {
    ring: "bg-teal-100 text-teal-700",
    accent: "from-teal-500/12",
  },
  amber: {
    ring: "bg-amber-100 text-amber-700",
    accent: "from-amber-500/14",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
});

const monthLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  year: "numeric",
});

const jakartaMonthKeyFormatter = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  timeZone: "Asia/Jakarta",
  year: "numeric",
});

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDocumentType(type: DbDocumentType | null): DocumentType {
  return type === "INVOICE" ? "Invoice" : "Surat";
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function getJakartaMonthKey(value: string) {
  const parts = jakartaMonthKeyFormatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";

  return `${year}-${month}`;
}

function getDashboardMonthWindow(monthCount = 6): DashboardMonthWindow {
  const [currentYearText, currentMonthText] = getCurrentJakartaMonth().split("-");
  const currentYear = Number(currentYearText);
  const currentMonth = Number(currentMonthText);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonth - monthCount + index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    return {
      key,
      label: monthLabelFormatter.format(date),
      mail: 0,
      invoice: 0,
      total: 0,
    };
  });
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const [startYear, startMonth] = firstMonth.key.split("-").map(Number);
  const [endYear, endMonth] = lastMonth.key.split("-").map(Number);
  const { startIso } = getJakartaMonthDateRange(startYear, startMonth);
  const { endIso } = getJakartaMonthDateRange(endYear, endMonth);

  return { months, startIso, endIso };
}

function getInvoicePic(invoiceDetails: RawDocument["invoice_details"]) {
  if (Array.isArray(invoiceDetails)) {
    return invoiceDetails[0]?.internal_pic ?? null;
  }

  return invoiceDetails?.internal_pic ?? null;
}

function createMetrics(summary: DashboardSummary): Metric[] {
  return [
    {
      label: "Surat hari ini",
      value: formatNumber(summary.letterToday),
      change: "hari ini",
      caption: "berdasarkan tanggal diterima",
      icon: FileText,
      tone: "blue",
    },
    {
      label: "Invoice hari ini",
      value: formatNumber(summary.invoiceToday),
      change: `${formatNumber(summary.invoiceToday)}`,
      caption: "invoice masuk hari ini",
      icon: ClipboardList,
      tone: "red",
    },
    {
      label: "Dokumen bulan ini",
      value: formatNumber(summary.documentsThisMonth),
      change: "bulan berjalan",
      caption: "surat dan invoice bulan berjalan",
      icon: Inbox,
      tone: "teal",
    },
    {
      label: "Total hari ini",
      value: formatNumber(summary.letterToday + summary.invoiceToday),
      change: "surat + invoice",
      caption: "dokumen diterima hari ini",
      icon: Inbox,
      tone: "amber",
    },
  ];
}

function mapSummary(row?: RawSummary): DashboardSummary {
  if (!row) {
    return emptySummary;
  }

  return {
    letterToday: toNumber(row.letter_today),
    invoiceToday: toNumber(row.invoice_today),
    documentsThisMonth: toNumber(row.documents_this_month),
    documentsInProgress: toNumber(row.documents_in_progress),
    documentsNew: toNumber(row.documents_new),
    documentsDone: toNumber(row.documents_done),
    documentsArchived: toNumber(row.documents_archived),
  };
}

function mapTrend(rows: RawTrend[] | null): TrendPoint[] {
  if (!rows?.length) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));

      return {
        day: dayFormatter.format(date),
        mail: 0,
        invoice: 0,
      };
    });
  }

  return rows.map((row) => ({
    day: dayFormatter.format(new Date(row.day)),
    mail: toNumber(row.letter_count),
    invoice: toNumber(row.invoice_count),
  }));
}

function mapDocuments(rows: RawDocument[] | null): DocumentRow[] {
  if (!rows?.length) {
    return [];
  }

  return rows.map((row) => ({
    id: row.id,
    agenda: row.agenda_number,
    type: formatDocumentType(row.type),
    received: formatDateTime(row.received_at),
    sender: row.sender_name,
    subject: row.subject,
    department: row.department?.name ?? "-",
    category: row.category?.name ?? "-",
    pic:
      row.type === "INVOICE"
        ? getInvoicePic(row.invoice_details) ?? row.recipient_name ?? "-"
        : row.recipient_name ?? "-",
    creator: row.creator?.full_name ?? "-",
  }));
}

function buildMonthlyTrend(
  rows: AnalyticsDocument[],
  monthWindow: DashboardMonthWindow,
): MonthlyTrendPoint[] {
  const trendMap = new Map(
    monthWindow.months.map((month) => [month.key, { ...month }]),
  );

  rows.forEach((document) => {
    const key = getJakartaMonthKey(document.received_at);
    const trend = trendMap.get(key);

    if (!trend) {
      return;
    }

    if (document.type === "INVOICE") {
      trend.invoice += 1;
    } else {
      trend.mail += 1;
    }

    trend.total += 1;
  });

  return monthWindow.months.map((month) => trendMap.get(month.key) ?? month);
}

function buildDepartmentStats(rows: AnalyticsDocument[]): DepartmentStat[] {
  const total = Math.max(1, rows.length);
  const stats = rows.reduce<Record<string, Omit<DepartmentStat, "percent">>>(
    (accumulator, document) => {
      const department = document.department?.name ?? "Tanpa departemen";
      accumulator[department] ??= {
        department,
        document: 0,
        invoice: 0,
        total: 0,
      };

      if (document.type === "INVOICE") {
        accumulator[department].invoice += 1;
      } else {
        accumulator[department].document += 1;
      }

      accumulator[department].total += 1;
      return accumulator;
    },
    {},
  );

  return Object.values(stats)
    .map((item) => ({
      ...item,
      percent: Math.round((item.total / total) * 100),
    }))
    .sort((first, second) => second.total - first.total || first.department.localeCompare(second.department))
    .slice(0, 6);
}

function buildTypeStats(rows: AnalyticsDocument[]): TypeStat[] {
  const total = Math.max(1, rows.length);
  const letterTotal = rows.filter((document) => document.type === "LETTER").length;
  const invoiceTotal = rows.filter((document) => document.type === "INVOICE").length;

  return [
    {
      type: "Surat",
      total: letterTotal,
      percent: Math.round((letterTotal / total) * 100),
    },
    {
      type: "Invoice",
      total: invoiceTotal,
      percent: Math.round((invoiceTotal / total) * 100),
    },
  ];
}

async function getDashboardData(supabase: SupabaseClient) {
  const monthWindow = getDashboardMonthWindow();
  const [summaryResult, trendResult, documentsResult, analyticsResult, activityResult] =
    await Promise.all([
      supabase.rpc("get_dashboard_summary"),
      supabase.rpc("get_weekly_document_trend"),
      supabase
        .from("documents")
        .select(
          `
          id,
          agenda_number,
          type,
          received_at,
          sender_name,
          recipient_name,
          subject,
          department:departments(name),
          category:document_categories(name),
          invoice_details(internal_pic),
          creator:profiles!documents_created_by_fkey(full_name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("documents")
        .select(
          `
          type,
          received_at,
          department:departments(name),
          category:document_categories(name)
        `,
        )
        .gte("received_at", monthWindow.startIso)
        .lt("received_at", monthWindow.endIso)
        .order("received_at", { ascending: true }),
      supabase.rpc("get_recent_document_activity", { limit_count: 8 }),
    ]);

  if (summaryResult.error) {
    console.error("Failed to load dashboard summary", summaryResult.error);
  }

  if (trendResult.error) {
    console.error("Failed to load weekly document trend", trendResult.error);
  }

  if (documentsResult.error) {
    console.error("Failed to load latest documents", documentsResult.error);
  }

  if (analyticsResult.error) {
    console.error("Failed to load dashboard analytics", analyticsResult.error);
  }

  if (activityResult.error) {
    console.error("Failed to load recent activity", activityResult.error);
  }

  const analyticsDocuments = (analyticsResult.data ?? []) as unknown as AnalyticsDocument[];

  return {
    summary: mapSummary((summaryResult.data as RawSummary[] | null)?.[0]),
    trend: mapTrend(trendResult.data as RawTrend[] | null),
    documents: mapDocuments(documentsResult.data as RawDocument[] | null),
    monthlyTrend: buildMonthlyTrend(analyticsDocuments, monthWindow),
    departmentStats: buildDepartmentStats(analyticsDocuments),
    typeStats: buildTypeStats(analyticsDocuments),
    activity: (activityResult.data ?? []) as ActivityRow[],
  };
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const tone = toneStyles[metric.tone];

  return (
    <article className="group relative min-h-[146px] overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A3A60]/20 hover:shadow-md hover:shadow-slate-900/5">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tone.accent} to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{metric.label}</p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <span className="mb-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {metric.change}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{metric.caption}</p>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${tone.ring} transition group-hover:scale-105`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function WeeklyTrendChart({ trend }: { trend: TrendPoint[] }) {
  const maxValue = Math.max(
    1,
    ...trend.flatMap((item) => [item.mail, item.invoice]),
  );
  const totalWeeklyDocuments = trend.reduce(
    (total, item) => total + item.mail + item.invoice,
    0,
  );
  const averageDailyDocuments = Math.round(totalWeeklyDocuments / 7);
  const peakDay =
    trend
      .map((item) => ({
        day: item.day,
        total: item.mail + item.invoice,
      }))
      .sort((a, b) => b.total - a.total)[0] ?? null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Tren Surat dan Invoice
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan volume dokumen selama 7 hari terakhir.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#0A3A60]" />
            Surat
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#D71920]" />
            Invoice
          </span>
        </div>
      </div>

      <div className="mt-7 grid h-64 grid-cols-7 items-end gap-3 border-b border-slate-200 pb-4">
        {trend.map((item) => {
          const mailHeight = item.mail > 0 ? `${(item.mail / maxValue) * 100}%` : "0%";
          const invoiceHeight =
            item.invoice > 0 ? `${(item.invoice / maxValue) * 100}%` : "0%";

          return (
            <div
              key={item.day}
              className="flex h-full min-w-0 flex-col justify-end gap-3"
            >
              <div className="flex h-full items-end justify-center gap-1.5">
                <div
                  className="w-full max-w-6 rounded-t-md bg-[#0A3A60] shadow-sm transition-all hover:bg-[#082f4f]"
                  style={{ height: mailHeight }}
                  title={`${item.mail} surat`}
                />
                <div
                  className="w-full max-w-6 rounded-t-md bg-[#D71920] shadow-sm transition-all hover:bg-[#b9151b]"
                  style={{ height: invoiceHeight }}
                  title={`${item.invoice} invoice`}
                />
              </div>
              <p className="text-center text-xs font-medium text-slate-500">
                {item.day}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Total 7 hari</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatNumber(totalWeeklyDocuments)} dokumen
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Rata-rata harian</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatNumber(averageDailyDocuments)} dokumen
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Hari tersibuk</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {peakDay && peakDay.total > 0 ? peakDay.day : "-"}
          </p>
        </div>
      </div>
    </section>
  );
}

function MonthlyTrendChart({ trend }: { trend: MonthlyTrendPoint[] }) {
  const maxValue = Math.max(1, ...trend.map((item) => item.total));
  const totalDocuments = trend.reduce((total, item) => total + item.total, 0);
  const bestMonth =
    trend.slice().sort((first, second) => second.total - first.total)[0] ?? null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
            <BarChart3 className="size-3.5" aria-hidden="true" />
            Trend Bulanan
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-950">
            Volume Surat dan Invoice
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Perbandingan dokumen masuk selama 6 bulan terakhir.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-xs font-medium text-slate-500">Total periode</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatNumber(totalDocuments)} dokumen
          </p>
        </div>
      </div>

      <div className="mt-7 grid h-72 grid-cols-6 items-end gap-3 border-b border-slate-200 pb-4">
        {trend.map((item) => {
          const mailHeight = item.mail > 0 ? `${(item.mail / maxValue) * 100}%` : "0%";
          const invoiceHeight =
            item.invoice > 0 ? `${(item.invoice / maxValue) * 100}%` : "0%";

          return (
            <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-3">
              <div className="flex h-full items-end justify-center gap-1.5 rounded-lg bg-slate-50 px-2 pt-3">
                <div
                  className="w-full max-w-8 rounded-t-md bg-[#0A3A60] shadow-sm transition hover:bg-[#082f4f]"
                  style={{ height: mailHeight }}
                  title={`${item.label}: ${item.mail} surat`}
                />
                <div
                  className="w-full max-w-8 rounded-t-md bg-[#D71920] shadow-sm transition hover:bg-[#b9151b]"
                  style={{ height: invoiceHeight }}
                  title={`${item.label}: ${item.invoice} invoice`}
                />
              </div>
              <div className="text-center">
                <p className="truncate text-xs font-semibold text-slate-700">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatNumber(item.total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#0A3A60]" />
            Surat
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#D71920]" />
            Invoice
          </span>
        </div>
        <p>
          Bulan tertinggi:{" "}
          <span className="font-semibold text-slate-950">
            {bestMonth && bestMonth.total > 0 ? bestMonth.label : "-"}
          </span>
        </p>
      </div>
    </section>
  );
}

function DocumentTypeStats({ stats }: { stats: TypeStat[] }) {
  const total = stats.reduce((sum, item) => sum + item.total, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#D71920]/15 bg-[#D71920]/5 px-3 py-1 text-xs font-semibold text-[#B9151B]">
        <Layers3 className="size-3.5" aria-hidden="true" />
        Statistik Jenis Dokumen
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">
        Komposisi 6 Bulan Terakhir
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Pembagian volume antara surat dan invoice.
      </p>

      <div className="mt-6 space-y-4">
        {stats.map((item) => (
          <div key={item.type} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DocumentTypeBadge type={item.type} />
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {formatNumber(item.total)}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {item.percent}%
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white">
              <div
                className={[
                  "h-2 rounded-full",
                  item.type === "Invoice" ? "bg-[#D71920]" : "bg-[#0A3A60]",
                ].join(" ")}
                style={{ width: `${Math.max(5, item.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          Total analytics
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-950">
          {formatNumber(total)} dokumen
        </p>
      </div>
    </section>
  );
}

function DepartmentDistribution({
  stats,
}: {
  stats: DepartmentStat[];
}) {
  const totalDocuments = stats.reduce((total, item) => total + item.total, 0);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
            <Building2 className="size-3.5" aria-hidden="true" />
            Statistik Departemen
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-950">
            Tujuan Internal Teratas
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Sebaran surat dan invoice dalam 6 bulan terakhir.
          </p>
        </div>
        <span className="rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-2.5 py-1 text-xs font-semibold text-[#0A3A60]">
          {formatNumber(totalDocuments)} data
        </span>
      </div>

      {stats.length > 0 ? (
        <div className="mt-5 space-y-5">
          {stats.map((item) => (
            <div
              key={item.department}
              className="rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {item.department}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(item.document)} surat ·{" "}
                    {formatNumber(item.invoice)} invoice
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#0A3A60]">
                  {formatNumber(item.total)}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-[#0A3A60]"
                  style={{ width: `${Math.max(8, item.percent)}%` }}
                />
              </div>
              <div className="mt-2 text-right text-xs font-medium text-slate-500">
                {item.percent}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada statistik departemen
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Data akan muncul setelah dokumen atau invoice dibuat.
          </p>
        </div>
      )}
    </aside>
  );
}

function getActivityLabel(eventType: string) {
  const labels: Record<string, string> = {
    ARCHIVED: "Diarsipkan",
    ATTACHMENT_UPLOADED: "Lampiran",
    COMMENTED: "Komentar",
    CREATED: "Dibuat",
    DELETED: "Dihapus",
    MASTER_DATA_CHANGED: "Master data",
    STATUS_CHANGED: "Status",
    UPDATED: "Diperbarui",
  };

  return labels[eventType] ?? eventType;
}

function RecentActivity({ activities }: { activities: ActivityRow[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Activity className="size-3.5" aria-hidden="true" />
            Aktivitas Terbaru
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-950">
            Timeline Operasional
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Aktivitas terbaru dari dokumen dan invoice.
          </p>
        </div>
        <LoadingLink
          href="/search"
          pendingLabel="Membuka..."
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
        >
          Lihat data
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </LoadingLink>
      </div>

      {activities.length > 0 ? (
        <div className="mt-6 space-y-4">
          {activities.map((activity) => (
            <div key={activity.event_id} className="flex gap-3">
              <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Activity className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {getActivityLabel(activity.event_type)}
                  </span>
                  {activity.document_type ? (
                    <DocumentTypeBadge type={formatDocumentType(activity.document_type)} />
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {activity.agenda_number ?? "Aktivitas dokumen"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                  {activity.message ?? getActivityLabel(activity.event_type)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatDateTime(activity.created_at)}
                  {activity.actor_name ? ` · ${activity.actor_name}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada aktivitas
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Timeline akan terisi setelah dokumen diproses.
          </p>
        </div>
      )}
    </section>
  );
}

function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${typeStyles[type]}`}
    >
      {type}
    </span>
  );
}

function DocumentsTable({ documents }: { documents: DocumentRow[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Dokumen Terbaru
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Surat dan invoice terakhir yang masuk ke meja resepsionis.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="border-b border-slate-200 px-5 py-3">
                Nomor Agenda
              </th>
              <th className="border-b border-slate-200 px-5 py-3">Jenis</th>
              <th className="border-b border-slate-200 px-5 py-3">Tanggal</th>
              <th className="border-b border-slate-200 px-5 py-3">
                Pengirim/Vendor
              </th>
              <th className="border-b border-slate-200 px-5 py-3">Perihal</th>
              <th className="border-b border-slate-200 px-5 py-3">
                Departemen
              </th>
              <th className="border-b border-slate-200 px-5 py-3">Kategori</th>
              <th className="border-b border-slate-200 px-5 py-3">PIC</th>
              <th className="border-b border-slate-200 px-5 py-3 text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.length > 0 ? (
              documents.map((document) => (
                <tr
                  key={document.agenda}
                  className="group transition hover:bg-slate-50/80"
                >
                  <td className="border-b border-slate-100 px-5 py-4">
                    <p className="text-sm font-semibold text-slate-950">
                      {document.agenda}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Dibuat oleh {document.creator}
                    </p>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4">
                    <DocumentTypeBadge type={document.type} />
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                    {document.received}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-900">
                    {document.sender}
                  </td>
                  <td className="max-w-xs border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                    <span className="line-clamp-2">{document.subject}</span>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                    {document.department}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                    {document.category}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
                    {document.pic}
                  </td>
                  <td className="border-b border-slate-100 px-5 py-4 text-right">
                    <LoadingLink
                      href={
                        document.type === "Invoice"
                          ? `/invoices/${document.id}`
                          : `/documents/${document.id}`
                      }
                      pendingLabel=""
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-[#0A3A60] hover:shadow-sm"
                      aria-label={`Lihat detail ${document.agenda}`}
                      title="Lihat detail"
                    >
                      <MoreHorizontal className="size-5" aria-hidden="true" />
                    </LoadingLink>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Belum ada dokumen masuk
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Data surat dan invoice akan tampil setelah dibuat dari form.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Menampilkan {formatNumber(documents.length)} dokumen terbaru.
        </p>
        <LoadingLink
          href="/search"
          pendingLabel="Membuka..."
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
        >
          Lihat semua dokumen
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </LoadingLink>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getDashboardData(supabase);
  const metrics = createMetrics(dashboardData.summary);

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[linear-gradient(135deg,rgba(10,58,96,0.08),rgba(215,25,32,0.05)_48%,rgba(15,94,122,0.08))] lg:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0A3A60]/15 bg-[#0A3A60]/5 px-3 py-1 text-xs font-semibold text-[#0A3A60]">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Dashboard Operasional
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                <span className="text-[#F04444]">Kotak</span>
                <span className="text-[#38BDF8]">Surat</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Monitor surat masuk dan invoice dalam satu ruang kerja
                resepsionis yang cepat, rapi, dan terhubung ke data Supabase.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto lg:items-end">
              <DigitalClock />
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
                <LoadingLink
                  href="/documents/new?type=letter"
                  pendingLabel="Membuka..."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#082f4f] hover:shadow-md"
                >
                  <MailPlus className="size-4" aria-hidden="true" />
                  Tambah Dokumen
                </LoadingLink>
                <LoadingLink
                  href="/invoices/new"
                  pendingLabel="Membuka..."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#D71920] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#b9151b] hover:shadow-md"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Invoice
                </LoadingLink>
                <LoadingLink
                  href="/outgoing/new"
                  pendingLabel="Membuka..."
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0F5E7A] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0A4D63] hover:shadow-md"
                >
                  <Send className="size-4" aria-hidden="true" />
                  Tambah Surat Keluar
                </LoadingLink>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <MonthlyTrendChart trend={dashboardData.monthlyTrend} />
          <DocumentTypeStats stats={dashboardData.typeStats} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <DepartmentDistribution stats={dashboardData.departmentStats} />
          <RecentActivity activities={dashboardData.activity} />
        </section>

        <DocumentsTable documents={dashboardData.documents} />

        <WeeklyTrendChart trend={dashboardData.trend} />
      </div>
    </AppLayout>
  );
}
