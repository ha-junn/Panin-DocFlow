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
  Activity,
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
  desktopLabel?: string;
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
    label: "Dokumen",
    href: "/documents",
    icon: FileText,
    badgeKey: "documents",
  },
  {
    label: "Invoice Masuk",
    desktopLabel: "Invoice",
    href: "/invoices",
    icon: ClipboardList,
    badgeKey: "invoices",
  },
  {
    label: "Surat Keluar",
    desktopLabel: "Surat",
    href: "/outgoing",
    icon: Send,
    badgeKey: "outgoing",
  },
  {
    label: "Tanda Terima",
    desktopLabel: "Tanda",
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
    desktopLabel: "Atur",
    href: "/settings/departments",
    icon: Settings,
    badgeKey: null,
  },
  {
    label: "Health",
    href: "/settings/system-health",
    icon: Activity,
    badgeKey: null,
  },
  {
    label: "Pencarian",
    href: "/search",
    icon: Search,
    badgeKey: null,
  },
];

const desktopNavigationItems = navigationItems.filter(
  (item) => item.href !== "/search",
);

const branchProfile = {
  code: "HRM-GA",
  name: "Pusat",
  operator: "HARJUN",
  role: "Admin",
};

const runningNotice =
  "KotakSurat aktif | Dikembangkan oleh Aprijal | Aktif sejak 02 Juni 2026 | Catat dokumen sesuai tanggal diterima | Pastikan lampiran terbaca jelas | Backup data setiap akhir bulan";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <LoadingLink
      href="/"
      className="flex min-w-0 items-center gap-3"
      aria-label="KotakSurat DocFlow"
    >
      <div
        className={[
          "relative shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200",
          compact ? "size-10" : "size-12",
        ].join(" ")}
      >
        <Image
          src="/panin-docflow-symbol-v2.png"
          alt="Logo KotakSurat"
          fill
          sizes={compact ? "40px" : "48px"}
          className="object-contain object-center"
          priority
        />
      </div>
      <div className="min-w-0">
        <p
          className={[
            "truncate font-semibold tracking-tight",
            compact ? "text-base leading-5" : "text-lg leading-5",
          ].join(" ")}
        >
          <span className="text-[#F04444]">Kotak</span>
          <span className="text-[#0EA5E9]">Surat</span>
        </p>
        <p className="truncate text-xs font-medium text-slate-500">DocFlow</p>
      </div>
    </LoadingLink>
  );
}

function DesktopNavigation({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center justify-start gap-1 overflow-visible pr-2 xl:flex 2xl:gap-2"
      aria-label="Navigasi utama"
    >
      {desktopNavigationItems.map((item) => {
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
            className={[
              "group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition 2xl:gap-2 2xl:px-4 2xl:text-[15px]",
              isActive
                ? "bg-[#0A3A60] text-white shadow-sm shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#0A3A60]",
            ].join(" ")}
          >
            <Icon
              className={[
                "hidden size-4 shrink-0 2xl:block",
                isActive ? "text-white" : "text-slate-400 group-hover:text-[#0A3A60]",
              ].join(" ")}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">{item.desktopLabel ?? item.label}</span>
            {badgeValue ? (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-bold leading-none",
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-[#0A3A60]/10 text-[#0A3A60]",
                ].join(" ")}
              >
                {badgeValue}
              </span>
            ) : null}
          </LoadingLink>
        );
      })}
    </nav>
  );
}

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
              alt="Logo KotakSurat"
              fill
              sizes="48px"
              className="object-contain object-center"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold leading-5 tracking-normal text-white">
              <span className="text-[#F04444]">Kotak</span>
              <span className="text-[#38BDF8]">Surat</span>
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

function ProfileSignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 text-sm font-semibold text-[#D71920] transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {pending ? "Keluar..." : "Keluar"}
    </button>
  );
}

function TopNavbar({
  counts,
  onMenuClick,
}: {
  counts: SidebarCounts;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
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
    let closeTimeout: number | undefined;

    const syncTimeout = window.setTimeout(() => {
      if (
        created === "letter" ||
        created === "invoice" ||
        created === "outgoing"
      ) {
        setCreatedKind(created);
        setUnreadNotification(true);
        setNotificationOpen(true);

        closeTimeout = window.setTimeout(() => {
          setNotificationOpen(false);
        }, 5000);

        return;
      }

      setCreatedKind(null);
    }, 0);

    return () => {
      window.clearTimeout(syncTimeout);
      if (closeTimeout) {
        window.clearTimeout(closeTimeout);
      }
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-gradient-to-r from-[#F3F8FC]/95 via-[#F8FBFE]/95 to-[#EEF6FB]/95 shadow-sm backdrop-blur">
      <div className="bg-[#071B3A] text-white">
        <div className="mx-auto flex h-9 max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="hidden shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100 lg:flex">
            <span>{currentDate}</span>
            <span className="h-1 w-1 rounded-full bg-sky-300" />
            <span>Monitoring Dokumen HRM-GA</span>
          </div>
          <div
            className="topbar-marquee flex min-w-0 flex-1 items-center overflow-hidden text-xs font-medium text-sky-50"
            aria-label={runningNotice}
          >
            <div className="topbar-marquee-track flex min-w-max items-center gap-8">
              <span>{runningNotice}</span>
              <span aria-hidden="true">{runningNotice}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60] xl:hidden"
          aria-label="Buka navigasi"
          title="Buka navigasi"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <div className="w-[205px] shrink-0">
          <BrandMark compact />
        </div>

        <DesktopNavigation counts={counts} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationOpen((current) => !current);
                setUnreadNotification(false);
                setProfileOpen(false);
              }}
              className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
              aria-label="Lihat notifikasi"
              title="Notifikasi"
            >
              <Bell className="size-5" aria-hidden="true" />
              {hasUnreadNotification ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
              ) : null}
            </button>

            {isNotificationOpen ? (
              <div className="animate-popover-in absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-xl shadow-slate-900/10">
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

          <LoadingLink
            href="/search"
            className={[
              "inline-flex size-10 items-center justify-center rounded-lg border shadow-sm transition",
              pathname === "/search" || pathname.startsWith("/search/")
                ? "border-[#0A3A60] bg-[#0A3A60] text-white shadow-sm shadow-slate-900/10"
                : "border-slate-200 text-slate-600 hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]",
            ].join(" ")}
            aria-label="Buka pencarian"
            title="Pencarian"
          >
            <Search className="size-5" aria-hidden="true" />
          </LoadingLink>

          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationOpen(false);
              }}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
              aria-label="Buka menu pengguna"
              aria-expanded={isProfileOpen}
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
              <ChevronDown
                className={[
                  "size-4 text-slate-400 transition",
                  isProfileOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>

          {isProfileOpen ? (
            <div className="animate-popover-in absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-xl shadow-slate-900/10">
              <div className="flex items-center gap-3">
                <Image
                  src="/ha-junn-profile-close.png"
                  alt="Foto profil HARJUN"
                  width={44}
                  height={44}
                  className="size-11 rounded-lg object-cover object-[50%_24%]"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {branchProfile.operator}
                  </p>
                  <p className="text-xs text-slate-500">
                    {branchProfile.role} {branchProfile.code}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-[#0A3A60]/10 bg-[#0A3A60]/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3A60]">
                  Akses aktif
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Input dokumen, invoice, surat keluar, dan tanda terima digital.
                </p>
              </div>
              <form action={signOutAction} className="mt-4">
                <ProfileSignOutButton />
              </form>
            </div>
          ) : null}
          </div>

          <form action={signOutAction} className="sm:hidden">
            <SignOutButton />
          </form>
        </div>
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
      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
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

      <div>
        <TopNavbar
          counts={sidebarCounts}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1800px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
