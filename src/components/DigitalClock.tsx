"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function DigitalClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  const display = useMemo(() => timeFormatter.format(now), [now]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#0A3A60]/10 bg-white p-4 shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(10,58,96,0.07),rgba(215,25,32,0.05)_50%,rgba(56,189,248,0.08))]" />
      <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-[#38BDF8]/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#0A3A60] text-white shadow-sm shadow-[#0A3A60]/20">
          <Clock3 className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p
            className="font-mono text-3xl font-bold leading-none tracking-[0.14em] text-slate-950"
            suppressHydrationWarning
          >
            {display.replaceAll(":", ".")}
          </p>
          <div
            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            suppressHydrationWarning
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            WIB
          </div>
        </div>
      </div>
    </div>
  );
}
