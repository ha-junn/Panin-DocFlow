import { redirect } from "next/navigation";
import { Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signInAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
        <section className="relative hidden overflow-hidden bg-[#0A3A60] px-10 py-12 text-white lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0)_38%),radial-gradient(circle_at_80%_12%,rgba(215,25,32,0.32),transparent_34%),radial-gradient(circle_at_12%_82%,rgba(20,184,166,0.24),transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-white text-[#0A3A60] shadow-sm">
                <Building2 className="size-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-base font-semibold">Panin Bank</p>
                <p className="text-sm text-sky-100">DocFlow Operations</p>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Internal secure console
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">
                Kelola surat dan invoice masuk dalam satu dashboard yang rapi.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-sky-100">
                Dibuat untuk resepsionis dan admin agar pencatatan dokumen,
                pencarian dokumen, dan audit aktivitas berjalan lebih cepat.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-semibold">24</p>
                <p className="mt-1 text-sky-100">Surat hari ini</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-semibold">11</p>
                <p className="mt-1 text-sky-100">Invoice hari ini</p>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <p className="text-2xl font-semibold">38</p>
                <p className="mt-1 text-sky-100">Diproses</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-lg bg-[#0A3A60] text-white shadow-sm">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Panin DocFlow
                </p>
                <p className="text-xs text-slate-500">Internal dashboard</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-[#0A3A60]">
                  Masuk ke akun
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Dashboard Operasional
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Gunakan email dan password yang dibuat di Supabase Auth.
                </p>
              </div>

              {message ? (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {message}
                </div>
              ) : null}

              <form action={signInAction} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Email
                  </span>
                  <span className="relative mt-1.5 block">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="admin@panindocflow.local"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <span className="relative mt-1.5 block">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder="Masukkan password"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f] focus:outline-none focus:ring-4 focus:ring-[#0A3A60]/20"
                >
                  Masuk
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
