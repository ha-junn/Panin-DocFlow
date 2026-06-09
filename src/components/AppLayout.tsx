"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileArchive,
  FileText,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Search,
  Send,
  Settings,
  LogOut,
  Loader2,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { LoadingLink } from "@/components/LoadingLink";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey: keyof SidebarCounts | null;
};

type SidebarCounts = {
  documents: number | null;
  invoices: number | null;
  outgoing: number | null;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badgeKey: null,
  },
  {
    label: "Pencarian",
    href: "/search",
    icon: Search,
    badgeKey: null,
  },
  {
    label: "Dokumen",
    href: "/documents",
    icon: FileText,
    badgeKey: "documents",
  },
  {
    label: "Invoice Masuk",
    href: "/invoices",
    icon: ClipboardList,
    badgeKey: "invoices",
  },
  {
    label: "Surat Keluar",
    href: "/outgoing",
    icon: Send,
    badgeKey: "outgoing",
  },
  {
    label: "Tanda Terima",
    href: "/receipts",
    icon: ReceiptText,
    badgeKey: null,
  },
  {
    label: "Laporan",
    href: "/reports",
    icon: FileArchive,
    badgeKey: null,
  },
  {
    label: "Pengaturan",
    href: "/settings/departments",
    icon: Settings,
    badgeKey: null,
  },
];

const branchProfile = {
  code: "HRM-GA",
  name: "Pusat",
  operator: "HARJUN",
  role: "Admin",
};

const runningNotice =
  "Panin DocFlow aktif | Dikembangkan oleh Aprijal | Aktif sejak 02 Juni 2026 | Catat dokumen sesuai tanggal diterima | Pastikan lampiran terbaca jelas | Backup data setiap akhir bulan";

function SidebarContent({
  counts,
  onNavigate,
}: {
  counts: SidebarCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[#0A3A60] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative size-12 overflow-hidden rounded-lg">
            <Image
              src="/panin-docflow-symbol-v2.png"
              alt="Logo Panin DocFlow"
              fill
              sizes="48px"
              className="object-contain object-center"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold leading-5 tracking-normal text-white">
              <span className="text-[#F04444]">Panin</span>
              <span className="text-[#38BDF8]">Bank</span>
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-sky-100">
              DocFlow
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Navigasi utama">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const badgeValue =
            item.badgeKey && counts[item.badgeKey] !== null
              ? String(counts[item.badgeKey])
              : null;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <LoadingLink
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={[
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                isActive
                  ? "bg-white text-[#0A3A60] shadow-sm"
                  : "text-sky-50 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon
                className={[
                  "size-4 shrink-0",
                  isActive ? "text-[#0A3A60]" : "text-sky-100",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badgeValue ? (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive
                      ? "bg-[#0A3A60] text-white"
                      : "bg-white/15 text-sky-50",
                  ].join(" ")}
                >
                  {badgeValue}
                </span>
              ) : null}
            </LoadingLink>
          );
        })}
      </nav>
    </div>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-[#D71920] disabled:cursor-not-allowed disabled:opacity-70"
      aria-label="Keluar"
      title="Keluar"
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}

function TopNavbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [createdKind, setCreatedKind] = useState<
    "letter" | "invoice" | "outgoing" | null
  >(null);
  const [hasUnreadNotification, setUnreadNotification] = useState(false);
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const notification = createdKind
    ? {
        title:
          createdKind === "invoice"
            ? "Invoice berhasil tersimpan"
            : createdKind === "outgoing"
              ? "Surat keluar berhasil tersimpan"
              : "Dokumen berhasil tersimpan",
        message:
          createdKind === "invoice"
            ? "Invoice baru sudah masuk ke dashboard dan daftar invoice."
            : createdKind === "outgoing"
              ? "Surat keluar baru sudah masuk ke daftar surat keluar."
              : "Dokumen baru sudah masuk ke dashboard dan daftar dokumen.",
      }
    : {
        title: "Belum ada notifikasi baru",
        message:
          "Notifikasi akan muncul setelah dokumen, invoice, atau surat keluar berhasil disimpan.",
      };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const created = params.get("created");

    if (
      created === "letter" ||
      created === "invoice" ||
      created === "outgoing"
    ) {
      setCreatedKind(created);
      setUnreadNotification(true);
      setNotificationOpen(true);

      const timeout = window.setTimeout(() => {
        setNotificationOpen(false);
      }, 5000);

      return () => window.clearTimeout(timeout);
    }

    setCreatedKind(null);
    return undefined;
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60] lg:hidden"
          aria-label="Buka navigasi"
          title="Buka navigasi"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {currentDate}
          </p>
          <p className="text-sm font-semibold text-slate-950">
            Monitoring Dokumen HRM-GA
          </p>
        </div>

        <div
          className="topbar-marquee hidden h-10 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 lg:flex"
          aria-label={runningNotice}
        >
          <div className="topbar-marquee-track flex min-w-max items-center gap-8">
            <span>{runningNotice}</span>
            <span aria-hidden="true">{runningNotice}</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm md:flex">
          <FileArchive className="size-4 text-[#0A3A60]" aria-hidden="true" />
          <span className="text-slate-500">{branchProfile.name}</span>
          <span className="font-semibold text-slate-950">
            {branchProfile.code}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationOpen((current) => !current);
              setUnreadNotification(false);
            }}
            className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
            aria-label="Lihat notifikasi"
            title="Notifikasi"
          >
            <Bell className="size-5" aria-hidden="true" />
            {hasUnreadNotification ? (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">
                    {notification.title}
                  </p>
                  <p className="mt-1 leading-5 text-slate-500">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="hidden items-center gap-3 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 sm:flex"
          aria-label="Buka menu pengguna"
          title="Profil pengguna"
        >
          <Image
            src="/ha-junn-profile-close.png"
            alt="Foto profil HARJUN"
            width={32}
            height={32}
            className="size-8 rounded-md object-cover object-[50%_24%]"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-4 text-slate-950">
              {branchProfile.operator}
            </span>
            <span className="block truncate text-xs text-slate-500">
              {branchProfile.role}
            </span>
          </span>
          <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
        </button>

        <form action={signOutAction}>
          <SignOutButton />
        </form>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCounts, setSidebarCounts] = useState<SidebarCounts>({
    documents: null,
    invoices: null,
    outgoing: null,
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    async function loadSidebarCounts() {
      const [documentsResult, invoicesResult, outgoingResult] = await Promise.all([
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("type", "LETTER"),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("type", "INVOICE"),
        supabase
          .from("outgoing_letters")
          .select("id", { count: "exact", head: true }),
      ]);

      if (!isMounted) {
        return;
      }

      setSidebarCounts({
        documents: documentsResult.count ?? 0,
        invoices: invoicesResult.count ?? 0,
        outgoing: outgoingResult.count ?? 0,
      });
    }

    void loadSidebarCounts();

    const channel = supabase
      .channel("sidebar-document-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          void loadSidebarCounts();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outgoing_letters" },
        () => {
          void loadSidebarCounts();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent counts={sidebarCounts} />
      </aside>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Tutup overlay navigasi"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[86vw] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Tutup navigasi"
                title="Tutup navigasi"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              counts={sidebarCounts}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <TopNavbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
