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

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export function DigitalClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  const display = useMemo(
    () => ({
      time: timeFormatter.format(now),
      date: dateFormatter.format(now),
    }),
    [now],
  );

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#0A3A60]/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(10,58,96,0.08),rgba(215,25,32,0.06),rgba(20,184,166,0.08))]" />
      <div className="relative flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0A3A60] text-white shadow-sm">
          <Clock3 className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p
            className="font-mono text-2xl font-semibold tracking-wide text-slate-950"
            suppressHydrationWarning
          >
            {display.time}
          </p>
          <p
            className="mt-1 text-xs font-medium text-slate-500"
            suppressHydrationWarning
          >
            {display.date} WIB
          </p>
        </div>
      </div>
    </div>
  );
}
